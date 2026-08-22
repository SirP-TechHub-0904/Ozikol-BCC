using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos.Project
{
    public class ProjectReportDto
    {
        public long ProjectTaskId { get;set; }
        public long ProjectId { get;set; }
        public string Report { get;set; }
        public string Username { get;set; }
    }
}

