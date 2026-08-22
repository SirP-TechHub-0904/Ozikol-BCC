using System;
using System.Collections.Generic;
using Ozikol_BCC.Domain.Enum;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class PageCategoryDto
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public int MenuSortOrder { get; set; }
        public Ozikol_BCC.Domain.Enum.Enum.HomeSortFrom HomeSortFrom { get; set; }
        
        public List<PageCategoryDto> SubCategories { get; set; } = new List<PageCategoryDto>();
        public List<WebPageDto> WebPages { get; set; } = new List<WebPageDto>();
    }
}
