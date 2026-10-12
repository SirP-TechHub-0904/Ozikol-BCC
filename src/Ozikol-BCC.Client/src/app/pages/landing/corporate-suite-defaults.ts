/**
 * Canonical Corporate Theme Suite definitions, default showcase sections,
 * and fallback content models for the public website live preview engine.
 * Ensures the public site never displays blank cards or uninitialized states.
 */

export interface CanonicalTemplateItem {
  id: string;
  templateKey: string;
  categoryKey: string;
  category: string;
  name: string;
  variantCode: string;
  htmlTemplate: string;
  cssStyles: string;
  jsScript?: string;
  defaultContentJson?: string;
  isActive: boolean;
  isDefault: boolean;
}

export const CANONICAL_CORPORATE_TEMPLATES: CanonicalTemplateItem[] = [
  // 1. Navbar
  {
    id: 'menu-corporate-classic',
    templateKey: 'Menu_Classic',
    categoryKey: 'menu',
    category: 'menu',
    name: 'Classic Light Corporate Navbar',
    variantCode: 'Menu_Classic',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<header class="oz-nav-section {{ CustomClass }}">
  {{#if HasTopBar}}
  <div class="oz-top-bar">
    <div class="oz-nav-container oz-top-bar-inner">
      <div class="oz-top-contact">
        {{#if Email}}<a href="mailto:{{ Email }}" class="oz-top-item"><i class="fa-solid fa-envelope me-1"></i><span>{{ Email }}</span></a>{{/if}}
        {{#if Phone}}<a href="tel:{{ Phone }}" class="oz-top-item"><i class="fa-solid fa-phone me-1"></i><span>{{ Phone }}</span></a>{{/if}}
      </div>
      <div class="oz-top-utility">
        <div class="oz-top-links">
          {{#each TopBarPages}}
          <a href="{{ Url }}" class="oz-top-link">{{ Title }}</a>
          {{/each}}
        </div>
        <div class="oz-top-socials">
          <a href="#" class="oz-social-link" title="Twitter"><i class="fa-brands fa-x-twitter"></i></a>
          <a href="#" class="oz-social-link" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
          <a href="#" class="oz-social-link" title="Facebook"><i class="fa-brands fa-facebook"></i></a>
        </div>
      </div>
    </div>
  </div>
  {{/if}}
  <nav class="oz-main-navbar">
    <div class="oz-nav-container oz-navbar-inner">
      <a class="oz-navbar-brand" href="{{ HomeUrl }}">
        {{#if BrandLogo}}
        <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-brand-logo" />
        {{else}}
        <span class="oz-brand-text">{{ BrandName }}</span>
        {{/if}}
      </a>
      <button class="oz-nav-toggler" type="button" aria-label="Toggle navigation" onclick="document.getElementById('ozNavDrawer')?.classList.toggle('open')">
        <span class="oz-toggler-bar"></span>
        <span class="oz-toggler-bar"></span>
        <span class="oz-toggler-bar"></span>
      </button>
      <div class="oz-nav-drawer" id="ozNavDrawer">
        <ul class="oz-nav-menu">
          {{#each NavItems="first"}}
          <li class="oz-nav-item"><a class="oz-nav-link" href="{{ Url }}">{{ Title }}</a></li>
          {{/each}}
          {{#each MenuDropdowns}}
          <li class="oz-nav-item oz-dropdown">
            <a class="oz-nav-link oz-dropdown-toggle" href="#">{{ Title }} <i class="fa-solid fa-chevron-down ms-1" style="font-size:10px;"></i></a>
            <ul class="oz-dropdown-menu">
              {{#each Pages}}
              <li><a class="oz-dropdown-item" href="{{ Url }}">{{ Title }}</a></li>
              {{/each}}
            </ul>
          </li>
          {{/each}}
          {{#each NavItems="middle"}}
          <li class="oz-nav-item"><a class="oz-nav-link" href="{{ Url }}">{{ Title }}</a></li>
          {{/each}}
          {{#each NavItems="last"}}
          <li class="oz-nav-item"><a class="oz-nav-link" href="{{ Url }}">{{ Title }}</a></li>
          {{/each}}
        </ul>
        <div class="oz-nav-actions">
          {{#if ActivateLoginInMenu}}
          <a href="{{ LoginUrl }}" class="oz-btn-login">{{ LoginButtonText }}</a>
          {{/if}}
          {{#each MenuCtaButtons}}
          <a href="{{ Url }}" class="oz-btn-cta {{ CustomClass }}">{{ Title }}</a>
          {{/each}}
        </div>
      </div>
    </div>
  </nav>
</header>`,
    cssStyles: `.oz-nav-section { width: 100%; position: sticky; top: 0; z-index: 1000; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); font-family: 'Inter', system-ui, sans-serif; }
.oz-top-bar { background: #0f172a; color: #94a3b8; font-size: 12.5px; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 7px 0; }
.oz-nav-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-top-bar-inner { display: flex; justify-content: space-between; align-items: center; }
.oz-top-contact { display: flex; gap: 20px; align-items: center; }
.oz-top-item { color: #94a3b8; text-decoration: none; display: inline-flex; align-items: center; transition: color 0.15s; }
.oz-top-item:hover { color: #ffffff; }
.oz-top-utility { display: flex; gap: 20px; align-items: center; }
.oz-top-links { display: flex; gap: 16px; }
.oz-top-link { color: #94a3b8; text-decoration: none; transition: color 0.15s; }
.oz-top-link:hover { color: #ffffff; }
.oz-top-socials { display: flex; gap: 12px; }
.oz-social-link { color: #94a3b8; text-decoration: none; font-size: 12px; transition: color 0.15s; }
.oz-social-link:hover { color: #38bdf8; }
.oz-main-navbar { background: #ffffff; padding: 14px 0; }
.oz-navbar-inner { display: flex; justify-content: space-between; align-items: center; position: relative; }
.oz-navbar-brand { text-decoration: none; display: inline-flex; align-items: center; }
.oz-brand-logo { max-height: 40px; width: auto; object-fit: contain; }
.oz-brand-text { font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
.oz-nav-toggler { display: none; background: transparent; border: none; cursor: pointer; padding: 6px; flex-direction: column; gap: 5px; }
.oz-toggler-bar { width: 24px; height: 2.5px; background: #0f172a; border-radius: 2px; }
.oz-nav-drawer { display: flex; align-items: center; gap: 32px; }
.oz-nav-menu { display: flex; align-items: center; gap: 24px; list-style: none; margin: 0; padding: 0; }
.oz-nav-item { position: relative; }
.oz-nav-link { color: #475569; font-weight: 600; font-size: 14.5px; text-decoration: none; padding: 8px 4px; transition: color 0.15s; display: inline-flex; align-items: center; }
.oz-nav-link:hover { color: #0050e5; }
.oz-dropdown-menu { display: none; position: absolute; top: 100%; left: 0; min-width: 200px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); padding: 8px 0; list-style: none; margin-top: 4px; z-index: 100; }
.oz-dropdown:hover .oz-dropdown-menu { display: block; }
.oz-dropdown-item { display: block; padding: 8px 18px; color: #475569; font-size: 13.5px; text-decoration: none; font-weight: 500; transition: background 0.15s; }
.oz-dropdown-item:hover { background: #f8fafc; color: #0050e5; }
.oz-nav-actions { display: flex; align-items: center; gap: 12px; }
.oz-btn-login { color: #0f172a; font-weight: 600; font-size: 13.5px; text-decoration: none; padding: 9px 18px; border-radius: 8px; border: 1px solid #cbd5e1; transition: all 0.15s; }
.oz-btn-login:hover { background: #f8fafc; border-color: #94a3b8; }
.oz-btn-cta { background: #0050e5; color: #ffffff; font-weight: 700; font-size: 13.5px; text-decoration: none; padding: 9px 20px; border-radius: 8px; transition: all 0.15s; box-shadow: 0 4px 12px rgba(0,80,229,0.25); }
.oz-btn-cta:hover { background: #0043c2; color: #ffffff; transform: translateY(-1px); }
@media (max-width: 991px) {
  .oz-nav-toggler { display: flex; }
  .oz-nav-drawer { display: none; position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border-bottom: 1px solid #e2e8f0; box-shadow: 0 15px 30px rgba(0,0,0,0.08); padding: 20px 24px; flex-direction: column; align-items: flex-start; gap: 16px; }
  .oz-nav-drawer.open { display: flex; }
  .oz-nav-menu { flex-direction: column; align-items: flex-start; width: 100%; gap: 12px; }
  .oz-dropdown-menu { position: static; box-shadow: none; border: none; padding-left: 14px; }
  .oz-nav-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .oz-btn-cta, .oz-btn-login { text-align: center; }
}`
  },

  // 2. Hero Section
  {
    id: 'hero-corporate-split',
    templateKey: 'Hero_CorporateSplit',
    categoryKey: 'hero',
    category: 'hero',
    name: 'Corporate Split Hero',
    variantCode: 'Hero_CorporateSplit',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-hero-split {{ CustomClass }}">
  <div class="oz-hero-container">
    <div class="oz-hero-grid">
      <div class="oz-hero-text">
        {{#if MiniTitle}}<span class="oz-hero-pill"><i class="fa-solid fa-bolt text-warning me-1"></i> {{ MiniTitle }}</span>{{/if}}
        <h1 class="oz-hero-headline">{{ Title }}</h1>
        <p class="oz-hero-subheadline">{{ Description }}</p>
        <div class="oz-hero-actions">
          {{#if ButtonText}}
          <a href="{{ ButtonLink }}" class="oz-btn-hero-primary">{{ ButtonText }}</a>
          {{/if}}
          {{#if SecondButtonText}}
          <a href="{{ SecondButtonLink }}" class="oz-btn-hero-outline">{{ SecondButtonText }}</a>
          {{/if}}
        </div>
        <div class="oz-hero-trust-bar">
          <div class="oz-trust-item"><i class="fa-solid fa-shield-halved text-primary me-2"></i><span>Enterprise Ready</span></div>
          <div class="oz-trust-item"><i class="fa-solid fa-circle-check text-success me-2"></i><span>99.98% SLA</span></div>
          <div class="oz-trust-item"><i class="fa-solid fa-headset text-info me-2"></i><span>24/7 Support</span></div>
        </div>
      </div>
      <div class="oz-hero-media">
        <div class="oz-hero-image-wrap">
          <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-hero-img" onerror="this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'" />
          <div class="oz-hero-badge-card">
            <div class="oz-badge-icon"><i class="fa-solid fa-chart-line"></i></div>
            <div class="oz-badge-text">
              <span class="oz-badge-val">4.9 / 5.0</span>
              <span class="oz-badge-sub">Client Satisfaction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-hero-split { padding: 80px 0 90px; background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
.oz-hero-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-hero-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 50px; align-items: center; }
.oz-hero-pill { display: inline-flex; align-items: center; background: #eff6ff; color: #0050e5; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.5px; margin-bottom: 20px; border: 1px solid #bfdbfe; }
.oz-hero-headline { font-size: 46px; font-weight: 800; color: #0f172a; line-height: 1.15; letter-spacing: -0.03em; margin: 0 0 20px; }
.oz-hero-subheadline { font-size: 17px; color: #475569; line-height: 1.65; margin: 0 0 32px; max-width: 580px; }
.oz-hero-actions { display: flex; gap: 14px; align-items: center; margin-bottom: 40px; flex-wrap: wrap; }
.oz-btn-hero-primary { background: #0050e5; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; transition: all 0.15s; box-shadow: 0 8px 20px rgba(0,80,229,0.3); }
.oz-btn-hero-primary:hover { background: #0043c2; color: #ffffff; transform: translateY(-2px); }
.oz-btn-hero-outline { background: #ffffff; color: #0f172a; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; border: 1.5px solid #cbd5e1; transition: all 0.15s; }
.oz-btn-hero-outline:hover { background: #f8fafc; border-color: #94a3b8; }
.oz-hero-trust-bar { display: flex; gap: 24px; flex-wrap: wrap; border-top: 1px solid #e2e8f0; padding-top: 24px; }
.oz-trust-item { display: inline-flex; align-items: center; font-size: 13.5px; font-weight: 600; color: #64748b; }
.oz-hero-image-wrap { position: relative; border-radius: 20px; overflow: visible; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15); }
.oz-hero-img { width: 100%; height: 420px; object-fit: cover; border-radius: 20px; display: block; border: 1px solid #e2e8f0; }
.oz-hero-badge-card { position: absolute; bottom: -20px; left: -20px; background: #ffffff; border-radius: 14px; padding: 14px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 12px 30px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; }
.oz-badge-icon { width: 44px; height: 44px; border-radius: 10px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.oz-badge-val { display: block; font-weight: 800; font-size: 17px; color: #0f172a; line-height: 1.2; }
.oz-badge-sub { display: block; font-size: 12px; color: #64748b; font-weight: 500; }
@media (max-width: 991px) {
  .oz-hero-grid { grid-template-columns: 1fr; gap: 40px; }
  .oz-hero-headline { font-size: 34px; }
  .oz-hero-badge-card { position: static; margin-top: 16px; display: inline-flex; }
}`
  },

  // 3. Breadcrumb Header Banner
  {
    id: 'breadcrumb-corporate-header',
    templateKey: 'Breadcrumb_PageHeader',
    categoryKey: 'breadcrumb',
    category: 'breadcrumb',
    name: 'Breadcrumb Page Header',
    variantCode: 'Breadcrumb_PageHeader',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<header class="oz-breadcrumb-banner {{ CustomClass }}" style="background-image: url('{{ BackgroundImageUrl }}');">
  <div class="oz-breadcrumb-overlay"></div>
  <div class="oz-breadcrumb-container">
    {{#if MiniTitle}}<span class="oz-breadcrumb-pill">{{ MiniTitle }}</span>{{/if}}
    <h1 class="oz-breadcrumb-title">{{ Title }}</h1>
    {{#if Description}}<p class="oz-breadcrumb-desc">{{ Description }}</p>{{/if}}
    <nav class="oz-breadcrumb-nav" aria-label="breadcrumb">
      <ol class="oz-breadcrumb-list">
        {{#each BreadcrumbTrail}}
        <li class="oz-breadcrumb-item {{#if IsActive}}active{{/if}}">
          {{#if IsActive}}
          <span>{{ Label }}</span>
          {{else}}
          <a href="{{ Url }}">{{ Label }}</a>
          <i class="fa-solid fa-chevron-right oz-breadcrumb-sep"></i>
          {{/if}}
        </li>
        {{/each}}
      </ol>
    </nav>
  </div>
</header>`,
    cssStyles: `.oz-breadcrumb-banner { position: relative; background-color: #0f172a; background-size: cover; background-position: center; padding: 70px 0 65px; color: #ffffff; font-family: 'Inter', system-ui, sans-serif; text-align: center; }
.oz-breadcrumb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.92) 100%); }
.oz-breadcrumb-container { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 0 24px; }
.oz-breadcrumb-pill { display: inline-block; background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-breadcrumb-title { font-size: 38px; font-weight: 800; color: #ffffff; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-breadcrumb-desc { font-size: 16px; color: #cbd5e1; line-height: 1.6; margin: 0 0 20px; max-width: 680px; margin-left: auto; margin-right: auto; }
.oz-breadcrumb-list { display: inline-flex; align-items: center; gap: 8px; list-style: none; padding: 6px 18px; margin: 0; background: rgba(255,255,255,0.08); border-radius: 30px; font-size: 13px; backdrop-filter: blur(8px); }
.oz-breadcrumb-item a { color: #94a3b8; text-decoration: none; font-weight: 500; transition: color 0.15s; }
.oz-breadcrumb-item a:hover { color: #ffffff; }
.oz-breadcrumb-item.active span { color: #ffffff; font-weight: 700; }
.oz-breadcrumb-sep { font-size: 9px; color: #64748b; margin-left: 8px; }`
  },

  // 4. Feature Grid (3 Columns)
  {
    id: 'body-feature-grid-3',
    templateKey: 'Body_FeatureGrid3',
    categoryKey: 'body',
    category: 'body',
    name: 'Feature Grid (3 Columns)',
    variantCode: 'Body_FeatureGrid3',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-features-section {{ CustomClass }}">
  <div class="oz-features-container">
    <div class="oz-features-header">
      {{#if MiniTitle}}<span class="oz-features-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-features-title">{{ Title }}</h2>
      <p class="oz-features-desc">{{ Description }}</p>
    </div>
    <div class="oz-features-grid">
      {{#each PageSectionLists}}
      <div class="oz-feature-card">
        <div class="oz-feature-icon-box">
          <i class="{{ IconText }}"></i>
        </div>
        <h3 class="oz-feature-card-title">{{ Title }}</h3>
        <p class="oz-feature-card-desc">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    cssStyles: `.oz-features-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-features-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-features-header { text-align: center; max-width: 720px; margin: 0 auto 56px; }
.oz-features-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-features-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-features-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.oz-feature-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 36px 28px; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
.oz-feature-card:hover { border-color: #93c5fd; transform: translateY(-4px); box-shadow: 0 14px 28px rgba(0,80,229,0.08); }
.oz-feature-icon-box { width: 54px; height: 54px; border-radius: 14px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 22px; }
.oz-feature-card-title { font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
.oz-feature-card-desc { font-size: 14.5px; color: #64748b; line-height: 1.6; margin: 0; }
@media (max-width: 991px) {
  .oz-features-grid { grid-template-columns: 1fr; }
}`
  },

  // 5. Milestone Stats Counters
  {
    id: 'body-stats-counters',
    templateKey: 'Body_StatsCounters',
    categoryKey: 'body',
    category: 'body',
    name: 'Milestone Stats Counters',
    variantCode: 'Body_StatsCounters',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-stats-section {{ CustomClass }}">
  <div class="oz-stats-container">
    <div class="oz-stats-header">
      {{#if MiniTitle}}<span class="oz-stats-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-stats-title">{{ Title }}</h2>
      <p class="oz-stats-desc">{{ Description }}</p>
    </div>
    <div class="oz-stats-grid">
      {{#each PageSectionLists}}
      <div class="oz-stat-card">
        <div class="oz-stat-icon-wrap"><i class="{{ IconText }}"></i></div>
        <div class="oz-stat-val">{{ Title }}</div>
        <div class="oz-stat-label">{{ Description }}</div>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    cssStyles: `.oz-stats-section { padding: 80px 0; background: #0f172a; color: #ffffff; font-family: 'Inter', system-ui, sans-serif; text-align: center; }
.oz-stats-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-stats-header { max-width: 680px; margin: 0 auto 50px; }
.oz-stats-badge { display: inline-block; background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-stats-title { font-size: 32px; font-weight: 800; color: #ffffff; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-stats-desc { font-size: 15.5px; color: #94a3b8; line-height: 1.6; margin: 0; }
.oz-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.oz-stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 32px 20px; transition: transform 0.2s; }
.oz-stat-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.07); }
.oz-stat-icon-wrap { font-size: 28px; margin-bottom: 14px; color: #38bdf8; }
.oz-stat-val { font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; line-height: 1; margin-bottom: 8px; }
.oz-stat-label { font-size: 14px; color: #94a3b8; font-weight: 500; }
@media (max-width: 991px) {
  .oz-stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 575px) {
  .oz-stats-grid { grid-template-columns: 1fr; }
}`
  },

  // 6. Split Media Showcase (Why Choose Us / Mission)
  {
    id: 'body-mission-split',
    templateKey: 'Body_MissionSplit',
    categoryKey: 'body',
    category: 'body',
    name: 'Split Media Showcase',
    variantCode: 'Body_MissionSplit',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-mission-section {{ CustomClass }}">
  <div class="oz-mission-container">
    <div class="oz-mission-grid">
      <div class="oz-mission-media">
        <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-mission-img" onerror="this.src='https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80'" />
      </div>
      <div class="oz-mission-content">
        {{#if MiniTitle}}<span class="oz-mission-badge">{{ MiniTitle }}</span>{{/if}}
        <h2 class="oz-mission-title">{{ Title }}</h2>
        <p class="oz-mission-desc">{{ Description }}</p>
        <div class="oz-mission-points">
          {{#each PageSectionLists}}
          <div class="oz-mission-point">
            <div class="oz-point-icon"><i class="{{ IconText }}"></i></div>
            <div class="oz-point-text">
              <h4 class="oz-point-title">{{ Title }}</h4>
              <p class="oz-point-desc">{{ Description }}</p>
            </div>
          </div>
          {{/each}}
        </div>
      </div>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-mission-section { padding: 85px 0; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
.oz-mission-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-mission-grid { display: grid; grid-template-columns: 1fr 1.15fr; gap: 50px; align-items: center; }
.oz-mission-img { width: 100%; height: 440px; object-fit: cover; border-radius: 18px; box-shadow: 0 16px 36px rgba(0,0,0,0.08); }
.oz-mission-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 14px; }
.oz-mission-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 16px; letter-spacing: -0.02em; }
.oz-mission-desc { font-size: 16px; color: #64748b; line-height: 1.65; margin: 0 0 28px; }
.oz-mission-points { display: flex; flex-direction: column; gap: 20px; }
.oz-mission-point { display: flex; gap: 16px; align-items: flex-start; }
.oz-point-icon { width: 42px; height: 42px; border-radius: 10px; background: #ffffff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.oz-point-title { font-size: 16.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.oz-point-desc { font-size: 14px; color: #64748b; line-height: 1.5; margin: 0; }
@media (max-width: 991px) {
  .oz-mission-grid { grid-template-columns: 1fr; }
}`
  },

  // 7. Process Steps
  {
    id: 'body-process-steps',
    templateKey: 'Body_ProcessSteps',
    categoryKey: 'body',
    category: 'body',
    name: 'Strategic Process Steps',
    variantCode: 'Body_ProcessSteps',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-process-section {{ CustomClass }}">
  <div class="oz-process-container">
    <div class="oz-process-header">
      {{#if MiniTitle}}<span class="oz-process-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-process-title">{{ Title }}</h2>
      <p class="oz-process-desc">{{ Description }}</p>
    </div>
    <div class="oz-process-grid">
      {{#each PageSectionLists}}
      <div class="oz-process-card">
        <div class="oz-process-step-num">{{ MiniTitle }}</div>
        <h3 class="oz-process-card-title">{{ Title }}</h3>
        <p class="oz-process-card-desc">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    cssStyles: `.oz-process-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-process-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-process-header { text-align: center; max-width: 680px; margin: 0 auto 56px; }
.oz-process-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-process-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-process-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-process-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.oz-process-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 22px; position: relative; }
.oz-process-step-num { font-size: 12px; font-weight: 800; color: #0050e5; background: #eff6ff; display: inline-block; padding: 4px 10px; border-radius: 8px; margin-bottom: 16px; }
.oz-process-card-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
.oz-process-card-desc { font-size: 14px; color: #64748b; line-height: 1.55; margin: 0; }
@media (max-width: 991px) {
  .oz-process-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 575px) {
  .oz-process-grid { grid-template-columns: 1fr; }
}`
  },

  // 8. Testimonials Grid
  {
    id: 'body-testimonials-grid',
    templateKey: 'Body_Testimonials',
    categoryKey: 'body',
    category: 'body',
    name: 'Executive Testimonials Grid',
    variantCode: 'Body_Testimonials',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-testimonials-section {{ CustomClass }}">
  <div class="oz-testimonials-container">
    <div class="oz-testimonials-header">
      {{#if MiniTitle}}<span class="oz-testimonials-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-testimonials-title">{{ Title }}</h2>
      <p class="oz-testimonials-desc">{{ Description }}</p>
    </div>
    <div class="oz-testimonials-grid">
      {{#each PageSectionLists}}
      <div class="oz-testimonial-card">
        <div class="oz-testimonial-stars">
          <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
        </div>
        <p class="oz-testimonial-quote">"{{ Description }}"</p>
        <div class="oz-testimonial-author">
          <div class="oz-author-avatar">{{ MiniTitle }}</div>
          <div class="oz-author-info">
            <h4 class="oz-author-name">{{ Title }}</h4>
            <span class="oz-author-role">{{ MoreDescription }}</span>
          </div>
        </div>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    cssStyles: `.oz-testimonials-section { padding: 85px 0; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
.oz-testimonials-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-testimonials-header { text-align: center; max-width: 680px; margin: 0 auto 54px; }
.oz-testimonials-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-testimonials-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-testimonials-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.oz-testimonial-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 32px 26px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
.oz-testimonial-stars { color: #f59e0b; font-size: 14px; margin-bottom: 16px; display: flex; gap: 4px; }
.oz-testimonial-quote { font-size: 15px; color: #334155; line-height: 1.65; font-style: italic; margin: 0 0 24px; }
.oz-testimonial-author { display: flex; align-items: center; gap: 14px; }
.oz-author-avatar { width: 44px; height: 44px; border-radius: 50%; background: #0050e5; color: #ffffff; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; }
.oz-author-name { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
.oz-author-role { font-size: 12.5px; color: #64748b; }
@media (max-width: 991px) {
  .oz-testimonials-grid { grid-template-columns: 1fr; }
}`
  },

  // 9. CTA Split Banner
  {
    id: 'body-cta-split',
    templateKey: 'Body_CtaSplit',
    categoryKey: 'body',
    category: 'body',
    name: 'Call to Action Split Banner',
    variantCode: 'Body_CtaSplit',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-cta-section {{ CustomClass }}">
  <div class="oz-cta-container">
    <div class="oz-cta-card">
      <div class="oz-cta-content">
        <span class="oz-cta-badge">GET STARTED TODAY</span>
        <h2 class="oz-cta-title">Ready to Accelerate Your Enterprise Operations?</h2>
        <p class="oz-cta-desc">Connect with our specialists to explore bespoke solutions and schedule your consultation.</p>
      </div>
      <div class="oz-cta-actions">
        <a href="/contact" class="oz-btn-cta-white">Schedule Consultation</a>
        <a href="/services" class="oz-btn-cta-ghost">Explore Offerings</a>
      </div>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-cta-section { padding: 60px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-cta-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-cta-card { background: linear-gradient(135deg, #0050e5 0%, #003699 100%); border-radius: 20px; padding: 50px 48px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; gap: 36px; box-shadow: 0 20px 40px rgba(0,80,229,0.25); }
.oz-cta-badge { display: inline-block; background: rgba(255,255,255,0.18); font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 14px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-cta-title { font-size: 30px; font-weight: 800; color: #ffffff; margin: 0 0 10px; letter-spacing: -0.02em; }
.oz-cta-desc { font-size: 15.5px; color: #dbeafe; line-height: 1.55; margin: 0; max-width: 580px; }
.oz-cta-actions { display: flex; gap: 14px; flex-shrink: 0; }
.oz-btn-cta-white { background: #ffffff; color: #0050e5; font-weight: 700; font-size: 14.5px; padding: 13px 26px; border-radius: 10px; text-decoration: none; transition: transform 0.15s; }
.oz-btn-cta-white:hover { transform: translateY(-2px); color: #0043c2; }
.oz-btn-cta-ghost { background: transparent; color: #ffffff; border: 1.5px solid rgba(255,255,255,0.4); font-weight: 700; font-size: 14.5px; padding: 13px 26px; border-radius: 10px; text-decoration: none; transition: all 0.15s; }
.oz-btn-cta-ghost:hover { background: rgba(255,255,255,0.1); border-color: #ffffff; }
@media (max-width: 991px) {
  .oz-cta-card { flex-direction: column; align-items: flex-start; padding: 36px 28px; }
  .oz-cta-actions { width: 100%; flex-direction: column; }
  .oz-btn-cta-white, .oz-btn-cta-ghost { text-align: center; }
}`
  },

  // 10. FAQ Accordion
  {
    id: 'body-faq-accordion',
    templateKey: 'Body_FaqAccordion',
    categoryKey: 'body',
    category: 'body',
    name: 'Corporate FAQ Accordion',
    variantCode: 'Body_FaqAccordion',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-faq-section {{ CustomClass }}">
  <div class="oz-faq-container">
    <div class="oz-faq-header">
      <span class="oz-faq-badge">FREQUENTLY ASKED QUESTIONS</span>
      <h2 class="oz-faq-title">Answers to Common Questions</h2>
      <p class="oz-faq-desc">Everything you need to know about our services, onboarding, and platform capabilities.</p>
    </div>
    <div class="oz-faq-list">
      <div class="oz-faq-item">
        <details>
          <summary class="oz-faq-question">How quickly can our organization get onboarded? <i class="fa-solid fa-chevron-down oz-faq-icon"></i></summary>
          <div class="oz-faq-answer"><p>Standard onboarding typically completes within 1 to 3 business days, including workspace initialization, member access, and domain mapping.</p></div>
        </details>
      </div>
      <div class="oz-faq-item">
        <details>
          <summary class="oz-faq-question">What data security and compliance measures are in place? <i class="fa-solid fa-chevron-down oz-faq-icon"></i></summary>
          <div class="oz-faq-answer"><p>We adhere to strict sovereign data segregation with AES-256 encryption at rest, TLS 1.3 in transit, and role-based permissions.</p></div>
        </details>
      </div>
      <div class="oz-faq-item">
        <details>
          <summary class="oz-faq-question">Can we customize templates and form workflows? <i class="fa-solid fa-chevron-down oz-faq-icon"></i></summary>
          <div class="oz-faq-answer"><p>Yes, all templates, navigation menus, dynamic forms, and code injections can be tailored directly in your administrative console.</p></div>
        </details>
      </div>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-faq-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-faq-container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.oz-faq-header { text-align: center; margin-bottom: 48px; }
.oz-faq-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-faq-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-faq-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-faq-list { display: flex; flex-direction: column; gap: 14px; }
.oz-faq-item details { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 18px 24px; transition: border-color 0.15s; }
.oz-faq-item details[open] { border-color: #93c5fd; background: #ffffff; }
.oz-faq-question { font-size: 16.5px; font-weight: 700; color: #0f172a; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; }
.oz-faq-question::-webkit-details-marker { display: none; }
.oz-faq-icon { font-size: 13px; color: #64748b; transition: transform 0.2s; }
details[open] .oz-faq-icon { transform: rotate(180deg); }
.oz-faq-answer { margin-top: 14px; font-size: 15px; color: #475569; line-height: 1.6; }
.oz-faq-answer p { margin: 0; }`
  },

  // 11. Newsletter Minimal Bar
  {
    id: 'news-minimal-bar',
    templateKey: 'News_MinimalBar',
    categoryKey: 'body',
    category: 'body',
    name: 'Newsletter Minimal Bar',
    variantCode: 'News_MinimalBar',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-newsletter-bar {{ CustomClass }}">
  <div class="oz-news-container">
    <div class="oz-news-row">
      <div class="oz-news-text">
        <span class="oz-news-badge"><i class="fa-solid fa-envelope-open-text me-1"></i> NEWSLETTER</span>
        <h3 class="oz-news-title">{{ Title }}</h3>
        <p class="oz-news-desc">{{ Description }}</p>
      </div>
      <div class="oz-news-form-wrap">
        <form class="oz-news-form" onsubmit="event.preventDefault(); alert('Thank you for subscribing! Check your inbox for confirmation.');">
          <input type="email" placeholder="name@company.com" required class="oz-news-input" />
          <button type="submit" class="oz-news-submit">Subscribe</button>
        </form>
      </div>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-newsletter-bar { padding: 48px 0; background: #f1f5f9; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
.oz-news-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-news-row { display: flex; justify-content: space-between; align-items: center; gap: 32px; }
.oz-news-badge { display: inline-block; font-size: 11px; font-weight: 800; color: #0050e5; margin-bottom: 6px; letter-spacing: 0.5px; }
.oz-news-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px; letter-spacing: -0.02em; }
.oz-news-desc { font-size: 14.5px; color: #64748b; margin: 0; }
.oz-news-form { display: flex; gap: 10px; max-width: 440px; }
.oz-news-input { flex: 1; padding: 12px 18px; border: 1.5px solid #cbd5e1; border-radius: 9px; font-size: 14px; outline: none; background: #ffffff; }
.oz-news-input:focus { border-color: #0050e5; }
.oz-news-submit { background: #0050e5; color: #ffffff; border: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 9px; cursor: pointer; transition: background 0.15s; }
.oz-news-submit:hover { background: #0043c2; }
@media (max-width: 768px) {
  .oz-news-row { flex-direction: column; align-items: flex-start; }
  .oz-news-form { width: 100%; }
}`
  },

  // 12. Contact Split Details
  {
    id: 'contact-split-details',
    templateKey: 'Contact_SplitDetails',
    categoryKey: 'body',
    category: 'body',
    name: 'Contact Split Details',
    variantCode: 'Contact_SplitDetails',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-contact-section {{ CustomClass }}">
  <div class="oz-contact-container">
    <div class="oz-contact-grid">
      <div class="oz-contact-info-col">
        <span class="oz-contact-badge">GET IN TOUCH</span>
        <h2 class="oz-contact-title">We'd Love to Hear From You</h2>
        <p class="oz-contact-desc">Reach out directly to our team with your inquiry, service request, or consultation request.</p>
        <div class="oz-contact-card-list">
          <div class="oz-contact-card">
            <i class="fa-solid fa-location-dot oz-contact-card-icon"></i>
            <div>
              <h4 class="oz-card-h4">Headquarters</h4>
              <p class="oz-card-val">{{ Address }}</p>
            </div>
          </div>
          <div class="oz-contact-card">
            <i class="fa-solid fa-envelope oz-contact-card-icon"></i>
            <div>
              <h4 class="oz-card-h4">Official Email</h4>
              <p class="oz-card-val"><a href="mailto:{{ Email }}">{{ Email }}</a></p>
            </div>
          </div>
          <div class="oz-contact-card">
            <i class="fa-solid fa-phone oz-contact-card-icon"></i>
            <div>
              <h4 class="oz-card-h4">Direct Phone</h4>
              <p class="oz-card-val"><a href="tel:{{ Phone }}">{{ Phone }}</a></p>
            </div>
          </div>
          <div class="oz-contact-card">
            <i class="fa-solid fa-clock oz-contact-card-icon"></i>
            <div>
              <h4 class="oz-card-h4">Business Hours</h4>
              <p class="oz-card-val">{{ WorkingHours }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="oz-contact-form-col">
        <div class="oz-contact-form-card">
          <h3 class="oz-form-title">Send a Message</h3>
          <p class="oz-form-sub">Our advisory specialists respond within one business day.</p>
          <form onsubmit="event.preventDefault(); alert('Message sent successfully! Our team will contact you shortly.');">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold">Full Name *</label>
                <input type="text" class="form-control" placeholder="e.g. First Last" required />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Email Address *</label>
                <input type="email" class="form-control" placeholder="name@company.com" required />
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Subject</label>
                <input type="text" class="form-control" placeholder="e.g. Partnership Inquiry" />
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Message *</label>
                <textarea class="form-control" rows="4" placeholder="Please describe your requirements in detail..." required></textarea>
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold">Submit Message</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-contact-section { padding: 85px 0; background: #f8fafc; font-family: 'Inter', system-ui, sans-serif; }
.oz-contact-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-contact-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 50px; align-items: flex-start; }
.oz-contact-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-contact-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-contact-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0 0 32px; }
.oz-contact-card-list { display: flex; flex-direction: column; gap: 16px; }
.oz-contact-card { display: flex; gap: 16px; align-items: flex-start; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; }
.oz-contact-card-icon { width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #0050e5; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
.oz-card-h4 { font-size: 14.5px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.oz-card-val { font-size: 14px; color: #64748b; margin: 0; line-height: 1.4; }
.oz-card-val a { color: #0050e5; text-decoration: none; }
.oz-contact-form-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
.oz-form-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
.oz-form-sub { font-size: 14px; color: #64748b; margin: 0 0 24px; }
@media (max-width: 991px) {
  .oz-contact-grid { grid-template-columns: 1fr; }
}`
  },

  // 13. Service Intake / Request Form
  {
    id: 'body-request-service',
    templateKey: 'Body_RequestService',
    categoryKey: 'body',
    category: 'body',
    name: 'Service Request & Intake Form',
    variantCode: 'Body_RequestService',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-service-intake-section {{ CustomClass }}">
  <div class="oz-intake-container">
    <div class="oz-intake-header">
      <span class="oz-intake-badge">PROJECT INTAKE</span>
      <h2 class="oz-intake-title">Request a Service Consultation</h2>
      <p class="oz-intake-desc">Provide your organization specifications below and an advisory director will prepare a tailored proposal.</p>
    </div>
    <div class="oz-intake-card">
      <form onsubmit="event.preventDefault(); alert('Service request received! Our technical advisory team will contact you within 1 business day.');">
        <div class="row g-4">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Full Name *</label>
            <input type="text" class="form-control" placeholder="e.g. First Last" required />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Business Email *</label>
            <input type="email" class="form-control" placeholder="name@company.com" required />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Phone Number</label>
            <input type="tel" class="form-control" placeholder="e.g. +1 (555) 000-0000" />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Target Practice Area *</label>
            <select class="form-select" required>
              <option value="" selected disabled>Select a Practice Area</option>
              <option value="strategic-advisory">Strategic Consulting</option>
              <option value="systems-modernization">Systems Modernization</option>
              <option value="cloud-architecture">Cloud Architecture & Reliability</option>
              <option value="compliance-governance">Governance, Risk & Compliance</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold">Project Scope & Objectives *</label>
            <textarea class="form-control" rows="4" placeholder="Describe your organizational objectives, timeline, and key requirements..." required></textarea>
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-primary px-4 py-2 fw-semibold">Submit Service Request</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</section>`,
    cssStyles: `.oz-service-intake-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-intake-container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.oz-intake-header { text-align: center; margin-bottom: 48px; }
.oz-intake-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-intake-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.02em; }
.oz-intake-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-intake-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); }`
  },

  // 14. Blog Article Grid
  {
    id: 'blog-article-grid',
    templateKey: 'Blog_ArticleGrid',
    categoryKey: 'blog',
    category: 'blog',
    name: 'Corporate Blog Article Grid',
    variantCode: 'Blog_ArticleGrid',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<section class="oz-blog-section {{ CustomClass }}">
  <div class="oz-blog-container">
    <div class="oz-blog-header">
      {{#if MiniTitle}}<span class="oz-blog-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-blog-title">{{ Title }}</h2>
      {{#if Description}}<p class="oz-blog-desc">{{ Description }}</p>{{/if}}
    </div>
    <div class="oz-articles-grid">
      {{#each Articles}}
      <article class="oz-article-card">
        {{#if ImageUrl}}
        <div class="oz-card-media">
          <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-card-img" />
          {{#if Category}}<span class="oz-card-category">{{ Category }}</span>{{/if}}
        </div>
        {{/if}}
        <div class="oz-card-content">
          <div class="oz-card-meta">
            <span class="oz-meta-date"><i class="fa-regular fa-calendar me-1"></i>{{ Date }}</span>
            <span class="oz-meta-author"><i class="fa-regular fa-user me-1 ms-2"></i>{{ Author }}</span>
          </div>
          <h3 class="oz-card-title"><a href="{{ DirectUrl }}" class="oz-card-title-link">{{ Title }}</a></h3>
          {{#if Excerpt}}<p class="oz-card-summary">{{ Excerpt }}</p>{{/if}}
          <div class="oz-card-footer">
            <a href="{{ DirectUrl }}" class="oz-card-read-more">Read Article <i class="fa-solid fa-arrow-right ms-1"></i></a>
          </div>
        </div>
      </article>
      {{/each}}
    </div>
  </div>
</section>`,
    cssStyles: `.oz-blog-section { padding: 85px 0; background: #ffffff; font-family: 'Inter', system-ui, sans-serif; }
.oz-blog-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-blog-header { text-align: center; max-width: 680px; margin: 0 auto 50px; }
.oz-blog-badge { display: inline-block; background: #eff6ff; color: #0050e5; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 16px; letter-spacing: 0.5px; margin-bottom: 12px; }
.oz-blog-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px; letter-spacing: -0.02em; }
.oz-blog-desc { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-articles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.oz-article-card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
.oz-article-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.08); border-color: #93c5fd; }
.oz-card-media { position: relative; height: 210px; overflow: hidden; }
.oz-card-img { width: 100%; height: 100%; object-fit: cover; }
.oz-card-category { position: absolute; top: 12px; left: 12px; background: rgba(15,23,42,0.85); color: #ffffff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; backdrop-filter: blur(4px); }
.oz-card-content { padding: 24px; display: flex; flex-direction: column; flex: 1; }
.oz-card-meta { font-size: 12.5px; color: #94a3b8; margin-bottom: 10px; }
.oz-card-title { font-size: 18px; font-weight: 700; margin: 0 0 10px; line-height: 1.35; }
.oz-card-title-link { color: #0f172a; text-decoration: none; transition: color 0.15s; }
.oz-card-title-link:hover { color: #0050e5; }
.oz-card-summary { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 16px; flex: 1; }
.oz-card-footer { border-top: 1px solid #f1f5f9; padding-top: 14px; }
.oz-card-read-more { color: #0050e5; font-weight: 700; font-size: 13.5px; text-decoration: none; display: inline-flex; align-items: center; }
@media (max-width: 991px) {
  .oz-articles-grid { grid-template-columns: 1fr; }
}`
  },

  // 15. Footer Section
  {
    id: 'footer-corporate-multi',
    templateKey: 'Footer_CorporateMultiColumn',
    categoryKey: 'footer',
    category: 'footer',
    name: 'Corporate Multi-Column Footer',
    variantCode: 'Footer_CorporateMultiColumn',
    isActive: true,
    isDefault: true,
    htmlTemplate: `<footer class="oz-footer-section {{ CustomClass }}">
  <div class="oz-footer-container">
    <div class="oz-footer-grid">
      <div class="oz-footer-brand-col">
        <a class="oz-footer-brand-link" href="{{ HomeUrl }}">
          {{#if BrandLogo}}
          <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="oz-footer-brand-logo" />
          {{else}}
          <span class="oz-footer-brand-title">{{ BrandName }}</span>
          {{/if}}
        </a>
        <p class="oz-footer-desc">{{ Description }}</p>
        <div class="oz-footer-contacts">
          {{#if Email}}<div class="oz-footer-contact-item"><i class="fa-solid fa-envelope"></i><span><a href="mailto:{{ Email }}">{{ Email }}</a></span></div>{{/if}}
          {{#if Phone}}<div class="oz-footer-contact-item"><i class="fa-solid fa-phone"></i><span><a href="tel:{{ Phone }}">{{ Phone }}</a></span></div>{{/if}}
          {{#if Address}}<div class="oz-footer-contact-item"><i class="fa-solid fa-location-dot"></i><span>{{ Address }}</span></div>{{/if}}
        </div>
        <div class="oz-footer-socials">
          <a href="#" class="oz-footer-social-icon" title="Twitter"><i class="fa-brands fa-x-twitter"></i></a>
          <a href="#" class="oz-footer-social-icon" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
          <a href="#" class="oz-footer-social-icon" title="Facebook"><i class="fa-brands fa-facebook"></i></a>
        </div>
      </div>
      <div class="oz-footer-nav-group">
        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">Solutions</h4>
          <ul class="oz-footer-links">
            <li><a href="/services" class="oz-footer-link">Strategic Consulting</a></li>
            <li><a href="/services" class="oz-footer-link">Systems Modernization</a></li>
            <li><a href="/services" class="oz-footer-link">Performance & Scale</a></li>
            <li><a href="/services" class="oz-footer-link">Enterprise Governance</a></li>
          </ul>
        </div>
        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">Company</h4>
          <ul class="oz-footer-links">
            <li><a href="/about" class="oz-footer-link">About Us</a></li>
            <li><a href="/request-service" class="oz-footer-link">Request a Service</a></li>
            <li><a href="/contact" class="oz-footer-link">Contact Us</a></li>
            <li><a href="/blog" class="oz-footer-link">News & Insights</a></li>
          </ul>
        </div>
        <div class="oz-footer-col">
          <h4 class="oz-footer-col-title">Legal & Security</h4>
          <ul class="oz-footer-links">
            {{#each LegalPages}}
            <li><a href="{{ Url }}" class="oz-footer-link">{{ Title }}</a></li>
            {{/each}}
            <li><a href="/privacy-policy" class="oz-footer-link">Privacy Policy</a></li>
            <li><a href="/terms-and-conditions" class="oz-footer-link">Terms of Service</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class="oz-footer-bottom">
      <p class="oz-footer-copyright">&copy; {{ Year }} {{ BrandName }}. All rights reserved.</p>
      <div class="oz-footer-bottom-links">
        <a href="/privacy-policy">Privacy</a>
        <span>&bull;</span>
        <a href="/terms-and-conditions">Terms</a>
        <span>&bull;</span>
        <a href="/auth/login">Portal Sign In</a>
      </div>
    </div>
  </div>
</footer>`,
    cssStyles: `.oz-footer-section { background: #0f172a; color: #cbd5e1; padding: 70px 0 30px; font-family: 'Inter', system-ui, sans-serif; }
.oz-footer-container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.oz-footer-grid { display: grid; grid-template-columns: 1.3fr 2fr; gap: 60px; margin-bottom: 50px; }
.oz-footer-brand-title { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
.oz-footer-brand-logo { max-height: 40px; width: auto; object-fit: contain; }
.oz-footer-desc { font-size: 14.5px; color: #94a3b8; line-height: 1.6; margin: 16px 0 24px; max-width: 360px; }
.oz-footer-contacts { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.oz-footer-contact-item { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #94a3b8; }
.oz-footer-contact-item i { width: 16px; color: #38bdf8; }
.oz-footer-contact-item a { color: #94a3b8; text-decoration: none; }
.oz-footer-contact-item a:hover { color: #ffffff; }
.oz-footer-socials { display: flex; gap: 12px; }
.oz-footer-social-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 14px; text-decoration: none; transition: all 0.15s; }
.oz-footer-social-icon:hover { background: #0050e5; color: #ffffff; }
.oz-footer-nav-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.oz-footer-col-title { font-size: 15px; font-weight: 700; color: #ffffff; margin: 0 0 18px; letter-spacing: -0.01em; }
.oz-footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.oz-footer-link { color: #94a3b8; text-decoration: none; font-size: 14px; transition: color 0.15s; }
.oz-footer-link:hover { color: #ffffff; }
.oz-footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 26px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; flex-wrap: wrap; gap: 14px; }
.oz-footer-copyright { margin: 0; }
.oz-footer-bottom-links { display: flex; gap: 12px; align-items: center; }
.oz-footer-bottom-links a { color: #64748b; text-decoration: none; transition: color 0.15s; }
.oz-footer-bottom-links a:hover { color: #cbd5e1; }
@media (max-width: 991px) {
  .oz-footer-grid { grid-template-columns: 1fr; gap: 40px; }
  .oz-footer-nav-group { grid-template-columns: repeat(2, 1fr); gap: 24px; }
}
@media (max-width: 575px) {
  .oz-footer-nav-group { grid-template-columns: 1fr; }
  .oz-footer-bottom { flex-direction: column; align-items: flex-start; }
}`
  }
];

export const DEFAULT_SHOWCASE_SECTIONS = [
  {
    templateKey: 'Hero_CorporateSplit',
    title: 'Empowering Modern Enterprises to Scale with Confidence.',
    miniTitle: 'SOLUTIONS',
    description: 'Delivering innovative solutions, strategic consulting, and operational excellence to help your business achieve sustainable success.',
    buttonText: 'Explore Offerings',
    buttonLink: '/services',
    secondButtonText: 'Schedule Consultation',
    secondButtonLink: '/contact',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    directUrl: 'home-hero',
    pageSortOrder: 1
  },
  {
    templateKey: 'Body_FeatureGrid3',
    title: 'Engineered for Maximum Impact',
    miniTitle: 'CORE CAPABILITIES',
    description: 'Essential infrastructure designed for seamless organizational execution and rapid growth.',
    directUrl: 'features',
    pageSortOrder: 2,
    pageSectionLists: [
      { title: 'Data Security & Privacy', description: 'Enterprise-grade encryption, role-based access management, and proactive compliance protection.', iconText: 'fa-solid fa-shield-halved', sortOrder: 1 },
      { title: 'Collaboration Hub', description: 'Unified communication channels, real-time dispatches, and organizational announcements.', iconText: 'fa-solid fa-comments', sortOrder: 2 },
      { title: 'Operational Efficiency', description: 'Modern automated workflows engineered to eliminate administrative bottlenecks and elevate team productivity.', iconText: 'fa-solid fa-bolt', sortOrder: 3 }
    ]
  },
  {
    templateKey: 'Body_MissionSplit',
    title: 'Engineered for Agility, Reliability, and Measurable Growth',
    miniTitle: 'WHY CHOOSE US',
    description: 'We combine deep technical expertise, industry best practices, and a client-centered methodology to deliver measurable organizational outcomes.',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80',
    directUrl: 'why-choose-us',
    pageSortOrder: 3,
    pageSectionLists: [
      { title: 'Zero Operational Downtime', description: 'High-availability cloud infrastructure engineered to keep your critical business systems online 24/7/365.', iconText: 'fa-solid fa-bolt text-warning', sortOrder: 1 },
      { title: 'Transparent Strategic Roadmaps', description: 'Every initiative is supported by clear timelines, verifiable KPIs, and proactive milestone reporting.', iconText: 'fa-solid fa-chart-line text-primary', sortOrder: 2 },
      { title: 'Comprehensive Client Confidentiality', description: 'End-to-end data security and compliance safeguards protecting your corporate and proprietary information.', iconText: 'fa-solid fa-lock text-success', sortOrder: 3 }
    ]
  },
  {
    templateKey: 'Body_StatsCounters',
    title: 'Measurable Performance at Scale',
    miniTitle: 'BY THE NUMBERS',
    description: 'Our proven track record demonstrates enterprise reliability and measurable impact.',
    directUrl: 'metrics',
    pageSortOrder: 4,
    pageSectionLists: [
      { title: '12,500+', description: 'Verified Members', iconText: 'fa-solid fa-users text-primary', sortOrder: 1 },
      { title: '99.98%', description: 'System Reliability', iconText: 'fa-solid fa-server text-success', sortOrder: 2 },
      { title: '45+', description: 'Global Chapters', iconText: 'fa-solid fa-earth-americas text-info', sortOrder: 3 },
      { title: '24/7', description: 'Priority Support', iconText: 'fa-solid fa-headset text-warning', sortOrder: 4 }
    ]
  },
  {
    templateKey: 'Body_Testimonials',
    title: 'Trusted by Clients & Industry Leaders',
    miniTitle: 'CLIENT TESTIMONIALS',
    description: 'Hear directly from businesses and partners who rely on our services for sustainable growth.',
    directUrl: 'testimonials',
    pageSortOrder: 5,
    pageSectionLists: [
      { title: 'Sarah Adams', miniTitle: 'SA', description: 'Working with our partners transformed our operational efficiency. Their team provided clear strategic direction and delivered outstanding results from day one.', moreDescription: 'Chief Operating Officer', sortOrder: 1 },
      { title: 'Marcus Kim', miniTitle: 'MK', description: 'Their professionalism, deep industry expertise, and responsive support have made them an indispensable partner in scaling our business.', moreDescription: 'Managing Director', sortOrder: 2 },
      { title: 'Elena Rostova', miniTitle: 'EL', description: 'The quality of execution and attention to detail exceeded our expectations. They consistently deliver on time and above benchmark.', moreDescription: 'VP of Business Development', sortOrder: 3 }
    ]
  },
  {
    templateKey: 'Body_CtaSplit',
    title: 'Ready to Accelerate Your Enterprise Operations?',
    miniTitle: 'GET STARTED TODAY',
    description: 'Connect with our specialists to explore bespoke solutions and schedule your consultation.',
    buttonText: 'Schedule Consultation',
    buttonLink: '/contact',
    secondButtonText: 'Explore Offerings',
    secondButtonLink: '/services',
    directUrl: 'cta-banner',
    pageSortOrder: 6
  },
  {
    templateKey: 'Body_FaqAccordion',
    title: 'Answers to Common Questions',
    miniTitle: 'FREQUENTLY ASKED QUESTIONS',
    description: 'Everything you need to know about our services, onboarding, and platform capabilities.',
    directUrl: 'faq',
    pageSortOrder: 7
  },
  {
    templateKey: 'News_MinimalBar',
    title: 'Subscribe to Executive Briefings',
    miniTitle: 'NEWSLETTER',
    description: 'Receive periodic industry advisories, corporate bulletins, and platform updates directly in your inbox.',
    directUrl: 'newsletter-bar',
    pageSortOrder: 8
  }
];

export const DEFAULT_PAGE_BLUEPRINTS: Record<string, any> = {
  about: {
    title: 'About Us',
    miniTitle: 'ABOUT OUR FIRM',
    description: 'Empowering modern enterprises with strategic advisory, operational governance, and sustainable digital architecture.',
    headerImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    sections: [
      {
        templateKey: 'Body_MissionSplit',
        title: 'Our Vision & Strategic Purpose',
        miniTitle: 'WHO WE ARE',
        description: 'We believe exceptional organizations are powered by resilient architectures, clear governance, and relentless focus on client value.',
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=80',
        pageSectionLists: [
          { title: 'Institutional Independence', description: 'Autonomous architecture ensuring your organizational sovereignty and proprietary control.', iconText: 'fa-solid fa-lock text-primary', sortOrder: 1 },
          { title: 'Continuous Modernization', description: 'Proactive engineering pipelines adapting to shifting market conditions and security standards.', iconText: 'fa-solid fa-arrows-rotate text-info', sortOrder: 2 },
          { title: 'Measurable Outcomes', description: 'Every initiative backed by verifiable milestones, clear SLAs, and client accountability.', iconText: 'fa-solid fa-award text-success', sortOrder: 3 }
        ]
      },
      {
        templateKey: 'Body_ProcessSteps',
        title: 'Our Proven 4-Step Strategic Methodology',
        miniTitle: 'HOW WE DELIVER',
        description: 'A structured approach engineered to transition your organizational vision into measurable reality.',
        pageSectionLists: [
          { title: 'Discovery & Audit', miniTitle: 'Step 01', description: 'Thorough analysis of existing organizational processes, bottlenecks, and security postures.', sortOrder: 1 },
          { title: 'Architecture & Roadmap', miniTitle: 'Step 02', description: 'Collaborative blueprint design with verifiable KPIs and phased delivery milestones.', sortOrder: 2 },
          { title: 'Implementation & Testing', miniTitle: 'Step 03', description: 'Iterative rollout with rigorous testing and zero operational downtime.', sortOrder: 3 },
          { title: 'Continuous Optimization', miniTitle: 'Step 04', description: 'Proactive SLA management, ongoing improvements, and executive governance.', sortOrder: 4 }
        ]
      },
      {
        templateKey: 'Body_StatsCounters',
        title: 'Institutional Benchmark Metrics',
        miniTitle: 'VERIFIED IMPACT',
        description: 'Demonstrating quantifiable business value across global organizational engagements.',
        pageSectionLists: [
          { title: '12,500+', description: 'Active Members & Users', iconText: 'fa-solid fa-users text-primary', sortOrder: 1 },
          { title: '99.98%', description: 'System Reliability', iconText: 'fa-solid fa-server text-success', sortOrder: 2 },
          { title: '45+', description: 'Global Chapters & Branches', iconText: 'fa-solid fa-earth-americas text-info', sortOrder: 3 },
          { title: '24/7', description: 'Priority Support & Advisory', iconText: 'fa-solid fa-headset text-warning', sortOrder: 4 }
        ]
      }
    ]
  },

  services: {
    title: 'Services & Solutions',
    miniTitle: 'OUR PRACTICE AREAS',
    description: 'Comprehensive solutions designed to elevate organizational performance, data security, and operational workflows.',
    headerImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
    sections: [
      {
        templateKey: 'Body_FeatureGrid3',
        title: 'Core Practice Areas',
        miniTitle: 'SOLUTIONS CATALOG',
        description: 'Explore the full spectrum of our advisory, technical, and governance offerings.',
        pageSectionLists: [
          { title: 'Strategic Advisory & Governance', description: 'Board-level counsel on organizational structuring, executive leadership, and compliance frameworks.', iconText: 'fa-solid fa-scale-balanced', sortOrder: 1 },
          { title: 'Enterprise Digital Systems', description: 'Modernization of legacy workflows into modular, high-throughput cloud platforms.', iconText: 'fa-solid fa-laptop-code', sortOrder: 2 },
          { title: 'Cloud Infrastructure & Security', description: 'Hardened cloud foundations, disaster recovery architectures, and continuous compliance monitoring.', iconText: 'fa-solid fa-shield-halved', sortOrder: 3 }
        ]
      },
      {
        templateKey: 'Body_ProcessSteps',
        title: 'Client Engagement Lifecycle',
        miniTitle: 'HOW WE PARTNER',
        description: 'From initial diagnostic review to scaled enterprise implementation.',
        pageSectionLists: [
          { title: 'Needs Diagnostic', miniTitle: 'Phase 1', description: 'Comprehensive review of your current systems and operational gaps.', sortOrder: 1 },
          { title: 'Tailored Proposal', miniTitle: 'Phase 2', description: 'Detailed project blueprint with deliverables, timeline, and pricing.', sortOrder: 2 },
          { title: 'Agile Deployment', miniTitle: 'Phase 3', description: 'Seamless rollout with training and dedicated project management.', sortOrder: 3 },
          { title: 'Ongoing Stewardship', miniTitle: 'Phase 4', description: 'Post-launch optimization and continuous advisory support.', sortOrder: 4 }
        ]
      },
      {
        templateKey: 'Body_CtaSplit',
        title: 'Need a Custom Solution for Your Team?',
        miniTitle: 'TAILORED INTAKE',
        description: 'Our consultants will work with your executive committee to architect a tailored delivery plan.',
        buttonText: 'Submit Service Intake',
        buttonLink: '/request-service',
        secondButtonText: 'Contact Office',
        secondButtonLink: '/contact'
      }
    ]
  },

  'request-service': {
    title: 'Request a Service Consultation',
    miniTitle: 'PROJECT INTAKE',
    description: 'Please submit your project specifications below. Our specialists will review and contact you within one business day.',
    headerImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    sections: [
      {
        templateKey: 'Body_RequestService',
        title: 'Project Intake & Requirements Form',
        miniTitle: 'CONSULTATION REQUEST',
        description: 'Fill in your organizational specifications to receive a formal advisory briefing.'
      }
    ]
  },

  contact: {
    title: 'Contact Us',
    miniTitle: 'GET IN TOUCH',
    description: 'Connect with our advisory counsel, operational support, and headquarters.',
    headerImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
    sections: [
      {
        templateKey: 'Contact_SplitDetails',
        title: 'Connect with Our Team',
        miniTitle: 'OFFICE TOUCHPOINTS',
        description: 'Send us a direct inquiry or reach out through one of our official contact channels.'
      }
    ]
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    miniTitle: 'LEGAL & COMPLIANCE',
    description: 'Our commitments to data protection, member privacy, and security safeguards.',
    headerImageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1600&q=80',
    fullDescription: `
      <h2>1. Information We Collect</h2>
      <p>We collect personal information that you voluntarily provide to us when you register on our website, express interest in obtaining information about our products and services, or contact us directly.</p>
      <h2>2. How We Use Your Information</h2>
      <p>We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with our legal obligations, and your consent.</p>
      <h2>3. Information Protection & Sovereignty</h2>
      <p>All stored data is protected using AES-256 encryption at rest and TLS 1.3 protocol during transit. We never sell your personal information to third parties.</p>
      <h2>4. Contact Us</h2>
      <p>If you have any questions about this privacy statement, please contact our compliance officer at privacy@organization.com.</p>
    `
  },

  'terms-and-conditions': {
    title: 'Terms of Service',
    miniTitle: 'LEGAL & COMPLIANCE',
    description: 'Terms of service, authorized use guidelines, and platform covenants.',
    headerImageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1600&q=80',
    fullDescription: `
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using our website, you agree to be bound by these terms of service and all applicable laws and regulations.</p>
      <h2>2. User Covenants & Conduct</h2>
      <p>Users must not engage in any activity that interferes with or disrupts the services, servers, or networks connected to the platform.</p>
      <h2>3. Intellectual Property Rights</h2>
      <p>All proprietary trademarks, content, and code remain the exclusive property of the organization and its licensors.</p>
      <h2>4. Limitation of Liability</h2>
      <p>In no event shall the organization be liable for any indirect, incidental, or consequential damages arising from the use of the platform.</p>
    `
  }
};

export const DEFAULT_SAMPLE_BLOGS = [
  {
    id: 'b1',
    title: 'Architecting Resilient Multi-Tenant Cloud Ecosystems',
    description: 'Explore proven patterns for high-throughput tenant isolation, schema partitioning, and real-time synchronization across distributed services.',
    categoryName: 'Engineering & Architecture',
    date: '2026-09-12T10:00:00Z',
    author: 'Alex Rivera',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    fullDescription: `
      <p class="lead">Building a scalable multi-tenant architecture demands strict balance between isolation guarantees, compute efficiency, and operational agility.</p>
      <p>When organizations transition to sovereign multi-tenant databases, schema partitioning prevents accidental data leakage while ensuring that compliance standards (SOC2, HIPAA, GDPR) can be maintained on a per-organization basis.</p>
      <h3>Core Architectural Pillars</h3>
      <p>Our engineering framework relies on three proven architectural patterns: database-per-tenant physical isolation, real-time telemetry tracing, and automated zero-downtime schema migrations.</p>
    `
  },
  {
    id: 'b2',
    title: 'The Shift to Zero-Downtime Migration Pipelines',
    description: 'How modern engineering teams execute database cutovers without dropping a single active customer transaction.',
    categoryName: 'DevOps & Reliability',
    date: '2026-09-08T14:30:00Z',
    author: 'Sarah Chen',
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
    fullDescription: `
      <p class="lead">Downtime during schema cutovers is no longer acceptable in high-availability enterprise environments.</p>
      <p>By employing expanding-and-contracting schema changes, teams can decouple software deployments from database updates. New columns and structures are added in forward-compatible increments before legacy fields are deprecated.</p>
    `
  },
  {
    id: 'b3',
    title: 'Next-Gen Identity Governance & Granular RBAC',
    description: 'Integrating decentralized identity tokens with high-compliance role matrices across sovereign micro-services.',
    categoryName: 'Cybersecurity',
    date: '2026-08-29T09:15:00Z',
    author: 'Marcus Vance',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
    fullDescription: `
      <p class="lead">Fine-grained access control is the bedrock of enterprise governance in distributed ecosystems.</p>
      <p>Through role-based access control coupled with attribute evaluation, organizations achieve granular policy enforcement without sacrificing runtime performance.</p>
    `
  }
];
