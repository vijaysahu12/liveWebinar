using Microsoft.AspNetCore.Mvc;
using liveWebinar.Services;
using liveWebinar.Data;
using liveWebinar.Models;
using Microsoft.EntityFrameworkCore;

namespace liveWebinar.Controllers;

public class ViewerLoginRequest
{
    public string Mobile { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
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
                    .FirstOrDefault(p => p.UserId == existingUser.Id);

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
                existingUser.LastLoginAt = DateTime.Now;
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
                    Email = request.Email,
                    UserRoleType = UserRole.Guest, // Default role
                    CreatedAt = DateTime.Now,
                    LastLoginAt = DateTime.Now,
                    IsActive = true
                };

                _context.Users.Add(newUser);
                _context.SaveChanges();

                // Generate JWT token
                var token = _authService.GenerateJwtToken(newUser.Id.ToString(), "viewer", "");

                return Ok(new LoginResponse
                {
                    Success = true,
                    Token = token,
                    User = new UserDto
                    {
                        UserId = newUser.Id,
                        Name = newUser.Name,
                        Mobile = newUser.Mobile,
                        Email = newUser.Email,
                        UserRoleType = newUser.UserRoleType, // Fixed: was Role, now UserRoleType
                        IsEmailVerified = newUser.IsEmailVerified,
                        IsMobileVerified = newUser.IsMobileVerified,
                        CreatedAt = newUser.CreatedAt,
                        LastLoginAt = newUser.LastLoginAt
                    },
                    Message = "Registration and login successful"
                });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Login error: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Server error occurred" });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new LoginResponse 
                { 
                    Success = false, 
                    Message = "Mobile number is required" 
                });
            }

            // Validate mobile number format (10 digits)
            if (!System.Text.RegularExpressions.Regex.IsMatch(request.Mobile, @"^\d{10}$"))
            {
                return BadRequest(new LoginResponse 
                { 
                    Success = false, 
                    Message = "Please enter a valid 10-digit mobile number" 
                });
            }

            // Find existing user
            var user = await _context.Users
                .Include(u => u.Subscriptions)
                .FirstOrDefaultAsync(u => u.Mobile == request.Mobile);

            if (user != null)
            {
                // Update user info
                user.LastLoginAt = DateTime.Now;
                if (!string.IsNullOrWhiteSpace(request.Name))
                    user.Name = request.Name;
                if (!string.IsNullOrWhiteSpace(request.Email))
                    user.Email = request.Email;
                
                await _context.SaveChangesAsync();
            }
            else
            {
                // Create new user
                user = new User
                {
                    Name = request.Name,
                    Mobile = request.Mobile,
                    Email = request.Email,
                    UserRoleType = UserRole.Guest,
                    CreatedAt = DateTime.Now,
                    LastLoginAt = DateTime.Now,
                    IsActive = true
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            // Generate JWT token
            var token = _authService.GenerateJwtToken(user.Id.ToString(), user.UserRoleType.ToString().ToLower(), "");

            return Ok(new LoginResponse
            {
                Success = true,
                Token = token,
                User = new UserDto
                {
                    UserId = user.Id,
                    Name = user.Name,
                    Mobile = user.Mobile,
                    Email = user.Email,
                    UserRoleType = user.UserRoleType, // Fixed: was Role, now UserRoleType
                    IsEmailVerified = user.IsEmailVerified,
                    IsMobileVerified = user.IsMobileVerified,
                    CreatedAt = user.CreatedAt,
                    LastLoginAt = user.LastLoginAt
                },
                Message = "Login successful"
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Login error: {ex.Message}");
            return StatusCode(500, new LoginResponse 
            { 
                Success = false, 
                Message = "Server error occurred" 
            });
        }
    }

    [HttpPost("promote-to-host")]
    public async Task<IActionResult> PromoteToHost([FromQuery] long userId, [FromQuery] long adminUserId)
    {
        try
        {
            var admin = await _context.Users.FindAsync(adminUserId);
            if (admin == null || admin.UserRoleType != UserRole.Admin)
                return Forbid("Only admins can promote users to host");

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found");

            user.UserRoleType = UserRole.Host;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "User promoted to host successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Promote to host error: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Server error occurred" });
        }
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscriptionRequest request, [FromQuery] long userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound("User not found");

            // Deactivate existing subscriptions
            var existingSubscriptions = _context.UserSubscriptions
                .Where(s => s.UserId == userId && s.IsActive);
            
            foreach (var sub in existingSubscriptions)
            {
                sub.IsActive = false;
            }

            // Create new subscription
            var subscription = new UserSubscription
            {
                UserId = userId,
                Type = request.Type,
                StartDate = DateTime.Now,
                EndDate = request.EndDate,
                AmountPaid = request.AmountPaid,
                PaymentTransactionId = request.PaymentTransactionId ?? string.Empty,
                IsActive = true
            };

            _context.UserSubscriptions.Add(subscription);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Subscription created successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Subscribe error: {ex.Message}");
            return StatusCode(500, new { success = false, message = "Server error occurred" });
        }
    }

    [HttpPost("generate-host-token")]
    public IActionResult GenerateHostToken([FromBody] GenerateTokenRequest request)
    {
        // Validate that the user is actually a host for this webinar
        var participant = _context.Participants
            .Include(p => p.User)
            .FirstOrDefault(p => p.WebinarId == request.WebinarId && 
                               p.UserId == request.UserId && 
                               (p.User.UserRoleType == UserRole.Host || p.User.UserRoleType == UserRole.Admin));

        if (participant == null)
        {
            return BadRequest("User is not a host for the specified webinar");
        }

        var token = _authService.GenerateJwtToken(request.UserId.ToString(), "host", request.WebinarId.ToString());
        
        return Ok(new { 
            token = token, 
            expires = DateTime.Now.AddHours(24),
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