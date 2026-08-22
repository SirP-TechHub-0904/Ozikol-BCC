using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models.Settings;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Queries.SettingsQueries
{
    public class TerminologyAliasesDto
    {
        public string GroupAlias { get; set; } = "Group";
        public string CategoryAlias { get; set; } = "Category";
        public string SubCategoryAlias { get; set; } = "Sub-Category";
        public string AlumniAlias { get; set; } = "Alumni";
    }

    public class GetTerminologyAliasesQuery : IRequest<TerminologyAliasesDto> { }

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
                var opsSetting = await _dbContext.Set<BcpTenantOperationsSetting>().FirstOrDefaultAsync(cancellationToken);
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

    public class GetBrandSettingsQuery : IRequest<BcpTenantBrandSetting> { }

    public class GetBrandSettingsQueryHandler : IRequestHandler<GetBrandSettingsQuery, BcpTenantBrandSetting>
    {
        private readonly DashboardDbContext _dbContext;

        public GetBrandSettingsQueryHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<BcpTenantBrandSetting> Handle(GetBrandSettingsQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var brandSetting = await _dbContext.Set<BcpTenantBrandSetting>().FirstOrDefaultAsync(cancellationToken);
                return brandSetting ?? new BcpTenantBrandSetting();
            }
            catch
            {
                return new BcpTenantBrandSetting();
            }
        }
    }

    public class GetCodeInjectionSettingsQuery : IRequest<BcpTenantCodeInjectionSetting> { }

    public class GetCodeInjectionSettingsQueryHandler : IRequestHandler<GetCodeInjectionSettingsQuery, BcpTenantCodeInjectionSetting>
    {
        private readonly DashboardDbContext _dbContext;

        public GetCodeInjectionSettingsQueryHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<BcpTenantCodeInjectionSetting> Handle(GetCodeInjectionSettingsQuery request, CancellationToken cancellationToken)
        {
            try
            {
                var scriptSetting = await _dbContext.Set<BcpTenantCodeInjectionSetting>().FirstOrDefaultAsync(cancellationToken);
                return scriptSetting ?? new BcpTenantCodeInjectionSetting();
            }
            catch
            {
                return new BcpTenantCodeInjectionSetting();
            }
        }
    }
}
