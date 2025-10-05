using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using liveWebinar.Data;
using liveWebinar.Hubs;
using liveWebinar.Controllers; // Added for LiveWebinarController
using liveWebinar.Services;


var builder = WebApplication.CreateBuilder(args);


// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// EF Core with SQL Server (connection string in appsettings)
builder.Services.AddDbContext<AppDbContext>(options =>
options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register Authentication Service
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();

// Register User Service  
builder.Services.AddScoped<IUserService, UserService>();


// SignalR with WebSocket configuration
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});


// CORS (allow your Angular app origin)
builder.Services.AddCors(options => {
options.AddPolicy("AllowFrontend", policy => {
policy.WithOrigins("http://localhost:4200")
.AllowAnyHeader()
.AllowAnyMethod()
.AllowCredentials();
});
});


var app = builder.Build();

// Enable WebSocket support
app.UseWebSockets();

if (app.Environment.IsDevelopment()){
app.UseSwagger();
app.UseSwaggerUI();
}


app.UseCors("AllowFrontend");
app.UseRouting();
app.MapControllers();


app.MapHub<WebinarHub>("/hubs/webinar");


app.Run();