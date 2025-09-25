using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace liveWebinar.Services;

public class AuthenticationService : IAuthenticationService
{
    private readonly IConfiguration _configuration;
    
    public AuthenticationService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateJwtToken(string userId, string role, string webinarId)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];
        var expiryHours = int.Parse(jwtSettings["ExpiryInHours"] ?? "24");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim("webinarId", webinarId.ToString()),
            new Claim("tokenType", "webinar-access"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateJwtToken(string token)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"];
        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));

        var tokenHandler = new JwtSecurityTokenHandler();
        
        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    public bool IsValidHostToken(string token, string userId, string webinarId)
    {
        // Remove "Bearer " prefix if present
        if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            token = token.Substring(7);

        var principal = ValidateJwtToken(token);
        if (principal == null)
            return false;

        // Verify the token claims match the request
        var tokenUserId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var tokenRole = principal.FindFirst(ClaimTypes.Role)?.Value;
        var tokenWebinarId = principal.FindFirst("webinarId")?.Value;
        var tokenType = principal.FindFirst("tokenType")?.Value;

        return tokenUserId == userId &&
               tokenRole == "host" &&
               tokenWebinarId == webinarId &&
               tokenType == "webinar-access";
    }
}