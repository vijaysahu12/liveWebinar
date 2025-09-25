using System.ComponentModel.DataAnnotations;

namespace liveWebinar.Models;
    public class InteractivePoll
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Question { get; set; } = string.Empty;
        
        [Required]
        public int WebinarId { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? EndTime { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public bool AllowMultipleChoices { get; set; } = false;
        
        public int DurationInSeconds { get; set; } = 0; // 0 = no timeout
        
        public List<InteractivePollOption> Options { get; set; } = new List<InteractivePollOption>();
        
        public List<InteractivePollVote> Votes { get; set; } = new List<InteractivePollVote>();
    }

    public class InteractivePollOption
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int InteractivePollId { get; set; }
        
        [Required]
        [MaxLength(300)]
        public string Text { get; set; } = string.Empty;
        
        public int VoteCount { get; set; } = 0;
        
        public InteractivePoll InteractivePoll { get; set; } = null!;
        
        public List<InteractivePollVote> Votes { get; set; } = new List<InteractivePollVote>();
    }

    public class InteractivePollVote
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int InteractivePollId { get; set; }
        
        [Required]
        public int InteractivePollOptionId { get; set; }
        
        [Required]
        public long UserId { get; set; }
        
        public DateTime VotedAt { get; set; } = DateTime.UtcNow;
        
        public InteractivePoll InteractivePoll { get; set; } = null!;
        
        public InteractivePollOption InteractivePollOption { get; set; } = null!;
        
        public User User { get; set; } = null!;
    }