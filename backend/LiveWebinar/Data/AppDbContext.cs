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

        base.OnModelCreating(modelBuilder);
    }
}