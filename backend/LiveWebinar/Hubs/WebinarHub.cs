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

                // CRITICAL: Remove any existing connections for this user to prevent duplicates on refresh/reconnect
                var existingUserConnections = _db.Participants
                    .Where(p => p.UserId == userId && p.WebinarId == webinarId)
                    .ToList();
                
                if (existingUserConnections.Any())
                {
                    Console.WriteLine($"Removing {existingUserConnections.Count} existing connections for userId {userId} to prevent duplicates");
                    _db.Participants.RemoveRange(existingUserConnections);
                    await _db.SaveChangesAsync();
                }

                // Also remove any stale connections with the same ConnectionId (cleanup)
                var existingConnectionId = _db.Participants.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
                if (existingConnectionId != null)
                {
                    Console.WriteLine($"Removing stale connection with same ConnectionId: {Context.ConnectionId}");
                    _db.Participants.Remove(existingConnectionId);
                    await _db.SaveChangesAsync();
                }

                // Verify user exists in Users table
                var user = _db.Users.FirstOrDefault(u => u.Id == userId && u.IsActive);
                if (user == null)
                {
                    Console.WriteLine($"User {userId} not found or inactive");
                    await Clients.Caller.SendAsync("Error", "User not found or inactive");
                    return;
                }

                // Now add the new connection
                var participant = new Participant 
                { 
                    WebinarId = webinarId, 
                    UserId = userId, 
                    ConnectedAt = DateTime.UtcNow, 
                    ConnectionId = Context.ConnectionId, 
                    Role = role
                };
                _db.Participants.Add(participant);
                await _db.SaveChangesAsync();

                // Add to SignalR group and send updated counts
                await Groups.AddToGroupAsync(Context.ConnectionId, webinarId.ToString());
                
                // Get real-time counts from active connections
                var viewers = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "viewer");
                var hosts = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "host");
                var totalParticipants = viewers + hosts;
                
                Console.WriteLine($"User {user.Name} ({user.Mobile}) connected as {role} to webinar {webinarId}. Current counts: {viewers} viewers, {totalParticipants} total");
                
                // Broadcast to all participants in the webinar
                await Clients.Group(webinarId.ToString()).SendAsync("CountsUpdated", viewers, totalParticipants);
                
                // Welcome message to the newly connected user
                await Clients.Caller.SendAsync("Connected", $"Welcome {user.Name}! You joined as {role}. Current viewer count: {viewers}");
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
        var participant = _db.Participants.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (participant != null)
        {
            var webinarId = participant.WebinarId;
            var userId = participant.UserId;
            var role = participant.Role;
            
            // Get user info for logging
            var user = _db.Users.FirstOrDefault(u => u.Id == userId);
            var userName = user?.Name ?? "Unknown";
            
            Console.WriteLine($"User {userName} (ID: {userId}, {role}) disconnecting from webinar {webinarId}. Reason: {exception?.Message ?? "Normal disconnect"}");
            
            // Remove participant from database
            _db.Participants.Remove(participant);
            await _db.SaveChangesAsync();
            
            // Remove from SignalR group
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, webinarId.ToString());
            
            // Send updated counts to remaining participants
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "viewer");
            var hosts = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "host");
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
}