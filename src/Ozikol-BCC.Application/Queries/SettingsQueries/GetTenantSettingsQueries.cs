using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Queries.SettingsQueries
{
    /// <summary>
    /// Data transfer object holding tenant-level custom administrative aliases.
    /// </summary>
    public class TerminologyAliasesDto
    {
        public string GroupAlias { get; set; } = "Group";
        public string CategoryAlias { get; set; } = "Category";
        public string SubCategoryAlias { get; set; } = "Sub-Category";
        public string AlumniAlias { get; set; } = "Alumni";
    }

    /// <summary>
    /// Query to fetch custom terminology aliases for the active tenant.
    /// </summary>
    public class GetTerminologyAliasesQuery : IRequest<TerminologyAliasesDto> { }

    /// <summary>
    /// Handler resolving custom terminology aliases from <see cref="MisConfigurationSetting"/>.
    /// </summary>
    public class GetTerminologyAliasesQueryHandler : IRequestHandler<GetTerminologyAliasesQuery, TerminologyAliasesDto>
    {
        private readonly DashboardDbContext _dbContext;

        public GetTerminologyAliasesQueryHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<TerminologyAliasesDto> Handle(GetTerminologyAliasesQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var opsSetting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync(cancellationToken);
                return new TerminologyAliasesDto
                {
                    GroupAlias = opsSetting?.GroupAlias ?? "Group",
                    CategoryAlias = opsSetting?.CategoryAlias ?? "Category",
                    SubCategoryAlias = opsSetting?.SubCategoryAlias ?? "Sub-Category",
                    AlumniAlias = opsSetting?.AlumniAlias ?? "Alumni"
                };
            }
            catch
            {
                return new TerminologyAliasesDto();
            }
        }
    }

    /// <summary>
    /// Query to retrieve brand identity settings.
    /// </summary>
    public class GetBrandSettingsQuery : IRequest<MisWebsiteSetting> { }

    /// <summary>
    /// Handler resolving brand identity settings from <see cref="MisWebsiteSetting"/>.
    /// </summary>
    public class GetBrandSettingsQueryHandler : IRequestHandler<GetBrandSettingsQuery, MisWebsiteSetting>
    {
        private readonly DashboardDbContext _dbContext;

        public GetBrandSettingsQueryHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<MisWebsiteSetting> Handle(GetBrandSettingsQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var brandSetting = await _dbContext.MisWebsiteSettings.FirstOrDefaultAsync(cancellationToken);
                return brandSetting ?? new MisWebsiteSetting();
            }
            catch
            {
                return new MisWebsiteSetting();
            }
        }
    }
}
