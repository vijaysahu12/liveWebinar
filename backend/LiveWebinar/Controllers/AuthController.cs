using Microsoft.AspNetCore.Mvc;
using liveWebinar.Services;
using liveWebinar.Data;
using liveWebinar.Models;

namespace liveWebinar.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthenticationService _authService;
    private readonly AppDbContext _context;

    public AuthController(IAuthenticationService authService, AppDbContext context)
    {
        _authService = authService;
        _context = context;
    }

    [HttpPost("generate-host-token")]
    public IActionResult GenerateHostToken([FromBody] GenerateTokenRequest request)
    {
        // Validate that the user is actually a host for this webinar
        var participant = _context.Participants
            .FirstOrDefault(p => p.WebinarId == request.WebinarId && 
                               p.UserId == request.UserId && 
                               p.Role == "host");

        if (participant == null)
        {
            return BadRequest("User is not a host for the specified webinar");
        }

        var token = _authService.GenerateJwtToken(request.UserId, "host", request.WebinarId);
        
        return Ok(new { 
            token = token, 
            expires = DateTime.UtcNow.AddHours(24),
            webinarId = request.WebinarId,
            userId = request.UserId,
            role = "host"
        });
    }

    [HttpPost("validate-token")]
    public IActionResult ValidateToken([FromBody] ValidateTokenRequest request)
    {
        var isValid = _authService.IsValidHostToken(request.Token, request.UserId, request.WebinarId);
        
        return Ok(new { 
            isValid = isValid,
            message = isValid ? "Token is valid" : "Token is invalid or expired"
        });
    }
}

public class GenerateTokenRequest
{
    public string UserId { get; set; } = string.Empty;
    public string WebinarId { get; set; } = string.Empty;
}

public class ValidateTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string WebinarId { get; set; } = string.Empty;
}