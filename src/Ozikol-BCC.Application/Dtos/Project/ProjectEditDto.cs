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
    public class ProjectEditDto
    {
        public long Id { get; set; }
        public string Title { get; set; }

        public string Description { get; set; }
        public string? Materials { get; set; }
        public string? Note { get; set; }
        public string? Authentications { get; set; }

        [Display(Name = "Referred By")]
        public string ProfileReferralId { get; set; }
         [Display(Name = "Project Category")]
        public long ProjectCategoryId { get; set; }

        public string? LogoPicture { get; set; }
        public string? Urls { get; set; }

        [Display(Name = "Last Update Date")]
        public DateTime? LastUpdateDate { get; set; }

        public ProjectStatus ProjectStatus { get; set; }
          public decimal Budget { get; set; }
        [Display(Name = "Amount Spent")]
        public decimal AmountSpent { get; set; }
        [Display(Name = "Financial Report")]
        public string? FinancialReport { get; set; }
        public List<SelectListItem> ReferralOptions { get; set; }
        public List<SelectListItem> CategoryOptions { get; set; }
    }
}

