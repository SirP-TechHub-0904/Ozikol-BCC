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
   - Secondary Image: {{ SecondImageUrl }}
   - Video / Reel embed: {{ VideoUrl }} or {{ YoutubeUrlLink }}

4. Slider / Carousel Mode (If multiple slides/items exist):
   Wrap repeating slide elements into a single instance inside:
   {{#each PageSectionLists}}
     <div class="[original slide classes]">
       <span class="[original badge classes]">{{ MiniTitle }}</span>
       <h2>{{ Title }}</h2>
       <p>{{ Description }}</p>
       <a href="{{ ButtonLink }}" class="[original btn classes]">{{ ButtonText }}</a>
     </div>
   {{/each}}
   (Remove the duplicate static slides, keeping only 1 template instance inside the loop).

5. Root Container:
   Ensure the root hero wrapper/section tag includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, ID, SVG icon, and structure verbatim.
- ZERO INVENTIONS: Do not add elements not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
