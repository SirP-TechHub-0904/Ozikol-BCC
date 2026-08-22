using Microsoft.Extensions.Hosting;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Reserved hosted-service slot for future newsletter scheduling.
    /// Email delivery currently runs through EmailBackgroundWorker.
    /// Keep this class inert until the scheduling model is defined so two workers
    /// do not process the same newsletter queue.
    /// </summary>
    public class NewsletterSchedulerBackgroundService : BackgroundService
    {
        protected override Task ExecuteAsync(CancellationToken stoppingToken) { return Task.CompletedTask; }
    }
}
