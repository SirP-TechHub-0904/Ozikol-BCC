using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace Ozikol_BCC.Website.Helpers
{
    public class DataTablesParameters
    {
        public int Draw { get; set; }
        public int Start { get; set; }
        public int Length { get; set; }
        public string SortColumnDirection { get; set; }
        public string SearchValue { get; set; }
        public string SortColumnIndex { get; set; }
    }

    public static class DataTablesHelper
    {
        public static DataTablesParameters GetParameters(HttpRequest request)
        {
            var draw = request.Form["draw"].FirstOrDefault();
            var start = request.Form["start"].FirstOrDefault();
            var length = request.Form["length"].FirstOrDefault();
            var sortColumnDirection = request.Form["order[0][dir]"].FirstOrDefault();
            var searchValue = request.Form["search[value]"].FirstOrDefault();
            var sortColumnIndex = request.Form["order[0][column]"].FirstOrDefault();

            int pageSize = length != null ? System.Convert.ToInt32(length) : 10;
            int skip = start != null ? System.Convert.ToInt32(start) : 0;
            
            // If they request all records (length = -1), set length to max
            if (pageSize == -1)
            {
                pageSize = int.MaxValue;
            }

            return new DataTablesParameters
            {
                Draw = draw != null ? System.Convert.ToInt32(draw) : 0,
                Start = skip,
                Length = pageSize,
                SortColumnDirection = sortColumnDirection,
                SearchValue = searchValue,
                SortColumnIndex = sortColumnIndex
            };
        }

        public static JsonResult CreateResponse(int draw, int recordsTotal, int recordsFiltered, object data)
        {
            return new JsonResult(new
            {
                draw = draw,
                recordsFiltered = recordsFiltered,
                recordsTotal = recordsTotal,
                data = data
            });
        }
    }
}

