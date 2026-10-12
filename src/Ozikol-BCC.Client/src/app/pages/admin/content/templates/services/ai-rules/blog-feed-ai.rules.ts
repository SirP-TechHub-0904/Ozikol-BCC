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
   - Eyebrow / Tagline / Badge: {{#if MiniTitle}}<span class="[original eyebrow classes]">{{ MiniTitle }}</span>{{/if}}
   - Feed Headline: <h2 class="[original title classes]">{{ Title }}</h2>
   - Feed Description: {{#if Description}}<p class="[original description classes]">{{ Description }}</p>{{/if}}

2. Category Filter Pills / Bar (if present):
   Look for repeating category filter pills or buttons. Keep ONLY ONE representative item wrapped in {{#each BlogCategories}} and discard static duplicates:
   {{#each BlogCategories}}
     <a href="{{ Url }}" class="[original filter link classes]">{{ Name }} <span class="[original count classes]">({{ Count }})</span></a>
   {{/each}}

3. Article Cards Feed Loop:
   Look for repeating article cards, columns, or post previews (e.g. <div class="col-lg-4...">, <div class="post-item...">, <article class="...">).
   Keep ONLY ONE representative article card inside {{#each Articles}} and remove duplicate cards:
   {{#each Articles}}
     <article class="[original article classes]">
       {{#if CoverImageUrl}}
         <div class="[original media wrapper classes]">
           <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original thumbnail classes]" />
           {{#if Category}}
             <span class="[original category badge classes]">{{ Category }}</span>
           {{/if}}
         </div>
       {{/if}}
       <div class="[original content classes]">
         <div class="[original meta classes]">
           {{#if PublishedDate}}<span class="[original date classes]">{{ PublishedDate }}</span>{{/if}}
           {{#if AuthorName}}<span class="[original author classes]">{{ AuthorName }}</span>{{/if}}
         </div>
         <h3 class="[original title classes]"><a href="{{ Url }}" class="[original title link classes]">{{ Title }}</a></h3>
         {{#if Summary}}<p class="[original summary classes]">{{ Summary }}</p>{{/if}}
         <div class="[original footer classes]">
           <a href="{{ Url }}" class="[original read-more link classes]">Read Article</a>
         </div>
       </div>
     </article>
   {{/each}}

   * Background-Image Note: If the thumbnail uses an inline style background image instead of an <img> tag, transform it to:
     style="background-image: url('{{ CoverImageUrl }}');"

4. Slider / Carousel Mode (Swiper, Slick, Owl, Splide):
   - Discard infinite-loop cloned slides (e.g. 'swiper-slide-duplicate', 'slick-cloned', 'cloned').
   - Strip library runtime state classes ('swiper-slide-active', 'swiper-slide-visible', 'slick-active', 'swiper-initialized', 'slick-initialized').
   - Strip runtime inline styling ('width: ...px', 'transform: translate3d(...)', 'opacity: 0|1') while preserving intentional background-image styles.
   - Strip auto-generated IDs (id="swiper-wrapper-...") and runtime aria attributes.
   - Wrap the single clean slide inside {{#each Articles}} ... {{/each}}.

5. Tags Cloud (if sidebar or footer tag strip exists):
   {{#each Tags}}<a href="{{ Url }}" class="[original tag classes]">{{ Name }}</a>{{/each}}

6. Root Container:
   Ensure the root blog section wrapper element includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY single existing CSS class, ID, HTML tag, attribute, style, and structure from the input HTML exactly as-is.
- ZERO INVENTIONS: DO NOT inject, invent, or append any element (such as sidebars, search boxes, widgets, newsletter boxes, or footer columns) not in the input HTML.
- ZERO GENERIC OVERWRITES: NEVER replace original CSS classes with generic classes (e.g. NEVER replace original classes with 'oz-blog-section' or 'oz-article-card'). Keep the original classes verbatim.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations, no <style> tags.`;
  }
}
