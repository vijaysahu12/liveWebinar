namespace liveWebinar.Models;

public class User
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string? ProfilePicture { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    
    // Navigation properties
    public virtual ICollection<Participant> Participations { get; set; } = new List<Participant>();
}