using Microsoft.EntityFrameworkCore;
using liveWebinar.Models;


namespace liveWebinar.Data;


public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Webinar> Webinars { get; set; }
    public DbSet<Participant> Participants { get; set; }
    public DbSet<Poll> Polls { get; set; }
}