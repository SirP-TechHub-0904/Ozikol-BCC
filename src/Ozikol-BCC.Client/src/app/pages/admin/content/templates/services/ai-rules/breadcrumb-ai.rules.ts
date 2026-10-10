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
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Breadcrumbs and Page Banner headers.
Your mission is to replace static titles and breadcrumb trails with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Page Header Title & Subtitle:
   - Page Title: {{ PageTitle }} or {{ Title }}
   - Subtitle / Eyebrow: {{ SubTitle }} or {{ MiniTitle }}
   - Background Banner Image: {{ BackgroundImageUrl }} or {{ ImageUrl }}

2. Breadcrumb Navigation Trail:
   Inside the <ol> or <ul> breadcrumb container, replace hardcoded crumb links with:
   {{#each Breadcrumbs}}
     <li class="[original crumb classes] {{#if IsActive}}active{{/if}}">
       {{#if IsActive}}
         <span class="[original active classes]">{{ Title }}</span>
       {{else}}
         <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
       {{/if}}
     </li>
   {{/each}}
   (Remove duplicate static <li> items, preserving only 1 dynamic item inside {{#each Breadcrumbs}}).

3. Root Container:
   Ensure the root breadcrumbs / banner wrapper includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, ID, separator icon (e.g. slashes, chevrons, SVGs), and structure verbatim.
- ZERO INVENTIONS: Do not add elements not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
