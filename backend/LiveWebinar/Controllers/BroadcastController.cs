using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using liveWebinar.Hubs;
using liveWebinar.Data;
using liveWebinar.Services;

namespace liveWebinar.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BroadcastController : ControllerBase
    {
        private readonly IHubContext<WebinarHub> _hub;
        private readonly AppDbContext _context;
        private readonly IAuthenticationService _authService;
        
        public BroadcastController(IHubContext<WebinarHub> hub, AppDbContext context, IAuthenticationService authService)
        {
            _hub = hub;
            _context = context;
            _authService = authService;
        }

        [HttpPost("overlay/{webinarId}")]
        public async Task<IActionResult> Overlay(int webinarId, [FromBody] object payload)
        {
            // Validate host token/role
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            var hostToken = Request.Headers["Authorization"].FirstOrDefault();
            
            if (string.IsNullOrEmpty(userIdHeader) || !long.TryParse(userIdHeader, out long userId))
            {
                return BadRequest("Valid User ID is required in X-User-Id header");
            }

            if (string.IsNullOrEmpty(hostToken))
            {
                return Unauthorized("Authorization token is required");
            }

            // Check if user is a host for this webinar
            var participant = _context.Participants
                .FirstOrDefault(p => p.WebinarId == webinarId && 
                                   p.UserId == userId && 
                                   p.Role == "host");

            if (participant == null)
            {
                return Forbid("Only webinar hosts can send overlay messages");
            }

            // Additional token validation using JWT service
            if (!_authService.IsValidHostToken(hostToken, userId.ToString(), webinarId.ToString()))
            {
                return Unauthorized("Invalid authorization token");
            }

            // Send overlay to all participants in the webinar
            await _hub.Clients.Group(webinarId.ToString()).SendAsync("Overlay", payload);
            return Ok(new { message = "Overlay sent successfully", webinarId, timestamp = DateTime.UtcNow });
        }
    }
}