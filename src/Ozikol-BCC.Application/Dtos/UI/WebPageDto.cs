using System;
using Ozikol_BCC.Domain.Enum;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class WebPageDto
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public string? DirectUrl { get; set; }
        public string? ExternalUrl { get; set; }
        public bool EnableDirectUrl { get; set; }
        public bool ShowInMainMenu { get; set; }
        public bool ShowInMainTop { get; set; }
        public bool ShowInFooterMenu { get; set; }
        public bool ShowInMenuDropDown { get; set; }
        public int SortOrder { get; set; }
        public Ozikol_BCC.Domain.Enum.Enum.HomeSortFrom HomeSortFrom { get; set; }
        public bool Publish { get; set; }
        public Guid? MainPageId { get; set; }
    }
}
