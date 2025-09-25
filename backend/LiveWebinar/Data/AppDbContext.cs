using Microsoft.EntityFrameworkCore;
using liveWebinar.Models;


namespace liveWebinar.Data;


public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    
    public DbSet<User> Users { get; set; }
    public DbSet<Webinar> Webinars { get; set; }
    public DbSet<Participant> Participants { get; set; }
    public DbSet<Poll> Polls { get; set; }
    
    // Engagement models
    public DbSet<InteractivePoll> InteractivePolls { get; set; }
    public DbSet<InteractivePollOption> InteractivePollOptions { get; set; }
    public DbSet<InteractivePollVote> InteractivePollVotes { get; set; }
    public DbSet<EngagementContent> EngagementContents { get; set; }
    public DbSet<UserInteraction> UserInteractions { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<QuestionAnswer> QuestionAnswers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Mobile).IsUnique();
            entity.Property(e => e.Mobile).IsRequired().HasMaxLength(15);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.State).HasMaxLength(100);
            entity.Property(e => e.Country).HasMaxLength(100);
        });

        // Configure Participant entity
        modelBuilder.Entity<Participant>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            // Create unique constraint on UserId + WebinarId combination
            entity.HasIndex(e => new { e.UserId, e.WebinarId })
                  .IsUnique()
                  .HasDatabaseName("IX_Participants_UserId_WebinarId_Unique");
            
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Participations)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Webinar)
                  .WithMany(w => w.Participants)
                  .HasForeignKey(e => e.WebinarId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Poll entity
        modelBuilder.Entity<Poll>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Webinar)
                  .WithMany(w => w.Polls)
                  .HasForeignKey(e => e.WebinarId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Webinar entity
        modelBuilder.Entity<Webinar>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
        });

        // Configure InteractivePoll entity
        modelBuilder.Entity<InteractivePoll>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Question).IsRequired().HasMaxLength(500);
            entity.HasMany(e => e.Options)
                  .WithOne(o => o.InteractivePoll)
                  .HasForeignKey(o => o.InteractivePollId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(e => e.Votes)
                  .WithOne(v => v.InteractivePoll)
                  .HasForeignKey(v => v.InteractivePollId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure InteractivePollOption entity
        modelBuilder.Entity<InteractivePollOption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).IsRequired().HasMaxLength(300);
            entity.HasMany(e => e.Votes)
                  .WithOne(v => v.InteractivePollOption)
                  .HasForeignKey(v => v.InteractivePollOptionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure InteractivePollVote entity
        modelBuilder.Entity<InteractivePollVote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
            
            // Ensure unique vote per user per poll
            entity.HasIndex(e => new { e.UserId, e.InteractivePollId })
                  .IsUnique()
                  .HasDatabaseName("IX_InteractivePollVotes_UserId_PollId_Unique");
        });

        // Configure EngagementContent entity
        modelBuilder.Entity<EngagementContent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasOne(e => e.CreatedBy)
                  .WithMany()
                  .HasForeignKey(e => e.CreatedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(e => e.Interactions)
                  .WithOne(i => i.EngagementContent)
                  .HasForeignKey(i => i.EngagementContentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure UserInteraction entity
        modelBuilder.Entity<UserInteraction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InteractionType).IsRequired().HasMaxLength(50);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure Question entity
        modelBuilder.Entity<Question>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.QuestionText).IsRequired().HasMaxLength(1000);
            entity.HasOne(e => e.AskedBy)
                  .WithMany()
                  .HasForeignKey(e => e.AskedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(e => e.Answers)
                  .WithOne(a => a.Question)
                  .HasForeignKey(a => a.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure QuestionAnswer entity
        modelBuilder.Entity<QuestionAnswer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AnswerText).IsRequired().HasMaxLength(2000);
            entity.HasOne(e => e.AnsweredBy)
                  .WithMany()
                  .HasForeignKey(e => e.AnsweredByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        base.OnModelCreating(modelBuilder);
    }
}