using System.Text.Json.Serialization;

namespace liveWebinar.Models
{
    public class LoginRequest
    {
        public string Mobile { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class LoginResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto? User { get; set; }
        public string? Token { get; set; }
    }

    public class UserDto
    {
        public long UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        
        [JsonPropertyName("userRoleType")]
        public UserRole UserRoleType { get; set; } // Explicitly map to userRoleType for frontend compatibility
        
        public bool IsEmailVerified { get; set; }
        public bool IsMobileVerified { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastLoginAt { get; set; }
    }

    public class WebinarScheduleDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime ScheduledDateTime { get; set; }
        public int DurationMinutes { get; set; }
        public string ThumbnailUrl { get; set; } = string.Empty;
        public string StreamUrl { get; set; } = string.Empty;
        public WebinarStatus Status { get; set; }
        public SubscriptionType RequiredSubscription { get; set; }
        public decimal Price { get; set; }
        public string HostName { get; set; } = string.Empty;
        public int RegisteredCount { get; set; }
        public bool CanAccess { get; set; }
        public bool IsRegistered { get; set; }
        public bool IsLive { get; set; }
        public bool IsAccessible { get; set; } // Within 5-hour window
    }

    public class CreateWebinarRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime ScheduledDateTime { get; set; }
        public int DurationMinutes { get; set; } = 90;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public string StreamUrl { get; set; } = string.Empty;
        public SubscriptionType RequiredSubscription { get; set; } = SubscriptionType.Free;
        public decimal Price { get; set; } = 0;
    }

    public class WebinarRegistrationRequest
    {
        public int WebinarId { get; set; }
        public SubscriptionType SubscriptionType { get; set; } = SubscriptionType.Free;
        public string? PaymentTransactionId { get; set; }
        public decimal AmountPaid { get; set; } = 0;
    }

    public class SubscriptionRequest
    {
        public SubscriptionType Type { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal AmountPaid { get; set; } = 0;
        public string? PaymentTransactionId { get; set; }
    }

    public class WebinarAccessResponse
    {
        public bool CanAccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public WebinarScheduleDto? Webinar { get; set; }
        public TimeSpan? RemainingTime { get; set; }
    }

    public class DashboardResponse
    {
        public UserDto User { get; set; } = new();
        public List<WebinarScheduleDto> UpcomingWebinars { get; set; } = new();
        public List<WebinarScheduleDto> MyWebinars { get; set; } = new(); // For hosts
        public List<WebinarScheduleDto> RegisteredWebinars { get; set; } = new(); // For guests
        public UserSubscription? ActiveSubscription { get; set; }
        public int TotalRegistrations { get; set; }
        public int TotalWebinarsHosted { get; set; }
    }
}