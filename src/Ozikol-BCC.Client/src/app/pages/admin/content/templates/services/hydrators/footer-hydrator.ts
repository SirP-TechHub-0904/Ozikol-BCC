import {
  HydrationContext,
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
  const rawFooterCategories = ctx.footerCategories || [
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
    return rawFooterCategories.map((col, cIdx) => {
      let colRendered = innerTemplate;

      // Replace Column Title & Sort Order
      colRendered = colRendered.replace(/\{\{\s*Title\s*\}\}/gi, col.title || `Column ${cIdx + 1}`);
      colRendered = colRendered.replace(/\{\{\s*DisplayTitle\s*\}\}/gi, col.title || `Column ${cIdx + 1}`);
      colRendered = colRendered.replace(/\{\{\s*@index\s*\}\}/gi, String(cIdx));

      // Nested child pages loop: {{#each Pages}}
      const pagesMatcher = (pTag: string) => {
        return /^\{\{#each\s+Pages\b[^}]*\}\}/i.test(pTag) ? { matched: true } : null;
      };

      const childPages = col.pages || [];
      colRendered = replaceDepthAwareEach(colRendered, pagesMatcher, (pageTemplate) => {
        return childPages.map((page, pIdx) => {
          let pageRendered = pageTemplate;
          pageRendered = pageRendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
          pageRendered = pageRendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
          pageRendered = pageRendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
          pageRendered = pageRendered.replace(/\{\{\s*@index\s*\}\}/gi, String(pIdx));
          return pageRendered;
        }).join('\n');
      });

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
      const foundCol = rawFooterCategories.find(c => c.title.toLowerCase() === (catName || '').toLowerCase());
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
    return activePages.map(page => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 4. Tagged Pages Loop: {{#each TaggedPages "..."}}
  const taggedPagesMatcher = (openTag: string) => {
    const match = openTag.match(/\{\{#each\s+TaggedPages\s+["']([^"']+)["']\}\}/i);
    return match ? { matched: true, params: match[1] } : null;
  };

  output = replaceDepthAwareEach(output, taggedPagesMatcher, (innerTemplate, tagName) => {
    const pages = (ctx.taggedPages && ctx.taggedPages[tagName]) ? ctx.taggedPages[tagName] : [
      { title: `${tagName} Item 1`, url: '#' },
      { title: `${tagName} Item 2`, url: '#' },
      { title: `${tagName} Item 3`, url: '#' }
    ];
    return pages.map(page => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 5. Social Media Channels Loop: {{#each SocialLinks}}
  const rawSocials = ctx.socialLinks || [
    { platform: 'Twitter / X', url: 'https://twitter.com', icon: 'share' },
    { platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'public' },
    { platform: 'GitHub', url: 'https://github.com', icon: 'code' }
  ];

  const socialMatcher = (openTag: string) => {
    return /^\{\{#each\s+SocialLinks\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, socialMatcher, (innerTemplate) => {
    return rawSocials.map(soc => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, soc.platform || '');
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, soc.platform || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, soc.url || '#');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, soc.icon || 'public');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, soc.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 6. Legal Policy Pages Loop: {{#each LegalPages}}
  const rawLegal = ctx.legalPages || [
    { title: 'Privacy Policy', url: '/privacy-policy' },
    { title: 'Terms of Service', url: '/terms-and-conditions' },
    { title: 'Security & SLA', url: '/security' },
    { title: 'Cookie Policy', url: '/cookie-policy' }
  ];

  const legalMatcher = (openTag: string) => {
    return /^\{\{#each\s+LegalPages\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, legalMatcher, (innerTemplate) => {
    return rawLegal.map(page => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, page.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 7. Brand Identity & Text
  const currentYear = new Date().getFullYear().toString();
  const brandName = ctx.brandName || 'Acme Global';
  const logoUrl = ctx.brandLogo || ctx.logoUrl || '';
  const brandIdentityHtml = (logoUrl && logoUrl.trim().length > 0)
    ? `<img src="${logoUrl}" alt="${brandName}" class="oz-footer-brand-logo" />`
    : `<span class="oz-footer-brand-text">${brandName}</span>`;

  output = output.replace(/\{\{\s*(?:BrandIdentity|BrandLogoOrName)\s*\}\}/gi, brandIdentityHtml);
  output = output.replace(/\{\{\s*BrandLogo\s*\}\}/gi, logoUrl);
  output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, brandName);
  output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
  output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `© ${currentYear} ${brandName}. All rights reserved.`);
  output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || 'Empowering enterprise workloads with global scale, sub-millisecond resilience, and autonomous cloud pipelines.');

  // 8. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 9. Final scrub for unrendered tokens
  output = scrubRemainingTokens(output);

  return output;
}
