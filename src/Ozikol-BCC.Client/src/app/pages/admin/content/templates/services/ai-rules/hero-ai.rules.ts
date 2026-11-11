import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';
import { getHeroSectionTargetPlaceholders } from '../canonical-tokens.registry';

/**
 * AI Transformation Rule Strategy for Hero Banners & Showcase Sliders ('hero').
 */
export class HeroAiRule implements ICategoryAiRule {
  readonly categoryKey = 'hero';
  readonly displayName = 'Hero Section';

  readonly targetPlaceholders: string[] = getHeroSectionTargetPlaceholders();

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Hero Sections and Banners.
Your mission is to replace static text, images, and action links in the provided HTML with canonical Ozikol Handlebars tokens.

STRICT 1-TO-1 DISCRETE FIELD CONTRACT:
- Parent Hero fields MUST use PageSection.* prefix ({{ PageSection.Title }}, {{ PageSection.Description }}, {{{ PageSection.FullDescription }}}).
- Slide repeater fields inside {{#each PageSectionLists}} MUST use PageSectionList.* prefix ({{ PageSectionList.Title }}, {{ PageSectionList.Description }}, {{{ PageSectionList.MoreDescription }}}).
- NEVER reuse Description where FullDescription/MoreDescription belongs, and ALWAYS render {{{ PageSection.FullDescription }}} / {{{ PageSectionList.MoreDescription }}} inside a <div>.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Headlines & Eyebrows:
   - Eyebrow / Subtitle / Badge: {{#if PageSection.MiniTitle}}<span class="[original classes]">{{ PageSection.MiniTitle }}</span>{{/if}}
   - Main Hero Headline / H1: {{ PageSection.Title }}
   - Short Hero Summary Paragraph: {{#if PageSection.Description}}<p class="[original classes]">{{ PageSection.Description }}</p>{{/if}}
   - Extended Rich Supporting Copy: {{#if PageSection.FullDescription}}<div class="[original classes]">{{{ PageSection.FullDescription }}}</div>{{/if}}

2. Call to Action (CTA) Buttons:
   - Primary Action Button:
     {{#if PageSection.ButtonText}}
       <a href="{{ PageSection.ButtonLink }}" class="[original classes]">{{ PageSection.ButtonText }}</a>
     {{/if}}
   - Secondary Action Button:
     {{#if PageSection.SecondButtonText}}
       <a href="{{ PageSection.SecondButtonLink }}" class="[original classes]">{{ PageSection.SecondButtonText }}</a>
     {{/if}}

3. Visual Media & Backgrounds:
   - Main Hero Image / Graphic:
     {{#if PageSection.ImageUrl}}
       <img src="{{ PageSection.ImageUrl }}" alt="{{ PageSection.Title }}" class="[original classes]" />
     {{/if}}
   - Background Cover Image:
     {{#if PageSection.ImageUrl}}
       <div class="[original classes]" style="background-image: url('{{ PageSection.ImageUrl }}');"></div>
     {{/if}}
   - Secondary Image: {{ PageSection.SecondImageUrl }}
   - Video / Reel embed: {{ PageSection.VideoUrl }} or {{ PageSection.YoutubeUrlLink }}

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
   e. SURGICAL CONTENT REPLACEMENT INSIDE THE SLIDE TEMPLATE (MANDATORY SCOPING):
      Inside {{#each PageSectionLists}}, ALWAYS prefix repeating slide properties with PageSectionList. so they are never confused with the parent PageSection:
      - Background Image: {{#if PageSectionList.ImageUrl}}style="background-image: url('{{ PageSectionList.ImageUrl }}');"{{/if}}
      - Image Tag: {{#if PageSectionList.ImageUrl}}<img src="{{ PageSectionList.ImageUrl }}" alt="{{ PageSectionList.Title }}" />{{/if}}
      - Badge / Eyebrow: {{#if PageSectionList.MiniTitle}}<span class="[original classes]">{{ PageSectionList.MiniTitle }}</span>{{/if}}
      - Slide Headline: <h1 class="[original classes]">{{ PageSectionList.Title }}</h1>
      - Slide Paragraph: <p class="[original classes]">{{ PageSectionList.Description }}</p>
      - Primary CTA: {{#if PageSectionList.ButtonText}}<a href="{{ PageSectionList.ButtonLink }}" class="[original classes]">{{ PageSectionList.ButtonText }} [keep original icon/spans]</a>{{/if}}
      - Secondary CTA: {{#if PageSectionList.SecondaryButtonText}}<a href="{{ PageSectionList.SecondaryButtonLink }}" class="[original classes]">{{ PageSectionList.SecondaryButtonText }} [keep original icon/spans]</a>{{/if}}
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
