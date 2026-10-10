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
  const firstZone = activeMenus.filter(m => (m.zone || 'first').toLowerCase() === 'first');
  const middleZone = activeMenus.filter(m => (m.zone || 'first').toLowerCase() === 'middle');
  const lastZone = activeMenus.filter(m => (m.zone || 'first').toLowerCase() === 'last');

  let output = template;

  // 1. Zone Conditionals
  output = resolveDepthAwareIf(output, 'HasNavItemsFirst', firstZone.length > 0);
  output = resolveDepthAwareIf(output, 'HasNavItemsMiddle', middleZone.length > 0);
  output = resolveDepthAwareIf(output, 'HasNavItemsLast', lastZone.length > 0);
  output = resolveDepthAwareIf(output, 'HasNavItems', activeMenus.length > 0);

  // 2. TopBar & Contact Info Conditionals
  const hasEmail = Boolean(ctx.email && ctx.email.trim().length > 0);
  const hasPhone = Boolean(ctx.phone && ctx.phone.trim().length > 0);
  const hasAddress = Boolean(ctx.address && ctx.address.trim().length > 0);
  const hasContact = Boolean(ctx.hasContactInfo ?? (hasEmail || hasPhone || hasAddress));
  const hasTopBar = Boolean(ctx.hasTopBar ?? (hasContact || (ctx.topBarPages && ctx.topBarPages.length > 0)));

  output = resolveDepthAwareIf(output, 'HasTopBar', hasTopBar);
  output = resolveDepthAwareIf(output, 'HasContactInfo', hasContact);
  output = resolveDepthAwareIf(output, 'Email', hasEmail);
  output = resolveDepthAwareIf(output, 'Phone', hasPhone);
  output = resolveDepthAwareIf(output, 'Address', hasAddress);

  output = resolveDepthAwareIf(output, 'ActivateLoginInMenu', Boolean(ctx.activateLoginInMenu));
  output = resolveDepthAwareIf(output, 'LoginUrl', Boolean(ctx.loginUrl || ctx.activateLoginInMenu));
  output = resolveDepthAwareIf(output, 'BrandLogo', Boolean(ctx.brandLogo && ctx.brandLogo.trim().length > 0));
  output = resolveDepthAwareIf(output, 'LogoUrl', Boolean(ctx.brandLogo && ctx.brandLogo.trim().length > 0));

  // 3. Zone 1: First
  const zoneFirstMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:=|\s+)["']first["']\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, zoneFirstMatcher, (innerTemplate) => {
    return renderNavList(firstZone, innerTemplate);
  });

  // 4. Zone 2: Middle
  const zoneMiddleMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:=|\s+)["']middle["']\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, zoneMiddleMatcher, (innerTemplate) => {
    return renderNavList(middleZone, innerTemplate);
  });

  // 5. Zone 3: Last
  const zoneLastMatcher = (openTag: string) => {
    return /\{\{#each\s+NavItems(?:=|\s+)["']last["']\}\}/i.test(openTag) ? { matched: true } : null;
  };
  output = replaceDepthAwareEach(output, zoneLastMatcher, (innerTemplate) => {
    return renderNavList(lastZone, innerTemplate);
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

  // 9. Replace Shared Brand Scalars & Section CustomClass
  output = replaceCommonScalars(output, ctx);

  // 10. Scrub remaining tokens
  output = scrubRemainingTokens(output);

  return output;
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
      if (isDropdown) {
        const childPages = (item.pages || [])
          .filter((p: any) => p.publish !== false && p.showInMenuDropDown !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        const pagesMatcher = (openTag: string) => {
          return /^\{\{#each\s+Pages\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
        };

        rendered = replaceDepthAwareEach(rendered, pagesMatcher, (pageTemplate) => {
          if (childPages.length === 0) return '';
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
