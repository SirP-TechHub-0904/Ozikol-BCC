import { Injectable } from '@angular/core';
import { hydrateIconTokens } from './hydrators/hydration-core.utils';

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
   * Supports both exact string block names and RegExp patterns.
   * @param template The raw HTML template string.
   * @param blockPattern The target block name or RegExp pattern (e.g. 'MenuDropdowns' or /NavItems(?:=["']first["'])?/).
   * @param replacer Callback receiving the true balanced inner template string.
   * @returns The transformed HTML string.
   */
  replaceBalancedBlock(template: string, blockPattern: string | RegExp, replacer: (inner: string) => string): string {
    if (!template) return '';
    let openPattern: RegExp;
    if (typeof blockPattern === 'string') {
      openPattern = new RegExp(`\\{\\{#each\\s+${blockPattern}\\s*\\}\\}`, 'i');
    } else {
      const src = blockPattern.source;
      if (src.startsWith('\\{\\{#each') || src.startsWith('{{#each')) {
        openPattern = blockPattern;
      } else {
        openPattern = new RegExp(`\\{\\{#each\\s+(?:${src})\\s*\\}\\}`, 'i');
      }
    }
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
   * Helper to evaluate Handlebars truthiness for a given property value.
   * Accurately treats empty arrays ([]), empty strings, "false", null, undefined,
   * and 0 as falsy.
   * 
   * @param val The value to test for truthiness.
   * @returns true if truthy according to Handlebars standards.
   */
  evaluateCondition(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'boolean') return val;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'number') return val > 0;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length === 0) return false;
      if (trimmed.toLowerCase() === 'false' || trimmed === '0') return false;
      return true;
    }
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return Boolean(val);
  }

  /**
   * Hydrates a navigation items block containing mixed direct pages and category dropdowns.
   * Defensively evaluates all condition branches ({{#if IsDropdown}}...{{else}}...{{/if}}),
   * nested {{#if Pages}} / {{#each Pages}} child loops, {{ CustomClass }}, and positional boundaries.
   * If the items array is empty, safely returns an empty string without leaking raw tokens.
   * 
   * @param items The list of navigation items (direct pages and/or dropdowns).
   * @param innerTemplate The Handlebars template inside the loop.
   * @returns Hydrated HTML string.
   */
  private hydrateNavItemsBlock(items: any[], innerTemplate: string): string {
    if (!Array.isArray(items) || items.length === 0 || !innerTemplate) {
      return '';
    }

    return items.map((item: any, idx: number) => {
      let rendered = innerTemplate;
      const isFirst = idx === 0;
      const isLast = idx === items.length - 1;
      const isMiddle = !isFirst && !isLast;
      const childPages = Array.isArray(item.pages) ? item.pages : (Array.isArray(item.Pages) ? item.Pages : []);
      const hasPages = childPages.length > 0;
      const isDropdown = Boolean(item.isDropdown || item.IsDropdown || item.hasChildren || item.HasChildren || hasPages);
      const isDroppable = Boolean(isDropdown || hasPages);

      // 1. First resolve inner child loops and inner {{#if Pages}} / {{#unless Pages}}
      if (hasPages) {
        const pagesRegex = /\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi;
        rendered = rendered.replace(pagesRegex, (_pMatch, pageTemplate) => {
          return childPages.map((cp: any, cIdx: number) => {
            let cpRendered = pageTemplate;
            const cFirst = cIdx === 0;
            const cLast = cIdx === childPages.length - 1;

            cpRendered = cpRendered.replace(/\{\{#if\s+@first\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => cFirst ? c : '');
            cpRendered = cpRendered.replace(/\{\{#if\s+@last\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => cLast ? c : '');
            cpRendered = cpRendered.replace(/\{\{\s*(?:PageTitle|Title|Name)\s*\}\}/gi, cp.title || cp.pageTitle || cp.name || '');
            const targetUrl = cp.url || cp.pageUrl || (cp.directUrl ? `/${cp.directUrl.replace(/^\/+/, '')}` : '') || (cp.slug ? `/${cp.slug.replace(/^\/+/, '')}` : '#');
            cpRendered = cpRendered.replace(/\{\{\s*(?:PageUrl|Url|DirectUrl|Link)\s*\}\}/gi, targetUrl);
            cpRendered = cpRendered.replace(/\{\{\s*(?:PageImage|ImageUrl|Image)\s*\}\}/gi, cp.pageImage || cp.imageUrl || '');
            cpRendered = cpRendered.replace(/\{\{\s*(?:PageDescription|Description)\s*\}\}/gi, cp.pageDescription || cp.description || '');
            cpRendered = cpRendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, cp.customClass || '');
            return cpRendered;
          }).join('\n');
        });

        // Resolve {{#if Pages}} blocks
        rendered = rendered.replace(/\{\{#if\s+(?:Pages|pages)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, ifBlock) => ifBlock);
        rendered = rendered.replace(/\{\{#if\s+(?:Pages|pages)\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, ifBlock) => ifBlock);
        rendered = rendered.replace(/\{\{#unless\s+(?:Pages|pages)\}\}([\s\S]*?)\{\{\/unless\}\}/gi, '');
      } else {
        // Clean out any leftover child pages loops and if-Pages blocks
        rendered = rendered.replace(/\{\{#each\s+Pages\}\}[\s\S]*?\{\{\/each\}\}/gi, '');
        rendered = rendered.replace(/\{\{#if\s+(?:Pages|pages)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, _ifBlock, elseBlock) => elseBlock);
        rendered = rendered.replace(/\{\{#if\s+(?:Pages|pages)\}\}([\s\S]*?)\{\{\/if\}\}/gi, '');
        rendered = rendered.replace(/\{\{#unless\s+(?:Pages|pages)\}\}([\s\S]*?)\{\{\/unless\}\}/gi, (_m, unlessBlock) => unlessBlock);
      }

      // 2. Resolve outer IsDropdown / HasChildren branching (now safely free of inner {{/if}} tags)
      rendered = rendered.replace(/\{\{#if\s+(?:IsDropdown|isDropdown|HasChildren|hasChildren)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, ifBlock, elseBlock) => {
        return isDroppable ? ifBlock : elseBlock;
      });

      rendered = rendered.replace(/\{\{#if\s+(?:IsDropdown|isDropdown|HasChildren|hasChildren)\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, ifBlock) => {
        return isDroppable ? ifBlock : '';
      });

      rendered = rendered.replace(/\{\{#unless\s+(?:IsDropdown|isDropdown|HasChildren|hasChildren)\}\}([\s\S]*?)\{\{\/unless\}\}/gi, (_m, unlessBlock) => {
        return !isDroppable ? unlessBlock : '';
      });

      // 2b. Resolve cascading children sub-categories
      const childrenList = Array.isArray(item.children) ? item.children : (Array.isArray(item.Children) ? item.Children : []);
      if (childrenList.length > 0) {
        rendered = rendered.replace(/\{\{#each\s+(?:Children|children)\}\}([\s\S]*?)\{\{\/each\}\}/gi, (_cMatch, childTemplate) => {
          return childrenList.map((ch: any) => {
            let chRendered = childTemplate;
            chRendered = chRendered.replace(/\{\{\s*Title\s*\}\}/gi, ch.title || '');
            const chUrl = ch.url || (ch.directUrl ? `/${ch.directUrl.replace(/^\/+/, '')}` : '#');
            chRendered = chRendered.replace(/\{\{\s*(?:Url|DirectUrl)\s*\}\}/gi, chUrl);
            const subPages = Array.isArray(ch.pages) ? ch.pages : [];
            chRendered = chRendered.replace(/\{\{#each\s+Pages\}\}([\s\S]*?)\{\{\/each\}\}/gi, (_pM: string, pT: string) => {
              return subPages.map((sp: any) => {
                let spR = pT;
                spR = spR.replace(/\{\{\s*(?:PageTitle|Title)\s*\}\}/gi, sp.title || sp.pageTitle || '');
                const spUrl = sp.url || sp.pageUrl || (sp.directUrl ? `/${sp.directUrl.replace(/^\/+/, '')}` : '#');
                spR = spR.replace(/\{\{\s*(?:PageUrl|Url|DirectUrl)\s*\}\}/gi, spUrl);
                return spR;
              }).join('\n');
            });
            return chRendered;
          }).join('\n');
        });
      }

      // 3. Positional conditionals on outer item
      rendered = rendered.replace(/\{\{#if\s+@first\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => isFirst ? c : '');
      rendered = rendered.replace(/\{\{#unless\s+@first\}\}([\s\S]*?)\{\{\/unless\}\}/gi, (_m: string, c: string) => !isFirst ? c : '');
      rendered = rendered.replace(/\{\{#if\s+@middle\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => isMiddle ? c : '');
      rendered = rendered.replace(/\{\{#if\s+@last\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => isLast ? c : '');
      rendered = rendered.replace(/\{\{#unless\s+@last\}\}([\s\S]*?)\{\{\/unless\}\}/gi, (_m: string, c: string) => !isLast ? c : '');

      // 4. CustomClass conditional checks on item
      const hasCustom = Boolean(item.customClass && item.customClass.trim().length > 0);
      rendered = rendered.replace(/\{\{#if\s+CustomClass\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, ifB: string, elseB: string) => hasCustom ? ifB : elseB);
      rendered = rendered.replace(/\{\{#if\s+CustomClass\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, ifB: string) => hasCustom ? ifB : '');

      // 5. Item-level scalar tokens
      rendered = rendered.replace(/\{\{\s*(?:CategoryName|Title|Name)\s*\}\}/gi, item.title || item.name || item.categoryName || '');
      const itemUrl = item.url || (item.directUrl ? `/${item.directUrl.replace(/^\/+/, '')}` : '') || (item.slug ? `/${item.slug.replace(/^\/+/, '')}` : '#');
      rendered = rendered.replace(/\{\{\s*(?:DirectUrl|Url|Link)\s*\}\}/gi, itemUrl);
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
      rendered = rendered.replace(/\{\{\s*Index\s*\}\}/gi, (idx + 1).toString());

      return rendered;
    }).join('\n');
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

    // 0a. Primary Navigation / PageCategories Loops with balanced block replacement:
    output = this.replaceBalancedBlock(output, /PageCategories|NavigationMenu/i, (innerTemplate) => {
      const catItems = ctx.PageCategories || ctx.pageCategories || ctx.NavigationMenu || ctx.navigationMenu || ctx.navItems || ctx.categories || opts.previewMenuContent?.pageCategories || [
        { title: 'Home', url: '/', directUrl: '/', isDropdown: false, hasChildren: false, customClass: '', pages: [] },
        { 
          title: 'Services', 
          isDropdown: true,
          hasChildren: true, 
          customClass: '',
          pages: [
            { title: 'Strategic Advisory', url: '/services/advisory', customClass: '' },
            { title: 'Cloud Modernization', url: '/services/cloud', customClass: '' }
          ]
        },
        { title: 'Contact Us', url: '/contact', directUrl: '/contact', isDropdown: false, hasChildren: false, customClass: '', pages: [] }
      ];
      return this.hydrateNavItemsBlock(catItems, innerTemplate);
    });

    // 0a-2. Multi-Zone NavItems Loops with balanced block replacement:
    // Zone 1: {{#each NavItems="first"}} (or NavItems="1" / NavItems 'first')
    output = this.replaceBalancedBlock(output, /NavItems\s*=\s*["'](?:first|1)["']|NavItems\s+["'](?:first|1)["']/i, (innerTemplate) => {
      const firstItems = ctx.navItemsFirst || ctx.navItems_first || (opts.previewMenuContent?.navItemsFirst) || [
        { title: 'About Us', url: '/about', isDropdown: false, customClass: '' },
        { 
          title: 'Services', 
          isDropdown: true, 
          customClass: '',
          pages: [
            { title: 'Strategic Advisory', url: '/services/advisory', customClass: '' },
            { title: 'Cloud Modernization', url: '/services/cloud', customClass: '' }
          ]
        }
      ];
      return this.hydrateNavItemsBlock(firstItems, innerTemplate);
    });

    // Zone 2: {{#each NavItems="middle"}} (or NavItems="second" / NavItems="2")
    output = this.replaceBalancedBlock(output, /NavItems\s*=\s*["'](?:middle|second|center|2)["']|NavItems\s+["'](?:middle|second|center|2)["']/i, (innerTemplate) => {
      const middleItems = ctx.navItemsMiddle || ctx.navItems_middle || (opts.previewMenuContent?.navItemsMiddle) || [
        { title: 'Leadership Team', url: '/team', isDropdown: false, customClass: '' },
        { 
          title: 'Products', 
          isDropdown: true, 
          customClass: '',
          pages: [
            { title: 'Enterprise Core', url: '/products/core', customClass: '' },
            { title: 'Security Shield', url: '/products/security', customClass: '' }
          ]
        }
      ];
      return this.hydrateNavItemsBlock(middleItems, innerTemplate);
    });

    // Zone 3: {{#each NavItems="last"}} (or NavItems="third" / NavItems="3")
    output = this.replaceBalancedBlock(output, /NavItems\s*=\s*["'](?:last|third|right|3)["']|NavItems\s+["'](?:last|third|right|3)["']/i, (innerTemplate) => {
      const lastItems = ctx.navItemsLast || ctx.navItems_last || (opts.previewMenuContent?.navItemsLast) || [
        { title: 'Careers', url: '/careers', isDropdown: false, customClass: '' },
        { 
          title: 'Insights', 
          isDropdown: true, 
          customClass: '',
          pages: [
            { title: 'Industry Reports', url: '/insights/reports', customClass: '' },
            { title: 'Case Studies', url: '/insights/case-studies', customClass: '' }
          ]
        },
        { title: 'Contact Us', url: '/contact', isDropdown: false, customClass: '' }
      ];
      return this.hydrateNavItemsBlock(lastItems, innerTemplate);
    });

    // Full Sequential: {{#each NavItems}} (no argument)
    output = this.replaceBalancedBlock(output, 'NavItems', (innerTemplate) => {
      const allItems = ctx.navItems || opts.previewMenuContent?.navItems || [
        { title: 'Home', url: '/', isDropdown: false, customClass: '' },
        { title: 'About Us', url: '/about', isDropdown: false, customClass: '' },
        { 
          title: 'Services', 
          isDropdown: true, 
          customClass: '',
          pages: [
            { title: 'Strategic Advisory', url: '/services/advisory', customClass: '' },
            { title: 'Cloud Modernization', url: '/services/cloud', customClass: '' }
          ]
        },
        { title: 'Contact Us', url: '/contact', isDropdown: false, customClass: '' }
      ];
      return this.hydrateNavItemsBlock(allItems, innerTemplate);
    });

    // 0b. TopBar Utility Links: {{#each MainMenuItems="top"}} or {{#each TopBarPages}}
    const topBarRegex = /\{\{#each\s+(?:MainMenuItems\s*=\s*["']top["']|MainMenuItems\s+["']top["']|TopBarPages)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(topBarRegex, (_match, innerTemplate) => {
      const topItems = ctx.topBarPages || ctx.mainMenuItemsTop || opts.previewMenuContent?.topBarPages || [
        { title: 'Careers', url: '/careers', customClass: '' },
        { title: 'Help & Support', url: '/support', customClass: '' }
      ];
      if (!Array.isArray(topItems) || topItems.length === 0) return '';
      return topItems.map((item: any, idx: number) => {
        let rendered = innerTemplate;
        const isFirst = idx === 0;
        const isLast = idx === topItems.length - 1;

        rendered = rendered.replace(/\{\{#if\s+@first\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => isFirst ? c : '');
        rendered = rendered.replace(/\{\{#if\s+@last\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, c: string) => isLast ? c : '');
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
        const targetUrl = item.url || (item.directUrl ? `/${item.directUrl.replace(/^\/+/, '')}` : '') || (item.slug ? `/${item.slug.replace(/^\/+/, '')}` : '#');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, targetUrl);
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
        return rendered;
      }).join('\n');
    });

    // 0c. Loop over {{#each MainMenuItems}}...{{/each}} (Legacy Support)
    const mainMenuItemsRegex = /\{\{#each\s+MainMenuItems\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(mainMenuItemsRegex, (_match, innerTemplate) => {
      const items = ctx.topMenuItems || opts.previewMenuContent?.topMenuItems || [
        { title: 'Home', url: '/', customClass: '' },
        { title: 'Blog', url: '/blog', customClass: '' },
        { title: 'Contact', url: '/contact', customClass: '' }
      ];
      return items.map((item: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, item.url || item.slug || '#');
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
        return rendered;
      }).join('\n');
    });

    // 0d. Loop over {{#each MenuCtaButtons}}...{{/each}}
    const menuCtaRegex = /\{\{#each\s+MenuCtaButtons\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(menuCtaRegex, (_match, innerTemplate) => {
      const ctas = ctx.menuCtaButtons || opts.previewMenuContent?.menuCtaButtons || (opts.editorTokens?.menuCtaButtons?.length ? opts.editorTokens.menuCtaButtons : [
        { title: 'Request a Service', url: '/request-service', customClass: '' }
      ]);
      if (!Array.isArray(ctas) || ctas.length === 0) return '';
      return ctas.map((cta: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:ButtonText|Title)\s*\}\}/gi, cta.title || '');
        rendered = rendered.replace(/\{\{\s*(?:ButtonLink|Url)\s*\}\}/gi, cta.url || '#');
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, cta.customClass || '');
        return rendered;
      }).join('\n');
    });

    // 0e. Loop over {{#each MenuDropdowns}}...{{/each}} (Legacy Support)
    output = this.replaceBalancedBlock(output, 'MenuDropdowns', (outerTemplate) => {
      const dropdowns = ctx.dropdowns || opts.previewMenuContent?.dropdowns || (opts.editorTokens?.menuDropdowns?.length ? opts.editorTokens.menuDropdowns : [
        {
          title: 'Services',
          pages: [
            { title: 'Strategic Consulting', url: '/strategic-advisory', customClass: '' },
            { title: 'Systems Modernization', url: '/systems-modernization', customClass: '' },
            { title: 'Performance & Scale', url: '/performance-scale', customClass: '' },
            { title: 'Enterprise Advisory', url: '/enterprise-governance', customClass: '' }
          ]
        },
        {
          title: 'Company',
          pages: [
            { title: 'About Us', url: '/about', customClass: '' },
            { title: 'Our History', url: '/history', customClass: '' },
            { title: 'Leadership Team', url: '/team', customClass: '' }
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
            renderedPage = renderedPage.replace(/\{\{\s*CustomClass\s*\}\}/gi, page.customClass || '');
            return renderedPage;
          }).join('\n');
        });

        // THEN resolve parent dropdown tokens on outer element
        renderedDd = renderedDd.replace(/\{\{\s*CategoryName\s*\}\}/gi, dd.title || dd.categoryName || `Menu ${ddIdx + 1}`);
        renderedDd = renderedDd.replace(/\{\{\s*Title\s*\}\}/gi, dd.title || dd.categoryName || `Menu ${ddIdx + 1}`);
        renderedDd = renderedDd.replace(/\{\{\s*CustomClass\s*\}\}/gi, dd.customClass || '');
        renderedDd = renderedDd.replace(/\{\{\s*Index\s*\}\}/gi, (ddIdx + 1).toString());

        return renderedDd;
      }).join('\n');
    });

    // 1. Loop over {{#each PageSectionLists}}...{{/each}} (also accepts Items or SectionLists)
    const eachRegex = /\{\{#each\s+(?:PageSectionLists|Items|SectionLists)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(eachRegex, (_match, innerTemplate) => {
      const items = ctx.pageSectionLists || ctx.items || ctx.sectionLists || [];
      if (!Array.isArray(items) || items.length === 0) {
        return '';
      }
      return items.map((item: any, idx: number) => {
        let renderedItem = innerTemplate;
        const icon = (item.iconText && item.iconText.trim().length > 0)
          ? item.iconText.trim()
          : ((item.icon && item.icon.trim().length > 0) ? item.icon.trim() : '');

        // Resolve inner Handlebars conditionals
        const isFirst = idx === 0;
        const isLast = idx === items.length - 1;

        renderedItem = renderedItem.replace(/\{\{#if\s+@first\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => isFirst ? content : '');
        renderedItem = renderedItem.replace(/\{\{#unless\s+@first\}\}([\s\S]*?)\{\{\/unless\}\}/gi, (_m: string, content: string) => !isFirst ? content : '');
        renderedItem = renderedItem.replace(/\{\{#if\s+@last\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => isLast ? content : '');
        renderedItem = renderedItem.replace(/\{\{#if\s+IconText\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (icon ? content : ''));
        renderedItem = renderedItem.replace(/\{\{#if\s+ImageUrl\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (item.imageUrl ? content : ''));
        renderedItem = renderedItem.replace(/\{\{#if\s+MiniTitle\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (item.miniTitle ? content : ''));
        renderedItem = renderedItem.replace(/\{\{#if\s+ButtonText\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (item.buttonText ? content : ''));
        const iDesc = item.description || item.moreDescription || item.fullDescription || '';
        const iFullDesc = item.fullDescription || item.moreDescription || item.description || '';

        renderedItem = renderedItem.replace(/\{\{#if\s+(?:PageSectionList\.)?MoreDescription\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (iFullDesc ? content : ''));
        renderedItem = renderedItem.replace(/\{\{#if\s+(?:PageSectionList\.)?FullDescription\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (iFullDesc ? content : ''));
        renderedItem = renderedItem.replace(/\{\{#if\s+(?:PageSectionList\.)?Description\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m: string, content: string) => (iDesc ? content : ''));

        // Replace item-level tokens
        if (icon) {
          renderedItem = hydrateIconTokens(renderedItem, '(?:PageSectionList\\.)?(?:IconText|Icon)', icon, item.title || 'Item Icon');
        }
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?Title\s*\}\}/gi, item.title || `Item ${idx + 1}`);
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?MiniTitle\s*\}\}/gi, item.miniTitle || '');
        renderedItem = renderedItem.replace(/\{\{\{?\s*(?:PageSectionList\.)?Description\s*\}?\}\}/gi, iDesc);
        renderedItem = renderedItem.replace(/\{\{\{?\s*(?:PageSectionList\.)?(?:MoreDescription|FullDescription)\s*\}?\}\}/gi, iFullDesc);
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?ImageUrl\s*\}\}/gi, item.imageUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?VideoUrl\s*\}\}/gi, item.videoUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?ButtonText\s*\}\}/gi, item.buttonText || '');
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?ButtonLink\s*\}\}/gi, item.buttonLink || '#');
        renderedItem = renderedItem.replace(/\{\{\s*(?:PageSectionList\.)?DirectUrl\s*\}\}/gi, item.directUrl || '');
        renderedItem = renderedItem.replace(/\{\{\s*SortOrder\s*\}\}/gi, (item.sortOrder !== undefined ? item.sortOrder : idx + 1).toString());
        renderedItem = renderedItem.replace(/\{\{\s*Index\s*\}\}/gi, (idx + 1).toString());

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
        pages = opts.availablePages.filter((p: any) => {
          if (p.publish === false || p.showInFooter === false) return false;
          const catStr = typeof p.pageCategory === 'string'
            ? p.pageCategory
            : (p.pageCategory?.categoryName || p.pageCategory?.name || p.categoryName || '');
          return Boolean(catStr && catStr.toLowerCase().trim() === normalized);
        });
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
        const targetUrl = p.url || (p.directUrl ? `/${p.directUrl}` : '') || (p.slug ? `/${p.slug}` : '#');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, targetUrl);
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
          if (!isPublished || !isFooter || !p.tags || typeof p.tags !== 'string') return false;

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

    // 4. Loop over {{#each FooterBottomPages}}...{{/each}} or {{#each LegalPages}}...{{/each}}
    const legalRegex = /\{\{#each\s+(?:FooterBottomPages|LegalPages)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(legalRegex, (_match, innerTemplate) => {
      let pages: any[] = [];
      const bottomPages = (ctx as any).footerBottomPages || ctx.legalPages || opts.editorTokens?.footerBottomPages || opts.editorTokens?.legalPages || opts.previewFooterContent?.footerBottomPages || opts.previewFooterContent?.legalPages;
      if (bottomPages && Array.isArray(bottomPages) && bottomPages.length > 0) {
        pages = bottomPages.filter((lp: any) =>
          (lp.publish === undefined || lp.publish === true)
        );
      } else if (opts.availablePages && Array.isArray(opts.availablePages)) {
        pages = opts.availablePages.filter((p: any) =>
          p.publish !== false &&
          (p.showInFooterBottom === true || p.isLegal === true)
        );
      }

      if (pages.length === 0) {
        pages = [
          { title: 'Privacy Policy', url: '/privacy-policy' },
          { title: 'Terms of Service', url: '/terms-and-conditions' },
          { title: 'Cookie Policy', url: '/cookie-policy' },
          { title: 'Sign In', url: '/auth/login' }
        ];
      }

      return pages.map((lp: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, lp.title || '');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, lp.url || '#');
        rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, lp.customClass || '');
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

    // 6e-2. Social Share Links Loop & Dynamic Placeholder ({{ PostShareStrip }}, {{#each SocialShareLinks}}...{{/each}})
    const currentUrl = artDetail.url || '/blog';
    const encodedUrl = encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}${currentUrl}` : `https://ozikol.com${currentUrl}`);
    const encodedTitle = encodeURIComponent(artDetail.title || 'Insight Post');

    const platforms = artDetail.socialShareLinks || [
      { platform: 'Facebook', shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, iconClass: 'fa-brands fa-facebook-f' },
      { platform: 'X (Twitter)', shareUrl: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, iconClass: 'fa-brands fa-x-twitter' },
      { platform: 'LinkedIn', shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, iconClass: 'fa-brands fa-linkedin-in' },
      { platform: 'WhatsApp', shareUrl: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`, iconClass: 'fa-brands fa-whatsapp' }
    ];

    const isShareEnabled = artDetail.enableSharePost !== false && (ctx as any).enableSharePost !== false;

    // Single-token dynamic placeholder: {{ PostShareStrip }}, {{ SocialShareButtons }}, {{ SocialShareStrip }}
    const shareStripMarkup = isShareEnabled
      ? `<div class="d-flex align-items-center gap-2 social-share-strip">
  <span class="small text-muted fw-semibold">Share:</span>
  ${platforms.map((p: any) => `<a href="${p.shareUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-light border rounded-circle" title="Share on ${p.platform}"><i class="${p.iconClass}"></i></a>`).join('\n  ')}
</div>`
      : '';

    output = output.replace(/\{\{\s*(?:PostShareStrip|SocialShareButtons|SocialShareStrip)\s*\}\}/gi, shareStripMarkup);

    // Conditional Handlebars block: {{#if EnableSharePost}}...{{/if}}
    const ifShareRegex = /\{\{#if\s+EnableSharePost\}\}([\s\S]*?)\{\{\/if\}\}/gi;
    output = output.replace(ifShareRegex, (_match, innerContent) => {
      return isShareEnabled ? innerContent : '';
    });

    const socialShareRegex = /\{\{#each\s+SocialShareLinks\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(socialShareRegex, (_match, innerTemplate) => {
      return platforms.map((p: any) => {
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*Platform\s*\}\}/gi, p.platform || '');
        rendered = rendered.replace(/\{\{\s*ShareUrl\s*\}\}/gi, p.shareUrl || '#');
        rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, p.shareUrl || '#');
        rendered = rendered.replace(/\{\{\s*IconClass\s*\}\}/gi, p.iconClass || '');
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

    // 6g. Breadcrumb & Page Header Hydration ({{ BreadcrumbTrail }}, {{ BackgroundImageUrl }}, {{#each Breadcrumbs}})
    const bcPool = { ...ctx, ...(ctx.breadcrumb || {}) };
    const rawTrail = bcPool.breadcrumbTrail || bcPool.breadcrumbs || bcPool.trailItems || [
      { label: 'Home', url: '/', isActive: false },
      { label: 'Capabilities', url: '/capabilities', isActive: false },
      { label: bcPool.title || 'Enterprise Solutions', url: '#', isActive: true }
    ];

    // Single-token dynamic placeholder: {{ BreadcrumbTrail }}
    const breadcrumbTrailHtml = `<ol class="breadcrumb justify-content-center align-items-center mb-0 small">
      ${rawTrail.map((item: any, idx: number) => {
        const isLast = idx === rawTrail.length - 1 || item.isActive;
        if (isLast) {
          return `<li class="breadcrumb-item active text-white fw-bold" aria-current="page">${item.label || item.title || ''}</li>`;
        } else {
          return `<li class="breadcrumb-item"><a href="${item.url || '#'}" class="text-white text-opacity-75 text-decoration-none">${item.label || item.title || ''}</a></li>
          <li class="breadcrumb-item text-white text-opacity-50">/</li>`;
        }
      }).join('\n      ')}
    </ol>`;

    output = output.replace(/\{\{\s*(?:BreadcrumbTrail|BreadcrumbsTrail|BreadcrumbLinks)\s*\}\}/gi, breadcrumbTrailHtml);

    // Loop: {{#each BreadcrumbTrail}} or {{#each Breadcrumbs}} or {{#each BreadcrumbItems}}
    const bcLoopRegex = /\{\{#each\s+(?:BreadcrumbTrail|Breadcrumbs|BreadcrumbItems)\}\}([\s\S]*?)\{\{\/each\}\}/gi;
    output = output.replace(bcLoopRegex, (_match, innerTemplate) => {
      return rawTrail.map((b: any, bIdx: number) => {
        const isLast = bIdx === rawTrail.length - 1 || b.isActive;
        let rendered = innerTemplate;
        rendered = rendered.replace(/\{\{\s*(?:Label|Title|Name)\s*\}\}/gi, b.label || b.title || '');
        rendered = rendered.replace(/\{\{\s*(?:Url|Link)\s*\}\}/gi, b.url || '#');
        rendered = rendered.replace(/\{\{\s*IsActive\s*\}\}/gi, isLast ? 'true' : 'false');
        return rendered;
      }).join('\n');
    });

    // BackgroundImageUrl scalar
    const bgImage = bcPool.backgroundImageUrl || bcPool.imageUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80';
    output = output.replace(/\{\{\s*BackgroundImageUrl\s*\}\}/gi, bgImage);

    // 6h. Handlebars {{#if Property}}...{{/if}} and {{#unless Property}}...{{/unless}} Conditionals
    // Resolved iteratively up to 10 passes to ensure nested condition trees evaluate cleanly
    const brandName = ctx.BrandName || ctx.brandName || ctx.CompanyName || ctx.companyName || ctx['Brand.Name'] || opts.currentTenantBrandName || opts.editorTokens?.brand?.name || 'Dumka Group';
    const logoUrl = ctx.BrandLogo || ctx.brandLogo || ctx.LogoUrl || ctx.logoUrl || ctx.CompanyLogo || ctx.companyLogo || ctx['Brand.LogoUrl'] || ctx['Brand.WhiteLogoUrl'] || ctx.WhiteLogoUrl || ctx.whiteLogoUrl || opts.editorTokens?.brand?.logoUrl || '';
    const homeUrl = ctx.HomeUrl || ctx.homeUrl || ctx.WebsiteUrl || ctx.websiteUrl || ctx['Brand.WebsiteUrl'] || '/';
    const hasBrandLogo = Boolean(logoUrl && logoUrl.trim().length > 0);

    const conditionPool = {
      ...artDetail,
      ...ctx,
      brandName,
      BrandName: brandName,
      companyName: brandName,
      CompanyName: brandName,
      'Brand.Name': brandName,
      logoUrl,
      LogoUrl: logoUrl,
      brandLogo: logoUrl,
      BrandLogo: logoUrl,
      companyLogo: logoUrl,
      CompanyLogo: logoUrl,
      'Brand.LogoUrl': logoUrl,
      'Brand.WhiteLogoUrl': logoUrl,
      hasBrandLogo,
      HasBrandLogo: hasBrandLogo,
      homeUrl,
      HomeUrl: homeUrl,
      websiteUrl: homeUrl,
      WebsiteUrl: homeUrl,
      'Brand.WebsiteUrl': homeUrl,
      'PageSection.Title': ctx.title || ctx.Title || '',
      'PageSection.MiniTitle': ctx.miniTitle || ctx.MiniTitle || ctx.subTitle || ctx.Subtitle || '',
      'PageSection.Subtitle': ctx.miniTitle || ctx.MiniTitle || ctx.subTitle || ctx.Subtitle || '',
      'PageSection.Description': ctx.description || ctx.Description || ctx.fullDescription || ctx.FullDescription || '',
      'PageSection.FullDescription': ctx.fullDescription || ctx.FullDescription || ctx.description || ctx.Description || '',
      'PageSection.ButtonText': ctx.buttonText || ctx.ButtonText || '',
      'PageSection.ButtonLink': ctx.buttonLink || ctx.ButtonLink || '',
      'PageSection.ImageUrl': ctx.imageUrl || ctx.ImageUrl || '',
      'PageSection.IconText': ctx.iconText || ctx.IconText || '',
      'PageSection.Icon': ctx.iconText || ctx.IconText || ctx.icon || ''
    };

    let prevCondOutput = '';
    let condPass = 0;
    while (prevCondOutput !== output && condPass < 10) {
      prevCondOutput = output;
      condPass++;

      // 1. {{#if Prop}}...{{else}}...{{/if}}
      output = output.replace(/\{\{#if\s+([\w\.]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_match, prop, ifBody, elseBody) => {
        const p = prop.trim();
        const key = Object.keys(conditionPool).find(k => k.toLowerCase() === p.toLowerCase());
        const val = key ? (conditionPool as any)[key] : undefined;
        return this.evaluateCondition(val) ? ifBody : elseBody;
      });

      // 2. {{#if Prop}}...{{/if}}
      output = output.replace(/\{\{#if\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_match, prop, ifBody) => {
        const p = prop.trim();
        const key = Object.keys(conditionPool).find(k => k.toLowerCase() === p.toLowerCase());
        const val = key ? (conditionPool as any)[key] : undefined;
        return this.evaluateCondition(val) ? ifBody : '';
      });

      // 3. {{#unless Prop}}...{{/unless}}
      output = output.replace(/\{\{#unless\s+([\w\.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/gi, (_match, prop, body) => {
        const p = prop.trim();
        const key = Object.keys(conditionPool).find(k => k.toLowerCase() === p.toLowerCase());
        const val = key ? (conditionPool as any)[key] : undefined;
        return !this.evaluateCondition(val) ? body : '';
      });
    }

    // 6i. Dynamic Form Embeds: {{ Form:Key }}, {{ Form "Key" }}, {{ Form 'Key' }}, or {{ Form }}
    const bodyFormRegex = /\{\{\s*Form(?::|\s+["']?)([\w\-\_]+)["']?\s*\}\}|\{\{\s*Form(?:Key|Embed)?\s*\}\}/gi;
    output = output.replace(bodyFormRegex, (_match: string, formKeyParam?: string) => {
      const key = (formKeyParam || ctx.formKey || 'Contact_Us').trim();
      const isNewsletter = /newsletter|subscribe/i.test(key);
      const isContact = /contact|inquiry/i.test(key);
      const isService = /service|request|intake/i.test(key);

      if (isNewsletter) {
        return `<form class="oz-dynamic-form oz-form-newsletter" data-form-key="${key}" onsubmit="event.preventDefault();">
          <input type="email" name="email" class="form-control form-control-sm rounded-pill px-3" placeholder="name@company.com" required />
          <button type="submit" class="btn btn-sm btn-primary rounded-pill px-3 fw-bold" style="margin-top: 10px;">Subscribe</button>
        </form>`;
      }

      if (isContact) {
        return `<form class="oz-dynamic-form oz-form-contact d-flex flex-column gap-3" data-form-key="${key}" onsubmit="event.preventDefault();">
          <div class="row g-2">
            <div class="col-md-6"><input type="text" name="full_name" class="form-control" placeholder="e.g. First Last" required /></div>
            <div class="col-md-6"><input type="email" name="email" class="form-control" placeholder="name@company.com" required /></div>
          </div>
          <input type="text" name="subject" class="form-control" placeholder="e.g. Inquiry / Subject" />
          <textarea name="message" class="form-control" rows="3" placeholder="e.g. How can we assist your organization?" required></textarea>
          <div class="oz-recaptcha-wrap my-1">
            <div class="g-recaptcha" data-sitekey=""></div>
          </div>
          <button type="submit" class="btn btn-primary fw-bold rounded-pill px-4 align-self-start">Send Message →</button>
        </form>`;
      }

      if (isService) {
        return `<form class="oz-dynamic-form oz-form-service d-flex flex-column gap-3" data-form-key="${key}" onsubmit="event.preventDefault();">
          <div class="row g-2">
            <div class="col-md-6"><input type="text" name="organization_name" class="form-control" placeholder="e.g. Your Organization Name" required /></div>
            <div class="col-md-6"><input type="text" name="full_name" class="form-control" placeholder="e.g. First Last" required /></div>
          </div>
          <div class="row g-2">
            <div class="col-md-6"><input type="email" name="email" class="form-control" placeholder="name@company.com" required /></div>
            <div class="col-md-6"><input type="tel" name="phone" class="form-control" placeholder="e.g. +0 (000) 000-0000" /></div>
          </div>
          <select name="service_required" class="form-select">
            <option selected value="">Select Advisory / Solution Scope...</option>
            <option value="Enterprise Architecture">Enterprise Architecture & Infrastructure</option>
            <option value="Systems Modernization">Systems Modernization & Scalability</option>
            <option value="Security Governance">Security & Governance Frameworks</option>
            <option value="Custom Consultation">Custom Strategic Consultation</option>
          </select>
          <textarea name="message" class="form-control" rows="3" placeholder="e.g. Brief project scope or target timeline..."></textarea>
          <div class="oz-recaptcha-wrap my-1">
            <div class="g-recaptcha" data-sitekey=""></div>
          </div>
          <button type="submit" class="btn btn-primary fw-bold rounded-pill px-4 align-self-start">Submit Service Request →</button>
        </form>`;
      }

      return `<form class="oz-dynamic-form oz-form-generic d-flex flex-column gap-3" data-form-key="${key}" onsubmit="event.preventDefault();">
        <div class="row g-2">
          <div class="col-md-6"><input type="text" name="full_name" class="form-control" placeholder="e.g. First Last" required /></div>
          <div class="col-md-6"><input type="email" name="email" class="form-control" placeholder="name@company.com" required /></div>
        </div>
        <textarea name="message" class="form-control" rows="3" placeholder="e.g. Enter your message here..." required></textarea>
        <div class="oz-recaptcha-wrap my-1">
          <div class="g-recaptcha" data-sitekey=""></div>
        </div>
        <button type="submit" class="btn btn-primary fw-bold rounded-pill px-4 align-self-start">Submit →</button>
      </form>`;
    });

    // 7. Scalar placeholders matching C# Domain Models (PageSection, PageSectionList, BrandSettings)
    // Rich-text triple mustache unescaped passes
    output = output.replace(/\{\{\{\s*FullDescription\s*\}\}\}/gi, ctx.fullDescription || ctx.description || '');
    output = output.replace(/\{\{\{\s*Description\s*\}\}\}/gi, ctx.description || ctx.fullDescription || '');
    output = output.replace(/\{\{\{\s*Article\.Body\s*\}\}\}/gi, artBody);

    // Standard PageSection model properties
    output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || ctx.Title || opts.previewBlogContent?.title || '');
    output = output.replace(/\{\{\s*MiniTitle\s*\}\}/gi, ctx.miniTitle || ctx.MiniTitle || opts.previewBlogContent?.miniTitle || '');
    output = output.replace(/\{\{\s*Text\s*\}\}/gi, ctx.text || ctx.description || ctx.Description || opts.previewBlogContent?.description || '');
    output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || ctx.Description || ctx.text || opts.previewBlogContent?.description || '');
    output = output.replace(/\{\{\s*FullDescription\s*\}\}/gi, ctx.fullDescription || ctx.FullDescription || ctx.description || '');
    output = output.replace(/\{\{\s*Qoute\s*\}\}/gi, ctx.qoute || ctx.quote || ctx.Qoute || ctx.Quote || '');
    output = output.replace(/\{\{\s*Quote\s*\}\}/gi, ctx.quote || ctx.qoute || ctx.Quote || ctx.Qoute || '');
    output = output.replace(/\{\{\s*DirectUrl\s*\}\}/gi, ctx.directUrl || ctx.DirectUrl || '');
    output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || ctx.ButtonText || ctx.viewAllButtonText || opts.previewBlogContent?.buttonText || '');
    output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || ctx.ButtonLink || ctx.viewAllButtonLink || opts.previewBlogContent?.buttonLink || '#');
    output = output.replace(/\{\{\s*(?:SecondButtonText|SecondaryButtonText|VideoButtonText)\s*\}\}/gi, ctx.secondButtonText || ctx.secondaryButtonText || ctx.videoButtonText || ctx.SecondButtonText || '');
    output = output.replace(/\{\{\s*(?:SecondButtonLink|SecondaryButtonLink|VideoLink)\s*\}\}/gi, ctx.secondButtonLink || ctx.secondaryButtonLink || ctx.videoLink || ctx.SecondButtonLink || '');
    output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || ctx.ImageUrl || ctx.url || '');
    output = output.replace(/\{\{\s*(?:SecondImageUrl|SecondUrl)\s*\}\}/gi, ctx.secondImageUrl || ctx.secondUrl || ctx.SecondImageUrl || '');
    output = output.replace(/\{\{\s*(?:YoutubeVideo|YoutubeUrlLink)\s*\}\}/gi, ctx.youtubeVideo || ctx.youtubeUrlLink || ctx.YoutubeUrlLink || ctx.videoUrl || '');
    output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.videoUrl || ctx.VideoUrl || ctx.youtubeVideo || '');
    output = output.replace(/\{\{\s*Subtitle\s*\}\}/gi, ctx.subtitle || ctx.text || ctx.description || '');
    output = output.replace(/\{\{\s*BackgroundImageUrl\s*\}\}/gi, ctx.backgroundImageUrl || ctx.url || ctx.imageUrl || '');
    output = output.replace(/\{\{\s*CustomClass\s*\}\}/gi, ctx.customClass || ctx.CustomClass || '');
    output = output.replace(/\{\{\s*(?:BadgeText|Badge|PillText)\s*\}\}/gi, ctx.miniTitle || ctx.badgeText || '');
    output = output.replace(/\{\{\s*IconText\s*\}\}/gi, ctx.iconText || ctx.IconText || '');
    output = output.replace(/\{\{\s*FormKey\s*\}\}/gi, ctx.formKey || ctx.FormKey || '');

    // Direct content placement tokens (Email, Phone, Address, WorkingHours)
    const activeEmail = ctx.email || ctx.contactEmail || ctx.Email || ctx.ContactEmail || '';
    const activePhone = ctx.phone || ctx.contactPhone || ctx.Phone || ctx.ContactPhone || '';
    const activeAddress = ctx.address || ctx.location || ctx.Address || ctx.CompanyAddress || '';
    const activeHours = ctx.workingHours || ctx.WorkingHours || '';

    output = output.replace(/\{\{\s*(?:Email|ContactEmail)\s*\}\}/gi, activeEmail);
    output = output.replace(/\{\{\s*(?:Phone|ContactPhone)\s*\}\}/gi, activePhone);
    output = output.replace(/\{\{\s*(?:Address|Location|CompanyAddress)\s*\}\}/gi, activeAddress);
    output = output.replace(/\{\{\s*WorkingHours\s*\}\}/gi, activeHours);

    // Fallback template placeholders if tenant populated real contact info
    if (activeEmail) output = output.replace(/abc@domain\.com/gi, activeEmail);
    if (activePhone) output = output.replace(/0000000000/gi, activePhone);
    if (activeAddress) output = output.replace(/No 1 ABC Street, World/gi, activeAddress);

    // Favicon
    const rawFav = ctx.FaviconUrl || ctx.faviconUrl;
    const faviconUrl = (rawFav && rawFav !== '/favicon.ico') ? rawFav : '';
    output = output.replace(/\{\{\s*FaviconUrl\s*\}\}/gi, faviconUrl);

    // Legal URLs
    output = output.replace(/\{\{\s*PrivacyUrl\s*\}\}/gi, '/privacy-policy');
    output = output.replace(/\{\{\s*TermsUrl\s*\}\}/gi, '/terms-and-conditions');
    output = output.replace(/\{\{\s*CookiesUrl\s*\}\}/gi, '/cookie-policy');

    // Corporate Identity Fields (Logo-First with Business Name fallback from BrandSettings)
    const brandIdentityHtml = hasBrandLogo
      ? `<img src="${logoUrl}" alt="${brandName}" class="navbar-brand-logo" style="max-height: 48px; width: auto; object-fit: contain;" />`
      : `<span class="navbar-brand-text fw-bolder text-dark fs-4 tracking-tight" style="font-weight: 800; font-size: 1.5rem; text-decoration: none; color: inherit; display: inline-block;">${brandName}</span>`;

    output = output.replace(/\{\{\s*(?:BrandIdentity|BrandLogoOrName)\s*\}\}/gi, brandIdentityHtml);

    // Handle Brand Logo tokens & raw <img> tags
    if (hasBrandLogo) {
      output = output.replace(/\{\{\s*(?:Brand\.LogoUrl|Brand\.WhiteLogoUrl|BrandLogo|CompanyLogo|LogoUrl|WhiteLogoUrl)\s*\}\}/gi, logoUrl);
    } else {
      // If no logo is uploaded, replace any <img> tag with empty or logo token src with a crisp brand name text span
      const imgWithLogoTokenRegex = /<img[^>]*src=["']\s*(?:\{\{\s*(?:Brand\.LogoUrl|Brand\.WhiteLogoUrl|BrandLogo|CompanyLogo|LogoUrl|WhiteLogoUrl)\s*\}\})?\s*["'][^>]*\/?>(?:\s*<\/img>)?/gi;
      output = output.replace(imgWithLogoTokenRegex, `<span class="navbar-brand-text fw-bolder text-dark fs-4 tracking-tight" style="font-weight: 800; font-size: 1.5rem; text-decoration: none; color: inherit; display: inline-block;">${brandName}</span>`);
      output = output.replace(/\{\{\s*(?:Brand\.LogoUrl|Brand\.WhiteLogoUrl|BrandLogo|CompanyLogo|LogoUrl|WhiteLogoUrl)\s*\}\}/gi, '');
    }

    output = output.replace(/\{\{\s*(?:Brand\.Name|CompanyName|BrandName)\s*\}\}/gi, brandName);
    output = output.replace(/\{\{\s*(?:Brand\.WebsiteUrl|WebsiteUrl|HomeUrl|RootUrl)\s*\}\}/gi, homeUrl);
    output = output.replace(/\{\{\s*(?:Brand\.LoginButtonText|LoginText|LoginTitle|AuthText|PortalText)\s*\}\}/gi, ctx.LoginText || ctx.loginText || ctx['Brand.LoginButtonText'] || 'Sign In');
    const currentYear = ctx.Year || new Date().getFullYear().toString();
    output = output.replace(/\{\{\s*Year\s*\}\}/gi, currentYear);
    output = output.replace(/\{\{\s*Copyright\s*\}\}/gi, ctx.copyright || `&copy; ${currentYear} ${brandName}. All rights reserved.`);

    // Authentication, Portal & Role-Aware Placeholders (Console vs. My Workspace vs. Sign In)
    const loginUrl = ctx.LoginUrl || ctx.loginUrl || opts.previewMenuContent?.loginUrl || '/auth/login';
    const loginText = ctx.LoginText || ctx.loginText || ctx.LoginTitle || opts.previewMenuContent?.loginText || 'Sign In';
    const loginBtnHtml = ctx.LoginButtonHtml || ctx.loginButtonHtml || 
      `<a href="${loginUrl}" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 oz-login-btn"><span>${loginText}</span></a>`;

    output = output.replace(/\{\{\s*(?:LoginUrl|AuthUrl|PortalUrl)\s*\}\}/gi, loginUrl);
    output = output.replace(/\{\{\s*(?:LoginText|LoginTitle|AuthText|PortalText)\s*\}\}/gi, loginText);
    output = output.replace(/\{\{\s*(?:LoginButton|LoginLink|AuthButton|PortalButton|PortalLink)\s*\}\}/gi, loginBtnHtml);

    // Clean up any remaining unhandled {{#each ...}} loops and leftover {{ Token }} placeholders to prevent visual leakage
    output = output.replace(/\{\{#each[\s\S]*?\{\{\/each\}\}/gi, '');
    output = output.replace(/\{\{\s*#each[^\}]*\}\}/gi, '');
    output = output.replace(/\{\{\s*\/each\s*\}\}/gi, '');
    output = output.replace(/\{\{#each\b[^\n<>]*/gi, '');
    output = output.replace(/\{\{\{[#\/]?[\w\s\.\,\-\_:"'=]+\}\}\}/g, '');
    output = output.replace(/\{\{[#\/]?[\w\s\.\,\-\_:"'=]+\}\}/g, '');

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
  /**
   * Compiles SEO, Open Graph, Twitter, and Favicon meta tags by hydrating
   * all placeholders ({{ Title }}, {{ Description }}, {{ Keywords }}, {{ Author }},
   * {{ CanonicalUrl }}, {{ ImageUrl }}, {{ FaviconUrl }}, {{ Icon32Url }}, {{ Icon16Url }},
   * {{ AppleTouchIconUrl }}, {{ BrandName }}, {{ ThemeColor }}, {{ DomainName }})
   * using the active page metadata and tenant brand settings.
   *
   * @param rawMetaHtml The raw HTML tag snippet containing placeholders.
   * @param context Active page, brand settings, and routing context.
   * @returns Fully compiled and sanitized meta tag markup.
   */
  compileMetaTags(
    rawMetaHtml: string,
    context?: {
      page?: any;
      brand?: any;
      currentUrl?: string;
    }
  ): string {
    if (!rawMetaHtml) return '';

    const page = context?.page || {};
    const brand = context?.brand || {};

    const brandName = (
      brand.brandName ||
      brand.BrandName ||
      brand.companyName ||
      brand.CompanyName ||
      brand.websiteTitle ||
      brand.WebsiteTitle ||
      'Workspace'
    ).toString().trim();

    // 1. Resolve raw title (Priority: Page MetaTitle > Page Title > Brand Browser Title > Brand Name)
    const rawTitle = (
      page.metaTitle ||
      page.MetaTitle ||
      page.title ||
      page.Title ||
      page.name ||
      brand.websiteBrowserTitle ||
      brand.WebsiteBrowserTitle ||
      brand.websiteTitle ||
      brand.WebsiteTitle ||
      brandName
    ).toString().trim();

    // Intelligently prevent clumsy duplicate brand suffixes when {{ Title }} is followed by {{ BrandName }}
    const brandEscaped = brandName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const cleanTitle = rawTitle.replace(new RegExp(`\\s*[\\|\\-]\\s*${brandEscaped}$`, 'i'), '').trim() || brandName;

    // 2. Resolve Description (Priority: Page MetaDescription > Page Description > Brand Tagline/Bio)
    const description = (
      page.metaDescription ||
      page.MetaDescription ||
      page.description ||
      page.Description ||
      brand.companyDescription ||
      brand.CompanyDescription ||
      brand.tagline ||
      brand.Tagline ||
      brand.footerDescription ||
      ''
    ).toString().trim();

    // 3. Resolve Keywords (Priority: Page MetaKeywords > Page Tags > Brand Keywords/Industry)
    const keywords = (
      page.metaKeywords ||
      page.MetaKeywords ||
      page.tags ||
      page.Tags ||
      brand.metaKeywords ||
      brand.MetaKeywords ||
      brand.industry ||
      brand.Industry ||
      ''
    ).toString().trim();

    // 4. Resolve Author
    const author = (
      page.author ||
      page.Author ||
      brandName
    ).toString().trim();

    // 5. Resolve Domain and Canonical URL
    const domainName = (
      brand.customDomain ||
      brand.CustomDomain ||
      (typeof window !== 'undefined' ? window.location.host : 'localhost')
    ).toString().trim();

    let canonicalUrl = context?.currentUrl || '';
    if (!canonicalUrl && typeof window !== 'undefined') {
      canonicalUrl = window.location.href.split('?')[0];
    }
    if (!canonicalUrl && page.directUrl) {
      const cleanSlug = page.directUrl.toString().replace(/^\//, '');
      canonicalUrl = `https://${domainName}/${cleanSlug}`;
    } else if (!canonicalUrl) {
      canonicalUrl = `https://${domainName}/`;
    }

    // 6. Resolve Media and Visual Assets (Prioritize square brand icon for social preview cards when page has no specific photo)
    const imageUrl = (
      page.imageUrl ||
      page.ImageUrl ||
      brand.companyIconUrl ||
      brand.CompanyIconUrl ||
      brand.iconUrl ||
      brand.IconUrl ||
      brand.faviconUrl ||
      brand.FaviconUrl ||
      brand.logoUrl ||
      brand.LogoUrl ||
      brand.companyLogoUrl ||
      brand.CompanyLogoUrl ||
      ''
    ).toString().trim();

    const rawFavicon = (
      brand.faviconUrl ||
      brand.FaviconUrl ||
      brand.companyIconUrl ||
      brand.CompanyIconUrl ||
      '/favicon.ico'
    ).toString().trim();
    const faviconUrl = rawFavicon || '/favicon.ico';

    const appleTouchIconUrl = (
      brand.companyIconUrl ||
      brand.CompanyIconUrl ||
      brand.faviconUrl ||
      brand.FaviconUrl ||
      '/favicon.ico'
    ).toString().trim() || '/favicon.ico';

    const themeColor = (
      brand.primaryColor ||
      brand.PrimaryColor ||
      brand.themeColor ||
      brand.ThemeColor ||
      '#0050E5'
    ).toString().trim();

    let output = rawMetaHtml;

    // Substitute all Primary SEO & Open Graph placeholders
    output = output.replace(/\{\{\s*Title\s*\}\}/gi, cleanTitle);
    output = output.replace(/\{\{\s*(?:Description|MetaDescription)\s*\}\}/gi, description);
    output = output.replace(/\{\{\s*(?:Keywords|MetaKeywords)\s*\}\}/gi, keywords);
    output = output.replace(/\{\{\s*Author\s*\}\}/gi, author);
    output = output.replace(/\{\{\s*CanonicalUrl\s*\}\}/gi, canonicalUrl);
    output = output.replace(/\{\{\s*(?:ImageUrl|Image|OgImage)\s*\}\}/gi, imageUrl);
    output = output.replace(/\{\{\s*FaviconUrl\s*\}\}/gi, faviconUrl);
    output = output.replace(/\{\{\s*AppleTouchIconUrl\s*\}\}/gi, appleTouchIconUrl);
    output = output.replace(/\{\{\s*Icon32Url\s*\}\}/gi, faviconUrl);
    output = output.replace(/\{\{\s*Icon16Url\s*\}\}/gi, faviconUrl);
    output = output.replace(/\{\{\s*BrandName\s*\}\}/gi, brandName);
    output = output.replace(/\{\{\s*ThemeColor\s*\}\}/gi, themeColor);
    output = output.replace(/\{\{\s*DomainName\s*\}\}/gi, domainName);

    // Universal safety guard: replace empty href="" on shortcut icon / icon tags with fallback
    output = output.replace(/(<link[^>]*rel=["'](?:shortcut icon|icon)["'][^>]*href=["'])\s*(["'])/gi, `$1${faviconUrl}$2`);
    output = output.replace(/(<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["'])\s*(["'])/gi, `$1${appleTouchIconUrl}$2`);

    return output;
  }

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
