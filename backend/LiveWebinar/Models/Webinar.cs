namespace liveWebinar.Models;

public class Webinar
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public int DurationMinutes { get; set; }
    
    // Navigation properties
    public virtual ICollection<Participant> Participants { get; set; } = new List<Participant>();
    public virtual ICollection<Poll> Polls { get; set; } = new List<Poll>();
}