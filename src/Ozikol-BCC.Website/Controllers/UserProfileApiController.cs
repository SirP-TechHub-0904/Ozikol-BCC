using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Text.Json;

namespace Ozikol_BCC.Website.Controllers
{
    [ApiController]
    [Route("api/profile/biography")]
    [Authorize]
    public class UserProfileApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;

        public UserProfileApiController(DashboardDbContext db, UserManager<Profile> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpGet]
        public async Task<IActionResult> GetBiography()
        {
            if (UserId == null) return Unauthorized();

            var biography = await _db.BcpBiographies
                .FirstOrDefaultAsync(b => b.UserId == UserId);

            if (biography == null)
            {
                // Return a initialized empty structure
                return Ok(new
                {
                    Headline = string.Empty,
                    ProfessionalSummary = string.Empty,
                    WorkExperience = Array.Empty<object>(),
                    Education = Array.Empty<object>(),
                    Skills = Array.Empty<string>(),
                    Certifications = Array.Empty<object>(),
                    Languages = Array.Empty<object>()
                });
            }

            return Ok(new
            {
                biography.Headline,
                biography.ProfessionalSummary,
                WorkExperience = string.IsNullOrEmpty(biography.WorkExperienceJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.WorkExperienceJson),
                Education = string.IsNullOrEmpty(biography.EducationJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.EducationJson),
                Skills = string.IsNullOrEmpty(biography.SkillsJson) ? Array.Empty<string>() : JsonSerializer.Deserialize<string[]>(biography.SkillsJson),
                Certifications = string.IsNullOrEmpty(biography.CertificationsJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.CertificationsJson),
                Languages = string.IsNullOrEmpty(biography.LanguagesJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.LanguagesJson)
            });
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetBiography(string userId)
        {
            var biography = await _db.BcpBiographies
                .Include(b => b.User)
                .FirstOrDefaultAsync(b => b.UserId == userId);

            if (biography == null)
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null) return NotFound("User not found");

                return Ok(new
                {
                    FullName = user.FullName,
                    Email = user.Email,
                    Headline = string.Empty,
                    ProfessionalSummary = string.Empty,
                    WorkExperience = Array.Empty<object>(),
                    Education = Array.Empty<object>(),
                    Skills = Array.Empty<string>(),
                    Certifications = Array.Empty<object>(),
                    Languages = Array.Empty<object>()
                });
            }

            return Ok(new
            {
                FullName = biography.User?.FullName,
                Email = biography.User?.Email,
                biography.Headline,
                biography.ProfessionalSummary,
                WorkExperience = string.IsNullOrEmpty(biography.WorkExperienceJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.WorkExperienceJson),
                Education = string.IsNullOrEmpty(biography.EducationJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.EducationJson),
                Skills = string.IsNullOrEmpty(biography.SkillsJson) ? Array.Empty<string>() : JsonSerializer.Deserialize<string[]>(biography.SkillsJson),
                Certifications = string.IsNullOrEmpty(biography.CertificationsJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.CertificationsJson),
                Languages = string.IsNullOrEmpty(biography.LanguagesJson) ? Array.Empty<object>() : JsonSerializer.Deserialize<object>(biography.LanguagesJson)
            });
        }

        [HttpPut]
        public async Task<IActionResult> UpdateBiography([FromBody] UpdateBiographyRequest request)
        {
            if (UserId == null) return Unauthorized();

            var biography = await _db.BcpBiographies
                .FirstOrDefaultAsync(b => b.UserId == UserId);

            bool isNew = false;
            if (biography == null)
            {
                isNew = true;
                biography = new BcpBiography
                {
                    UserId = UserId
                };
            }

            biography.Headline = request.Headline;
            biography.ProfessionalSummary = request.ProfessionalSummary;
            biography.WorkExperienceJson = request.WorkExperience == null ? "[]" : JsonSerializer.Serialize(request.WorkExperience);
            biography.EducationJson = request.Education == null ? "[]" : JsonSerializer.Serialize(request.Education);
            biography.SkillsJson = request.Skills == null ? "[]" : JsonSerializer.Serialize(request.Skills);
            biography.CertificationsJson = request.Certifications == null ? "[]" : JsonSerializer.Serialize(request.Certifications);
            biography.LanguagesJson = request.Languages == null ? "[]" : JsonSerializer.Serialize(request.Languages);
            biography.LastUpdated = DateTime.UtcNow;

            if (isNew)
            {
                _db.BcpBiographies.Add(biography);
            }
            else
            {
                _db.BcpBiographies.Update(biography);
            }

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Biography updated successfully." });
        }

        [HttpGet("members")]
        public async Task<IActionResult> GetMembersList([FromQuery] string? search = null)
        {
            var query = _userManager.Users.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var clean = search.Trim().ToLower();
                query = query.Where(u => u.Email!.Contains(clean) || u.FirstName!.Contains(clean) || u.LastName!.Contains(clean));
            }

            var members = await query
                .OrderBy(u => u.LastName)
                .ThenBy(u => u.FirstName)
                .Select(u => new
                {
                    u.Id,
                    FullName = (u.FirstName + " " + u.LastName).Trim(),
                    u.Email,
                    u.Designation,
                    HasBiography = _db.BcpBiographies.Any(b => b.UserId == u.Id)
                })
                .Take(100)
                .ToListAsync();

            return Ok(members);
        }
    }

    public class UpdateBiographyRequest
    {
        public string? Headline { get; set; }
        public string? ProfessionalSummary { get; set; }
        public object[]? WorkExperience { get; set; }
        public object[]? Education { get; set; }
        public string[]? Skills { get; set; }
        public object[]? Certifications { get; set; }
        public object[]? Languages { get; set; }
    }
}
