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
    '{{ Description }}',
    '{{#each FooterCategories}}',
    '{{#each Pages}}',
    '{{#each LegalPages}}',
    '{{#each SocialLinks}}',
    '{{ Form "Newsletter_Subscribe" }}',
    '{{ Copyright }}',
    '{{ Year }}',
    '{{ Address }}',
    '{{ Phone }}',
    '{{ Email }}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Footers.
Your mission is to replace static text, hardcoded column links, legal pages, and copyright text with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Brand Identity & Tagline:
   - Brand Logo / Name: {{#if BrandLogo}}<img src="{{ BrandLogo }}" alt="{{ BrandName }}" />{{else}}{{ BrandName }}{{/if}}
   - Tagline / Brief Description: {{ Description }}

2. Navigation Columns (Dynamic Group Loops):
   Look for multi-column link groupings (e.g. Products, Company, Resources). Keep ONE dynamic column instance inside:
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

3. Legal & Compliance Policy Links:
   Inside the legal bar or bottom policy links container:
   {{#each LegalPages}}
     <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
   {{/each}}

4. Social Media Channels:
   Inside the social icon container:
   {{#each SocialLinks}}
     <a href="{{ Url }}" title="{{ Platform }}" class="[original social classes]"><i class="{{ Icon }}"></i></a>
   {{/each}}

5. Newsletter Form Embed:
   Replace static subscription input boxes with {{ Form "Newsletter_Subscribe" }}.

6. Copyright Notice & Contact:
   - Copyright: © {{ Year }} {{ BrandName }}. All rights reserved. or {{ Copyright }}
   - Contact Info: {{ Address }}, {{ Phone }}, {{ Email }}

7. Root Container:
   Ensure the root footer tag includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, ID, grid structure, and layout verbatim.
- ZERO INVENTIONS: Do not add widgets or sections not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
