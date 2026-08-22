using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Queries.SetupQueries
{
    public class SetupStatusDto
    {
        public bool IsSetupCompleted { get; set; }
        public bool DatabaseCanConnect { get; set; }
        public string? TenantName { get; set; }
        public string StatusMessage { get; set; } = string.Empty;
    }

    public class GetSetupStatusQuery : IRequest<SetupStatusDto> { }

    public class GetSetupStatusQueryHandler : IRequestHandler<GetSetupStatusQuery, SetupStatusDto>
    {
        private readonly DashboardDbContext _context;
        private readonly UserManager<Profile> _userManager;

        public GetSetupStatusQueryHandler(DashboardDbContext context, UserManager<Profile> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<SetupStatusDto> Handle(GetSetupStatusQuery request, CancellationToken cancellationToken)
        {
            try
            {
                bool canConnect = await _context.Database.CanConnectAsync(cancellationToken);
                if (!canConnect)
                {
                    return new SetupStatusDto
                    {
                        IsSetupCompleted = false,
                        DatabaseCanConnect = false,
                        StatusMessage = "Database is not connected. Run EF Core migrations first."
                    };
                }

                var hasConfig = await _context.ConfigSettings.AnyAsync(cancellationToken)
                             || await _context.ManagementSettings.AnyAsync()
                             || await _context.BcpSettings.AnyAsync();

                var hasUsers = await _userManager.Users.AnyAsync(cancellationToken);

                var config = await _context.ConfigSettings.FirstOrDefaultAsync(cancellationToken);

                return new SetupStatusDto
                {
                    IsSetupCompleted = hasConfig || hasUsers,
                    DatabaseCanConnect = true,
                    TenantName = config?.WebsiteTitle ?? config?.CompanyName,
                    StatusMessage = (hasConfig || hasUsers) ? "Setup has already been completed." : "Ready for initial setup."
                };
            }
            catch (Exception ex)
            {
                return new SetupStatusDto
                {
                    IsSetupCompleted = false,
                    DatabaseCanConnect = false,
                    StatusMessage = $"Database error: {ex.Message}"
                };
            }
        }
    }
}
