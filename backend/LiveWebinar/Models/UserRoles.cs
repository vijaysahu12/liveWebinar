using System.ComponentModel.DataAnnotations;

namespace liveWebinar.Models
{
    public enum UserRole
    {
        Guest = 0,
        Admin = 1,
        Host = 2
    }

    public enum SubscriptionType
    {
        Free = 0,
        Paid = 1
    }

    public enum WebinarStatus
    {
        Scheduled = 0,
        Live = 1,
        Completed = 2,
        Cancelled = 3
    }

    public class WebinarSchedule
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;
        
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;
        
        [Required]
        public DateTime ScheduledDateTime { get; set; }
        
        public int DurationMinutes { get; set; } = 90;
        
        [StringLength(500)]
        public string ThumbnailUrl { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string StreamUrl { get; set; } = string.Empty;
        
        public WebinarStatus Status { get; set; } = WebinarStatus.Scheduled;
        
        public SubscriptionType RequiredSubscription { get; set; } = SubscriptionType.Free;
        
        public decimal Price { get; set; } = 0;
        
        [Required]
        public long HostUserId { get; set; }
        
        public User Host { get; set; } = null!;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<WebinarRegistration> Registrations { get; set; } = new List<WebinarRegistration>();
        public ICollection<WebinarAccess> AccessLogs { get; set; } = new List<WebinarAccess>();
    }

    public class WebinarRegistration
    {
        public int Id { get; set; }
        
        [Required]
        public int WebinarId { get; set; }
        public WebinarSchedule Webinar { get; set; } = null!;
        
        [Required]
        public long UserId { get; set; }
        public User User { get; set; } = null!;
        
        public SubscriptionType SubscriptionUsed { get; set; }
        
        public decimal AmountPaid { get; set; } = 0;
        
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
        
        public bool IsActive { get; set; } = true;
        
        [StringLength(100)]
        public string PaymentTransactionId { get; set; } = string.Empty;
    }

    public class WebinarAccess
    {
        public int Id { get; set; }
        
        [Required]
        public int WebinarId { get; set; }
        public WebinarSchedule Webinar { get; set; } = null!;
        
        [Required]
        public long UserId { get; set; }
        public User User { get; set; } = null!;
        
        public DateTime AccessedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? LeftAt { get; set; }
        
        public int DurationMinutes { get; set; } = 0;
        
        [StringLength(45)]
        public string IpAddress { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string UserAgent { get; set; } = string.Empty;
    }

    public class UserSubscription
    {
        public int Id { get; set; }
        
        [Required]
        public long UserId { get; set; }
        public User User { get; set; } = null!;
        
        public SubscriptionType Type { get; set; }
        
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        
        public DateTime? EndDate { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public decimal AmountPaid { get; set; } = 0;
        
        [StringLength(100)]
        public string PaymentTransactionId { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}