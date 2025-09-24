namespace Webinar.Api.Models;

public class Participant
{
    public int Id { get; set; }
    public string WebinarId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public string Role { get; set; } = "viewer"; // or host
    public DateTime ConnectedAt { get; set; }
}