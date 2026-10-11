import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Breadcrumbs & Page Banners ('breadcrumb').
 */
export class BreadcrumbAiRule implements ICategoryAiRule {
  readonly categoryKey = 'breadcrumb';
  readonly displayName = 'Breadcrumbs';

  readonly targetPlaceholders: string[] = [
    '{{ PageTitle }}',
    '{{ Title }}',
    '{{ SubTitle }}',
    '{{ MiniTitle }}',
    '{{ Description }}',
    '{{ BackgroundImageUrl }}',
    '{{ ImageUrl }}',
    '{{#each Breadcrumbs}}',
    '{{ Title }}',
    '{{ Url }}',
    '{{ IsActive }}',
    '{{#if IsActive}}',
    '{{#unless IsLast}}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Breadcrumbs and Subpage Header Banners.
Your mission is to replace static titles, descriptions, background images, and breadcrumb trails in the provided HTML with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:

1. Page Header Title & Subtitle:
   - Primary Page Headline / Title:
     Replace the main page headline (e.g. <h1>, <h2>, or elements with classes like .page-title, .banner-title, .entry-title) with:
     <h1 class="[original classes]">{{ Title }}</h1>
   - Subtitle / Eyebrow / Tagline:
     If the banner has a subtitle, description, or small category eyebrow (e.g. .sub-title, .subtitle, .lead, <p>), wrap with:
     {{#if SubTitle}}<p class="[original classes]">{{ SubTitle }}</p>{{/if}}

2. Background Banner Imagery:
   - If the header banner uses an inline background image (e.g. style="background-image: url('images/banner.jpg');"), replace with:
     style="background-image: url('{{ BackgroundImageUrl }}'); [preserve other inline styles]"
   - If an <img> tag is used for the banner graphic or overlay, replace src with:
     src="{{ BackgroundImageUrl }}"

3. Breadcrumb Navigation Trail:
   Inside the <ol>, <ul>, or <div> breadcrumb container (e.g. .breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]):
   - Collapse ALL static repeated crumb items into EXACTLY ONE dynamic template item wrapped inside {{#each Breadcrumbs}}...{{/each}}.
   - Differentiate the active / current subpage crumb from clickable parent links:
     {{#each Breadcrumbs}}
     <li class="[original crumb classes] {{#if IsActive}}active{{/if}}" {{#if IsActive}}aria-current="page"{{/if}}>
       {{#if Url}}
         <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
       {{else}}
         <span class="[original current/active classes]">{{ Title }}</span>
       {{/if}}
       [If there is an explicit inline separator icon, chevron, slash, or SVG inside the <li>, preserve it wrapped in:]
       {{#unless IsLast}}[original separator icon/element]{{/unless}}
     </li>
     {{/each}}
   - If the separator is a standalone sibling between crumbs (e.g. <li class="separator">/</li> or <span class="divider">></span>), wrap it in:
     {{#unless IsLast}}[original separator]{{/unless}}

4. Root Container:
   - Ensure the outermost <section>, <header>, or <div> includes class "{{ CustomClass }}".
     Example: <header class="page-banner position-relative {{ CustomClass }}">

MANDATORY RULES:
- 100% STYLE & STRUCTURE PRESERVATION: Keep EVERY existing CSS class, inline style, ID, SVG, FontAwesome icon, and data attribute verbatim.
- COLLAPSE CRUMB CLONES: Remove all duplicate static crumbs (e.g. Home, About, Current Page) so only 1 dynamic item remains inside {{#each Breadcrumbs}}.
- ZERO INVENTIONS: Do not add external libraries or HTML elements not present in the original input.
- CLEAN OUTPUT: Return ONLY the transformed raw HTML. Do not wrap in markdown code blocks (\`\`\`html) and do not provide explanations.`;
  }
}
