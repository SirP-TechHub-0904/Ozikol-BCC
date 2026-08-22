using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos.AwsDtos
{
    public class S3ObjectDto
    {
        public string? Name { get; set; }
        public string? PresignedUrl { get; set; }
    }
}

