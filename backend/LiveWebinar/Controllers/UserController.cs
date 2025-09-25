using Microsoft.AspNetCore.Mvc;
using liveWebinar.Models;
using liveWebinar.Services;

namespace liveWebinar.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
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
}