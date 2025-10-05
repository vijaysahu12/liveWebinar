namespace liveWebinar.Models;

public class Participant
{
    public long Id { get; set; }
    public long WebinarId { get; set; } // Changed from int to long to match Webinar.Id
    public long UserId { get; set; }
    public string ConnectionId { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; }
    public DateTime? LastActiveAt { get; set; }
    public string? IpAddress { get; set; } // Track location/IP
    public string? UserAgent { get; set; } // Track browser/device
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Webinar Webinar { get; set; } = null!;
}