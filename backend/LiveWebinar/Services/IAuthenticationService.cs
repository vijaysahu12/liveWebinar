using System.Security.Claims;

namespace liveWebinar.Services;

public interface IAuthenticationService
{
    string GenerateJwtToken(string userId, string role, string webinarId);
    ClaimsPrincipal? ValidateJwtToken(string token);
    bool IsValidHostToken(string token, string userId, string webinarId);
}