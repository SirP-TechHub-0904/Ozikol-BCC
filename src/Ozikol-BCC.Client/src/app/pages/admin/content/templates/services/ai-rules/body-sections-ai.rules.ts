import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';
import { getBodySectionTargetPlaceholders } from '../canonical-tokens.registry';

/**
 * AI Transformation Rule Strategy for Body Sections, Feature Grids, Services, Pricing, FAQs & Cards ('body' / 'cards').
 */
export class BodySectionsAiRule implements ICategoryAiRule {
  readonly categoryKey = 'body';
  readonly displayName = 'Body Section';

  readonly targetPlaceholders: string[] = getBodySectionTargetPlaceholders();

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Body Sections (Feature Grids, Service Lists, Pricing Tables, FAQs, Testimonials, Process Steps, Split Showcases, Stats Counters, CTA Banners).
Your mission is to analyze raw HTML markup and surgically replace static text and repeated hardcoded cards with canonical Ozikol Handlebars tokens.

STRICT 1-TO-1 DISCRETE FIELD CONTRACT (NEVER CONFLATE DESCRIPTION WITH FULLDESCRIPTION):
- {{ PageSection.Description }} maps strictly to the short plain-text summary field (PageSection.Description).
- {{{ PageSection.FullDescription }}} maps strictly to the rich WYSIWYG HTML body field (PageSection.FullDescription) and MUST always render inside a <div> (NEVER inside <p>, and NEVER reuse Description).
- Inside {{#each PageSectionLists}}, {{ PageSectionList.Description }} is short card text and {{{ PageSectionList.MoreDescription }}} is extended rich HTML card detail.
- ALWAYS prefix parent tokens with PageSection. and repeating item tokens with PageSectionList. so there is zero scope ambiguity.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:

1. SECTION-LEVEL HEADERS & NARRATIVE (PageSection):
   - Eyebrow / Kicker / Category Badge:
     {{#if PageSection.MiniTitle}}<span class="[original badge classes]">{{ PageSection.MiniTitle }}</span>{{/if}}
   - Main Section Title / Headline:
     {{ PageSection.Title }} (preserve existing <h2> or <h3> tag and its classes)
   - Short Introductory Summary (plain text excerpt only):
     {{#if PageSection.Description}}<p class="[original intro classes]">{{ PageSection.Description }}</p>{{/if}}
   - Extended Rich HTML Narrative (split showcases, long WYSIWYG copy):
     {{#if PageSection.FullDescription}}<div class="[original rich-text classes]">{{{ PageSection.FullDescription }}}</div>{{/if}}
   - Highlight Quote / Blockquote:
     {{#if PageSection.Qoute}}<blockquote class="[original classes]"><p>{{ PageSection.Qoute }}</p></blockquote>{{/if}}

2. SECTION-LEVEL CTAs (Dual Action Buttons):
   - Primary Action Button:
     {{#if PageSection.ButtonText}}
       <a href="{{ PageSection.ButtonLink }}" class="[original btn classes]">{{ PageSection.ButtonText }}</a>
     {{/if}}
   - Secondary Action Button (if present):
     {{#if PageSection.SecondButtonText}}
       <a href="{{ PageSection.SecondButtonLink }}" class="[original secondary btn classes]">{{ PageSection.SecondButtonText }}</a>
     {{/if}}

3. SECTION-LEVEL MEDIA & VIDEO (PageSection):
   - Primary Graphic / Hero Showcase / Split Visual:
     {{#if PageSection.ImageUrl}}<img src="{{ PageSection.ImageUrl }}" alt="{{ PageSection.Title }}" class="[original img classes]" />{{/if}}
   - Secondary Collage Visual:
     {{#if PageSection.SecondImageUrl}}<img src="{{ PageSection.SecondImageUrl }}" alt="Showcase" class="[original classes]" />{{/if}}
   - Direct Video URL:
     {{#if PageSection.VideoUrl}}<video src="{{ PageSection.VideoUrl }}" class="[original video classes]"></video>{{/if}}
   - YouTube / Video Popup Link:
     {{#if PageSection.YoutubeUrlLink}}<a href="{{ PageSection.YoutubeUrlLink }}" class="[original video-btn classes]">{{/if}}

4. REPEATABLE CHILD ITEMS LOOP (PageSectionLists - MANDATORY SCOPING):
   Detect repeating sibling elements in grids, rows, accordions, or carousels (e.g. 3, 4, or 6 feature columns, service boxes, pricing tier cards, testimonial cards, process step boxes, FAQ items).
   KEEP ONLY ONE representative item wrapped in {{#each PageSectionLists}} ... {{/each}} and REMOVE all duplicate static sibling items.
   Inside {{#each PageSectionLists}}, ALWAYS prefix repeating child properties with PageSectionList. so they are never confused with parent PageSection:
   {{#each PageSectionLists}}
     <div class="[original card/col classes]">
       {{#if PageSectionList.IconText}}
         <i class="{{ PageSectionList.IconText }}"></i>
       {{/if}}
       {{#if PageSectionList.MiniTitle}}
         <span class="[original badge/price classes]">{{ PageSectionList.MiniTitle }}</span>
       {{/if}}
       {{#if PageSectionList.ImageUrl}}
         <img src="{{ PageSectionList.ImageUrl }}" alt="{{ PageSectionList.Title }}" class="[original img classes]" />
       {{/if}}
       <h3 class="[original card title classes]">{{ PageSectionList.Title }}</h3>
       <p class="[original card desc classes]">{{ PageSectionList.Description }}</p>
       {{#if PageSectionList.MoreDescription}}
         <div class="[original extra classes]">{{{ PageSectionList.MoreDescription }}}</div>
       {{/if}}
       {{#if PageSectionList.ButtonText}}
         <a href="{{ PageSectionList.ButtonLink }}" class="[original card btn classes]">{{ PageSectionList.ButtonText }}</a>
       {{/if}}
       {{#if PageSectionList.SecondButtonText}}
         <a href="{{ PageSectionList.SecondButtonLink }}" class="[original secondary card btn classes]">{{ PageSectionList.SecondButtonText }}</a>
       {{/if}}
     </div>
   {{/each}}

   - For Process Steps with numbers (e.g. 01, 02, 03): use {{ PageSectionList.SortOrder }} for the number badge.
   - For FAQ Accordions: use {{ PageSectionList.Title }} for the question and {{ PageSectionList.Description }} for the collapsible answer.
   - For Pricing Tables: use {{ PageSectionList.Title }} for tier name, {{ PageSectionList.MiniTitle }} for price (e.g. $49/mo), {{ PageSectionList.Description }} for subtitle, and {{ PageSectionList.ButtonText }} for plan CTA.

5. DYNAMIC FORM EMBEDS (Lead Generation & Inquiries):
   If the section contains an embedded form (e.g. "Contact Us", "Request a Quote", consultation form, or inquiry inputs):
   Replace the inner form fields/inputs with {{ Form "Contact_Us" }} inside the form wrapper container.

6. RUNTIME NOISE ELIMINATION:
   - Strip DevTools / ScrollTrigger wrapper junk (e.g. <div class="pin-spacer">) and inline pixel height/transform styles.
   - Strip GSAP SplitText character wrappers (e.g. <div style="display:inline-block">L</div><div ...>e</div>...) and restore clean text with {{ Title }}.
   - Strip temporary inline fixed dimensions (e.g. style="max-width: 415.987px; height: 1357px;").

7. ROOT CONTAINER:
   - Ensure the root <section> tag retains all its original classes and appends {{ CustomClass }} at the end of class="...".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY layout column (<div class="col-lg-4">, etc.), container, responsive grid, animation attribute (data-wow-delay, etc.), and stylesheet class verbatim.
- ZERO INVENTIONS: Do not create arbitrary HTML elements or wrap items in classes not present in the original design.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
