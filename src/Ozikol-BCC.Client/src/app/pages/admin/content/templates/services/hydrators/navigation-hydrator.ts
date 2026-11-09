import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Navigation ('menu' / 'navigation').
 * Handles:
 * - 3-Zone loops: {{#each NavItems "first"}}, {{#each NavItems "middle"}}, {{#each NavItems "last"}}, {{#each NavItems}}
 * - Child dropdown pages: {{#each Pages}}
 * - Top utility bar: {{#each TopBarPages}}, {{#if HasTopBar}}, {{#if HasContactInfo}}
 * - Action CTA buttons: {{#each MenuCtaButtons}}
 * - Brand & Auth conditionals: {{#if BrandLogo}}, {{#if LoginUrl}}, {{#if IsDropdown}}
 */
export function hydrateNavigation(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  const rawMenus = ctx.navigationMenu || [];
  const activeMenus = rawMenus.filter(m => m.publish !== false && m.showInMainMenu !== false);
  const sortedAll = [...activeMenus].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // Check if template places multiple zone tags inside the same continuous navbar list (e.g. NavItems="first" followed by NavItems="middle").
  // When contiguous, render all items in the first loop in exact sequential sortOrder so that moving pages up/down in the Admin Console
  // moves them immediately and directly on the live website without artificial zone-boundary stalls.
  const hasContiguousZones = /\{\{#each\s+NavItems(?:=|\s+)["']first["']\}\}[\s\S]*?\{\{#each\s+NavItems(?:=|\s+)["']middle["']\}\}/i.test(template);

  const firstZone = activeMenus.filter(m => (m.zone || 'first').toLowerCase() === 'first');
  const middleZone = activeMenus.filter(m => (m.zone || 'first').toLowerCase() === 'middle');
  const lastZone = activeMenus.filter(m => (m.zone || 'first').toLowerCase() === 'last');

  const effectiveFirstZone = hasContiguousZones ? sortedAll : firstZone;
  const effectiveMiddleZone = hasContiguousZones ? [] : middleZone;
  const effectiveLastZone = hasContiguousZones ? [] : lastZone;

  let output = template;

  // 1. Zone Conditionals
  output = resolveDepthAwareIf(output, 'HasNavItemsFirst', effectiveFirstZone.length > 0);
  output = resolveDepthAwareIf(output, 'HasNavItemsMiddle', effectiveMiddleZone.length > 0);
  output = resolveDepthAwareIf(output, 'HasNavItemsLast', effectiveLastZone.length > 0);
  output = resolveDepthAwareIf(output, 'HasNavItems', activeMenus.length > 0);

  // 2. TopBar, Contact Info & Social Media Conditionals
  const hasEmail = Boolean(ctx.email && ctx.email.trim().length > 0);
  const hasPhone = Boolean(ctx.phone && ctx.phone.trim().length > 0);
  const hasAddress = Boolean(ctx.address && ctx.address.trim().length > 0);
  const hasWorkingHours = Boolean(ctx.workingHours && ctx.workingHours.trim().length > 0);
  const rawSocials = ctx.socialLinks || [];
  const rawContactItems = ctx.contactItems || [];
  const hasContact = Boolean(ctx.hasContactInfo ?? (hasEmail || hasPhone || hasAddress || rawContactItems.length > 0));
  const hasSocial = Boolean(ctx.hasSocialLinks ?? (rawSocials.length > 0));
  const hasTopBar = Boolean(ctx.hasTopBar ?? (hasContact || hasSocial || (ctx.topBarPages && ctx.topBarPages.length > 0)));

  output = resolveDepthAwareIf(output, 'HasTopBar', hasTopBar);
  output = resolveDepthAwareIf(output, 'HasContactInfo', hasContact);
  output = resolveDepthAwareIf(output, 'HasSocialLinks', hasSocial);
  output = resolveDepthAwareIf(output, 'Email', hasEmail);
  output = resolveDepthAwareIf(output, 'Phone', hasPhone);
  output = resolveDepthAwareIf(output, 'Address', hasAddress);
  output = resolveDepthAwareIf(output, 'WorkingHours', hasWorkingHours);

  output = resolveDepthAwareIf(output, 'ActivateLoginInMenu', Boolean(ctx.activateLoginInMenu));
  output = resolveDepthAwareIf(output, 'LoginUrl', Boolean(ctx.loginUrl || ctx.activateLoginInMenu));
  const effectiveLogo = (ctx.brandLogo || ctx.logoUrl || '').trim();
  output = resolveDepthAwareIf(output, 'BrandLogo', Boolean(effectiveLogo.length > 0));
  output = resolveDepthAwareIf(output, 'LogoUrl', Boolean(effectiveLogo.length > 0));

  // 3. Zone 1: First
  const zoneFirstMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:=|\s+)["']first["']\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, zoneFirstMatcher, (innerTemplate) => {
    return renderNavList(effectiveFirstZone, innerTemplate);
  });

  // 4. Zone 2: Middle
  const zoneMiddleMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:=|\s+)["']middle["']\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, zoneMiddleMatcher, (innerTemplate) => {
    return renderNavList(effectiveMiddleZone, innerTemplate);
  });

  // 5. Zone 3: Last
  const zoneLastMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:=|\s+)["']last["']\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, zoneLastMatcher, (innerTemplate) => {
    return renderNavList(effectiveLastZone, innerTemplate);
  });

  // 6. Global Unzoned NavItems (if template uses simple {{#each NavItems}})
  const globalNavMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:\s*=\s*["']all["'])?\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, globalNavMatcher, (innerTemplate) => {
    const sortedAll = [...activeMenus].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return renderNavList(sortedAll, innerTemplate);
  });

  // 7. Top Utility Bar Pages Loop: {{#each TopBarPages}} or {{#each MainMenuItems="top"}}
  const topBarMatcher = (openTag: string) => {
    return /\{\{#each\s+(?:MainMenuItems=["']top["']|TopBarPages)\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, topBarMatcher, (innerTemplate) => {
    const tbPages = ctx.topBarPages || [];
    if (tbPages.length === 0) return '';
    return tbPages.map(page => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, page.icon || 'link');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 8. Header CTA Buttons Loop: {{#each MenuCtaButtons}}
  const ctaMatcher = (openTag: string) => {
    return /\{\{#each\s+MenuCtaButtons\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, ctaMatcher, (innerTemplate) => {
    const ctas = ctx.menuCtaButtons || [];
    if (ctas.length === 0) return '';
    return ctas.map(cta => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, cta.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, cta.url || '#');
      rendered = rendered.replace(/\{\{\s*ButtonClass\s*\}\}/gi, cta.buttonClass || 'oz-btn-primary');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, cta.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 8b. Social Media Channels Loop: {{#each SocialLinks}}
  const socialMatcher = (openTag: string) => {
    return /^\{\{#each\s+SocialLinks\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, socialMatcher, (innerTemplate) => {
    return rawSocials.map(soc => {
      let rendered = innerTemplate;
      const iconCls = soc.iconClass || resolveDefaultIconClass(soc.platform || '');
      rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, soc.platform || '');
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, soc.title || soc.platform || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, soc.url || '#');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, soc.icon || 'public');
      rendered = rendered.replace(/\{\{\s*IconClass\s*\}\}/gi, iconCls);
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, soc.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 8c. Structured Contact Items Loops: {{#each ContactItems}}, {{#each ContactChannels}}
  const contactItemsMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:ContactItems|ContactChannels)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, contactItemsMatcher, (innerTemplate) => {
    return renderContactItemsList(rawContactItems, innerTemplate);
  });

  // Filtered phone, email, address loops
  const phoneMatcher = (openTag: string) => /^\{\{#each\s+(?:ContactPhones|Phones)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  output = replaceDepthAwareEach(output, phoneMatcher, (innerTemplate) => {
    const phones = rawContactItems.filter(c => (c.type || c.channelType || '').toLowerCase() === 'phone');
    return renderContactItemsList(phones, innerTemplate);
  });

  const emailMatcher = (openTag: string) => /^\{\{#each\s+(?:ContactEmails|Emails)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  output = replaceDepthAwareEach(output, emailMatcher, (innerTemplate) => {
    const emails = rawContactItems.filter(c => (c.type || c.channelType || '').toLowerCase() === 'email');
    return renderContactItemsList(emails, innerTemplate);
  });

  const addressMatcher = (openTag: string) => /^\{\{#each\s+(?:ContactAddresses|Addresses)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  output = replaceDepthAwareEach(output, addressMatcher, (innerTemplate) => {
    const addresses = rawContactItems.filter(c => (c.type || c.channelType || '').toLowerCase() === 'address');
    return renderContactItemsList(addresses, innerTemplate);
  });

  // 9. Replace Shared Brand Scalars & Section CustomClass
  output = replaceCommonScalars(output, ctx);

  // 10. Scrub remaining tokens
  output = scrubRemainingTokens(output);

  return output;
}

/**
 * Helper to render individual contact items in loops.
 */
function renderContactItemsList(items: any[], innerTemplate: string): string {
  if (!items || items.length === 0) return '';
  return items.map((item, idx) => {
    let rendered = innerTemplate;
    const itemValue = item.value || item.content || '';
    const itemUrl = item.url || (item.type === 'phone' ? `tel:${itemValue.replace(/[^0-9+]/g, '')}` : (item.type === 'email' ? `mailto:${itemValue}` : '#'));
    const iconCls = item.iconClass || resolveDefaultIconClass(item.type || item.platform || '');

    rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
    rendered = rendered.replace(/\{\{\s*(?:Value|Content)\s*\}\}/gi, itemValue);
    rendered = rendered.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
    rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, itemUrl);
    rendered = rendered.replace(/\{\{\s*Type\s*\}\}/gi, item.type || item.channelType || '');
    rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, item.platform || '');
    rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, item.icon || 'info');
    rendered = rendered.replace(/\{\{\s*IconClass\s*\}\}/gi, iconCls);
    rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
    rendered = rendered.replace(/\{\{\s*@index\s*\}\}/gi, String(idx));
    return rendered;
  }).join('\n');
}

/**
 * Resolves standard FontAwesome icon class for common platforms and channel types.
 */
function resolveDefaultIconClass(key: string): string {
  const lower = (key || '').toLowerCase();
  if (lower.includes('twitter') || lower.includes(' x')) return 'fa-brands fa-x-twitter';
  if (lower.includes('linkedin')) return 'fa-brands fa-linkedin';
  if (lower.includes('facebook')) return 'fa-brands fa-facebook';
  if (lower.includes('instagram')) return 'fa-brands fa-instagram';
  if (lower.includes('youtube')) return 'fa-brands fa-youtube';
  if (lower.includes('github')) return 'fa-brands fa-github';
  if (lower.includes('tiktok')) return 'fa-brands fa-tiktok';
  if (lower.includes('whatsapp')) return 'fa-brands fa-whatsapp';
  if (lower.includes('phone') || lower.includes('tel') || lower.includes('call')) return 'fa-solid fa-phone';
  if (lower.includes('mail') || lower.includes('email')) return 'fa-solid fa-envelope';
  if (lower.includes('address') || lower.includes('location') || lower.includes('map')) return 'fa-solid fa-location-dot';
  return 'fa-solid fa-circle-info';
}

/**
 * Helper to render individual items in a navigation list.
 */
function renderNavList(items: any[], innerTemplate: string): string {
  if (!items || items.length === 0) return '';

  return items
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item, idx) => {
      let rendered = innerTemplate;
      const isDropdown = Boolean(item.isDropdown || (item.pages && item.pages.length > 0));

      // 1. Resolve dropdown conditional
      rendered = resolveDepthAwareIf(rendered, 'IsDropdown', isDropdown);

      // 2. Resolve child pages if dropdown
      const childPages = (item.pages || [])
        .filter((p: any) => p.publish !== false && p.showInMenuDropDown !== false)
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      rendered = resolveDepthAwareIf(rendered, 'Pages', isDropdown && childPages.length > 0);

      if (isDropdown && childPages.length > 0) {
        const pagesMatcher = (openTag: string) => {
          return /^\{\{#each\s+Pages\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
        };

        rendered = replaceDepthAwareEach(rendered, pagesMatcher, (pageTemplate) => {
          return childPages.map((page: any) => {
            let pageRendered = pageTemplate;
            pageRendered = pageRendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
            pageRendered = pageRendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
            pageRendered = pageRendered.replace(/\{\{\s*Icon\s*\}\}/gi, page.icon || 'link');
            pageRendered = pageRendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
            return pageRendered;
          }).join('\n');
        });
      }

      // 3. Parent link scalars
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, item.url || '#');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, item.icon || 'link');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
      rendered = rendered.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(item.sortOrder ?? idx + 1));

      return rendered;
    }).join('\n');
}
