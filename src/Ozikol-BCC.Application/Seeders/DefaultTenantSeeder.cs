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
            // Seed Slider
            if (!await _context.Sliders.AnyAsync())
            {
                var slider = new Slider
                {
                    Id = Guid.NewGuid(),
                    Title = "Welcome to Our Website",
                    MiniTitle = "Building the Future",
                    Text = "We are dedicated to providing the best service for our customers. Explore our offerings and let us help you grow.",
                    ButtonText = "Learn More",
                    ButtonLink = "/about",
                    Show = true,
                    SortOrder = 1,
                    Url = "https://res.cloudinary.com/pcbhnjad/image/upload/v1/default_slider_bg"
                };
                _context.Sliders.Add(slider);
            }

            // Seed WebPages (Menus)
            if (!await _context.WebPages.AnyAsync())
            {
                var pages = new List<WebPage>
                {
                    new WebPage { Id = Guid.NewGuid(), Title = "Home", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 1, Publish = true, EnableDirectUrl = true, DirectUrl = "index" },
                    new WebPage { Id = Guid.NewGuid(), Title = "About Us", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 2, Publish = true, EnableDirectUrl = true, DirectUrl = "about" },
                    new WebPage { Id = Guid.NewGuid(), Title = "Services", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 3, Publish = true, EnableDirectUrl = true, DirectUrl = "services" },
                    new WebPage { Id = Guid.NewGuid(), Title = "Contact", ShowInMainMenu = true, ShowInFooter = true, SortOrder = 4, Publish = true, EnableDirectUrl = true, DirectUrl = "contact" }
                };
                _context.WebPages.AddRange(pages);
            }

            // Seed PageSections
            if (!await _context.PageSections.AnyAsync())
            {
                var sections = new List<PageSection>
                {
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        Title = "About Our Company",
                        MiniTitle = "Who We Are",
                        Description = "We provide top-notch services tailored to your needs.",
                        ButtonText = "Read More",
                        ButtonLink = "/about",
                        ShowInHome = true,
                        HomePageSortOrder = 1,
                        TemplateKey = "_About" // Maps to _Section_About.cshtml
                    },
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        Title = "Our Services",
                        MiniTitle = "What We Do",
                        Description = "Explore the wide variety of services we offer.",
                        ShowInHome = true,
                        HomePageSortOrder = 2,
                        TemplateKey = "_Service" // Maps to _Section_Service.cshtml
                    },
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        Title = "Ready to get started?",
                        Description = "Join thousands of satisfied customers today.",
                        ButtonText = "Contact Us",
                        ButtonLink = "/contact",
                        ShowInHome = true,
                        HomePageSortOrder = 3,
                        TemplateKey = "_CTA" // Maps to _Section_CTA.cshtml
                    }
                };
                _context.PageSections.AddRange(sections);
            }

            await _context.SaveChangesAsync();
        }
    }
}
