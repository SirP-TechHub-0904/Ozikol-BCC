import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Blog Feeds & Article Grids ('blog').
 */
export class BlogFeedAiRule implements ICategoryAiRule {
  readonly categoryKey = 'blog';
  readonly displayName = 'Blog Feed';

  readonly targetPlaceholders: string[] = [
    '{{ Title }}',
    '{{ MiniTitle }}',
    '{{ Description }}',
    '{{#each Articles}}',
    '{{ Title }}',
    '{{ Summary }}',
    '{{ Category }}',
    '{{ PublishedDate }}',
    '{{ AuthorName }}',
    '{{ Url }}',
    '{{ CoverImageUrl }}',
    '{{#each BlogCategories}}',
    '{{#each Tags}}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Blog Feeds & Article Grids.
Your mission is to replace static article posts, categories, and author metadata with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Section Header:
   - Eyebrow / Tagline: {{ MiniTitle }}
   - Feed Headline: {{ Title }}
   - Feed Description: {{ Description }}

2. Article Cards Feed Loop:
   Look for repeating article cards or post previews. Keep ONLY ONE representative article card inside {{#each Articles}} and remove duplicate cards:
   {{#each Articles}}
     <article class="[original article classes]">
       {{#if CoverImageUrl}}
         <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original thumbnail classes]" />
       {{/if}}
       <div class="[original meta classes]">
         <span class="[original category badge classes]">{{ Category }}</span>
         <span class="[original date classes]">{{ PublishedDate }}</span>
         <span class="[original author classes]">{{ AuthorName }}</span>
       </div>
       <h3 class="[original title classes]"><a href="{{ Url }}">{{ Title }}</a></h3>
       <p class="[original summary classes]">{{ Summary }}</p>
       <a href="{{ Url }}" class="[original read-more link classes]">Read More</a>
     </article>
   {{/each}}

3. Blog Categories & Tags Cloud (if sidebar or filter bar exists):
   - Categories: {{#each BlogCategories}}<a href="{{ Url }}">{{ Name }} ({{ Count }})</a>{{/each}}
   - Tags: {{#each Tags}}<a href="{{ Url }}">{{ Name }}</a>{{/each}}

4. Root Container:
   Ensure the root blog section wrapper includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, grid wrapper, layout column, and structure verbatim.
- ZERO INVENTIONS: Do not add elements not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
