using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Behaviors;
using Ozikol_BCC.Application.Dtos.UI;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Queries.BlogQueries
{
    /// <summary>
    /// Query to fetch the recent active blogs for the Homepage ribbon.
    /// This is cached for performance.
    /// </summary>
    public sealed class GetRecentBlogsQuery : IRequest<HomeBlogResponseDto>, ICacheableQuery
    {
        public int Limit { get; set; } = 6;
        public int PageNumber { get; set; } = 1; // Pagination parameter added

        public string CacheKey => $"RecentBlogs_{Limit}_{PageNumber}";
        public TimeSpan? Expiration => TimeSpan.FromMinutes(10);
    }

    /// <summary>
    /// Handler to fetch recent blogs directly from the DbContext.
    /// </summary>
    public class GetRecentBlogsQueryHandler : IRequestHandler<GetRecentBlogsQuery, HomeBlogResponseDto>
    {
        private readonly DashboardDbContext _context;

        public GetRecentBlogsQueryHandler(DashboardDbContext context)
        {
            _context = context;
        }

        public async Task<HomeBlogResponseDto> Handle(GetRecentBlogsQuery request, CancellationToken cancellationToken)
        {
            var response = new HomeBlogResponseDto();

            // Implementing Pagination strategy
            int skip = (request.PageNumber - 1) * request.Limit;

            response.Blogs = await _context.Blogs
                .Include(x => x.BlogCategory)
                .Where(x => x.Publish == true)
                .OrderByDescending(x => x.Date)
                .ThenBy(x => x.SortOrder)
                .Skip(skip)
                .Take(request.Limit)
                .Select(x => new BlogCardDto
                {
                    Id = x.Id,
                    Title = x.Title,
                    ImageUrl = x.ImageUrl,
                    ShortDescription = x.Description,
                    Date = x.Date,
                    CategoryName = x.BlogCategory != null ? x.BlogCategory.Title : string.Empty
                })
                .ToListAsync(cancellationToken);

            return response;
        }
    }
}
