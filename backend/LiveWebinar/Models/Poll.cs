namespace Webinar.Api.Models;

public class Poll
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string WebinarId { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string[] Options { get; set; } = Array.Empty<string>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}