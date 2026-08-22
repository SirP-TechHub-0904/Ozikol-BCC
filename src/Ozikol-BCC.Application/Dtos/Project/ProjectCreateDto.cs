using Ozikol_BCC.Domain.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;
using System.Xml.Linq;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Ozikol_BCC.Application.Dtos.Project
{
    public class ProjectCreateDto
    { 
        public string Title { get; set; }
        
        public string Description { get; set; }
        
        [Display(Name = "Referred By")]
        public string ProfileReferralId { get; set; }
         [Display(Name = "Project Category")]
        public long ProjectCategoryId { get; set; }
        
        public string? LogoPicture { get; set; }
        public string? Urls { get; set; }
         
        [Display(Name = "Date Start")]
        public DateTime? DateStarted { get; set; }
        [Display(Name = "Date Finish")]
        public DateTime? DateFinised { get; set; }
          

         public List<SelectListItem> ReferralOptions { get; set; }
    public List<SelectListItem> CategoryOptions { get; set; }
    }
}

