import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';
import { TemplateHydrationService } from './services/template-hydration.service';
import { MonacoLoaderService } from './services/monaco-loader.service';

export interface InstalledTemplateItem {
  id: string;
  dbId?: string;
  name: string;
  category: string;
  variantCode: string;
  badge?: string;
  tag: string;
  groupCode?: string;
  groupName?: string;
  description: string;
  thumbnailGradient: string;
  previewIcon: string;
  previewSubtitle: string;
  previewTitle: string;
  previewBody: string;
  htmlTemplate: string;
  cssStyles: string;
  jsScript?: string;
  version: string;
  installedUtc: string;
  isCustomized?: boolean;
  defaultContentJson?: string;
}

export interface CodeInjectionTag {
  id: string;
  name: string;
  zone: 'head' | 'body_open' | 'footer';
  tagType: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  createdAtUtc?: string;
}

@Component({
  selector: 'app-my-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-templates.component.html',
  styleUrl: './my-templates.component.scss'
})
export class MyTemplatesComponent implements OnInit, OnDestroy {
  installedTemplates: InstalledTemplateItem[] = [];
  filteredTemplates: InstalledTemplateItem[] = [];
  searchQuery: string = '';
  selectedCategory: string = 'all';
  viewMode: 'grid' | 'table' = 'grid';

  categories = [
    { id: 'menu', name: 'Navigation', icon: 'menu' },
    { id: 'hero', name: 'Hero Sliders', icon: 'view_carousel' },
    { id: 'body', name: 'Body Features', icon: 'view_quilt' },
    { id: 'footer', name: 'Footers', icon: 'dock_to_bottom' },
    { id: 'blog', name: 'Blogs', icon: 'newspaper' },
    { id: 'ecommerce', name: 'E-Commerce', icon: 'shopping_bag' },
    { id: 'breadcrumb', name: 'Breadcrumbs & Page Headers', icon: 'linear_scale' }
  ];

  selectedGroup: string = 'all';
  previewActivePageSlug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'contact' = 'home';
  previewCartCount: number = 0;
  currentTenantBrandName: string = localStorage.getItem('tenant_name') || localStorage.getItem('tenant_company_name') || 'Enterprise Workspace';
  currentTenantSubdomain: string = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_subdomain') || 'portal';

  // Active Main Tab
  activeMainTab: 'vault' | 'head' | 'body_open' | 'footer' = 'vault';
  headTags: CodeInjectionTag[] = [];
  bodyOpenTags: CodeInjectionTag[] = [];
  footerTags: CodeInjectionTag[] = [];
  loadingTags: boolean = false;
  loadingTemplates: boolean = false;

  // Custom Template Modal State
  showCustomTemplateModal: boolean = false;
  savingCustomTemplate: boolean = false;
  customTemplateForm = {
    name: '',
    categoryKey: 'body',
    variantCode: '',
    description: '',
    htmlTemplate: '',
    cssStyles: '',
    jsScript: ''
  };

  // Code Injection Modal State
  showTagModal: boolean = false;
  isEditingTag: boolean = false;
  tagFormZone: 'head' | 'body_open' | 'footer' = 'head';
  tagForm: CodeInjectionTag = {
    id: '',
    name: '',
    zone: 'head',
    tagType: 'link_stylesheet',
    content: '',
    sortOrder: 10,
    isActive: true
  };
  savingTag: boolean = false;

  // Comprehensive Meta & Icon Presets State
  selectedMetaPreset: string = 'full_suite';
  customMetaAttrType: 'name' | 'property' | 'http-equiv' = 'name';
  customMetaAttrName: string = '';
  customMetaAttrContent: string = '';

  // CSS File Upload State
  selectedCssFile: File | null = null;
  selectedCssFileName: string = '';
  selectedCssFileSize: string = '';
  uploadingCss: boolean = false;
  uploadedCssUrl: string = '';

  readonly metaPresets: Record<string, { name: string; icon: string; content: string }> = {
    full_suite: {
      name: 'Full SEO & Social Meta Suite (All-In-One with Placeholders)',
      icon: 'auto_awesome',
      content: `<!-- Primary SEO Meta Tags -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name="title" content="{{ Title }} | {{ BrandName }}" />
<meta name="description" content="{{ Description }}" />
<meta name="keywords" content="{{ Keywords }}" />
<meta name="author" content="{{ Author }}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="{{ CanonicalUrl }}" />

<!-- Open Graph Protocol (Facebook, LinkedIn, Discord) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="{{ CanonicalUrl }}" />
<meta property="og:title" content="{{ Title }} | {{ BrandName }}" />
<meta property="og:description" content="{{ Description }}" />
<meta property="og:image" content="{{ ImageUrl }}" />
<meta property="og:site_name" content="{{ BrandName }}" />

<!-- Twitter / X Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="{{ CanonicalUrl }}" />
<meta name="twitter:title" content="{{ Title }} | {{ BrandName }}" />
<meta name="twitter:description" content="{{ Description }}" />
<meta name="twitter:image" content="{{ ImageUrl }}" />
<meta name="twitter:site" content="@{{ BrandName }}" />

<!-- Favicon & Web App Icons -->
<link rel="shortcut icon" href="{{ FaviconUrl }}" type="image/x-icon" />
<link rel="icon" type="image/x-icon" href="{{ FaviconUrl }}" />
<link rel="icon" type="image/png" sizes="32x32" href="{{ Icon32Url }}" />
<link rel="icon" type="image/png" sizes="16x16" href="{{ Icon16Url }}" />
<link rel="apple-touch-icon" sizes="180x180" href="{{ AppleTouchIconUrl }}" />
<meta name="theme-color" content="{{ ThemeColor }}" />`
    },
    favicons_icons: {
      name: 'Favicons, Web App Icons & Manifest (.ico, .png, .svg, Apple Touch)',
      icon: 'star',
      content: `<!-- Standard Web Favicons -->
<link rel="shortcut icon" href="{{ FaviconUrl }}" type="image/x-icon" />
<link rel="icon" type="image/x-icon" href="{{ FaviconUrl }}" />
<link rel="icon" type="image/png" sizes="32x32" href="{{ Icon32Url }}" />
<link rel="icon" type="image/png" sizes="16x16" href="{{ Icon16Url }}" />

<!-- Apple Touch Icon (iOS Home Screen) -->
<link rel="apple-touch-icon" sizes="180x180" href="{{ AppleTouchIconUrl }}" />

<!-- Android Chrome / PWA Web Manifest -->
<link rel="manifest" href="/site.webmanifest" />

<!-- Safari Pinned Tab Icon -->
<link rel="mask-icon" href="{{ SafariPinnedTabUrl }}" color="{{ ThemeColor }}" />
<meta name="msapplication-TileColor" content="{{ ThemeColor }}" />
<meta name="theme-color" content="{{ ThemeColor }}" />`
    },
    open_graph: {
      name: 'Open Graph Protocol (Facebook, LinkedIn, Discord)',
      icon: 'share',
      content: `<!-- Open Graph / Social Media Sharing -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="{{ BrandName }}" />
<meta property="og:url" content="{{ CanonicalUrl }}" />
<meta property="og:title" content="{{ Title }}" />
<meta property="og:description" content="{{ Description }}" />
<meta property="og:image" content="{{ ImageUrl }}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_US" />`
    },
    twitter: {
      name: 'Twitter / X Card Suite (Large Summary Image)',
      icon: 'campaign',
      content: `<!-- Twitter / X Card Metadata -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:domain" content="{{ DomainName }}" />
<meta name="twitter:url" content="{{ CanonicalUrl }}" />
<meta name="twitter:title" content="{{ Title }}" />
<meta name="twitter:description" content="{{ Description }}" />
<meta name="twitter:image" content="{{ ImageUrl }}" />
<meta name="twitter:site" content="@{{ BrandName }}" />
<meta name="twitter:creator" content="@{{ Author }}" />`
    },
    seo_core: {
      name: 'Core SEO & Search Bots (Keywords, Description, Robots, Canonical)',
      icon: 'search',
      content: `<!-- Core Search Engine Optimization -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name="description" content="{{ Description }}" />
<meta name="keywords" content="{{ Keywords }}" />
<meta name="author" content="{{ Author }}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta name="googlebot" content="index, follow" />
<link rel="canonical" href="{{ CanonicalUrl }}" />`
    },
    mobile_pwa: {
      name: 'Mobile PWA & Browser Theme (Viewport, Theme Color, Web App)',
      icon: 'smartphone',
      content: `<!-- Mobile & PWA Device Configuration -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="theme-color" content="{{ ThemeColor }}" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="{{ BrandName }}" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="format-detection" content="telephone=no" />`
    },
    custom: {
      name: 'Custom Meta Tag (Add Mine Myself)',
      icon: 'tune',
      content: `<!-- Custom Meta Tags -->
<meta name="custom-name" content="{{ CustomValue }}" />`
    }
  };

  private readonly tagBoilerplates: Record<string, string> = {
    // Head zone
    link_stylesheet: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />',
    inline_css: '<style>\n  /* Custom CSS Overrides */\n  :root {\n    --theme-accent: #0050e5;\n  }\n</style>',
    google_fonts: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">',
    meta_tag: `<!-- Primary SEO Meta Tags -->
<title>{{ Title }} | {{ BrandName }}</title>
<meta name="title" content="{{ Title }} | {{ BrandName }}" />
<meta name="description" content="{{ Description }}" />
<meta name="keywords" content="{{ Keywords }}" />
<meta name="author" content="{{ Author }}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="{{ CanonicalUrl }}" />

<!-- Open Graph Protocol (Facebook, LinkedIn, Discord) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="{{ CanonicalUrl }}" />
<meta property="og:title" content="{{ Title }} | {{ BrandName }}" />
<meta property="og:description" content="{{ Description }}" />
<meta property="og:image" content="{{ ImageUrl }}" />
<meta property="og:site_name" content="{{ BrandName }}" />

<!-- Twitter / X Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="{{ CanonicalUrl }}" />
<meta name="twitter:title" content="{{ Title }} | {{ BrandName }}" />
<meta name="twitter:description" content="{{ Description }}" />
<meta name="twitter:image" content="{{ ImageUrl }}" />
<meta name="twitter:site" content="@{{ BrandName }}" />

<!-- Favicon & Web App Icons -->
<link rel="shortcut icon" href="{{ FaviconUrl }}" type="image/x-icon" />
<link rel="icon" type="image/x-icon" href="{{ FaviconUrl }}" />
<link rel="icon" type="image/png" sizes="32x32" href="{{ Icon32Url }}" />
<link rel="icon" type="image/png" sizes="16x16" href="{{ Icon16Url }}" />
<link rel="apple-touch-icon" sizes="180x180" href="{{ AppleTouchIconUrl }}" />
<meta name="theme-color" content="{{ ThemeColor }}" />`,
    script_url: '<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js" async></script>',
    inline_script: '<script>\n  // Google Tag Manager / Analytics Head Snippet\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n</script>',
    // Body open zone
    gtm_noscript: '<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->',
    pixel_noscript: '<!-- Meta Pixel (noscript) -->\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"/></noscript>',
    page_loader: '<div id="oz-site-preloader" style="position:fixed;inset:0;background:#0f172a;z-index:99999;display:flex;align-items:center;justify-content:center;transition:opacity 0.5s;">\n  <div style="width:40px;height:40px;border:3px solid rgba(56,189,248,0.2);border-top-color:#38bdf8;border-radius:50%;animation:ozSpin 0.8s linear infinite;"></div>\n</div>\n<script>window.addEventListener(\'load\',function(){var p=document.getElementById(\'oz-site-preloader\');if(p){p.style.opacity=\'0\';setTimeout(function(){p.remove();},500);}});</script>',
    svg_sprites: '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n  <symbol id="icon-check" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></symbol>\n</svg>',
    // Footer zone
    footer_script_url: '<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>',
    footer_inline_script: '<script>\n  document.addEventListener(\'DOMContentLoaded\', function() {\n    // Initialize theme animations & carousels\n    console.log(\'Theme scripts initialized successfully.\');\n  });\n</script>',
    live_chat: '<!-- Live Chat Widget -->\n<script>\n  window.$ozikolChat = { tenantId: \'workspace-default\' };\n</script>',
    raw_html: '<!-- Custom Snippet -->\n'
  };

  // Single Preview Modal
  showSinglePreviewModal: boolean = false;
  activePreviewItem: InstalledTemplateItem | null = null;
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  previewModalTab: 'preview' | 'content' | 'html' | 'css' | 'js' = 'preview';
  modalPreviewPageSlug: 'isolated' | 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog' = 'isolated';
  safeSinglePreviewHtml: SafeHtml = '';
  safeSinglePreviewSrcDoc: SafeHtml | string = '';

  // Interactive Test / Sample Content Replacements
  previewContent = {
    title: 'Empowering Modern Organizations',
    miniTitle: 'NEXT-GENERATION PLATFORM',
    description: 'Streamline administrative workflows, automate financial governance, and deliver seamless digital experiences across sovereign systems.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    buttonText: 'Explore Platform Solutions →',
    buttonLink: '#',
    items: [
      { title: 'Real-Time Sync', description: 'Instantaneous WebSocket state propagation across all connected devices with zero polling latency.' },
      { title: 'Granular Governance', description: 'Fine-grained permission matrices, committee chair controls, and audit verification.' },
      { title: 'Cloud Asset Vault', description: 'High-performance media streaming and document management for all organization tiers.' }
    ]
  };

  // Dedicated Footer Sample Content Replacements
  previewFooterContent: {
    brandName: string;
    description: string;
    email: string;
    phone: string;
    categories: Array<{
      name: string;
      displayTitle?: string;
      pages: Array<{ title: string; url: string }>;
    }>;
    legalPages: Array<{ title: string; url: string }>;
  } = {
    brandName: 'Organization Portal',
    description: 'Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations.',
    email: 'contact@organization.com',
    phone: '+1 (555) 019-2834',
    categories: [
      {
        name: 'Services',
        displayTitle: 'Solutions',
        pages: [
          { title: 'Strategic Consulting', url: '/strategic-advisory' },
          { title: 'Systems Modernization', url: '/systems-modernization' },
          { title: 'Performance & Scale', url: '/performance-scale' },
          { title: 'Enterprise Advisory', url: '/enterprise-governance' }
        ]
      },
      {
        name: 'Company',
        displayTitle: 'Company',
        pages: [
          { title: 'About Us', url: '/about' },
          { title: 'Request a Service', url: '/request-service' },
          { title: 'Contact Us', url: '/contact' }
        ]
      }
    ],
    legalPages: [
      { title: 'Privacy Policy', url: '/privacy-policy' },
      { title: 'Terms & Conditions', url: '/terms-and-conditions' },
      { title: 'Cookie Policy', url: '/cookie-policy' }
    ]
  };

  // Dedicated Menu Sample Content Replacements
  previewMenuContent: {
    brandName: string;
    logoUrl: string;
    topMenuItems: Array<{ title: string; url: string }>;
    dropdowns: Array<{ title: string; pages: Array<{ title: string; url: string }> }>;
    menuCtaButtons: Array<{ title: string; url: string }>;
  } = {
    brandName: 'Acme Global',
    logoUrl: '',
    topMenuItems: [
      { title: 'Home', url: '/' },
      { title: 'About Us', url: '/about' },
      { title: 'Blog', url: '/blog' },
      { title: 'Contact', url: '/contact' }
    ],
    dropdowns: [
      {
        title: 'Services',
        pages: [
          { title: 'Commercial Cleaning', url: '/services/commercial-cleaning' },
          { title: 'Residential Cleaning', url: '/services/residential-cleaning' },
          { title: 'Deep Sanitization', url: '/services/deep-sanitization' }
        ]
      },
      {
        title: 'Company',
        pages: [
          { title: 'About Us', url: '/about' },
          { title: 'Request a Service', url: '/request-service' },
          { title: 'Contact Us', url: '/contact' }
        ]
      }
    ],
    menuCtaButtons: [
      { title: 'Sign In', url: '/login' },
      { title: 'Request a Service', url: '/request-service' }
    ]
  };

  /** Dedicated Hero Sample Content Replacements (strictly isolated from menu & footer) */
  previewHeroContent: {
    title: string;
    miniTitle: string;
    text: string;
    buttonText: string;
    buttonLink: string;
    videoButtonText: string;
    videoLink: string;
    url: string;
    secondUrl: string;
    youtubeVideo: string;
    // Backward compatibility aliases
    description?: string;
    imageUrl?: string;
    badgeText?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
  } = {
    title: 'Next-Generation Infrastructure for Forward-Thinking Organizations',
    miniTitle: 'OFFICIAL PORTAL',
    text: 'Empower your institution with resilient cloud infrastructure, automated governance, secure e-voting, and real-time operational telemetry in one unified workspace.',
    buttonText: 'Explore Solutions',
    buttonLink: '/services',
    videoButtonText: '',
    videoLink: '',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
    secondUrl: '',
    youtubeVideo: ''
  };

  // Interactive Modal Code Editor Reference & Saving State
  @ViewChild('modalHtmlEditor') modalHtmlEditorRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('monacoHtmlContainer') monacoHtmlContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('monacoCssContainer') monacoCssContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('monacoJsContainer') monacoJsContainer?: ElementRef<HTMLDivElement>;

  monacoInstanceHtml?: any;
  monacoInstanceCss?: any;
  monacoInstanceJs?: any;
  loadingMonaco: boolean = false;
  monacoReady: boolean = false;
  savingTemplateHtml: boolean = false;

  // Live Database Tokens (Brand, Menus, Dropdowns, CTAs, Forms, Legal)
  editorTokens: any = {
    brand: {},
    topMenuItems: [],
    menuDropdowns: [],
    menuCtaButtons: [],
    footerCategories: [],
    legalPages: [],
    forms: []
  };

  // Floating Token Documentation Popover State
  activeTokenDoc: any = null;
  popoverTop: number = 0;
  popoverLeft: number = 0;
  popoverLeaveTimer: any = null;

  tokenDocMap: Record<string, { name: string; token: string; description: string; cmsPath: string; example?: string }> = {
    BrandIdentity: {
      name: 'Brand Logo or Name',
      token: '{{ BrandIdentity }}',
      description: 'Renders uploaded brand logo image if present; automatically falls back to business name text if no logo exists.',
      cmsPath: 'Admin Console > Settings > Tenant Brand Settings > Company Logo',
      example: '<a class="navbar-brand" href="/">{{ BrandIdentity }}</a>'
    },
    BrandName: {
      name: 'Brand Name',
      token: '{{ BrandName }}',
      description: 'Tenant organization brand name.',
      cmsPath: 'Admin Console > Settings > General / Branding',
      example: '<span>{{ BrandName }}</span>'
    },
    LogoUrl: {
      name: 'Logo Image URL',
      token: '{{ LogoUrl }}',
      description: 'Direct absolute or relative URL to the uploaded company logo.',
      cmsPath: 'Admin Console > Settings > Tenant Brand Settings',
      example: '<img src="{{ LogoUrl }}" alt="Logo" />'
    },
    MainMenuItems: {
      name: 'Main Menu Items Loop',
      token: '{{#each MainMenuItems}}...{{/each}}',
      description: 'Iterates through published top-level navigation pages with {{ Title }} and {{ Url }}.',
      cmsPath: 'Admin Console > Content Console > Pages (IsPublished = true)',
      example: '{{#each MainMenuItems}}<li class="nav-item"><a class="nav-link" href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    MenuDropdowns: {
      name: 'Menu Dropdowns Loop',
      token: '{{#each MenuDropdowns}}...{{/each}}',
      description: 'Iterates multi-level categories and their child pages using nested {{#each Pages}}.',
      cmsPath: 'Admin Console > Content Console > Page Categories & Pages',
      example: '{{#each MenuDropdowns}}<div class="dropdown"><button>{{ Title }}</button><ul class="dropdown-menu">{{#each Pages}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}</ul></div>{{/each}}'
    },
    MenuCtaButtons: {
      name: 'Menu CTA Buttons Loop',
      token: '{{#each MenuCtaButtons}}...{{/each}}',
      description: 'Dynamic header call-to-action buttons configured on published pages with IsMenuCTA enabled.',
      cmsPath: 'Admin Console > Web Pages > Edit Page > Enable "Show as Menu CTA"',
      example: '{{#each MenuCtaButtons}}<a href="{{ Url }}" class="btn btn-primary">{{ Title }}</a>{{/each}}'
    },
    Title: {
      name: 'Headline / Title',
      token: '{{ Title }}',
      description: 'Primary headline of the slider or section.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Headline',
      example: '<h1>{{ Title }}</h1>'
    },
    MiniTitle: {
      name: 'Mini Title / Eyebrow',
      token: '{{ MiniTitle }}',
      description: 'Sub-tag or eyebrow pill badge displayed above main headline.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Mini Title',
      example: '<span class="badge">{{ MiniTitle }}</span>'
    },
    Text: {
      name: 'Slide Text / Summary',
      token: '{{ Text }}',
      description: 'Supportive summary narrative or descriptive text.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Slide Text',
      example: '<p>{{ Text }}</p>'
    },
    Description: {
      name: 'Description (Alias to Text)',
      token: '{{ Description }}',
      description: 'Summary narrative or introductory body copy.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Slide Text',
      example: '<p>{{ Description }}</p>'
    },
    ButtonText: {
      name: 'Primary Action Text',
      token: '{{ ButtonText }}',
      description: 'Label text for primary call to action.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Button Text',
      example: '<a href="{{ ButtonLink }}" class="btn btn-primary">{{ ButtonText }}</a>'
    },
    ButtonLink: {
      name: 'Primary Action Destination',
      token: '{{ ButtonLink }}',
      description: 'Route, hash, or external URL destination.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Button Link',
      example: '<a href="{{ ButtonLink }}">{{ ButtonText }}</a>'
    },
    VideoButtonText: {
      name: 'Video Button Text',
      token: '{{ VideoButtonText }}',
      description: 'Text label for secondary/video trigger button.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Video Button Text',
      example: '<a href="{{ VideoLink }}" class="oz-btn-sec">{{ VideoButtonText }}</a>'
    },
    VideoLink: {
      name: 'Video Popup Link',
      token: '{{ VideoLink }}',
      description: 'Target popup video URL or destination route.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Popup Video Link',
      example: '<a href="{{ VideoLink }}">{{ VideoButtonText }}</a>'
    },
    Url: {
      name: 'Primary Slide Image URL',
      token: '{{ Url }}',
      description: 'High-resolution primary slide background or feature graphic.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Primary Slide Image',
      example: '<img src="{{ Url }}" alt="{{ Title }}" />'
    },
    ImageUrl: {
      name: 'Image URL (Alias to Url)',
      token: '{{ ImageUrl }}',
      description: 'Slide visual or banner background graphic.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Primary Slide Image',
      example: '<img src="{{ ImageUrl }}" alt="{{ Title }}" />'
    },
    SecondUrl: {
      name: 'Secondary Image URL',
      token: '{{ SecondUrl }}',
      description: 'Secondary overlapping visual asset for split mockups or floating cards.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > Second Image',
      example: '<img src="{{ SecondUrl }}" />'
    },
    YoutubeVideo: {
      name: 'YouTube Video Embed Link',
      token: '{{ YoutubeVideo }}',
      description: 'YouTube embed URL for background or modal video playback.',
      cmsPath: 'Admin Console > Content Console > Sliders > Edit Slider > YouTube Video',
      example: '<iframe src="{{ YoutubeVideo }}"></iframe>'
    },
    Copyright: {
      name: 'Copyright Notice',
      token: '{{ Copyright }}',
      description: 'Auto-generated copyright statement with current year and brand name.',
      cmsPath: 'Admin Console > Settings > General / Branding',
      example: '<p>{{ Copyright }}</p>'
    },
    CategoryPages: {
      name: 'Category Pages Loop',
      token: '{{#each CategoryPages "CategoryName"}}...{{/each}}',
      description: 'Iterates through published pages assigned to a specific category where ShowInFooter is enabled.',
      cmsPath: 'Admin Console > Content Console > Pages (ShowInFooter = true)',
      example: '{{#each CategoryPages "Services"}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    TaggedPages: {
      name: 'Tagged Pages Loop',
      token: '{{#each TaggedPages "tag-name"}}...{{/each}}',
      description: 'Iterates through published pages assigned a specific tag where ShowInFooter is enabled.',
      cmsPath: 'Admin Console > Content Console > Pages > Edit Page > Page Tags',
      example: '{{#each TaggedPages "quick-links"}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    LegalPages: {
      name: 'Legal Pages Loop',
      token: '{{#each LegalPages}}...{{/each}}',
      description: 'Iterates through published legal compliance documents (Privacy Policy, Terms, etc.) where ShowInFooter is enabled.',
      cmsPath: 'Admin Console > Content Console > Pages > Edit Page > Is Legal Document',
      example: '{{#each LegalPages}}<li><a href="{{ Url }}">{{ Title }}</a></li>{{/each}}'
    },
    Form: {
      name: 'Embedded Form',
      token: '{{ Form "FormKey" }}',
      description: 'Embeds an active published form component by key (e.g. newsletter subscribe or contact).',
      cmsPath: 'Admin Console > Content Console > Forms',
      example: '{{ Form "Newsletter_Subscribe" }}'
    },
    Articles: {
      name: 'Articles Showcase Loop',
      token: '{{#each Articles}}...{{/each}}',
      description: 'Iterates through published articles for card grids and showcases.',
      cmsPath: 'Admin Console > Content Console > Articles & Insights',
      example: '{{#each Articles}}<div class="col-md-4">...</div>{{/each}}'
    },
    CoverImageUrl: {
      name: 'Article Cover Image',
      token: '{{ CoverImageUrl }}',
      description: 'High-resolution featured cover photo for the article.',
      cmsPath: 'Admin Console > Content Console > Articles > Edit Article > Featured Image',
      example: '<img src="{{ CoverImageUrl }}" alt="{{ Title }}" />'
    },
    PublishedDate: {
      name: 'Published Date',
      token: '{{ PublishedDate }}',
      description: 'Formatted date of article publication (e.g. Sep 14, 2026).',
      cmsPath: 'Admin Console > Content Console > Articles > Published Date',
      example: '<span>{{ PublishedDate }}</span>'
    },
    Excerpt: {
      name: 'Article Excerpt',
      token: '{{ Excerpt }}',
      description: 'Introductory summary or teaser paragraph.',
      cmsPath: 'Admin Console > Content Console > Articles > Summary',
      example: '<p>{{ Excerpt }}</p>'
    },
    RecentArticles: {
      name: 'Recent Articles Loop',
      token: '{{#each RecentArticles}}...{{/each}}',
      description: 'Iterates through the most recent articles for sidebar widgets.',
      cmsPath: 'Admin Console > Content Console > Articles & Insights',
      example: '{{#each RecentArticles}}...{{/each}}'
    },
    BlogCategories: {
      name: 'Blog Categories Loop',
      token: '{{#each BlogCategories}}...{{/each}}',
      description: 'Iterates through topics and categories with live article counts.',
      cmsPath: 'Admin Console > Content Console > Articles > Categories',
      example: '{{#each BlogCategories}}<li>{{ Name }} ({{ PostCount }})</li>{{/each}}'
    },
    Article_Title: {
      name: 'Main Article Title',
      token: '{{ Article.Title }}',
      description: 'Full title of the active article being displayed.',
      cmsPath: 'Admin Console > Content Console > Articles > Title',
      example: '<h1>{{ Article.Title }}</h1>'
    },
    Article_Category: {
      name: 'Article Category',
      token: '{{ Article.Category }}',
      description: 'Editorial topic or taxonomy badge of the article.',
      cmsPath: 'Admin Console > Content Console > Articles > Category',
      example: '<span class="badge">{{ Article.Category }}</span>'
    },
    Article_PublishedDate: {
      name: 'Publication Date',
      token: '{{ Article.PublishedDate }}',
      description: 'Formatted date of publication (e.g. September 14, 2026).',
      cmsPath: 'Admin Console > Content Console > Articles > Published Date',
      example: '<span>{{ Article.PublishedDate }}</span>'
    },
    Article_ReadTime: {
      name: 'Estimated Read Time',
      token: '{{ Article.ReadTime }}',
      description: 'Calculated reading time (e.g. 5 min read).',
      cmsPath: 'Admin Console > Content Console > Articles > Auto-calculated',
      example: '<span>{{ Article.ReadTime }}</span>'
    },
    Article_CoverImageUrl: {
      name: 'Featured Banner Image',
      token: '{{ Article.CoverImageUrl }}',
      description: 'High-resolution wide header banner image.',
      cmsPath: 'Admin Console > Content Console > Articles > Featured Image',
      example: '<img src="{{ Article.CoverImageUrl }}" alt="{{ Article.Title }}" />'
    },
    Article_Body: {
      name: 'Article Content Body',
      token: '{{ Article.Body }}',
      description: 'Full rich HTML body text of the article.',
      cmsPath: 'Admin Console > Content Console > Articles > Content Editor',
      example: '<div class="article-body">{{ Article.Body }}</div>'
    },
    Article_Tags: {
      name: 'Article Tags Loop',
      token: '{{#each Article.Tags}}...{{/each}}',
      description: 'Iterates through topic tags assigned to the article.',
      cmsPath: 'Admin Console > Content Console > Articles > Tags',
      example: '{{#each Article.Tags}}<span class="badge">{{ this }}</span>{{/each}}'
    },
    Article_AuthorName: {
      name: 'Author Name',
      token: '{{ Article.AuthorName }}',
      description: 'Full name of the article author.',
      cmsPath: 'Admin Console > Content Console > Articles > Author',
      example: '<h6>Written by {{ Article.AuthorName }}</h6>'
    },
    Article_AuthorRole: {
      name: 'Author Role / Title',
      token: '{{ Article.AuthorRole }}',
      description: 'Professional title or organizational role of the author.',
      cmsPath: 'Admin Console > Content Console > Articles > Author Role',
      example: '<span>{{ Article.AuthorRole }}</span>'
    },
    Article_AuthorBio: {
      name: 'Author Biography',
      token: '{{ Article.AuthorBio }}',
      description: 'Short professional biography summary for the author card.',
      cmsPath: 'Admin Console > Content Console > Articles > Author Bio',
      example: '<p>{{ Article.AuthorBio }}</p>'
    },
    Article_AuthorAvatarUrl: {
      name: 'Author Portrait Photo',
      token: '{{ Article.AuthorAvatarUrl }}',
      description: 'Square avatar photograph of the author.',
      cmsPath: 'Admin Console > Content Console > Articles > Author Avatar',
      example: '<img src="{{ Article.AuthorAvatarUrl }}" alt="{{ Article.AuthorName }}" />'
    },
    EnableSharePost: {
      name: 'Enable Share Post Conditional',
      token: '{{#if EnableSharePost}}...{{/if}}',
      description: 'Conditionally displays the social media share buttons strip. Configured via MIS / Blog Settings.',
      cmsPath: 'Admin Console > Settings > Blog Settings > Enable Post Sharing',
      example: '{{#if EnableSharePost}}<div class="share-strip">...</div>{{/if}}'
    },
    SocialShareLinks: {
      name: 'Social Share Links Loop',
      token: '{{#each SocialShareLinks}}...{{/each}}',
      description: 'Iterates through enabled social share platforms with dynamic intent URLs ({{ ShareUrl }}, {{ Platform }}, {{ IconClass }}).',
      cmsPath: 'Admin Console > Settings > Blog Settings > Social Media Channels',
      example: '{{#each SocialShareLinks}}<a href="{{ ShareUrl }}" title="{{ Platform }}"><i class="{{ IconClass }}"></i></a>{{/each}}'
    }
  };

  // Dedicated Blog Sample Content Replacements
  previewBlogContent = {
    title: 'Platform Insights & Case Studies',
    miniTitle: 'LATEST KNOWLEDGE',
    description: 'Deep dives, architectural benchmarks, and best practices curated by our systems engineering team.',
    buttonText: 'Browse All Articles →',
    buttonLink: '/blog',
    viewAllButtonText: 'Browse All Articles →',
    viewAllButtonLink: '/blog',
    articles: [
      {
        title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems',
        summary: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
        excerpt: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
        coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
        category: 'Engineering & Architecture',
        authorName: 'Alex Rivera',
        authorRole: 'Chief Architect',
        publishedDate: 'Sep 12, 2026',
        url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems'
      },
      {
        title: 'The Shift to Zero-Downtime Migration Pipelines',
        summary: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
        excerpt: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
        coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
        category: 'DevOps & Reliability',
        authorName: 'Sarah Chen',
        authorRole: 'Head of Infrastructure',
        publishedDate: 'Sep 08, 2026',
        url: '/blog/zero-downtime-migration-pipelines'
      },
      {
        title: 'Next-Gen Identity & Granular Role Governance',
        summary: 'Integrating decentralized identity tokens with high-compliance RBAC structures across distributed micro-services.',
        excerpt: 'Integrating decentralized identity tokens with high-compliance RBAC structures across distributed micro-services.',
        coverImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
        category: 'Cybersecurity',
        authorName: 'Marcus Vance',
        authorRole: 'Security Lead',
        publishedDate: 'Aug 29, 2026',
        url: '/blog/next-gen-identity-governance'
      }
    ]
  };

  /**
   * Sample Content Replacements specifically for single article detail templates (e.g. Blog_ArticleDetail).
   * Fully binds all article scalars, author metadata, tags, and sidebar loops.
   */
  previewBlogDetailContent = {
    title: 'Accelerating Enterprise Scalability with Hybrid Cloud Architecture',
    category: 'Technology & Cloud',
    publishedDate: 'September 14, 2026',
    readTime: '5 min read',
    coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    body: `<p class="lead">In an era of relentless digital expansion, organizations are increasingly challenged to balance agility, resilience, and operational security.</p>
<p>Legacy architectures, once the bedrock of institutional workflows, now struggle to sustain the real-time processing demands of globally distributed systems. By transitioning toward unified hybrid cloud infrastructures, forward-thinking enterprises establish a modular foundation capable of horizontal scaling while preserving strict governance over proprietary data assets.</p>
<h4>Strategic Architectural Foundations</h4>
<p>A resilient multi-region deployment demands three non-negotiable pillars: programmatic infrastructure as code, continuous behavioral telemetries, and automated self-healing orchestration clusters.</p>`,
    tags: ['Cloud Architecture', 'Enterprise Security', 'Scalability', 'Automation'],
    tagsInput: 'Cloud Architecture, Enterprise Security, Scalability, Automation',
    authorName: 'Dr. Jennifer Miller',
    authorRole: 'Principal Cloud Strategist & Enterprise Systems Architect',
    authorBio: 'Principal Cloud Strategist and Enterprise Systems Architect with over 15 years leading high-availability transformations.',
    authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    recentArticles: [
      { title: 'Sustainable Commerce: Optimizing Global Supply Chain Logistics', publishedDate: 'Sep 10, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80', url: '/blog/sustainable-commerce-supply-chain' },
      { title: 'AI-Driven Workflow Orchestration and Customer Personalization', publishedDate: 'Sep 06, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&auto=format&fit=crop&q=80', url: '/blog/ai-driven-workflow-orchestration' }
    ],
    categories: [
      { name: 'Technology & Cloud', postCount: 14, url: '/blog?category=technology' },
      { name: 'Enterprise Strategy', postCount: 9, url: '/blog?category=strategy' },
      { name: 'Operations & Logistics', postCount: 7, url: '/blog?category=operations' },
      { name: 'AI & Automation', postCount: 12, url: '/blog?category=ai' },
      { name: 'Security & Governance', postCount: 5, url: '/blog?category=security' }
    ],
    enableSharePost: true
  };

  // Full-Site Demo Modal
  showFullSiteDemoModal: boolean = false;
  fullDemoViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  safeFullDemoHtml: SafeHtml = '';
  safeFullDemoSrcDoc: SafeHtml | string = '';

  // Assign to Page Modal
  showAssignModal: boolean = false;
  selectedAssignItem: InstalledTemplateItem | null = null;
  targetPageSlug: string = 'home';
  insertPosition: 'top' | 'bottom' = 'bottom';
  availablePages: any[] = [];
  loadingPages: boolean = false;

  // Modern Confirmation Modal States
  showUninstallModal: boolean = false;
  itemToUninstall: InstalledTemplateItem | null = null;
  uninstallingTemplate: boolean = false;

  showDeleteTagModal: boolean = false;
  tagToDelete: CodeInjectionTag | null = null;
  deletingTag: boolean = false;

  // Active Singletons state (menu, hero, footer, blog, breadcrumb, ecommerce = 1 active each; body = additive)
  activeMenuId: string = 'menu-01';
  activeHeroId: string = 'hero-01';
  activeFooterId: string = 'footer-01';
  activeBlogId: string = '';
  activeBreadcrumbId: string = '';
  activeEcommerceId: string = 'ecom-01';
  singletonCategories: string[] = ['menu', 'hero', 'footer', 'blog', 'breadcrumb', 'ecommerce'];

  constructor(
    private router: Router,
    private api: ApiService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
    private hydrationService: TemplateHydrationService,
    private monacoLoader: MonacoLoaderService
  ) {}

  ngOnInit(): void {
    this.cleanupLeakedStyles();
    const savedView = localStorage.getItem('oz_templates_view_mode') as 'grid' | 'table';
    if (savedView) this.viewMode = savedView;

    // Resolve active tenant business name and portal subdomain dynamically
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res?.data) {
          const brandName = res.data.companyName || res.data.organizationDisplayName || res.data.siteTitle;
          if (brandName) {
            this.currentTenantBrandName = brandName;
            localStorage.setItem('tenant_name', brandName);
          }
        }
      },
      error: () => {}
    });

    this.loadInstalledTemplates();
    this.loadAllCodeInjections();
    this.loadAvailablePages();
    this.loadEditorTokens();
  }

  ngOnDestroy(): void {
    this.cleanupLeakedStyles();
    this.disposeMonacoEditors();
  }

  private cleanupLeakedStyles(): void {
    const s1 = document.getElementById('oz-template-single-preview-css');
    if (s1) s1.remove();
    const s2 = document.getElementById('oz-full-demo-preview-css');
    if (s2) s2.remove();
    const s3 = document.getElementById('oz-marketplace-preview-style');
    if (s3) s3.remove();
  }

  @HostListener('window:message', ['$event'])
  onIframeMessage(event: MessageEvent): void {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'DEMO_NAV') {
      const href = (event.data.href || '').trim().toLowerCase();
      const text = (event.data.text || '').trim().toLowerCase();
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      let targetSlug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'contact' = 'home';

      if (href.includes('request') || text.includes('request')) {
        targetSlug = 'request-service';
      } else if (href.includes('about') || text.includes('about')) {
        targetSlug = 'about';
      } else if (href.includes('services') || text.includes('service') || text.includes('solution')) {
        targetSlug = 'services';
      } else if (href.includes('blog') || text.includes('blog') || text.includes('news') || text.includes('article')) {
        targetSlug = 'blog';
      } else if (href.includes('contact') || text.includes('contact')) {
        targetSlug = 'contact';
      } else if (href.includes('home') || text.includes('home')) {
        targetSlug = 'home';
      }

      if (this.showSinglePreviewModal && this.activePreviewItem?.category === 'menu') {
        this.setModalPreviewPage(targetSlug);
        this.toast.info(`Switched preview simulation to ${targetSlug.replace('-', ' ').toUpperCase()} page.`);
      } else {
        this.setPreviewPage(targetSlug);
        this.toast.info(`Navigated to ${targetSlug.replace('-', ' ').toUpperCase()} in live preview.`);
      }
    }
  }

  loadAvailablePages(): void {
    this.loadingPages = true;
    this.api.get<any>('ContentApi/pages').subscribe({
      next: (res) => {
        this.loadingPages = false;
        if (res?.data && Array.isArray(res.data)) {
          this.availablePages = res.data;
        }
      },
      error: () => {
        this.loadingPages = false;
      }
    });
  }

  setViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
    localStorage.setItem('oz_templates_view_mode', mode);
  }

  // ==========================================
  // CODE INJECTION ZONE HELPERS & CRUD
  // ==========================================
  getZoneIcon(zone: string): string {
    switch (zone) {
      case 'head': return 'code';
      case 'body_open': return 'vertical_align_top';
      case 'footer': return 'dock_to_bottom';
      default: return 'code';
    }
  }

  getZoneTitle(zone: string): string {
    switch (zone) {
      case 'head': return 'Header (<head>)';
      case 'body_open': return 'Body Open (<body>)';
      case 'footer': return 'Footer (</body>)';
      default: return 'Code Injection';
    }
  }

  getZoneShortTitle(zone: string): string {
    switch (zone) {
      case 'head': return 'Header';
      case 'body_open': return 'Body Open';
      case 'footer': return 'Footer';
      default: return 'Tag';
    }
  }

  getZoneHtmlTag(zone: string): string {
    switch (zone) {
      case 'head': return 'head';
      case 'body_open': return 'body - immediately after opening';
      case 'footer': return 'body - before closing';
      default: return 'head';
    }
  }

  getZoneDescription(zone: string): string {
    switch (zone) {
      case 'head': return 'Injected inside document <head>. Ideal for external stylesheets, web fonts, favicon links, and SEO meta tags.';
      case 'body_open': return 'Injected immediately after the opening <body> tag. Essential for GTM noscript fallbacks, Facebook Pixel noscript, and site loaders.';
      case 'footer': return 'Injected just prior to the closing </body> tag. Perfect for vendor JavaScript bundles, analytics trackers, and live chat widgets.';
      default: return '';
    }
  }

  getActiveZoneTags(): CodeInjectionTag[] {
    if (this.activeMainTab === 'head') return this.headTags;
    if (this.activeMainTab === 'body_open') return this.bodyOpenTags;
    if (this.activeMainTab === 'footer') return this.footerTags;
    return [];
  }

  getTagTypeLabel(tagType: string): string {
    const labels: Record<string, string> = {
      link_stylesheet: 'CSS Stylesheet Link',
      inline_css: 'Inline CSS Style',
      google_fonts: 'Google Fonts',
      meta_tag: 'Meta Tag',
      script_url: 'External Script',
      inline_script: 'Inline Script',
      gtm_noscript: 'GTM (noscript)',
      pixel_noscript: 'Pixel (noscript)',
      page_loader: 'Page Preloader',
      svg_sprites: 'SVG Sprite Sheet',
      live_chat: 'Live Chat Widget',
      raw_html: 'Raw Snippet'
    };
    return labels[tagType] || tagType;
  }

  loadAllCodeInjections(): void {
    this.loadingTags = true;
    const cached = localStorage.getItem('oz_code_injections_cache');
    if (cached) {
      try {
        const parsed: CodeInjectionTag[] = JSON.parse(cached);
        this.headTags = parsed.filter(t => t.zone === 'head').sort((a, b) => a.sortOrder - b.sortOrder);
        this.bodyOpenTags = parsed.filter(t => t.zone === 'body_open').sort((a, b) => a.sortOrder - b.sortOrder);
        this.footerTags = parsed.filter(t => t.zone === 'footer').sort((a, b) => a.sortOrder - b.sortOrder);
      } catch (e) {}
    }

    this.api.get<any>('ContentApi/code-injections').subscribe({
      next: (res) => {
        this.loadingTags = false;
        if (res?.data && Array.isArray(res.data)) {
          const tags: CodeInjectionTag[] = res.data;
          this.headTags = tags.filter(t => t.zone === 'head').sort((a, b) => a.sortOrder - b.sortOrder);
          this.bodyOpenTags = tags.filter(t => t.zone === 'body_open').sort((a, b) => a.sortOrder - b.sortOrder);
          this.footerTags = tags.filter(t => t.zone === 'footer').sort((a, b) => a.sortOrder - b.sortOrder);
          localStorage.setItem('oz_code_injections_cache', JSON.stringify(tags));
        }
      },
      error: () => {
        this.loadingTags = false;
      }
    });
  }

  openCreateTagModal(zone?: 'head' | 'body_open' | 'footer' | string): void {
    this.isEditingTag = false;
    const targetZone: 'head' | 'body_open' | 'footer' =
      (zone === 'head' || zone === 'body_open' || zone === 'footer')
        ? zone
        : (this.activeMainTab === 'vault' ? 'head' : this.activeMainTab);

    let defaultType = 'link_stylesheet';
    if (targetZone === 'body_open') defaultType = 'gtm_noscript';
    if (targetZone === 'footer') defaultType = 'script_url';

    const currentCount = (targetZone === 'head' ? this.headTags : targetZone === 'body_open' ? this.bodyOpenTags : this.footerTags).length;

    this.tagFormZone = targetZone;
    this.tagForm = {
      id: '',
      name: '',
      zone: targetZone,
      tagType: defaultType,
      content: this.tagBoilerplates[defaultType] || '',
      sortOrder: (currentCount + 1) * 10,
      isActive: true
    };
    this.showTagModal = true;
  }

  openEditTagModal(tag: CodeInjectionTag): void {
    this.isEditingTag = true;
    this.tagFormZone = tag.zone;
    this.tagForm = { ...tag };
    this.showTagModal = true;
  }

  closeTagModal(): void {
    this.showTagModal = false;
  }

  onTagTypeChanged(): void {
    if (this.tagForm.tagType === 'meta_tag') {
      this.selectedMetaPreset = 'full_suite';
      this.tagForm.content = this.metaPresets['full_suite'].content;
      if (!this.tagForm.name || this.tagForm.name === 'SEO / Social Meta Tag') {
        this.tagForm.name = 'Primary SEO, Social & Favicon Meta Suite';
      }
      return;
    }

    if (this.tagBoilerplates[this.tagForm.tagType]) {
      this.tagForm.content = this.tagBoilerplates[this.tagForm.tagType];
    }
  }

  /**
   * Switches the active meta boilerplate when the user changes the meta preset dropdown.
   */
  onMetaPresetChanged(): void {
    if (this.metaPresets[this.selectedMetaPreset]) {
      this.tagForm.content = this.metaPresets[this.selectedMetaPreset].content;
      this.tagForm.name = `Meta: ${this.metaPresets[this.selectedMetaPreset].name.split('(')[0].trim()}`;
      this.toast.info(`Loaded ${this.metaPresets[this.selectedMetaPreset].name.split('(')[0].trim()} preset.`);
    }
  }

  /**
   * Inserts a custom meta tag built via the interactive "Add Mine Myself" builder.
   */
  insertCustomMetaTag(): void {
    if (!this.customMetaAttrName?.trim()) {
      this.toast.error('Please enter a meta attribute name (e.g. fb:app_id, geo.region, referrer).');
      return;
    }
    const val = this.customMetaAttrContent?.trim() || '';
    const tag = `\n<meta ${this.customMetaAttrType}="${this.customMetaAttrName.trim()}" content="${val}" />`;
    this.tagForm.content = (this.tagForm.content || '').trimEnd() + tag;
    this.toast.success(`Inserted <meta ${this.customMetaAttrType}="${this.customMetaAttrName.trim()}">`);
    this.customMetaAttrName = '';
    this.customMetaAttrContent = '';
  }

  /**
   * Inserts a dynamic placeholder token directly into the tag code textarea.
   */
  insertPlaceholderIntoTag(placeholder: string): void {
    this.tagForm.content = (this.tagForm.content || '').trimEnd() + ' ' + placeholder;
    this.toast.info(`Inserted ${placeholder}`);
  }

  /**
   * Handles local CSS file selection.
   */
  onCssFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.css')) {
      this.toast.error('Please select a valid CSS file (.css).');
      return;
    }
    this.selectedCssFile = file;
    this.selectedCssFileName = file.name;
    this.selectedCssFileSize = (file.size / 1024).toFixed(1) + ' KB';
    this.toast.info(`Selected CSS file: ${file.name}`);
  }

  /**
   * Uploads the selected CSS file to the backend and links it via <link rel="stylesheet">.
   */
  uploadAndLinkCssFile(): void {
    if (!this.selectedCssFile) {
      this.toast.error('Please choose a .css file first.');
      return;
    }

    this.uploadingCss = true;
    const formData = new FormData();
    formData.append('file', this.selectedCssFile);

    this.api.post<any>('ContentApi/upload-css', formData).subscribe({
      next: (res) => {
        this.uploadingCss = false;
        const url = res?.data?.url;
        if (url) {
          this.uploadedCssUrl = url;
          this.tagForm.content = `<link rel="stylesheet" href="${url}" />`;
          this.tagForm.name = `Stylesheet: ${this.selectedCssFileName}`;
          this.tagForm.tagType = 'link_stylesheet';
          this.toast.success('CSS uploaded and stylesheet link generated successfully!');
        } else {
          this.toast.error('Failed to resolve uploaded CSS URL.');
        }
      },
      error: () => {
        this.uploadingCss = false;
        this.toast.warning('Remote upload failed. Automatically importing as inline <style> directly.');
        this.importCssAsInlineStyle();
      }
    });
  }

  /**
   * Reads the selected CSS file and embeds its raw contents into an inline <style> tag.
   */
  importCssAsInlineStyle(): void {
    if (!this.selectedCssFile) {
      this.toast.error('Please choose a .css file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const cssText = reader.result as string;
      this.tagForm.content = `<style>\n  /* Source: ${this.selectedCssFileName} */\n${cssText}\n</style>`;
      this.tagForm.name = `Custom CSS: ${this.selectedCssFileName}`;
      this.tagForm.tagType = 'inline_css';
      this.toast.success(`Imported ${this.selectedCssFileName} into inline <style>!`);
    };
    reader.onerror = () => {
      this.toast.error('Failed to read CSS file from disk.');
    };
    reader.readAsText(this.selectedCssFile);
  }

  saveTag(): void {
    if (!this.tagForm.name?.trim() || !this.tagForm.content?.trim()) {
      this.toast.error('Please enter a tag name and snippet content.');
      return;
    }

    this.savingTag = true;
    this.tagForm.zone = this.tagFormZone;

    if (this.isEditingTag) {
      this.api.put<any>(`ContentApi/code-injections/${this.tagForm.id}`, this.tagForm).subscribe({
        next: () => {
          this.savingTag = false;
          this.toast.success(`Tag '${this.tagForm.name}' updated.`);
          this.closeTagModal();
          this.loadAllCodeInjections();
        },
        error: () => {
          this.savingTag = false;
          this.toast.error('Failed to update tag. Please check your network.');
        }
      });
    } else {
      this.api.post<any>('ContentApi/code-injections', this.tagForm).subscribe({
        next: () => {
          this.savingTag = false;
          this.toast.success(`Tag '${this.tagForm.name}' injected into ${this.getZoneShortTitle(this.tagFormZone)}.`);
          this.closeTagModal();
          this.loadAllCodeInjections();
        },
        error: () => {
          this.savingTag = false;
          this.toast.error('Failed to save tag. Please check your network.');
        }
      });
    }
  }

  toggleTag(tag: CodeInjectionTag): void {
    tag.isActive = !tag.isActive;
    this.api.post<any>(`ContentApi/code-injections/${tag.id}/toggle`, {}).subscribe({
      next: () => {
        this.toast.success(`Tag '${tag.name}' is now ${tag.isActive ? 'Active' : 'Disabled'}.`);
        this.loadAllCodeInjections();
      },
      error: () => {
        tag.isActive = !tag.isActive;
        this.toast.error('Failed to toggle tag status.');
      }
    });
  }

  openDeleteTagModal(tag: CodeInjectionTag): void {
    this.tagToDelete = tag;
    this.showDeleteTagModal = true;
  }

  closeDeleteTagModal(): void {
    this.showDeleteTagModal = false;
    this.tagToDelete = null;
    this.deletingTag = false;
  }

  confirmDeleteTag(): void {
    if (!this.tagToDelete) return;
    const tag = this.tagToDelete;
    this.deletingTag = true;

    this.api.delete<any>(`ContentApi/code-injections/${tag.id}`).subscribe({
      next: () => {
        this.deletingTag = false;
        this.toast.success(`Tag '${tag.name}' deleted.`);
        this.closeDeleteTagModal();
        this.loadAllCodeInjections();
      },
      error: () => {
        this.deletingTag = false;
        this.toast.error('Failed to delete tag.');
        this.closeDeleteTagModal();
      }
    });
  }

  // ==========================================
  // CUSTOM SECTION TEMPLATE BUILDER METHODS
  // ==========================================
  openCreateCustomTemplateModal(): void {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.customTemplateForm = {
      name: '',
      categoryKey: 'body',
      variantCode: `Body_Custom_${randomSuffix}`,
      description: '',
      htmlTemplate: `<section class="oz-custom-section">\n  <div class="oz-container">\n    <h2>{{ Title }}</h2>\n    <p>{{ Description }}</p>\n  </div>\n</section>`,
      cssStyles: `/* Optional Scoped CSS (Leave blank if styling via Header Tags) */\n.oz-custom-section {\n  padding: 60px 24px;\n  background: #f8fafc;\n  font-family: Inter, sans-serif;\n}`,
      jsScript: ''
    };
    this.showCustomTemplateModal = true;
  }

  closeCustomTemplateModal(): void {
    this.showCustomTemplateModal = false;
  }

  onCustomCategoryChange(): void {
    const cat = this.customTemplateForm.categoryKey || 'body';
    const prefixMap: Record<string, string> = {
      menu: 'Menu_Custom',
      hero: 'Hero_Custom',
      body: 'Body_Custom',
      footer: 'Footer_Custom',
      newsletter: 'Newsletter_Custom',
      contact: 'Contact_Custom',
      blog: 'Blog_Custom',
      ecommerce: 'Ecom_Custom',
      faq: 'Faq_Custom',
      marquee: 'Marquee_Custom'
    };
    const pfx = prefixMap[cat] || 'Section_Custom';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    this.customTemplateForm.variantCode = `${pfx}_${randomSuffix}`;
  }

  insertPlaceholder(token: string): void {
    this.customTemplateForm.htmlTemplate = (this.customTemplateForm.htmlTemplate || '') + '\n' + token;
    this.toast.info(`Inserted token: ${token.split('\n')[0]}`);
  }

  insertNamedToken(tokenName: string): void {
    let token = `{{ ${tokenName} }}`;
    if (tokenName === 'PageSectionLists') {
      token = '{{#each PageSectionLists}}\n  <div class="item">\n    <h4>{{ Title }}</h4>\n    <p>{{ Description }}</p>\n  </div>\n{{/each}}';
    }
    this.insertPlaceholder(token);
  }

  saveCustomTemplate(): void {
    if (!this.customTemplateForm.name?.trim()) {
      this.toast.error('Please enter a template name.');
      return;
    }
    if (!this.customTemplateForm.htmlTemplate?.trim()) {
      this.toast.error('Please provide the HTML markup for this section.');
      return;
    }
    if (!this.customTemplateForm.variantCode?.trim()) {
      this.onCustomCategoryChange();
    }

    this.savingCustomTemplate = true;

    const payload = {
      ...this.customTemplateForm,
      defaultContentJson: JSON.stringify(this.previewContent)
    };

    this.api.post<any>('ContentApi/templates/custom', payload).subscribe({
      next: (res) => {
        this.savingCustomTemplate = false;
        const newDbItem = res?.data;
        const newTemplate: InstalledTemplateItem = {
          id: this.customTemplateForm.variantCode,
          dbId: newDbItem?.id,
          name: this.customTemplateForm.name,
          category: this.customTemplateForm.categoryKey,
          variantCode: this.customTemplateForm.variantCode,
          tag: 'custom',
          badge: 'Custom',
          description: this.customTemplateForm.description || 'Custom crafted section template',
          thumbnailGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          previewIcon: this.getCategoryIcon(this.customTemplateForm.categoryKey),
          previewSubtitle: this.getCategoryName(this.customTemplateForm.categoryKey),
          previewTitle: this.customTemplateForm.name,
          previewBody: 'Custom section component',
          htmlTemplate: this.customTemplateForm.htmlTemplate,
          cssStyles: this.customTemplateForm.cssStyles,
          jsScript: this.customTemplateForm.jsScript,
          version: '1.0.0',
          installedUtc: new Date().toISOString(),
          defaultContentJson: payload.defaultContentJson
        };

        this.installedTemplates.unshift(newTemplate);
        this.saveInstalledTemplates();
        this.applyFilters();
        this.closeCustomTemplateModal();
        this.toast.success(`Custom template '${newTemplate.name}' created and added to your library!`);
      },
      error: () => {
        this.savingCustomTemplate = false;
        this.toast.error('Failed to create custom template. Please verify API connection.');
      }
    });
  }

  /**
   * Loads installed templates dynamically from the tenant database via ContentApi.
   * Multi-tenant architecture: The database is the sole authority; no templates or content are hardcoded in the client.
   */
  loadInstalledTemplates(): void {
    const storedMenu = localStorage.getItem('oz_active_menu_id');
    const storedHero = localStorage.getItem('oz_active_hero_id');
    const storedFooter = localStorage.getItem('oz_active_footer_id');
    const storedBlog = localStorage.getItem('oz_active_blog_id');
    const storedBreadcrumb = localStorage.getItem('oz_active_breadcrumb_id');
    const storedEcommerce = localStorage.getItem('oz_active_ecommerce_id');

    if (storedMenu) this.activeMenuId = storedMenu;
    if (storedHero) this.activeHeroId = storedHero;
    if (storedFooter) this.activeFooterId = storedFooter;
    if (storedBlog) this.activeBlogId = storedBlog;
    if (storedBreadcrumb) this.activeBreadcrumbId = storedBreadcrumb;
    if (storedEcommerce) this.activeEcommerceId = storedEcommerce;

    this.loadingTemplates = true;

    // Fetch strictly from tenant database via backend API
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res) => {
        this.loadingTemplates = false;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          this.installedTemplates = res.data.map((apiT: any) => this.mapApiToItem(apiT));

          // Set active layout references from database isActive flags
          res.data.forEach((apiT: any) => {
            const cat = apiT.categoryKey?.toLowerCase();
            const itemId = apiT.templateKey || apiT.variantCode || apiT.id;
            if (apiT.isActive) {
              if (cat === 'menu') { this.activeMenuId = itemId; localStorage.setItem('oz_active_menu_id', itemId); }
              if (cat === 'hero') { this.activeHeroId = itemId; localStorage.setItem('oz_active_hero_id', itemId); }
              if (cat === 'footer') { this.activeFooterId = itemId; localStorage.setItem('oz_active_footer_id', itemId); }
              if (cat === 'blog') { this.activeBlogId = itemId; localStorage.setItem('oz_active_blog_id', itemId); }
              if (cat === 'breadcrumb') { this.activeBreadcrumbId = itemId; localStorage.setItem('oz_active_breadcrumb_id', itemId); }
              if (cat === 'ecommerce') { this.activeEcommerceId = itemId; localStorage.setItem('oz_active_ecommerce_id', itemId); }
            }
          });

          this.applyFilters();
        } else {
          this.installedTemplates = [];
          this.applyFilters();
        }
      },
      error: () => {
        this.loadingTemplates = false;
        this.toast.error('Failed to load installed templates from database.');
        this.installedTemplates = [];
        this.applyFilters();
      }
    });
  }

  saveInstalledTemplates(): void {
    // Pure multi-tenant mode: Domain templates are persisted strictly in the tenant database, not in localStorage.
  }

  private mapApiToItem(apiT: any): InstalledTemplateItem {
    const cat = (apiT.categoryKey || 'body').toLowerCase();
    const meta = this.getCategoryVisualMeta(cat);

    return {
      id: apiT.templateKey || apiT.variantCode || apiT.id,
      dbId: apiT.id,
      name: apiT.name || 'Untitled Template',
      category: cat,
      variantCode: apiT.variantCode || apiT.templateKey || 'Section_Custom',
      badge: apiT.isActive ? 'Active' : meta.badge,
      tag: cat,
      groupCode: 'apex-corporate',
      groupName: 'Corporate Suite',
      description: apiT.description || `${apiT.name} component blueprint installed in tenant database.`,
      thumbnailGradient: meta.gradient,
      previewIcon: meta.icon,
      previewSubtitle: meta.subtitle,
      previewTitle: apiT.name,
      previewBody: apiT.description || 'Tenant component template block.',
      htmlTemplate: apiT.htmlTemplate || '',
      cssStyles: apiT.cssStyles || '',
      jsScript: apiT.jsScript || '',
      version: apiT.installedVersion || '1.0.0',
      installedUtc: apiT.installedUtc || new Date().toISOString(),
      isCustomized: apiT.isCustomized,
      defaultContentJson: apiT.defaultContentJson
    };
  }

  private getCategoryVisualMeta(cat: string): { icon: string; gradient: string; badge: string; subtitle: string } {
    switch (cat) {
      case 'menu':
        return { icon: 'menu', gradient: 'linear-gradient(135deg, #0050e5 0%, #1e40af 100%)', badge: 'Navbar', subtitle: 'Navigation' };
      case 'hero':
        return { icon: 'view_carousel', gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', badge: 'Hero', subtitle: 'Hero Banner' };
      case 'footer':
        return { icon: 'dock_to_bottom', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', badge: 'Footer', subtitle: 'Page Footer' };
      case 'newsletter':
        return { icon: 'mail', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', badge: 'Newsletter', subtitle: 'Subscription Bar' };
      case 'contact':
        return { icon: 'contact_mail', gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', badge: 'Intake', subtitle: 'Contact Form' };
      case 'blog':
        return { icon: 'newspaper', gradient: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', badge: 'Articles', subtitle: 'News & Insights' };
      case 'ecommerce':
        return { icon: 'shopping_bag', gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', badge: 'Storefront', subtitle: 'Products Grid' };
      case 'breadcrumb':
        return { icon: 'linear_scale', gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', badge: 'Header', subtitle: 'Page Header' };
      default:
        return { icon: 'view_quilt', gradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', badge: 'Section', subtitle: 'Content Block' };
    }
  }

  // Active Blueprint Helpers
  getActiveMenu(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'menu' && this.activeMenuId === t.id) ||
           this.installedTemplates.find(t => t.category === 'menu');
  }

  getActiveHero(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'hero' && this.activeHeroId === t.id) ||
           this.installedTemplates.find(t => t.category === 'hero');
  }

  getActiveBody(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'body');
  }

  getAllBodyBlocks(): InstalledTemplateItem[] {
    const singletonIds = new Set<string>();
    const menu = this.getActiveMenu();
    const hero = this.getActiveHero();
    const footer = this.getActiveFooter();
    if (menu) singletonIds.add(menu.id);
    if (hero) singletonIds.add(hero.id);
    if (footer) singletonIds.add(footer.id);

    return this.installedTemplates.filter(t => 
      !singletonIds.has(t.id) &&
      t.category !== 'menu' &&
      t.category !== 'hero' &&
      t.category !== 'footer'
    );
  }

  getActiveFooter(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'footer' && this.activeFooterId === t.id) ||
           this.installedTemplates.find(t => t.category === 'footer');
  }

  getActiveEcommerce(): InstalledTemplateItem | undefined {
    return this.installedTemplates.find(t => t.category === 'ecommerce' && this.activeEcommerceId === t.id) ||
           this.installedTemplates.find(t => t.category === 'ecommerce');
  }

  /**
   * Calculates the total count of configured active layers in the website layout pipeline.
   * @returns Number of active slots out of the 5 architectural layers (Menu, Hero, Body, Footer, Storefront).
   */
  getBlueprintFilledCount(): number {
    let count = 0;
    if (this.getActiveMenu()) count++;
    if (this.getActiveHero()) count++;
    if (this.getActiveBody()) count++;
    if (this.getActiveFooter()) count++;
    if (this.getActiveEcommerce()) count++;
    return count;
  }

  isSingletonCategory(cat: string): boolean {
    return this.singletonCategories.includes(cat);
  }

  getSingletonLabel(cat: string): string {
    if (cat === 'menu') return 'Navbar';
    if (cat === 'hero') return 'Hero Section';
    if (cat === 'footer') return 'Footer';
    if (cat === 'blog') return 'Blog Layout';
    if (cat === 'breadcrumb') return 'Breadcrumb Header';
    if (cat === 'ecommerce') return 'Storefront Theme';
    return 'Template';
  }

  isActiveMenu(item: InstalledTemplateItem): boolean {
    return item.category === 'menu' && this.activeMenuId === item.id;
  }

  isActiveHero(item: InstalledTemplateItem): boolean {
    return item.category === 'hero' && this.activeHeroId === item.id;
  }

  isActiveFooter(item: InstalledTemplateItem): boolean {
    return item.category === 'footer' && this.activeFooterId === item.id;
  }

  isActiveBlog(item: InstalledTemplateItem): boolean {
    return item.category === 'blog' && this.activeBlogId === item.id;
  }

  isActiveBreadcrumb(item: InstalledTemplateItem): boolean {
    return item.category === 'breadcrumb' && this.activeBreadcrumbId === item.id;
  }

  isActiveEcommerce(item: InstalledTemplateItem): boolean {
    return item.category === 'ecommerce' && this.activeEcommerceId === item.id;
  }

  isActiveSingleton(item: InstalledTemplateItem): boolean {
    return this.isActiveMenu(item) || this.isActiveHero(item) || this.isActiveFooter(item) || this.isActiveBlog(item) || this.isActiveBreadcrumb(item) || this.isActiveEcommerce(item);
  }

  activateTemplate(item: InstalledTemplateItem): void {
    if (item.category === 'menu') { this.activeMenuId = item.id; localStorage.setItem('oz_active_menu_id', item.id); }
    if (item.category === 'hero') { this.activeHeroId = item.id; localStorage.setItem('oz_active_hero_id', item.id); }
    if (item.category === 'footer') { this.activeFooterId = item.id; localStorage.setItem('oz_active_footer_id', item.id); }
    if (item.category === 'blog') { this.activeBlogId = item.id; localStorage.setItem('oz_active_blog_id', item.id); }
    if (item.category === 'breadcrumb') { this.activeBreadcrumbId = item.id; localStorage.setItem('oz_active_breadcrumb_id', item.id); }
    if (item.category === 'ecommerce') { this.activeEcommerceId = item.id; localStorage.setItem('oz_active_ecommerce_id', item.id); }

    if (item.dbId) {
      this.api.post<any>(`ContentApi/templates/${item.dbId}/set-active`, {}).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    this.applyFilters();
    this.toast.success(`'${item.name}' is now your active website ${this.getSingletonLabel(item.category).toLowerCase()}!`);
  }

  /**
   * Retrieves all unique Theme Suites discovered from installed templates with item counts.
   * Enables dynamic, multi-theme filtering without hardcoded theme chips.
   * @returns Array of unique theme suite descriptors.
   */
  getAvailableSuites(): { code: string; name: string; count: number }[] {
    const map = new Map<string, { code: string; name: string; count: number }>();
    this.installedTemplates.forEach(t => {
      const code = t.groupCode || 'apex-corporate';
      const name = t.groupName || 'Corporate Suite';
      if (!map.has(code)) {
        map.set(code, { code, name, count: 0 });
      }
      map.get(code)!.count++;
    });
    return Array.from(map.values());
  }

  /**
   * Adopts and activates all companion layout templates (Navbar, Hero, Footer, Blog, etc.) for a specified Theme Suite.
   * This provides the turnkey 1-click theme experience while preserving mix-and-match capabilities.
   * @param groupCode The unique code of the theme suite to adopt.
   */
  adoptSuite(groupCode: string): void {
    const suiteItems = this.installedTemplates.filter(t => (t.groupCode || 'apex-corporate') === groupCode);
    if (!suiteItems.length) return;

    let activatedCount = 0;
    suiteItems.forEach(item => {
      if (this.singletonCategories.includes(item.category)) {
        this.activateTemplate(item);
        activatedCount++;
      }
    });

    const suiteName = suiteItems[0]?.groupName || 'Selected Suite';
    this.toast.success(`Adopted ${suiteName}: ${activatedCount} core components activated across your website blueprint.`);
  }

  applyFilters(): void {
    let list = [...this.installedTemplates];
    if (this.selectedCategory !== 'all') {
      list = list.filter(t => t.category === this.selectedCategory);
    }
    if (this.selectedGroup !== 'all') {
      list = list.filter(t => (t.groupCode || 'apex-corporate') === this.selectedGroup);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.variantCode.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.groupName && t.groupName.toLowerCase().includes(q))
      );
    }
    this.filteredTemplates = list;
  }

  setCategory(catId: string): void {
    this.selectedCategory = catId;
    this.applyFilters();
  }

  getCategoryCount(catId: string): number {
    return this.installedTemplates.filter(t => t.category === catId).length;
  }

  getCategoryName(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.name : catId;
  }

  getCategoryIcon(catId: string): string {
    const found = this.categories.find(c => c.id === catId);
    return found ? found.icon : 'widgets';
  }

  // Single Preview Modal
  openSinglePreviewModal(item: InstalledTemplateItem): void {
    this.activePreviewItem = item;
    this.previewViewport = 'desktop';
    this.previewModalTab = 'preview';

    // Populate initial sample content from template's unique DefaultContentJson if available
    let hydratedFromBlueprint = false;
    if (item.defaultContentJson) {
      try {
        const parsed = JSON.parse(item.defaultContentJson);
        if (parsed && typeof parsed === 'object') {
          if (parsed.title) this.previewContent.title = parsed.title;
          if (parsed.miniTitle) this.previewContent.miniTitle = parsed.miniTitle;
          if (parsed.description) this.previewContent.description = parsed.description;
          if (parsed.imageUrl) this.previewContent.imageUrl = parsed.imageUrl;
          if (parsed.buttonText) this.previewContent.buttonText = parsed.buttonText;
          if (parsed.buttonLink) this.previewContent.buttonLink = parsed.buttonLink;
          if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
            this.previewContent.items = parsed.items;
          }
          hydratedFromBlueprint = true;
        }
      } catch (e) {}
    }

    if (item.category === 'hero') {
      let defaultHeroData: any = null;
      if (item.defaultContentJson) {
        try {
          defaultHeroData = JSON.parse(item.defaultContentJson);
        } catch (e) {}
      }
      this.previewHeroContent = {
        title: defaultHeroData?.title || defaultHeroData?.Title || item.previewTitle || item.name || 'Innovating the Future of Community Empowerment',
        miniTitle: defaultHeroData?.miniTitle || defaultHeroData?.MiniTitle || defaultHeroData?.badgeText || item.previewSubtitle || 'OFFICIAL PORTAL',
        text: defaultHeroData?.text || defaultHeroData?.Text || defaultHeroData?.description || item.previewBody || item.description || 'Empower your institution with resilient cloud infrastructure, automated governance, secure e-voting, and real-time operational telemetry in one unified workspace.',
        buttonText: defaultHeroData?.buttonText || defaultHeroData?.ButtonText || 'Explore Solutions',
        buttonLink: defaultHeroData?.buttonLink || defaultHeroData?.ButtonLink || '/services',
        videoButtonText: defaultHeroData?.videoButtonText || defaultHeroData?.VideoButtonText || '',
        videoLink: defaultHeroData?.videoLink || defaultHeroData?.VideoLink || '',
        url: defaultHeroData?.url || defaultHeroData?.Url || defaultHeroData?.imageUrl || defaultHeroData?.ImageUrl || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        secondUrl: defaultHeroData?.secondUrl || defaultHeroData?.SecondUrl || '',
        youtubeVideo: defaultHeroData?.youtubeVideo || defaultHeroData?.YoutubeVideo || ''
      };
    }

    if (item.category === 'footer') {
      let defaultFooterData: any = null;
      if (item.defaultContentJson) {
        try {
          defaultFooterData = JSON.parse(item.defaultContentJson);
        } catch(e) {}
      }
      this.previewFooterContent = {
        brandName: defaultFooterData?.brandName || this.currentTenantBrandName || 'Organization Portal',
        description: defaultFooterData?.description || item.description || 'Empowering modern organizations with strategic solutions.',
        email: defaultFooterData?.email || 'contact@organization.com',
        phone: defaultFooterData?.phone || '+1 (555) 019-2834',
        categories: (defaultFooterData?.categories && Array.isArray(defaultFooterData.categories)) ? defaultFooterData.categories : [
          {
            name: 'Services',
            displayTitle: 'Solutions',
            pages: [
              { title: 'Strategic Consulting', url: '/strategic-advisory' },
              { title: 'Systems Modernization', url: '/systems-modernization' },
              { title: 'Performance & Scale', url: '/performance-scale' },
              { title: 'Enterprise Advisory', url: '/enterprise-governance' }
            ]
          },
          {
            name: 'Company',
            displayTitle: 'Company',
            pages: [
              { title: 'About Us', url: '/about' },
              { title: 'Request a Service', url: '/request-service' },
              { title: 'Contact Us', url: '/contact' }
            ]
          }
        ],
        legalPages: (defaultFooterData?.legalPages && Array.isArray(defaultFooterData.legalPages)) ? defaultFooterData.legalPages : [
          { title: 'Privacy Policy', url: '/privacy-policy' },
          { title: 'Terms & Conditions', url: '/terms-and-conditions' },
          { title: 'Cookie Policy', url: '/cookie-policy' }
        ]
      };
    }

    if (item.category === 'menu') {
      const brand = this.editorTokens?.brand;
      this.previewMenuContent = {
        brandName: brand?.name || this.currentTenantBrandName || 'Acme Global',
        logoUrl: brand?.logoUrl || '',
        topMenuItems: (this.editorTokens?.topMenuItems && this.editorTokens.topMenuItems.length > 0)
          ? JSON.parse(JSON.stringify(this.editorTokens.topMenuItems))
          : [
              { title: 'Home', url: '/' },
              { title: 'About Us', url: '/about' },
              { title: 'Blog', url: '/blog' },
              { title: 'Contact', url: '/contact' }
            ],
        dropdowns: (this.editorTokens?.menuDropdowns && this.editorTokens.menuDropdowns.length > 0)
          ? JSON.parse(JSON.stringify(this.editorTokens.menuDropdowns))
          : [
              {
                title: 'Services',
                pages: [
                  { title: 'Commercial Cleaning', url: '/services/commercial-cleaning' },
                  { title: 'Residential Cleaning', url: '/services/residential-cleaning' },
                  { title: 'Deep Sanitization', url: '/services/deep-sanitization' }
                ]
              },
              {
                title: 'Company',
                pages: [
                  { title: 'About Us', url: '/about' },
                  { title: 'Request a Service', url: '/request-service' },
                  { title: 'Contact Us', url: '/contact' }
                ]
              }
            ],
        menuCtaButtons: (this.editorTokens?.menuCtaButtons && this.editorTokens.menuCtaButtons.length > 0)
          ? JSON.parse(JSON.stringify(this.editorTokens.menuCtaButtons)).map((b: any) => ({ title: b.title, url: b.url }))
          : [
              { title: 'Sign In', url: '/login' },
              { title: 'Request a Service', url: '/request-service' }
            ]
      };
    }

    if (!hydratedFromBlueprint) {
      if (item.previewTitle) this.previewContent.title = item.previewTitle;
      else if (item.name) this.previewContent.title = item.name;

      if (item.previewBody) this.previewContent.description = item.previewBody;
      else if (item.description) this.previewContent.description = item.description;

      if (item.previewSubtitle) this.previewContent.miniTitle = item.previewSubtitle.toUpperCase();
    }

    this.previewModalTab = 'preview';
    this.disposeMonacoEditors();
    this.modalPreviewPageSlug = 'isolated';
    this.updateSinglePreviewHtml();
    this.showSinglePreviewModal = true;
  }

  /**
   * Sets the active page preview simulation inside the Single Preview Modal for Menu components.
   * @param slug Target page slug or 'isolated' for standalone navigation bar.
   */
  setModalPreviewPage(slug: 'isolated' | 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog'): void {
    this.modalPreviewPageSlug = slug;
    this.updateSinglePreviewHtml();
  }

  updateSinglePreviewHtml(): void {
    if (!this.activePreviewItem) return;

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    if (this.activePreviewItem.category === 'menu' && this.modalPreviewPageSlug !== 'isolated') {
      const dataContext = { ...this.previewContent, ...this.previewMenuContent };
      const sim = this.composePageSimulation(this.modalPreviewPageSlug, this.activePreviewItem, dataContext);
      combinedStyles = sim.combinedStyles;
      combinedHtml = sim.combinedHtml;
      combinedJs = sim.combinedJs;
    } else {
      const dataContext = (this.activePreviewItem.category === 'footer')
        ? { ...this.previewContent, ...this.previewFooterContent }
        : (this.activePreviewItem.category === 'menu')
        ? { ...this.previewContent, ...this.previewMenuContent }
        : (this.activePreviewItem.category === 'blog')
        ? (this.isBlogDetailTemplate()
            ? { ...this.previewContent, ...this.previewBlogDetailContent, article: this.previewBlogDetailContent }
            : { ...this.previewContent, ...this.previewBlogContent, articles: this.previewBlogContent.articles })
        : this.previewContent;
      let hydrated = this.hydrateTemplate(this.activePreviewItem.htmlTemplate, dataContext);
      if (this.activePreviewItem.category === 'footer') {
        hydrated = this.enforceOzikolCredit(hydrated);
      }
      combinedStyles = this.activePreviewItem.cssStyles || '';
      combinedHtml = hydrated;
      combinedJs = this.activePreviewItem.jsScript || '';
    }

    const combined = `<style>${combinedStyles}</style>\n${combinedHtml}`;
    this.safeSinglePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(combined);

    const singleIframeDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .dropdown {
      position: relative !important;
    }
    .dropdown-menu.show {
      display: block !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      z-index: 9999 !important;
      min-width: 13rem !important;
      margin-top: 4px !important;
      opacity: 1 !important;
      visibility: visible !important;
      background-color: #ffffff !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
    }
    .dropdown-item {
      cursor: pointer;
    }
    ${combinedStyles}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('click', function(e) {
      // 1. Dropdown Toggle Click Handler
      var dropdownToggle = e.target.closest('.dropdown-toggle, [data-bs-toggle="dropdown"]');
      if (dropdownToggle) {
        e.preventDefault();
        e.stopPropagation();
        var parentDropdown = dropdownToggle.closest('.dropdown');
        var menu = parentDropdown ? parentDropdown.querySelector('.dropdown-menu') : null;
        if (menu) {
          var isAlreadyOpen = menu.classList.contains('show');
          // Close any open dropdowns first
          document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
            m.classList.remove('show');
            m.removeAttribute('data-bs-popper');
          });
          document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
            t.setAttribute('aria-expanded', 'false');
          });
          if (!isAlreadyOpen) {
            menu.classList.add('show');
            menu.setAttribute('data-bs-popper', 'static');
            dropdownToggle.setAttribute('aria-expanded', 'true');
          }
        }
        return;
      }

      // 2. Click Outside Closes Dropdown
      if (!e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
          m.classList.remove('show');
          m.removeAttribute('data-bs-popper');
        });
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
          t.setAttribute('aria-expanded', 'false');
        });
      }

      // 3. Regular Navigation Links
      var a = e.target.closest('a');
      if (a) {
        var href = (a.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.startsWith('javascript:')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        window.parent.postMessage({ type: 'DEMO_NAV', href: href, text: a.textContent || '' }, '*');
        return;
      }

      // 4. Cart / Add Buttons
      var btn = e.target.closest('button, .btn');
      if (btn) {
        var txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('cart') || txt.includes('add')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'DEMO_CART' }, '*');
        }
      }
    });
  <\/script>
</head>
<body>
  ${combinedHtml}
  ${combinedJs ? `\n  <script>\n    ${combinedJs}\n  <\/script>` : ''}
</body>
</html>`;
    this.safeSinglePreviewSrcDoc = this.sanitizer.bypassSecurityTrustHtml(singleIframeDoc);
  }

  onPreviewContentChange(): void {
    this.updateSinglePreviewHtml();
  }

  /**
   * Checks whether the current or specified template is a single article blog detail view (e.g. Blog_ArticleDetail).
   * @param item Optional template item to test; defaults to activePreviewItem.
   * @returns True if the template represents a single article detail layout.
   */
  isBlogDetailTemplate(item?: InstalledTemplateItem | null): boolean {
    const target = item || this.activePreviewItem;
    if (!target) return false;
    const v = (target.variantCode || target.id || '').toLowerCase();
    const name = (target.name || '').toLowerCase();
    return v.includes('detail') || v.includes('single') || name.includes('detail') || name.includes('single');
  }

  /**
   * Handles comma-separated tags input change in the Article Detail sample content editor.
   */
  onBlogDetailTagsChange(): void {
    if (this.previewBlogDetailContent.tagsInput) {
      this.previewBlogDetailContent.tags = this.previewBlogDetailContent.tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    } else {
      this.previewBlogDetailContent.tags = [];
    }
    this.onPreviewContentChange();
  }

  addPreviewSubItem(): void {
    const nextIdx = this.previewContent.items.length + 1;
    this.previewContent.items.push({
      title: `Feature Pillar ${nextIdx}`,
      description: 'Comprehensive capability designed to streamline leadership operations.'
    });
    this.onPreviewContentChange();
    this.toast.success(`Added Card #${nextIdx} to preview list.`);
  }

  removePreviewSubItem(index: number): void {
    if (this.previewContent.items.length <= 1) {
      this.toast.warning('At least one item is recommended for loop preview.');
      return;
    }
    this.previewContent.items.splice(index, 1);
    this.onPreviewContentChange();
  }

  // Footer Category Column Actions
  addFooterCategory(): void {
    const nextIdx = this.previewFooterContent.categories.length + 1;
    this.previewFooterContent.categories.push({
      name: `Category ${nextIdx}`,
      displayTitle: `Column ${nextIdx}`,
      pages: [
        { title: `Link ${nextIdx}.1`, url: '#' }
      ]
    });
    this.onPreviewContentChange();
  }

  removeFooterCategory(index: number): void {
    if (this.previewFooterContent.categories.length <= 1) {
      this.toast.warning('Keep at least one category column for the footer preview.');
      return;
    }
    this.previewFooterContent.categories.splice(index, 1);
    this.onPreviewContentChange();
  }

  addFooterCategoryPage(catIndex: number): void {
    const cat = this.previewFooterContent.categories[catIndex];
    if (!cat) return;
    const nextIdx = cat.pages.length + 1;
    cat.pages.push({
      title: `New Link ${nextIdx}`,
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeFooterCategoryPage(catIndex: number, pageIndex: number): void {
    const cat = this.previewFooterContent.categories[catIndex];
    if (!cat) return;
    if (cat.pages.length <= 1) {
      this.toast.warning('Keep at least one link in this column.');
      return;
    }
    cat.pages.splice(pageIndex, 1);
    this.onPreviewContentChange();
  }

  addFooterLegalPage(): void {
    const nextIdx = this.previewFooterContent.legalPages.length + 1;
    this.previewFooterContent.legalPages.push({
      title: `Policy ${nextIdx}`,
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeFooterLegalPage(index: number): void {
    if (this.previewFooterContent.legalPages.length <= 1) {
      this.toast.warning('Keep at least one legal policy link.');
      return;
    }
    this.previewFooterContent.legalPages.splice(index, 1);
    this.onPreviewContentChange();
  }

  addTopMenuItem(): void {
    const nextIdx = this.previewMenuContent.topMenuItems.length + 1;
    this.previewMenuContent.topMenuItems.push({
      title: `Navigation Link ${nextIdx}`,
      url: `/page-${nextIdx}`
    });
    this.onPreviewContentChange();
  }

  removeTopMenuItem(index: number): void {
    if (this.previewMenuContent.topMenuItems.length <= 1) {
      this.toast.warning('Keep at least one navigation link.');
      return;
    }
    this.previewMenuContent.topMenuItems.splice(index, 1);
    this.onPreviewContentChange();
  }

  addMenuCtaButton(): void {
    const nextIdx = this.previewMenuContent.menuCtaButtons.length + 1;
    this.previewMenuContent.menuCtaButtons.push({
      title: `Action CTA ${nextIdx}`,
      url: `/action-${nextIdx}`
    });
    this.onPreviewContentChange();
  }

  removeMenuCtaButton(index: number): void {
    if (this.previewMenuContent.menuCtaButtons.length <= 1) {
      this.toast.warning('Keep at least one CTA button.');
      return;
    }
    this.previewMenuContent.menuCtaButtons.splice(index, 1);
    this.onPreviewContentChange();
  }

  // Menu Dropdown Menus Actions
  addMenuDropdown(): void {
    const nextIdx = (this.previewMenuContent.dropdowns?.length || 0) + 1;
    if (!this.previewMenuContent.dropdowns) this.previewMenuContent.dropdowns = [];
    this.previewMenuContent.dropdowns.push({
      title: `Dropdown Menu ${nextIdx}`,
      pages: [
        { title: `Child Link ${nextIdx}.1`, url: '#' },
        { title: `Child Link ${nextIdx}.2`, url: '#' }
      ]
    });
    this.onPreviewContentChange();
    this.toast.success(`Added Dropdown #${nextIdx}`);
  }

  removeMenuDropdown(index: number): void {
    if (this.previewMenuContent.dropdowns?.length <= 1) {
      this.toast.warning('Keep at least one dropdown menu for preview.');
      return;
    }
    this.previewMenuContent.dropdowns.splice(index, 1);
    this.onPreviewContentChange();
  }

  addMenuDropdownPage(ddIndex: number): void {
    const dd = this.previewMenuContent.dropdowns?.[ddIndex];
    if (!dd) return;
    const nextIdx = dd.pages.length + 1;
    dd.pages.push({
      title: `Sub-Link ${nextIdx}`,
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeMenuDropdownPage(ddIndex: number, pageIndex: number): void {
    const dd = this.previewMenuContent.dropdowns?.[ddIndex];
    if (!dd) return;
    if (dd.pages.length <= 1) {
      this.toast.warning('Keep at least one sub-link in this dropdown.');
      return;
    }
    dd.pages.splice(pageIndex, 1);
    this.onPreviewContentChange();
  }

  // Live Token Fetching
  loadEditorTokens(): void {
    this.api.get<any>('ContentApi/templates/editor-tokens').subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.editorTokens = res.data;
          if (res.data.brand?.name) {
            this.currentTenantBrandName = res.data.brand.name;
          }
        }
      },
      error: (err) => console.warn('Could not load editor tokens:', err)
    });
  }

  /**
   * Switches the active preview modal tab, releasing orphaned Monaco Editor instances as needed
   * and initializing fresh editors when navigating to code tabs.
   * Disposing instances when switching away prevents Angular's *ngIf from leaving stale DOM bindings.
   * @param tab The selected preview modal tab.
   */
  setPreviewModalTab(tab: 'preview' | 'content' | 'html' | 'css' | 'js'): void {
    // Dispose orphaned Monaco editor instances when switching away from code tabs
    if (this.previewModalTab === 'html' && tab !== 'html') {
      if (this.monacoInstanceHtml) {
        this.monacoInstanceHtml.dispose();
        this.monacoInstanceHtml = null;
      }
    }
    if (this.previewModalTab === 'css' && tab !== 'css') {
      if (this.monacoInstanceCss) {
        this.monacoInstanceCss.dispose();
        this.monacoInstanceCss = null;
      }
    }
    if (this.previewModalTab === 'js' && tab !== 'js') {
      if (this.monacoInstanceJs) {
        this.monacoInstanceJs.dispose();
        this.monacoInstanceJs = null;
      }
    }

    this.previewModalTab = tab;
    if (tab === 'html') {
      this.initMonacoHtmlEditor();
    } else if (tab === 'css') {
      this.initMonacoCssEditor();
    } else if (tab === 'js') {
      this.initMonacoJsEditor();
    }
  }

  /**
   * Registers custom Monarch syntax tokenization rules and theme styling for Monaco Editor.
   * Deliberately differentiates:
   * 1. HTML Tags / Divs in vibrant Electric Cyan (#38bdf8, bold)
   * Dynamically loads the Monaco Editor AMD loader script via MonacoLoaderService.
   * @returns A promise resolving to the global monaco object.
   */
  loadMonaco(): Promise<any> {
    return this.monacoLoader.loadMonaco();
  }

  /**
   * Initializes or updates the Monaco Editor instance for editing HTML templates with code folding.
   */
  initMonacoHtmlEditor(): void {
    if (!this.activePreviewItem) return;
    this.loadingMonaco = !this.monacoReady;

    setTimeout(() => {
      const container = this.monacoHtmlContainer?.nativeElement;
      if (!container || !container.isConnected) return;

      this.loadMonaco().then((monaco) => {
        this.loadingMonaco = false;
        this.monacoReady = true;

        if (this.monacoInstanceHtml) {
          const domNode = this.monacoInstanceHtml.getDomNode?.();
          if (!domNode || !domNode.isConnected || domNode.parentElement !== container) {
            this.monacoInstanceHtml.dispose();
            this.monacoInstanceHtml = null;
          } else {
            const currentVal = this.monacoInstanceHtml.getValue();
            const targetVal = this.activePreviewItem?.htmlTemplate || '';
            if (currentVal !== targetVal) {
              this.monacoInstanceHtml.setValue(targetVal);
            }
            this.monacoInstanceHtml.layout();
            return;
          }
        }

        this.monacoInstanceHtml = monaco.editor.create(container, {
          value: this.activePreviewItem?.htmlTemplate || '',
          language: 'html',
          theme: 'ozikol-studio-dark',
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          matchBrackets: 'always',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          renderWhitespace: 'selection',
          tabSize: 2
        });

        this.monacoInstanceHtml.onDidChangeModelContent(() => {
          const val = this.monacoInstanceHtml.getValue();
          if (this.activePreviewItem && this.activePreviewItem.htmlTemplate !== val) {
            this.activePreviewItem.htmlTemplate = val;
            this.onModalHtmlChange();
          }
        });
      }).catch((err) => {
        console.warn('Monaco failed to load from CDN, falling back to textarea editor:', err);
        this.loadingMonaco = false;
        this.monacoReady = false;
      });
    }, 60);
  }

  /**
   * Initializes or updates the Monaco Editor instance for inspecting scoped CSS with code folding.
   */
  initMonacoCssEditor(): void {
    if (!this.activePreviewItem) return;
    setTimeout(() => {
      const container = this.monacoCssContainer?.nativeElement;
      if (!container || !container.isConnected) return;

      this.loadMonaco().then((monaco) => {
        this.monacoReady = true;
        if (this.monacoInstanceCss) {
          const domNode = this.monacoInstanceCss.getDomNode?.();
          if (!domNode || !domNode.isConnected || domNode.parentElement !== container) {
            this.monacoInstanceCss.dispose();
            this.monacoInstanceCss = null;
          } else {
            this.monacoInstanceCss.setValue(this.activePreviewItem?.cssStyles || '');
            this.monacoInstanceCss.layout();
            return;
          }
        }

        this.monacoInstanceCss = monaco.editor.create(container, {
          value: this.activePreviewItem?.cssStyles || '',
          language: 'css',
          theme: 'ozikol-studio-dark',
          readOnly: false,
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          tabSize: 2
        });

        this.monacoInstanceCss.onDidChangeModelContent(() => {
          const val = this.monacoInstanceCss.getValue();
          if (this.activePreviewItem && this.activePreviewItem.cssStyles !== val) {
            this.activePreviewItem.cssStyles = val;
            this.updateSinglePreviewHtml();
          }
        });
      }).catch((err) => {
        console.warn('Monaco CSS editor load error:', err);
      });
    }, 60);
  }

  /**
   * Initializes or updates the Monaco Editor instance for inspecting JavaScript logic with code folding.
   */
  initMonacoJsEditor(): void {
    if (!this.activePreviewItem || !this.activePreviewItem.jsScript) return;
    setTimeout(() => {
      const container = this.monacoJsContainer?.nativeElement;
      if (!container || !container.isConnected) return;

      this.loadMonaco().then((monaco) => {
        this.monacoReady = true;
        if (this.monacoInstanceJs) {
          const domNode = this.monacoInstanceJs.getDomNode?.();
          if (!domNode || !domNode.isConnected || domNode.parentElement !== container) {
            this.monacoInstanceJs.dispose();
            this.monacoInstanceJs = null;
          } else {
            this.monacoInstanceJs.setValue(this.activePreviewItem?.jsScript || '');
            this.monacoInstanceJs.layout();
            return;
          }
        }

        this.monacoInstanceJs = monaco.editor.create(container, {
          value: this.activePreviewItem?.jsScript || '',
          language: 'javascript',
          theme: 'ozikol-studio-dark',
          readOnly: false,
          automaticLayout: true,
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          lineNumbers: 'on',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          tabSize: 2
        });

        this.monacoInstanceJs.onDidChangeModelContent(() => {
          const val = this.monacoInstanceJs.getValue();
          if (this.activePreviewItem && this.activePreviewItem.jsScript !== val) {
            this.activePreviewItem.jsScript = val;
            this.updateSinglePreviewHtml();
          }
        });
      }).catch((err) => {
        console.warn('Monaco JS editor load error:', err);
      });
    }, 60);
  }

  /**
   * Disposes of all active Monaco editor instances to release DOM and worker memory.
   */
  disposeMonacoEditors(): void {
    if (this.monacoInstanceHtml) {
      this.monacoInstanceHtml.dispose();
      this.monacoInstanceHtml = null;
    }
    if (this.monacoInstanceCss) {
      this.monacoInstanceCss.dispose();
      this.monacoInstanceCss = null;
    }
    if (this.monacoInstanceJs) {
      this.monacoInstanceJs.dispose();
      this.monacoInstanceJs = null;
    }
  }

  // Modal Code Editor Token Ribbon Insertion
  insertTokenAtModalCursor(token: string): void {
    if (!this.activePreviewItem) return;

    if (this.monacoInstanceHtml) {
      const selection = this.monacoInstanceHtml.getSelection();
      const op = { range: selection, text: token, forceMoveMarkers: true };
      this.monacoInstanceHtml.executeEdits('token-insert', [op]);
      this.monacoInstanceHtml.focus();
      const val = this.monacoInstanceHtml.getValue();
      this.activePreviewItem.htmlTemplate = val;
      this.onModalHtmlChange();
      return;
    }

    const textarea = this.modalHtmlEditorRef?.nativeElement;
    if (!textarea) {
      this.activePreviewItem.htmlTemplate = (this.activePreviewItem.htmlTemplate || '') + token;
      this.onModalHtmlChange();
      return;
    }
    const start = textarea.selectionStart ?? this.activePreviewItem.htmlTemplate.length;
    const end = textarea.selectionEnd ?? start;
    const current = this.activePreviewItem.htmlTemplate || '';
    this.activePreviewItem.htmlTemplate = current.substring(0, start) + token + current.substring(end);
    this.onModalHtmlChange();
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  insertMainMenuItemsLoopAtModalCursor(): void {
    const loopSnippet = `{{#each MainMenuItems}}
<li class="nav-item">
  <a class="nav-link" href="{{ Url }}">{{ Title }}</a>
</li>
{{/each}}`;
    this.insertTokenAtModalCursor(loopSnippet);
  }

  insertMenuDropdownsLoopAtModalCursor(): void {
    const loopSnippet = `{{#each MenuDropdowns}}
<li class="nav-item dropdown">
  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
    {{ Title }}
  </a>
  <ul class="dropdown-menu shadow-sm border-0 py-2">
    {{#each Pages}}
    <li><a class="dropdown-item py-2 px-3 fw-medium" href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</li>
{{/each}}`;
    this.insertTokenAtModalCursor(loopSnippet);
  }

  insertMenuCtaButtonsLoopAtModalCursor(): void {
    const loopSnippet = `{{#each MenuCtaButtons}}
<a href="{{ Url }}" class="btn btn-primary rounded-pill px-3 py-2 fw-semibold shadow-sm">{{ Title }}</a>
{{/each}}`;
    this.insertTokenAtModalCursor(loopSnippet);
  }

  /**
   * Inserts a standardized dual call-to-action button pair (primary button + video popup button) at the active editor cursor.
   */
  insertHeroDualCtaSnippetAtModalCursor(): void {
    const ctaSnippet = `<div class="oz-hero-actions d-flex gap-3 flex-wrap align-items-center">
  <a href="{{ ButtonLink }}" class="btn btn-primary px-4 py-2 rounded-pill fw-bold shadow-sm">{{ ButtonText }}</a>
  <a href="{{ VideoLink }}" class="btn btn-outline-secondary px-4 py-2 rounded-pill fw-bold"><i class="fa-solid fa-play me-1"></i> {{ VideoButtonText }}</a>
</div>`;
    this.insertTokenAtModalCursor(ctaSnippet);
  }

  /**
   * Inserts a self-contained footer column iterating through published pages in a named category.
   * Resolves the first available category name from loaded editor tokens or preview context,
   * defaulting to "Services".
   */
  insertCategoryPagesLoopSnippet(): void {
    let catName = 'Services';
    if (this.editorTokens?.footerGroups && this.editorTokens.footerGroups.length > 0) {
      const first = this.editorTokens.footerGroups[0];
      if (first?.categoryName || first?.title) {
        catName = first.categoryName || first.title || 'Services';
      }
    } else if (this.previewFooterContent?.categories && this.previewFooterContent.categories.length > 0) {
      const first = this.previewFooterContent.categories[0];
      if (first?.name || first?.displayTitle) {
        catName = first.name || first.displayTitle || 'Services';
      }
    }

    const snippet = `<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">${catName}</h4>
  <ul class="oz-footer-col-links">
    {{#each CategoryPages "${catName}"}}
    <li><a href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a self-contained footer column iterating through published pages with a specific tag.
   * Resolves the first active tag from loaded editor tokens if available, defaulting to "quick-links".
   */
  insertTaggedPagesLoopSnippet(): void {
    let tagName = 'quick-links';
    if (this.editorTokens?.taggedPages && this.editorTokens.taggedPages.length > 0) {
      const first = this.editorTokens.taggedPages[0];
      if (first?.tag) {
        tagName = first.tag || 'quick-links';
      }
    }

    const displayTitle = tagName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const snippet = `<div class="oz-footer-col">
  <h4 class="oz-footer-col-title">${displayTitle}</h4>
  <ul class="oz-footer-col-links">
    {{#each TaggedPages "${tagName}"}}
    <li><a href="{{ Url }}">{{ Title }}</a></li>
    {{/each}}
  </ul>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a standardized legal documents loop snippet for compliance links (Privacy, Terms, Cookies).
   */
  insertLegalPagesLoopSnippet(): void {
    const snippet = `<ul class="oz-footer-legal-links">
  {{#each LegalPages}}
  <li><a href="{{ Url }}">{{ Title }}</a></li>
  {{/each}}
</ul>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts an embedded form component snippet for the footer (e.g. newsletter subscribe).
   */
  insertFooterFormSnippet(): void {
    const snippet = `<div class="oz-footer-newsletter">
  <h4 class="oz-footer-col-title">Stay Connected</h4>
  <p class="oz-footer-desc">Subscribe to our newsletter for the latest updates.</p>
  {{ Form "Newsletter_Subscribe" }}
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a standardized, responsive 3-column article showcase loop snippet matching Blog_CardGrid3 markup.
   */
  insertBlogArticlesLoopSnippet(): void {
    const snippet = `<div class="row g-4">
  {{#each Articles}}
    <div class="col-md-4">
      <div class="card border-0 rounded-4 overflow-hidden shadow-sm bg-white h-100 d-flex flex-column">
        <div class="position-relative">
          <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="card-img-top object-fit-cover" style="height: 220px;" />
          <span class="badge bg-white text-dark shadow-sm position-absolute top-0 start-0 m-3 px-3 py-1 rounded-pill small fw-bold">{{ Category }}</span>
        </div>
        <div class="card-body p-4 d-flex flex-column flex-grow-1">
          <span class="text-muted small mb-2 d-block"><i class="fa-regular fa-calendar me-1"></i>{{ PublishedDate }}</span>
          <h5 class="fw-bold text-dark mb-2 line-clamp-2">{{ Title }}</h5>
          <p class="text-muted small mb-4 line-clamp-3">{{ Excerpt }}</p>
          <div class="mt-auto">
            <a href="{{ Url }}" class="text-primary fw-bold small text-decoration-none d-inline-flex align-items-center gap-1">
              <span>Read Article</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  {{/each}}
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a compact recent dispatches loop snippet for article sidebars.
   */
  insertBlogRecentSidebarSnippet(): void {
    const snippet = `<div class="card border border-light-subtle rounded-4 p-4 shadow-sm bg-white">
  <h6 class="fw-bold text-dark mb-3">Recent Dispatches</h6>
  <div class="d-flex flex-column gap-3">
    {{#each RecentArticles}}
      <div class="d-flex gap-3 align-items-center">
        <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="rounded-3 object-fit-cover flex-shrink-0" style="width: 60px; height: 60px;" />
        <div>
          <small class="text-muted d-block" style="font-size: 11px;">{{ PublishedDate }}</small>
          <a href="{{ Url }}" class="fw-bold text-dark small text-decoration-none line-clamp-2">{{ Title }}</a>
        </div>
      </div>
    {{/each}}
  </div>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a categorized topics and taxonomy list loop with live post counts.
   */
  insertBlogCategoriesSnippet(): void {
    const snippet = `<div class="card border border-light-subtle rounded-4 p-4 shadow-sm bg-white">
  <h6 class="fw-bold text-dark mb-3">Topics & Categories</h6>
  <ul class="list-unstyled mb-0 d-flex flex-column gap-2 small">
    {{#each BlogCategories}}
      <li class="d-flex justify-content-between align-items-center">
        <a href="{{ Url }}" class="text-decoration-none text-secondary">{{ Name }}</a>
        <span class="badge bg-light text-muted border">{{ PostCount }}</span>
      </li>
    {{/each}}
  </ul>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts an author biography card snippet with portrait avatar, name, and background summary.
   */
  insertBlogAuthorBioSnippet(): void {
    const snippet = `<div class="card border-0 bg-light rounded-4 p-4 d-flex flex-row gap-3 align-items-center">
  <img src="{{ Article.AuthorAvatarUrl }}" alt="{{ Article.AuthorName }}" class="rounded-circle object-fit-cover" style="width: 64px; height: 64px;" />
  <div>
    <h6 class="fw-bold text-dark mb-1">Written by {{ Article.AuthorName }}</h6>
    <p class="text-muted small mb-0">{{ Article.AuthorBio }}</p>
  </div>
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts an article tags loop snippet.
   */
  insertBlogTagsLoopSnippet(): void {
    const snippet = `<div class="d-flex align-items-center gap-2">
  <span class="fw-bold text-dark small">Tagged:</span>
  {{#each Article.Tags}}
    <span class="badge bg-light text-dark border">{{ this }}</span>
  {{/each}}
</div>`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Inserts a dynamic social share strip conditional block matching the MIS / Blog Settings configuration.
   */
  insertBlogSocialShareStripSnippet(): void {
    const snippet = `{{#if EnableSharePost}}
  <div class="d-flex align-items-center gap-2">
    <span class="small text-muted fw-semibold">Share:</span>
    {{#each SocialShareLinks}}
      <a href="{{ ShareUrl }}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-light border rounded-circle" title="Share on {{ Platform }}">
        <i class="{{ IconClass }}"></i>
      </a>
    {{/each}}
  </div>
{{/if}}`;
    this.insertTokenAtModalCursor(snippet);
  }

  /**
   * Replaces a balanced Handlebars block {{#each BlockName}}...{{/each}}, properly
   * tracking depth to prevent premature truncation when nested {{#each ...}} loops exist.
   * @param template The raw HTML template string.
   * @param blockName The target block name (e.g. 'MenuDropdowns').
   * @param replacer Callback receiving the true balanced inner template string.
   * @returns The transformed HTML string.
   */
  replaceBalancedBlock(template: string, blockName: string, replacer: (inner: string) => string): string {
    return this.hydrationService.replaceBalancedBlock(template, blockName, replacer);
  }

  showTokenDocModal(tKey: string, event: MouseEvent): void {
    this.cancelPopoverLeaveTimer();
    const doc = this.tokenDocMap[tKey];
    if (!doc) return;
    this.activeTokenDoc = doc;

    const target = event.currentTarget as HTMLElement;
    if (target && target.getBoundingClientRect) {
      const rect = target.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left;

      const popoverWidth = 360;
      if (left + popoverWidth > window.innerWidth - 20) {
        left = window.innerWidth - popoverWidth - 20;
      }
      if (left < 20) left = 20;

      this.popoverTop = top;
      this.popoverLeft = left;
    }
  }

  hideTokenDocModal(): void {
    this.cancelPopoverLeaveTimer();
    this.popoverLeaveTimer = setTimeout(() => {
      this.closeTokenDoc();
    }, 280);
  }

  toggleTokenDocModal(tKey: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeTokenDoc && this.activeTokenDoc.token.includes(tKey)) {
      this.closeTokenDoc();
    } else {
      this.showTokenDocModal(tKey, event);
    }
  }

  closeTokenDoc(): void {
    this.activeTokenDoc = null;
    this.cancelPopoverLeaveTimer();
  }

  cancelPopoverLeaveTimer(): void {
    if (this.popoverLeaveTimer) {
      clearTimeout(this.popoverLeaveTimer);
      this.popoverLeaveTimer = null;
    }
  }

  onModalHtmlChange(): void {
    this.updateSinglePreviewHtml();
  }

  saveTemplateHtml(): void {
    if (!this.activePreviewItem) return;
    this.savingTemplateHtml = true;

    const payload = {
      name: this.activePreviewItem.name,
      categoryKey: this.activePreviewItem.category,
      variantCode: this.activePreviewItem.variantCode,
      templateKey: this.activePreviewItem.id || this.activePreviewItem.variantCode,
      htmlTemplate: this.activePreviewItem.htmlTemplate,
      cssStyles: this.activePreviewItem.cssStyles,
      jsScript: this.activePreviewItem.jsScript,
      defaultContentJson: this.activePreviewItem.defaultContentJson,
      installedVersion: this.activePreviewItem.version || '1.0.0'
    };

    this.api.post<any>('ContentApi/templates/custom', payload).subscribe({
      next: (_res: any) => {
        this.savingTemplateHtml = false;
        this.activePreviewItem!.isCustomized = true;
        this.toast.success(`Template '${this.activePreviewItem!.name}' changes saved successfully!`);
        this.updateSinglePreviewHtml();
      },
      error: (err: any) => {
        this.savingTemplateHtml = false;
        const errMsg = err?.error?.message || 'Failed to save template changes.';
        this.toast.error(errMsg);
      }
    });
  }

  addBlogArticle(): void {
    const nextIdx = this.previewBlogContent.articles.length + 1;
    this.previewBlogContent.articles.push({
      title: `Enterprise Case Study #${nextIdx}`,
      summary: 'Comprehensive analysis on infrastructure modernization and real-time transaction processing.',
      excerpt: 'Comprehensive analysis on infrastructure modernization and real-time transaction processing.',
      coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      category: 'Case Studies',
      authorName: 'Alex Rivera',
      authorRole: 'Chief Architect',
      publishedDate: 'Sep 2026',
      url: '#'
    });
    this.onPreviewContentChange();
  }

  removeBlogArticle(index: number): void {
    if (this.previewBlogContent.articles.length <= 1) {
      this.toast.warning('Keep at least one article.');
      return;
    }
    this.previewBlogContent.articles.splice(index, 1);
    this.onPreviewContentChange();
  }

  addBlogRecentArticle(): void {
    const nextIdx = this.previewBlogDetailContent.recentArticles.length + 1;
    this.previewBlogDetailContent.recentArticles.push({
      title: `Strategic Field Dispatch #${nextIdx}`,
      publishedDate: 'Recently Published',
      coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80',
      url: `/blog/dispatch-${nextIdx}`
    });
    this.onPreviewContentChange();
  }

  removeBlogRecentArticle(index: number): void {
    if (this.previewBlogDetailContent.recentArticles.length <= 1) {
      this.toast.warning('At least 1 recent article is required for sidebar preview.');
      return;
    }
    this.previewBlogDetailContent.recentArticles.splice(index, 1);
    this.onPreviewContentChange();
  }

  addBlogCategoryItem(): void {
    const nextIdx = this.previewBlogDetailContent.categories.length + 1;
    this.previewBlogDetailContent.categories.push({
      name: `Specialty Topic ${nextIdx}`,
      postCount: 3,
      url: `/blog?category=topic-${nextIdx}`
    });
    this.onPreviewContentChange();
  }

  removeBlogCategoryItem(index: number): void {
    if (this.previewBlogDetailContent.categories.length <= 1) {
      this.toast.warning('At least 1 category is required for sidebar preview.');
      return;
    }
    this.previewBlogDetailContent.categories.splice(index, 1);
    this.onPreviewContentChange();
  }

  resetPreviewContent(): void {
    if (this.activePreviewItem?.category === 'blog') {
      if (this.isBlogDetailTemplate()) {
        this.previewBlogDetailContent = {
          title: 'Accelerating Enterprise Scalability with Hybrid Cloud Architecture',
          category: 'Technology & Cloud',
          publishedDate: 'September 14, 2026',
          readTime: '5 min read',
          coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
          body: `<p class="lead">In an era of relentless digital expansion, organizations are increasingly challenged to balance agility, resilience, and operational security.</p>
<p>Legacy architectures, once the bedrock of institutional workflows, now struggle to sustain the real-time processing demands of globally distributed systems. By transitioning toward unified hybrid cloud infrastructures, forward-thinking enterprises establish a modular foundation capable of horizontal scaling while preserving strict governance over proprietary data assets.</p>
<h4>Strategic Architectural Foundations</h4>
<p>A resilient multi-region deployment demands three non-negotiable pillars: programmatic infrastructure as code, continuous behavioral telemetries, and automated self-healing orchestration clusters.</p>`,
          tags: ['Cloud Architecture', 'Enterprise Security', 'Scalability', 'Automation'],
          tagsInput: 'Cloud Architecture, Enterprise Security, Scalability, Automation',
          authorName: 'Dr. Jennifer Miller',
          authorRole: 'Principal Cloud Strategist & Enterprise Systems Architect',
          authorBio: 'Principal Cloud Strategist and Enterprise Systems Architect with over 15 years leading high-availability transformations.',
          authorAvatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          recentArticles: [
            { title: 'Sustainable Commerce: Optimizing Global Supply Chain Logistics', publishedDate: 'Sep 10, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80', url: '/blog/sustainable-commerce-supply-chain' },
            { title: 'AI-Driven Workflow Orchestration and Customer Personalization', publishedDate: 'Sep 06, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&auto=format&fit=crop&q=80', url: '/blog/ai-driven-workflow-orchestration' }
          ],
          categories: [
            { name: 'Technology & Cloud', postCount: 14, url: '/blog?category=technology' },
            { name: 'Enterprise Strategy', postCount: 9, url: '/blog?category=strategy' },
            { name: 'Operations & Logistics', postCount: 7, url: '/blog?category=operations' },
            { name: 'AI & Automation', postCount: 12, url: '/blog?category=ai' },
            { name: 'Security & Governance', postCount: 5, url: '/blog?category=security' }
          ],
          enableSharePost: true
        };
        this.onPreviewContentChange();
        this.toast.info('Blog article detail sample content restored to defaults.');
        return;
      } else {
        this.previewBlogContent = {
          title: 'Platform Insights & Case Studies',
          miniTitle: 'LATEST KNOWLEDGE',
          description: 'Deep dives, architectural benchmarks, and best practices curated by our systems engineering team.',
          buttonText: 'Browse All Articles →',
          buttonLink: '/blog',
          viewAllButtonText: 'Browse All Articles →',
          viewAllButtonLink: '/blog',
          articles: [
            {
              title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems',
              summary: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
              excerpt: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization.',
              coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
              category: 'Engineering & Architecture',
              authorName: 'Alex Rivera',
              authorRole: 'Chief Architect',
              publishedDate: 'Sep 12, 2026',
              url: '/blog/architecting-resilient-multi-tenant-cloud-ecosystems'
            },
            {
              title: 'The Shift to Zero-Downtime Migration Pipelines',
              summary: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
              excerpt: 'How leading enterprise engineering teams execute petabyte-scale database cutovers without dropping a single active transaction.',
              coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
              category: 'DevOps & Reliability',
              authorName: 'Sarah Chen',
              authorRole: 'Head of Infrastructure',
              publishedDate: 'Sep 08, 2026',
              url: '/blog/zero-downtime-migration-pipelines'
            },
            {
              title: 'Next-Gen Identity & Granular Role Governance',
              summary: 'Integrating decentralized identity tokens with high-compliance RBAC structures across distributed micro-services.',
              excerpt: 'Integrating decentralized identity tokens with high-compliance RBAC structures across distributed micro-services.',
              coverImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
              category: 'Cybersecurity',
              authorName: 'Marcus Vance',
              authorRole: 'Security Lead',
              publishedDate: 'Aug 29, 2026',
              url: '/blog/next-gen-identity-governance'
            }
          ]
        };
        this.onPreviewContentChange();
        this.toast.info('Blog showcase sample content restored to defaults.');
        return;
      }
    }

    if (this.activePreviewItem?.category === 'hero') {
      this.previewHeroContent = {
        title: this.activePreviewItem?.previewTitle || this.activePreviewItem?.name || 'Innovating the Future of Community Empowerment',
        miniTitle: 'OFFICIAL PORTAL',
        text: this.activePreviewItem?.previewBody || this.activePreviewItem?.description || 'Empower your institution with resilient cloud infrastructure, automated governance, secure e-voting, and real-time operational telemetry in one unified workspace.',
        buttonText: 'Explore Solutions',
        buttonLink: '/services',
        videoButtonText: '',
        videoLink: '',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        secondUrl: '',
        youtubeVideo: ''
      };
      this.onPreviewContentChange();
      this.toast.info('Hero slider sample content restored to defaults.');
      return;
    }

    if (this.activePreviewItem?.defaultContentJson) {
      try {
        const parsed = JSON.parse(this.activePreviewItem.defaultContentJson);
        if (parsed && typeof parsed === 'object') {
          this.previewContent = {
            title: parsed.title || this.activePreviewItem.name,
            miniTitle: parsed.miniTitle || '',
            description: parsed.description || this.activePreviewItem.description,
            imageUrl: parsed.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
            buttonText: parsed.buttonText || 'Explore Platform Solutions →',
            buttonLink: parsed.buttonLink || '#',
            items: (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) ? parsed.items : [
              { title: 'Real-Time Sync', description: 'Instantaneous WebSocket state propagation.' },
              { title: 'Granular Governance', description: 'Fine-grained permission matrices.' }
            ]
          };
          this.onPreviewContentChange();
          this.toast.info('Sample content restored to template blueprint defaults.');
          return;
        }
      } catch (e) {}
    }

    this.previewContent = {
      title: this.activePreviewItem?.previewTitle || this.activePreviewItem?.name || 'Empowering Modern Enterprises',
      miniTitle: this.activePreviewItem?.previewSubtitle?.toUpperCase() || 'CORE BUSINESS CAPABILITIES',
      description: this.activePreviewItem?.previewBody || this.activePreviewItem?.description || 'Streamline business workflows, optimize operations, and deliver seamless client experiences.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      buttonText: 'Explore Business Solutions →',
      buttonLink: '#',
      items: [
        { title: 'Strategic Advisory', description: 'Tailored market insights and operational guidance to accelerate organizational growth.' },
        { title: 'Data Security & Privacy', description: 'Industry-standard encryption, privacy protocols, and secure collaboration channels.' },
        { title: 'Operational Efficiency', description: 'Modern automated workflows engineered to eliminate friction and elevate productivity.' }
      ]
    };
    this.onPreviewContentChange();
    this.toast.info('Sample content reset to defaults.');
  }

  /**
   * Hydrates raw Handlebars template HTML using TemplateHydrationService.
   * @param rawHtml The unparsed HTML template.
   * @param data Optional mock/real section model data.
   * @returns Fully resolved, preview-ready HTML.
   */
  hydrateTemplate(rawHtml: string, data?: any): string {
    return this.hydrationService.hydrateTemplate(rawHtml, data || this.previewContent, {
      editorTokens: this.editorTokens,
      availablePages: this.availablePages,
      currentTenantBrandName: this.currentTenantBrandName,
      previewMenuContent: this.previewMenuContent,
      previewFooterContent: this.previewFooterContent,
      previewBlogContent: this.previewBlogContent,
      previewBlogDetailContent: this.previewBlogDetailContent
    });
  }

  /**
   * Enforces the official 'Powered by Ozikol.' credit link in all footers.
   * @param html The footer HTML string to check and augment.
   * @returns HTML string guaranteed to contain valid Ozikol attribution.
   */
  enforceOzikolCredit(html: string): string {
    return this.hydrationService.enforceOzikolCredit(html);
  }

  copyCode(content: string, type: string): void {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      this.toast.success(`${type} code copied to clipboard!`);
    }).catch(() => {
      this.toast.info('Please select and copy manually.');
    });
  }

  closeSinglePreviewModal(): void {
    this.showSinglePreviewModal = false;
    this.activePreviewItem = null;
    this.safeSinglePreviewHtml = '';
    this.safeSinglePreviewSrcDoc = '';
    const styleEl = document.getElementById('oz-template-single-preview-css');
    if (styleEl) styleEl.remove();
    this.disposeMonacoEditors();
  }

  // Full-Site Demo Modal & Multi-Page Engine
  setPreviewPage(slug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'contact'): void {
    this.previewActivePageSlug = slug;
    this.renderFullSitePreview();
  }

  openFullSiteDemoModal(): void {
    this.fullDemoViewport = 'desktop';
    this.previewActivePageSlug = 'home';
    this.showFullSiteDemoModal = true;
    this.renderFullSitePreview();
  }

  /**
   * Composes a complete simulated page containing Menu, Hero/Breadcrumbs, Body sections, Blog/Contact/Request-Service, and Footer.
   * Enables 100% sample-content fidelity and live navigation simulation across all pages.
   * @param pageSlug The target route slug ('home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog').
   * @param menuBlockOverride Optional menu template item to override the active installed menu (used in modal preview).
   * @param menuContextOverride Optional menu data context to override sample data.
   * @returns An object containing combined CSS styles and combined HTML markup.
   */
  composePageSimulation(
    pageSlug: 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog',
    menuBlockOverride?: InstalledTemplateItem,
    menuContextOverride?: any
  ): { combinedStyles: string; combinedHtml: string; combinedJs: string } {
    const menuBlock = menuBlockOverride || this.getActiveMenu();
    const heroBlock = this.getActiveHero();
    const allBodyBlocks = this.getAllBodyBlocks();
    const footerBlock = this.getActiveFooter();

    const breadcrumbBlock = this.installedTemplates.find(t => t.category === 'breadcrumb') || this.installedTemplates.find(t => t.variantCode === 'Breadcrumb_PageHeader');
    const blogBlock = this.installedTemplates.find(t => t.category === 'blog') || this.installedTemplates.find(t => t.variantCode === 'Blog_CardGrid3');
    const contactBlock = this.installedTemplates.find(t => t.variantCode === 'Contact_SplitDetails') || this.installedTemplates.find(t => t.category === 'contact');
    const requestServiceBlock = this.installedTemplates.find(t => t.variantCode === 'Body_RequestService');

    let activeBlocks: { block: InstalledTemplateItem; contextOverride?: any }[] = [];

    if (pageSlug === 'home') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (heroBlock) activeBlocks.push({ block: heroBlock });
      allBodyBlocks.forEach(b => activeBlocks.push({ block: b }));
      if (blogBlock) activeBlocks.push({ block: blogBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'about') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'About Our Organization',
            miniTitle: 'MISSION & LEADERSHIP',
            description: 'Founded on principles of integrity, innovation, and client excellence, dedicated to delivering measurable value and long-term partnerships.'
          }
        });
      }
      const missionBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MissionSplit') || allBodyBlocks[0];
      const metricBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MetricsCounter');
      const testBlock = allBodyBlocks.find(b => b.variantCode === 'Body_Testimonials');
      const ctaBlock = allBodyBlocks.find(b => b.variantCode === 'Body_CtaBanner');
      if (missionBlock) activeBlocks.push({ block: missionBlock });
      if (metricBlock) activeBlocks.push({ block: metricBlock });
      if (testBlock) activeBlocks.push({ block: testBlock });
      if (ctaBlock) activeBlocks.push({ block: ctaBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'services') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Our Enterprise Services & Solutions',
            miniTitle: 'SERVICES & CAPABILITIES',
            description: 'Comprehensive institutional capabilities designed for seamless governance, compliance, and growth.'
          }
        });
      }
      const featureBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FeatureGrid3') || allBodyBlocks[0];
      const missionBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MissionSplit');
      const metricBlock = allBodyBlocks.find(b => b.variantCode === 'Body_MetricsCounter');
      const faqBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FaqAccordion');
      if (featureBlock) activeBlocks.push({ block: featureBlock });
      if (missionBlock) activeBlocks.push({ block: missionBlock });
      if (metricBlock) activeBlocks.push({ block: metricBlock });
      if (faqBlock) activeBlocks.push({ block: faqBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'request-service') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Request a Service & Consultation',
            miniTitle: 'SERVICE INTAKE',
            description: 'Submit your project specifications to initiate a formal strategic consultation with our enterprise advisory team.'
          }
        });
      }
      if (requestServiceBlock) {
        activeBlocks.push({ block: requestServiceBlock });
      } else if (contactBlock) {
        activeBlocks.push({ block: contactBlock });
      }
      const faqBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FaqAccordion');
      if (faqBlock) activeBlocks.push({ block: faqBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'blog') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Newsroom & Insights',
            miniTitle: 'DISPATCHES',
            description: 'Read the latest updates, event reports, policy releases, and organizational announcements.'
          }
        });
      }
      if (blogBlock) activeBlocks.push({ block: blogBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else if (pageSlug === 'contact') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: 'Contact Administrative Headquarters',
            miniTitle: 'HELP & SUPPORT',
            description: 'Reach our executive secretariat, membership registrar, and technical support team.'
          }
        });
      }
      if (contactBlock) activeBlocks.push({ block: contactBlock });
      const faqBlock = allBodyBlocks.find(b => b.variantCode === 'Body_FaqAccordion');
      if (faqBlock) activeBlocks.push({ block: faqBlock });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    }

    let combinedStyles = `
      @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .full-demo-canvas-wrapper {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        background: #ffffff;
      }
      .full-demo-canvas-wrapper a {
        text-decoration: none;
        cursor: pointer;
      }
      .full-demo-canvas-wrapper button {
        cursor: pointer;
      }
      /* Active Navigation Link Highlighting */
      .oz-nav-header .nav-link.active {
        color: #0050e5 !important;
        font-weight: 700 !important;
      }
      .oz-nav-header .nav-link:not(.active) {
        color: #64748b !important;
        font-weight: 500 !important;
      }
      .oz-nav-header .btn.active {
        box-shadow: 0 0 0 3px rgba(0, 80, 229, 0.4) !important;
        transform: translateY(-1px);
      }
    `;

    let combinedHtml = '';
    let combinedJs = '';

    activeBlocks.forEach(({ block: b, contextOverride }) => {
      combinedStyles += `\n/* Block: ${b.name} (${b.variantCode}) */\n${b.cssStyles || ''}\n`;
      let ctx: any = {
        title: contextOverride?.title || b.previewTitle || b.name,
        miniTitle: contextOverride?.miniTitle || b.previewSubtitle?.toUpperCase() || b.category.toUpperCase(),
        description: contextOverride?.description || b.previewBody || b.description,
        imageUrl: this.previewContent.imageUrl,
        buttonText: this.previewContent.buttonText,
        buttonLink: this.previewContent.buttonLink,
        items: this.previewContent.items,
        BrandName: this.currentTenantBrandName,
        Year: new Date().getFullYear().toString()
      };

      if (b.category === 'menu') {
        if (contextOverride) {
          ctx = { ...ctx, ...contextOverride };
        } else {
          ctx = { ...ctx, ...this.previewMenuContent };
        }
      } else if (b.category === 'hero') {
        ctx = {
          ...ctx,
          ...this.previewHeroContent,
          title: contextOverride?.title || this.previewHeroContent.title || b.previewTitle || b.name,
          miniTitle: contextOverride?.miniTitle || this.previewHeroContent.miniTitle || b.previewSubtitle?.toUpperCase() || 'OFFICIAL PORTAL',
          text: contextOverride?.description || this.previewHeroContent.text || b.previewBody || b.description,
          buttonText: this.previewHeroContent.buttonText,
          buttonLink: this.previewHeroContent.buttonLink,
          videoButtonText: this.previewHeroContent.videoButtonText,
          videoLink: this.previewHeroContent.videoLink,
          url: this.previewHeroContent.url,
          secondUrl: this.previewHeroContent.secondUrl,
          youtubeVideo: this.previewHeroContent.youtubeVideo
        };
      } else if (b.category === 'footer') {
        ctx = {
          ...ctx,
          categories: this.previewFooterContent.categories,
          legalPages: this.previewFooterContent.legalPages,
          email: this.previewFooterContent.email,
          phone: this.previewFooterContent.phone,
          brandName: this.previewFooterContent.brandName || this.currentTenantBrandName
        };

        if (b.defaultContentJson) {
          try {
            const parsed = JSON.parse(b.defaultContentJson);
            if (parsed?.categories) ctx.categories = parsed.categories;
            if (parsed?.legalPages) ctx.legalPages = parsed.legalPages;
            if (parsed?.email) ctx.email = parsed.email;
            if (parsed?.phone) ctx.phone = parsed.phone;
            if (parsed?.description) ctx.description = parsed.description;
          } catch (e) {}
        }
      } else if (b.category === 'blog') {
        if (this.isBlogDetailTemplate(b)) {
          ctx = {
            ...ctx,
            ...this.previewBlogDetailContent,
            article: this.previewBlogDetailContent
          };
        } else {
          ctx = {
            ...ctx,
            ...this.previewBlogContent,
            articles: this.previewBlogContent.articles
          };
        }
      }

      let hydratedBlockHtml = this.hydrateTemplate(b.htmlTemplate, ctx);
      hydratedBlockHtml = hydratedBlockHtml.replace(/\{\{\s*BrandName\s*\}\}/g, this.currentTenantBrandName);
      hydratedBlockHtml = hydratedBlockHtml.replace(/\{\{\s*Year\s*\}\}/g, new Date().getFullYear().toString());

      if (b.category === 'menu') {
        hydratedBlockHtml = hydratedBlockHtml.replace(
          /badge rounded-pill bg-primary">0<\/span>/g,
          `badge rounded-pill bg-primary">${this.previewCartCount}</span>`
        );

        // Dynamically synchronize active navbar link highlighting with the current page slug
        const activeSlug = pageSlug;

        // 1. Strip hardcoded active / text-dark classes from all nav-links
        hydratedBlockHtml = hydratedBlockHtml
          .replace(/\bnav-link\b([^"]*?)\bactive\b/g, 'nav-link$1')
          .replace(/\bnav-link\b([^"]*?)\btext-dark\b/g, 'nav-link$1text-secondary');

        // 2. Set active class on current matching page
        if (activeSlug === 'request-service') {
          hydratedBlockHtml = hydratedBlockHtml.replace(
            /(href=["']#request-service["'][^>]*class=["'][^"']*btn\b[^"']*)(["'])/i,
            '$1 active$2'
          );
        } else {
          // Check for link matching target slug
          const slugRegex = new RegExp(`(<a\\s+[^>]*class=["'][^"']*nav-link)([^"']*)(["'][^>]*href=["'](?:#|\\/)?${activeSlug}["'])`, 'i');
          if (slugRegex.test(hydratedBlockHtml)) {
            hydratedBlockHtml = hydratedBlockHtml.replace(slugRegex, (match, p1, p2, p3) => {
              const clean = p2.replace(/\btext-secondary\b/g, '').replace(/\s+/g, ' ');
              return `${p1}${clean} text-dark active"${p3.substring(1)}`;
            });
          } else {
            const revRegex = new RegExp(`(<a\\s+[^>]*href=["'](?:#|\\/)?${activeSlug}["'][^>]*class=["'][^"']*nav-link[^"']*)(["'])`, 'i');
            hydratedBlockHtml = hydratedBlockHtml.replace(revRegex, (match, prefix, quote) => {
              const clean = prefix.replace(/\btext-secondary\b/g, '').replace(/\s+/g, ' ');
              return `${clean} text-dark active${quote}`;
            });
          }
        }
      }

      if (b.category === 'footer') {
        hydratedBlockHtml = this.enforceOzikolCredit(hydratedBlockHtml);
      }

      if (b.jsScript && b.jsScript.trim()) {
        combinedJs += `\n/* Section: ${b.name} (${b.category}) */\n${b.jsScript}\n`;
      }

      combinedHtml += `\n<!-- Section: ${b.name} (${b.category}) -->\n${hydratedBlockHtml}\n`;
    });

    return { combinedStyles, combinedHtml, combinedJs };
  }

  renderFullSitePreview(): void {
    const sim = this.composePageSimulation(this.previewActivePageSlug);
    const combinedStyles = sim.combinedStyles;
    const combinedHtml = sim.combinedHtml;
    const combinedJs = sim.combinedJs;

    this.safeFullDemoHtml = this.sanitizer.bypassSecurityTrustHtml(`<style>${combinedStyles}</style>\n${combinedHtml}`);

    const iframeHtmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .dropdown {
      position: relative !important;
    }
    .dropdown-menu.show {
      display: block !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      z-index: 9999 !important;
      min-width: 13rem !important;
      margin-top: 4px !important;
      opacity: 1 !important;
      visibility: visible !important;
      background-color: #ffffff !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
    }
    .dropdown-item {
      cursor: pointer;
    }
    ${combinedStyles}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('click', function(e) {
      // 1. Dropdown Toggle Click Handler
      var dropdownToggle = e.target.closest('.dropdown-toggle, [data-bs-toggle="dropdown"]');
      if (dropdownToggle) {
        e.preventDefault();
        e.stopPropagation();
        var parentDropdown = dropdownToggle.closest('.dropdown');
        var menu = parentDropdown ? parentDropdown.querySelector('.dropdown-menu') : null;
        if (menu) {
          var isAlreadyOpen = menu.classList.contains('show');
          // Close any open dropdowns first
          document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
            m.classList.remove('show');
            m.removeAttribute('data-bs-popper');
          });
          document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
            t.setAttribute('aria-expanded', 'false');
          });
          if (!isAlreadyOpen) {
            menu.classList.add('show');
            menu.setAttribute('data-bs-popper', 'static');
            dropdownToggle.setAttribute('aria-expanded', 'true');
          }
        }
        return;
      }

      // 2. Click Outside Closes Dropdown
      if (!e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(function(m) {
          m.classList.remove('show');
          m.removeAttribute('data-bs-popper');
        });
        document.querySelectorAll('.dropdown-toggle[aria-expanded="true"]').forEach(function(t) {
          t.setAttribute('aria-expanded', 'false');
        });
      }

      // 3. Regular Navigation Links
      var a = e.target.closest('a');
      if (a) {
        var href = (a.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.startsWith('javascript:')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        window.parent.postMessage({ type: 'DEMO_NAV', href: href, text: a.textContent || '' }, '*');
        return;
      }

      // 4. Cart / Add Buttons
      var btn = e.target.closest('button, .btn');
      if (btn) {
        var txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('cart') || txt.includes('add')) {
          e.preventDefault();
          window.parent.postMessage({ type: 'DEMO_CART' }, '*');
        }
      }
    });
  <\/script>
</head>
<body>
  ${combinedHtml}
  ${combinedJs ? `\n  <script>\n    ${combinedJs}\n  <\/script>` : ''}
</body>
</html>`;

    this.safeFullDemoSrcDoc = this.sanitizer.bypassSecurityTrustHtml(iframeHtmlDoc);
  }

  getFullDemoBlockCount(): number {
    let count = 0;
    if (this.getActiveMenu()) count++;
    if (this.getActiveHero()) count++;
    count += this.getAllBodyBlocks().length;
    if (this.getActiveFooter()) count++;
    return count;
  }

  onPreviewCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    const button = target?.closest('button') as HTMLButtonElement | null;

    if (anchor) {
      event.preventDefault();
      event.stopPropagation();
      const href = (anchor.getAttribute('href') || '').toLowerCase();
      const text = (anchor.textContent || '').toLowerCase();

      if (href.includes('request') || text.includes('request')) {
        this.setPreviewPage('request-service');
        this.toast.info('Navigated to Request a Service in live preview.');
      } else if (href.includes('about') || text.includes('about')) {
        this.setPreviewPage('about');
        this.toast.info('Navigated to About Us in live preview.');
      } else if (href.includes('services') || text.includes('service') || text.includes('solution')) {
        this.setPreviewPage('services');
        this.toast.info('Navigated to Services & Solutions in live preview.');
      } else if (href.includes('blog') || text.includes('blog') || text.includes('news') || text.includes('article')) {
        this.setPreviewPage('blog');
        this.toast.info('Navigated to News & Insights in live preview.');
      } else if (href.includes('contact') || text.includes('contact')) {
        this.setPreviewPage('contact');
        this.toast.info('Navigated to Contact Headquarters in live preview.');
      } else if (href.includes('home') || text.includes('home') || anchor.classList.contains('navbar-brand')) {
        this.setPreviewPage('home');
        this.toast.info('Navigated to Home in live preview.');
      }
    } else if (button) {
      const btnText = (button.textContent || '').toLowerCase();
      if (btnText.includes('add') || btnText.includes('cart') || button.classList.contains('btn-primary')) {
        if (btnText.includes('add') || btnText.includes('cart')) {
          event.preventDefault();
          event.stopPropagation();
          this.previewCartCount++;
          this.toast.success(`Item added to cart! (${this.previewCartCount} items in cart)`);
          this.renderFullSitePreview();
        }
      }
    }
  }

  closeFullSiteDemoModal(): void {
    this.showFullSiteDemoModal = false;
    this.safeFullDemoHtml = '';
    this.safeFullDemoSrcDoc = '';
    const styleEl = document.getElementById('oz-full-demo-preview-css');
    if (styleEl) styleEl.remove();
  }

  // Assign to Page Modal
  openAssignModal(item: InstalledTemplateItem): void {
    this.selectedAssignItem = item;
    this.targetPageSlug = 'home';
    this.insertPosition = 'bottom';
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedAssignItem = null;
  }

  confirmAssignToPage(): void {
    if (!this.selectedAssignItem) return;
    const item = this.selectedAssignItem;

    const payload = {
      templateId: item.dbId || null,
      templateKey: item.id,
      variantCode: item.variantCode,
      targetPageSlug: this.targetPageSlug,
      insertPosition: this.insertPosition,
      customContentJson: JSON.stringify(this.previewContent)
    };

    this.api.post<any>('ContentApi/templates/assign-to-page', payload).subscribe({
      next: () => {
        this.toast.success(`'${item.name}' inserted into ${this.targetPageSlug.toUpperCase()} page with showcase content!`);
        this.closeAssignModal();
        this.router.navigate(['/content/console']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to insert section into page.';
        this.toast.error(msg);
      }
    });
  }

  openUninstallModal(item: InstalledTemplateItem): void {
    this.itemToUninstall = item;
    this.showUninstallModal = true;
  }

  closeUninstallModal(): void {
    this.showUninstallModal = false;
    this.itemToUninstall = null;
    this.uninstallingTemplate = false;
  }

  confirmUninstallTemplate(): void {
    if (!this.itemToUninstall) return;
    const item = this.itemToUninstall;
    this.uninstallingTemplate = true;

    this.installedTemplates = this.installedTemplates.filter(t => t.id !== item.id);
    this.saveInstalledTemplates();
    this.applyFilters();

    if (item.dbId) {
      this.api.delete<any>(`ContentApi/templates/installed/${item.dbId}`).subscribe({
        next: () => {
          this.uninstallingTemplate = false;
          this.toast.success(`Template '${item.name}' uninstalled.`);
          this.closeUninstallModal();
        },
        error: () => {
          this.uninstallingTemplate = false;
          this.toast.success(`Template '${item.name}' uninstalled from local library.`);
          this.closeUninstallModal();
        }
      });
    } else {
      this.uninstallingTemplate = false;
      this.toast.success(`Template '${item.name}' uninstalled.`);
      this.closeUninstallModal();
    }
  }
}
