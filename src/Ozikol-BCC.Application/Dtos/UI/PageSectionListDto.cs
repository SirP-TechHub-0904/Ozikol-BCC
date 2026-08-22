using System;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class PageSectionListDto
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? IconUrl { get; set; }
        public int SortOrder { get; set; }
        public string? IconText { get; set; }
        public string? MiniTitle { get; set; }
        public string? ButtonLink { get; set; }
        public string? ButtonText { get; set; }
        public string? DirectUrl { get; set; }
        public string? MoreDescription { get; set; }
    }
}

