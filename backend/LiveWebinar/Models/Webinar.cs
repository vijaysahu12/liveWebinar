namespace liveWebinar.Models;

public class Webinar
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public int DurationMinutes { get; set; }
}