/**
 * Core utility functions and depth-aware token parser for category hydrators.
 * Ensures parent loops and conditionals match their exact corresponding closing tags.
 */

export interface HydrationContext {
  // Brand & Identity
  brandName?: string;
  brandLogo?: string;
  logoUrl?: string;
  copyright?: string;
  email?: string;
  phone?: string;
  address?: string;

  // Root Section Content
  title?: string;
  miniTitle?: string;
  subTitle?: string;
  description?: string;
  fullDescription?: string;
  qoute?: string;
  buttonText?: string;
  buttonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  directUrl?: string;
  imageUrl?: string;
  secondImageUrl?: string;
  videoUrl?: string;
  youtubeUrlLink?: string;
  customClass?: string;

  // Navigation Links & Dropdowns
  navigationMenu?: Array<{
    title: string;
    url?: string;
    zone?: 'first' | 'middle' | 'last';
    sortOrder?: number;
    isDropdown?: boolean;
    publish?: boolean;
    showInMainMenu?: boolean;
    customClass?: string;
    icon?: string;
    pages?: Array<{
      title: string;
      url: string;
      sortOrder?: number;
      publish?: boolean;
      showInMenuDropDown?: boolean;
      customClass?: string;
      icon?: string;
    }>;
  }>;

  // Header Call-to-Action Buttons
  menuCtaButtons?: Array<{
    title: string;
    url: string;
    buttonClass?: string;
    style?: string;
    customClass?: string;
  }>;

  // Top Utility Bar Links
  topBarPages?: Array<{
    title: string;
    url: string;
    icon?: string;
    customClass?: string;
  }>;

  // Navigation URLs & Flags
  homeUrl?: string;
  loginUrl?: string;
  loginText?: string;
  hasTopBar?: boolean;
  hasContactInfo?: boolean;
  activateLoginInMenu?: boolean;

  // Repeater Cards / Section Lists
  items?: Array<{
    title: string;
    miniTitle?: string;
    subTitle?: string;
    description?: string;
    moreDescription?: string;
    icon?: string;
    iconText?: string;
    buttonText?: string;
    buttonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    imageUrl?: string;
    videoUrl?: string;
    directUrl?: string;
    sortOrder?: number;
    publish?: boolean;
    customClass?: string;
  }>;

  // Blog Articles & Metadata
  articles?: Array<{
    title: string;
    summary?: string;
    category?: string;
    publishedDate?: string;
    authorName?: string;
    url?: string;
    coverImageUrl?: string;
    publish?: boolean;
    sortOrder?: number;
    customClass?: string;
  }>;
  blogCategories?: Array<{ name: string; count?: number; url?: string; customClass?: string }>;
  tags?: Array<{ name: string; url?: string; customClass?: string }>;
  recentArticles?: Array<{ title: string; url?: string; publishedDate?: string; coverImageUrl?: string; customClass?: string }>;

  // Blog Article Details Specifics
  authorName?: string;
  authorBio?: string;
  authorAvatarUrl?: string;
  authorAvatar?: string;
  authorRole?: string;
  authorTitle?: string;
  publishedDate?: string;
  publishDate?: string;
  readingTime?: string;
  readTime?: string;
  coverImageUrl?: string;
  category?: string;
  summary?: string;
  articleHeadline?: string;
  articleLead?: string;
  content?: string;
  body?: string;
  article?: any;
  [key: string]: any;

  // Category Pages & Tagged Pages
  categoryPages?: Record<string, Array<{ title: string; url: string; sortOrder?: number; publish?: boolean; customClass?: string }>>;
  taggedPages?: Record<string, Array<{ title: string; url: string; sortOrder?: number; publish?: boolean; customClass?: string }>>;

  // Footer Columns & Social Links
  footerCategories?: Array<{
    title: string;
    sortOrder?: number;
    pages?: Array<{ title: string; url: string; sortOrder?: number; publish?: boolean; customClass?: string }>;
  }>;
  hasSocialLinks?: boolean;
  socialLinks?: Array<{
    platform: string;
    title?: string;
    url: string;
    icon?: string;
    iconClass?: string;
    customClass?: string;
  }>;
  contactItems?: Array<{
    type?: string;
    channelType?: string;
    platform?: string;
    title?: string;
    description?: string;
    value?: string;
    content?: string;
    url?: string;
    icon?: string;
    iconClass?: string;
    isDefault?: boolean;
    customClass?: string;
  }>;
  workingHours?: string;

  // Legal Pages
  legalPages?: Array<{
    title: string;
    url: string;
    sortOrder?: number;
    publish?: boolean;
    customClass?: string;
  }>;

  // Dynamic Forms
  forms?: Record<string, string>;

  // Breadcrumbs & Page Banner
  pageTitle?: string;
  backgroundImageUrl?: string;
  breadcrumbs?: Array<{
    title: string;
    url?: string;
    isActive?: boolean;
    isLast?: boolean;
    customClass?: string;
  }>;
}

/**
 * Depth-aware parser for Handlebars {{#if Condition}}...{{else}}...{{/if}} blocks.
 */
export function resolveDepthAwareIf(template: string, conditionKey: string, isTrue: boolean): string {
  let result = '';
  let pos = 0;
  const targetTagPattern = new RegExp(`^\\{\\{#if\\s+${conditionKey}\\b[^}]*\\}\\}`, 'i');

  while (pos < template.length) {
    const openIdx = template.indexOf('{{#if', pos);
    if (openIdx === -1) {
      result += template.slice(pos);
      break;
    }

    result += template.slice(pos, openIdx);

    const tagEnd = template.indexOf('}}', openIdx);
    if (tagEnd === -1) {
      result += template.slice(openIdx);
      break;
    }

    const fullOpenTag = template.slice(openIdx, tagEnd + 2);
    if (!targetTagPattern.test(fullOpenTag)) {
      result += fullOpenTag;
      pos = tagEnd + 2;
      continue;
    }

    let depth = 1;
    let searchPos = tagEnd + 2;
    const contentStart = searchPos;
    let elseIdx = -1;
    let matchingCloseIdx = -1;

    while (searchPos < template.length && depth > 0) {
      const nextIf = template.indexOf('{{#if', searchPos);
      const nextElse = template.indexOf('{{else}}', searchPos);
      const nextClose = template.indexOf('{{/if}}', searchPos);

      if (nextClose === -1) break;

      let earliestToken = 'close';
      let earliestIdx = nextClose;

      if (nextIf !== -1 && nextIf < earliestIdx) {
        earliestToken = 'if';
        earliestIdx = nextIf;
      }
      if (nextElse !== -1 && nextElse < earliestIdx) {
        earliestToken = 'else';
        earliestIdx = nextElse;
      }

      if (earliestToken === 'if') {
        depth++;
        searchPos = earliestIdx + 5;
      } else if (earliestToken === 'else') {
        if (depth === 1 && elseIdx === -1) {
          elseIdx = earliestIdx;
        }
        searchPos = earliestIdx + 8;
      } else {
        depth--;
        if (depth === 0) {
          matchingCloseIdx = earliestIdx;
          break;
        }
        searchPos = earliestIdx + 7;
      }
    }

    if (matchingCloseIdx === -1) {
      result += fullOpenTag;
      pos = tagEnd + 2;
      continue;
    }

    let trueBranch = '';
    let falseBranch = '';

    if (elseIdx !== -1 && elseIdx < matchingCloseIdx) {
      trueBranch = template.slice(contentStart, elseIdx);
      falseBranch = template.slice(elseIdx + 8, matchingCloseIdx);
    } else {
      trueBranch = template.slice(contentStart, matchingCloseIdx);
    }

    result += isTrue ? trueBranch : falseBranch;
    pos = matchingCloseIdx + 7;
  }

  return result;
}

/**
 * Depth-aware block replacer for nested {{#each ...}} loops.
 */
export function replaceDepthAwareEach(
  template: string,
  tagMatcher: (openTag: string) => { matched: boolean; params?: any } | null,
  replacer: (innerContent: string, params?: any) => string
): string {
  let result = '';
  let pos = 0;

  while (pos < template.length) {
    const openIdx = template.indexOf('{{#each', pos);
    if (openIdx === -1) {
      result += template.slice(pos);
      break;
    }

    result += template.slice(pos, openIdx);

    const tagEnd = template.indexOf('}}', openIdx);
    if (tagEnd === -1) {
      result += template.slice(openIdx);
      break;
    }

    const fullOpenTag = template.slice(openIdx, tagEnd + 2);
    const matchResult = tagMatcher(fullOpenTag);

    if (!matchResult || !matchResult.matched) {
      result += fullOpenTag;
      pos = tagEnd + 2;
      continue;
    }

    let depth = 1;
    let searchPos = tagEnd + 2;
    const contentStart = searchPos;
    let matchingCloseIdx = -1;

    while (searchPos < template.length && depth > 0) {
      const nextOpen = template.indexOf('{{#each', searchPos);
      const nextClose = template.indexOf('{{/each}}', searchPos);

      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        searchPos = nextOpen + 7;
      } else {
        depth--;
        if (depth === 0) {
          matchingCloseIdx = nextClose;
          break;
        }
        searchPos = nextClose + 9;
      }
    }

    if (matchingCloseIdx === -1) {
      result += fullOpenTag;
      pos = tagEnd + 2;
      continue;
    }

    const innerContent = template.slice(contentStart, matchingCloseIdx);
    result += replacer(innerContent, matchResult.params);
    pos = matchingCloseIdx + 9;
  }

  return result;
}

/**
 * Injects dynamic forms into form tokens like `{{ Form "Contact_Us" }}`.
 */
export function injectDynamicForms(template: string, ctx: HydrationContext): string {
  const formRegex = /\{\{\s*(?:Form|form)\s+["']?([^"'}]+)["']?\s*\}\}/gi;

  return template.replace(formRegex, (_match, formKeyRaw) => {
    const formKey = (formKeyRaw || '').trim().toLowerCase();

    if (ctx.forms && ctx.forms[formKey]) {
      return ctx.forms[formKey];
    }

    if (formKey === 'contact_us' || formKey === 'contact' || formKey === 'inquiry') {
      return `<form class="oz-injected-form oz-contact-form" onsubmit="event.preventDefault();">
  <div class="row g-3">
    <div class="col-md-6">
      <label class="form-label fw-semibold">Full Name *</label>
      <input type="text" class="form-control" placeholder="e.g. Alex Rivera" required />
    </div>
    <div class="col-md-6">
      <label class="form-label fw-semibold">Work Email *</label>
      <input type="email" class="form-control" placeholder="name@company.com" required />
    </div>
    <div class="col-12">
      <label class="form-label fw-semibold">Subject</label>
      <input type="text" class="form-control" placeholder="Project Inquiry / Advisory" />
    </div>
    <div class="col-12">
      <label class="form-label fw-semibold">Message *</label>
      <textarea class="form-control" rows="4" placeholder="How can our engineering team assist your organization?" required></textarea>
    </div>
    <div class="col-12 mt-3">
      <button type="submit" class="btn btn-primary px-4 py-2 fw-semibold">Send Message</button>
    </div>
  </div>
</form>`;
    }

    if (formKey === 'newsletter_subscribe' || formKey === 'newsletter' || formKey === 'subscribe') {
      return `<form class="oz-injected-form oz-newsletter-form d-flex gap-2" onsubmit="event.preventDefault();">
  <input type="email" class="form-control" placeholder="Enter your work email" required />
  <button type="submit" class="btn btn-primary fw-semibold text-nowrap">Subscribe</button>
</form>`;
    }

    if (formKey === 'comment_submit' || formKey === 'comment' || formKey === 'reply' || formKey === 'leave_comment') {
      return `<form class="oz-injected-form oz-comment-form" onsubmit="event.preventDefault();">
  <div class="row g-3">
    <div class="col-md-6">
      <label class="form-label fw-semibold">Your Name *</label>
      <input type="text" class="form-control" placeholder="e.g. Sarah Jenkins" required />
    </div>
    <div class="col-md-6">
      <label class="form-label fw-semibold">Email Address *</label>
      <input type="email" class="form-control" placeholder="name@example.com" required />
    </div>
    <div class="col-12">
      <label class="form-label fw-semibold">Your Thoughts / Comment *</label>
      <textarea class="form-control" rows="4" placeholder="Join the discussion or share your perspective..." required></textarea>
    </div>
    <div class="col-12 mt-3">
      <button type="submit" class="btn btn-primary px-4 py-2 fw-semibold">Post Comment</button>
    </div>
  </div>
</form>`;
    }

    return `<div class="oz-form-placeholder p-3 bg-light rounded text-muted small text-center">Form: ${formKeyRaw}</div>`;
  });
}

/**
 * Replaces common brand and identity scalars.
 */
export function replaceCommonScalars(template: string, ctx: HydrationContext): string {
  let output = template;

  output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, ctx.brandName || 'Apex Global');
  output = output.replace(/\{\{\s*(?:BrandLogo|LogoUrl)\s*\}\}/gi, ctx.brandLogo || ctx.logoUrl || '');
  output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `© ${new Date().getFullYear()} Apex Global. All rights reserved.`);
  output = output.replace(/\{\{\s*Email\s*\}\}/gi, ctx.email || '');
  output = output.replace(/\{\{\s*Phone\s*\}\}/gi, ctx.phone || '');
  output = output.replace(/\{\{\s*Address\s*\}\}/gi, ctx.address || '');
  output = output.replace(/\{\{\s*WorkingHours\s*\}\}/gi, ctx.workingHours || '');
  output = output.replace(/\{\{\s*HomeUrl\s*\}\}/gi, ctx.homeUrl || '/');
  output = output.replace(/\{\{\s*ContactUrl\s*\}\}/gi, (ctx as any).contactUrl || '/contact');
  output = output.replace(/\{\{\s*LoginUrl\s*\}\}/gi, ctx.loginUrl || '/auth/login');
  output = output.replace(/\{\{\s*LoginText\s*\}\}/gi, ctx.loginText || 'Sign In');
  output = output.replace(/\{\{\s*CustomClass\s*\}\}/gi, ctx.customClass || '');

  return output;
}

/**
 * Scrubs any leftover unrendered tokens.
 */
export function scrubRemainingTokens(template: string): string {
  let output = template.replace(/\{\{#each\s+[^}]+\}\}[\s\S]*?\{\{\/each\}\}/gi, '');
  output = output.replace(/\{\{#if\s+[^}]+\}\}[\s\S]*?\{\{\/if\}\}/gi, '');
  output = output.replace(/\{\{\s*[^}]+\s*\}\}/gi, '');
  return output;
}
