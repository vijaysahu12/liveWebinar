namespace liveWebinar.Models;

// User Registration/Login Request
public class UserLoginRequest
{
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
}

// User Login Response
public class UserLoginResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserInfo? User { get; set; }
    public string? Token { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

// User Information
public class UserInfo
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
}

// Token Validation Request
public class ValidateUserTokenRequest
{
    public string Token { get; set; } = string.Empty;
}

// Token Validation Response
public class ValidateUserTokenResponse
{
    public bool IsValid { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserInfo? User { get; set; }
    public DateTime? ExpiresAt { get; set; }
}