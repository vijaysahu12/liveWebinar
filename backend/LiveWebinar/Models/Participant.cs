namespace liveWebinar.Models;

public class Participant
{
    public long Id { get; set; }
    public int WebinarId { get; set; }
    public long UserId { get; set; }
    public string ConnectionId { get; set; } = string.Empty;
    public string Role { get; set; } = "viewer"; // or host
    public DateTime ConnectedAt { get; set; }
}