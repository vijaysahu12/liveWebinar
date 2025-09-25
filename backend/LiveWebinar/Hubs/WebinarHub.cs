using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using liveWebinar.Data;
using liveWebinar.Models;

namespace liveWebinar.Hubs;

public class WebinarHub : Hub
{
    private readonly AppDbContext _db;

    public WebinarHub(AppDbContext db) => _db = db;

    public override async Task OnConnectedAsync()
    {
        var http = Context.GetHttpContext();
        // Expect query param ?webinarId=xxx&userId=yyy&role=viewer/host
        var webinarIdStr = http?.Request.Query["webinarId"].ToString();
        var userIdStr = http?.Request.Query["userId"].ToString();
        var role = http?.Request.Query["role"].ToString() ?? "viewer";

        if (!string.IsNullOrEmpty(webinarIdStr) && long.TryParse(webinarIdStr, out long webinarId))
        {
            if (!string.IsNullOrEmpty(userIdStr) && long.TryParse(userIdStr, out long userId))
            {
                Console.WriteLine($"Processing connection: webinarId={webinarId}, userId={userId}, role='{role}'");

                // Get client IP and User Agent for tracking different locations
                var clientIp = http?.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                var userAgent = http?.Request.Headers["User-Agent"].ToString() ?? "unknown";

                // CRITICAL: Handle existing connections for this user in this webinar
                var existingParticipant = await _db.Participants
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.WebinarId == webinarId && p.IsActive);
                
                if (existingParticipant != null)
                {
                    Console.WriteLine($"Found existing active participant for userId {userId} in webinar {webinarId}");
                    
                    // Check if this is from a different location/device
                    bool isDifferentLocation = existingParticipant.IpAddress != clientIp || 
                                              existingParticipant.UserAgent != userAgent;
                    
                    if (isDifferentLocation)
                    {
                        Console.WriteLine($"User connecting from different location. Old: {existingParticipant.IpAddress}, New: {clientIp}");
                        
                        // Notify the previous connection that it's being disconnected
                        try
                        {
                            await Clients.Client(existingParticipant.ConnectionId)
                                .SendAsync("ForceDisconnect", new { 
                                    reason = "Another session started from a different location",
                                    newLocation = clientIp,
                                    timestamp = DateTime.UtcNow 
                                });
                            
                            // Remove from SignalR group
                            await Groups.RemoveFromGroupAsync(existingParticipant.ConnectionId, webinarId.ToString());
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error notifying previous connection: {ex.Message}");
                        }
                        
                        // Update the existing participant record with new connection details
                        existingParticipant.ConnectionId = Context.ConnectionId;
                        existingParticipant.ConnectedAt = DateTime.UtcNow;
                        existingParticipant.LastActiveAt = DateTime.UtcNow;
                        existingParticipant.IpAddress = clientIp;
                        existingParticipant.UserAgent = userAgent;
                    }
                    else
                    {
                        Console.WriteLine("Same user reconnecting from same location - updating connection details");
                        // Same location, just update connection details
                        existingParticipant.ConnectionId = Context.ConnectionId;
                        existingParticipant.LastActiveAt = DateTime.UtcNow;
                    }
                    
                    await _db.SaveChangesAsync();
                }
                else
                {
                    // Verify user exists in Users table
                    var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
                    if (user == null)
                    {
                        Console.WriteLine($"User {userId} not found or inactive");
                        await Clients.Caller.SendAsync("Error", "User not found or inactive");
                        return;
                    }

                    // Create new participant record
                    var participant = new Participant 
                    { 
                        WebinarId = webinarId, 
                        UserId = userId, 
                        ConnectedAt = DateTime.UtcNow,
                        LastActiveAt = DateTime.UtcNow,
                        ConnectionId = Context.ConnectionId, 
                        Role = role,
                        IpAddress = clientIp,
                        UserAgent = userAgent,
                        IsActive = true
                    };
                    
                    try
                    {
                        _db.Participants.Add(participant);
                        await _db.SaveChangesAsync();
                        Console.WriteLine($"Created new participant record for userId {userId}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error creating participant: {ex.Message}");
                        // Handle unique constraint violation
                        if (ex.InnerException?.Message?.Contains("IX_Participants_UserId_WebinarId_Unique") == true)
                        {
                            await Clients.Caller.SendAsync("Error", "You are already connected to this webinar");
                            return;
                        }
                        throw;
                    }
                }

                // Add to SignalR group
                await Groups.AddToGroupAsync(Context.ConnectionId, webinarId.ToString());
                
                // Get user information for logging and welcome message
                var currentUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                
                // Get real-time counts from active connections
                var viewers = await _db.Participants.CountAsync(x => x.WebinarId == webinarId && x.Role == "viewer" && x.IsActive);
                var hosts = await _db.Participants.CountAsync(x => x.WebinarId == webinarId && x.Role == "host" && x.IsActive);
                var totalParticipants = viewers + hosts;
                
                if (currentUser != null)
                {
                    Console.WriteLine($"User {currentUser.Name} ({currentUser.Mobile}) connected as {role} to webinar {webinarId}. Current counts: {viewers} viewers, {totalParticipants} total");
                    
                    // Welcome message to the newly connected user
                    await Clients.Caller.SendAsync("Connected", $"Welcome {currentUser.Name}! You joined as {role}. Current viewer count: {viewers}");
                }
                else
                {
                    Console.WriteLine($"UserId {userId} connected as {role} to webinar {webinarId}. Current counts: {viewers} viewers, {totalParticipants} total");
                    await Clients.Caller.SendAsync("Connected", $"Welcome! You joined as {role}. Current viewer count: {viewers}");
                }
                
                // Broadcast to all participants in the webinar
                await Clients.Group(webinarId.ToString()).SendAsync("CountsUpdated", viewers, totalParticipants);
            }
            else
            {
                Console.WriteLine($"Invalid userId provided: '{userIdStr}'");
                await Clients.Caller.SendAsync("Error", "Invalid or missing user ID. Please login first.");
            }
        }
        else
        {
            Console.WriteLine($"Invalid webinarId provided: '{webinarIdStr}'");
            await Clients.Caller.SendAsync("Error", "Invalid webinar ID provided");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var participant = await _db.Participants.FirstOrDefaultAsync(p => p.ConnectionId == Context.ConnectionId);
        if (participant != null)
        {
            var webinarId = participant.WebinarId;
            var userId = participant.UserId;
            var role = participant.Role;
            
            // Get user info for logging
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            var userName = user?.Name ?? "Unknown";
            
            Console.WriteLine($"User {userName} (ID: {userId}, {role}) disconnecting from webinar {webinarId}. Reason: {exception?.Message ?? "Normal disconnect"}");
            
            // Check if this is a forced disconnect (user connecting from another location)
            // In that case, we mark as inactive instead of removing completely
            bool isForcedDisconnect = exception?.Message?.Contains("ForceDisconnect") == true;
            
            if (isForcedDisconnect)
            {
                // Mark as inactive but keep record for session tracking
                participant.IsActive = false;
                participant.LastActiveAt = DateTime.UtcNow;
                Console.WriteLine($"Marking participant as inactive due to connection from different location");
            }
            else
            {
                // Normal disconnect - remove participant completely
                _db.Participants.Remove(participant);
            }
            
            await _db.SaveChangesAsync();
            
            // Remove from SignalR group
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, webinarId.ToString());
            
            // Send updated counts to remaining participants (only count active participants)
            var viewers = await _db.Participants.CountAsync(x => x.WebinarId == webinarId && x.Role == "viewer" && x.IsActive);
            var hosts = await _db.Participants.CountAsync(x => x.WebinarId == webinarId && x.Role == "host" && x.IsActive);
            var totalParticipants = viewers + hosts;
            
            Console.WriteLine($"After disconnect: {viewers} viewers, {totalParticipants} total participants remain in webinar {webinarId}");
            
            await Clients.Group(webinarId.ToString()).SendAsync("CountsUpdated", viewers, totalParticipants);
            
            // Optional: Notify other participants about disconnection (uncomment if needed)
            // await Clients.Group(webinarId.ToString()).SendAsync("UserDisconnected", $"{userName} left the webinar");
        }
        else
        {
            Console.WriteLine($"Disconnect event for unknown ConnectionId: {Context.ConnectionId}");
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    // Host can push overlays (polls/messages)
    public async Task BroadcastOverlay(string webinarId, object overlay)
    {
        // TODO: In production, validate caller is actually a host for this webinar
        await Clients.Group(webinarId).SendAsync("Overlay", overlay);
    }

    // Get current viewer counts for a specific webinar
    public async Task GetViewerCount(string webinarId)
    {
        if (long.TryParse(webinarId, out long webinarIdLong))
        {
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarIdLong && x.Role == "viewer");
            var hosts = _db.Participants.Count(x => x.WebinarId == webinarIdLong && x.Role == "host");
            var totalParticipants = viewers + hosts;
            
            // Log current participants for debugging
            var allParticipants = _db.Participants.Where(x => x.WebinarId == webinarIdLong).Include(p => p.User).ToList();
            Console.WriteLine($"Current participants in webinar {webinarIdLong}:");
            foreach (var p in allParticipants)
            {
                Console.WriteLine($"  - User: {p.User?.Name ?? "Unknown"} ({p.User?.Mobile ?? "N/A"}), Role: {p.Role}, ConnectedAt: {p.ConnectedAt}");
            }
            
            await Clients.Caller.SendAsync("CountsUpdated", viewers, totalParticipants);
        }
    }

    // Method for hosts to force logout a specific user (single-session enforcement)
    public async Task ForceLogoutUser(string webinarId, long userId)
    {
        // TODO: In production, validate caller is actually a host for this webinar
        if (long.TryParse(webinarId, out long webinarIdLong))
        {
            var userConnections = _db.Participants
                .Where(p => p.UserId == userId && p.WebinarId == webinarIdLong)
                .ToList();

            foreach (var connection in userConnections)
            {
                // Send logout message to the specific connection
                await Clients.Client(connection.ConnectionId).SendAsync("ForceLogout", "You have been logged out because you connected from another device");
                
                // Remove from database
                _db.Participants.Remove(connection);
            }
            
            await _db.SaveChangesAsync();
            
            // Update counts for remaining participants
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarIdLong && x.Role == "viewer");
            var hosts = _db.Participants.Count(x => x.WebinarId == webinarIdLong && x.Role == "host");
            var totalParticipants = viewers + hosts;
            
            await Clients.Group(webinarId).SendAsync("CountsUpdated", viewers, totalParticipants);
        }
    }

    // Ping method for connection health check
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", DateTime.UtcNow);
    }

    // Method to send chat messages to all participants in a webinar
    public async Task SendChatMessage(string webinarId, object chatMessage)
    {
        if (long.TryParse(webinarId, out long webinarIdLong))
        {
            // Verify the sender is a participant in this webinar
            var senderConnectionId = Context.ConnectionId;
            var participant = await _db.Participants
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.ConnectionId == senderConnectionId && p.WebinarId == webinarIdLong && p.IsActive);
            
            if (participant != null)
            {
                Console.WriteLine($"💬 Chat message from {participant.User.Name} in webinar {webinarId}: {chatMessage}");
                
                // Broadcast the message to all participants in the webinar
                await Clients.Group(webinarId).SendAsync("ChatMessage", chatMessage);
                
                Console.WriteLine($"💬 Chat message broadcasted to webinar {webinarId} group");
            }
            else
            {
                Console.WriteLine($"⚠️ Unauthorized chat message attempt from connection {senderConnectionId}");
                await Clients.Caller.SendAsync("Error", "You are not authorized to send messages in this webinar");
            }
        }
        else
        {
            await Clients.Caller.SendAsync("Error", "Invalid webinar ID");
        }
    }
}