namespace liveWebinar.Models;

public class Poll
{
    public long Id { get; set; }
    public long WebinarId { get; set; } // Changed from int to long to match Webinar.Id
    public string Question { get; set; } = string.Empty;
    public string[] Options { get; set; } = Array.Empty<string>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual Webinar Webinar { get; set; } = null!;
}