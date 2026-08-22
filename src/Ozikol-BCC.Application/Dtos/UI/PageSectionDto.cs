using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class PageSectionDto
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public string? MiniTitle { get; set; }
        public string? Qoute { get; set; }
        public string? TopNote { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
        public string? FullDescription { get; set; }
        public string? ImageUrl { get; set; }
        public string? SecondImageUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? YoutubeUrlLink { get; set; }
        public string? Description { get; set; }
        public string? TemplateKey { get; set; }
        public int PageSortOrder { get; set; }
        public int HomePageSortOrder { get; set; }
        public bool Disable { get; set; }
        public bool FixedAfterFooter { get; set; }
        public string? CustomClass { get; set; }
        public string? DirectUrl { get; set; }
        public bool ShowInHome { get; set; }
        public bool DisableButton { get; set; }
        public List<PageSectionListDto> SectionLists { get; set; } = new List<PageSectionListDto>();
    }
}

