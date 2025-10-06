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
    public long UserId => Id; // Map Id to UserId for frontend compatibility
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
    public UserRole UserRoleType { get; set; }
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

// Admin User Creation Request
public class AdminCreateUserRequest
{
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public UserRole UserRoleType { get; set; } = UserRole.Guest;
    public bool IsActive { get; set; } = true;
}

// Admin User Creation Response
public class AdminCreateUserResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserInfo? User { get; set; }
}

// Admin User List Response
public class AdminUserListResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<AdminUserInfo> Users { get; set; } = new List<AdminUserInfo>();
    public int TotalCount { get; set; }
}

// Admin User Information (includes role)
public class AdminUserInfo
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
    public UserRole UserRoleType { get; set; }
    public bool IsActive { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsMobileVerified { get; set; }
}

// Admin Update User Request
public class AdminUpdateUserRequest
{
    public long Id { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public UserRole? UserRoleType { get; set; }
    public bool? IsActive { get; set; }
}