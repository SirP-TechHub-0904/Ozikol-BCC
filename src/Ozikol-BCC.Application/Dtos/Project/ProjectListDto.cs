using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;
using System.Xml.Linq;

namespace Ozikol_BCC.Application.Dtos.Project
{
    public class ProjectListDto
    {
        public long Id { get; set; }
        public string Title { get; set; }
         

        [Display(Name = "Referred By")]
        public string ProfileReferral { get; set; }
         [Display(Name = "Project Category")]
        public string ProjectCategory { get; set; }
         
        public string? Urls { get; set; }
        public int Team { get;set;}
        public int Users { get;set;}
        [Display(Name = "Last Update Date")]
        public DateTime? LastUpdateDate { get; set; }
         [Display(Name = "Date Start")]
        public DateTime? DateStarted { get; set; }
        [Display(Name = "Date Finish")]
        public DateTime? DateFinised { get; set; }
        public ProjectStatus ProjectStatus { get; set; }
    }
}

