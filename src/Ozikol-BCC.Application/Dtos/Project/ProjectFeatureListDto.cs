using Ozikol_BCC.Domain.Models;
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
    public class ProjectFeatureListDto
    {
         public long Id { get;set;}
        [Display(Name = "Feature")]
        public string Title { get;set;}
         
        public string? Date { get;set;}
        public int TotalTask { get;set; }
        public int TotalTodo { get;set; }
        public int TotalDoing { get;set; }
        public int TotalDone { get;set; }
        public int TotalProgress { get;set; }
              
         [Display(Name = "Feature Status")]
        public ProjectFeatureStatus ProjectFeatureStatus { get;set;}
     
    }
}

