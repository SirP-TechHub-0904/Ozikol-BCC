using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class HomeBlogResponseDto
    {
        public List<BlogCardDto> Blogs { get; set; } = new List<BlogCardDto>();
        public ConfigSettingDto? ConfigSetting { get; set; }
    }
}

