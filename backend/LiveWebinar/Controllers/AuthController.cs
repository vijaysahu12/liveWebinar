using Microsoft.AspNetCore.Mvc;
using liveWebinar.Services;
using liveWebinar.Data;
using liveWebinar.Models;

namespace liveWebinar.Controllers;

public class ViewerLoginRequest
{
    public string Mobile { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool ForceLogout { get; set; } = false;
}

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

    [HttpPost("login-viewer")]
    public IActionResult LoginViewer([FromBody] ViewerLoginRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Mobile) || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { success = false, message = "Name and mobile number are required" });
            }

            // Validate mobile number format (10 digits)
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.Mobile, @"^\d{10}$"))
            {
                return BadRequest(new { success = false, message = "Please enter a valid 10-digit mobile number" });
            }

            // Check if user with this mobile is already connected to any webinar
            var existingUser = _context.Users
                .FirstOrDefault(u => u.Mobile == request.Mobile && u.IsActive);

            if (existingUser != null)
            {
                var existingConnection = _context.Participants
                    .FirstOrDefault(p => p.UserId == existingUser.Id && p.Role == "viewer");

                if (existingConnection != null && !request.ForceLogout)
                {
                    return Ok(new
                    {
                        success = false,
                        shouldLogoutOther = true,
                        message = "This mobile number is already connected from another device"
                    });
                }

                // If force logout is requested, remove existing connections
                if (request.ForceLogout && existingConnection != null)
                {
                    _context.Participants.Remove(existingConnection);
                    _context.SaveChanges();
                }

                // Update user's last login
                existingUser.LastLoginAt = DateTime.UtcNow;
                existingUser.Name = request.Name; // Update name in case it changed
                _context.SaveChanges();

                // Generate JWT token
                var token = _authService.GenerateJwtToken(existingUser.Id.ToString(), "viewer", "");
                
                return Ok(new
                {
                    success = true,
                    token = token,
                    userId = existingUser.Id,
                    name = existingUser.Name,
                    mobile = existingUser.Mobile,
                    message = "Login successful"
                });
            }
            else
            {
                // Create new user
                var newUser = new User
                {
                    Name = request.Name,
                    Mobile = request.Mobile,
                    CreatedAt = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Users.Add(newUser);
                _context.SaveChanges();

                // Generate JWT token
                var token = _authService.GenerateJwtToken(newUser.Id.ToString(), "viewer", "");

                return Ok(new
                {
                    success = true,
                    token = token,
                    userId = newUser.Id,
                    name = newUser.Name,
                    mobile = newUser.Mobile,
                    message = "Registration and login successful"
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Login error: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Server error occurred" });
        }
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

        var token = _authService.GenerateJwtToken(request.UserId.ToString(), "host", request.WebinarId.ToString());
        
        return Ok(new { 
            token = token, 
            expires = DateTime.UtcNow.AddHours(24),
            webinarId = request.WebinarId.ToString(),
            userId = request.UserId.ToString(),
            role = "host"
        });
    }

    [HttpPost("validate-token")]
    public IActionResult ValidateToken([FromBody] ValidateTokenRequest request)
    {
        var isValid = _authService.IsValidHostToken(request.Token, request.UserId, request.WebinarId.ToString());
        
        return Ok(new { 
            isValid = isValid,
            message = isValid ? "Token is valid" : "Token is invalid or expired"
        });
    }
}

public class GenerateTokenRequest
{
    public long UserId { get; set; }
    public long WebinarId { get; set; } // Changed from int to long
}

public class ValidateTokenRequest
{
    public string Token { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public long WebinarId { get; set; } // Changed from int to long
}