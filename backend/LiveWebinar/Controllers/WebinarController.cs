using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using liveWebinar.Data;
using liveWebinar.Models;

namespace liveWebinar.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WebinarController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<WebinarController> _logger;

    public WebinarController(AppDbContext context, ILogger<WebinarController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Get all upcoming webinars (public)
    [HttpGet("upcoming")]
    public async Task<IActionResult> GetUpcomingWebinars()
    {
        try
        {
            var webinars = await _context.WebinarSchedules
                .Include(w => w.Host)
                .Include(w => w.Registrations)
                .Where(w => w.ScheduledDateTime > DateTime.UtcNow && w.Status == WebinarStatus.Scheduled)
                .OrderBy(w => w.ScheduledDateTime)
                .Select(w => new WebinarScheduleDto
                {
                    Id = w.Id,
                    Title = w.Title,
                    Description = w.Description,
                    ScheduledDateTime = w.ScheduledDateTime,
                    DurationMinutes = w.DurationMinutes,
                    ThumbnailUrl = w.ThumbnailUrl,
                    Status = w.Status,
                    RequiredSubscription = w.RequiredSubscription,
                    Price = w.Price,
                    HostName = w.Host.Name,
                    RegisteredCount = w.Registrations.Count(r => r.IsActive),
                    IsLive = false,
                    IsAccessible = false
                })
                .ToListAsync();

            return Ok(webinars);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching upcoming webinars");
            return StatusCode(500, "Internal server error");
        }
    }

    // Get user dashboard (requires authentication)
    [HttpGet("dashboard/{userId}")]
    public async Task<IActionResult> GetUserDashboard(long userId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Subscriptions)
                .Include(u => u.Registrations)
                .ThenInclude(r => r.Webinar)
                .Include(u => u.HostedWebinars)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound("User not found");

            // Get upcoming webinars data from database first (without custom method calls)
            var upcomingWebinarsData = await _context.WebinarSchedules
                .Include(w => w.Host)
                .Include(w => w.Registrations)
                .Where(w => w.ScheduledDateTime > DateTime.UtcNow && w.Status == WebinarStatus.Scheduled)
                .OrderBy(w => w.ScheduledDateTime)
                .Take(10)
                .Select(w => new 
                {
                    Id = w.Id,
                    Title = w.Title,
                    Description = w.Description,
                    ScheduledDateTime = w.ScheduledDateTime,
                    DurationMinutes = w.DurationMinutes,
                    ThumbnailUrl = w.ThumbnailUrl,
                    Status = w.Status,
                    RequiredSubscription = w.RequiredSubscription,
                    Price = w.Price,
                    HostName = w.Host.Name,
                    RegisteredCount = w.Registrations.Count(r => r.IsActive),
                    IsRegistered = w.Registrations.Any(r => r.UserId == userId && r.IsActive),
                    IsLive = w.Status == WebinarStatus.Live,
                    Webinar = w // Keep reference to full webinar for business logic checks
                })
                .ToListAsync();

            // Apply business logic checks in memory
            var upcomingWebinars = upcomingWebinarsData.Select(w => new WebinarScheduleDto
            {
                Id = w.Id,
                Title = w.Title,
                Description = w.Description,
                ScheduledDateTime = w.ScheduledDateTime,
                DurationMinutes = w.DurationMinutes,
                ThumbnailUrl = w.ThumbnailUrl,
                Status = w.Status,
                RequiredSubscription = w.RequiredSubscription,
                Price = w.Price,
                HostName = w.HostName,
                RegisteredCount = w.RegisteredCount,
                IsRegistered = w.IsRegistered,
                CanAccess = CheckWebinarAccess(w.Webinar, user),
                IsLive = w.IsLive,
                IsAccessible = IsWebinarAccessible(w.Webinar)
            }).ToList();

            var activeSubscription = user.Subscriptions
                .Where(s => s.IsActive && (s.EndDate == null || s.EndDate > DateTime.UtcNow))
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefault();

            var dashboard = new DashboardResponse
            {
                User = new UserDto
                {
                    UserId = user.Id,
                    Name = user.Name,
                    Mobile = user.Mobile,
                    Email = user.Email,
                    Role = user.UserRoleType,
                    IsEmailVerified = user.IsEmailVerified,
                    IsMobileVerified = user.IsMobileVerified,
                    CreatedAt = user.CreatedAt,
                    LastLoginAt = user.LastLoginAt
                },
                UpcomingWebinars = upcomingWebinars,
                RegisteredWebinars = user.Registrations
                    .Where(r => r.IsActive && r.Webinar.ScheduledDateTime > DateTime.UtcNow)
                    .ToList() // Execute query first
                    .Select(r => new WebinarScheduleDto
                    {
                        Id = r.Webinar.Id,
                        Title = r.Webinar.Title,
                        Description = r.Webinar.Description,
                        ScheduledDateTime = r.Webinar.ScheduledDateTime,
                        DurationMinutes = r.Webinar.DurationMinutes,
                        ThumbnailUrl = r.Webinar.ThumbnailUrl,
                        Status = r.Webinar.Status,
                        RequiredSubscription = r.Webinar.RequiredSubscription,
                        Price = r.Webinar.Price,
                        HostName = r.Webinar.Host.Name,
                        IsRegistered = true,
                        CanAccess = true,
                        IsLive = r.Webinar.Status == WebinarStatus.Live,
                        IsAccessible = IsWebinarAccessible(r.Webinar) // Now safe to call in memory
                    })
                    .ToList(),
                MyWebinars = user.UserRoleType == UserRole.Host || user.UserRoleType == UserRole.Admin 
                    ? user.HostedWebinars.Select(w => new WebinarScheduleDto
                    {
                        Id = w.Id,
                        Title = w.Title,
                        Description = w.Description,
                        ScheduledDateTime = w.ScheduledDateTime,
                        DurationMinutes = w.DurationMinutes,
                        ThumbnailUrl = w.ThumbnailUrl,
                        Status = w.Status,
                        RequiredSubscription = w.RequiredSubscription,
                        Price = w.Price,
                        HostName = w.Host.Name,
                        RegisteredCount = w.Registrations.Count(r => r.IsActive),
                        CanAccess = true,
                        IsLive = w.Status == WebinarStatus.Live
                    }).ToList()
                    : new List<WebinarScheduleDto>(),
                ActiveSubscription = activeSubscription,
                TotalRegistrations = user.Registrations.Count(r => r.IsActive),
                TotalWebinarsHosted = user.HostedWebinars.Count
            };

            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user dashboard for user {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    // Create webinar (Host/Admin only)
    [HttpPost("create")]
    public async Task<IActionResult> CreateWebinar([FromBody] CreateWebinarRequest request, [FromQuery] long hostUserId)
    {
        try
        {
            var host = await _context.Users.FindAsync(hostUserId);
            if (host == null)
                return NotFound("Host user not found");

            if (host.UserRoleType != UserRole.Host && host.UserRoleType != UserRole.Admin)
                return Forbid("Only hosts and admins can create webinars");

            var webinar = new WebinarSchedule
            {
                Title = request.Title,
                Description = request.Description,
                ScheduledDateTime = request.ScheduledDateTime,
                DurationMinutes = request.DurationMinutes,
                ThumbnailUrl = request.ThumbnailUrl,
                StreamUrl = request.StreamUrl,
                RequiredSubscription = request.RequiredSubscription,
                Price = request.Price,
                HostUserId = hostUserId,
                Status = WebinarStatus.Scheduled
            };

            _context.WebinarSchedules.Add(webinar);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, webinarId = webinar.Id, message = "Webinar created successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating webinar");
            return StatusCode(500, "Internal server error");
        }
    }

    // Register for webinar
    [HttpPost("register")]
    public async Task<IActionResult> RegisterForWebinar([FromBody] WebinarRegistrationRequest request, [FromQuery] long userId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Subscriptions)
                .Include(u => u.Registrations)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound("User not found");

            var webinar = await _context.WebinarSchedules
                .Include(w => w.Registrations)
                .FirstOrDefaultAsync(w => w.Id == request.WebinarId);

            if (webinar == null)
                return NotFound("Webinar not found");

            // Check if already registered
            var existingRegistration = user.Registrations
                .FirstOrDefault(r => r.WebinarId == request.WebinarId && r.IsActive);

            if (existingRegistration != null)
                return BadRequest("Already registered for this webinar");

            // Check subscription requirements
            if (webinar.RequiredSubscription == SubscriptionType.Paid)
            {
                var hasActiveSubscription = user.Subscriptions
                    .Any(s => s.IsActive && s.Type == SubscriptionType.Paid && 
                             (s.EndDate == null || s.EndDate > DateTime.UtcNow));

                if (!hasActiveSubscription && request.SubscriptionType != SubscriptionType.Paid)
                    return BadRequest("Paid subscription required for this webinar");
            }

            var registration = new WebinarRegistration
            {
                WebinarId = request.WebinarId,
                UserId = userId,
                SubscriptionUsed = request.SubscriptionType,
                AmountPaid = request.AmountPaid,
                PaymentTransactionId = request.PaymentTransactionId,
                IsActive = true
            };

            _context.WebinarRegistrations.Add(registration);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Successfully registered for webinar" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error registering for webinar");
            return StatusCode(500, "Internal server error");
        }
    }

    // Check webinar access
    [HttpGet("access/{webinarId}")]
    public async Task<IActionResult> CheckWebinarAccess(int webinarId, [FromQuery] long userId)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.Subscriptions)
                .Include(u => u.Registrations)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound("User not found");

            var webinar = await _context.WebinarSchedules
                .Include(w => w.Host)
                .Include(w => w.Registrations)
                .FirstOrDefaultAsync(w => w.Id == webinarId);

            if (webinar == null)
                return NotFound("Webinar not found");

            var canAccess = CheckWebinarAccess(webinar, user);
            var isAccessible = IsWebinarAccessible(webinar);
            var remainingTime = GetRemainingAccessTime(webinar);

            var response = new WebinarAccessResponse
            {
                CanAccess = canAccess && isAccessible,
                Message = GetAccessMessage(canAccess, isAccessible, webinar),
                Webinar = new WebinarScheduleDto
                {
                    Id = webinar.Id,
                    Title = webinar.Title,
                    Description = webinar.Description,
                    ScheduledDateTime = webinar.ScheduledDateTime,
                    DurationMinutes = webinar.DurationMinutes,
                    ThumbnailUrl = webinar.ThumbnailUrl,
                    StreamUrl = webinar.StreamUrl,
                    Status = webinar.Status,
                    RequiredSubscription = webinar.RequiredSubscription,
                    Price = webinar.Price,
                    HostName = webinar.Host.Name,
                    IsRegistered = webinar.Registrations.Any(r => r.UserId == userId && r.IsActive),
                    CanAccess = canAccess,
                    IsLive = webinar.Status == WebinarStatus.Live,
                    IsAccessible = isAccessible
                },
                RemainingTime = remainingTime
            };

            // Log access attempt
            if (canAccess && isAccessible)
            {
                var accessLog = new WebinarAccess
                {
                    WebinarId = webinarId,
                    UserId = userId,
                    AccessedAt = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString()
                };

                _context.WebinarAccesses.Add(accessLog);
                await _context.SaveChangesAsync();
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking webinar access");
            return StatusCode(500, "Internal server error");
        }
    }

    private bool CheckWebinarAccess(WebinarSchedule webinar, User user)
    {
        // Host and admin always have access
        if (user.UserRoleType == UserRole.Host || user.UserRoleType == UserRole.Admin)
            return true;

        // Check if registered
        var registration = user.Registrations
            .FirstOrDefault(r => r.WebinarId == webinar.Id && r.IsActive);

        if (registration == null)
            return false;

        // Check subscription requirements
        if (webinar.RequiredSubscription == SubscriptionType.Paid)
        {
            return user.Subscriptions
                .Any(s => s.IsActive && s.Type == SubscriptionType.Paid && 
                         (s.EndDate == null || s.EndDate > DateTime.UtcNow));
        }

        return true;
    }

    private bool IsWebinarAccessible(WebinarSchedule webinar)
    {
        var now = DateTime.UtcNow;
        var endTime = webinar.ScheduledDateTime.AddHours(5); // 5-hour window

        return now >= webinar.ScheduledDateTime && now <= endTime;
    }

    private TimeSpan? GetRemainingAccessTime(WebinarSchedule webinar)
    {
        var now = DateTime.UtcNow;
        var endTime = webinar.ScheduledDateTime.AddHours(5);

        if (now > endTime)
            return TimeSpan.Zero;

        if (now < webinar.ScheduledDateTime)
            return null; // Not started yet

        return endTime - now;
    }

    private string GetAccessMessage(bool canAccess, bool isAccessible, WebinarSchedule webinar)
    {
        if (!canAccess)
            return "You are not registered for this webinar or don't have the required subscription";

        if (!isAccessible)
        {
            var now = DateTime.UtcNow;
            if (now < webinar.ScheduledDateTime)
                return $"Webinar will be available from {webinar.ScheduledDateTime:MMM dd, yyyy HH:mm} UTC";
            else
                return "Webinar access period has expired (5-hour window)";
        }

        return "Access granted";
    }
}