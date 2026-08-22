using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class SliderAggregatedDto
    {
        public List<SliderDto> Sliders { get; set; } = new List<SliderDto>();
        public ConfigSettingDto? ConfigSetting { get; set; }
        public List<PageCategoryDto> MenuCategories { get; set; } = new List<PageCategoryDto>();
        public List<WebPageDto> SinglePages { get; set; } = new List<WebPageDto>();
        public List<WebPageDto> TopPages { get; set; } = new List<WebPageDto>();
    }
}

