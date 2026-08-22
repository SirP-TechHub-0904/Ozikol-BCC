using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos.AwsDtos
{
    public class S3Object
    {
        public string Name { get; set; } = null!;
        public MemoryStream InputStream { get; set; } = null!;
        public string BucketName { get; set; } = null!;
    }
}

