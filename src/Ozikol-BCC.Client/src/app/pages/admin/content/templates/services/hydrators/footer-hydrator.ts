import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens,
  injectDynamicForms
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Footer ('footer').
 * Handles:
 * - Dynamic Category Columns Loop: {{#each FooterCategories}} with child {{#each Pages}}
 * - Named Category Pages Loop: {{#each CategoryPages "..."}} and {{#each PageCategory "..."}}
 * - Tagged Pages Loop: {{#each TaggedPages "..."}}
 * - Social Media Channels: {{#each SocialLinks}}
 * - Legal Policy Links: {{#each LegalPages}}
 * - Dynamic Forms: {{ Form "Newsletter_Subscribe" }} / {{ Form "..." }}
 * - Brand & Contact Info: {{ BrandIdentity }}, {{ BrandName }}, {{ BrandLogo }}, {{ Description }}, {{ Copyright }}, {{ Year }}, {{ Address }}, {{ Phone }}, {{ Email }}
 * - Root CustomClass: {{ CustomClass }}
 */
export function hydrateFooter(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Dynamic Forms Injection (e.g. {{ Form "Newsletter_Subscribe" }})
  output = injectDynamicForms(output, ctx);

  // 2. Footer Dynamic Category Columns Loop: {{#each FooterCategories}}
  const rawFooterCategories = (ctx.footerCategories && ctx.footerCategories.length > 0)
    ? ctx.footerCategories
    : ((ctx as any).categories && (ctx as any).categories.length > 0)
      ? (ctx as any).categories.map((c: any) => ({
          title: c.title || c.displayTitle || c.name || 'Category',
          sortOrder: c.sortOrder ?? 1,
          pages: c.pages || []
        }))
      : [
          {
            title: 'Solutions',
            sortOrder: 1,
            pages: [
              { title: 'Enterprise Cloud', url: '/solutions/cloud', sortOrder: 1 },
              { title: 'Edge Security', url: '/solutions/security', sortOrder: 2 },
              { title: 'Pipeline Orchestration', url: '/solutions/pipeline', sortOrder: 3 },
              { title: 'High Availability', url: '/solutions/ha', sortOrder: 4 }
            ]
          },
          {
            title: 'Company',
            sortOrder: 2,
            pages: [
              { title: 'About Us', url: '/about', sortOrder: 1 },
              { title: 'Leadership', url: '/leadership', sortOrder: 2 },
              { title: 'Careers', url: '/careers', sortOrder: 3 },
              { title: 'News & Press', url: '/press', sortOrder: 4 }
            ]
          },
          {
            title: 'Resources',
            sortOrder: 3,
            pages: [
              { title: 'Documentation', url: '/docs', sortOrder: 1 },
              { title: 'API Reference', url: '/api', sortOrder: 2 },
              { title: 'Developer Portal', url: '/developers', sortOrder: 3 },
              { title: 'System Status', url: '/status', sortOrder: 4 }
            ]
          }
        ];

  const footerCategoriesMatcher = (openTag: string) => {
    return /^\{\{#each\s+FooterCategories\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, footerCategoriesMatcher, (innerTemplate) => {
    return rawFooterCategories.map((col: any, cIdx: number) => {
      let colRendered = innerTemplate;

      // 1. Process nested child pages loop FIRST so {{ Title }} inside child pages binds to page.title
      const pagesMatcher = (pTag: string) => {
        return /^\{\{#each\s+Pages\b[^}]*\}\}/i.test(pTag) ? { matched: true } : null;
      };

      const childPages = col.pages || [];
      colRendered = replaceDepthAwareEach(colRendered, pagesMatcher, (pageTemplate) => {
        return childPages.map((page: any, pIdx: number) => {
          let pageRendered = pageTemplate;
          pageRendered = pageRendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
          pageRendered = pageRendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
          pageRendered = pageRendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
          pageRendered = pageRendered.replace(/\{\{\s*@index\s*\}\}/gi, String(pIdx));
          return pageRendered;
        }).join('\n');
      });

      // 2. Process column title and index on the remaining parent container
      colRendered = colRendered.replace(/\{\{\s*(?:CategoryTitle|ColumnTitle|Title|DisplayTitle)\s*\}\}/gi, col.title || `Column ${cIdx + 1}`);
      colRendered = colRendered.replace(/\{\{\s*@index\s*\}\}/gi, String(cIdx));

      return colRendered;
    }).join('\n');
  });

  // 3. Named Category Pages Loop: {{#each CategoryPages "..."}} or {{#each PageCategory "..."}}
  const namedCategoryMatcher = (openTag: string) => {
    const match = openTag.match(/\{\{#each\s+(?:CategoryPages|PageCategory)\s+["']([^"']+)["']\}\}/i);
    return match ? { matched: true, params: match[1] } : null;
  };

  output = replaceDepthAwareEach(output, namedCategoryMatcher, (innerTemplate, catName) => {
    let pages: Array<{ title: string; url: string; sortOrder?: number; publish?: boolean; customClass?: string }> = [];

    // Check if categoryPages map has it
    if (ctx.categoryPages && ctx.categoryPages[catName]) {
      pages = ctx.categoryPages[catName];
    } else {
      // Find inside footerCategories matching by title
      const foundCol = rawFooterCategories.find((c: any) => (c.title || '').toLowerCase() === (catName || '').toLowerCase());
      if (foundCol && foundCol.pages) {
        pages = foundCol.pages;
      } else {
        pages = [
          { title: `${catName} Overview`, url: `/${catName?.toLowerCase()}` },
          { title: `${catName} Features`, url: `/${catName?.toLowerCase()}/features` },
          { title: `${catName} Documentation`, url: `/${catName?.toLowerCase()}/docs` }
        ];
      }
    }

    const activePages = pages.filter(p => p.publish !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return activePages.map((page, pIdx) => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      rendered = rendered.replace(/\{\{\s*@index\s*\}\}/gi, String(pIdx));
      return rendered;
    }).join('\n');
  });

  // 4. Tagged Pages Loop: {{#each TaggedPages "..."}}, {{#each TaggedPages}}, and {{#each QuickLinks}}
  const taggedPagesParamMatcher = (openTag: string) => {
    const match = openTag.match(/\{\{#each\s+TaggedPages\s+["']([^"']+)["']\}\}/i);
    return match ? { matched: true, params: match[1] } : null;
  };

  output = replaceDepthAwareEach(output, taggedPagesParamMatcher, (innerTemplate, tagName) => {
    const key = tagName || 'quicklinks';
    const pages = (ctx.taggedPages && ctx.taggedPages[key] && ctx.taggedPages[key].length > 0)
      ? ctx.taggedPages[key]
      : (ctx.taggedPages && ctx.taggedPages['quicklinks'] && ctx.taggedPages['quicklinks'].length > 0)
        ? ctx.taggedPages['quicklinks']
        : [];

    return pages.map((page, idx) => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      rendered = rendered.replace(/\{\{\s*@index\s*\}\}/gi, String(idx));
      return rendered;
    }).join('\n');
  });

  const taggedPagesBareMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:TaggedPages|QuickLinks)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, taggedPagesBareMatcher, (innerTemplate) => {
    const firstTag = ctx.taggedPages ? Object.keys(ctx.taggedPages)[0] : null;
    const pages = (firstTag && ctx.taggedPages?.[firstTag] && ctx.taggedPages[firstTag].length > 0)
      ? ctx.taggedPages[firstTag]
      : (ctx.taggedPages && ctx.taggedPages['quicklinks'] ? ctx.taggedPages['quicklinks'] : []);

    return pages.map((page, idx) => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      rendered = rendered.replace(/\{\{\s*@index\s*\}\}/gi, String(idx));
      return rendered;
    }).join('\n');
  });

  // 5. Social Media Channels Loop: {{#each SocialLinks}}
  const rawSocials = ctx.socialLinks || [];

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

  // 5b. Structured Contact Items Loops: {{#each ContactItems}}, {{#each ContactChannels}}
  const rawContactItems = ctx.contactItems || [];

  const contactItemsMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:ContactItems|ContactChannels)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, contactItemsMatcher, (innerTemplate) => {
    return renderFooterContactItemsList(rawContactItems, innerTemplate);
  });

  // Filtered phone, email, address loops
  const phoneMatcher = (openTag: string) => /^\{\{#each\s+(?:ContactPhones|Phones)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  output = replaceDepthAwareEach(output, phoneMatcher, (innerTemplate) => {
    const phones = rawContactItems.filter(c => (c.type || c.channelType || '').toLowerCase() === 'phone');
    return renderFooterContactItemsList(phones, innerTemplate);
  });

  const emailMatcher = (openTag: string) => /^\{\{#each\s+(?:ContactEmails|Emails)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  output = replaceDepthAwareEach(output, emailMatcher, (innerTemplate) => {
    const emails = rawContactItems.filter(c => (c.type || c.channelType || '').toLowerCase() === 'email');
    return renderFooterContactItemsList(emails, innerTemplate);
  });

  const addressMatcher = (openTag: string) => /^\{\{#each\s+(?:ContactAddresses|Addresses)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  output = replaceDepthAwareEach(output, addressMatcher, (innerTemplate) => {
    const addresses = rawContactItems.filter(c => (c.type || c.channelType || '').toLowerCase() === 'address');
    return renderFooterContactItemsList(addresses, innerTemplate);
  });

  // 6. Footer Bottom / Legal Policy Pages Loop: {{#each FooterBottomPages}} & {{#each LegalPages}}
  const rawBottomPages = ctx.footerBottomPages || ctx.legalPages || [];

  const bottomPagesMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:FooterBottomPages|LegalPages)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, bottomPagesMatcher, (innerTemplate) => {
    return rawBottomPages.map(page => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 7. Brand Identity, Contact Conditionals & Text
  const hasEmail = Boolean(ctx.email && ctx.email.trim().length > 0);
  const hasPhone = Boolean(ctx.phone && ctx.phone.trim().length > 0);
  const hasAddress = Boolean(ctx.address && ctx.address.trim().length > 0);
  const hasWorkingHours = Boolean(ctx.workingHours && ctx.workingHours.trim().length > 0);
  const hasContact = Boolean(ctx.hasContactInfo ?? (hasEmail || hasPhone || hasAddress || rawContactItems.length > 0));
  const hasSocial = Boolean(ctx.hasSocialLinks ?? (rawSocials.length > 0));

  output = resolveDepthAwareIf(output, 'HasContactInfo', hasContact);
  output = resolveDepthAwareIf(output, 'HasSocialLinks', hasSocial);
  output = resolveDepthAwareIf(output, 'Email', hasEmail);
  output = resolveDepthAwareIf(output, 'Phone', hasPhone);
  output = resolveDepthAwareIf(output, 'Address', hasAddress);
  output = resolveDepthAwareIf(output, 'WorkingHours', hasWorkingHours);
  const currentYear = new Date().getFullYear().toString();
  const brandName = ctx.brandName || '';
  const logoUrl = (ctx.brandLogo || ctx.logoUrl || '').trim();
  const effectiveDesc = ctx.description || (ctx as any)['tagline'] || '';
  output = resolveDepthAwareIf(output, 'Description', Boolean(effectiveDesc && effectiveDesc.trim().length > 0));

  output = resolveDepthAwareIf(output, 'BrandLogo', Boolean(logoUrl.length > 0));
  output = resolveDepthAwareIf(output, 'LogoUrl', Boolean(logoUrl.length > 0));

  const brandIdentityHtml = (logoUrl.length > 0)
    ? `<img src="${logoUrl}" alt="${brandName}" class="oz-footer-brand-logo" />`
    : (brandName ? `<span class="oz-footer-brand-text">${brandName}</span>` : '');

  output = output.replace(/\{\{\s*(?:BrandIdentity|BrandLogoOrName)\s*\}\}/gi, brandIdentityHtml);
  output = output.replace(/\{\{\s*(?:BrandLogo|LogoUrl)\s*\}\}/gi, logoUrl);
  output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, brandName);
  output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
  output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || (brandName ? `© ${currentYear} ${brandName}. All rights reserved.` : `© ${currentYear}. All rights reserved.`));
  output = output.replace(/\{\{\s*Description\s*\}\}/gi, effectiveDesc);
  output = output.replace(/\{\{\s*ContactUrl\s*\}\}/gi, (ctx as any).contactUrl || '/contact');

  // 8. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 9. Final scrub for unrendered tokens
  output = scrubRemainingTokens(output);

  return output;
}

/**
 * Helper to render individual contact items in footer loops.
 */
function renderFooterContactItemsList(items: any[], innerTemplate: string): string {
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
 * Resolves standard FontAwesome icon class for common platforms and channel types in footers.
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
