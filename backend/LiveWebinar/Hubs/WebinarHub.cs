using Microsoft.AspNetCore.SignalR;
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

        if (!string.IsNullOrEmpty(webinarIdStr) && int.TryParse(webinarIdStr, out int webinarId))
        {
            long userId = 0;
            if (!string.IsNullOrEmpty(userIdStr))
            {
                long.TryParse(userIdStr, out userId);
            }
            
            // If userId is 0 (invalid or not provided), use a hash of ConnectionId as fallback
            if (userId == 0)
            {
                userId = Math.Abs(Context.ConnectionId.GetHashCode());
            }

            // track participant in DB (optional)
            var p = new Participant { WebinarId = webinarId, UserId = userId, ConnectedAt = DateTime.UtcNow, ConnectionId = Context.ConnectionId, Role = role };
            _db.Participants.Add(p);
            await _db.SaveChangesAsync();

            // send updated counts to group
            await Groups.AddToGroupAsync(Context.ConnectionId, webinarId.ToString());
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "viewer");
            var participants = _db.Participants.Count(x => x.WebinarId == webinarId);
            await Clients.Group(webinarId.ToString()).SendAsync("CountsUpdated", viewers, participants);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var participant = _db.Participants.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId);
        if (participant != null)
        {
            var webinarId = participant.WebinarId;
            _db.Participants.Remove(participant);
            await _db.SaveChangesAsync();
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, webinarId.ToString());
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "viewer");
            var participants = _db.Participants.Count(x => x.WebinarId == webinarId);
            await Clients.Group(webinarId.ToString()).SendAsync("CountsUpdated", viewers, participants);
        }
        await base.OnDisconnectedAsync(exception);
    }

    // host can push overlays (polls/messages)
    public async Task BroadcastOverlay(string webinarId, object overlay)
    {
        // validate caller is host in production
        await Clients.Group(webinarId).SendAsync("Overlay", overlay);
    }
}