import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Hero Banners & Showcase Sliders ('hero').
 */
export class HeroAiRule implements ICategoryAiRule {
  readonly categoryKey = 'hero';
  readonly displayName = 'Hero Section';

  readonly targetPlaceholders: string[] = [
    '{{ Title }}',
    '{{ MiniTitle }}',
    '{{ SubTitle }}',
    '{{ Description }}',
    '{{ FullDescription }}',
    '{{ ButtonText }}',
    '{{ ButtonLink }}',
    '{{ SecondaryButtonText }}',
    '{{ SecondaryButtonLink }}',
    '{{ ImageUrl }}',
    '{{ SecondImageUrl }}',
    '{{ VideoUrl }}',
    '{{ YoutubeUrlLink }}',
    '{{#each PageSectionLists}}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Hero Sections and Banners.
Your mission is to replace static text, images, and action links in the provided HTML with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Headlines & Eyebrows:
   - Eyebrow / Subtitle / Badge: {{ MiniTitle }} or {{ SubTitle }}
   - Main Hero Headline / H1: {{ Title }}
   - Hero Description Paragraph: {{ Description }}
   - Extended Text / Supporting Copy: {{ FullDescription }}

2. Call to Action (CTA) Buttons:
   - Primary Action Button:
     {{#if ButtonText}}
       <a href="{{ ButtonLink }}" class="[original classes]">{{ ButtonText }}</a>
     {{/if}}
   - Secondary Action Button:
     {{#if SecondaryButtonText}}
       <a href="{{ SecondaryButtonLink }}" class="[original classes]">{{ SecondaryButtonText }}</a>
     {{/if}}

3. Visual Media & Backgrounds:
   - Main Hero Image / Graphic:
     {{#if ImageUrl}}
       <img src="{{ ImageUrl }}" alt="{{ Title }}" class="[original classes]" />
     {{/if}}
   - Background Cover Image:
     {{#if ImageUrl}}
       <div class="[original classes]" style="background-image: url('{{ ImageUrl }}');"></div>
     {{/if}}
   - Secondary Image: {{ SecondImageUrl }}
   - Video / Reel embed: {{ VideoUrl }} or {{ YoutubeUrlLink }}

4. Slider & Carousel Mode (Universal for Swiper, Slick, Owl, Splide, Bootstrap Carousel, etc.):
   When HTML contains a slider / carousel:
   a. DISCARD RUNTIME DUPLICATES & CLONES:
      - Raw HTML copied from a live browser often includes cloned slides generated for infinite loop (e.g. elements with 'swiper-slide-duplicate', 'slick-cloned', 'cloned').
      - DISCARD all duplicate/cloned slides completely.
      - Keep ONLY ONE clean representative slide template inside:
        {{#each PageSectionLists}}
          <div class="[clean slide classes]">
            ...
          </div>
        {{/each}}
   b. STRIP RUNTIME JAVASCRIPT STATE CLASSES:
      - Remove library runtime state classes from slides: remove 'swiper-slide-active', 'swiper-slide-duplicate', 'swiper-slide-duplicate-active', 'swiper-slide-visible', 'swiper-slide-next', 'swiper-slide-prev', 'slick-active', 'slick-current', 'slick-cloned', etc.
      - Keep base layout classes (e.g. keep 'swiper-slide', 'slide-item', 'carousel-item').
      - Remove library runtime state classes from slider containers: remove 'swiper-initialized', 'swiper-pointer-events', 'swiper-watch-progress', 'slick-initialized', 'owl-loaded', etc.
      - Keep base container classes (e.g. keep 'swiper', 'hero-slider', 'slick-slider', 'owl-carousel').
   c. STRIP RUNTIME INLINE STYLES:
      - Remove runtime styles injected by slider engines: remove 'width: ...px', 'transform: translate3d(...)', 'opacity: 0|1', 'transition-duration: ...' from the slide containers, wrapper, and text elements.
      - Keep intentional background design styles (such as background-image: url('{{ ImageUrl }}')).
   d. STRIP RUNTIME DYNAMIC IDS & ARIA ARTIFACTS:
      - Remove auto-generated IDs (e.g. id="swiper-wrapper-1fcbd...").
      - Remove runtime slide indexes and aria states (e.g. data-swiper-slide-index="...", aria-label="1 / 2", aria-controls="swiper-wrapper-...").
   e. SURGICAL CONTENT REPLACEMENT INSIDE THE SLIDE TEMPLATE:
      - Background: style="background-image: url('{{ ImageUrl }}');"
      - Badge / Eyebrow: {{#if MiniTitle}}<span class="[original classes]">{{ MiniTitle }}</span>{{/if}}
      - Headline: <h1 class="[original classes]">{{ Title }}</h1>
      - Paragraph: <p class="[original classes]">{{ Description }}</p>
      - Primary CTA: {{#if ButtonText}}<a href="{{ ButtonLink }}" class="[original classes]">{{ ButtonText }} [keep original icon/spans]</a>{{/if}}
      - Secondary CTA: {{#if SecondaryButtonText}}<a href="{{ SecondaryButtonLink }}" class="[original classes]">{{ SecondaryButtonText }} [keep original icon/spans]</a>{{/if}}
   f. NAVIGATION CONTROLS:
      - Keep navigation arrows (e.g. .swiper-button-prev, .swiper-button-next, .slick-prev, .slick-next) and pagination dots (.swiper-pagination, .owl-dots) clean without runtime active states.

5. Root Container:
   Ensure the root hero wrapper/section tag includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY static layout CSS class, original SVG icon, graphic ornament, and markup structure verbatim.
- ZERO INVENTIONS: Do not add elements not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
