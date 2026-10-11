import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Footers ('footer').
 */
export class FooterAiRule implements ICategoryAiRule {
  readonly categoryKey = 'footer';
  readonly displayName = 'Footer';

  readonly targetPlaceholders: string[] = [
    '{{ BrandIdentity }}',
    '{{ BrandName }}',
    '{{ BrandLogo }}',
    '{{ HomeUrl }}',
    '{{ Description }}',
    '{{#each FooterCategories}}',
    '{{#each Pages}}',
    '{{#each TaggedPages "quicklinks"}}',
    '{{#each TaggedPages}}',
    '{{#each LegalPages}}',
    '{{#if HasSocialLinks}}',
    '{{#each SocialLinks}}',
    '{{ Form "Newsletter_Subscribe" }}',
    '{{#if HasContactInfo}}',
    '{{#each ContactItems}}',
    '{{ Copyright }}',
    '{{ Year }}',
    '{{ Address }}',
    '{{ Phone }}',
    '{{ Email }}',
    '{{ WorkingHours }}',
    '{{ ContactUrl }}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Footers.
Your mission is to replace static text, hardcoded column links, tagged quick links, legal pages, social icons, newsletter forms, and copyright text with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Brand Identity & Mission:
   - Brand Logo / Text:
     <a href="{{ HomeUrl }}" class="[original brand link classes]">
       {{#if BrandLogo}}
         <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="[original logo classes]" />
       {{else}}
         <span class="[original brand text classes]">{{ BrandName }}</span>
       {{/if}}
     </a>
     (or use {{ BrandIdentity }})
   - Tagline / Brief Description: {{ Description }}

2. Navigation Columns (Dynamic Group Loops) & Tagged Pages:
   - Dynamic Categories Loop: Keep ONE dynamic column instance inside:
     {{#each FooterCategories}}
       <div class="[original column classes]">
         <h4 class="[original title classes]">{{ Title }}</h4>
         <ul class="[original list classes]">
           {{#each Pages}}
             <li><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
           {{/each}}
         </ul>
       </div>
     {{/each}}
   - Tagged Quick Links Column: If there is an independent "Quick Links" or "Helpful Links" column:
     <div class="[original column classes]">
       <h4 class="[original title classes]">Quick Links</h4>
       <ul class="[original list classes]">
         {{#each TaggedPages "quicklinks"}}
           <li><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
         {{/each}}
       </ul>
     </div>

3. Legal & Compliance Policy Links:
   Inside the legal strip, bottom bar, or policy links container:
   {{#each LegalPages}}
     <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
   {{/each}}

4. Social Media Channels:
   Inside the social icon container:
   {{#if HasSocialLinks}}
     <div class="[original social wrapper classes]">
       {{#each SocialLinks}}
         <a href="{{ Url }}" title="{{ Platform }}" class="[original social link classes]" target="_blank" rel="noopener">
           <i class="{{ IconClass }}"></i>
         </a>
       {{/each}}
     </div>
   {{/if}}

5. Newsletter Form Embed:
   Replace static subscription input boxes / forms with {{ Form "Newsletter_Subscribe" }}.

6. Contact Touchpoints, Business Hours & Schedule:
   - Dedicated Opening Hours / Business Hours:
     When a widget or column displays opening/working hours (e.g. titled "Opening Hours" or "Business Hours"):
     {{#if WorkingHours}}
       <div class="[original schedule container classes]">
         <div class="[original schedule item classes]">
           <span>Hours</span>
           <span>{{ WorkingHours }}</span>
         </div>
       </div>
     {{/if}}
     (Do NOT wrap generic ContactItems like Phone/Email under an "Opening Hours" widget. Reserve WorkingHours specifically for business schedule).
   - Structured Contact Items:
     If general contact details exist as repeated cards, list items, or contact info rows (Phone, Email, Headquarters Address):
     {{#if HasContactInfo}}
       <div class="[original contact container classes]">
         {{#each ContactItems}}
           <div class="[original item classes]">
             <i class="{{ IconClass }}"></i>
             <span class="[original title classes]">{{ Title }}</span>
             <a href="{{ Url }}" class="[original value classes]">{{ Content }}</a>
           </div>
         {{/each}}
       </div>
     {{/if}}
   - Contact CTA Action Button:
     If a "Contact Us" button or link exists: <a href="{{ ContactUrl }}" class="[original classes]">[keep original button content]</a>
   - Simple Text / Links:
     - Phone: replace with {{ Phone }} or <a href="tel:{{ Phone }}">{{ Phone }}</a>
     - Email: replace with {{ Email }} or <a href="mailto:{{ Email }}">{{ Email }}</a>
     - Physical Address: replace with {{ Address }}
     - Working Hours: replace with {{ WorkingHours }}

7. Copyright Notice:
   Replace hardcoded year and copyright text with:
   © {{ Year }} {{ BrandName }}. All rights reserved. or {{ Copyright }}

8. Root Container:
   Ensure the root footer tag includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, ID, grid structure, and layout verbatim.
- ZERO INVENTIONS: Do not add widgets or sections not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
