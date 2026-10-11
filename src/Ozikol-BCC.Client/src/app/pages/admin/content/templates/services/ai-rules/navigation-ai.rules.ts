import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Navigation Menus & Headers ('menu').
 */
export class NavigationAiRule implements ICategoryAiRule {
  readonly categoryKey = 'menu';
  readonly displayName = 'Navigation';

  readonly targetPlaceholders: string[] = [
    '{{ HomeUrl }}',
    '{{ BrandLogo }}',
    '{{ BrandName }}',
    '{{#each NavItems="first"}}',
    '{{#each NavItems="middle"}}',
    '{{#each NavItems="last"}}',
    '{{#if IsDropdown}}',
    '{{#each Pages}}',
    '{{#each MenuCtaButtons}}',
    '{{#if ActivateLoginInMenu}}',
    '{{ LoginUrl }}',
    '{{#if HasTopBar}}',
    '{{#if HasContactInfo}}',
    '{{#if HasSocialLinks}}',
    '{{#each SocialLinks}}',
    '{{#each ContactItems}}',
    '{{ Phone }}',
    '{{ Email }}',
    '{{ Address }}',
    '{{ WorkingHours }}',
    '{{#each TopBarPages}}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Navigation Menus.
Your mission is to replace static text and hardcoded menu links in the provided HTML with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Brand Logo & Name:
   <a href="{{ HomeUrl }}" class="[keep original classes]">
     {{#if BrandLogo}}
       <img src="{{ BrandLogo }}" alt="{{ BrandName }}" class="[keep original classes]" />
     {{else}}
       <span class="[keep original classes]">{{ BrandName }}</span>
     {{/if}}
   </a>

2. Main Navigation Links (Sequential 3-Zone Architecture):
   The 3 zones (first, middle, last) exist so tenants can place both direct pages and dropdown categories in ANY position across the navbar.
   Inside the main <ul> (and off-canvas/mobile drawer <ul> if present), you MUST render all 3 sequential zones:

   <!-- Zone 1: First -->
   {{#each NavItems="first"}}
     {{#if IsDropdown}}
       <li class="[original dropdown classes] {{ CustomClass }}">
         <a href="{{ Url }}" class="[original toggle classes]">{{ Title }}</a>
         {{#if Pages}}
           <ul class="[original dropdown menu classes]">
             {{#each Pages}}
               {{#if IsDropdown}}
                 <li class="[original nested submenu classes] {{ CustomClass }}">
                   <a href="{{ Url }}" class="[original nested toggle classes]">{{ Title }}</a>
                   {{#if Pages}}
                     <ul class="[original nested dropdown menu classes]">
                       {{#each Pages}}
                         <li><a href="{{ Url }}" class="[original item classes]">{{ Title }}</a></li>
                       {{/each}}
                     </ul>
                   {{/if}}
                 </li>
               {{else}}
                 <li class="[original item classes] {{ CustomClass }}"><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
               {{/if}}
             {{/each}}
           </ul>
         {{/if}}
       </li>
     {{else}}
       <li class="[original item classes] {{ CustomClass }}"><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
     {{/if}}
   {{/each}}

   <!-- Zone 2: Middle -->
   {{#each NavItems="middle"}}
     {{#if IsDropdown}}
       <li class="[original dropdown classes] {{ CustomClass }}">
         <a href="{{ Url }}" class="[original toggle classes]">{{ Title }}</a>
         {{#if Pages}}
           <ul class="[original dropdown menu classes]">
             {{#each Pages}}
               {{#if IsDropdown}}
                 <li class="[original nested submenu classes] {{ CustomClass }}">
                   <a href="{{ Url }}" class="[original nested toggle classes]">{{ Title }}</a>
                   {{#if Pages}}
                     <ul class="[original nested dropdown menu classes]">
                       {{#each Pages}}
                         <li><a href="{{ Url }}" class="[original item classes]">{{ Title }}</a></li>
                       {{/each}}
                     </ul>
                   {{/if}}
                 </li>
               {{else}}
                 <li class="[original item classes] {{ CustomClass }}"><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
               {{/if}}
             {{/each}}
           </ul>
         {{/if}}
       </li>
     {{else}}
       <li class="[original item classes] {{ CustomClass }}"><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
     {{/if}}
   {{/each}}

   <!-- Zone 3: Last -->
   {{#each NavItems="last"}}
     {{#if IsDropdown}}
       <li class="[original dropdown classes] {{ CustomClass }}">
         <a href="{{ Url }}" class="[original toggle classes]">{{ Title }}</a>
         {{#if Pages}}
           <ul class="[original dropdown menu classes]">
             {{#each Pages}}
               {{#if IsDropdown}}
                 <li class="[original nested submenu classes] {{ CustomClass }}">
                   <a href="{{ Url }}" class="[original nested toggle classes]">{{ Title }}</a>
                   {{#if Pages}}
                     <ul class="[original nested dropdown menu classes]">
                       {{#each Pages}}
                         <li><a href="{{ Url }}" class="[original item classes]">{{ Title }}</a></li>
                       {{/each}}
                     </ul>
                   {{/if}}
                 </li>
               {{else}}
                 <li class="[original item classes] {{ CustomClass }}"><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
               {{/if}}
             {{/each}}
           </ul>
         {{/if}}
       </li>
     {{else}}
       <li class="[original item classes] {{ CustomClass }}"><a href="{{ Url }}" class="[original link classes]">{{ Title }}</a></li>
     {{/if}}
   {{/each}}

3. Call to Action (CTA) Action Buttons:
   Replace static CTA buttons with:
   {{#each MenuCtaButtons}}
     <a href="{{ Url }}" class="[original button classes] {{ CustomClass }}">{{ Title }}</a>
   {{/each}}

4. Top Utility Bar, Contact Details & Social Media Links:
   If the header/navbar contains a top utility bar or contact strip (e.g., .top-bar, .header-top, .utility-nav):
   - Wrap optional top bar sections with {{#if HasTopBar}}...{{/if}} or {{#if HasContactInfo}}...{{/if}}.
   - Social Media Channels: If static social icons (Facebook, Twitter/X, Instagram, LinkedIn, YouTube, TikTok) are present:
     Collapse the repeated social icon anchors into:
     {{#if HasSocialLinks}}
       <div class="[original social wrapper classes]">
         {{#each SocialLinks}}
           <a href="{{ Url }}" title="{{ Platform }}" class="[original link classes]"><i class="{{ IconClass }}"></i></a>
         {{/each}}
       </div>
     {{/if}}
   - Phone Numbers: Replace hardcoded phone text or href="tel:..." with {{ Phone }} (or wrap in {{#if Phone}}...{{/if}}).
   - Email Addresses: Replace hardcoded emails or href="mailto:..." with {{ Email }} (or wrap in {{#if Email}}...{{/if}}).
   - Physical Addresses: Replace hardcoded office locations with {{ Address }} (or wrap in {{#if Address}}...{{/if}}).
   - Working Hours: Replace operational hours text with {{ WorkingHours }}.
   - Multi-Card Contact Items: If structured contact cards exist in the top bar or header, use:
     {{#each ContactItems}}
       <div class="[original item classes]">
         <i class="{{ IconClass }}"></i>
         <span>{{ Title }}: {{ Value }}</span>
       </div>
     {{/each}}
   - Top Bar Auxiliary Pages: Replace static top links (e.g. Help, FAQ, Support) with:
     {{#each TopBarPages}}
       <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
     {{/each}}

5. Login / User Portal Trigger:
   {{#if ActivateLoginInMenu}}
     <a href="{{ LoginUrl }}" class="[original login classes] {{ CustomClass }}">Login</a>
   {{/if}}

6. Root Container:
   Ensure the root header/nav element includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, ID, SVG icon, and structure verbatim.
- ZERO INVENTIONS: Do not add elements not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
