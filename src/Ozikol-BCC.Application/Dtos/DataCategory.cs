using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Dtos
{
    public class DataCategory
    {
        public string Title { get;set;}
        public ICollection<QueryDataList> QueryDataList { get; set; }
    }
}

