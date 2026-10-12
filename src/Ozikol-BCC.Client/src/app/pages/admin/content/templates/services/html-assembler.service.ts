import { Injectable } from '@angular/core';

/**
 * Represents a code injection record targeting one of the three critical browser document zones.
 */
export interface CodeInjectionTag {
  id?: string;
  name: string;
  zone: 'head' | 'body_open' | 'footer';
  tagType: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  isDefault?: boolean;
  suiteCode?: string;
}

/**
 * Represents an individual visual section template participating in page composition.
 */
export interface SectionTemplateUnit {
  id?: string;
  name?: string;
  category: 'menu' | 'hero' | 'breadcrumb' | 'body' | 'bodysections' | 'footer' | 'blog' | 'blog_detail' | string;
  html: string;
  css?: string;
  js?: string;
  sortOrder?: number;
  pageId?: string;
  isActive?: boolean;
}

/**
 * Configuration payload for compiling a single isolated section in designer preview mode.
 */
export interface SectionPreviewOptions {
  html: string;
  css?: string;
  js?: string;
  category?: string;
  pageTitle?: string;
  codeInjections?: CodeInjectionTag[];
  suiteCode?: string;
}

/**
 * Configuration payload for compiling a full multi-section HTML5 webpage.
 */
export interface FullPageAssemblyOptions {
  pageTitle?: string;
  pageSlug?: string;
  metaDescription?: string;
  faviconUrl?: string;
  language?: string;
  suiteCode?: string;
  codeInjections?: CodeInjectionTag[];
  sections?: SectionTemplateUnit[];
  headerSection?: SectionTemplateUnit;
  heroSection?: SectionTemplateUnit;
  breadcrumbSection?: SectionTemplateUnit;
  bodySections?: SectionTemplateUnit[];
  footerSection?: SectionTemplateUnit;
}

/**
 * Structured output of page assembly separating document markup, scoped stylesheets, and scripts.
 */
export interface PageAssemblyBundle {
  fullDocumentHtml: string;
  visualBodyMarkup: string;
  combinedStyles: string;
  combinedScripts: string;
  sortedHeadTags: string;
  sortedBodyOpenTags: string;
  sortedFooterTags: string;
  orderedSections: SectionTemplateUnit[];
}

/**
 * Master HTML5 Document Assembler and Page Synthesizer.
 * Stitches together the 4 foundational site pillars:
 * 1. Header Tags (<head>) - Sorted by SortOrder
 * 2. Body Open Tags (<body>) - Sorted by SortOrder
 * 3. Section Templates - Arranged by Category hierarchy (Navigation -> Hero -> Body Sections by SortOrder -> Footer)
 * 4. Footer Scripts (</body>) - Sorted by SortOrder
 */
@Injectable({
  providedIn: 'root'
})
export class HtmlAssemblerService {

  /**
   * Filters and sorts code injection tags for a specific target zone by ascending SortOrder.
   * @param tags Array of all code injection tags.
   * @param zone Target document zone ('head', 'body_open', or 'footer').
   * @param suiteCode Optional Theme Suite code filter (matches active suite, 'global', or unset).
   * @returns Filtered and ascending-sorted tags array.
   */
  filterAndSortTags(
    tags: CodeInjectionTag[] | undefined,
    zone: 'head' | 'body_open' | 'footer',
    suiteCode?: string
  ): CodeInjectionTag[] {
    if (!tags || tags.length === 0) return [];

    const activeSuite = suiteCode || 'suite_corporate';

    return tags
      .filter(t => {
        if (!t || t.zone !== zone) return false;
        if (t.isActive === false) return false;

        // Allow global tags or tags matching current theme suite
        const tagSuite = t.suiteCode || 'suite_corporate';
        return tagSuite === activeSuite || tagSuite === 'global' || !t.suiteCode;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  /**
   * Strips outer `<style>` tags to ensure clean inline CSS bundling.
   * @param css Raw CSS string.
   * @returns Cleaned CSS content.
   */
  cleanCss(css: string | undefined): string {
    if (!css) return '';
    return css.replace(/<\/?style[^>]*>/gi, '').trim();
  }

  /**
   * Strips outer `<script>` tags to ensure clean inline JS bundling.
   * @param js Raw JavaScript string.
   * @returns Cleaned JavaScript content.
   */
  cleanJs(js: string | undefined): string {
    if (!js) return '';
    return js.replace(/<\/?script[^>]*>/gi, '').trim();
  }

  /**
   * Assembles a complete HTML5 document for a single section in designer preview mode.
   * Injects active head tags, the section HTML, scoped CSS in `<head>`, and scoped JS + footer scripts at closing `</body>`.
   * @param options Preview assembly options.
   * @returns Fully formed HTML5 document string.
   */
  assembleSectionPreview(options: SectionPreviewOptions): string {
    const title = options.pageTitle || 'Section Preview';
    const suite = options.suiteCode || 'suite_corporate';

    // 1. Pillar 1: Header Tags (<head>)
    const sortedHeadTags = this.filterAndSortTags(options.codeInjections, 'head', suite)
      .map(t => t.content)
      .join('\n  ');

    // 2. Pillar 2: Body Open Tags (<body>)
    const sortedBodyOpenTags = this.filterAndSortTags(options.codeInjections, 'body_open', suite)
      .map(t => t.content)
      .join('\n  ');

    // 3. Pillar 3: Single Section Markup & Scoped Styles
    const cleanStyle = this.cleanCss(options.css);
    const cleanScript = this.cleanJs(options.js);
    const sectionHtml = options.html || '';

    // 4. Pillar 4: Footer Scripts (</body>)
    const sortedFooterTags = this.filterAndSortTags(options.codeInjections, 'footer', suite)
      .map(t => t.content)
      .join('\n  ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  ${sortedHeadTags ? `<!-- [PILLAR 1] Header Tags (<head>) -->\n  ${sortedHeadTags}` : ''}
  ${cleanStyle ? `<!-- Scoped Section Styles -->\n  <style>\n${cleanStyle}\n  </style>` : ''}
</head>
<body>
  ${sortedBodyOpenTags ? `<!-- [PILLAR 2] Body Open (<body>) -->\n  ${sortedBodyOpenTags}\n` : ''}
  <!-- [PILLAR 3] Section Template Content -->
  ${sectionHtml}

  ${cleanScript ? `<!-- Scoped Section JavaScript -->\n  <script>\n    document.addEventListener('DOMContentLoaded', function() {\n      ${cleanScript}\n    });\n  </script>` : ''}
  ${sortedFooterTags ? `<!-- [PILLAR 4] Footer Scripts (</body>) -->\n  ${sortedFooterTags}` : ''}
</body>
</html>`;
  }

  /**
   * Assembles a structured page bundle with separated visual body markup, combined styles,
   * scripts, and full document HTML string.
   * @param options Full page assembly options.
   * @returns Detailed PageAssemblyBundle.
   */
  assemblePageBundle(options: FullPageAssemblyOptions): PageAssemblyBundle {
    const title = options.pageTitle || 'Home | Enterprise Portal';
    const lang = options.language || 'en';
    const suite = options.suiteCode || 'suite_corporate';

    // 1. Pillar 1: Header Tags (<head>) sorted by SortOrder
    const sortedHeadTags = this.filterAndSortTags(options.codeInjections, 'head', suite)
      .map(t => t.content)
      .join('\n  ');

    // 2. Pillar 2: Body Open Tags (<body>) sorted by SortOrder
    const sortedBodyOpenTags = this.filterAndSortTags(options.codeInjections, 'body_open', suite)
      .map(t => t.content)
      .join('\n  ');

    // 3. Pillar 3: Section Categorization & Arrangement
    let navSection: SectionTemplateUnit | undefined = options.headerSection;
    let heroSection: SectionTemplateUnit | undefined = options.heroSection;
    let breadcrumbSection: SectionTemplateUnit | undefined = options.breadcrumbSection;
    let bodySectionsList: SectionTemplateUnit[] = options.bodySections ? [...options.bodySections] : [];
    let footSection: SectionTemplateUnit | undefined = options.footerSection;

    // If an aggregated sections list was passed, categorize automatically
    if (options.sections && options.sections.length > 0) {
      for (const sec of options.sections) {
        if (sec.isActive === false) continue;
        const cat = (sec.category || '').toLowerCase();

        if (cat === 'menu' || cat === 'navigation') {
          if (!navSection) navSection = sec;
        } else if (cat === 'hero' || cat === 'hero_sliders') {
          if (!heroSection) heroSection = sec;
        } else if (cat === 'breadcrumb' || cat === 'breadcrumbs' || cat === 'pagebanner') {
          if (!breadcrumbSection) breadcrumbSection = sec;
        } else if (cat === 'footer' || cat === 'footers') {
          if (!footSection) footSection = sec;
        } else {
          bodySectionsList.push(sec);
        }
      }
    }

    // Sort body sections strictly by ascending SortOrder
    bodySectionsList.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    // Collect all active sections in semantic document order
    const isHomePage = !options.pageSlug || options.pageSlug.toLowerCase() === 'home' || options.pageSlug === '/';
    const orderedSections: SectionTemplateUnit[] = [];

    // 1. Navigation at top
    if (navSection) orderedSections.push(navSection);

    // 2. Banner: Hero on Homepage, Breadcrumbs on Inner Pages
    if (isHomePage) {
      if (heroSection) orderedSections.push(heroSection);
    } else {
      if (breadcrumbSection) orderedSections.push(breadcrumbSection);
      else if (heroSection) orderedSections.push(heroSection); // graceful fallback if breadcrumb not created yet
    }

    // 3. Body Sections
    for (const bodySec of bodySectionsList) {
      orderedSections.push(bodySec);
    }

    // 4. Footer at bottom
    if (footSection) orderedSections.push(footSection);

    // Aggregate visual HTML markup
    const visualBodyMarkup = orderedSections
      .map(s => s.html || '')
      .filter(h => h.trim().length > 0)
      .join('\n\n');

    // Aggregate scoped CSS styles
    const combinedStyles = orderedSections
      .map(s => this.cleanCss(s.css))
      .filter(c => c.length > 0)
      .join('\n\n');

    // Aggregate scoped JS scripts
    const combinedScripts = orderedSections
      .map(s => this.cleanJs(s.js))
      .filter(j => j.length > 0)
      .join('\n\n');

    // 4. Pillar 4: Footer Scripts (</body>) sorted by SortOrder
    const sortedFooterTags = this.filterAndSortTags(options.codeInjections, 'footer', suite)
      .map(t => t.content)
      .join('\n  ');

    const fullDocumentHtml = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  ${options.metaDescription ? `<meta name="description" content="${options.metaDescription}">` : ''}
  ${options.faviconUrl ? `<link rel="icon" type="image/x-icon" href="${options.faviconUrl}">` : ''}
  ${sortedHeadTags ? `<!-- [PILLAR 1] Header Tags (<head>) -->\n  ${sortedHeadTags}` : ''}
  ${combinedStyles ? `<!-- Scoped Section Stylesheets -->\n  <style>\n${combinedStyles}\n  </style>` : ''}
</head>
<body>
  ${sortedBodyOpenTags ? `<!-- [PILLAR 2] Body Open (<body>) -->\n  ${sortedBodyOpenTags}\n` : ''}
  <!-- [PILLAR 3] Visual Section Templates (Navigation -> Hero -> Body Sections -> Footer) -->
  ${visualBodyMarkup}

  ${combinedScripts ? `<!-- Scoped Section JavaScript Handlers -->\n  <script>\n    document.addEventListener('DOMContentLoaded', function() {\n      ${combinedScripts}\n    });\n  </script>` : ''}
  ${sortedFooterTags ? `<!-- [PILLAR 4] Footer Scripts (</body>) -->\n  ${sortedFooterTags}` : ''}
</body>
</html>`;

    return {
      fullDocumentHtml,
      visualBodyMarkup,
      combinedStyles,
      combinedScripts,
      sortedHeadTags,
      sortedBodyOpenTags,
      sortedFooterTags,
      orderedSections
    };
  }

  /**
   * Assembles a full, production-ready multi-section webpage.
   * Handles categorical page layout:
   * 1. Navigation (Singleton at top)
   * 2. Hero Slider (Singleton under navbar)
   * 3. Body Sections (Multi-instance looped by SortOrder)
   * 4. Footer (Singleton at bottom)
   * Bundles all scoped CSS de-duplicated into `<head>` and all section scripts before closing `</body>`.
   * @param options Full page assembly options.
   * @returns Complete HTML5 document string.
   */
  assembleFullPage(options: FullPageAssemblyOptions): string {
    return this.assemblePageBundle(options).fullDocumentHtml;
  }
}
