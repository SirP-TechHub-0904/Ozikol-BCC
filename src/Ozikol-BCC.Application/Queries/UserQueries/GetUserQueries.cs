using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Queries.UserQueries
{
    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Suffix { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string UserStatus { get; set; } = string.Empty;
        public string UserType { get; set; } = string.Empty;
        public string? MemberId { get; set; }
        public string? Designation { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime? JoinDate { get; set; }
        public DateTime? LastLogin { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
        public string? CategoryName { get; set; }
        public string? CategoryColor { get; set; }
        public string? CategoryIcon { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool PhoneNumberConfirmed { get; set; }
        public List<string> Roles { get; set; } = new();
    }

    public class GetUserListQuery : IRequest<List<UserDto>> { }

    public class GetUserListQueryHandler : IRequestHandler<GetUserListQuery, List<UserDto>>
    {
        private readonly DashboardDbContext _dbContext;

        public GetUserListQueryHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<UserDto>> Handle(GetUserListQuery request, CancellationToken cancellationToken)
        {
            var userRoles = await _dbContext.UserRoles
                .AsNoTracking()
                .Join(_dbContext.Roles.AsNoTracking(), ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, RoleName = r.Name })
                .ToListAsync(cancellationToken);

            var rolesByUser = userRoles
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.RoleName!).ToList());

            var users = await _dbContext.Users
                .Include(u => u.BcpUserCategory)
                .AsNoTracking()
                .OrderByDescending(u => u.JoinDate ?? DateTime.MinValue)
                .ThenBy(u => u.LastName)
                .ToListAsync(cancellationToken);

            return users
                .Where(u => !rolesByUser.TryGetValue(u.Id, out var rList) || !rList.Contains("SuperAdmin"))
                .Select(u =>
                {
                    string suffix = "";
                    if (!string.IsNullOrWhiteSpace(u.CustomAttributesJson))
                    {
                        try
                        {
                            using var doc = System.Text.Json.JsonDocument.Parse(u.CustomAttributesJson);
                            if (doc.RootElement.TryGetProperty("suffix", out var sProp))
                            {
                                suffix = sProp.GetString() ?? "";
                            }
                        }
                        catch { }
                    }

                    var cleanFullName = !string.IsNullOrWhiteSpace(suffix) ? $"{u.FullName}, {suffix}".Trim() : u.FullName;

                    return new UserDto
                    {
                        Id = u.Id,
                        Title = u.Title ?? "",
                        FirstName = u.FirstName ?? "",
                        LastName = u.LastName ?? "",
                        Suffix = suffix,
                        Email = u.Email ?? "",
                        PhoneNumber = u.PhoneNumber ?? "",
                        FullName = cleanFullName,
                        UserStatus = u.UserStatus.ToString(),
                        UserType = u.UserType.ToString(),
                        MemberId = u.MemberId ?? "CC-" + u.Id.Substring(0, 6).ToUpper(),
                        Designation = u.Designation ?? "Member",
                        AvatarUrl = u.AvatarUrl,
                        JoinDate = u.JoinDate,
                        LastLogin = u.LastLogin,
                        BcpUserCategoryId = u.BcpUserCategoryId,
                        CategoryName = u.BcpUserCategory?.Name,
                        CategoryColor = u.BcpUserCategory?.ColorCode,
                        CategoryIcon = u.BcpUserCategory?.Icon,
                        EmailConfirmed = u.EmailConfirmed,
                        PhoneNumberConfirmed = u.PhoneNumberConfirmed,
                        Roles = rolesByUser.TryGetValue(u.Id, out var rList) ? rList : new List<string> { "Member" }
                    };
                }).ToList();
        }
    }

    public class GetUserByIdQuery : IRequest<UserDto?>
    {
        public string UserId { get; set; }

        public GetUserByIdQuery(string userId)
        {
            UserId = userId;
        }
    }

    public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, UserDto?>
    {
        private readonly DashboardDbContext _dbContext;

        public GetUserByIdQueryHandler(DashboardDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<UserDto?> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        {
            var u = await _dbContext.Users
                .Include(x => x.BcpUserCategory)
                .FirstOrDefaultAsync(x => x.Id == request.UserId, cancellationToken);
            if (u == null) return null;

            var roles = await _dbContext.UserRoles
                .Where(ur => ur.UserId == u.Id)
                .Join(_dbContext.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name!)
                .ToListAsync(cancellationToken);

            string suffix = "";
            if (!string.IsNullOrWhiteSpace(u.CustomAttributesJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(u.CustomAttributesJson);
                    if (doc.RootElement.TryGetProperty("suffix", out var sProp))
                    {
                        suffix = sProp.GetString() ?? "";
                    }
                }
                catch { }
            }

            var cleanFullName = !string.IsNullOrWhiteSpace(suffix) ? $"{u.FullName}, {suffix}".Trim() : u.FullName;

            return new UserDto
            {
                Id = u.Id,
                Title = u.Title ?? "",
                FirstName = u.FirstName ?? "",
                LastName = u.LastName ?? "",
                Suffix = suffix,
                Email = u.Email ?? "",
                PhoneNumber = u.PhoneNumber ?? "",
                FullName = cleanFullName,
                UserStatus = u.UserStatus.ToString(),
                UserType = u.UserType.ToString(),
                MemberId = u.MemberId ?? "CC-" + u.Id.Substring(0, 6).ToUpper(),
                Designation = u.Designation ?? "Member",
                AvatarUrl = u.AvatarUrl,
                JoinDate = u.JoinDate,
                LastLogin = u.LastLogin,
                BcpUserCategoryId = u.BcpUserCategoryId,
                CategoryName = u.BcpUserCategory?.Name,
                CategoryColor = u.BcpUserCategory?.ColorCode,
                CategoryIcon = u.BcpUserCategory?.Icon,
                Roles = roles.Count > 0 ? roles : new List<string> { "Member" }
            };
        }
    }
}
