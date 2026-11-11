using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Behaviors;
using Ozikol_BCC.Application.Dtos.UI;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Queries.PageSectionQueries
{
    /// <summary>
    /// Fetches a list of PageSections filtered by specific ViewComponent parameters.
    /// Automatically cached.
    /// </summary>
    public sealed class GetPageSectionsByCriteriaQuery : IRequest<List<PageSectionDto>>, ICacheableQuery
    {
        public string? Position { get; set; }
        public string? PageSet { get; set; }
        public Guid? WebPageId { get; set; }
        public Guid? SectionId { get; set; }
        public int? TakeX { get; set; }

        public string CacheKey => $"PageSections_{Position}_{PageSet}_{WebPageId}_{SectionId}_{TakeX}";
        public TimeSpan? Expiration => TimeSpan.FromMinutes(15);
    }

    /// <summary>
    /// Handler to fetch the PageSections from the DbContext.
    /// </summary>
    public class GetPageSectionsByCriteriaQueryHandler : IRequestHandler<GetPageSectionsByCriteriaQuery, List<PageSectionDto>>
    {
        private readonly DashboardDbContext _context;

        public GetPageSectionsByCriteriaQueryHandler(DashboardDbContext context)
        {
            _context = context;
        }

        public async Task<List<PageSectionDto>> Handle(GetPageSectionsByCriteriaQuery request, CancellationToken cancellationToken)
        {
            var query = _context.PageSections
                .Include(x => x.PageSectionLists)
                .Where(x => x.Disable == false)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Position) && !string.IsNullOrEmpty(request.PageSet))
            {
                if (request.PageSet.ToLower() == "home")
                {
                    var homePageId = await _context.WebPages
                        .Where(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "home" || p.DirectUrl == "index")
                        .Select(p => (Guid?)p.Id)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (homePageId.HasValue)
                    {
                        query = query.Where(x => x.WebPageId == homePageId.Value).OrderBy(x => x.PageSortOrder);
                    }
                }
            }
            else if (!string.IsNullOrEmpty(request.Position) && (request.Position.ToLower() == "fixed" || request.Position.ToLower() == "footer"))
            {
                query = query.Where(x => x.FixedAfterFooter == true).OrderBy(x => x.PageSortOrder);
            }
            else if (request.WebPageId.HasValue && request.WebPageId != Guid.Empty)
            {
                query = query.Where(x => x.WebPageId == request.WebPageId).OrderBy(x => x.PageSortOrder);
            }

            if (request.TakeX.HasValue && request.TakeX.Value > 0)
            {
                query = query.Take(request.TakeX.Value);
            }

            var result = await query.Select(x => new PageSectionDto
            {
                Id = x.Id,
                Title = x.Title,
                MiniTitle = x.MiniTitle,
                Qoute = x.Qoute,
                Description = x.Description,
                ImageUrl = x.ImageUrl,
                TemplateKey = x.TemplateKey,
                CustomClass = x.CustomClass,
                DirectUrl = x.DirectUrl,
                PageSortOrder = x.PageSortOrder,
                DisableButton = x.DisableButton,
                ButtonText = x.ButtonText,
                ButtonLink = x.ButtonLink,
                SecondButtonText = x.SecondButtonText,
                SecondButtonLink = x.SecondButtonLink,
                FullDescription = x.FullDescription,
                SectionLists = x.PageSectionLists.Select(sl => new PageSectionListDto
                {
                    Id = sl.Id,
                    Title = sl.Title,
                    Description = sl.Description,
                    ImageUrl = sl.ImageUrl,
                    SortOrder = sl.SortOrder,
                    IconText = sl.IconText,
                    MiniTitle = sl.MiniTitle,
                    ButtonLink = sl.ButtonLink,
                    ButtonText = sl.ButtonText,
                    SecondButtonText = sl.SecondButtonText,
                    SecondButtonLink = sl.SecondButtonLink,
                    DirectUrl = sl.DirectUrl,
                    MoreDescription = sl.MoreDescription
                }).OrderBy(sl => sl.SortOrder).ToList()
            }).ToListAsync(cancellationToken);

            return result;
        }
    }
}
