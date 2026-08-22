using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Ozikol_BCC.Application.Services
{
    public class LoggerLibrary
    {
        private readonly string logFilePath;

        public LoggerLibrary(IWebHostEnvironment env)
        {
            var wwwRootPath = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            logFilePath = Path.Combine(wwwRootPath, "datalog.txt");
        }

        public async Task Log(string message)
        {
            string logMessage = $"{DateTime.UtcNow.AddHours(1)} - log {message}\n";
            await File.AppendAllTextAsync(logFilePath, logMessage);
        }
    }
}

