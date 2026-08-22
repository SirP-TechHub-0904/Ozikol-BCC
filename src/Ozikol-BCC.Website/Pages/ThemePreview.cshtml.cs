using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Collections.Generic;
using System.Linq;

namespace Ozikol_BCC.Website.Pages
{
    public class ThemePreviewModel : PageModel
    {
        public List<string> SectionNames { get; set; } = new List<string>();

        public void OnGet(string section = null, string sections = null)
        {
            if (!string.IsNullOrEmpty(sections))
            {
                SectionNames = sections.Split(',').Select(s => s.Trim()).ToList();
            }
            else if (!string.IsNullOrEmpty(section))
            {
                SectionNames.Add(section);
            }
            else
            {
                // Default preview of Homepage 1 architecture
                SectionNames = new List<string>
                {
                    "_Menu_17ad",
                    "_Slider_1",
                    "_Section_About_c7f6",
                    "_Section_Divider_7e70",
                    "_Section_Service_60d1", // Wait, need to check if 60d1 exists, or just use real names
                    "_Section_RealResults_f8f1",
                    "_Section_Testimonial_7a0e",
                    "_Section_CTA_d921",
                    "_Section_WhyChooseUs_c399",
                    "_Section_Divider_227b",
                    "_Section_FAQ_e538",
                    "_Section_Instagram_244d",
                    "_Footer_91b6"
                };
            }
        }
    }
}
