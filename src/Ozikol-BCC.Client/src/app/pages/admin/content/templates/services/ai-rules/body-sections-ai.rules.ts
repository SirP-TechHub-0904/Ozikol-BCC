import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Body Sections, Feature Grids & Content Cards ('cards' / 'body').
 */
export class BodySectionsAiRule implements ICategoryAiRule {
  readonly categoryKey = 'cards';
  readonly displayName = 'Body Section';

  readonly targetPlaceholders: string[] = [
    '{{ Title }}',
    '{{ MiniTitle }}',
    '{{ Description }}',
    '{{ ButtonText }}',
    '{{ ButtonLink }}',
    '{{#each PageSectionLists}}',
    '{{ Icon }}',
    '{{ IconText }}',
    '{{ ImageUrl }}',
    '{{ DirectUrl }}',
    '{{ Form "..." }}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Body Sections (Feature Grids, Service Lists, Pricing Tables, FAQs, Testimonials).
Your mission is to replace static text and hardcoded repeated cards with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Section Header:
   - Eyebrow / Category Tag: {{ MiniTitle }}
   - Main Section Headline: {{ Title }}
   - Section Intro Description: {{ Description }}
   - Optional Section CTA Button:
     {{#if ButtonText}}
       <a href="{{ ButtonLink }}" class="[original classes]">{{ ButtonText }}</a>
     {{/if}}

2. Repeatable Cards / Items Loop:
   Look for repeating card elements (grid columns, feature boxes, pricing tiers, testimonial cards, FAQ accordion items).
   Keep ONLY ONE representative card instance wrapped in {{#each PageSectionLists}} and remove all duplicate static cards:
   {{#each PageSectionLists}}
     <div class="[original card classes]">
       {{#if IconText}}
         <i class="{{ IconText }}"></i>
       {{/if}}
       <span class="[original badge classes]">{{ MiniTitle }}</span>
       {{#if ImageUrl}}
         <img src="{{ ImageUrl }}" alt="{{ Title }}" class="[original image classes]" />
       {{/if}}
       <h3 class="[original title classes]">{{ Title }}</h3>
       <p class="[original description classes]">{{ Description }}</p>
       {{#if ButtonText}}
         <a href="{{ ButtonLink }}" class="[original btn classes]">{{ ButtonText }}</a>
       {{/if}}
     </div>
   {{/each}}

3. Dynamic Form Embeds (e.g. Contact Us or Consultation forms):
   If a form is embedded, keep the container and use {{ Form "Contact_Us" }}.

4. Root Container:
   Ensure the root section wrapper includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, grid wrapper, layout column, and structure verbatim.
- ZERO INVENTIONS: Do not add elements or columns not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
