import { Injectable } from '@angular/core';
import { HydrationContext, replaceCommonScalars, scrubRemainingTokens } from './hydrators/hydration-core.utils';
import { hydrateNavigation } from './hydrators/navigation-hydrator';
import { hydrateHero } from './hydrators/hero-hydrator';
import { hydrateBodySections } from './hydrators/body-sections-hydrator';
import { hydrateFooter } from './hydrators/footer-hydrator';
import { hydrateBlogFeed } from './hydrators/blog-feed-hydrator';
import { hydrateBlogDetail } from './hydrators/blog-detail-hydrator';
import { hydrateBreadcrumb } from './hydrators/breadcrumb-hydrator';

export type { HydrationContext } from './hydrators/hydration-core.utils';

/**
 * Enterprise Category-Scoped Content Hydration Engine.
 * Automatically delegates template hydration to dedicated, isolated category handlers:
 * - 'menu' / 'navigation' -> NavigationHydrator
 * - 'hero' -> HeroHydrator
 * - 'breadcrumb' -> BreadcrumbHydrator
 * - 'body' / 'bodysections' -> BodySectionsHydrator
 * - 'footer' -> FooterHydrator
 * - 'blog' -> BlogFeedHydrator
 * - 'blog_detail' -> BlogDetailHydrator
 */
@Injectable({
  providedIn: 'root'
})
export class ContentHydrationService {

  /**
   * Hydrates raw template HTML using the dedicated hydrator for the specified category.
   * @param rawTemplate Raw HTML containing Handlebars tokens.
   * @param context Data payload (designer sampleContent or live CMS entities).
   * @param category Section category key ('menu', 'hero', 'breadcrumb', 'body', 'footer', 'blog', 'blog_detail').
   * @returns Pure, validated, clean HTML DOM string.
   */
  hydrate(rawTemplate: string, context?: HydrationContext, category?: string): string {
    if (!rawTemplate) return '';
    const ctx: HydrationContext = context || {};
    const cat = (category || '').toLowerCase().trim();

    switch (cat) {
      case 'menu':
      case 'navigation':
      case 'navbar':
      case 'header':
        return hydrateNavigation(rawTemplate, ctx);

      case 'hero':
      case 'herosection':
        return hydrateHero(rawTemplate, ctx);

      case 'breadcrumb':
      case 'breadcrumbs':
      case 'pagebanner':
      case 'page_banner':
        return hydrateBreadcrumb(rawTemplate, ctx);

      case 'body':
      case 'bodysections':
      case 'cards':
      case 'features':
      case 'services':
      case 'pricing':
      case 'testimonials':
      case 'accordion':
        return hydrateBodySections(rawTemplate, ctx);

      case 'footer':
      case 'megafooter':
        return hydrateFooter(rawTemplate, ctx);

      case 'blog':
      case 'blog_feed':
      case 'articles':
        return hydrateBlogFeed(rawTemplate, ctx);

      case 'blog_detail':
      case 'article_detail':
      case 'post_detail':
        return hydrateBlogDetail(rawTemplate, ctx);

      default:
        // Smart Auto-Detection if category not explicitly provided
        if (rawTemplate.includes('NavItems') || rawTemplate.includes('MainMenuItems')) {
          return hydrateNavigation(rawTemplate, ctx);
        }
        if (rawTemplate.includes('Breadcrumbs') || rawTemplate.includes('BreadcrumbTrail') || rawTemplate.includes('PageTitle')) {
          return hydrateBreadcrumb(rawTemplate, ctx);
        }
        if (rawTemplate.includes('PageSectionLists') || rawTemplate.includes('{{#each Items}}')) {
          return hydrateBodySections(rawTemplate, ctx);
        }
        if (rawTemplate.includes('LegalPages') || rawTemplate.includes('CategoryPages')) {
          return hydrateFooter(rawTemplate, ctx);
        }
        if (rawTemplate.includes('Articles') || rawTemplate.includes('BlogCategories')) {
          return hydrateBlogFeed(rawTemplate, ctx);
        }
        if (rawTemplate.includes('AuthorBio') || rawTemplate.includes('RecentArticles')) {
          return hydrateBlogDetail(rawTemplate, ctx);
        }

        // Fallback to Hero/General scalar hydrator
        return hydrateHero(rawTemplate, ctx);
    }
  }
}
