using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Seeders
{
    public class DefaultTenantSeeder
    {
        private readonly DashboardDbContext _context;

        public DefaultTenantSeeder(DashboardDbContext context)
        {
            _context = context;
        }

        public async Task SeedDefaultTemplateAsync()
        {

            // Seed WebPages (Menus)
            WebPage? homePage = null;
            if (!await _context.WebPages.AnyAsync())
            {
                homePage = new WebPage { Id = Guid.NewGuid(), Title = "Home", IsHomePage = true, ShowInMainMenu = true, ShowInFooter = true, SortOrder = 1, Publish = true, EnableDirectUrl = true, DirectUrl = "/" };
                var pages = new List<WebPage>
                {
                    homePage,
                    new WebPage { Id = Guid.NewGuid(), Title = "About Us", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 2, Publish = true, EnableDirectUrl = true, DirectUrl = "about" },
                    new WebPage { Id = Guid.NewGuid(), Title = "Services", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 3, Publish = true, EnableDirectUrl = true, DirectUrl = "services" },
                    new WebPage { Id = Guid.NewGuid(), Title = "Contact", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 4, Publish = true, EnableDirectUrl = true, DirectUrl = "contact" }
                };
                _context.WebPages.AddRange(pages);
            }
            else
            {
                homePage = await _context.WebPages.FirstOrDefaultAsync(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "index");
            }

            // Seed PageSections
            if (!await _context.PageSections.AnyAsync())
            {
                var sections = new List<PageSection>
                {
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        WebPageId = homePage?.Id,
                        Title = "About Our Company",
                        MiniTitle = "Who We Are",
                        Description = "We provide top-notch services tailored to your needs.",
                        ButtonText = "Read More",
                        ButtonLink = "/about",
                        PageSortOrder = 1,
                        TemplateKey = "_About" // Maps to _Section_About.cshtml
                    },
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        WebPageId = homePage?.Id,
                        Title = "Our Services",
                        MiniTitle = "What We Do",
                        Description = "Explore the wide variety of services we offer.",
                        PageSortOrder = 2,
                        TemplateKey = "_Service" // Maps to _Section_Service.cshtml
                    },
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        WebPageId = homePage?.Id,
                        Title = "Ready to get started?",
                        Description = "Join thousands of satisfied customers today.",
                        ButtonText = "Contact Us",
                        ButtonLink = "/contact",
                        PageSortOrder = 3,
                        TemplateKey = "_CTA" // Maps to _Section_CTA.cshtml
                    }
                };
                _context.PageSections.AddRange(sections);
            }

            await _context.SaveChangesAsync();
        }
    }
}
