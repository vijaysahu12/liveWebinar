namespace liveWebinar.Models;

public class Poll
{
    public long Id { get; set; }
    public int WebinarId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string[] Options { get; set; } = Array.Empty<string>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}