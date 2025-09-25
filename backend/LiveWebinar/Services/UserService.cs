using liveWebinar.Data;
using liveWebinar.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace liveWebinar.Services;

public interface IUserService
{
    Task<UserLoginResponse> LoginOrRegisterAsync(UserLoginRequest request);
    Task<ValidateUserTokenResponse> ValidateTokenAsync(string token);
    Task<bool> LogoutUserFromOtherDevicesAsync(long userId, string currentConnectionId);
    Task<User?> GetUserByIdAsync(long userId);
    Task<User?> GetUserByMobileAsync(string mobile);
}

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public UserService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<UserLoginResponse> LoginOrRegisterAsync(UserLoginRequest request)
    {
        try
        {
            // Validate mobile number
            if (string.IsNullOrWhiteSpace(request.Mobile) || request.Mobile.Length < 10)
            {
                return new UserLoginResponse
                {
                    Success = false,
                    Message = "Valid mobile number is required"
                };
            }

            // Validate name
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return new UserLoginResponse
                {
                    Success = false,
                    Message = "Name is required"
                };
            }

            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Mobile == request.Mobile);

            User user;
            if (existingUser != null)
            {
                // Update existing user
                existingUser.Name = request.Name;
                existingUser.Email = request.Email ?? existingUser.Email;
                existingUser.City = request.City ?? existingUser.City;
                existingUser.State = request.State ?? existingUser.State;
                existingUser.Country = request.Country ?? existingUser.Country;
                existingUser.LastLoginAt = DateTime.UtcNow;
                existingUser.IsActive = true;
                
                await _context.SaveChangesAsync();
                user = existingUser;

                // Logout user from other devices/connections
                await LogoutUserFromOtherDevicesAsync(user.Id, "");
            }
            else
            {
                // Create new user
                user = new User
                {
                    Name = request.Name,
                    Mobile = request.Mobile,
                    Email = request.Email ?? string.Empty,
                    City = request.City,
                    State = request.State,
                    Country = request.Country,
                    CreatedAt = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);
            var expiresAt = DateTime.UtcNow.AddHours(5); // 5 hour expiry

            return new UserLoginResponse
            {
                Success = true,
                Message = existingUser != null ? "Login successful" : "Registration successful",
                User = new UserInfo
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
                },
                Token = token,
                ExpiresAt = expiresAt
            };
        }
        catch (Exception ex)
        {
            return new UserLoginResponse
            {
                Success = false,
                Message = $"An error occurred: {ex.Message}"
            };
        }
    }

    public async Task<ValidateUserTokenResponse> ValidateTokenAsync(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var secretKey = _configuration["JwtSettings:SecretKey"];
            var key = Encoding.UTF8.GetBytes(secretKey);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtSettings:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["JwtSettings:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (long.TryParse(userIdClaim, out var userId))
            {
                var user = await GetUserByIdAsync(userId);
                if (user != null && user.IsActive)
                {
                    return new ValidateUserTokenResponse
                    {
                        IsValid = true,
                        Message = "Token is valid",
                        User = new UserInfo
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
                        },
                        ExpiresAt = validatedToken.ValidTo
                    };
                }
            }

            return new ValidateUserTokenResponse
            {
                IsValid = false,
                Message = "Invalid token or user not found"
            };
        }
        catch (Exception ex)
        {
            return new ValidateUserTokenResponse
            {
                IsValid = false,
                Message = $"Token validation failed: {ex.Message}"
            };
        }
    }

    public async Task<bool> LogoutUserFromOtherDevicesAsync(long userId, string currentConnectionId)
    {
        try
        {
            // Remove all existing connections for this user except the current one
            var existingConnections = await _context.Participants
                .Where(p => p.UserId == userId && p.ConnectionId != currentConnectionId)
                .ToListAsync();

            if (existingConnections.Any())
            {
                _context.Participants.RemoveRange(existingConnections);
                await _context.SaveChangesAsync();
                return true;
            }
            return false;
        }
        catch
        {
            return false;
        }
    }

    public async Task<User?> GetUserByIdAsync(long userId)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
    }

    public async Task<User?> GetUserByMobileAsync(string mobile)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Mobile == mobile && u.IsActive);
    }

    private string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var secretKey = _configuration["JwtSettings:SecretKey"];
        var key = Encoding.UTF8.GetBytes(secretKey);
        var issuer = _configuration["JwtSettings:Issuer"];
        var audience = _configuration["JwtSettings:Audience"];

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.MobilePhone, user.Mobile),
            new Claim("role", "viewer"),
            new Claim("created", DateTime.UtcNow.ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(5), // 5 hour expiry
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}