using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Webinar.Api.Hubs;

namespace Backend.Controllers
{


    [ApiController]
    [Route("api/[controller]")]
    public class BroadcastController : ControllerBase
    {
        private readonly IHubContext<WebinarHub> _hub;
        public BroadcastController(IHubContext<WebinarHub> hub) => _hub = hub;


        [HttpPost("overlay/{webinarId}")]
        public async Task<IActionResult> Overlay(string webinarId, [FromBody] object payload)
        {
            // validate host token/role in production
            await _hub.Clients.Group(webinarId).SendAsync("Overlay", payload);
            return Ok();
        }
    }
}
