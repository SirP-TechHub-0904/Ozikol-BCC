using System.Collections.Generic;
using Ozikol_BCC.Application.Dtos.UI;

namespace Ozikol_BCC.Application.Queries.SliderQueries
{
    public class SliderAggregatedDto
    {
        public ConfigSettingDto ConfigSetting { get; set; }
        public ICollection<SliderDto> Sliders { get; set; }
        public ICollection<PageCategoryDto> MenuCategories { get; set; }
        public ICollection<WebPageDto> SinglePages { get; set; }
        public ICollection<WebPageDto> TopPages { get; set; }
        
        public ICollection<ProductCategoryDto> ProductPages { get; set; }
        public ICollection<WebPageDto> ExternalLinks { get; set; }
        public ICollection<WebPageDto> FooterPages { get; set; }
    }
}
