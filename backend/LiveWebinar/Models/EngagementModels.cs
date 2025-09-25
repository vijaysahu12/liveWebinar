using System.ComponentModel.DataAnnotations;

namespace liveWebinar.Models;
    public class EngagementContent
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int WebinarId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // "qr_code", "announcement", "file_share", "like_request"
        
        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        public string? Content { get; set; } // JSON content for different types
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ExpiresAt { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public long CreatedByUserId { get; set; }
        
        public User CreatedBy { get; set; } = null!;
        
        public List<UserInteraction> Interactions { get; set; } = new List<UserInteraction>();
    }

    public class UserInteraction
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public long UserId { get; set; }
        
        [Required]
        public int EngagementContentId { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string InteractionType { get; set; } = string.Empty; // "like", "click", "download", "view"
        
        public string? Data { get; set; } // Additional interaction data
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public User User { get; set; } = null!;
        
        public EngagementContent EngagementContent { get; set; } = null!;
    }

    public class Question
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int WebinarId { get; set; }
        
        [Required]
        public long AskedByUserId { get; set; }
        
        [Required]
        [MaxLength(1000)]
        public string QuestionText { get; set; } = string.Empty;
        
        public DateTime AskedAt { get; set; } = DateTime.UtcNow;
        
        public bool IsAnswered { get; set; } = false;
        
        public bool IsPublic { get; set; } = true;
        
        public User AskedBy { get; set; } = null!;
        
        public List<QuestionAnswer> Answers { get; set; } = new List<QuestionAnswer>();
    }

    public class QuestionAnswer
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int QuestionId { get; set; }
        
        [Required]
        public long AnsweredByUserId { get; set; }
        
        [Required]
        [MaxLength(2000)]
        public string AnswerText { get; set; } = string.Empty;
        
        public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
        
        public bool IsPublic { get; set; } = true;
        
        public Question Question { get; set; } = null!;
        
        public User AnsweredBy { get; set; } = null!;
    }