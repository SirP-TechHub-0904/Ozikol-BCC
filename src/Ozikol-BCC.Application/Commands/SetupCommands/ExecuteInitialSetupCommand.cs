using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Ozikol_BCC.Application.Seeders;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Commands.SetupCommands
{
    public class ExecuteInitialSetupCommand : IRequest<SetupResultDto>
    {
        public string OrganizationName { get; set; } = string.Empty;
        public string DashboardTitle { get; set; } = "Business Command Platform";
        public string CurrencyCode { get; set; } = "NGN";
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminFirstName { get; set; } = string.Empty;
        public string AdminLastName { get; set; } = string.Empty;
        public string AdminPhone { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? CloudinaryFolder { get; set; }
    }

    public class SetupResultDto
    {
        public bool IsSuccess { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }

    public class ExecuteInitialSetupCommandHandler : IRequestHandler<ExecuteInitialSetupCommand, SetupResultDto>
    {
        private readonly DashboardDbContext _context;
        private readonly UserManager<Profile> _userManager;
        private readonly RoleManager<AppRole> _roleManager;
        private readonly DefaultTenantSeeder _defaultTenantSeeder;
        private readonly IConfiguration _configuration;

        public ExecuteInitialSetupCommandHandler(
            DashboardDbContext context,
            UserManager<Profile> userManager,
            RoleManager<AppRole> roleManager,
            DefaultTenantSeeder defaultTenantSeeder,
            IConfiguration configuration)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
            _defaultTenantSeeder = defaultTenantSeeder;
            _configuration = configuration;
        }

        public async Task<SetupResultDto> Handle(ExecuteInitialSetupCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.AdminEmail) || string.IsNullOrWhiteSpace(request.Password))
            {
                return new SetupResultDto { IsSuccess = false, ErrorMessage = "Admin Email and Password are required." };
            }

            var hasUsers = await _userManager.Users.AnyAsync(cancellationToken);
            if (hasUsers)
            {
                return new SetupResultDto { IsSuccess = false, ErrorMessage = "Setup has already been completed for this tenant." };
            }

            await _context.Database.MigrateAsync(cancellationToken);

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // 1. Ensure Standard System Roles (SuperAdmin, Admin, Global Editor, Feature Editor, Read Only, Member)
                var roles = new (string Name, RoleCategory Category)[]
                {
                    ("SuperAdmin", RoleCategory.BCP),
                    ("Admin", RoleCategory.Both),
                    ("Global Editor", RoleCategory.BCP),
                    ("Feature Editor", RoleCategory.BCP),
                    ("Read Only", RoleCategory.BCP),
                    ("Member", RoleCategory.BCP)
                };

                foreach (var role in roles)
                {
                    if (!await _roleManager.RoleExistsAsync(role.Name))
                    {
                        await _roleManager.CreateAsync(new AppRole(role.Name) { RoleCategory = role.Category });
                    }
                }

                // 2. Create Initial Admin Profile
                var admin = new Profile
                {
                    UserName = request.AdminEmail.Trim(),
                    Email = request.AdminEmail.Trim(),
                    EmailConfirmed = true,
                    PhoneNumber = request.AdminPhone.Trim(),
                    PhoneNumberConfirmed = !string.IsNullOrWhiteSpace(request.AdminPhone),
                    FirstName = request.AdminFirstName.Trim(),
                    LastName = request.AdminLastName.Trim(),
                    UserStatus = UserStatus.Active
                };

                var createResult = await _userManager.CreateAsync(admin, request.Password);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
                    await transaction.RollbackAsync(cancellationToken);
                    return new SetupResultDto { IsSuccess = false, ErrorMessage = $"User creation failed: {errors}" };
                }

                await _userManager.AddToRoleAsync(admin, "SuperAdmin");
                await _userManager.AddToRoleAsync(admin, "Admin");

                // 3. Seed Default Templates & Settings
                await _defaultTenantSeeder.SeedDefaultTemplateAsync();
                await _context.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                var token = GenerateJwtToken(admin);

                return new SetupResultDto
                {
                    IsSuccess = true,
                    Token = token,
                    UserId = admin.Id,
                    FullName = admin.FullName,
                    Email = admin.Email
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(cancellationToken);
                return new SetupResultDto { IsSuccess = false, ErrorMessage = $"Setup failed: {ex.Message}" };
            }
        }

        private string GenerateJwtToken(Profile user)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "OzikolBCC_SuperSecretJwtEncryptionKey_2026_MustBe32BytesOrMore!";
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? "Ozikol-BCC.Api";
            var jwtAudience = _configuration["Jwt:Audience"] ?? "Ozikol-BCC.Client";

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, "SuperAdmin"),
                new Claim(ClaimTypes.Role, "Admin")
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
