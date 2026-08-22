using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos
{
    /// <summary>
    /// Lightweight response envelope used by older Application services where a simple result
    /// and optional data value are enough.
    /// </summary>
    public class ResponseDto
    {
        public string? Data { get;set; }
        public string? Result { get;set; }
    }
}

