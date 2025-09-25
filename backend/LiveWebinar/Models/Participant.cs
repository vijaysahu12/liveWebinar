namespace liveWebinar.Models;

public class Participant
{
    public long Id { get; set; }
    public long WebinarId { get; set; } // Changed from int to long to match Webinar.Id
    public long UserId { get; set; }
    public string ConnectionId { get; set; } = string.Empty;
    public string Role { get; set; } = "viewer"; // or host
    public DateTime ConnectedAt { get; set; }
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Webinar Webinar { get; set; } = null!;
}