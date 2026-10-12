import { SectionPreset } from '../../visual-editor/visual-editor.component';

/**
 * 11 Production-Ready Section Archetypes & Blueprints for Body Category.
 * Each preset provides:
 * 1. Semantic HTML Template with canonical Handlebars tokens.
 * 2. Self-contained, scoped modern CSS with rich aesthetics, bright accents, hover animations & mobile breakpoints.
 * 3. Realistic preview sample data with high-res Unsplash graphics and repeater arrays.
 */
export const BODY_PRESETS: SectionPreset[] = [
  // 1. Feature Cards Grid (3 Columns)
  {
    name: '3-Col Feature Grid',
    icon: 'grid_view',
    badge: 'Features',
    description: 'Elevated 3-column cards with vibrant icon badges, soft drop shadows, and hover elevation.',
    html: `<section class="oz-feature-grid-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-section-header">
      {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-title">{{ Title }}</h2>
      <p class="oz-subtitle">{{ Description }}</p>
    </div>
    <div class="oz-feature-grid">
      {{#each PageSectionLists}}
      <div class="oz-feature-card">
        <div class="oz-icon-badge">
          <span class="material-symbols-outlined">{{ Icon }}</span>
        </div>
        <h3 class="oz-card-title">{{ Title }}</h3>
        <p class="oz-card-desc">{{ Description }}</p>
        {{#if ButtonText}}
        <a href="{{ ButtonLink }}" class="oz-card-link">{{ ButtonText }} <span class="arrow">&rarr;</span></a>
        {{/if}}
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-feature-grid-section {
  padding: 88px 24px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container {
  max-width: 1200px;
  margin: 0 auto;
}
.oz-section-header {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 56px auto;
}
.oz-badge {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11.5px;
  font-weight: 800;
  padding: 5px 14px;
  border-radius: 999px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 14px;
  border: 1px solid #dbeafe;
}
.oz-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  letter-spacing: -0.025em;
  line-height: 1.25;
}
.oz-subtitle {
  font-size: 15.5px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.oz-feature-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 34px 26px;
  transition: all 0.22s ease-in-out;
  display: flex;
  flex-direction: column;
}
.oz-feature-card:hover {
  transform: translateY(-4px);
  border-color: #2563eb;
  box-shadow: 0 16px 32px rgba(37, 99, 235, 0.08);
}
.oz-icon-badge {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}
.oz-icon-badge .material-symbols-outlined { font-size: 26px; }
.oz-card-title {
  font-size: 19px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px 0;
}
.oz-card-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 20px 0;
  flex: 1;
}
.oz-card-link {
  font-size: 13.5px;
  font-weight: 700;
  color: #2563eb;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: gap 0.2s ease;
}
.oz-card-link:hover { text-decoration: underline; gap: 8px; }
@media (max-width: 900px) {
  .oz-feature-grid { grid-template-columns: 1fr; gap: 18px; }
  .oz-title { font-size: 28px; }
  .oz-feature-grid-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Engineered For Enterprise Scale And Sub-Millisecond Speed',
      miniTitle: 'CORE CAPABILITIES',
      description: 'Unified cloud infrastructure designed to eliminate latency, automate compliance, and safeguard mission-critical data.',
      pageSectionLists: [
        { title: 'Edge Cloud Replication', description: 'Continuous multi-region synchronization keeps endpoints resilient against unexpected node outages.', icon: 'hub', buttonText: 'Learn More', buttonLink: '#edge' },
        { title: 'Zero-Trust Encryption', description: 'Granular policy enforcement, automatic device trust tokens, and cryptographic verification on every microservice call.', icon: 'verified_user', buttonText: 'Explore Security', buttonLink: '#security' },
        { title: 'Automated CI/CD Pipelines', description: 'Push code to git and deploy production containers in seconds with built-in canary deployments and health probes.', icon: 'rocket_launch', buttonText: 'View Deployments', buttonLink: '#pipelines' }
      ]
    }
  },

  // 2. Split Showcase: Left Image + Right Narrative
  {
    name: 'Split: Left Image + Content',
    icon: 'view_column',
    badge: 'Split',
    description: 'Heroic split showcase with featured high-res graphic on the left and narrative checklist on the right.',
    html: `<section class="oz-split-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-split-row">
      <div class="oz-split-media">
        <div class="oz-media-card">
          {{#if ImageUrl}}
          <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-featured-photo" />
          {{/if}}
          <div class="oz-floating-badge">
            <span class="material-symbols-outlined badge-icon">speed</span>
            <div>
              <strong class="badge-metric">99.99%</strong>
              <span class="badge-text">Uptime Performance</span>
            </div>
          </div>
        </div>
      </div>
      <div class="oz-split-content">
        {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
        <h2 class="oz-split-title">{{ Title }}</h2>
        <p class="oz-split-desc">{{ Description }}</p>
        <div class="oz-checklist">
          {{#each PageSectionLists}}
          <div class="oz-check-item">
            <div class="oz-check-icon-wrap">
              <span class="material-symbols-outlined oz-check-icon">check_circle</span>
            </div>
            <div>
              <h4 class="oz-check-heading">{{ Title }}</h4>
              <p class="oz-check-text">{{ Description }}</p>
            </div>
          </div>
          {{/each}}
        </div>
        {{#if ButtonText}}
        <div class="oz-btn-cluster">
          <a href="{{ ButtonLink }}" class="oz-primary-btn">{{ ButtonText }}</a>
          {{#if SecondButtonText}}
          <a href="{{ SecondButtonLink }}" class="oz-secondary-btn">{{ SecondButtonText }}</a>
          {{/if}}
        </div>
        {{/if}}
      </div>
    </div>
  </div>
</section>`,
    css: `.oz-split-section {
  padding: 92px 24px;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-split-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: center;
}
.oz-media-card {
  position: relative;
  border-radius: 20px;
  overflow: visible;
}
.oz-featured-photo {
  width: 100%;
  height: 480px;
  object-fit: cover;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
  display: block;
}
.oz-floating-badge {
  position: absolute;
  bottom: 24px;
  right: 24px;
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
}
.oz-floating-badge .badge-icon { font-size: 28px; color: #10b981; }
.oz-floating-badge .badge-metric { display: block; font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1; }
.oz-floating-badge .badge-text { font-size: 11.5px; color: #64748b; }
.oz-badge {
  display: inline-block;
  background: #f0fdf4;
  color: #15803d;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border: 1px solid #bbf7d0;
}
.oz-split-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  line-height: 1.25;
}
.oz-split-desc {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 28px 0;
}
.oz-checklist {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}
.oz-check-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.oz-check-icon-wrap {
  color: #10b981;
  margin-top: 2px;
}
.oz-check-icon-wrap .material-symbols-outlined { font-size: 22px; }
.oz-check-heading {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 3px 0;
}
.oz-check-text {
  font-size: 13.5px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}
.oz-btn-cluster { display: flex; gap: 14px; }
.oz-primary-btn {
  background: #0f172a;
  color: #ffffff;
  padding: 12px 26px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
}
.oz-primary-btn:hover { background: #2563eb; }
.oz-secondary-btn {
  background: transparent;
  color: #0f172a;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
  border: 1.5px solid #cbd5e1;
  transition: all 0.2s ease;
}
.oz-secondary-btn:hover { border-color: #0f172a; }
@media (max-width: 900px) {
  .oz-split-row { grid-template-columns: 1fr; gap: 36px; }
  .oz-featured-photo { height: 320px; }
  .oz-split-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Automate Operational Resilience Across Distributed Stacks',
      miniTitle: 'PROVEN INFRASTRUCTURE',
      description: 'Eliminate human error and orchestrate multi-zone failovers in milliseconds with automated policy enforcement.',
      imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&auto=format&fit=crop&q=80',
      buttonText: 'Start 14-Day Free Trial',
      buttonLink: '#trial',
      secondButtonText: 'Schedule Technical Demo',
      secondButtonLink: '#demo',
      pageSectionLists: [
        { title: 'Instant Health Monitoring', description: 'Real-time telemetry continuously evaluates endpoint responsiveness and latency jitter.' },
        { title: 'Zero Configuration Deployments', description: 'Declarative manifests automatically synchronize state across staging and production.' },
        { title: 'Audited Compliance Vault', description: 'Tamper-evident cryptographic logs satisfy SOC2, HIPAA, and ISO 27001 requirements.' }
      ]
    }
  },

  // 3. Split Showcase: Left Content + Right Image
  {
    name: 'Split: Content + Right Image',
    icon: 'side_navigation',
    badge: 'Split',
    description: 'Compelling story on the left with dual call-to-actions and high-impact visual graphic on the right.',
    html: `<section class="oz-split-right-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-split-grid">
      <div class="oz-story-col">
        {{#if MiniTitle}}<span class="oz-pill">{{ MiniTitle }}</span>{{/if}}
        <h2 class="oz-hero-heading">{{ Title }}</h2>
        <p class="oz-body-lead">{{ Description }}</p>
        <div class="oz-feature-highlights">
          {{#each PageSectionLists}}
          <div class="oz-highlight-card">
            <span class="material-symbols-outlined oz-highlight-icon">{{ Icon }}</span>
            <div>
              <h4 class="oz-highlight-title">{{ Title }}</h4>
              <p class="oz-highlight-desc">{{ Description }}</p>
            </div>
          </div>
          {{/each}}
        </div>
        {{#if ButtonText}}
        <div class="oz-cta-row">
          <a href="{{ ButtonLink }}" class="oz-btn-main">{{ ButtonText }}</a>
          {{#if SecondButtonText}}
          <a href="{{ SecondButtonLink }}" class="oz-btn-alt">{{ SecondButtonText }}</a>
          {{/if}}
        </div>
        {{/if}}
      </div>
      <div class="oz-graphic-col">
        <div class="oz-graphic-frame">
          {{#if ImageUrl}}
          <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-graphic-photo" />
          {{/if}}
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `.oz-split-right-section {
  padding: 90px 24px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-split-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 56px;
  align-items: center;
}
.oz-pill {
  display: inline-block;
  background: #fdf2f8;
  color: #db2777;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 14px;
  border: 1px solid #fbcfe8;
}
.oz-hero-heading {
  font-size: 35px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  line-height: 1.25;
}
.oz-body-lead {
  font-size: 15.5px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 28px 0;
}
.oz-feature-highlights {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 36px;
}
.oz-highlight-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  gap: 12px;
}
.oz-highlight-icon { color: #db2777; font-size: 24px; }
.oz-highlight-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
.oz-highlight-desc { font-size: 12.5px; color: #64748b; margin: 0; line-height: 1.45; }
.oz-cta-row { display: flex; gap: 14px; }
.oz-btn-main {
  background: #db2777;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
}
.oz-btn-main:hover { background: #be185d; }
.oz-btn-alt {
  background: #f1f5f9;
  color: #334155;
  padding: 12px 22px;
  border-radius: 8px;
  font-weight: 700;
  text-decoration: none;
  font-size: 14px;
}
.oz-graphic-photo {
  width: 100%;
  height: 460px;
  object-fit: cover;
  border-radius: 18px;
  box-shadow: 0 20px 45px rgba(219, 39, 119, 0.12);
  display: block;
}
@media (max-width: 900px) {
  .oz-split-grid { grid-template-columns: 1fr; gap: 36px; }
  .oz-feature-highlights { grid-template-columns: 1fr; }
  .oz-graphic-photo { height: 320px; }
  .oz-split-right-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Accelerate Collaboration Across Every Cross-Functional Team',
      miniTitle: 'PRODUCTIVITY SUITE',
      description: 'Consolidate chats, ticket queues, code reviews, and project timelines into one cohesive workspace designed for focused velocity.',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
      buttonText: 'Get Started Today',
      buttonLink: '#get-started',
      secondButtonText: 'Watch Product Tour',
      secondButtonLink: '#tour',
      pageSectionLists: [
        { title: 'Live Canvas Sync', description: 'Co-author specifications and diagram architectures simultaneously.', icon: 'draw' },
        { title: 'Smart Search', description: 'Locate conversations, files, and pull requests in sub-milliseconds.', icon: 'search_check' }
      ]
    }
  },

  // 4. Numbered Process Workflow Steps (1-2-3-4)
  {
    name: 'Numbered Process Steps (1-4)',
    icon: 'linear_scale',
    badge: 'Process',
    description: 'Horizontal step-by-step onboarding roadmap with numbered circular pills and connected sequence line.',
    html: `<section class="oz-process-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-section-header">
      {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-title">{{ Title }}</h2>
      <p class="oz-subtitle">{{ Description }}</p>
    </div>
    <div class="oz-process-steps-grid">
      {{#each PageSectionLists}}
      <div class="oz-step-item">
        <div class="oz-step-number-pill">{{ SortOrder }}</div>
        <h3 class="oz-step-title">{{ Title }}</h3>
        <p class="oz-step-desc">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-process-section {
  padding: 88px 24px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-section-header {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 56px auto;
}
.oz-badge {
  display: inline-block;
  background: #f5f3ff;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border: 1px solid #ddd6fe;
}
.oz-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  line-height: 1.25;
}
.oz-subtitle {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-process-steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  position: relative;
}
.oz-step-item {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px 22px;
  position: relative;
  transition: all 0.2s ease;
}
.oz-step-item:hover {
  border-color: #7c3aed;
  transform: translateY(-4px);
  box-shadow: 0 14px 28px rgba(124, 58, 237, 0.08);
}
.oz-step-number-pill {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #7c3aed;
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3);
}
.oz-step-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px 0;
}
.oz-step-desc {
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.55;
  margin: 0;
}
@media (max-width: 900px) {
  .oz-process-steps-grid { grid-template-columns: 1fr; gap: 16px; }
  .oz-process-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Simple Four-Step Journey to Production Deployment',
      miniTitle: 'HOW IT WORKS',
      description: 'Follow our frictionless onboarding roadmap to integrate your team and automate workflows in under 10 minutes.',
      pageSectionLists: [
        { sortOrder: 1, title: 'Connect Your Repository', description: 'Authorize GitHub, GitLab, or Bitbucket with one click using OAuth2 tokens.' },
        { sortOrder: 2, title: 'Define Infrastructure Rules', description: 'Select deployment regions, database flavors, and automated scaling bounds.' },
        { sortOrder: 3, title: 'Run Health Probes', description: 'Automated test suites verify environment security and zero-trust tokens.' },
        { sortOrder: 4, title: 'Deploy Globally', description: 'Traffic routes through 200+ edge POPs with instant automated failover.' }
      ]
    }
  },

  // 5. 3-Tier Pricing Matrix
  {
    name: '3-Tier Pricing Matrix',
    icon: 'payments',
    badge: 'Pricing',
    description: 'Clean comparison pricing tiers with highlighted popular card, recurring price tags, and plan CTA buttons.',
    html: `<section class="oz-pricing-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-section-header">
      {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-title">{{ Title }}</h2>
      <p class="oz-subtitle">{{ Description }}</p>
    </div>
    <div class="oz-pricing-grid">
      {{#each PageSectionLists}}
      <div class="oz-pricing-card {{ CustomClass }}">
        <div class="oz-plan-header">
          <h3 class="oz-plan-name">{{ Title }}</h3>
          <div class="oz-plan-price-wrap">
            <span class="oz-plan-price">{{ MiniTitle }}</span>
          </div>
          <p class="oz-plan-desc">{{ Description }}</p>
        </div>
        <div class="oz-plan-features">
          {{#if MoreDescription}}
          <div class="oz-plan-perks">{{{ MoreDescription }}}</div>
          {{/if}}
        </div>
        {{#if ButtonText}}
        <a href="{{ ButtonLink }}" class="oz-plan-btn">{{ ButtonText }}</a>
        {{/if}}
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-pricing-section {
  padding: 88px 24px;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-section-header {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 56px auto;
}
.oz-badge {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border: 1px solid #dbeafe;
}
.oz-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  line-height: 1.25;
}
.oz-subtitle {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  align-items: stretch;
}
.oz-pricing-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
  transition: all 0.22s ease;
}
.oz-pricing-card.featured {
  border-color: #2563eb;
  box-shadow: 0 20px 40px rgba(37, 99, 235, 0.12);
  transform: scale(1.03);
}
.oz-plan-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; }
.oz-plan-price { font-size: 38px; font-weight: 900; color: #0f172a; line-height: 1; }
.oz-plan-desc { font-size: 13.5px; color: #64748b; margin: 12px 0 24px 0; line-height: 1.5; }
.oz-plan-features { flex: 1; margin-bottom: 28px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
.oz-plan-perks ul { list-style: none; padding: 0; margin: 0; }
.oz-plan-perks li {
  padding: 8px 0;
  font-size: 13.5px;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}
.oz-plan-btn {
  display: block;
  text-align: center;
  background: #0f172a;
  color: #ffffff;
  padding: 13px 20px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s ease;
}
.oz-pricing-card.featured .oz-plan-btn { background: #2563eb; }
.oz-plan-btn:hover { opacity: 0.9; }
@media (max-width: 900px) {
  .oz-pricing-grid { grid-template-columns: 1fr; gap: 20px; }
  .oz-pricing-card.featured { transform: none; }
  .oz-pricing-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Predictable Pricing That Scales With Your Business',
      miniTitle: 'PLANS & TIERS',
      description: 'Choose the ideal tier for your workload. Transparent billing with zero hidden seat fees or upgrade penalties.',
      pageSectionLists: [
        { title: 'Starter Tier', miniTitle: '$29 / mo', description: 'Best for solo founders and pre-seed ventures launching MVPs.', moreDescription: '<ul><li>✓ 5 Active Projects</li><li>✓ 50 GB Cloud Storage</li><li>✓ Community Forum Support</li></ul>', buttonText: 'Choose Starter', buttonLink: '#starter' },
        { title: 'Pro Growth', miniTitle: '$79 / mo', description: 'Engineered for scaling startups requiring multi-region failover.', moreDescription: '<ul><li>✓ Unlimited Projects</li><li>✓ 500 GB High-Speed NVMe</li><li>✓ 24/7 Priority SLA Chat</li><li>✓ Custom Domain CNAMEs</li></ul>', buttonText: 'Start Pro Trial', buttonLink: '#pro', customClass: 'featured' },
        { title: 'Enterprise Dedicated', miniTitle: '$249 / mo', description: 'Tailored for regulated compliance and dedicated VPC pipelines.', moreDescription: '<ul><li>✓ Dedicated Cluster Instances</li><li>✓ Unlimited Multi-Cloud Sync</li><li>✓ Dedicated Success Engineer</li><li>✓ SOC2 & HIPAA Verification</li></ul>', buttonText: 'Contact Sales', buttonLink: '#enterprise' }
      ]
    }
  },

  // 6. Services Showcase Grid (6 Cards)
  {
    name: 'Services Showcase Grid (6 Cards)',
    icon: 'design_services',
    badge: 'Services',
    description: 'Multi-card responsive service portfolio with colorful icon boxes and action links.',
    html: `<section class="oz-services-grid-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-section-header">
      {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-title">{{ Title }}</h2>
      <p class="oz-subtitle">{{ Description }}</p>
    </div>
    <div class="oz-services-grid">
      {{#each PageSectionLists}}
      <div class="oz-service-item">
        <div class="oz-service-icon-wrap">
          <span class="material-symbols-outlined">{{ Icon }}</span>
        </div>
        <h3 class="oz-service-title">{{ Title }}</h3>
        <p class="oz-service-desc">{{ Description }}</p>
        {{#if ButtonText}}
        <a href="{{ ButtonLink }}" class="oz-service-link">{{ ButtonText }} →</a>
        {{/if}}
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-services-grid-section {
  padding: 88px 24px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-section-header {
  text-align: center;
  max-width: 720px;
  margin: 0 auto 56px auto;
}
.oz-badge {
  display: inline-block;
  background: #fef3c7;
  color: #b45309;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border: 1px solid #fde68a;
}
.oz-title {
  font-size: 34px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
  line-height: 1.25;
}
.oz-subtitle {
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}
.oz-services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}
.oz-service-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px 24px;
  transition: all 0.2s ease;
}
.oz-service-item:hover {
  border-color: #b45309;
  transform: translateY(-3px);
  box-shadow: 0 12px 24px rgba(180, 83, 9, 0.08);
}
.oz-service-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #fef3c7;
  color: #b45309;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.oz-service-icon-wrap .material-symbols-outlined { font-size: 24px; }
.oz-service-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
.oz-service-desc { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0 0 16px 0; }
.oz-service-link { font-size: 13px; font-weight: 700; color: #b45309; text-decoration: none; }
@media (max-width: 900px) {
  .oz-services-grid { grid-template-columns: 1fr; gap: 16px; }
  .oz-services-grid-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Comprehensive Managed Services for Modern Cloud Operations',
      miniTitle: 'OUR SERVICES',
      description: 'End-to-end consulting, continuous optimization, and round-the-clock infrastructure governance.',
      pageSectionLists: [
        { title: 'Cloud Architecture Design', description: 'Blueprints tailored to high-availability multi-region setups.', icon: 'cloud_sync', buttonText: 'Explore Service', buttonLink: '#cloud' },
        { title: 'Database Optimization', description: 'Query caching, partitioning, and automated read-replica routing.', icon: 'database', buttonText: 'Explore Service', buttonLink: '#db' },
        { title: 'Security & Penetration Audit', description: 'Vulnerability scanners, secret leak monitoring, and zero-trust policies.', icon: 'security', buttonText: 'Explore Service', buttonLink: '#sec' },
        { title: 'Kubernetes Orchestration', description: 'Production-ready container pods, ingress controllers, and auto-scalers.', icon: 'deployed_code', buttonText: 'Explore Service', buttonLink: '#k8s' },
        { title: 'Disaster Recovery Warm-Standby', description: 'Instant replication and continuous point-in-time snapshot recovery.', icon: 'restore', buttonText: 'Explore Service', buttonLink: '#dr' },
        { title: 'Cost Allocation Governance', description: 'Identify orphaned cloud resources and slash unnecessary cloud spend.', icon: 'savings', buttonText: 'Explore Service', buttonLink: '#cost' }
      ]
    }
  },

  // 7. Customer Testimonials Cards
  {
    name: 'Customer Testimonials Cards',
    icon: 'reviews',
    badge: 'Social Proof',
    description: 'Trust-building feedback cards featuring 5-star ratings, quotes, client avatars, and company roles.',
    html: `<section class="oz-testimonials-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-section-header">
      {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-title">{{ Title }}</h2>
      <p class="oz-subtitle">{{ Description }}</p>
    </div>
    <div class="oz-testimonials-grid">
      {{#each PageSectionLists}}
      <div class="oz-testimonial-card">
        <div class="oz-stars-row">
          ★★★★★
        </div>
        <p class="oz-quote-text">"{{ Description }}"</p>
        <div class="oz-author-row">
          {{#if ImageUrl}}
          <img src="{{ ImageUrl }}" alt="{{ Title }}" class="oz-avatar" />
          {{/if}}
          <div>
            <h4 class="oz-author-name">{{ Title }}</h4>
            <span class="oz-author-role">{{ MiniTitle }}</span>
          </div>
        </div>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-testimonials-section {
  padding: 88px 24px;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-section-header { text-align: center; max-width: 680px; margin: 0 auto 56px auto; }
.oz-badge {
  display: inline-block;
  background: #fdf2f8;
  color: #db2777;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border: 1px solid #fbcfe8;
}
.oz-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
.oz-subtitle { font-size: 15px; color: #64748b; line-height: 1.6; margin: 0; }
.oz-testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}
.oz-testimonial-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 32px 26px;
  display: flex;
  flex-direction: column;
}
.oz-stars-row { color: #f59e0b; font-size: 16px; margin-bottom: 14px; letter-spacing: 2px; }
.oz-quote-text {
  font-size: 14.5px;
  color: #334155;
  line-height: 1.65;
  font-style: italic;
  margin: 0 0 24px 0;
  flex: 1;
}
.oz-author-row { display: flex; align-items: center; gap: 14px; }
.oz-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
}
.oz-author-name { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
.oz-author-role { font-size: 12.5px; color: #64748b; }
@media (max-width: 900px) {
  .oz-testimonials-grid { grid-template-columns: 1fr; gap: 18px; }
  .oz-testimonials-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Trusted by Over 10,000 Engineering Leaders Globally',
      miniTitle: 'TESTIMONIALS',
      description: 'See how fast-moving development teams use Ozikol to compress deployment cycles from weeks to minutes.',
      pageSectionLists: [
        { title: 'Sarah Jenkins', miniTitle: 'CTO at NexaCloud', description: 'Migrating our core pipeline cut our monthly AWS expenditure by 42% while improving our p99 response latency across all continents.', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
        { title: 'David Chen', miniTitle: 'VP of Platform at VeloScale', description: 'The zero-trust automated compliance logs saved us hundreds of audit hours during our SOC2 Type II certification.', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
        { title: 'Elena Rostova', miniTitle: 'Head of Engineering at AlphaPay', description: 'Out-of-the-box canary deployments gave our product teams the confidence to ship multiple times a day without fear of regressions.', imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' }
      ]
    }
  },

  // 8. Stats & Performance Metrics Counters Bar
  {
    name: 'Stats & Metrics Counters Bar',
    icon: 'query_stats',
    badge: 'Metrics',
    description: 'High-impact stat counter boxes highlighting key operational metrics, customer volume, and speed benchmarks.',
    html: `<section class="oz-stats-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-stats-grid">
      {{#each PageSectionLists}}
      <div class="oz-stat-card">
        <span class="material-symbols-outlined oz-stat-icon">{{ Icon }}</span>
        <h3 class="oz-stat-number">{{ Title }}</h3>
        <p class="oz-stat-label">{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-stats-section {
  padding: 64px 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #ffffff;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.oz-stat-card {
  text-align: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
.oz-stat-icon { font-size: 32px; color: #38bdf8; margin-bottom: 12px; }
.oz-stat-number { font-size: 40px; font-weight: 900; margin: 0 0 6px 0; color: #ffffff; letter-spacing: -0.02em; }
.oz-stat-label { font-size: 13.5px; color: #94a3b8; margin: 0; font-weight: 500; }
@media (max-width: 900px) {
  .oz-stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .oz-stats-grid { grid-template-columns: 1fr; }
}`,
    sampleContent: {
      pageSectionLists: [
        { title: '99.99%', description: 'Historical Core Uptime SLA', icon: 'verified' },
        { title: '< 2.4 ms', description: 'Average Global Edge Latency', icon: 'bolt' },
        { title: '400M+', description: 'Daily API Invocations Handled', icon: 'speed' },
        { title: '24 / 7', description: 'Dedicated Global SRE Coverage', icon: 'support_agent' }
      ]
    }
  },

  // 9. Interactive FAQ Accordion
  {
    name: 'FAQ Knowledge Accordion',
    icon: 'quiz',
    badge: 'FAQ',
    description: 'Collapsible accordion questions and answers for knowledge bases, onboarding FAQs, and pricing queries.',
    html: `<section class="oz-faq-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-section-header">
      {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-title">{{ Title }}</h2>
      <p class="oz-subtitle">{{ Description }}</p>
    </div>
    <div class="oz-faq-list">
      {{#each PageSectionLists}}
      <details class="oz-faq-item">
        <summary class="oz-faq-question">
          <span>{{ Title }}</span>
          <span class="material-symbols-outlined oz-faq-toggle">expand_more</span>
        </summary>
        <div class="oz-faq-answer">
          <p>{{ Description }}</p>
        </div>
      </details>
      {{/each}}
    </div>
  </div>
</section>`,
    css: `.oz-faq-section {
  padding: 88px 24px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 860px; margin: 0 auto; }
.oz-section-header { text-align: center; margin-bottom: 48px; }
.oz-badge {
  display: inline-block;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.oz-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; }
.oz-subtitle { font-size: 15px; color: #64748b; margin: 0; line-height: 1.6; }
.oz-faq-list { display: flex; flex-direction: column; gap: 14px; }
.oz-faq-item {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}
.oz-faq-item[open] { border-color: #2563eb; }
.oz-faq-question {
  padding: 20px 24px;
  font-size: 16.5px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  list-style: none;
}
.oz-faq-question::-webkit-details-marker { display: none; }
.oz-faq-toggle { transition: transform 0.2s ease; color: #64748b; }
.oz-faq-item[open] .oz-faq-toggle { transform: rotate(180deg); color: #2563eb; }
.oz-faq-answer {
  padding: 0 24px 20px 24px;
  font-size: 14.5px;
  color: #64748b;
  line-height: 1.6;
}
.oz-faq-answer p { margin: 0; }
@media (max-width: 768px) {
  .oz-faq-section { padding: 56px 16px; }
  .oz-title { font-size: 28px; }
}`,
    sampleContent: {
      title: 'Frequently Asked Questions',
      miniTitle: 'SUPPORT & CLARIFICATIONS',
      description: 'Everything you need to know about setting up your organization, billing cycles, and enterprise migration.',
      pageSectionLists: [
        { title: 'How does Ozikol handle multi-region tenant isolation?', description: 'Every tenant organization operates within its isolated logical boundary with dedicated schema isolation and encrypted connection keys.' },
        { title: 'Can we self-host custom templates on our own domain?', description: 'Yes! Custom CNAME routing allows you to point any domain with automatic Let’s Encrypt SSL certificate provisioning.' },
        { title: 'What happens if we surpass our monthly API bandwidth quota?', description: 'We never hard-throttle production traffic. We alert your administration team with real-time telemetry alerts before auto-scaling.' },
        { title: 'Is there a technical onboarding team available for migration?', description: 'All Pro Growth and Enterprise accounts include dedicated Slack and Microsoft Teams bridges with our SRE leads.' }
      ]
    }
  },

  // 10. High-Impact CTA Callout Banner
  {
    name: 'CTA Callout Banner',
    icon: 'campaign',
    badge: 'CTA',
    description: 'Vibrant full-width action banner with bold headline, urgency copy, and dual action buttons.',
    html: `<section class="oz-cta-banner-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-cta-banner-card">
      {{#if MiniTitle}}<span class="oz-cta-badge">{{ MiniTitle }}</span>{{/if}}
      <h2 class="oz-cta-title">{{ Title }}</h2>
      <p class="oz-cta-desc">{{ Description }}</p>
      {{#if ButtonText}}
      <div class="oz-cta-actions">
        <a href="{{ ButtonLink }}" class="oz-cta-btn-primary">{{ ButtonText }}</a>
        {{#if SecondButtonText}}
        <a href="{{ SecondButtonLink }}" class="oz-cta-btn-outline">{{ SecondButtonText }}</a>
        {{/if}}
      </div>
      {{/if}}
    </div>
  </div>
</section>`,
    css: `.oz-cta-banner-section {
  padding: 72px 24px;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1100px; margin: 0 auto; }
.oz-cta-banner-card {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
  border-radius: 24px;
  padding: 64px 40px;
  text-align: center;
  color: #ffffff;
  box-shadow: 0 24px 48px rgba(37, 99, 235, 0.25);
}
.oz-cta-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 5px 14px;
  border-radius: 999px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.oz-cta-title {
  font-size: 38px;
  font-weight: 900;
  margin: 0 0 16px 0;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
.oz-cta-desc {
  font-size: 16.5px;
  color: #dbeafe;
  max-width: 650px;
  margin: 0 auto 36px auto;
  line-height: 1.6;
}
.oz-cta-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}
.oz-cta-btn-primary {
  background: #ffffff;
  color: #1e40af;
  padding: 14px 32px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 15px;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}
.oz-cta-btn-primary:hover {
  background: #f8fafc;
  transform: translateY(-2px);
}
.oz-cta-btn-outline {
  background: transparent;
  color: #ffffff;
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  transition: all 0.2s ease;
}
.oz-cta-btn-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #ffffff;
}
@media (max-width: 768px) {
  .oz-cta-banner-card { padding: 44px 20px; border-radius: 16px; }
  .oz-cta-title { font-size: 28px; }
  .oz-cta-banner-section { padding: 48px 16px; }
}`,
    sampleContent: {
      title: 'Ready to Transform Your Cloud Deployment Velocity?',
      miniTitle: 'GET STARTED IN MINUTES',
      description: 'Join thousands of ambitious teams delivering resilient, production-ready software without infrastructure friction.',
      buttonText: 'Claim 14-Day Free Access',
      buttonLink: '#signup',
      secondButtonText: 'Talk to an Architect',
      secondButtonLink: '#contact'
    }
  },

  // 11. Split Showcase with Embedded Contact Form
  {
    name: 'Contact Form Split Showcase',
    icon: 'contact_mail',
    badge: 'Form',
    description: 'Split layout with corporate contact info on the left and dynamic {{ Form "Contact_Us" }} on the right.',
    html: `<section class="oz-contact-split-section {{ CustomClass }}">
  <div class="oz-container">
    <div class="oz-contact-grid">
      <div class="oz-contact-info-col">
        {{#if MiniTitle}}<span class="oz-badge">{{ MiniTitle }}</span>{{/if}}
        <h2 class="oz-contact-title">{{ Title }}</h2>
        <p class="oz-contact-desc">{{ Description }}</p>
        <div class="oz-info-cards-stack">
          <div class="oz-info-pill">
            <span class="material-symbols-outlined oz-pill-icon">mail</span>
            <div>
              <strong class="oz-pill-title">Direct Inquiries</strong>
              <span class="oz-pill-text">support@company.com</span>
            </div>
          </div>
          <div class="oz-info-pill">
            <span class="material-symbols-outlined oz-pill-icon">call</span>
            <div>
              <strong class="oz-pill-title">Headquarters Phone</strong>
              <span class="oz-pill-text">+1 (800) 555-0199</span>
            </div>
          </div>
          <div class="oz-info-pill">
            <span class="material-symbols-outlined oz-pill-icon">location_on</span>
            <div>
              <strong class="oz-pill-title">Global Office</strong>
              <span class="oz-pill-text">100 Enterprise Way, Suite 400, Tech City</span>
            </div>
          </div>
        </div>
      </div>
      <div class="oz-contact-form-col">
        <div class="oz-form-card">
          <h3 class="oz-form-heading">Send Us a Direct Message</h3>
          <p class="oz-form-sub">Our solution engineers reply in under 2 hours.</p>
          <div class="oz-form-embed-wrapper">
            {{ Form "Contact_Us" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
    css: `.oz-contact-split-section {
  padding: 88px 24px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.oz-container { max-width: 1200px; margin: 0 auto; }
.oz-contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: start;
}
.oz-badge {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
  border: 1px solid #dbeafe;
}
.oz-contact-title { font-size: 34px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
.oz-contact-desc { font-size: 15px; color: #64748b; line-height: 1.6; margin: 0 0 32px 0; }
.oz-info-cards-stack { display: flex; flex-direction: column; gap: 16px; }
.oz-info-pill {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.oz-pill-icon { font-size: 26px; color: #2563eb; }
.oz-pill-title { display: block; font-size: 14px; font-weight: 700; color: #0f172a; }
.oz-pill-text { font-size: 13px; color: #64748b; }
.oz-form-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 18px;
  padding: 36px 32px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
}
.oz-form-heading { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
.oz-form-sub { font-size: 13.5px; color: #64748b; margin: 0 0 24px 0; }
.oz-form-embed-wrapper input,
.oz-form-embed-wrapper textarea {
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}
.oz-form-embed-wrapper button {
  width: 100%;
  padding: 13px;
  background: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 14.5px;
  cursor: pointer;
}
@media (max-width: 900px) {
  .oz-contact-grid { grid-template-columns: 1fr; gap: 36px; }
  .oz-contact-split-section { padding: 56px 16px; }
}`,
    sampleContent: {
      title: 'Let’s Discuss How We Can Accelerate Your Next Initiative',
      miniTitle: 'REACH OUR TEAM',
      description: 'Whether you need custom architectural advisory, multi-region compliance consulting, or bespoke SLAs, our team is ready.'
    }
  }
];
