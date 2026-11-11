import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';
import { TemplateHydrationService } from './services/template-hydration.service';
import { ContentHydrationService } from './services/content-hydration.service';
import { HtmlAssemblerService } from './services/html-assembler.service';
import { UniversalPreviewModalService } from './services/universal-preview-modal.service';
import { UniversalPreviewModalComponent } from './universal-preview-modal/universal-preview-modal.component';
import { TemplateSecurityModalComponent } from './template-security-modal/template-security-modal.component';
import { TemplateSecurityScannerService } from './services/template-security-scanner.service';

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
  isDefault?: boolean;
  defaultContentJson?: string;
}

export interface CodeInjectionTag {
  id: string;
  name: string;
  zone: 'head' | 'body_open' | 'footer';
  tagType: string;
  suiteCode?: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  isDefault?: boolean;
  createdAtUtc?: string;
}

@Component({
  selector: 'app-my-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UniversalPreviewModalComponent, TemplateSecurityModalComponent],
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
    { id: 'breadcrumb', name: 'Breadcrumbs & Page Banner', icon: 'alt_route' },
    { id: 'body', name: 'Body Sections', icon: 'view_quilt' },
    { id: 'footer', name: 'Footers', icon: 'dock_to_bottom' },
    { id: 'blog', name: 'Blogs & Articles', icon: 'newspaper' },
    { id: 'blog_detail', name: 'Blog Details', icon: 'article' }
  ];

  selectedGroup: string = 'all';
  previewActivePageSlug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'blog-detail' | 'contact' = 'home';
  previewCartCount: number = 0;
  currentTenantBrandName: string = localStorage.getItem('tenant_name') || localStorage.getItem('tenant_company_name') || 'Enterprise Workspace';
  currentTenantSubdomain: string = localStorage.getItem('tenant_key') || localStorage.getItem('tenant_subdomain') || 'portal';

  // Active Theme Suite State
  activeThemeSuiteCode: string = 'suite_corporate';
  activeThemeSuiteName: string = 'Corporate Suite';
  selectedThemeSuiteToActivate: string = 'suite_corporate';
  activatingSuite: boolean = false;
  showVaultSettingsDropdown: boolean = false;

  // Active Main Tab
  activeMainTab: 'vault' | 'head' | 'body_open' | 'footer' = 'vault';
  allCodeInjections: CodeInjectionTag[] = [];
  headTags: CodeInjectionTag[] = [];
  bodyOpenTags: CodeInjectionTag[] = [];
  footerTags: CodeInjectionTag[] = [];
  loadingTags: boolean = false;
  loadingTemplates: boolean = false;

  // Vault Reset & Defaults State
  showClearAllModal: boolean = false;
  clearingVault: boolean = false;
  showReinstallDefaultsModal: boolean = false;
  reinstallingDefaults: boolean = false;
  reinstallingTemplatesOnly: boolean = false;
  seedingFullSuite: boolean = false;

  // Code Injection Modal State
  showTagModal: boolean = false;
  isEditingTag: boolean = false;
  tagFormZone: 'head' | 'body_open' | 'footer' = 'head';
  tagForm: CodeInjectionTag = {
    id: '',
    name: '',
    zone: 'head',
    tagType: 'link_stylesheet',
    suiteCode: 'global',
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

  // CSS File Upload State (Cloudflare R2 + CDN)
  @ViewChild('cssFileInput') cssFileInput?: ElementRef<HTMLInputElement>;
  selectedCssFile: File | null = null;
  selectedCssFileName: string = '';
  selectedCssFileSize: string = '';
  uploadingCss: boolean = false;
  uploadedCssUrl: string = '';
  uploadedCssStorage: string = '';

  // JavaScript File Upload State (Cloudflare R2 + CDN)
  @ViewChild('jsFileInput') jsFileInput?: ElementRef<HTMLInputElement>;
  selectedJsFile: File | null = null;
  selectedJsFileName: string = '';
  selectedJsFileSize: string = '';
  uploadingJs: boolean = false;
  uploadedJsUrl: string = '';
  uploadedJsStorage: string = '';

  // Bulk CSS / JS Asset Upload State
  showBulkUploadModal: boolean = false;
  uploadingBulk: boolean = false;
  bulkUploadZone: 'head' | 'body_open' | 'footer' = 'head';
  bulkUploadSuiteCode: string = 'global';
  bulkUploadStartSort: number = 10;
  bulkUploadSortIncrement: number = 10;
  bulkUploadFiles: Array<{
    file: File;
    name: string;
    size: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    cdnUrl?: string;
    error?: string;
  }> = [];
  @ViewChild('bulkFileInput') bulkFileInput?: ElementRef<HTMLInputElement>;

  // Asset File Content Editor State (Modal 11)
  showAssetEditorModal: boolean = false;
  editingAssetTag: any = null;
  editingAssetContent: string = '';
  editingAssetUrl: string = '';
  editingAssetIsCdn: boolean = false;
  loadingAssetContent: boolean = false;
  savingAssetContent: boolean = false;

  // Font Asset Upload & Management State (Modal 12)
  showFontUploadModal: boolean = false;
  uploadingFonts: boolean = false;
  uploadedFonts: Array<{
    fileName: string;
    fontFamilyName: string;
    cdnUrl: string;
    fileSizeBytes: number;
    format: string;
    fontFaceSnippet: string;
  }> = [];
  @ViewChild('fontFileInput') fontFileInput?: ElementRef<HTMLInputElement>;

  // Tag Reordering & Drag-and-Drop State
  draggedTagIndex: number | null = null;
  dragOverTagIndex: number | null = null;
  savingTagOrder: boolean = false;

  // 1-Click Popular Framework & CDN Presets
  readonly frameworkPresets: Array<{
    name: string;
    description: string;
    tagType: string;
    zone?: 'head' | 'footer' | 'any';
    icon: string;
    badge: string;
    content: string;
  }> = [
    {
      name: 'Bootstrap 5.3.3 (CSS)',
      description: 'Official production CSS with responsive grid and utility classes.',
      tagType: 'link_stylesheet',
      zone: 'head',
      icon: 'grid_view',
      badge: 'CSS Framework',
      content: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">'
    },
    {
      name: 'Bootstrap 5.3.3 (JS Bundle)',
      description: 'Official Popper + Bootstrap bundle for dropdowns, modals, and tooltips.',
      tagType: 'script_url',
      zone: 'footer',
      icon: 'javascript',
      badge: 'JS Bundle',
      content: '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>'
    },
    {
      name: 'Swiper 11 (Slider JS)',
      description: 'Modern mobile-first touch carousel & slider engine.',
      tagType: 'script_url',
      zone: 'footer',
      icon: 'swipe',
      badge: 'Slider JS',
      content: '<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>'
    },
    {
      name: 'FontAwesome 6.5.1 (Icons)',
      description: 'Global icon library with thousands of web icons.',
      tagType: 'link_stylesheet',
      zone: 'head',
      icon: 'category',
      badge: 'Icon Suite',
      content: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />'
    },
    {
      name: 'Bootstrap Icons 1.11.3',
      description: 'Over 2,000 official SVG font icons for Bootstrap.',
      tagType: 'link_stylesheet',
      zone: 'head',
      icon: 'token',
      badge: 'Icon Suite',
      content: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">'
    },
    {
      name: 'Alpine.js 3.14',
      description: 'Lightweight reactive frontend framework directly in HTML attributes.',
      tagType: 'script_url',
      zone: 'head',
      icon: 'dynamic_form',
      badge: 'Micro Framework',
      content: '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>'
    },
    {
      name: 'GSAP 3.12 (GreenSock)',
      description: 'Professional high-performance JavaScript web animation library.',
      tagType: 'script_url',
      zone: 'footer',
      icon: 'motion_photos_on',
      badge: 'Animations',
      content: '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>'
    },
    {
      name: 'jQuery 3.7.1',
      description: 'Feature-rich JavaScript DOM manipulation library.',
      tagType: 'script_url',
      zone: 'footer',
      icon: 'code_blocks',
      badge: 'Utility JS',
      content: '<script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>'
    },
    {
      name: 'Tailwind CSS (Play CDN)',
      description: 'Utility-first CSS runtime engine via script tag for rapid development.',
      tagType: 'external_js',
      zone: 'head',
      icon: 'palette',
      badge: 'Utility CSS',
      content: '<script src="https://cdn.tailwindcss.com"></script>'
    },
    {
      name: 'Google Font (Inter)',
      description: 'Modern, highly legible sans-serif typography for clean interfaces.',
      tagType: 'link_stylesheet',
      zone: 'head',
      icon: 'text_fields',
      badge: 'Typography',
      content: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">'
    },
    {
      name: 'Google Font (Poppins)',
      description: 'Geometric sans-serif with friendly curves and multiple weights.',
      tagType: 'link_stylesheet',
      zone: 'head',
      icon: 'format_size',
      badge: 'Typography',
      content: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">'
    },
    {
      name: 'Animate.css 4.1.1',
      description: 'Cross-browser CSS animations library for entrance and attention effects.',
      tagType: 'link_stylesheet',
      zone: 'head',
      icon: 'animation',
      badge: 'Animations',
      content: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />'
    }
  ];

  // Singleton Tag Types that must not be added more than once per zone
  readonly singletonTagTypes: Record<string, string[]> = {
    head: ['meta_tag'],
    body_open: ['gtm_noscript', 'pixel_noscript', 'page_loader', 'svg_sprites'],
    footer: ['live_chat']
  };

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
    // Head zone - empty by default so user is not confused by sample third-party links
    link_stylesheet: '',
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
    script_url: '',
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
  modalPreviewPageSlug: 'isolated' | 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog' | 'blog-detail' = 'isolated';
  safeSinglePreviewHtml: SafeHtml = '';
  safeSinglePreviewSrcDoc: SafeHtml | string = '';

  // Interactive Test / Sample Content Replacements
  previewContent: {
    title: string;
    miniTitle: string;
    description: string;
    fullDescription: string;
    imageUrl: string;
    secondImageUrl: string;
    buttonText: string;
    buttonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    directUrl: string;
    youtubeUrlLink: string;
    quote: string;
    email: string;
    phone: string;
    address: string;
    workingHours: string;
    formKey: string;
    customClass: string;
    backgroundColor: string;
    items: Array<{
      title: string;
      miniTitle?: string;
      description: string;
      moreDescription?: string;
      iconText?: string;
      imageUrl?: string;
      buttonText?: string;
      buttonLink?: string;
      sortOrder?: number;
    }>;
  } = {
    title: 'Empowering Modern Organizations',
    miniTitle: 'NEXT-GENERATION PLATFORM',
    description: 'Streamline administrative workflows, automate financial governance, and deliver seamless digital experiences across sovereign systems.',
    fullDescription: 'Our platform delivers military-grade data protection coupled with intuitive operational dashboards designed to elevate administrative efficiency across the entire ecosystem.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    secondImageUrl: '',
    buttonText: 'Explore Platform Solutions →',
    buttonLink: '#',
    secondaryButtonText: 'Download Architecture Brief',
    secondaryButtonLink: '#',
    directUrl: '',
    youtubeUrlLink: '',
    quote: '',
    email: 'contact@organization.com',
    phone: '+1 (555) 019-2834',
    address: '100 Innovation Parkway, Suite 400, Tech City, TC 94105',
    workingHours: 'Monday - Friday: 8:00 AM - 6:00 PM',
    formKey: 'Contact_Us',
    customClass: '',
    backgroundColor: '',
    items: [
      { title: 'Real-Time Sync', miniTitle: 'WEBSOCKET', description: 'Instantaneous WebSocket state propagation across all connected devices with zero polling latency.', moreDescription: 'Sub-millisecond transmission', iconText: 'sync', buttonText: 'Learn More', buttonLink: '#', sortOrder: 1 },
      { title: 'Granular Governance', miniTitle: 'SECURITY', description: 'Fine-grained permission matrices, committee chair controls, and audit verification.', moreDescription: 'RBAC and multi-factor authorization', iconText: 'verified_user', buttonText: 'Learn More', buttonLink: '#', sortOrder: 2 },
      { title: 'Cloud Asset Vault', miniTitle: 'STORAGE', description: 'High-performance media streaming and document management for all organization tiers.', moreDescription: 'Infinite CDN asset scale', iconText: 'cloud_done', buttonText: 'Learn More', buttonLink: '#', sortOrder: 3 }
    ]
  };

  // Dedicated Footer Sample Content Replacements
  previewFooterContent: {
    brandName: string;
    description: string;
    email: string;
    phone: string;
    address?: string;
    workingHours?: string;
    hasContactInfo?: boolean;
    hasSocialLinks?: boolean;
    categories: Array<{
      name: string;
      displayTitle?: string;
      pages: Array<{ title: string; url: string }>;
    }>;
    footerCategories?: Array<{
      title: string;
      pages: Array<{ title: string; url: string }>;
    }>;
    taggedPages?: Record<string, Array<{ title: string; url: string }>>;
    legalPages: Array<{ title: string; url: string }>;
    socialLinks?: Array<{ platform: string; title?: string; url: string; icon?: string; iconClass?: string; customClass?: string }>;
    contactItems?: Array<{ type?: string; channelType?: string; platform?: string; title?: string; description?: string; value?: string; content?: string; url?: string; icon?: string; iconClass?: string; isDefault?: boolean; customClass?: string }>;
  } = {
    brandName: 'Organization Portal',
    description: 'Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations.',
    email: 'contact@organization.com',
    phone: '+1 (555) 019-2834',
    address: 'One Sovereign Way, Suite 400',
    workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM',
    hasContactInfo: true,
    hasSocialLinks: true,
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
    footerCategories: [
      {
        title: 'Solutions',
        pages: [
          { title: 'Strategic Consulting', url: '/strategic-advisory' },
          { title: 'Systems Modernization', url: '/systems-modernization' },
          { title: 'Performance & Scale', url: '/performance-scale' },
          { title: 'Enterprise Advisory', url: '/enterprise-governance' }
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
    taggedPages: {
      quicklinks: [
        { title: 'Release Notes', url: '/releases' },
        { title: 'System Status', url: '/status' },
        { title: 'Security Advisories', url: '/security' },
        { title: 'Knowledge Base', url: '/kb' }
      ]
    },
    legalPages: [
      { title: 'Privacy Policy', url: '/privacy-policy' },
      { title: 'Terms & Conditions', url: '/terms-and-conditions' },
      { title: 'Cookie Policy', url: '/cookie-policy' }
    ],
    socialLinks: [
      { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
      { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin-in' },
      { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
      { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
    ],
    contactItems: [
      { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
      { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'contact@organization.com', content: 'contact@organization.com', url: 'mailto:contact@organization.com', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
      { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: 'One Sovereign Way, Suite 400', content: 'One Sovereign Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
    ]
  };

  // Dedicated Menu Sample Content Replacements
  previewMenuContent: {
    brandName: string;
    brandLogo?: string;
    logoUrl: string;
    homeUrl?: string;
    customClass?: string;
    hasTopBar?: boolean;
    hasContactInfo?: boolean;
    email?: string;
    phone?: string;
    address?: string;
    workingHours?: string;
    hasSocialLinks?: boolean;
    socialLinks?: Array<{ platform: string; title?: string; url: string; icon?: string; iconClass?: string; customClass?: string }>;
    contactItems?: Array<{ type?: string; channelType?: string; platform?: string; title?: string; description?: string; value?: string; content?: string; url?: string; icon?: string; iconClass?: string; isDefault?: boolean; customClass?: string }>;
    showLoginButton?: boolean;
    loginUrl?: string;
    loginText?: string;
    topBarPages?: Array<{ title: string; url: string; icon?: string; customClass?: string }>;
    navigationMenu?: Array<any>;
    topMenuItems: Array<{ title: string; url: string }>;
    dropdowns: Array<{ title: string; pages: Array<{ title: string; url: string }> }>;
    menuCtaButtons: Array<{ title: string; url: string; buttonClass?: string; customClass?: string }>;
  } = {
    brandName: 'Apex Global',
    brandLogo: '',
    logoUrl: '',
    homeUrl: '/',
    customClass: '',
    hasTopBar: true,
    hasContactInfo: true,
    hasSocialLinks: true,
    email: 'support@ozikol.cloud',
    phone: '+1 (555) 019-2834',
    address: '1200 Innovation Way, Suite 400',
    workingHours: 'Mon - Fri: 8:00 AM - 6:00 PM',
    socialLinks: [
      { platform: 'Twitter / X', title: 'Twitter / X', url: 'https://twitter.com', icon: 'share', iconClass: 'fa-brands fa-x-twitter' },
      { platform: 'LinkedIn', title: 'LinkedIn', url: 'https://linkedin.com', icon: 'public', iconClass: 'fa-brands fa-linkedin-in' },
      { platform: 'Facebook', title: 'Facebook', url: 'https://facebook.com', icon: 'thumb_up', iconClass: 'fa-brands fa-facebook' },
      { platform: 'Instagram', title: 'Instagram', url: 'https://instagram.com', icon: 'photo_camera', iconClass: 'fa-brands fa-instagram' }
    ],
    contactItems: [
      { type: 'phone', channelType: 'Phone', platform: 'Support', title: 'Call Us', description: 'Mon-Fri 8am-6pm', value: '+1 (555) 019-2834', content: '+1 (555) 019-2834', url: 'tel:+15550192834', icon: 'call', iconClass: 'fa-solid fa-phone', isDefault: true },
      { type: 'email', channelType: 'Email', platform: 'General', title: 'Email Us', description: 'Online Inquiries', value: 'support@ozikol.cloud', content: 'support@ozikol.cloud', url: 'mailto:support@ozikol.cloud', icon: 'mail', iconClass: 'fa-solid fa-envelope', isDefault: true },
      { type: 'address', channelType: 'Address', platform: 'HQ', title: 'Headquarters', description: 'Corporate Office', value: '1200 Innovation Way, Suite 400', content: '1200 Innovation Way, Suite 400', url: '#', icon: 'location_on', iconClass: 'fa-solid fa-location-dot', isDefault: true }
    ],
    showLoginButton: true,
    loginUrl: '/auth/login',
    loginText: 'Sign In',
    topBarPages: [
      { title: 'Support', url: '/support' },
      { title: 'Docs', url: '/docs' }
    ],
    navigationMenu: [
      {
        title: 'About',
        url: '/about',
        zone: 'first',
        isDropdown: false,
        sortOrder: 1
      },
      {
        title: 'Service',
        url: '/services',
        zone: 'first',
        isDropdown: true,
        sortOrder: 2,
        pages: [
          { title: 'IT', url: '/services/it', sortOrder: 1 },
          { title: 'Hospital', url: '/services/hospital', sortOrder: 2 },
          { title: 'Infrastructure', url: '/services/infrastructure', sortOrder: 3 }
        ]
      },
      {
        title: 'Career',
        url: '/careers',
        zone: 'middle',
        isDropdown: false,
        sortOrder: 3
      },
      {
        title: 'Product',
        url: '/products',
        zone: 'middle',
        isDropdown: true,
        sortOrder: 4,
        pages: [
          { title: 'AI agent', url: '/products/ai-agent', sortOrder: 1 },
          { title: 'Machineries', url: '/products/machineries', sortOrder: 2 }
        ]
      },
      {
        title: 'Blog',
        url: '/blog',
        zone: 'last',
        isDropdown: false,
        sortOrder: 5
      },
      {
        title: 'Contact Us',
        url: '/contact',
        zone: 'last',
        isDropdown: false,
        sortOrder: 6
      }
    ],
    topMenuItems: [
      { title: 'Home', url: '/' },
      { title: 'Blog', url: '/blog' },
      { title: 'Contact', url: '/contact' }
    ],
    dropdowns: [
      {
        title: 'Service',
        pages: [
          { title: 'IT', url: '/services/it' },
          { title: 'Hospital', url: '/services/hospital' },
          { title: 'Infrastructure', url: '/services/infrastructure' }
        ]
      },
      {
        title: 'Product',
        pages: [
          { title: 'AI agent', url: '/products/ai-agent' },
          { title: 'Machineries', url: '/products/machineries' }
        ]
      }
    ],
    menuCtaButtons: [
      { title: 'Login', url: '/login', customClass: 'oz-btn-ghost', buttonClass: 'oz-btn-ghost' },
      { title: 'Get Started', url: '/get-started', customClass: 'oz-btn-primary', buttonClass: 'oz-btn-primary' }
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
    title: '',
    miniTitle: '',
    text: '',
    buttonText: '',
    buttonLink: '',
    videoButtonText: '',
    videoLink: '',
    url: '',
    secondUrl: '',
    youtubeVideo: ''
  };

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

  // Dedicated Breadcrumb Sample Content Replacements
  previewBreadcrumbContent = {
    title: 'Enterprise Solutions & Insights',
    miniTitle: 'MISSION & LEADERSHIP',
    description: 'Discover how modern organizations accelerate digital workflows through hardened infrastructure.',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    trailItems: [
      { label: 'Home', url: '/', isActive: false },
      { label: 'Capabilities', url: '/capabilities', isActive: false },
      { label: 'Enterprise Solutions', url: '/capabilities/enterprise', isActive: true }
    ]
  };

  // Full-Site Demo Modal & Multi-Page Simulation State
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
  loadingLinkedContent: boolean = false;
  linkedSectionsList: any[] = [];
  deleteLinkedContentCheckbox: boolean = false;

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
  singletonCategories: string[] = ['menu', 'hero', 'footer', 'blog'];

  /** Flag indicating active background AI navbar analysis and placeholder transformation */
  isAiTransforming: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
    private hydrationService: TemplateHydrationService,
    private contentHydrator: ContentHydrationService,
    private htmlAssembler: HtmlAssemblerService,
    private universalPreviewModal: UniversalPreviewModalService,
    private securityScanner: TemplateSecurityScannerService
  ) {}

  ngOnInit(): void {
    this.cleanupLeakedStyles();
    const savedView = localStorage.getItem('oz_templates_view_mode') as 'grid' | 'table';
    if (savedView) this.viewMode = savedView;

    // Listen to query parameters to focus on newly imported/adopted suites
    this.route.queryParams.subscribe(params => {
      if (params && params['suite']) {
        this.selectedGroup = params['suite'];
        this.selectedThemeSuiteToActivate = params['suite'];
        this.applyFilters();
      }
    });

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
      if (!href || href === '#' || href.startsWith('#') || href.startsWith('javascript:')) return;
      let targetSlug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'blog-detail' | 'contact' = 'home';

      if (href.includes('request') || text.includes('request')) {
        targetSlug = 'request-service';
      } else if (href.includes('about') || text.includes('about')) {
        targetSlug = 'about';
      } else if (href.includes('services') || text.includes('service') || text.includes('solution')) {
        targetSlug = 'services';
      } else if (
        href.includes('/blog/') ||
        href.includes('detail') ||
        text.includes('read article') ||
        text.includes('view article') ||
        text.includes('read more')
      ) {
        targetSlug = 'blog-detail';
      } else if (href.includes('blog') || text.includes('blog') || text.includes('news') || text.includes('article') || text.includes('insights')) {
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
      case 'head': return 'HTML Head (<head>)';
      case 'body_open': return 'Body Open (<body>)';
      case 'footer': return 'Footer (</body>)';
      default: return 'Code Injection';
    }
  }

  getZoneShortTitle(zone: string): string {
    switch (zone) {
      case 'head': return 'HTML Head';
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

  /**
   * Returns all code injection tags for the specified zone filtered by the active theme suite selection.
   * Enables clean isolation between suites while preserving global tags across all themes.
   */
  getFilteredZoneTags(zone: 'head' | 'body_open' | 'footer'): CodeInjectionTag[] {
    const list = this.allCodeInjections.filter(t => t.zone === zone);
    if (this.selectedGroup === 'all') {
      return list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return list
      .filter(t => (t.suiteCode || 'suite_corporate') === this.selectedGroup || t.suiteCode === 'global' || !t.suiteCode)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Computes dynamic tag count for each zone tab respecting the active suite filter.
   */
  getZoneTagCount(zone: 'head' | 'body_open' | 'footer'): number {
    return this.getFilteredZoneTags(zone).length;
  }

  getActiveZoneTags(): CodeInjectionTag[] {
    if (this.activeMainTab === 'head' || this.activeMainTab === 'body_open' || this.activeMainTab === 'footer') {
      return this.getFilteredZoneTags(this.activeMainTab);
    }
    return [];
  }

  /**
   * Moves a code injection tag one step up in execution order.
   * @param index Current index in the active zone list.
   */
  moveTagUp(index: number): void {
    if (index <= 0) return;
    const tags = [...this.getActiveZoneTags()];
    const temp = tags[index];
    tags[index] = tags[index - 1];
    tags[index - 1] = temp;
    this.applyAndSaveTagReorder(tags);
  }

  /**
   * Moves a code injection tag one step down in execution order.
   * @param index Current index in the active zone list.
   */
  moveTagDown(index: number): void {
    const tags = [...this.getActiveZoneTags()];
    if (index >= tags.length - 1) return;
    const temp = tags[index];
    tags[index] = tags[index + 1];
    tags[index + 1] = temp;
    this.applyAndSaveTagReorder(tags);
  }

  /**
   * Handles drag start on a code injection table row.
   * @param event Drag event.
   * @param index Row index.
   */
  onTagDragStart(event: DragEvent, index: number): void {
    this.draggedTagIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  /**
   * Handles drag over on a code injection table row.
   * @param event Drag event.
   * @param index Row index.
   */
  onTagDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverTagIndex = index;
  }

  /**
   * Handles drag leave on a code injection table row.
   * @param event Drag event.
   * @param index Row index.
   */
  onTagDragLeave(event: DragEvent, index: number): void {
    if (this.dragOverTagIndex === index) {
      this.dragOverTagIndex = null;
    }
  }

  /**
   * Handles dropping a dragged tag onto a target row index.
   * @param event Drag event.
   * @param targetIndex Destination row index.
   */
  onTagDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    this.dragOverTagIndex = null;
    if (this.draggedTagIndex === null || this.draggedTagIndex === targetIndex) {
      this.draggedTagIndex = null;
      return;
    }

    const tags = [...this.getActiveZoneTags()];
    const [movedItem] = tags.splice(this.draggedTagIndex, 1);
    tags.splice(targetIndex, 0, movedItem);
    this.draggedTagIndex = null;

    this.applyAndSaveTagReorder(tags);
  }

  /**
   * Normalizes all sort orders in the current zone to clean increments of 10 (10, 20, 30, 40...).
   */
  normalizeTagOrders(): void {
    const tags = [...this.getActiveZoneTags()];
    this.applyAndSaveTagReorder(tags, true);
  }

  /**
   * Applies new sort orders to local state and persists the changes to the database.
   * @param orderedTags The newly ordered tag list.
   * @param showNotice Whether to show a success toast.
   */
  applyAndSaveTagReorder(orderedTags: CodeInjectionTag[], showNotice: boolean = false): void {
    const reorderPayload: Array<{ id: string; sortOrder: number }> = [];

    orderedTags.forEach((tag, idx) => {
      const newOrder = (idx + 1) * 10;
      tag.sortOrder = newOrder;
      reorderPayload.push({ id: tag.id, sortOrder: newOrder });

      // Update in master list
      const masterTag = this.allCodeInjections.find(t => t.id === tag.id);
      if (masterTag) {
        masterTag.sortOrder = newOrder;
      }
    });

    // Re-sort local arrays
    this.headTags.sort((a, b) => a.sortOrder - b.sortOrder);
    this.bodyOpenTags.sort((a, b) => a.sortOrder - b.sortOrder);
    this.footerTags.sort((a, b) => a.sortOrder - b.sortOrder);
    localStorage.setItem('oz_code_injections_cache', JSON.stringify(this.allCodeInjections));

    this.savingTagOrder = true;
    this.api.put<any>('ContentApi/code-injections/reorder', reorderPayload).subscribe({
      next: () => {
        this.savingTagOrder = false;
        if (showNotice) {
          this.toast.success('Execution order normalized to 10, 20, 30, 40... successfully!');
        }
      },
      error: (err) => {
        this.savingTagOrder = false;
        this.toast.error('Failed to save order: ' + (err?.error?.message || err?.message));
        this.loadAllCodeInjections();
      }
    });
  }

  getSuiteNameByCode(suiteCode?: string): string {
    if (!suiteCode || suiteCode === 'global') return 'Global (All Themes)';
    const found = this.getAvailableSuites().find(s => s.code === suiteCode);
    if (found) return found.name;
    if (suiteCode === 'suite_corporate') return 'Corporate Suite';
    if (suiteCode === 'suite_apexmodern') return 'Apex Modern Theme';
    const rawTag = suiteCode.replace(/^suite_/i, '');
    return rawTag.charAt(0).toUpperCase() + rawTag.slice(1) + ' Theme';
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
        this.allCodeInjections = parsed;
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
          this.allCodeInjections = tags;
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

  /**
   * Resets any active CSS upload selection and CDN URL status to ensure clean modal sessions.
   */
  resetCssUploadState(): void {
    this.selectedCssFile = null;
    this.selectedCssFileName = '';
    this.selectedCssFileSize = '';
    this.uploadedCssUrl = '';
    this.uploadedCssStorage = '';
    this.uploadingCss = false;
    if (this.tagForm && this.tagForm.content && this.tagForm.content.startsWith('/* Upload pending:')) {
      this.tagForm.content = '';
    }
    if (this.cssFileInput?.nativeElement) {
      this.cssFileInput.nativeElement.value = '';
    }
  }

  /**
   * Resets any active JavaScript upload selection and CDN URL status to ensure clean modal sessions.
   */
  resetJsUploadState(): void {
    this.selectedJsFile = null;
    this.selectedJsFileName = '';
    this.selectedJsFileSize = '';
    this.uploadedJsUrl = '';
    this.uploadedJsStorage = '';
    this.uploadingJs = false;
    if (this.tagForm && this.tagForm.content && this.tagForm.content.startsWith('/* Upload pending:')) {
      this.tagForm.content = '';
    }
    if (this.jsFileInput?.nativeElement) {
      this.jsFileInput.nativeElement.value = '';
    }
  }

  openCreateTagModal(zone?: 'head' | 'body_open' | 'footer' | string): void {
    this.isEditingTag = false;
    this.resetCssUploadState();
    this.resetJsUploadState();
    const targetZone: 'head' | 'body_open' | 'footer' =
      (zone === 'head' || zone === 'body_open' || zone === 'footer')
        ? zone
        : (this.activeMainTab === 'vault' ? 'head' : this.activeMainTab);

    let defaultType = 'link_stylesheet';
    if (targetZone === 'body_open') defaultType = 'gtm_noscript';
    if (targetZone === 'footer') defaultType = 'script_url';

    const currentCount = this.getZoneTagCount(targetZone);

    this.tagFormZone = targetZone;
    this.tagForm = {
      id: '',
      name: '',
      zone: targetZone,
      tagType: defaultType,
      suiteCode: this.selectedGroup !== 'all' ? this.selectedGroup : 'global',
      content: this.tagBoilerplates[defaultType] || '',
      sortOrder: (currentCount + 1) * 10,
      isActive: true
    };
    this.showTagModal = true;
  }

  openEditTagModal(tag: CodeInjectionTag): void {
    this.isEditingTag = true;
    this.resetCssUploadState();
    this.resetJsUploadState();
    this.tagFormZone = tag.zone;
    this.tagForm = { ...tag };
    this.showTagModal = true;

    // Cloudflare R2 Offloader: If the tag references an external CDN asset, fetch the live raw source code for editing
    if (tag.content && (tag.content.includes('<link rel="stylesheet"') || tag.content.includes('<script src='))) {
      this.api.get<any>(`ContentApi/code-injections/${tag.id}/raw-content`).subscribe({
        next: (res) => {
          if (res?.data?.rawContent) {
            this.tagForm.content = res.data.rawContent;
          }
        }
      });
    }
  }

  closeTagModal(): void {
    this.showTagModal = false;
    this.resetCssUploadState();
    this.resetJsUploadState();
  }

  onTagTypeChanged(): void {
    this.resetCssUploadState();
    this.resetJsUploadState();

    if (this.tagForm.tagType === 'meta_tag') {
      this.selectedMetaPreset = 'full_suite';
      this.tagForm.content = this.metaPresets['full_suite'].content;
      if (!this.tagForm.name || this.tagForm.name === 'SEO / Social Meta Tag') {
        this.tagForm.name = 'Primary SEO, Social & Favicon Meta Suite';
      }
      return;
    }

    if (this.tagBoilerplates[this.tagForm.tagType] !== undefined) {
      this.tagForm.content = this.tagBoilerplates[this.tagForm.tagType];
    } else {
      this.tagForm.content = '';
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
   * Checks whether the current tag form represents a JavaScript script tag.
   */
  isJsTagType(): boolean {
    const t = this.tagForm.tagType;
    return this.tagFormZone === 'footer' || 
           t === 'script_url' || 
           t === 'footer_script_url' || 
           t === 'external_js' || 
           t === 'inline_js' || 
           t === 'defer_js' || 
           t === 'async_js';
  }

  /**
   * Checks whether the current tag form represents a CSS stylesheet tag.
   */
  isCssTagType(): boolean {
    const t = this.tagForm.tagType;
    return this.tagFormZone === 'head' && (t === 'link_stylesheet' || t === 'inline_css');
  }

  /**
   * Retrieves contextual 1-click CDN presets matching the active zone and tag category.
   */
  getFilteredFrameworkPresets(): any[] {
    if (this.isJsTagType()) {
      return this.frameworkPresets.filter(p => p.zone === 'footer' || p.tagType === 'script_url' || p.tagType === 'external_js');
    }
    return this.frameworkPresets.filter(p => p.zone !== 'footer' && p.tagType !== 'script_url');
  }

  /**
   * Handles local CSS file selection for single file injection.
   * Automatically populates the tag name and prepares the file for unified single-step upload & save.
   */
  onCssFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const cleanName = lowerName.endsWith('.download') ? lowerName.substring(0, lowerName.length - 9) : lowerName;
    if (!cleanName.endsWith('.css')) {
      this.toast.error('Please select a valid CSS file (.css or .css.download).');
      return;
    }
    this.selectedCssFile = file;
    this.selectedCssFileName = file.name;
    this.selectedCssFileSize = (file.size / 1024).toFixed(1) + ' KB';
    
    // Automatically populate Tag Name immediately from chosen file
    const displayName = file.name.replace(/\.download$/i, '').replace(/\.css$/i, '');
    this.tagForm.name = `Stylesheet: ${displayName}`;
    this.tagForm.tagType = 'link_stylesheet';
    this.tagForm.content = `/* Upload pending: ${file.name} (${this.selectedCssFileSize}) */`;

    // Clear input so selecting the same file again triggers change event
    if (event.target) event.target.value = '';
  }

  /**
   * Handles local JavaScript file selection for single file injection.
   * Automatically populates the tag name and prepares the file for unified single-step upload & save.
   */
  onJsFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const cleanName = lowerName.endsWith('.download') ? lowerName.substring(0, lowerName.length - 9) : lowerName;
    if (!cleanName.endsWith('.js')) {
      this.toast.error('Please select a valid JavaScript file (.js or .js.download).');
      return;
    }
    this.selectedJsFile = file;
    this.selectedJsFileName = file.name;
    this.selectedJsFileSize = (file.size / 1024).toFixed(1) + ' KB';

    // Automatically populate Tag Name immediately from chosen file
    const displayName = file.name.replace(/\.download$/i, '').replace(/\.js$/i, '');
    this.tagForm.name = `Script: ${displayName}`;
    this.tagForm.tagType = this.tagFormZone === 'footer' ? 'footer_script_url' : 'script_url';
    this.tagForm.content = `/* Upload pending: ${file.name} (${this.selectedJsFileSize}) */`;

    // Clear input so selecting the same file again triggers change event
    if (event.target) event.target.value = '';
  }

  /**
   * Applies a popular 1-click CDN framework or icon preset.
   */
  applyFrameworkPreset(preset: any): void {
    this.tagForm.name = preset.name;
    this.tagForm.tagType = preset.tagType;
    this.tagForm.content = preset.content;
    this.toast.success(`Applied ${preset.name} CDN template!`);
  }

  /**
   * Copies the generated CDN URL to the clipboard.
   */
  copyCdnUrl(url: string): void {
    if (!url) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.toast.success('CDN URL copied to clipboard!');
      }).catch(() => {
        this.toast.info(`CDN URL: ${url}`);
      });
    } else {
      this.toast.info(`CDN URL: ${url}`);
    }
  }

  /**
   * Uploads the selected CSS file to CDN Object Storage and links it.
   * Pre-scans the file locally in browser memory to guarantee zero malicious payloads reach storage.
   */
  uploadAndLinkCssFile(): void {
    if (!this.selectedCssFile) {
      this.toast.error('Please choose a .css file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const cssContent = reader.result as string;
      this.securityScanner.scanAndExecute({
        title: `Stylesheet: ${this.selectedCssFileName}`,
        category: 'CSS File Upload',
        html: '',
        css: cssContent,
        onConfirmSave: () => this.executeUploadAndLinkCss()
      });
    };
    reader.onerror = () => {
      this.toast.error('Failed to read CSS file from local disk.');
    };
    reader.readAsText(this.selectedCssFile);
  }

  private executeUploadAndLinkCss(): void {
    if (!this.selectedCssFile) return;

    this.uploadingCss = true;
    const formData = new FormData();
    formData.append('file', this.selectedCssFile);

    this.api.post<any>('ContentApi/upload-css', formData).subscribe({
      next: (res) => {
        this.uploadingCss = false;
        const url = res?.data?.url;
        const storage = res?.data?.storage || 'CDN Delivery';
        if (url) {
          this.uploadedCssUrl = url;
          this.uploadedCssStorage = storage;
          this.tagForm.content = `<link rel="stylesheet" href="${url}" />`;
          this.tagForm.name = `Stylesheet: ${this.selectedCssFileName.replace(/\.download$/i, '')}`;
          this.tagForm.tagType = 'link_stylesheet';
          this.toast.success('Stylesheet uploaded to CDN and linked!');
        } else {
          this.toast.error('Failed to resolve uploaded CSS URL.');
        }
      },
      error: (err) => {
        this.uploadingCss = false;
        this.resetCssUploadState();
        const errMsg = err?.error?.message || err?.message || 'Unable to proceed.';
        this.toast.error(errMsg);
      }
    });
  }

  /**
   * Uploads the selected JavaScript file to CDN Object Storage and links it.
   * Pre-scans the script locally in browser memory to guarantee zero dangerous executions reach storage.
   */
  uploadAndLinkJsFile(): void {
    if (!this.selectedJsFile) {
      this.toast.error('Please choose a .js file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const jsContent = reader.result as string;
      this.securityScanner.scanAndExecute({
        title: `Script: ${this.selectedJsFileName}`,
        category: 'JavaScript File Upload',
        html: '',
        js: jsContent,
        onConfirmSave: () => this.executeUploadAndLinkJs()
      });
    };
    reader.onerror = () => {
      this.toast.error('Failed to read JavaScript file from local disk.');
    };
    reader.readAsText(this.selectedJsFile);
  }

  private executeUploadAndLinkJs(): void {
    if (!this.selectedJsFile) return;

    this.uploadingJs = true;
    const formData = new FormData();
    formData.append('file', this.selectedJsFile);

    this.api.post<any>('ContentApi/upload-js', formData).subscribe({
      next: (res) => {
        this.uploadingJs = false;
        const url = res?.data?.url;
        const storage = res?.data?.storage || 'CDN Delivery';
        if (url) {
          this.uploadedJsUrl = url;
          this.uploadedJsStorage = storage;
          const cleanName = this.selectedJsFileName.replace(/\.download$/i, '');
          const isFooter = this.tagFormZone === 'footer';
          this.tagForm.content = isFooter 
            ? `<script src="${url}"></script>` 
            : `<script src="${url}" defer></script>`;
          this.tagForm.name = `Script: ${cleanName}`;
          this.tagForm.tagType = isFooter ? 'footer_script_url' : 'script_url';
          this.toast.success('JavaScript script uploaded to CDN and linked!');
        } else {
          this.toast.error('Failed to resolve uploaded JS URL.');
        }
      },
      error: (err) => {
        this.uploadingJs = false;
        this.resetJsUploadState();
        const errMsg = err?.error?.message || err?.message || 'Unable to proceed.';
        this.toast.error(errMsg);
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
      const cleanName = this.selectedCssFileName.replace(/\.download$/i, '');
      this.tagForm.content = `<style>\n  /* Source: ${cleanName} */\n${cssText}\n</style>`;
      this.tagForm.name = `Custom CSS: ${cleanName}`;
      this.tagForm.tagType = 'inline_css';
      this.toast.success(`Imported ${cleanName} into inline <style>!`);
    };
    reader.onerror = () => {
      this.toast.error('Failed to read CSS file from disk.');
    };
    reader.readAsText(this.selectedCssFile);
  }

  /**
   * Reads the selected JavaScript file and embeds its raw contents into an inline <script> tag.
   */
  importJsAsInlineScript(): void {
    if (!this.selectedJsFile) {
      this.toast.error('Please choose a .js file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const jsText = reader.result as string;
      const cleanName = this.selectedJsFileName.replace(/\.download$/i, '');
      this.tagForm.content = `<script>\n  /* Source: ${cleanName} */\n${jsText}\n</script>`;
      this.tagForm.name = `Custom JS: ${cleanName}`;
      this.tagForm.tagType = 'inline_js';
      this.toast.success(`Imported ${cleanName} into inline <script>!`);
    };
    reader.onerror = () => {
      this.toast.error('Failed to read JavaScript file from disk.');
    };
    reader.readAsText(this.selectedJsFile);
  }

  /**
   * Opens the dedicated Bulk Asset Upload modal for uploading and auto-injecting multiple stylesheets/scripts.
   * @param zone Optional initial zone ('head', 'body_open', 'footer'). Defaults to 'head'.
   */
  openBulkUploadModal(zone?: 'head' | 'body_open' | 'footer'): void {
    if (zone) this.bulkUploadZone = zone;
    this.bulkUploadFiles = [];
    this.uploadingBulk = false;
    this.bulkUploadSuiteCode = this.getActiveSuiteCode() || 'global';
    this.showBulkUploadModal = true;
  }

  /**
   * Closes the Bulk Asset Upload modal and clears the upload queue.
   */
  closeBulkUploadModal(): void {
    if (this.uploadingBulk) return;
    this.showBulkUploadModal = false;
    this.bulkUploadFiles = [];
    this.uploadingBulk = false;
  }

  /**
   * Handles multi-file selection from standard HTML file input.
   */
  onBulkFilesSelected(event: any): void {
    const files: FileList | null = event.target.files;
    if (!files || files.length === 0) return;
    this.addFilesToBulkQueue(Array.from(files));
    if (event.target) event.target.value = '';
  }

  /**
   * Handles drag-and-drop file drop onto the bulk upload dropzone.
   */
  onBulkFilesDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.addFilesToBulkQueue(Array.from(files));
  }

  /**
   * Prevents default browser dragover behavior on the dropzone.
   */
  onBulkDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Adds valid .css, .js, and font files (.woff2, .woff, .ttf, .otf, .eot, .svg) to the bulk queue,
   * auto-deriving the Tag Name from the filename before the first dot.
   * Example: 'animate.min.css' -> 'animate', 'bexon-icons.css' -> 'bexon-icons', 'bootstrap.min.css' -> 'bootstrap'.
   */
  /**
   * Derives a clean, intuitive tag name from an uploaded file name by stripping common
   * technical extensions (.min.js, .min.css, .bundle.js, .download, etc.) while preserving the full library name.
   * e.g. jquery.magnific-popup.min.js -> jquery.magnific-popup, swiper-bundle.min.js -> swiper-bundle
   */
  deriveTagNameFromFileName(filename: string): string {
    if (!filename) return 'asset';
    let clean = filename.trim();
    if (clean.toLowerCase().endsWith('.download')) {
      clean = clean.substring(0, clean.length - 9);
    }
    const extPatterns = [
      /\.bundle\.min\.(js|css)$/i,
      /\.min\.(js|css)$/i,
      /\.bundle\.(js|css)$/i,
      /\.(js|css|woff2|woff|ttf|otf|eot|svg)$/i
    ];
    for (const pat of extPatterns) {
      if (pat.test(clean)) {
        clean = clean.replace(pat, '');
        break;
      }
    }
    return clean.trim() || filename;
  }

  addFilesToBulkQueue(files: File[]): void {
    let addedCount = 0;
    for (const f of files) {
      const lowerName = f.name.toLowerCase();
      // Normalize .download extension (e.g. main.js.download -> main.js)
      const cleanExt = lowerName.endsWith('.download') ? lowerName.substring(0, lowerName.length - 9) : lowerName;
      const isValid = cleanExt.endsWith('.css') || cleanExt.endsWith('.js') || 
                      cleanExt.endsWith('.woff2') || cleanExt.endsWith('.woff') || 
                      cleanExt.endsWith('.ttf') || cleanExt.endsWith('.otf') || 
                      cleanExt.endsWith('.eot') || cleanExt.endsWith('.svg');

      if (!isValid) {
        this.toast.warning(`Skipped '${f.name}': only .css, .js (including .js.download), and font files (.woff2, .woff, .ttf, .otf, .eot, .svg) are supported.`);
        continue;
      }

      // Auto-naming rule: Strip technical extensions (.min.js, .bundle.css, .download) to preserve full library identity
      const derivedName = this.deriveTagNameFromFileName(f.name);

      this.bulkUploadFiles.push({
        file: f,
        name: derivedName,
        size: (f.size / 1024).toFixed(1) + ' KB',
        status: 'pending'
      });
      addedCount++;
    }

    if (addedCount > 0) {
      this.toast.info(`Added ${addedCount} file(s) to upload queue.`);
    }
  }

  /**
   * Removes a specific file from the bulk upload queue by index.
   */
  removeBulkFile(index: number): void {
    if (this.uploadingBulk) return;
    this.bulkUploadFiles.splice(index, 1);
  }

  /**
   * Clears all files currently queued for bulk upload.
   */
  clearBulkQueue(): void {
    if (this.uploadingBulk) return;
    this.bulkUploadFiles = [];
  }

  /**
   * Executes bulk upload of all queued files to Cloudflare R2 and injects corresponding code tags.
   * Pre-scans all text-based assets (.css, .js) locally before sending them to the backend.
   */
  executeBulkUpload(): void {
    if (this.bulkUploadFiles.length === 0) {
      this.toast.warning('Please select at least one file to upload.');
      return;
    }

    const textFiles = this.bulkUploadFiles.filter(item => {
      const lower = item.file.name.toLowerCase();
      return lower.endsWith('.css') || lower.endsWith('.css.download') || lower.endsWith('.js') || lower.endsWith('.js.download');
    });

    if (textFiles.length === 0) {
      this.performBulkUpload();
      return;
    }

    let combinedCss = '';
    let combinedJs = '';
    const readPromises = textFiles.map(item => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          const lower = item.file.name.toLowerCase();
          if (lower.includes('.js')) {
            combinedJs += `\n/* File: ${item.file.name} */\n` + content;
          } else {
            combinedCss += `\n/* File: ${item.file.name} */\n` + content;
          }
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsText(item.file);
      });
    });

    Promise.all(readPromises).then(() => {
      this.securityScanner.scanAndExecute({
        title: `Bulk Upload: ${this.bulkUploadFiles.length} Assets`,
        category: 'Bulk Code Injections',
        html: '',
        css: combinedCss,
        js: combinedJs,
        onConfirmSave: () => this.performBulkUpload()
      });
    });
  }

  private performBulkUpload(): void {
    this.uploadingBulk = true;
    this.bulkUploadFiles.forEach(f => f.status = 'uploading');

    const formData = new FormData();
    this.bulkUploadFiles.forEach(item => {
      formData.append('files', item.file);
      formData.append('names', (item.name || '').trim());
    });
    formData.append('zone', this.bulkUploadZone);
    formData.append('suiteCode', this.bulkUploadSuiteCode || 'global');
    formData.append('startSortOrder', this.bulkUploadStartSort.toString());
    formData.append('sortIncrement', this.bulkUploadSortIncrement.toString());

    this.api.post<any>('ContentApi/code-injections/bulk-upload', formData).subscribe({
      next: (res) => {
        this.uploadingBulk = false;
        this.bulkUploadFiles.forEach(f => f.status = 'success');
        this.toast.success(res?.message || `${this.bulkUploadFiles.length} asset(s) uploaded and injected successfully!`);
        this.loadAllCodeInjections();
        setTimeout(() => {
          this.closeBulkUploadModal();
        }, 1200);
      },
      error: (err) => {
        this.uploadingBulk = false;
        this.bulkUploadFiles.forEach(f => {
          if (f.status === 'uploading') f.status = 'error';
        });
        const msg = err?.error?.message || err?.error || err?.message || 'Bulk upload failed.';
        this.toast.error(typeof msg === 'string' ? msg : 'Bulk upload failed.');
      }
    });
  }

  /**
   * Opens the in-browser Asset Content Editor (Modal 11) to inspect and edit raw CSS/JS file contents.
   * @param tag The CodeInjectionTag entity to edit.
   */
  openAssetEditor(tag: any): void {
    this.editingAssetTag = tag;
    this.editingAssetContent = '';
    this.editingAssetUrl = '';
    this.editingAssetIsCdn = false;
    this.loadingAssetContent = true;
    this.showAssetEditorModal = true;

    this.api.get<any>(`ContentApi/code-injections/${tag.id}/raw-content`).subscribe({
      next: (res) => {
        this.loadingAssetContent = false;
        if (res?.data) {
          this.editingAssetContent = res.data.rawContent || '';
          this.editingAssetUrl = res.data.assetUrl || '';
          this.editingAssetIsCdn = !!res.data.isExternalCdn;
        }
      },
      error: (err) => {
        this.loadingAssetContent = false;
        this.toast.error('Failed to fetch asset content: ' + (err?.error?.message || err?.message));
      }
    });
  }

  /**
   * Closes the Asset Content Editor modal.
   */
  closeAssetEditorModal(): void {
    if (this.savingAssetContent) return;
    this.showAssetEditorModal = false;
    this.editingAssetTag = null;
    this.editingAssetContent = '';
    this.editingAssetUrl = '';
  }

  /**
   * Saves the edited asset text back to Cloudflare R2 / tag content.
   * Runs pre-flight security inspection before persisting changes.
   */
  saveAssetContent(): void {
    if (!this.editingAssetTag) return;

    const isJs = (this.editingAssetTag.tagType || '').includes('script') || (this.editingAssetTag.tagType || '').includes('js');
    this.securityScanner.scanAndExecute({
      title: `Asset: ${this.editingAssetTag.name}`,
      category: isJs ? 'JavaScript Asset' : 'CSS Stylesheet',
      html: '',
      css: !isJs ? this.editingAssetContent : '',
      js: isJs ? this.editingAssetContent : '',
      onConfirmSave: () => this.executeSaveAssetContent()
    });
  }

  private executeSaveAssetContent(): void {
    if (!this.editingAssetTag) return;

    this.savingAssetContent = true;
    this.api.put<any>(`ContentApi/code-injections/${this.editingAssetTag.id}/save-asset-content`, {
      rawContent: this.editingAssetContent
    }).subscribe({
      next: (res) => {
        this.savingAssetContent = false;
        this.toast.success(res?.message || 'Asset file updated and published to CDN successfully!');
        this.loadAllCodeInjections();
        this.closeAssetEditorModal();
      },
      error: (err) => {
        this.savingAssetContent = false;
        this.toast.error('Failed to save asset: ' + (err?.error?.message || err?.message));
      }
    });
  }

  /**
   * Copies text or font snippets to clipboard.
   * @param text String to copy.
   * @param label Descriptive label for toast.
   */
  copyFontSnippet(text: string, label: string = 'Font Snippet'): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast.success(`${label} copied to clipboard!`);
    }).catch(() => {
      this.toast.info(text);
    });
  }

  /**
   * Inserts an @font-face rule for a selected font directly into the currently edited asset.
   * @param font The uploaded font entity.
   */
  insertFontSnippetIntoAsset(font: any): void {
    if (!font || !font.fontFaceSnippet) return;
    const snippet = `/* ==========================================\n   Custom Font: ${font.fontFamilyName}\n   ========================================== */\n${font.fontFaceSnippet}\n\n`;
    this.editingAssetContent = snippet + this.editingAssetContent;
    this.toast.success(`Inserted @font-face for '${font.fontFamilyName}' at top of stylesheet.`);
  }

  /**
   * Opens the Font Upload Management modal (Modal 12).
   */
  openFontUploadModal(): void {
    this.showFontUploadModal = true;
  }

  /**
   * Closes the Font Upload Management modal.
   */
  closeFontUploadModal(): void {
    if (this.uploadingFonts) return;
    this.showFontUploadModal = false;
  }

  /**
   * Handles multi-file font uploads to Cloudflare R2 storage.
   * @param event File input change event.
   */
  onFontFilesSelected(event: any): void {
    const files: FileList | null = event.target.files;
    if (!files || files.length === 0) return;

    this.uploadingFonts = true;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    this.api.post<any>('ContentApi/fonts/upload', formData).subscribe({
      next: (res) => {
        this.uploadingFonts = false;
        if (Array.isArray(res?.data)) {
          this.uploadedFonts.push(...res.data);
        }
        this.toast.success(res?.message || `${files.length} font file(s) uploaded to CDN!`);
        if (event.target) event.target.value = '';
      },
      error: (err) => {
        this.uploadingFonts = false;
        this.toast.error('Font upload failed: ' + (err?.error?.message || err?.message));
      }
    });
  }

  /**
   * Checks if a singleton tag type already exists in the specified zone.
   */
  getExistingSingletonTag(tagType: string, zone?: string): CodeInjectionTag | undefined {
    const activeZone = (zone || this.tagFormZone) as 'head' | 'body_open' | 'footer';
    const singletons = this.singletonTagTypes[activeZone] || [];
    if (!singletons.includes(tagType)) return undefined;

    const list = activeZone === 'head' ? this.headTags : activeZone === 'body_open' ? this.bodyOpenTags : this.footerTags;
    return list.find(t => t.tagType === tagType && (!this.isEditingTag || t.id !== this.tagForm.id));
  }

  /**
   * Gets the existing singleton tag matching the currently selected tagType in the current zone.
   */
  get currentZoneExistingSingleton(): CodeInjectionTag | undefined {
    if (this.isEditingTag) return undefined;
    return this.getExistingSingletonTag(this.tagForm.tagType, this.tagFormZone);
  }

  /**
   * Switches the active modal directly into edit mode for an existing singleton tag.
   */
  switchToEditSingleton(tag: CodeInjectionTag): void {
    this.openEditTagModal(tag);
    this.toast.info(`Switched to editing existing '${tag.name}'.`);
  }

  /**
   * Submits the tag form.
   * If a local CSS or JS file was chosen, executes a unified single-step workflow:
   * runs the pre-flight security scan ONCE, uploads the file to Cloudflare CDN,
   * generates the link/script tag, and saves the injection directly to the database.
   */
  saveTag(): void {
    // 1. Auto-fill name if missing when a file is selected
    if (this.selectedCssFile && !this.tagForm.name?.trim()) {
      const displayName = this.selectedCssFileName.replace(/\.download$/i, '').replace(/\.css$/i, '');
      this.tagForm.name = `Stylesheet: ${displayName}`;
    } else if (this.selectedJsFile && !this.tagForm.name?.trim()) {
      const displayName = this.selectedJsFileName.replace(/\.download$/i, '').replace(/\.js$/i, '');
      this.tagForm.name = `Script: ${displayName}`;
    }

    if (!this.tagForm.name?.trim()) {
      this.toast.error('Please enter a tag name.');
      return;
    }

    if (!this.selectedCssFile && !this.selectedJsFile && !this.tagForm.content?.trim()) {
      this.toast.error('Please enter snippet content or choose a file.');
      return;
    }

    // 2. Singleton Duplicate Guard
    if (!this.isEditingTag) {
      const existing = this.getExistingSingletonTag(this.tagForm.tagType, this.tagFormZone);
      if (existing) {
        this.toast.warning(`A '${this.getTagTypeLabel(this.tagForm.tagType)}' tag already exists in the ${this.getZoneShortTitle(this.tagFormZone)} zone. You cannot add it twice.`);
        return;
      }
    }

    // 3. Single-step upload & save for CSS file: Pre-flight scan ONCE, then upload to CDN and save DB
    if (this.selectedCssFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const cssContent = reader.result as string;
        this.securityScanner.scanAndExecute({
          title: `Stylesheet: ${this.selectedCssFileName}`,
          category: `${this.getZoneShortTitle(this.tagFormZone)} CSS Upload`,
          html: '',
          css: cssContent,
          js: '',
          onConfirmSave: () => this.executeUploadAndSaveCssTag()
        });
      };
      reader.onerror = () => {
        this.toast.error('Failed to read CSS file from local disk.');
      };
      reader.readAsText(this.selectedCssFile);
      return;
    }

    // 4. Single-step upload & save for JS file: Pre-flight scan ONCE, then upload to CDN and save DB
    if (this.selectedJsFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const jsContent = reader.result as string;
        this.securityScanner.scanAndExecute({
          title: `Script: ${this.selectedJsFileName}`,
          category: `${this.getZoneShortTitle(this.tagFormZone)} JS Upload`,
          html: '',
          css: '',
          js: jsContent,
          onConfirmSave: () => this.executeUploadAndSaveJsTag()
        });
      };
      reader.onerror = () => {
        this.toast.error('Failed to read JavaScript file from local disk.');
      };
      reader.readAsText(this.selectedJsFile);
      return;
    }

    // 5. Standard Tag Save (Pre-flight scan once)
    const tagTypeLower = (this.tagForm.tagType || '').toLowerCase();
    const isCss = tagTypeLower.includes('css') || tagTypeLower.includes('stylesheet');
    const isJs = tagTypeLower.includes('script') || tagTypeLower.includes('js');

    this.securityScanner.scanAndExecute({
      title: `Tag: ${this.tagForm.name.trim()}`,
      category: `${this.getZoneShortTitle(this.tagFormZone)} Injection`,
      html: (!isCss && !isJs) ? this.tagForm.content : '',
      css: isCss ? this.tagForm.content : '',
      js: isJs ? this.tagForm.content : '',
      onConfirmSave: () => this.executeSaveTag()
    });
  }

  /**
   * Uploads the selected CSS file to CDN and atomically saves the code injection tag to the database.
   */
  private executeUploadAndSaveCssTag(): void {
    if (!this.selectedCssFile) return;

    this.uploadingCss = true;
    this.savingTag = true;
    const formData = new FormData();
    formData.append('file', this.selectedCssFile);

    this.api.post<any>('ContentApi/upload-css', formData).subscribe({
      next: (res) => {
        const url = res?.data?.url;
        if (url) {
          this.uploadedCssUrl = url;
          this.uploadedCssStorage = res?.data?.storage || 'CDN Delivery';
          this.tagForm.content = `<link rel="stylesheet" href="${url}" />`;
          this.tagForm.tagType = 'link_stylesheet';
          this.tagForm.zone = this.tagFormZone;

          this.persistTagToDatabase(`Stylesheet '${this.tagForm.name}' uploaded to CDN and saved.`);
        } else {
          this.uploadingCss = false;
          this.savingTag = false;
          this.toast.error('Failed to resolve uploaded CSS URL.');
        }
      },
      error: (err) => {
        this.uploadingCss = false;
        this.savingTag = false;
        const errMsg = err?.error?.message || err?.message || 'Unable to proceed.';
        this.toast.error(errMsg);
      }
    });
  }

  /**
   * Uploads the selected JS file to CDN and atomically saves the code injection tag to the database.
   */
  private executeUploadAndSaveJsTag(): void {
    if (!this.selectedJsFile) return;

    this.uploadingJs = true;
    this.savingTag = true;
    const formData = new FormData();
    formData.append('file', this.selectedJsFile);

    this.api.post<any>('ContentApi/upload-js', formData).subscribe({
      next: (res) => {
        const url = res?.data?.url;
        if (url) {
          this.uploadedJsUrl = url;
          this.uploadedJsStorage = res?.data?.storage || 'CDN Delivery';
          const isFooter = this.tagFormZone === 'footer';
          this.tagForm.content = isFooter 
            ? `<script src="${url}"></script>` 
            : `<script src="${url}" defer></script>`;
          this.tagForm.tagType = isFooter ? 'footer_script_url' : 'script_url';
          this.tagForm.zone = this.tagFormZone;

          this.persistTagToDatabase(`Script '${this.tagForm.name}' uploaded to CDN and saved.`);
        } else {
          this.uploadingJs = false;
          this.savingTag = false;
          this.toast.error('Failed to resolve uploaded JS URL.');
        }
      },
      error: (err) => {
        this.uploadingJs = false;
        this.savingTag = false;
        const errMsg = err?.error?.message || err?.message || 'Unable to proceed.';
        this.toast.error(errMsg);
      }
    });
  }

  private executeSaveTag(): void {
    const successMsg = this.isEditingTag 
      ? `Tag '${this.tagForm.name}' updated.`
      : `Tag '${this.tagForm.name}' injected into ${this.getZoneShortTitle(this.tagFormZone)}.`;
    this.persistTagToDatabase(successMsg);
  }

  /**
   * Persists tagForm to the database via ContentApi, displays success feedback, and reloads tag registry.
   */
  private persistTagToDatabase(successMsg: string): void {
    this.savingTag = true;
    this.tagForm.zone = this.tagFormZone;

    if (this.isEditingTag) {
      this.api.put<any>(`ContentApi/code-injections/${this.tagForm.id}`, this.tagForm).subscribe({
        next: () => {
          this.savingTag = false;
          this.uploadingCss = false;
          this.uploadingJs = false;
          this.resetCssUploadState();
          this.resetJsUploadState();
          this.toast.success(successMsg);
          this.closeTagModal();
          this.loadAllCodeInjections();
        },
        error: (err) => {
          this.savingTag = false;
          this.uploadingCss = false;
          this.uploadingJs = false;
          const msg = err?.error?.message || 'Failed to update tag.';
          this.toast.error(msg);
        }
      });
    } else {
      this.api.post<any>('ContentApi/code-injections', this.tagForm).subscribe({
        next: () => {
          this.savingTag = false;
          this.uploadingCss = false;
          this.uploadingJs = false;
          this.resetCssUploadState();
          this.resetJsUploadState();
          this.toast.success(successMsg);
          this.closeTagModal();
          this.loadAllCodeInjections();
        },
        error: (err) => {
          this.savingTag = false;
          this.uploadingCss = false;
          this.uploadingJs = false;
          const msg = err?.error?.message || 'Failed to save tag.';
          this.toast.error(msg);
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

          // Infer currently active theme suite
          const activeItem = this.installedTemplates.find(t => t.badge === 'Active' && (t.category === 'menu' || t.category === 'hero' || t.category === 'footer')) ||
                             this.installedTemplates.find(t => t.badge === 'Active');
          if (activeItem) {
            this.activeThemeSuiteName = activeItem.groupName || 'Corporate Suite';
            this.activeThemeSuiteCode = activeItem.groupCode || 'suite_corporate';
            if (this.selectedGroup === 'all') {
              this.selectedThemeSuiteToActivate = this.activeThemeSuiteCode;
            }
          } else {
            const suites = this.getAvailableSuites();
            if (suites.length > 0) {
              this.activeThemeSuiteName = suites[0].name;
              this.activeThemeSuiteCode = suites[0].code;
              if (this.selectedGroup === 'all') {
                this.selectedThemeSuiteToActivate = suites[0].code;
              }
            }
          }

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

    // Extract dynamic Suite Code and Name from variantCode, templateKey, or name
    const vCode = (apiT.variantCode || apiT.templateKey || '').toUpperCase();
    const tKey = (apiT.templateKey || '').toUpperCase();
    const rawName = (apiT.name || '').trim();

    let groupCode = 'suite_corporate';
    let groupName = 'Corporate Suite';

    if (vCode.includes('SUITE_APEXMODERN') || tKey.includes('SUITE_APEXMODERN') || rawName.toUpperCase().includes('APEX MODERN')) {
      groupCode = 'suite_apexmodern';
      groupName = 'Apex Modern Theme';
    } else {
      // Robust detection: Match SUITE_([A-Z0-9]+) anywhere in variant code or template key (e.g., BODY_SUITE_PINCRETTHE_...)
      const match = vCode.match(/SUITE_([A-Z0-9]+)/) || tKey.match(/SUITE_([A-Z0-9]+)/);
      if (match) {
        const rawTag = match[1].toLowerCase();
        groupCode = `suite_${rawTag}`;

        // Extract clean theme suite name from template name (e.g. "Pincret Theme 1. Agreement..." -> "Pincret Theme")
        const nameMatch = rawName.match(/^(.+?\b(?:Theme|Suite|Pro|Portal)\b)/i);
        if (nameMatch) {
          groupName = nameMatch[1].trim();
        } else {
          groupName = rawTag.charAt(0).toUpperCase() + rawTag.slice(1) + ' Theme';
        }
      } else if (rawName.toUpperCase().includes('CORPORATE')) {
        groupCode = 'suite_corporate';
        groupName = 'Corporate Suite';
      }
    }

    const rawId = apiT.id || apiT.Id || '';
    const rawVariant = apiT.variantCode || apiT.VariantCode || apiT.templateKey || apiT.TemplateKey || '';
    const rawKey = apiT.templateKey || apiT.TemplateKey || rawVariant;

    return {
      id: rawKey || rawVariant || rawId,
      dbId: rawId,
      name: apiT.name || apiT.Name || 'Untitled Template',
      category: cat,
      variantCode: rawVariant || 'Section_Custom',
      badge: apiT.isActive ? 'Active' : meta.badge,
      tag: cat,
      groupCode: groupCode,
      groupName: groupName,
      description: apiT.description || apiT.Description || `${apiT.name || rawVariant} component blueprint installed in tenant database.`,
      thumbnailGradient: meta.gradient,
      previewIcon: meta.icon,
      previewSubtitle: meta.subtitle,
      previewTitle: apiT.name || rawVariant,
      previewBody: apiT.description || apiT.Description || 'Tenant component template block.',
      htmlTemplate: apiT.htmlTemplate || apiT.HtmlTemplate || '',
      cssStyles: apiT.cssStyles || apiT.CssStyles || '',
      jsScript: apiT.jsScript || apiT.JsScript || '',
      version: apiT.installedVersion || apiT.InstalledVersion || '1.0.0',
      installedUtc: apiT.installedUtc || apiT.InstalledUtc || new Date().toISOString(),
      isCustomized: apiT.isCustomized ?? apiT.IsCustomized,
      isDefault: apiT.isDefault ?? apiT.IsDefault ?? false,
      defaultContentJson: apiT.defaultContentJson || apiT.DefaultContentJson
    };
  }

  private getCategoryVisualMeta(cat: string): { icon: string; gradient: string; badge: string; subtitle: string } {
    switch ((cat || '').toLowerCase()) {
      case 'menu':
        return { icon: 'menu', gradient: 'linear-gradient(135deg, #0050e5 0%, #1e40af 100%)', badge: 'Navbar', subtitle: 'Navigation' };
      case 'hero':
        return { icon: 'view_carousel', gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', badge: 'Hero', subtitle: 'Hero Banner' };
      case 'faq':
        return { icon: 'quiz', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', badge: 'FAQ', subtitle: 'Accordion' };
      case 'marquee':
        return { icon: 'linear_scale', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', badge: 'Ticker', subtitle: 'Marquee' };
      case 'contact':
      case 'contactus':
        return { icon: 'contact_mail', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', badge: 'Contact', subtitle: 'Contact Form' };
      case 'breadcrumb':
        return { icon: 'alt_route', gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', badge: 'Breadcrumb', subtitle: 'Page Banner' };
      case 'footer':
        return { icon: 'dock_to_bottom', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', badge: 'Footer', subtitle: 'Page Footer' };
      case 'blog':
      case 'article':
        return { icon: 'newspaper', gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', badge: 'Articles', subtitle: 'News & Insights' };
      case 'blog_detail':
      case 'blog-detail':
        return { icon: 'article', gradient: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', badge: 'Editorial', subtitle: 'Article Detail' };
      case 'newsletter':
        return { icon: 'mail', gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', badge: 'Newsletter', subtitle: 'Subscription Bar' };
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

  /**
   * Returns all installed content section templates belonging strictly to the 'body' category,
   * isolating them from header navigation, hero banners, footers, breadcrumbs, ecommerce, and single-article blog details.
   * @returns Array of installed body template items.
   */
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
      t.category === 'body' &&
      !this.isBlogDetailTemplate(t) &&
      t.variantCode !== 'Breadcrumb_PageHeader'
    );
  }

  /**
   * Returns the curated sequence of body sections that belong specifically on the Home page.
   * Strictly isolates sections belonging to the active theme suite and limits to top 5 showcase blocks.
   * @returns Array of body blocks designated for the Home page.
   */
  getHomeBodyBlocks(): InstalledTemplateItem[] {
    const activeSuiteCode = this.selectedGroup !== 'all' ? this.selectedGroup : this.selectedThemeSuiteToActivate;
    const suiteItems = this.getAllBodyBlocks().filter(t => 
      ((t.groupCode || 'suite_corporate') === activeSuiteCode || t.badge === 'Active') &&
      t.variantCode !== 'Body_RequestService' &&
      t.variantCode !== 'Contact_SplitDetails'
    );
    return suiteItems.slice(0, 5);
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

    if (this.singletonCategories.includes(item.category)) {
      this.installedTemplates.forEach(t => {
        if (t.category === item.category) {
          t.badge = (t.id === item.id) ? 'Active' : this.getCategoryVisualMeta(t.category).badge;
        }
      });
    }

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
      const code = t.groupCode || 'suite_corporate';
      const name = t.groupName || 'Corporate Suite';
      if (!map.has(code)) {
        map.set(code, { code, name, count: 0 });
      }
      map.get(code)!.count++;
    });
    return Array.from(map.values());
  }

  /**
   * Returns the canonical suite code of the currently active live theme.
   */
  getActiveSuiteCode(): string {
    const activeSuite = this.getAvailableSuites().find(s => s.code === this.activeThemeSuiteCode || s.name === this.activeThemeSuiteName);
    return activeSuite ? activeSuite.code : (this.activeThemeSuiteCode || 'suite_corporate');
  }

  /**
   * Checks whether the currently selected theme suite in the dropdown is already the live active suite.
   */
  isCurrentThemeSuiteActive(): boolean {
    if (!this.selectedThemeSuiteToActivate) return true;
    return this.selectedThemeSuiteToActivate === this.getActiveSuiteCode();
  }

  /**
   * Handles user changing the theme suite select dropdown.
   * @param suiteCode The selected suite code from the dropdown.
   */
  onSuiteDropdownChange(suiteCode: string): void {
    this.selectedThemeSuiteToActivate = suiteCode;
  }

  /**
   * Computes the display name of the theme suite currently rendering the simulated live demo.
   */
  getDemoActiveThemeName(): string {
    const activeSuite = this.getAvailableSuites().find(s => s.name === this.activeThemeSuiteName || s.code === this.activeThemeSuiteCode);
    const suiteCode = (this.selectedGroup && this.selectedGroup !== 'all')
      ? this.selectedGroup
      : (activeSuite ? activeSuite.code : (this.selectedThemeSuiteToActivate || 'suite_corporate'));
    const matched = this.getAvailableSuites().find(s => s.code === suiteCode);
    return matched ? matched.name : (this.activeThemeSuiteName || 'Active Theme');
  }

  /**
   * Toggles the vault options/maintenance dropdown.
   * @param event The mouse click event.
   */
  toggleVaultSettingsDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showVaultSettingsDropdown = !this.showVaultSettingsDropdown;
  }

  /**
   * Triggers the reinstall defaults modal from the dropdown.
   */
  onMenuReinstallDefaults(): void {
    this.showVaultSettingsDropdown = false;
    this.openReinstallDefaultsModal();
  }

  /**
   * Navigates to the dedicated Vault Maintenance & Purge page.
   */
  onMenuClearAll(): void {
    this.showVaultSettingsDropdown = false;
    this.router.navigate(['/content/console/templates/maintenance']);
  }

  /**
   * Closes dropdown menus when clicking anywhere outside.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showVaultSettingsDropdown) {
      this.showVaultSettingsDropdown = false;
    }
  }

  /**
   * Synchronizes both the vault tab filtering and the theme switcher dropdown when clicking a suite chip.
   * @param code The theme suite code or 'all'.
   */
  selectSuiteGroup(code: string): void {
    this.selectedGroup = code;
    if (code !== 'all') {
      this.selectedThemeSuiteToActivate = code;
    }
    this.applyFilters();
  }

  /**
   * Returns total template count for the active vault view filter.
   */
  getFilteredTemplatesCount(): number {
    if (this.selectedGroup === 'all') {
      return this.installedTemplates.length;
    }
    return this.installedTemplates.filter(t => (t.groupCode || 'suite_corporate') === this.selectedGroup).length;
  }

  /**
   * Activates all structural components of a theme suite in one atomic action.
   * Calls the backend activate-suite API to persist active state across the database.
   * @param suiteCode The unique identifier for the theme suite.
   */
  activateThemeSuite(suiteCode?: string): void {
    const code = suiteCode || this.selectedThemeSuiteToActivate;
    if (!code) return;

    const suiteItems = this.installedTemplates.filter(t => t.groupCode === code);
    const suiteName = suiteItems[0]?.groupName || 'Selected Theme Suite';

    this.activatingSuite = true;
    this.api.post<any>(`ContentApi/templates/activate-suite/${code}`, {}).subscribe({
      next: () => {
        this.activatingSuite = false;
        this.activeThemeSuiteName = suiteName;
        this.activeThemeSuiteCode = code;
        this.selectedThemeSuiteToActivate = code;

        // Synchronize local active IDs and badges
        this.installedTemplates.forEach(t => {
          if (this.singletonCategories.includes(t.category)) {
            if (t.groupCode === code) {
              t.badge = 'Active';
              if (t.category === 'menu') { this.activeMenuId = t.id; localStorage.setItem('oz_active_menu_id', t.id); }
              if (t.category === 'hero') { this.activeHeroId = t.id; localStorage.setItem('oz_active_hero_id', t.id); }
              if (t.category === 'footer') { this.activeFooterId = t.id; localStorage.setItem('oz_active_footer_id', t.id); }
              if (t.category === 'blog') { this.activeBlogId = t.id; localStorage.setItem('oz_active_blog_id', t.id); }
              if (t.category === 'breadcrumb') { this.activeBreadcrumbId = t.id; localStorage.setItem('oz_active_breadcrumb_id', t.id); }
              if (t.category === 'ecommerce') { this.activeEcommerceId = t.id; localStorage.setItem('oz_active_ecommerce_id', t.id); }
            } else {
              const meta = this.getCategoryVisualMeta(t.category);
              t.badge = meta.badge;
            }
          }
        });

        this.applyFilters();
        this.toast.success(`'${suiteName}' is now your live active website theme!`);
      },
      error: (err) => {
        this.activatingSuite = false;
        this.toast.error('Failed to activate theme suite: ' + (err?.message || 'Server error'));
      }
    });
  }

  /**
   * Adopts and activates all companion layout templates for a specified Theme Suite.
   * @param groupCode The unique code of the theme suite to adopt.
   */
  adoptSuite(groupCode: string): void {
    this.activateThemeSuite(groupCode);
  }

  // ========================================================
  // VAULT RESET & FACTORY DEFAULTS ACTIONS
  // ========================================================

  openClearAllModal(): void {
    this.showClearAllModal = true;
  }

  closeClearAllModal(): void {
    this.showClearAllModal = false;
  }

  confirmClearAll(): void {
    this.clearingVault = true;
    this.api.delete<any>('ContentApi/templates/clear-all').subscribe({
      next: (res) => {
        this.clearingVault = false;
        this.showClearAllModal = false;
        this.toast.success(res?.message || 'All templates and code injections cleared successfully.');
        this.loadInstalledTemplates();
        this.loadAllCodeInjections();
      },
      error: (err) => {
        this.clearingVault = false;
        this.toast.error('Failed to clear templates: ' + (err?.message || 'Server error'));
      }
    });
  }

  openReinstallDefaultsModal(): void {
    this.showReinstallDefaultsModal = true;
  }

  closeReinstallDefaultsModal(): void {
    this.showReinstallDefaultsModal = false;
  }

  /**
   * Restores only the 16 canonical Corporate Suite template blueprints and 3-zone code injection tags into the vault.
   * Does not create or alter any website pages, sections, blogs, or inquiry forms.
   */
  confirmRestoreTemplatesOnly(): void {
    this.reinstallingTemplatesOnly = true;
    this.reinstallingDefaults = true;

    this.api.post<any>('ContentApi/templates/reinstall-templates-only', {}).subscribe({
      next: (res) => {
        this.reinstallingTemplatesOnly = false;
        this.reinstallingDefaults = false;
        this.showReinstallDefaultsModal = false;
        this.toast.success(res?.message || 'Default Corporate Theme Suite templates and code injections restored.');
        this.loadInstalledTemplates();
        this.loadAllCodeInjections();
      },
      error: (err) => {
        this.reinstallingTemplatesOnly = false;
        this.reinstallingDefaults = false;
        this.toast.error('Failed to restore templates: ' + (err?.error?.message || err?.message || 'Server error'));
      }
    });
  }

  /**
   * Provisions the complete factory-default Corporate Suite website:
   * Installs all 16 template blueprints, 10 pre-assembled body sections, demo pages (About, Services, Contact, Blog),
   * rich blog posts, storefront products, and interactive inquiry forms.
   */
  confirmSeedFullSuite(): void {
    this.seedingFullSuite = true;
    this.reinstallingDefaults = true;

    this.api.post<any>('ContentApi/website/seed-default-suite', {}).subscribe({
      next: (res) => {
        this.seedingFullSuite = false;
        this.reinstallingDefaults = false;
        this.showReinstallDefaultsModal = false;
        this.toast.success(res?.message || 'Corporate Suite templates, 10 body sections, sample pages, and blogs initialized successfully!');
        this.loadInstalledTemplates();
        this.loadAllCodeInjections();
      },
      error: (err) => {
        this.seedingFullSuite = false;
        this.reinstallingDefaults = false;
        this.toast.error('Failed to initialize full suite: ' + (err?.error?.message || err?.message || 'Server error'));
      }
    });
  }

  /**
   * Legacy backward-compatible delegate for reinstalling defaults.
   */
  confirmReinstallDefaults(): void {
    this.confirmSeedFullSuite();
  }

  /**
   * Evaluates if a template's category matches the target category filter,
   * accounting for canonical keys and consolidated legacy aliases (e.g. ecommerce/bodysections into body).
   * @param itemCat The template's category key.
   * @param filterCat The active filter category key.
   * @returns Boolean indicating whether the item matches the category filter.
   */
  matchesCategory(itemCat: string, filterCat: string): boolean {
    if (!itemCat || !filterCat) return false;
    const item = itemCat.toLowerCase().trim().replace(/[-_]/g, '');
    const filter = filterCat.toLowerCase().trim().replace(/[-_]/g, '');
    if (item === filter) return true;
    if (filter === 'body' || filter === 'bodysections') {
      return item === 'body' || item === 'bodysections' || item === 'section' || item === 'ecommerce' ||
             item === 'faq' || item === 'contact' || item === 'contactus' || item === 'marquee' || item === 'features';
    }
    if (filter === 'menu') return item === 'menu' || item === 'nav' || item === 'header';
    if (filter === 'hero') return item === 'hero' || item === 'slider';
    if (filter === 'breadcrumb') return item === 'breadcrumb' || item === 'pagebanner' || item === 'banner';
    if (filter === 'footer') return item === 'footer';
    if (filter === 'blog') return item === 'blog' || item === 'blogfeed' || item === 'articles' || item === 'news';
    if (filter === 'blogdetail') return item === 'blogdetail' || item === 'articledetail';
    return false;
  }

  applyFilters(): void {
    let list = [...this.installedTemplates];
    if (this.selectedGroup !== 'all') {
      list = list.filter(t => (t.groupCode || 'suite_corporate') === this.selectedGroup);
    }
    if (this.selectedCategory !== 'all') {
      list = list.filter(t => this.matchesCategory(t.category, this.selectedCategory));
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
    if (this.selectedGroup === 'all') {
      return this.installedTemplates.filter(t => this.matchesCategory(t.category, catId)).length;
    }
    return this.installedTemplates.filter(t => this.matchesCategory(t.category, catId) && (t.groupCode || 'suite_corporate') === this.selectedGroup).length;
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
    const editUrl = `/content/console/templates/visuals/${item.dbId || item.id || item.variantCode}`;
    const activeSuite = this.getAvailableSuites().find(s => s.name === this.activeThemeSuiteName);
    const suiteCode = (this.selectedGroup && this.selectedGroup !== 'all')
      ? this.selectedGroup
      : (activeSuite ? activeSuite.code : (this.selectedThemeSuiteToActivate || 'suite_corporate'));

    let defaultSampleContent: any = null;
    if (item.defaultContentJson) {
      try {
        defaultSampleContent = JSON.parse(item.defaultContentJson);
      } catch (e) {}
    }

    this.universalPreviewModal.open({
      title: item.name,
      category: item.category,
      variantCode: item.variantCode,
      version: item.version,
      badge: item.badge,
      htmlTemplate: item.htmlTemplate,
      cssStyles: item.cssStyles,
      jsScript: item.jsScript,
      sampleContent: defaultSampleContent,
      editUrl: editUrl,
      suiteCode: suiteCode,
      codeInjections: this.allCodeInjections
    });
  }

  /**
   * Sets the active page preview simulation inside the Single Preview Modal for Menu components.
   * @param slug Target page slug or 'isolated' for standalone navigation bar.
   */
  setModalPreviewPage(slug: 'isolated' | 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog' | 'blog-detail'): void {
    this.modalPreviewPageSlug = slug;
    this.updateSinglePreviewHtml();
  }

  updateSinglePreviewHtml(): void {
    if (!this.activePreviewItem) return;

    let combinedStyles = '';
    let combinedHtml = '';
    let combinedJs = '';

    if (this.activePreviewItem.category === 'menu' && this.modalPreviewPageSlug !== 'isolated') {
      let menuData: any = null;
      if (this.activePreviewItem.defaultContentJson) {
        try { menuData = JSON.parse(this.activePreviewItem.defaultContentJson); } catch (e) {}
      }
      const dataContext = { ...this.previewContent, ...(menuData || this.previewMenuContent) };
      const sim = this.composePageSimulation(this.modalPreviewPageSlug, this.activePreviewItem, dataContext);
      combinedStyles = sim.combinedStyles;
      combinedHtml = sim.combinedHtml;
      combinedJs = sim.combinedJs;
    } else {
      let defaultBlockData: any = null;
      if (this.activePreviewItem.defaultContentJson) {
        try { defaultBlockData = JSON.parse(this.activePreviewItem.defaultContentJson); } catch (e) {}
      }
      const dataContext: any = (this.activePreviewItem.category === 'footer')
        ? { ...this.previewContent, ...this.previewFooterContent, ...(defaultBlockData || {}) }
        : (this.activePreviewItem.category === 'menu')
        ? { ...this.previewContent, ...(defaultBlockData || this.previewMenuContent) }
        : (this.activePreviewItem.category === 'blog')
        ? (this.isBlogDetailTemplate()
            ? { ...this.previewContent, ...this.previewBlogDetailContent, article: this.previewBlogDetailContent }
            : { ...this.previewContent, ...this.previewBlogContent, articles: this.previewBlogContent.articles })
        : (this.activePreviewItem.category === 'breadcrumb')
        ? {
            ...this.previewContent,
            ...this.previewBreadcrumbContent,
            breadcrumbTrail: this.previewBreadcrumbContent.trailItems,
            breadcrumbs: this.previewBreadcrumbContent.trailItems,
            trailItems: this.previewBreadcrumbContent.trailItems,
            backgroundImageUrl: this.previewBreadcrumbContent.backgroundImageUrl
          }
        : {
            ...this.previewContent,
            pageSectionLists: this.previewContent.items,
            PageSectionLists: this.previewContent.items,
            items: this.previewContent.items,
            Items: this.previewContent.items,
            sectionLists: this.previewContent.items,
            SectionLists: this.previewContent.items
          };
      let hydrated = (this.activePreviewItem.category === 'menu')
        ? this.contentHydrator.hydrate(this.activePreviewItem.htmlTemplate, dataContext, 'menu')
        : this.hydrateTemplate(this.activePreviewItem.htmlTemplate, dataContext);
      if (this.activePreviewItem.category === 'footer') {
        hydrated = this.enforceOzikolCredit(hydrated);
      }
      combinedStyles = this.activePreviewItem.cssStyles || '';
      combinedHtml = hydrated;
      combinedJs = this.activePreviewItem.jsScript || '';
    }

    const activeSuite = this.getAvailableSuites().find(s => s.name === this.activeThemeSuiteName);
    const suiteCode = (this.selectedGroup && this.selectedGroup !== 'all')
      ? this.selectedGroup
      : (activeSuite ? activeSuite.code : (this.selectedThemeSuiteToActivate || 'suite_corporate'));

    const cleanCombinedStyles = (combinedStyles || '').replace(/<\/?style[^>]*>/gi, '').trim();
    const cleanCombinedJs = (combinedJs || '').replace(/<\/?script[^>]*>/gi, '').trim();

    const combined = `<style>${cleanCombinedStyles}</style>\n${combinedHtml}`;
    this.safeSinglePreviewHtml = this.sanitizer.bypassSecurityTrustHtml(combined);

    const singleIframeDoc = this.htmlAssembler.assembleSectionPreview({
      html: combinedHtml,
      css: cleanCombinedStyles,
      js: cleanCombinedJs,
      category: this.activePreviewItem.category,
      pageTitle: `${this.activePreviewItem.name || 'Section'} Preview`,
      codeInjections: this.allCodeInjections,
      suiteCode: suiteCode
    });
    this.safeSinglePreviewSrcDoc = this.sanitizer.bypassSecurityTrustHtml(singleIframeDoc);
  }

  onPreviewContentChange(): void {
    this.updateSinglePreviewHtml();
  }

  /**
   * Checks whether the currently active template uses a specific placeholder or loop token.
   * @param token The token or pattern to test (e.g. 'ButtonText', 'ImageUrl', 'PageSectionLists', 'Phone').
   * @returns True if the active template HTML contains the token.
   */
  templateUses(token: string): boolean {
    if (!this.activePreviewItem?.htmlTemplate) return false;
    const t = this.activePreviewItem.htmlTemplate;
    const regex = new RegExp(`\\{\\{\\s*(?:#each\\s+|#if\\s+|#unless\\s+)?(?:PageSectionLists\\.|PageSectionList\\.|PageSection\\.)?\\s*${token}\\b`, 'i');
    return regex.test(t);
  }

  /**
   * Returns a human-friendly label for the PageSectionLists repeater matching the active template variant.
   * @returns Context-specific section title.
   */
  getRepeatableSectionTitle(): string {
    const code = this.activePreviewItem?.variantCode || this.activePreviewItem?.name || '';
    if (code.includes('RequestService')) return 'Engagement Standards / Deliverables';
    if (code.includes('MetricsCounter') || code.includes('Counter') || code.includes('Metric')) return 'Key Performance Metrics & Stat Counters';
    if (code.includes('Faq') || code.includes('Accordion')) return 'Frequently Asked Questions & Answers';
    if (code.includes('Testimonial') || code.includes('Review')) return 'Client Testimonials & Ratings';
    if (code.includes('FeatureGrid') || code.includes('Capability')) return 'Core Capabilities & Feature Cards';
    if (code.includes('Mission') || code.includes('Split')) return 'Strategic Pillars & Standards';
    return 'Repeatable Cards / Section List Items';
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
    const cat = (target.category || '').toLowerCase();
    return cat === 'blog_detail' || v.includes('detail') || v.includes('single') || name.includes('detail') || name.includes('single');
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
      miniTitle: `FEATURE ${nextIdx}`,
      description: 'Comprehensive capability designed to streamline leadership operations.',
      moreDescription: 'Engineered for high-throughput institutional performance.',
      iconText: 'verified_user',
      buttonText: 'Learn More',
      buttonLink: '#',
      imageUrl: '',
      sortOrder: nextIdx
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
    if (this.activePreviewItem?.category === 'breadcrumb') {
      this.previewBreadcrumbContent = {
        title: 'Enterprise Solutions & Insights',
        miniTitle: 'MISSION & LEADERSHIP',
        description: 'Discover how modern organizations accelerate digital workflows through hardened infrastructure.',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
        trailItems: [
          { label: 'Home', url: '/', isActive: false },
          { label: 'Capabilities', url: '/capabilities', isActive: false },
          { label: 'Enterprise Solutions', url: '/capabilities/enterprise', isActive: true }
        ]
      };
      this.onPreviewContentChange();
      this.toast.info('Breadcrumb sample content restored to defaults.');
      return;
    }

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
      let defaultHeroData: any = null;
      if (this.activePreviewItem.defaultContentJson) {
        try { defaultHeroData = JSON.parse(this.activePreviewItem.defaultContentJson); } catch (e) {}
      }
      this.previewHeroContent = {
        title: defaultHeroData?.title || defaultHeroData?.Title || this.activePreviewItem?.previewTitle || this.activePreviewItem?.name || '',
        miniTitle: defaultHeroData?.miniTitle || defaultHeroData?.MiniTitle || 'OFFICIAL',
        text: defaultHeroData?.text || defaultHeroData?.Text || defaultHeroData?.description || this.activePreviewItem?.previewBody || this.activePreviewItem?.description || '',
        buttonText: defaultHeroData?.buttonText || defaultHeroData?.ButtonText || 'Explore Solutions',
        buttonLink: defaultHeroData?.buttonLink || defaultHeroData?.ButtonLink || '/services',
        videoButtonText: defaultHeroData?.videoButtonText || defaultHeroData?.VideoButtonText || '',
        videoLink: defaultHeroData?.videoLink || defaultHeroData?.VideoLink || '',
        url: defaultHeroData?.url || defaultHeroData?.Url || defaultHeroData?.imageUrl || defaultHeroData?.ImageUrl || '',
        secondUrl: defaultHeroData?.secondUrl || defaultHeroData?.SecondUrl || '',
        youtubeVideo: defaultHeroData?.youtubeVideo || defaultHeroData?.YoutubeVideo || ''
      };
      this.onPreviewContentChange();
      this.toast.info('Hero slider sample content restored to template defaults.');
      return;
    }

    if (this.activePreviewItem?.defaultContentJson) {
      try {
        const parsed = JSON.parse(this.activePreviewItem.defaultContentJson);
        if (parsed && typeof parsed === 'object') {
          const rawItems = parsed.pageSectionLists || parsed.PageSectionLists || parsed.items || parsed.Items || parsed.sectionLists || parsed.SectionLists;
          this.previewContent = {
            title: parsed.title || parsed.Title || this.activePreviewItem.name,
            miniTitle: parsed.miniTitle || parsed.MiniTitle || '',
            description: parsed.description || parsed.Description || this.activePreviewItem.description,
            fullDescription: parsed.fullDescription || parsed.FullDescription || '',
            imageUrl: parsed.imageUrl || parsed.ImageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
            secondImageUrl: parsed.secondImageUrl || parsed.SecondImageUrl || '',
            buttonText: parsed.buttonText || parsed.ButtonText || 'Explore Platform Solutions →',
            buttonLink: parsed.buttonLink || parsed.ButtonLink || '#',
            secondaryButtonText: parsed.secondaryButtonText || parsed.SecondaryButtonText || '',
            secondaryButtonLink: parsed.secondaryButtonLink || parsed.SecondaryButtonLink || '',
            directUrl: parsed.directUrl || parsed.DirectUrl || '',
            youtubeUrlLink: parsed.youtubeUrlLink || parsed.YoutubeUrlLink || '',
            quote: parsed.quote || parsed.Quote || '',
            email: parsed.email || parsed.Email || 'contact@organization.com',
            phone: parsed.phone || parsed.Phone || '+1 (555) 019-2834',
            address: parsed.address || parsed.Address || '100 Innovation Parkway, Suite 400',
            workingHours: parsed.workingHours || parsed.WorkingHours || 'Monday - Friday: 8:00 AM - 6:00 PM',
            formKey: parsed.formKey || parsed.FormKey || 'Contact_Us',
            customClass: parsed.customClass || parsed.CustomClass || '',
            backgroundColor: parsed.backgroundColor || parsed.BackgroundColor || '',
            items: (Array.isArray(rawItems) && rawItems.length > 0)
              ? rawItems.map((it: any, idx: number) => ({
                  title: it.title || it.Title || '',
                  miniTitle: it.miniTitle || it.MiniTitle || '',
                  description: it.description || it.Description || '',
                  moreDescription: it.moreDescription || it.MoreDescription || '',
                  iconText: it.iconText || it.IconText || '',
                  imageUrl: it.imageUrl || it.ImageUrl || '',
                  buttonText: it.buttonText || it.ButtonText || '',
                  buttonLink: it.buttonLink || it.ButtonLink || '',
                  secondButtonText: it.secondButtonText || it.SecondButtonText || it.secondaryButtonText || it.SecondaryButtonText || '',
                  secondButtonLink: it.secondButtonLink || it.SecondButtonLink || it.secondaryButtonLink || it.SecondaryButtonLink || '',
                  sortOrder: it.sortOrder || it.SortOrder || (idx + 1)
                }))
              : [
                  { title: 'Real-Time Sync', miniTitle: 'WEBSOCKET', description: 'Instantaneous WebSocket state propagation across all connected devices.', moreDescription: '', iconText: 'sync', buttonText: 'Learn More', buttonLink: '#', sortOrder: 1 },
                  { title: 'Granular Governance', miniTitle: 'SECURITY', description: 'Fine-grained permission matrices, committee chair controls, and audit verification.', moreDescription: '', iconText: 'verified_user', buttonText: 'Learn More', buttonLink: '#', sortOrder: 2 }
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
      fullDescription: 'Our platform delivers military-grade data protection coupled with intuitive operational dashboards designed to elevate administrative efficiency across the entire ecosystem.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      secondImageUrl: '',
      buttonText: 'Explore Business Solutions →',
      buttonLink: '#',
      secondaryButtonText: 'Download Architecture Brief',
      secondaryButtonLink: '#',
      directUrl: '',
      youtubeUrlLink: '',
      quote: '',
      email: 'contact@organization.com',
      phone: '+1 (555) 019-2834',
      address: '100 Innovation Parkway, Suite 400, Tech City, TC 94105',
      workingHours: 'Monday - Friday: 8:00 AM - 6:00 PM',
      formKey: 'Contact_Us',
      customClass: '',
      backgroundColor: '',
      items: [
        { title: 'Strategic Advisory', miniTitle: 'STRATEGY', description: 'Tailored market insights and operational guidance to accelerate organizational growth.', moreDescription: 'Strategic alignment across all enterprise tiers', iconText: 'insights', buttonText: 'Learn More', buttonLink: '#', sortOrder: 1 },
        { title: 'Data Security & Privacy', miniTitle: 'SECURITY', description: 'Industry-standard encryption, privacy protocols, and secure collaboration channels.', moreDescription: 'End-to-end cryptographic safeguards', iconText: 'verified_user', buttonText: 'Learn More', buttonLink: '#', sortOrder: 2 },
        { title: 'Operational Efficiency', miniTitle: 'WORKFLOW', description: 'Modern automated workflows engineered to eliminate friction and elevate productivity.', moreDescription: 'Continuous throughput optimization', iconText: 'speed', buttonText: 'Learn More', buttonLink: '#', sortOrder: 3 }
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

  closeSinglePreviewModal(): void {
    this.universalPreviewModal.close();
    this.showSinglePreviewModal = false;
    this.activePreviewItem = null;
    this.safeSinglePreviewHtml = '';
    this.safeSinglePreviewSrcDoc = '';
    const styleEl = document.getElementById('oz-template-single-preview-css');
    if (styleEl) styleEl.remove();
  }

  // Full-Site Demo Modal & Multi-Page Engine
  setPreviewPage(slug: 'home' | 'about' | 'services' | 'request-service' | 'blog' | 'blog-detail' | 'contact'): void {
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
   * Composes a complete simulated page containing Menu, Hero/Breadcrumbs, designated Body sections, and Footer.
   * Enables 100% sample-content fidelity and live navigation simulation across all pages.
   * @param pageSlug The target route slug ('home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog' | 'blog-detail').
   * @param menuBlockOverride Optional menu template item to override the active installed menu (used in modal preview).
   * @param menuContextOverride Optional menu data context to override sample data.
   * @returns An object containing combined CSS styles, combined HTML markup, and JavaScript.
   */
  composePageSimulation(
    pageSlug: 'home' | 'about' | 'services' | 'request-service' | 'contact' | 'blog' | 'blog-detail',
    menuBlockOverride?: InstalledTemplateItem,
    menuContextOverride?: any
  ): { combinedStyles: string; combinedHtml: string; combinedJs: string } {
    const activeSuite = this.getAvailableSuites().find(s => s.name === this.activeThemeSuiteName);
    const suiteCode = (this.selectedGroup && this.selectedGroup !== 'all')
      ? this.selectedGroup
      : (activeSuite ? activeSuite.code : (this.selectedThemeSuiteToActivate || 'suite_corporate'));

    const suiteTemplates = this.installedTemplates.filter(t => (t.groupCode || 'suite_corporate') === suiteCode);

    const menuBlock = menuBlockOverride ||
      suiteTemplates.find(t => t.category === 'menu' && (t.badge === 'Active' || t.id === this.activeMenuId)) ||
      suiteTemplates.find(t => t.category === 'menu') ||
      this.getActiveMenu();

    const heroBlock =
      suiteTemplates.find(t => t.category === 'hero' && (t.badge === 'Active' || t.id === this.activeHeroId)) ||
      suiteTemplates.find(t => t.category === 'hero') ||
      this.getActiveHero();

    const footerBlock =
      suiteTemplates.find(t => t.category === 'footer' && (t.badge === 'Active' || t.id === this.activeFooterId)) ||
      suiteTemplates.find(t => t.category === 'footer') ||
      this.getActiveFooter();

    const suiteBodyBlocks = suiteTemplates.filter(t =>
      t.category === 'body' &&
      !this.isBlogDetailTemplate(t)
    );

    const allBodyBlocks = this.getAllBodyBlocks();

    const breadcrumbBlock = suiteTemplates.find(t => t.category === 'breadcrumb') ||
      this.installedTemplates.find(t => t.category === 'breadcrumb');

    let activeBlocks: { block: InstalledTemplateItem; contextOverride?: any }[] = [];

    if (pageSlug === 'home') {
      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (heroBlock) activeBlocks.push({ block: heroBlock });
      const homeBody = suiteBodyBlocks.length > 0 ? suiteBodyBlocks : this.getHomeBodyBlocks();
      homeBody.forEach(b => activeBlocks.push({ block: b }));
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    } else {
      // Dynamic subpage resolution without hardcoded strings
      const matchedPage = (this.availablePages || []).find(p => p.slug === pageSlug);
      const dynamicTitle = matchedPage?.title || pageSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const dynamicDesc = matchedPage?.summary || matchedPage?.metaDescription || 'Detailed information and resources.';

      if (menuBlock) activeBlocks.push({ block: menuBlock, contextOverride: menuContextOverride });
      if (breadcrumbBlock) {
        activeBlocks.push({
          block: breadcrumbBlock,
          contextOverride: {
            title: dynamicTitle,
            miniTitle: 'PAGE',
            description: dynamicDesc
          }
        });
      }
      const subpageBody = suiteBodyBlocks.length > 0 ? suiteBodyBlocks : (allBodyBlocks.length > 0 ? [allBodyBlocks[0]] : []);
      subpageBody.forEach(b => {
        if (b && !activeBlocks.some(ab => ab.block.id === b.id)) activeBlocks.push({ block: b });
      });
      if (footerBlock) activeBlocks.push({ block: footerBlock });
    }

    let headStyles = '';
    if (this.headTags && this.headTags.length > 0) {
      this.headTags.forEach(tag => {
        if (tag.isActive) {
          const match = tag.content?.match(/href=["']([^"']+)["']/i);
          if (match && match[1]) {
            headStyles += `@import url('${match[1]}');\n`;
          }
        }
      });
    }

    let combinedStyles = `
      ${headStyles}
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

    // Inject active head stylesheets into preview
    if (this.headTags && this.headTags.length > 0) {
      this.headTags.forEach(tag => {
        if (tag.isActive) {
          const match = tag.content?.match(/href=["']([^"']+)["']/i);
          if (match && match[1]) {
            combinedStyles = `@import url('${match[1]}');\n` + combinedStyles;
          }
        }
      });
    }

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
        let defaultMenuData: any = null;
        if (b.defaultContentJson) {
          try { defaultMenuData = JSON.parse(b.defaultContentJson); } catch (e) {}
        }
        if (contextOverride) {
          ctx = { ...ctx, ...(defaultMenuData || this.previewMenuContent), ...contextOverride };
        } else {
          ctx = { ...ctx, ...(defaultMenuData || this.previewMenuContent) };
        }
      } else if (b.category === 'hero') {
        let defaultHeroData: any = null;
        if (b.defaultContentJson) {
          try { defaultHeroData = JSON.parse(b.defaultContentJson); } catch (e) {}
        }
        ctx = {
          ...ctx,
          title: contextOverride?.title || defaultHeroData?.title || defaultHeroData?.Title || this.previewHeroContent.title || b.previewTitle || b.name,
          miniTitle: contextOverride?.miniTitle || defaultHeroData?.miniTitle || defaultHeroData?.MiniTitle || this.previewHeroContent.miniTitle || b.previewSubtitle?.toUpperCase() || 'OFFICIAL',
          text: contextOverride?.description || defaultHeroData?.text || defaultHeroData?.Text || defaultHeroData?.description || this.previewHeroContent.text || b.previewBody || b.description || '',
          buttonText: defaultHeroData?.buttonText || defaultHeroData?.ButtonText || this.previewHeroContent.buttonText || 'Explore Solutions',
          buttonLink: defaultHeroData?.buttonLink || defaultHeroData?.ButtonLink || this.previewHeroContent.buttonLink || '/services',
          videoButtonText: defaultHeroData?.videoButtonText || defaultHeroData?.VideoButtonText || this.previewHeroContent.videoButtonText || '',
          videoLink: defaultHeroData?.videoLink || defaultHeroData?.VideoLink || this.previewHeroContent.videoLink || '',
          url: defaultHeroData?.url || defaultHeroData?.Url || defaultHeroData?.imageUrl || defaultHeroData?.ImageUrl || this.previewHeroContent.url || '',
          secondUrl: defaultHeroData?.secondUrl || defaultHeroData?.SecondUrl || this.previewHeroContent.secondUrl || '',
          youtubeVideo: defaultHeroData?.youtubeVideo || defaultHeroData?.YoutubeVideo || this.previewHeroContent.youtubeVideo || '',
          ...(defaultHeroData || {})
        };
      } else if (b.category === 'footer') {
        let defaultFooterData: any = null;
        if (b.defaultContentJson) {
          try {
            defaultFooterData = JSON.parse(b.defaultContentJson);
          } catch (e) {}
        }
        ctx = {
          ...ctx,
          categories: defaultFooterData?.categories || defaultFooterData?.footerCategories || this.previewFooterContent.categories,
          legalPages: defaultFooterData?.legalPages || this.previewFooterContent.legalPages,
          email: defaultFooterData?.email || this.previewFooterContent.email,
          phone: defaultFooterData?.phone || this.previewFooterContent.phone,
          brandName: defaultFooterData?.brandName || this.previewFooterContent.brandName || this.currentTenantBrandName,
          ...(defaultFooterData || {})
        };
      } else if (b.category === 'body') {
        if (b.defaultContentJson) {
          try {
            const parsed = JSON.parse(b.defaultContentJson);
            ctx = { ...ctx, ...parsed };
            if (parsed?.pageSectionLists && !ctx.items) ctx.items = parsed.pageSectionLists;
            if (parsed?.items && !ctx.pageSectionLists) ctx.pageSectionLists = parsed.items;
          } catch (e) {}
        }
      } else if (b.category === 'blog' || b.category === 'blog_detail') {
        if (b.category === 'blog_detail' || this.isBlogDetailTemplate(b)) {
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
      } else if (b.category === 'breadcrumb') {
        ctx = {
          ...ctx,
          ...this.previewBreadcrumbContent,
          title: contextOverride?.title || this.previewBreadcrumbContent.title,
          miniTitle: contextOverride?.miniTitle || this.previewBreadcrumbContent.miniTitle,
          description: contextOverride?.description || this.previewBreadcrumbContent.description,
          backgroundImageUrl: this.previewBreadcrumbContent.backgroundImageUrl,
          breadcrumbTrail: [
            { label: 'Home', url: '/', isActive: false },
            { label: contextOverride?.title || 'Current Page', url: '#', isActive: true }
          ]
        };
      }

      let hydratedBlockHtml = this.contentHydrator.hydrate(
        b.htmlTemplate,
        ctx as any,
        b.category
      );
      hydratedBlockHtml = hydratedBlockHtml.replace(/\{\{\s*BrandName\s*\}\}/g, this.currentTenantBrandName);
      hydratedBlockHtml = hydratedBlockHtml.replace(/\{\{\s*Year\s*\}\}/g, new Date().getFullYear().toString());

      if (b.category === 'menu') {
        hydratedBlockHtml = hydratedBlockHtml.replace(
          /badge rounded-pill bg-primary">0<\/span>/g,
          `badge rounded-pill bg-primary">${this.previewCartCount}</span>`
        );

        // Dynamically synchronize active navbar link highlighting with the current page slug
        const activeSlug = pageSlug === 'blog-detail' ? 'blog' : pageSlug;

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

    const activeSuite = this.getAvailableSuites().find(s => s.name === this.activeThemeSuiteName);
    const suiteCode = (this.selectedGroup && this.selectedGroup !== 'all')
      ? this.selectedGroup
      : (activeSuite ? activeSuite.code : (this.selectedThemeSuiteToActivate || 'suite_corporate'));

    const bundle = this.htmlAssembler.assemblePageBundle({
      pageTitle: `${this.currentTenantBrandName} | Live Theme Demo`,
      pageSlug: this.previewActivePageSlug,
      suiteCode: suiteCode,
      codeInjections: this.allCodeInjections,
      sections: [
        {
          category: 'body',
          html: combinedHtml,
          css: combinedStyles,
          js: combinedJs
        }
      ]
    });

    this.safeFullDemoHtml = this.sanitizer.bypassSecurityTrustHtml(`<style>${combinedStyles}</style>\n${combinedHtml}`);
    this.safeFullDemoSrcDoc = this.sanitizer.bypassSecurityTrustHtml(bundle.fullDocumentHtml);
  }

  getFullDemoBlockCount(): number {
    let count = 0;
    if (this.getActiveMenu()) count++;
    if (this.getActiveHero()) count++;
    count += this.getHomeBodyBlocks().length;
    if (this.installedTemplates.some(t => t.category === 'blog' && !this.isBlogDetailTemplate(t))) count++;
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
      } else if (
        href.includes('/blog/') ||
        href.includes('detail') ||
        text.includes('read article') ||
        text.includes('view article') ||
        text.includes('read more')
      ) {
        this.setPreviewPage('blog-detail');
        this.toast.info('Navigated to Blog Article Detail in live preview.');
      } else if (href.includes('blog') || text.includes('blog') || text.includes('news') || text.includes('article') || text.includes('insights')) {
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
    this.deleteLinkedContentCheckbox = false;
    this.linkedSectionsList = [];

    // Resolve identifier: prioritize dbId, then variantCode, templateKey, or id
    const targetId = item.dbId || item.variantCode || item.id;
    if (targetId) {
      this.loadingLinkedContent = true;
      this.api.get<any>(`ContentApi/templates/${encodeURIComponent(targetId)}/linked-content`).subscribe({
        next: (res) => {
          this.loadingLinkedContent = false;
          if (res?.data?.linkedSections) {
            this.linkedSectionsList = res.data.linkedSections;
          }
        },
        error: () => {
          this.loadingLinkedContent = false;
        }
      });
    }
  }

  closeUninstallModal(): void {
    this.showUninstallModal = false;
    this.itemToUninstall = null;
    this.uninstallingTemplate = false;
    this.loadingLinkedContent = false;
    this.linkedSectionsList = [];
    this.deleteLinkedContentCheckbox = false;
  }

  confirmUninstallTemplate(): void {
    if (!this.itemToUninstall) return;
    const item = this.itemToUninstall;
    const cascade = this.deleteLinkedContentCheckbox;
    const count = this.linkedSectionsList.length;
    this.uninstallingTemplate = true;

    // Resolve identifier: prioritize dbId, fallback to variantCode, templateKey, or id
    const targetId = item.dbId || item.variantCode || item.id;
    if (!targetId) {
      this.uninstallingTemplate = false;
      this.toast.error('Unable to delete: Template identifier missing.');
      return;
    }

    this.api.delete<any>(`ContentApi/templates/installed/${encodeURIComponent(targetId)}?deleteLinkedContent=${cascade}`).subscribe({
      next: (res) => {
        this.uninstallingTemplate = false;

        // Remove from in-memory list ONLY upon backend confirmation
        this.installedTemplates = this.installedTemplates.filter(t => 
          t.id !== item.id && 
          t.variantCode !== item.variantCode && 
          (!item.dbId || t.dbId !== item.dbId)
        );
        this.saveInstalledTemplates();

        // Clear active references if this template was active
        const cat = item.category?.toLowerCase();
        if (cat === 'menu' && (this.activeMenuId === item.id || this.activeMenuId === item.variantCode || this.activeMenuId === item.dbId)) {
          this.activeMenuId = '';
          localStorage.removeItem('oz_active_menu_id');
        } else if (cat === 'hero' && (this.activeHeroId === item.id || this.activeHeroId === item.variantCode || this.activeHeroId === item.dbId)) {
          this.activeHeroId = '';
          localStorage.removeItem('oz_active_hero_id');
        } else if (cat === 'footer' && (this.activeFooterId === item.id || this.activeFooterId === item.variantCode || this.activeFooterId === item.dbId)) {
          this.activeFooterId = '';
          localStorage.removeItem('oz_active_footer_id');
        } else if (cat === 'blog' && (this.activeBlogId === item.id || this.activeBlogId === item.variantCode || this.activeBlogId === item.dbId)) {
          this.activeBlogId = '';
          localStorage.removeItem('oz_active_blog_id');
        }

        this.applyFilters();

        const successMsg = res?.message || (cascade && count > 0
          ? `Template '${item.name}' and ${count} linked section(s) deleted.`
          : `Template '${item.name}' uninstalled from database.`);
        this.toast.success(successMsg);
        this.closeUninstallModal();
      },
      error: (err) => {
        this.uninstallingTemplate = false;
        const errorMsg = err?.error?.message || err?.message || `Failed to uninstall template '${item.name}'.`;
        this.toast.error(errorMsg);
      }
    });
  }

  // ==========================================
  // AI WEBSITE HEALTH & RUNTIME DIAGNOSTIC INSPECTOR
  // ==========================================

  showAiHealthModal: boolean = false;
  isDiagnosingWebsite: boolean = false;
  diagnosticReport: {
    healthScore: number;
    statusTitle: string;
    criticalIssues: Array<{ title: string; rootCause: string; recommendation: string }>;
    warnings: Array<{ title: string; rootCause: string; recommendation: string }>;
    passedChecks: string[];
  } | null = null;
  diagnosticStep: number = 1;

  runAiWebsiteHealthCheck(): void {
    // 1. Immediately open diagnostic modal in scanning state for clear user feedback
    this.isDiagnosingWebsite = true;
    this.showAiHealthModal = true;
    this.diagnosticReport = null;
    this.diagnosticStep = 1;

    // Progressive visual steps
    setTimeout(() => { if (this.isDiagnosingWebsite) this.diagnosticStep = 2; }, 300);
    setTimeout(() => { if (this.isDiagnosingWebsite) this.diagnosticStep = 3; }, 600);
    setTimeout(() => { if (this.isDiagnosingWebsite) this.diagnosticStep = 4; }, 900);

    // 2. Gather active tags and template metadata from DB state
    const headTags = this.allCodeInjections
      .filter(t => t.zone === 'head' && t.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(t => `#${t.sortOrder} [${t.name}]: ${t.content}`);

    const footerScripts = this.allCodeInjections
      .filter(t => t.zone === 'footer' && t.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(t => `#${t.sortOrder} [${t.name}]: ${t.content}`);

    const activeMenu = this.getActiveMenu();
    const activeFooter = this.getActiveFooter();
    const sim = this.composePageSimulation('home');

    // 3. Execute headless sandbox runtime probe to capture real browser exceptions
    const capturedErrors: string[] = [];
    const capturedWarnings: string[] = [];

    // Check for lingering unhydrated template tokens
    const tokenMatches = (sim.combinedHtml || '').match(/\{\{\s*[\w\.\-]+\s*\}\}/g);
    if (tokenMatches && tokenMatches.length > 0) {
      const distinctTokens = Array.from(new Set(tokenMatches)).slice(0, 5);
      capturedWarnings.push('Lingering unhydrated template tokens detected: ' + distinctTokens.join(', '));
    }

    // Check for empty template vault state
    if (this.installedTemplates.length === 0) {
      capturedWarnings.push('Template Vault is currently empty (0 installed templates). Blank workspace detected.');
    }

    const sandboxIframe = document.createElement('iframe');
    sandboxIframe.style.display = 'none';
    sandboxIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    document.body.appendChild(sandboxIframe);

    const probeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    window.onerror = function(msg, url, line, col, err) {
      window.parent.postMessage({ type: 'OZ_RUNTIME_ERR', msg: msg + (line ? ' (line ' + line + ')' : '') }, '*');
    };
    window.addEventListener('unhandledrejection', function(e) {
      window.parent.postMessage({ type: 'OZ_RUNTIME_ERR', msg: 'Unhandled Promise: ' + (e.reason ? (e.reason.message || e.reason) : 'Unknown') }, '*');
    });
    window.addEventListener('error', function(e) {
      if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
        var src = e.target.src || e.target.href || 'resource';
        window.parent.postMessage({ type: 'OZ_RUNTIME_WARN', msg: 'Failed to load external resource: ' + src }, '*');
      }
    }, true);
  </script>
  ${this.allCodeInjections.filter(t => t.zone === 'head' && t.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(t => t.content).join('\n')}
  <style>${sim.combinedStyles}</style>
</head>
<body>
  ${sim.combinedHtml}
  ${sim.combinedJs ? '<script>' + sim.combinedJs + '</script>' : ''}
  ${this.allCodeInjections.filter(t => t.zone === 'footer' && t.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(t => t.content).join('\n')}
</body>
</html>`;

    const messageHandler = (e: MessageEvent) => {
      if (e.data?.type === 'OZ_RUNTIME_ERR') {
        capturedErrors.push(e.data.msg);
      } else if (e.data?.type === 'OZ_RUNTIME_WARN') {
        capturedWarnings.push(e.data.msg);
      }
    };
    window.addEventListener('message', messageHandler);

    sandboxIframe.srcdoc = probeHtml;

    // 4. After sandbox evaluation window, dispatch real telemetry to AI Engine
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      sandboxIframe.remove();

      const payload = {
        headerTags: headTags,
        footerScripts: footerScripts,
        capturedErrors: capturedErrors,
        capturedWarnings: capturedWarnings,
        activeTemplateName: activeMenu?.name || activeFooter?.name || 'Live Workspace Bundle',
        activeTemplateCategory: activeMenu ? 'Menu / Header' : 'Full Site Bundle',
        scopedCss: sim.combinedStyles,
        scopedJs: sim.combinedJs
      };

      this.api.post<any>('ContentApi/ai/diagnose-runtime', payload).subscribe({
        next: (res) => {
          this.isDiagnosingWebsite = false;
          this.diagnosticReport = res?.data || null;
        },
        error: (err) => {
          this.isDiagnosingWebsite = false;
          this.toast.error(err?.error?.message || err?.message || 'Failed to complete AI diagnostic inspection.');
        }
      });
    }, 700);
  }

  closeAiHealthModal(): void {
    this.showAiHealthModal = false;
  }
}
