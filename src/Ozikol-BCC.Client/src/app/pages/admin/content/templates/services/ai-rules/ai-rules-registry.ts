import type { ICategoryAiRule } from './category-ai-rule.interface';
export type { ICategoryAiRule };
import { NavigationAiRule } from './navigation-ai.rules';
import { HeroAiRule } from './hero-ai.rules';
import { BreadcrumbAiRule } from './breadcrumb-ai.rules';
import { BodySectionsAiRule } from './body-sections-ai.rules';
import { FooterAiRule } from './footer-ai.rules';
import { BlogFeedAiRule } from './blog-feed-ai.rules';
import { BlogDetailAiRule } from './blog-detail-ai.rules';

/**
 * Singleton instances of each category AI transformation strategy.
 */
const navigationRule = new NavigationAiRule();
const heroRule = new HeroAiRule();
const breadcrumbRule = new BreadcrumbAiRule();
const bodySectionsRule = new BodySectionsAiRule();
const footerRule = new FooterAiRule();
const blogFeedRule = new BlogFeedAiRule();
const blogDetailRule = new BlogDetailAiRule();

/**
 * Category-to-Strategy lookup map supporting canonical and alias keys.
 */
const CATEGORY_RULES_MAP: Record<string, ICategoryAiRule> = {
  // Navigation / Menu / Header
  'menu': navigationRule,
  'navigation': navigationRule,
  'header': navigationRule,
  'navbar': navigationRule,

  // Hero Sections / Sliders / Showcase
  'hero': heroRule,
  'slider': heroRule,
  'showcase': heroRule,

  // Breadcrumbs & Page Banners
  'breadcrumb': breadcrumbRule,
  'breadcrumbs': breadcrumbRule,
  'page-banner': breadcrumbRule,

  // Body Sections / Feature Cards / Services / Pricing / Testimonials
  'cards': bodySectionsRule,
  'body': bodySectionsRule,
  'bodysections': bodySectionsRule,
  'features': bodySectionsRule,
  'services': bodySectionsRule,

  // Footers & Bottom Navigation
  'footer': footerRule,
  'footers': footerRule,

  // Blog Feeds & Article Grids
  'blog': blogFeedRule,
  'blogs': blogFeedRule,
  'blog-feed': blogFeedRule,

  // Blog Detail & Single Articles
  'blog_detail': blogDetailRule,
  'blog-detail': blogDetailRule,
  'blogdetail': blogDetailRule,
  'article': blogDetailRule,
  'article-detail': blogDetailRule,
  'post_detail': blogDetailRule,
  'post-detail': blogDetailRule
};

/**
 * Resolves the category-specific AI transformation rule for a given category key.
 * If not specifically matched, defaults to BodySectionsAiRule as safe fallback.
 *
 * @param category Category identifier or alias
 * @returns Specific category strategy implementing ICategoryAiRule
 */
export function getCategoryAiRule(category: string): ICategoryAiRule {
  const normalizedKey = (category || '').toLowerCase().trim();
  return CATEGORY_RULES_MAP[normalizedKey] || bodySectionsRule;
}

/**
 * Returns all active category rule strategies registered in the system.
 */
export function getAllCategoryAiRules(): ICategoryAiRule[] {
  return [
    navigationRule,
    heroRule,
    breadcrumbRule,
    bodySectionsRule,
    footerRule,
    blogFeedRule,
    blogDetailRule
  ];
}
