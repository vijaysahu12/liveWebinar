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
        var webinarId = http?.Request.Query["webinarId"].ToString();
        var userId = http?.Request.Query["userId"].ToString() ?? Context.ConnectionId;
        var role = http?.Request.Query["role"].ToString() ?? "viewer";


        if (!string.IsNullOrEmpty(webinarId))
        {
            // track participant in DB (optional)
            var p = new Participant { WebinarId = webinarId, UserId = userId, ConnectedAt = DateTime.UtcNow, ConnectionId = Context.ConnectionId, Role = role };
            _db.Participants.Add(p);
            await _db.SaveChangesAsync();


            // send updated counts to group
            await Groups.AddToGroupAsync(Context.ConnectionId, webinarId);
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "viewer");
            var participants = _db.Participants.Count(x => x.WebinarId == webinarId);
            await Clients.Group(webinarId).SendAsync("CountsUpdated", viewers, participants);
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
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, webinarId);
            var viewers = _db.Participants.Count(x => x.WebinarId == webinarId && x.Role == "viewer");
            var participants = _db.Participants.Count(x => x.WebinarId == webinarId);
            await Clients.Group(webinarId).SendAsync("CountsUpdated", viewers, participants);
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