using System;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class SliderDto
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public string? MiniTitle { get; set; }
        public string? Text { get; set; }
        public string? Link { get; set; }
        public string? ButtonText { get; set; }
        public string? ImageUrl { get; set; }
        public string? VideoUrl { get; set; }
        public int SortOrder { get; set; }
    }
}

