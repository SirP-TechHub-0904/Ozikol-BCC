using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Behaviors;
using Ozikol_BCC.Application.Dtos.UI;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Queries.SliderQueries
{
    /// <summary>
    /// Query to fetch all aggregated data needed for the Slider ViewComponent.
    /// This query is fully cacheable via the MediatR Pipeline.
    /// </summary>
    public sealed class GetSliderAggregatedDataQuery : IRequest<SliderAggregatedDto>, ICacheableQuery
    {
        public string CacheKey => "SliderAggregatedData";
        public TimeSpan? Expiration => TimeSpan.FromMinutes(30);
    }

    /// <summary>
    /// Handler to execute the GetSliderAggregatedDataQuery.
    /// Uses direct DbContext projection instead of GenericRepository for maximum performance.
    /// </summary>
    public class GetSliderAggregatedDataQueryHandler : IRequestHandler<GetSliderAggregatedDataQuery, SliderAggregatedDto>
    {
        private readonly DashboardDbContext _context;

        public GetSliderAggregatedDataQueryHandler(DashboardDbContext context)
        {
            _context = context;
        }

        public async Task<SliderAggregatedDto> Handle(GetSliderAggregatedDataQuery request, CancellationToken cancellationToken)
        {
            var response = new SliderAggregatedDto();

            response.Sliders = await _context.Sliders
                .Where(x => x.Show == true)
                .OrderBy(x => x.SortOrder)
                .Select(x => new SliderDto
                {
                    Id = x.Id,
                    Title = x.Title,
                    MiniTitle = x.MiniTitle,
                    Text = x.Text,
                    Link = x.ButtonLink,
                    ButtonText = x.ButtonText,
                    ImageUrl = x.Url,
                    VideoUrl = x.YoutubeVideo,
                    SortOrder = x.SortOrder
                }).ToListAsync(cancellationToken);

            response.ConfigSetting = await _context.ConfigSettings
                .Select(x => new ConfigSettingDto
                {
                    TemplateLayoutKey = x.TemplateLayoutKey,
                    LoginTemplateKey = x.LoginTemplateKey,
                    ColorTemplateKey = x.ColorTemplateKey,
                    SliderTemplateKey = x.SliderTemplateKey,
                    ProductTemplateKey = x.ProductTemplateKey,
                    BlogTemplateKey = x.BlogTemplateKey,
                    ReloaderTemplateKey = x.ReloaderTemplateKey,
                    PageHeaderTemplateKey = x.PageHeaderTemplateKey,
                    FooterTemplateKey = x.FooterTemplateKey,
                    WebsiteTitle = x.WebsiteTitle,
                    CompanyDescription = x.CompanyDescription,
                    CompanyName = x.CompanyName,
                    CompanyNameAbbreviation = x.CompanyNameAbbreviation,
                    CompanyWebsiteLink = x.CompanyWebsiteLink,
                    DashboardTitle = x.DashboardTitle,
                    CompanyLogoUrl = x.CompanyLogoUrl,
                    CompanyLogoKey = x.CompanyLogoKey,
                    CompanyWhiteLogoUrl = x.CompanyWhiteLogoUrl,
                    CompanyWhiteLogoKey = x.CompanyWhiteLogoKey,
                    CompanyIconUrl = x.CompanyIconUrl,
                    CompanyIconKey = x.CompanyIconKey,
                    ReloaderIconUrl = x.ReloaderIconUrl,
                    ReloaderIconKey = x.ReloaderIconKey,
                    JustWebsite = x.JustWebsite,
                    ActivateLogin = x.ActivateLogin,
                    ActivateLoginInMenu = x.ActivateLoginInMenu,
                    ActivateComingSoon = x.ActivateComingSoon,
                    LoginBackgroundImageUrl = x.LoginBackgroundImageUrl,
                    LoginBackgroundImageKey = x.LoginBackgroundImageKey,
                    UseNormalLogoInLogin = x.UseNormalLogoInLogin,
                    UseWhiteLogoInLogin = x.UseWhiteLogoInLogin,
                    LoginTitle = x.LoginTitle,
                    LoginNoteTitle = x.LoginNoteTitle,
                    LoginNote = x.LoginNote,
                    LoginNoteFooter = x.LoginNoteFooter,
                    EmailTemplate = x.EmailTemplate,
                    SMSTemplate = x.SMSTemplate,
                    ProductTitle = x.ProductTitle,
                    ProductTitleHome = x.ProductTitleHome,
                    RemoveWatermark = x.RemoveWatermark,
                    SpecialMenuButtonText = x.SpecialMenuButtonText,
                    SpecialMenuButtonLink = x.SpecialMenuButtonLink,
                    SpecialMenuButtonActivate = x.SpecialMenuButtonActivate,
                    ActivateWorkWithUsFooter = x.ActivateWorkWithUsFooter,
                    TitleWorkWithUsFooter = x.TitleWorkWithUsFooter,
                    ActivateSubscribeFormOnFooter = x.ActivateSubscribeFormOnFooter,
                    CurrencySymbol = x.CurrencySymbol,
                    CurrencyCode = x.CurrencyCode,
                    OrganizationDisplayName = x.OrganizationDisplayName,
                    OrganizationPaymentNote = x.OrganizationPaymentNote,
                    Qoute = x.Qoute,
                    TopNote = x.TopNote,
                    GoogleMap = x.GoogleMap,
                    ShowAddressOneInTop = x.ShowAddressOneInTop,
                    AddressOne = x.AddressOne,
                    AddressTwo = x.AddressTwo,
                    FacebookPage = x.FacebookPage,
                    InstagramPage = x.InstagramPage,
                    TwitterPage = x.TwitterPage,
                    TiktokPage = x.TiktokPage,
                    YoutubeChannel = x.YoutubeChannel,
                    EmailOne = x.EmailOne,
                    ShowEmailOneInTop = x.ShowEmailOneInTop,
                    ShowEmailOneInFooter = x.ShowEmailOneInFooter,
                    EmailTwo = x.EmailTwo,
                    ShowEmailTwoInTop = x.ShowEmailTwoInTop,
                    ShowEmailTwoInFooter = x.ShowEmailTwoInFooter,
                    EmailThree = x.EmailThree,
                    ShowEmailThreeInTop = x.ShowEmailThreeInTop,
                    ShowEmailThreeInFooter = x.ShowEmailThreeInFooter,
                    PhoneOne = x.PhoneOne,
                    ShowPhoneOneInTop = x.ShowPhoneOneInTop,
                    ShowPhoneOneInFooter = x.ShowPhoneOneInFooter,
                    PhoneTwo = x.PhoneTwo,
                    ShowPhoneTwoInTop = x.ShowPhoneTwoInTop,
                    ShowPhoneTwoInFooter = x.ShowPhoneTwoInFooter,
                    PhoneThree = x.PhoneThree,
                    ShowPhoneThreeInTop = x.ShowPhoneThreeInTop,
                    ShowPhoneThreeInFooter = x.ShowPhoneThreeInFooter,
                    WorkingHour = x.WorkingHour,
                    AddFaqToHome = x.AddFaqToHome,
                    AddFaqToFooter = x.AddFaqToFooter,
                    AddTestimonyToHome = x.AddTestimonyToHome,
                    AddTestimonyToFooter = x.AddTestimonyToFooter,
                    AddPartnerToHome = x.AddPartnerToHome,
                    DisableMainTopMenu = x.DisableMainTopMenu,
                    CustomMenuTop = x.CustomMenuTop,
                    UseCustomMenuTop = x.UseCustomMenuTop,
                    ShowProductsInMenu = x.ShowProductsInMenu,
                    ShowProductsInFooter = x.ShowProductsInFooter,
                    ActivateProductsInHome = x.ActivateProductsInHome,
                    ShowThreeProducts = x.ShowThreeProducts,
                    ShowSixProducts = x.ShowSixProducts,
                    ShowTwoProducts = x.ShowTwoProducts,
                    ShowContactUsMenu = x.ShowContactUsMenu,
                    ShowContactUsFooter = x.ShowContactUsFooter,
                    DefaultTitleBackgroundUrl = x.DefaultTitleBackgroundUrl,
                    DefaultTitleBackgroundKey = x.DefaultTitleBackgroundKey,
                    AddBlogToHome = x.AddBlogToHome,
                    AddBlogToMenu = x.AddBlogToMenu,
                    AddBlogToFooter = x.AddBlogToFooter,
                    BlogDisplayTitle = x.BlogDisplayTitle,
                    AddCareerToMenu = x.AddCareerToMenu,
                    AddCareerToFooter = x.AddCareerToFooter,
                    CareerDisplayTitle = x.CareerDisplayTitle,
                    UseCategoryBlog = x.UseCategoryBlog,
                    EnableBreakingNewsRibon = x.EnableBreakingNewsRibon,
                    BreakingNewsRibonTitle = x.BreakingNewsRibonTitle,
                    RibonPosition = x.RibonPosition
                }).FirstOrDefaultAsync(cancellationToken);

                        response.MenuCategories = await _context.PageCategories
                .Where(x => x.Publish == true)
                .OrderBy(x => x.MenuSortOrder)
                .Select(x => new PageCategoryDto { 
                    Id = x.Id, 
                    Title = x.Title, 
                    MenuSortOrder = x.MenuSortOrder,
                    HomeSortFrom = x.HomeSortFrom,
                    WebPages = x.WebPages.Select(wp => new WebPageDto {
                        Id = wp.Id, Title = wp.Title, DirectUrl = wp.DirectUrl, 
                        EnableDirectUrl = wp.EnableDirectUrl, ShowInMenuDropDown = wp.ShowInMenuDropDown,
                        SortOrder = wp.SortOrder, HomeSortFrom = wp.HomeSortFrom, Publish = wp.Publish
                    }).ToList()
                })
                .ToListAsync(cancellationToken);

            response.SinglePages = await _context.WebPages
                .Where(x => x.Publish == true && x.ShowInMainMenu == true)
                .Select(x => new WebPageDto { Id = x.Id, Title = x.Title, DirectUrl = x.DirectUrl, EnableDirectUrl = x.EnableDirectUrl, HomeSortFrom = x.HomeSortFrom })
                .ToListAsync(cancellationToken);

            response.TopPages = await _context.WebPages
                .Where(x => x.Publish == true && x.ShowInMainTop == true)
                .Select(x => new WebPageDto { Id = x.Id, Title = x.Title, DirectUrl = x.DirectUrl, EnableDirectUrl = x.EnableDirectUrl, HomeSortFrom = x.HomeSortFrom })
                .ToListAsync(cancellationToken);
                
            
                
            
                
            response.FooterPages = await _context.WebPages
                .Where(x => x.Publish == true && x.ShowInFooter == true)
                .Select(x => new WebPageDto { Id = x.Id, Title = x.Title, DirectUrl = x.DirectUrl, EnableDirectUrl = x.EnableDirectUrl, HomeSortFrom = x.HomeSortFrom })
                .ToListAsync(cancellationToken);

            return response;
        }
    }
}

