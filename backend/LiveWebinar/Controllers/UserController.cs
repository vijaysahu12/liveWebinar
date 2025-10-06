using Microsoft.AspNetCore.Mvc;
using liveWebinar.Models;
using liveWebinar.Services;
using liveWebinar.Data;
using Microsoft.EntityFrameworkCore;

namespace liveWebinar.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly AppDbContext _context;

    public UserController(IUserService userService, AppDbContext context)
    {
        _userService = userService;
        _context = context;
    }

    [HttpPost("login")]
    public async Task<ActionResult<UserLoginResponse>> Login([FromBody] UserLoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new UserLoginResponse
            {
                Success = false,
                Message = "Invalid request data"
            });
        }

        var response = await _userService.LoginOrRegisterAsync(request);
        
        if (response.Success)
        {
            return Ok(response);
        }
        
        return BadRequest(response);
    }

    [HttpPost("validate-token")]
    public async Task<ActionResult<ValidateUserTokenResponse>> ValidateToken([FromBody] ValidateUserTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new ValidateUserTokenResponse
            {
                IsValid = false,
                Message = "Token is required"
            });
        }

        var response = await _userService.ValidateTokenAsync(request.Token);
        return Ok(response);
    }

    [HttpGet("profile/{userId}")]
    public async Task<ActionResult<UserInfo>> GetProfile(long userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        
        if (user == null)
        {
            return NotFound(new { Message = "User not found" });
        }

        return Ok(new UserInfo
        {
            Id = user.Id,
            Name = user.Name,
            Mobile = user.Mobile,
            Email = user.Email,
            City = user.City,
            State = user.State,
            Country = user.Country,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        });
    }

    [HttpPost("logout-others/{userId}")]
    public async Task<ActionResult> LogoutFromOtherDevices(long userId, [FromQuery] string currentConnectionId = "")
    {
        var result = await _userService.LogoutUserFromOtherDevicesAsync(userId, currentConnectionId);
        
        return Ok(new { 
            Success = true, 
            Message = result ? "Logged out from other devices" : "No other devices found" 
        });
    }

    // Admin-only endpoints
    [HttpPost("admin/create-user")]
    public async Task<ActionResult<AdminCreateUserResponse>> CreateUser([FromBody] AdminCreateUserRequest request, [FromHeader(Name = "Authorization")] string? authToken = null)
    {
        try
        {
            // Validate admin authorization
            if (string.IsNullOrEmpty(authToken))
            {
                return Unauthorized(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "Authorization token is required" 
                });
            }

            // Remove "Bearer " prefix if present
            var token = authToken.StartsWith("Bearer ") ? authToken.Substring(7) : authToken;
            
            // Validate admin user
            var adminValidation = await _userService.ValidateTokenAsync(token);
            if (!adminValidation.IsValid || adminValidation.User?.UserRoleType != UserRole.Admin)
            {
                return Unauthorized(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "Admin access required" 
                });
            }

            // Validate input
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Mobile))
            {
                return BadRequest(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "Name and mobile are required" 
                });
            }

            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Mobile == request.Mobile);

            if (existingUser != null)
            {
                return Conflict(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "User with this mobile number already exists" 
                });
            }

            // Create new user
            var newUser = new User
            {
                Name = request.Name,
                Mobile = request.Mobile,
                Email = request.Email ?? string.Empty,
                City = request.City,
                State = request.State,
                Country = request.Country,
                UserRoleType = request.UserRoleType,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            // Return created user info
            var userInfo = new UserInfo
            {
                Id = newUser.Id,
                Name = newUser.Name,
                Mobile = newUser.Mobile,
                Email = newUser.Email,
                City = newUser.City,
                State = newUser.State,
                Country = newUser.Country,
                CreatedAt = newUser.CreatedAt,
                LastLoginAt = newUser.LastLoginAt,
                UserRoleType = newUser.UserRoleType
            };

            return Ok(new AdminCreateUserResponse 
            { 
                Success = true, 
                Message = "User created successfully", 
                User = userInfo 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new AdminCreateUserResponse 
            { 
                Success = false, 
                Message = $"Error creating user: {ex.Message}" 
            });
        }
    }

    [HttpGet("admin/users")]
    public async Task<ActionResult<AdminUserListResponse>> GetAllUsers([FromHeader(Name = "Authorization")] string? authToken = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            // Validate admin authorization
            if (string.IsNullOrEmpty(authToken))
            {
                return Unauthorized(new AdminUserListResponse 
                { 
                    Success = false, 
                    Message = "Authorization token is required" 
                });
            }

            // Remove "Bearer " prefix if present
            var token = authToken.StartsWith("Bearer ") ? authToken.Substring(7) : authToken;
            
            // Validate admin user
            var adminValidation = await _userService.ValidateTokenAsync(token);
            if (!adminValidation.IsValid || adminValidation.User?.UserRoleType != UserRole.Admin)
            {
                return Unauthorized(new AdminUserListResponse 
                { 
                    Success = false, 
                    Message = "Admin access required" 
                });
            }

            // Get total count
            var totalCount = await _context.Users.CountAsync();

            // Get users with pagination
            var users = await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new AdminUserInfo
                {
                    Id = u.Id,
                    Name = u.Name,
                    Mobile = u.Mobile,
                    Email = u.Email,
                    City = u.City,
                    State = u.State,
                    Country = u.Country,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt,
                    UserRoleType = u.UserRoleType,
                    IsActive = u.IsActive,
                    IsEmailVerified = u.IsEmailVerified,
                    IsMobileVerified = u.IsMobileVerified
                })
                .ToListAsync();

            return Ok(new AdminUserListResponse 
            { 
                Success = true, 
                Message = "Users retrieved successfully", 
                Users = users,
                TotalCount = totalCount
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new AdminUserListResponse 
            { 
                Success = false, 
                Message = $"Error retrieving users: {ex.Message}" 
            });
        }
    }

    [HttpPut("admin/update-user")]
    public async Task<ActionResult<AdminCreateUserResponse>> UpdateUser([FromBody] AdminUpdateUserRequest request, [FromHeader(Name = "Authorization")] string? authToken = null)
    {
        try
        {
            // Validate admin authorization
            if (string.IsNullOrEmpty(authToken))
            {
                return Unauthorized(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "Authorization token is required" 
                });
            }

            // Remove "Bearer " prefix if present
            var token = authToken.StartsWith("Bearer ") ? authToken.Substring(7) : authToken;
            
            // Validate admin user
            var adminValidation = await _userService.ValidateTokenAsync(token);
            if (!adminValidation.IsValid || adminValidation.User?.UserRoleType != UserRole.Admin)
            {
                return Unauthorized(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "Admin access required" 
                });
            }

            // Find user to update
            var user = await _context.Users.FindAsync(request.Id);
            if (user == null)
            {
                return NotFound(new AdminCreateUserResponse 
                { 
                    Success = false, 
                    Message = "User not found" 
                });
            }

            // Update user properties if provided
            if (!string.IsNullOrWhiteSpace(request.Name))
                user.Name = request.Name;
            
            if (!string.IsNullOrWhiteSpace(request.Email))
                user.Email = request.Email;
            
            if (!string.IsNullOrWhiteSpace(request.City))
                user.City = request.City;
            
            if (!string.IsNullOrWhiteSpace(request.State))
                user.State = request.State;
            
            if (!string.IsNullOrWhiteSpace(request.Country))
                user.Country = request.Country;
            
            if (request.UserRoleType.HasValue)
                user.UserRoleType = request.UserRoleType.Value;
            
            if (request.IsActive.HasValue)
                user.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync();

            // Return updated user info
            var userInfo = new UserInfo
            {
                Id = user.Id,
                Name = user.Name,
                Mobile = user.Mobile,
                Email = user.Email,
                City = user.City,
                State = user.State,
                Country = user.Country,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt,
                UserRoleType = user.UserRoleType
            };

            return Ok(new AdminCreateUserResponse 
            { 
                Success = true, 
                Message = "User updated successfully", 
                User = userInfo 
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new AdminCreateUserResponse 
            { 
                Success = false, 
                Message = $"Error updating user: {ex.Message}" 
            });
        }
    }

    [HttpDelete("admin/delete-user/{userId}")]
    public async Task<ActionResult> DeleteUser(long userId, [FromHeader(Name = "Authorization")] string? authToken = null)
    {
        try
        {
            // Validate admin authorization
            if (string.IsNullOrEmpty(authToken))
            {
                return Unauthorized(new { Success = false, Message = "Authorization token is required" });
            }

            // Remove "Bearer " prefix if present
            var token = authToken.StartsWith("Bearer ") ? authToken.Substring(7) : authToken;
            
            // Validate admin user
            var adminValidation = await _userService.ValidateTokenAsync(token);
            if (!adminValidation.IsValid || adminValidation.User?.UserRoleType != UserRole.Admin)
            {
                return Unauthorized(new { Success = false, Message = "Admin access required" });
            }

            // Find user to delete
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { Success = false, Message = "User not found" });
            }

            // Prevent admin from deleting themselves
            if (adminValidation.User.Id == userId)
            {
                return BadRequest(new { Success = false, Message = "Cannot delete your own account" });
            }

            // Soft delete by setting IsActive to false (recommended)
            user.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { Success = true, Message = "User deactivated successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Success = false, Message = $"Error deleting user: {ex.Message}" });
        }
    }
}