import { Injectable } from '@angular/core';

/**
 * Options and environment state required for template hydration.
 */
export interface TemplateHydrationOptions {
  editorTokens?: any;
  availablePages?: any[];
  currentTenantBrandName?: string;
  previewMenuContent?: any;
  previewFooterContent?: any;
  previewBlogContent?: any;
  previewBlogDetailContent?: any;
}

/**
 * Service responsible for resolving Handlebars-style template tokens, loops,
 * and conditionals into valid, styled HTML for live previews and tenant sandboxes.
 */
@Injectable({
  providedIn: 'root'
})
export class TemplateHydrationService {

  /**
   * Replaces a balanced Handlebars block {{#each BlockName}}...{{/each}}, properly
   * tracking depth to prevent premature truncation when nested {{#each ...}} loops exist.
   * @param template The raw HTML template string.
   * @param blockName The target block name (e.g. 'MenuDropdowns').
   * @param replacer Callback receiving the true balanced inner template string.
   * @returns The transformed HTML string.
   */
  replaceBalancedBlock(template: string, blockName: string, replacer: (inner: string) => string): string {
    if (!template) return '';
    const openPattern = new RegExp(`\\{\\{#each\\s+${blockName}\\}\\}`, 'i');
    let result = '';
    let remaining = template;

    while (true) {
      const match = remaining.match(openPattern);
      if (!match || match.index === undefined) {
        result += remaining;
        break;
      }

      const startIndex = match.index;
      result += remaining.slice(0, startIndex);
      const contentStart = startIndex + match[0].length;
      let depth = 1;
      let pos = contentStart;

      while (pos < remaining.length && depth > 0) {
        const nextOpen = remaining.indexOf('{{#each', pos);
        const nextClose = remaining.indexOf('{{/each}}', pos);

        if (nextClose === -1) {
          break; // Unclosed block
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + '{{#each'.length;
        } else {
          depth--;
          if (depth === 0) {
            const innerContent = remaining.substring(contentStart, nextClose);
            result += replacer(innerContent);
            remaining = remaining.slice(nextClose + '{{/each}}'.length);
            break;
          }
          pos = nextClose + '{{/each}}'.length;
        }
      }

      if (depth !== 0) {
        result += remaining;
        break;
      }
    }

    return result;
  }

  /**
   * Hydrates raw Handlebars template HTML with contextual content, looping tokens, and brand metadata.
   * Strictly enforces visibility rules: unpublished pages (Publish=false) and hidden footer pages
   * (ShowInFooter=false) are never rendered into footer loops.
   * 
   * @param rawHtml The unparsed HTML template.
   * @param data Optional mock/real section model data.
   * @param options Tokens, pages, and brand settings from tenant APIs.
   * @returns Fully resolved, preview-ready HTML.
   */
  hydrateTemplate(rawHtml: string, data?: any, options?: TemplateHydrationOptions): string {
    if (!rawHtml) return '';
    const ctx = data || {};
    const opts = options || {};

    let output = rawHtml;

    // 0a. Loop over {{#each MainMenuItems}}...{{/each}}
    const mainMenuItemsRegex = /\{\{#each\s+MainMenuItems\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(mainMenuItemsRegex, (_match, innerTemplate) => {
      const items = ctx.topMenuItems || opts.previewMenuContent?.topMenuItems || [
        { title: 'Home', url: '/' },
        { title: 'About Us', url: '/about' },
        { title: 'Blog', url: '/blog' },
        { title: 'Contact', url: '/contact' }
      ];
      return items.map((item: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, item.url || item.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 0b. Loop over {{#each MenuCtaButtons}}...{{/each}}
    const menuCtaRegex = /\{\{#each\s+MenuCtaButtons\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(menuCtaRegex, (_match, innerTemplate) => {
      const ctas = ctx.menuCtaButtons || opts.previewMenuContent?.menuCtaButtons || (opts.editorTokens?.menuCtaButtons?.length ? opts.editorTokens.menuCtaButtons : [
        { title: 'Sign In', url: '/login' },
        { title: 'Request a Service', url: '/request-service' }
      ]);
      return ctas.map((cta: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:ButtonText|Title)\s*\}\}/gi, cta.title || '');
        rendered = rendered.replace(/\{\{\s*(?:ButtonLink|Url)\s*\}\}/gi, cta.url || '#');
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, '');
        return rendered;
      }).join('\n');
    });

    // 0c. Loop over {{#each MenuDropdowns}}...{{/each}} with nested {{#each Pages}} using balanced block parsing
    output = this.replaceBalancedBlock(output, 'MenuDropdowns', (outerTemplate) => {
      const dropdowns = ctx.dropdowns || opts.previewMenuContent?.dropdowns || (opts.editorTokens?.menuDropdowns?.length ? opts.editorTokens.menuDropdowns : [
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
      ]);

      if (!Array.isArray(dropdowns) || dropdowns.length === 0) return '';

      return dropdowns.map((dd: any, ddIdx: number) => {
        let renderedDd = outerTemplate;

        // FIRST resolve nested {{#each Pages}} so child {{ Title }} is NOT replaced by parent category title
        const pagesRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        renderedDd = renderedDd.replace(pagesRegex, (_pMatch: string, pageTemplate: string) => {
          const pages = dd.pages || [];
          if (!Array.isArray(pages) || pages.length === 0) return '';
          return pages.map((page: any) => {
            let renderedPage = pageTemplate;
            renderedPage = renderedPage.replace(/\{\{\s*Title\s*\}\}/gi, page.title || '');
            renderedPage = renderedPage.replace(/\{\{\s*Url\s*\}\}/gi, page.url || page.slug || '#');
            return renderedPage;
          }).join('\n');
        });

        // THEN resolve parent dropdown tokens on outer element
        renderedDd = renderedDd.replace(/\{\{\s*CategoryName\s*\}\}/gi, dd.title || dd.categoryName || `Menu ${ddIdx + 1}`);
        renderedDd = renderedDd.replace(/\{\{\s*Title\s*\}\}/gi, dd.title || dd.categoryName || `Menu ${ddIdx + 1}`);
        renderedDd = renderedDd.replace(/\{\{\s*Index\s*\}\}/gi, (ddIdx + 1).toString());

        return renderedDd;
      }).join('\n');
    });

    // 1. Loop over {{#each PageSectionLists}}...{{/each}}
    const eachRegex = /\{\{#each\s+PageSectionLists\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(eachRegex, (_match, innerTemplate) => {
      if (!ctx.items || !Array.isArray(ctx.items) || ctx.items.length === 0) {
        return '';
      }
      return ctx.items.map((item: any, idx: number) => {
        let renderedItem = innerTemplate;
        const icon = (item.iconText && item.iconText.trim().length > 0)
          ? item.iconText.trim()
          : ((item.icon && item.icon.trim().length > 0) ? item.icon.trim() : '');

        renderedItem = renderedItem.replace(/\{\{\s*IconText\s*\}\}/gi, icon);
        renderedItem = renderedItem.replace(/\{\{\s*Icon\s*\}\}/gi, icon);
        renderedItem = renderedItem.replace(/\{\{\s*Title\s*\}\}/gi, item.title || `Item ${idx + 1}`);
        renderedItem = renderedItem.replace(/\{\{\s*MiniTitle\s*\}\}/gi, item.miniTitle || ctx.miniTitle || '');
        renderedItem = renderedItem.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
        renderedItem = renderedItem.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || ctx.imageUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || ctx.buttonText || '');
        renderedItem = renderedItem.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || ctx.buttonLink || '#');
        return renderedItem;
      }).join('\n');
    });

    // 2. Loop over {{#each CategoryPages "Name"}}...{{/each}}
    const catPagesRegex = /\{\{#each\s+CategoryPages\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(catPagesRegex, (_match, catName, innerTemplate) => {
      let pages: any[] = [];
      const normalized = (catName || '').toLowerCase().trim();

      const categories = ctx.categories || opts.editorTokens?.footerGroups || opts.previewFooterContent?.categories;
      const found = categories?.find((c: any) =>
        (c.name && c.name.toLowerCase() === normalized) ||
        (c.displayTitle && c.displayTitle.toLowerCase() === normalized) ||
        (c.categoryName && c.categoryName.toLowerCase() === normalized) ||
        (c.title && c.title.toLowerCase() === normalized)
      );

      if (found?.pages && found.pages.length > 0) {
        // Enforce strict visibility rules: must be published and enabled for footer display
        pages = found.pages.filter((p: any) =>
          (p.publish === undefined || p.publish === true) &&
          (p.showInFooter === undefined || p.showInFooter === true)
        );
      } else if (opts.availablePages && Array.isArray(opts.availablePages)) {
        pages = opts.availablePages.filter((p: any) =>
          p.publish !== false &&
          p.showInFooter !== false &&
          (p.pageCategory && p.pageCategory.toLowerCase().trim() === normalized)
        );
      } else if (normalized.includes('service') || normalized.includes('solution')) {
        pages = [
          { title: 'Strategic Consulting', url: '/strategic-advisory' },
          { title: 'Systems Modernization', url: '/systems-modernization' },
          { title: 'Performance & Scale', url: '/performance-scale' },
          { title: 'Enterprise Advisory', url: '/enterprise-governance' }
        ];
      } else if (normalized.includes('company') || normalized.includes('about')) {
        pages = [
          { title: 'About Us', url: '/about' },
          { title: 'Leadership & Team', url: '/about' },
          { title: 'Insights & News', url: '/blog' },
          { title: 'Request a Service', url: '/request-service' }
        ];
      }

      return pages.map((p: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 2b. Loop over {{#each TaggedPages "TagName"}}...{{/each}}
    const taggedPagesRegex = /\{\{#each\s+TaggedPages\s+"([^"]+)"\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(taggedPagesRegex, (_match, tag, innerTemplate) => {
      const normalized = (tag || '').toLowerCase().trim();
      let pages: any[] = [];

      // 1. Check live loaded tokens from GET /api/content/template-editor-tokens (already filtered by Publish && ShowInFooter)
      if (opts.editorTokens?.taggedPages && Array.isArray(opts.editorTokens.taggedPages)) {
        const found = opts.editorTokens.taggedPages.find((g: any) => (g.tag || '').toLowerCase() === normalized);
        if (found?.pages && Array.isArray(found.pages) && found.pages.length > 0) {
          pages = found.pages;
        }
      }

      // 2. Fallback to availablePages with strict visibility enforcement
      if (pages.length === 0 && opts.availablePages && Array.isArray(opts.availablePages)) {
        pages = opts.availablePages.filter((p: any) => {
          const isPublished = p.publish !== false && p.isPublished !== false;
          const isFooter = p.showInFooter !== false;
          if (!isPublished || !isFooter || !p.tags) return false;

          const tagsList = p.tags.toLowerCase().split(/[,;]/).map((t: string) => t.trim());
          return tagsList.includes(normalized);
        });
      }

      // 3. Fallback sample items for realistic preview display if tenant has no tagged pages yet
      if (pages.length === 0) {
        const displayTag = tag ? (tag.charAt(0).toUpperCase() + tag.slice(1)) : 'Resource';
        pages = [
          { title: `${displayTag} Overview`, url: '#' },
          { title: `${displayTag} Documentation`, url: '#' }
        ];
      }

      return pages.map((p: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
        return rendered;
      }).join('\n');
    });

    // 3. Loop over {{#each FooterCategories}}...{{/each}}
    const footerCatsRegex = /\{\{#each\s+FooterCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(footerCatsRegex, (_match, innerTemplate) => {
      const groups = ctx.categories || opts.previewFooterContent?.categories;
      return (groups || []).map((g: any) => {
        let colHtml = innerTemplate;
        colHtml = colHtml.replace(/\{\{\s*(?:DisplayTitle|Title|CategoryTitle)\s*\}\}/gi, g.displayTitle || g.name || 'Column');

        const pagesLoopRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        colHtml = colHtml.replace(pagesLoopRegex, (_pMatch: string, pTemplate: string) => {
          const pages = g.pages || [];
          return pages.map((p: any) => {
            let pRendered = pTemplate;
            pRendered = pRendered.replace(/\{\{\s*Title\s*\}\}/gi, p.title || '');
            pRendered = pRendered.replace(/\{\{\s*Url\s*\}\}/gi, p.url || p.slug || '#');
            return pRendered;
          }).join('\n');
        });

        return colHtml;
      }).join('\n');
    });

    // 4. Loop over {{#each LegalPages}}...{{/each}}
    const legalRegex = /\{\{#each\s+LegalPages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(legalRegex, (_match, innerTemplate) => {
      let pages: any[] = [];
      const legals = ctx.legalPages || opts.editorTokens?.legalPages || opts.previewFooterContent?.legalPages;
      if (legals && Array.isArray(legals) && legals.length > 0) {
        pages = legals.filter((lp: any) =>
          (lp.publish === undefined || lp.publish === true) &&
          (lp.showInFooter === undefined || lp.showInFooter === true)
        );
      } else if (opts.availablePages && Array.isArray(opts.availablePages)) {
        pages = opts.availablePages.filter((p: any) =>
          p.publish !== false &&
          p.showInFooter !== false &&
          p.isLegal === true
        );
      }

      if (pages.length === 0) {
        pages = [
          { title: 'Privacy Policy', url: '/privacy-policy' },
          { title: 'Terms of Service', url: '/terms-and-conditions' },
          { title: 'Cookie Policy', url: '/cookie-policy' }
        ];
      }

      return pages.map((lp: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, lp.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, lp.url || '#');
        return rendered;
      }).join('\n');
    });

    // 5. Loop over {{#each SocialLinks}}...{{/each}}
    const socialRegex = /\{\{#each\s+SocialLinks\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(socialRegex, (_match, innerTemplate) => {
      const socials = [
        { platform: 'LinkedIn', url: 'https://linkedin.com', iconClass: 'fa-brands fa-linkedin-in' },
        { platform: 'Twitter / X', url: 'https://x.com', iconClass: 'fa-brands fa-x-twitter' },
        { platform: 'Facebook', url: 'https://facebook.com', iconClass: 'fa-brands fa-facebook-f' },
        { platform: 'Instagram', url: 'https://instagram.com', iconClass: 'fa-brands fa-instagram' },
        { platform: 'YouTube', url: 'https://youtube.com', iconClass: 'fa-brands fa-youtube' }
      ];

      return socials.map((s: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, s.platform);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, s.url);
        rendered = rendered.replace(/\{\{\s*IconClass\s*\}\}/gi, s.iconClass);
        return rendered;
      }).join('\n');
    });

    // 6. Dynamic Form Embeds: {{ Form "Key" }} or {{ FormEmbed }}
    const formRegex = /\{\{\s*Form\s+"([^"]+)"\s*\}\}|\{\{\s*FormEmbed\s*\}\}/gi;
    output = output.replace(formRegex, (_match: string, formKey?: string) => {
      const key = formKey || 'FormEmbed';
      const isNewsletter = /newsletter|subscribe/i.test(key);

      if (isNewsletter) {
        return `<form class="oz-dynamic-form oz-form-newsletter d-flex gap-2" onsubmit="event.preventDefault();">
          <input type="email" class="form-control form-control-sm rounded-pill px-3" placeholder="Your work email..." required />
          <button type="submit" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold">Join</button>
        </form>`;
      }

      return `<div class="oz-form-embed-preview p-2 border rounded bg-white text-center small text-muted">
        <i class="fa-solid fa-file-lines text-primary me-1"></i> Form: <strong>${key}</strong>
      </div>`;
    });

    // 6b. Articles Loop ({{#each Articles}}...{{/each}})
    const articlesRegex = /\{\{#each\s+Articles\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(articlesRegex, (_match, innerTemplate) => {
      const articles = ctx.articles || opts.previewBlogContent?.articles || [
        {
          title: 'Accelerating Enterprise Scalability with Hybrid Cloud Architecture',
          excerpt: 'Discover how modern organizations integrate resilient cloud patterns, zero-trust security postures, and dynamic automation pipelines.',
          coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
          category: 'Technology',
          authorName: 'Dr. Jennifer Miller',
          authorRole: 'Principal Cloud Strategist',
          publishedDate: 'Sep 14, 2026',
          url: '/blog/enterprise-scalability-hybrid-cloud'
        },
        {
          title: 'Sustainable Commerce: Optimizing Global Supply Chain Logistics',
          excerpt: 'Strategic methodologies for reducing transit footprint while accelerating fulfillment predictability and inventory velocity.',
          coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
          category: 'Operations',
          authorName: 'Marcus Vance',
          authorRole: 'Logistics Director',
          publishedDate: 'Sep 10, 2026',
          url: '/blog/sustainable-commerce-supply-chain'
        },
        {
          title: 'AI-Driven Workflow Orchestration and Customer Personalization',
          excerpt: 'How cognitive machine learning agents streamline intake triage, automate ticket resolution, and elevate user satisfaction benchmarks.',
          coverImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
          category: 'Innovation',
          authorName: 'Elena Rostova',
          authorRole: 'AI Research Lead',
          publishedDate: 'Sep 06, 2026',
          url: '/blog/ai-driven-workflow-orchestration'
        }
      ];

      return articles.map((art: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, art.title || '');
        rendered = rendered.replace(/\{\{\s*(?:Excerpt|Summary|Description)\s*\}\}/gi, art.excerpt || art.summary || '');
        rendered = rendered.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, art.coverImageUrl || art.imageUrl || '');
        rendered = rendered.replace(/\{\{\s*Category\s*\}\}/gi, art.category || 'General');
        rendered = rendered.replace(/\{\{\s*AuthorName\s*\}\}/gi, art.authorName || 'Staff Writer');
        rendered = rendered.replace(/\{\{\s*AuthorRole\s*\}\}/gi, art.authorRole || '');
        rendered = rendered.replace(/\{\{\s*(?:PublishedDate|Date)\s*\}\}/gi, art.publishedDate || 'Recently');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, art.url || '#');
        return rendered;
      }).join('\n');
    });

    const artDetail = ctx.article || opts.previewBlogDetailContent || {};

    // 6c. RecentArticles Loop ({{#each RecentArticles}}...{{/each}})
    const recentArticlesRegex = /\{\{#each\s+RecentArticles\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(recentArticlesRegex, (_match, innerTemplate) => {
      const recents = artDetail.recentArticles || [
        { title: 'Accelerating Enterprise Scalability with Hybrid Cloud Architecture', publishedDate: 'Sep 14, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80', url: '/blog/enterprise-scalability-hybrid-cloud' },
        { title: 'Sustainable Commerce: Optimizing Global Supply Chain Logistics', publishedDate: 'Sep 10, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80', url: '/blog/sustainable-commerce-supply-chain' },
        { title: 'AI-Driven Workflow Orchestration and Customer Personalization', publishedDate: 'Sep 06, 2026', coverImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&auto=format&fit=crop&q=80', url: '/blog/ai-driven-workflow-orchestration' }
      ];
      return recents.map((r: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, r.title || '');
        rendered = rendered.replace(/\{\{\s*(?:PublishedDate|Date)\s*\}\}/gi, r.publishedDate || '');
        rendered = rendered.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, r.coverImageUrl || r.imageUrl || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, r.url || '#');
        return rendered;
      }).join('\n');
    });

    // 6d. BlogCategories Loop ({{#each BlogCategories}}...{{/each}})
    const blogCatsRegex = /\{\{#each\s+BlogCategories\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(blogCatsRegex, (_match, innerTemplate) => {
      const cats = artDetail.categories || [
        { name: 'Technology & Cloud', postCount: 14, url: '/blog?category=technology' },
        { name: 'Enterprise Strategy', postCount: 9, url: '/blog?category=strategy' },
        { name: 'Operations & Logistics', postCount: 7, url: '/blog?category=operations' },
        { name: 'AI & Automation', postCount: 12, url: '/blog?category=ai' },
        { name: 'Security & Governance', postCount: 5, url: '/blog?category=security' }
      ];
      return cats.map((c: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:Name|Title|CategoryTitle)\s*\}\}/gi, c.name || '');
        rendered = rendered.replace(/\{\{\s*PostCount\s*\}\}/gi, String(c.postCount || 0));
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, c.url || '#');
        return rendered;
      }).join('\n');
    });

    // 6e. Article.Tags or ArticleTags Loop
    const tagsRegex = /\{\{#each\s+(?:Article\.Tags|ArticleTags)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(tagsRegex, (_match, innerTemplate) => {
      const rawTags = artDetail.tags || (artDetail.tagsInput ? artDetail.tagsInput.split(',').map((s: string) => s.trim()).filter(Boolean) : null) || ['Cloud Architecture', 'Enterprise Security', 'Scalability', 'Automation'];
      return rawTags.map((t: string) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*this\s*\}\}/gi, t);
        rendered = rendered.replace(/\{\{\s*(?:Name|Tag|Title)\s*\}\}/gi, t);
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, `/blog?tag=${encodeURIComponent(t.toLowerCase())}`);
        return rendered;
      }).join('\n');
    });

    // 6f. Article Detail Scalars ({{ Article.Title }}, {{ Article.Body }}, etc.)
    const artTitle = artDetail.title || 'Accelerating Enterprise Scalability with Hybrid Cloud Architecture';
    const artCategory = artDetail.category || 'Technology & Cloud';
    const artDate = artDetail.publishedDate || 'September 14, 2026';
    const artReadTime = artDetail.readTime || '5 min read';
    const artAuthorName = artDetail.authorName || 'Dr. Jennifer Miller';
    const artAuthorRole = artDetail.authorRole || 'Principal Cloud Strategist & Enterprise Systems Architect';
    const artAuthorBio = artDetail.authorBio || 'Principal Cloud Strategist and Enterprise Systems Architect with over 15 years leading high-availability transformations.';
    const artAuthorAvatar = artDetail.authorAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
    const artCover = artDetail.coverImageUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80';
    const artSummary = artDetail.summary || artDetail.excerpt || 'A comprehensive strategic roadmap for architecting resilient hybrid cloud environments capable of petabyte-scale throughput.';
    const artBody = artDetail.body || `
      <p class="lead">In an era of relentless digital expansion, organizations are increasingly challenged to balance agility, resilience, and operational security.</p>
      <p>Legacy architectures, once the bedrock of institutional workflows, now struggle to sustain the real-time processing demands of globally distributed systems. By transitioning toward unified hybrid cloud infrastructures, forward-thinking enterprises establish a modular foundation capable of horizontal scaling while preserving strict governance over proprietary data assets.</p>
      <h4>Strategic Architectural Foundations</h4>
      <p>A resilient multi-region deployment demands three non-negotiable pillars: programmatic infrastructure as code, continuous behavioral telemetries, and automated self-healing orchestration clusters.</p>
    `;

    output = output.replace(/\{\{\s*Article\.Title\s*\}\}/gi, artTitle);
    output = output.replace(/\{\{\s*Article\.Category\s*\}\}/gi, artCategory);
    output = output.replace(/\{\{\s*Article\.PublishedDate\s*\}\}/gi, artDate);
    output = output.replace(/\{\{\s*Article\.ReadTime\s*\}\}/gi, artReadTime);
    output = output.replace(/\{\{\s*Article\.AuthorName\s*\}\}/gi, artAuthorName);
    output = output.replace(/\{\{\s*Article\.AuthorRole\s*\}\}/gi, artAuthorRole);
    output = output.replace(/\{\{\s*Article\.AuthorBio\s*\}\}/gi, artAuthorBio);
    output = output.replace(/\{\{\s*Article\.AuthorAvatarUrl\s*\}\}/gi, artAuthorAvatar);
    output = output.replace(/\{\{\s*Article\.CoverImageUrl\s*\}\}/gi, artCover);
    output = output.replace(/\{\{\s*(?:Article\.Summary|Article\.Excerpt)\s*\}\}/gi, artSummary);
    output = output.replace(/\{\{\s*Article\.Url\s*\}\}/gi, artDetail.url || '/blog');
    output = output.replace(/\{\{\s*Article\.Body\s*\}\}/gi, artBody);

    // 6g. Handlebars {{#if Property}}...{{/if}} and {{#unless Property}}...{{/unless}} Conditionals
    const ifRegex = /\{\{#if\s+([\w\.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/gi;
    output = output.replace(ifRegex, (_match, prop, ifBody, elseBody) => {
      const p = prop.trim();
      const key = Object.keys(ctx).find(k => k.toLowerCase() === p.toLowerCase());
      const val = key ? ctx[key] : undefined;
      const isTruthy = (val !== null && val !== undefined && val !== false && val !== '' && (typeof val !== 'string' || val.trim().length > 0));
      return isTruthy ? ifBody : (elseBody || '');
    });

    const unlessRegex = /\{\{#unless\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/gi;
    output = output.replace(unlessRegex, (_match, prop, body) => {
      const p = prop.trim();
      const key = Object.keys(ctx).find(k => k.toLowerCase() === p.toLowerCase());
      const val = key ? ctx[key] : undefined;
      const isFalsy = (val === null || val === undefined || val === false || val === '' || (typeof val === 'string' && val.trim().length === 0));
      return isFalsy ? body : '';
    });

    // 7. Scalar placeholders & Slider model tokens (leave unused fields blank)
    output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || opts.previewBlogContent?.title || '');
    output = output.replace(/\{\{\s*MiniTitle\s*\}\}/gi, ctx.miniTitle || opts.previewBlogContent?.miniTitle || '');
    output = output.replace(/\{\{\s*Text\s*\}\}/gi, ctx.text || ctx.description || opts.previewBlogContent?.description || '');
    output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || ctx.text || opts.previewBlogContent?.description || '');
    output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || ctx.viewAllButtonText || opts.previewBlogContent?.buttonText || opts.previewBlogContent?.viewAllButtonText || '');
    output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || ctx.viewAllButtonLink || opts.previewBlogContent?.buttonLink || opts.previewBlogContent?.viewAllButtonLink || '#');
    output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || ctx.url || '');
    output = output.replace(/\{\{\s*SecondUrl\s*\}\}/gi, ctx.secondUrl || '');
    output = output.replace(/\{\{\s*YoutubeVideo\s*\}\}/gi, ctx.youtubeVideo || ctx.videoUrl || '');
    output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
    output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
    output = output.replace(/\{\{\s*VideoButtonText\s*\}\}/gi, ctx.videoButtonText || ctx.secondaryButtonText || '');
    output = output.replace(/\{\{\s*VideoLink\s*\}\}/gi, ctx.videoLink || ctx.secondaryButtonLink || '');
    output = output.replace(/\{\{\s*SecondaryButtonText\s*\}\}/gi, ctx.secondaryButtonText || ctx.videoButtonText || '');
    output = output.replace(/\{\{\s*SecondaryButtonLink\s*\}\}/gi, ctx.secondaryButtonLink || ctx.videoLink || '');
    output = output.replace(/\{\{\s*Subtitle\s*\}\}/gi, ctx.subtitle || ctx.text || ctx.description || '');
    output = output.replace(/\{\{\s*BackgroundImageUrl\s*\}\}/gi, ctx.url || ctx.imageUrl || '');
    output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.youtubeVideo || ctx.videoUrl || '');
    output = output.replace(/\{\{\s*(?:BadgeText|Badge|PillText)\s*\}\}/gi, ctx.miniTitle || ctx.badgeText || '');
    output = output.replace(/\{\{\s*IconText\s*\}\}/gi, ctx.iconText || '');
    output = output.replace(/\{\{\s*Icon\s*\}\}/gi, ctx.icon || '');
    const faviconUrl = ctx.FaviconUrl || ctx.faviconUrl || '/favicon.ico';
    output = output.replace(/\{\{\s*FaviconUrl\s*\}\}/gi, faviconUrl);

    // Legal URLs
    output = output.replace(/\{\{\s*PrivacyUrl\s*\}\}/gi, '/privacy-policy');
    output = output.replace(/\{\{\s*TermsUrl\s*\}\}/gi, '/terms-and-conditions');
    output = output.replace(/\{\{\s*CookiesUrl\s*\}\}/gi, '/cookie-policy');

    // Corporate Identity Fields (Logo-First with Business Name fallback)
    const brandName = ctx.BrandName || ctx.brandName || opts.currentTenantBrandName || opts.editorTokens?.brand?.name || 'Organization Portal';
    const logoUrl = ctx.LogoUrl || ctx.logoUrl || opts.editorTokens?.brand?.logoUrl || '';
    const brandIdentityHtml = (logoUrl && logoUrl.trim().length > 0)
      ? `<img src="${logoUrl}" alt="${brandName}" class="navbar-brand-logo" style="max-height: 40px; width: auto; object-fit: contain;" />`
      : `<span class="fw-bolder text-dark fs-4 tracking-tight">${brandName}</span>`;

    output = output.replace(/\{\{\s*(?:BrandIdentity|BrandLogoOrName)\s*\}\}/gi, brandIdentityHtml);
    output = output.replace(/\{\{\s*LogoUrl\s*\}\}/gi, logoUrl);
    const currentYear = ctx.Year || new Date().getFullYear().toString();
    output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, brandName);
    output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
    output = output.replace(/\{\{\s*Email\s*\}\}/gi, ctx.email || 'contact@organization.com');
    output = output.replace(/\{\{\s*Phone\s*\}\}/gi, ctx.phone || '+1 (555) 019-2834');
    output = output.replace(/\{\{\s*Address\s*\}\}/gi, ctx.address || 'Administrative Headquarters');
    output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `&copy; ${currentYear} ${brandName}. All rights reserved.`);
    output = output.replace(/\{\{\s*PoweredBy\s*\}\}/gi, ctx.poweredBy || 'Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" style="color: #0050e5 !important; font-weight: 700; text-decoration: none;">Ozikol</a>');

    // Clean up any remaining unhandled {{#each ...}} loops and leftover {{ Token }} placeholders to prevent visual leakage
    output = output.replace(/\{\{#each[\s\S]*?\{\{\/each\}\}/gi, '');
    output = output.replace(/\{\{[#\/]?[\w\s\.\,\-\_]+\}\}/g, '');

    return output;
  }

  /**
   * Enforces the official 'Powered by Ozikol.' credit link in all footers.
   * If a powered-by credit is present, normalizes its destination to https://ozikol.cloud.
   * If the footer has no room or omitted it, injects an adaptive non-intrusive bottom strip.
   * 
   * @param html The footer HTML string to check and augment.
   * @returns HTML string guaranteed to contain valid Ozikol attribution.
   */
  enforceOzikolCredit(html: string): string {
    if (!html) return '';
    const standardCredit = `Powered by <a href="https://ozikol.cloud" target="_blank" rel="noopener noreferrer" class="text-primary fw-bold text-decoration-none" style="color: #0050e5 !important; font-weight: 700; text-decoration: none;">Ozikol</a>.`;

    // 1. If an existing "Powered by..." line exists in any form, replace the credit container
    if (/powered\s+by/i.test(html)) {
      return html.replace(/powered\s+by\s+(?:<a[^>]*>)?(?:[^<]+(?:<\/a>)?)?(\.|\s*)?/gi, `${standardCredit} `);
    }

    // 2. If the footer has a bottom row with justify-content-between, inject credit inside it on the right
    if (/justify-content-between/i.test(html)) {
      const match = html.match(/(<div[^>]*class=["'][^"']*justify-content-between[^"']*["'][^>]*>[\s\S]*?<div>[^<]*&copy;[\s\S]*?<\/div>)([\s\S]*?<\/div>)/i);
      if (match) {
        return html.replace(/(<div[^>]*class=["'][^"']*justify-content-between[^"']*["'][^>]*>[\s\S]*?<div>[^<]*&copy;[\s\S]*?<\/div>)([\s\S]*?<\/div>)/i, `$1\n      <div>${standardCredit}</div>$2`);
      }
    }

    // 3. If no powered-by line exists at all, inject an adaptive bottom strip right before </footer> or at the end
    const strip = `\n<div class="ozikol-enforced-credit-bar" style="border-top: 1px solid rgba(150,150,150,0.15); padding: 14px 20px; text-align: center; font-size: 11.5px; opacity: 0.85; letter-spacing: 0.02em;">${standardCredit}</div>\n`;

    if (/<\/footer>/i.test(html)) {
      return html.replace(/<\/footer>/i, `${strip}</footer>`);
    }
    return html + strip;
  }
}
