using System;

namespace Ozikol_BCC.Application.Dtos.UI
{
    public class BlogCardDto
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public string? ImageUrl { get; set; }
        public string? ShortDescription { get; set; }
        public DateTime Date { get; set; }
        public string? CategoryName { get; set; }
    }
}

