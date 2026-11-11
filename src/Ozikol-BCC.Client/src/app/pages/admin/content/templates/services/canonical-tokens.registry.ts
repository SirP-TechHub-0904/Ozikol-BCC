/**
 * Canonical Scope of a CMS Template Placeholder Token.
 */
export type CanonicalTokenScope = 'PageSection' | 'PageSectionList' | 'Blog' | 'Brand' | 'Loop' | 'Global';

/**
 * Expected content format rendered by a token.
 */
export type CanonicalTokenValueFormat = 'plain' | 'richHtml' | 'url' | 'icon' | 'loop' | 'class';

/**
 * Strongly typed descriptor for every canonical Handlebars placeholder token
 * across visual studio token bars, AI transformation prompts, hydrators, and the HTML assembler.
 */
export interface CanonicalTokenDefinition {
  /** UI chip label shown in Visual Editor toolbar */
  label: string;
  /** Entity scope owning this field */
  scope: CanonicalTokenScope;
  /** Property key on the backing entity (e.g. 'Description', 'FullDescription', 'MoreDescription') */
  fieldKey: string;
  /** Raw scoped token inserted or matched (e.g. '{{ PageSection.Description }}') */
  rawToken: string;
  /** Ready-to-insert markup snippet with matching conditional guard where appropriate */
  token: string;
  /** Optional extended HTML snippet variant for modal choice */
  htmlSnippet?: string;
  /** Data type determining plain vs triple-mustache HTML handling */
  valueFormat: CanonicalTokenValueFormat;
  /** Human-readable explanation shown in tooltips and AI specs */
  description: string;
}

/**
 * Canonical Token Definitions for Parent Section (`PageSection`) entities.
 * Description and FullDescription are strictly discrete fields with zero cross-fallback.
 */
export const PAGE_SECTION_CANONICAL_TOKENS: CanonicalTokenDefinition[] = [
  {
    label: 'Section Title',
    scope: 'PageSection',
    fieldKey: 'Title',
    rawToken: '{{ PageSection.Title }}',
    token: '{{ PageSection.Title }}',
    valueFormat: 'plain',
    description: 'Parent section main heading / title.'
  },
  {
    label: 'Section MiniTitle',
    scope: 'PageSection',
    fieldKey: 'MiniTitle',
    rawToken: '{{ PageSection.MiniTitle }}',
    token: '{{ PageSection.MiniTitle }}',
    valueFormat: 'plain',
    description: 'Parent eyebrow kicker badge or category label.'
  },
  {
    label: 'Section Description',
    scope: 'PageSection',
    fieldKey: 'Description',
    rawToken: '{{ PageSection.Description }}',
    token: '{{#if PageSection.Description}}\n  <p>{{ PageSection.Description }}</p>\n{{/if}}',
    valueFormat: 'plain',
    description: 'Parent section short plain-text summary (strictly separate from FullDescription).'
  },
  {
    label: 'Section FullDescription',
    scope: 'PageSection',
    fieldKey: 'FullDescription',
    rawToken: '{{{ PageSection.FullDescription }}}',
    token: '{{#if PageSection.FullDescription}}\n  <div class="section-rich-desc">\n    {{{ PageSection.FullDescription }}}\n  </div>\n{{/if}}',
    valueFormat: 'richHtml',
    description: 'Parent section extended rich WYSIWYG HTML body (triple-braced, never wrapped in <p>).'
  },
  {
    label: 'Section Quote',
    scope: 'PageSection',
    fieldKey: 'Qoute',
    rawToken: '{{ PageSection.Qoute }}',
    token: '{{#if PageSection.Qoute}}\n  <blockquote>{{ PageSection.Qoute }}</blockquote>\n{{/if}}',
    valueFormat: 'plain',
    description: 'Parent section highlight quote or callout banner.'
  },
  {
    label: 'Section Icon',
    scope: 'PageSection',
    fieldKey: 'IconText',
    rawToken: '{{ PageSection.IconText }}',
    token: '<i class="{{ PageSection.IconText }}"></i>',
    valueFormat: 'icon',
    description: 'Parent section root icon class or SVG/image icon in PageSection.'
  },
  {
    label: 'ImageUrl',
    scope: 'PageSection',
    fieldKey: 'ImageUrl',
    rawToken: '{{ PageSection.ImageUrl }}',
    token: '{{ PageSection.ImageUrl }}',
    valueFormat: 'url',
    description: 'Primary section graphic or hero image URL.'
  },
  {
    label: 'SecondImageUrl',
    scope: 'PageSection',
    fieldKey: 'SecondImageUrl',
    rawToken: '{{ PageSection.SecondImageUrl }}',
    token: '{{ PageSection.SecondImageUrl }}',
    valueFormat: 'url',
    description: 'Secondary collage or showcase image URL.'
  },
  {
    label: 'ButtonText',
    scope: 'PageSection',
    fieldKey: 'ButtonText',
    rawToken: '{{ PageSection.ButtonText }}',
    token: '{{ PageSection.ButtonText }}',
    valueFormat: 'plain',
    description: 'Primary section action button label.'
  },
  {
    label: 'ButtonLink',
    scope: 'PageSection',
    fieldKey: 'ButtonLink',
    rawToken: '{{ PageSection.ButtonLink }}',
    token: '{{ PageSection.ButtonLink }}',
    valueFormat: 'url',
    description: 'Primary section action button destination URL.'
  },
  {
    label: 'SecondaryButtonText',
    scope: 'PageSection',
    fieldKey: 'SecondButtonText',
    rawToken: '{{ PageSection.SecondButtonText }}',
    token: '{{ PageSection.SecondButtonText }}',
    valueFormat: 'plain',
    description: 'Secondary section action button label.'
  },
  {
    label: 'SecondaryButtonLink',
    scope: 'PageSection',
    fieldKey: 'SecondButtonLink',
    rawToken: '{{ PageSection.SecondButtonLink }}',
    token: '{{ PageSection.SecondButtonLink }}',
    valueFormat: 'url',
    description: 'Secondary section action button destination URL.'
  }
];

/**
 * Canonical Token Definitions for Repeating Child Cards / Slides (`PageSectionList`).
 * Maps 1-to-1 to PageSectionList database columns: Description (plain) and MoreDescription (rich HTML).
 */
export const PAGE_SECTION_LIST_CANONICAL_TOKENS: CanonicalTokenDefinition[] = [
  {
    label: 'Cards Repeater',
    scope: 'Loop',
    fieldKey: 'PageSectionLists',
    rawToken: '{{#each PageSectionLists}}',
    token: '{{#each PageSectionLists}}\n  <div class="col-item">\n    <i class="{{ PageSectionList.IconText }}"></i>\n    <h3>{{ PageSectionList.Title }}</h3>\n    {{#if PageSectionList.Description}}\n      <p>{{ PageSectionList.Description }}</p>\n    {{/if}}\n    {{#if PageSectionList.MoreDescription}}\n      <div class="card-rich-desc">{{{ PageSectionList.MoreDescription }}}</div>\n    {{/if}}\n  </div>\n{{/each}}',
    valueFormat: 'loop',
    description: 'Repeats over active child items/cards in PageSectionList.'
  },
  {
    label: 'Card Title',
    scope: 'PageSectionList',
    fieldKey: 'Title',
    rawToken: '{{ PageSectionList.Title }}',
    token: '{{ PageSectionList.Title }}',
    valueFormat: 'plain',
    description: 'Child item/card headline in PageSectionList.'
  },
  {
    label: 'Card MiniTitle',
    scope: 'PageSectionList',
    fieldKey: 'MiniTitle',
    rawToken: '{{ PageSectionList.MiniTitle }}',
    token: '{{ PageSectionList.MiniTitle }}',
    valueFormat: 'plain',
    description: 'Child item/card badge, eyebrow, or price label in PageSectionList.'
  },
  {
    label: 'Card Description',
    scope: 'PageSectionList',
    fieldKey: 'Description',
    rawToken: '{{ PageSectionList.Description }}',
    token: '{{#if PageSectionList.Description}}\n  <p>{{ PageSectionList.Description }}</p>\n{{/if}}',
    valueFormat: 'plain',
    description: 'Child item/card short summary text (strictly separate from MoreDescription).'
  },
  {
    label: 'Card MoreDescription',
    scope: 'PageSectionList',
    fieldKey: 'MoreDescription',
    rawToken: '{{{ PageSectionList.MoreDescription }}}',
    token: '{{#if PageSectionList.MoreDescription}}\n  <div class="card-rich-desc">\n    {{{ PageSectionList.MoreDescription }}}\n  </div>\n{{/if}}',
    valueFormat: 'richHtml',
    description: 'Child item/card extended rich HTML body from PageSectionList.MoreDescription.'
  },
  {
    label: 'Card Icon',
    scope: 'PageSectionList',
    fieldKey: 'IconText',
    rawToken: '{{ PageSectionList.IconText }}',
    token: '<i class="{{ PageSectionList.IconText }}"></i>',
    valueFormat: 'icon',
    description: 'Child item/card FontAwesome, Bootstrap, or image icon.'
  },
  {
    label: 'Card ImageUrl',
    scope: 'PageSectionList',
    fieldKey: 'ImageUrl',
    rawToken: '{{ PageSectionList.ImageUrl }}',
    token: '{{ PageSectionList.ImageUrl }}',
    valueFormat: 'url',
    description: 'Child item/card visual thumbnail URL.'
  },
  {
    label: 'Card Button',
    scope: 'PageSectionList',
    fieldKey: 'ButtonText',
    rawToken: '{{ PageSectionList.ButtonText }}',
    token: '<a href="{{ PageSectionList.ButtonLink }}" class="btn">{{ PageSectionList.ButtonText }}</a>',
    valueFormat: 'plain',
    description: 'Child item/card primary action button link.'
  },
  {
    label: 'Card Second Button',
    scope: 'PageSectionList',
    fieldKey: 'SecondButtonText',
    rawToken: '{{ PageSectionList.SecondButtonText }}',
    token: '{{#if PageSectionList.SecondButtonText}}\n  <a href="{{ PageSectionList.SecondButtonLink }}" class="btn-outline">{{ PageSectionList.SecondButtonText }}</a>\n{{/if}}',
    valueFormat: 'plain',
    description: 'Child item/card optional secondary action button.'
  }
];

/**
 * Returns visual editor toolbar token chips for Body Section templates.
 */
export function getBodySectionToolbarTokens(): Array<{ label: string; token: string; htmlSnippet?: string; description?: string }> {
  const excludedKeys = new Set(['SecondaryButtonText', 'SecondaryButtonLink', 'SecondImageUrl', 'Section Quote']);
  return [
    ...PAGE_SECTION_LIST_CANONICAL_TOKENS,
    ...PAGE_SECTION_CANONICAL_TOKENS.filter(t => !excludedKeys.has(t.label))
  ].map(({ label, token, htmlSnippet, description }) => ({ label, token, htmlSnippet, description }));
}

/**
 * Returns visual editor toolbar token chips for Hero Section & Slider templates.
 */
export function getHeroSectionToolbarTokens(): Array<{ label: string; token: string; htmlSnippet?: string; description?: string }> {
  const heroSlides: CanonicalTokenDefinition[] = [
    {
      label: 'Slider Track Loop',
      scope: 'Loop',
      fieldKey: 'PageSectionLists',
      rawToken: '{{#each PageSectionLists}}',
      token: '{{#each PageSectionLists}}\n<div class="slide">\n  <h1>{{ PageSectionList.Title }}</h1>\n  {{#if PageSectionList.Description}}<p>{{ PageSectionList.Description }}</p>{{/if}}\n</div>\n{{/each}}',
      valueFormat: 'loop',
      description: 'Multi-slide responsive carousel iteration.'
    },
    {
      label: 'Slide Title',
      scope: 'PageSectionList',
      fieldKey: 'Title',
      rawToken: '{{ PageSectionList.Title }}',
      token: '{{ PageSectionList.Title }}',
      valueFormat: 'plain',
      description: 'Current slide headline in PageSectionList.'
    },
    {
      label: 'Slide Subtitle',
      scope: 'PageSectionList',
      fieldKey: 'MiniTitle',
      rawToken: '{{ PageSectionList.MiniTitle }}',
      token: '{{ PageSectionList.MiniTitle }}',
      valueFormat: 'plain',
      description: 'Current slide kicker badge in PageSectionList.'
    },
    {
      label: 'Slide Description',
      scope: 'PageSectionList',
      fieldKey: 'Description',
      rawToken: '{{ PageSectionList.Description }}',
      token: '{{ PageSectionList.Description }}',
      valueFormat: 'plain',
      description: 'Current slide narrative text in PageSectionList.'
    },
    {
      label: 'Slide MoreDescription',
      scope: 'PageSectionList',
      fieldKey: 'MoreDescription',
      rawToken: '{{{ PageSectionList.MoreDescription }}}',
      token: '{{#if PageSectionList.MoreDescription}}\n  <div class="slide-rich-desc">\n    {{{ PageSectionList.MoreDescription }}}\n  </div>\n{{/if}}',
      valueFormat: 'richHtml',
      description: 'Current slide extended rich HTML copy in PageSectionList.MoreDescription.'
    },
    {
      label: 'Slide Icon',
      scope: 'PageSectionList',
      fieldKey: 'IconText',
      rawToken: '{{ PageSectionList.IconText }}',
      token: '<i class="{{ PageSectionList.IconText }}"></i>',
      valueFormat: 'icon',
      description: 'Current slide icon class in PageSectionList.'
    },
    {
      label: 'Slide Image',
      scope: 'PageSectionList',
      fieldKey: 'ImageUrl',
      rawToken: '{{ PageSectionList.ImageUrl }}',
      token: '{{ PageSectionList.ImageUrl }}',
      valueFormat: 'url',
      description: 'Current slide background visual in PageSectionList.'
    },
    {
      label: 'Slide Button',
      scope: 'PageSectionList',
      fieldKey: 'ButtonText',
      rawToken: '{{ PageSectionList.ButtonText }}',
      token: '{{ PageSectionList.ButtonText }}',
      valueFormat: 'plain',
      description: 'Current slide action button in PageSectionList.'
    },
    {
      label: 'Slide Second Button',
      scope: 'PageSectionList',
      fieldKey: 'SecondButtonText',
      rawToken: '{{ PageSectionList.SecondButtonText }}',
      token: '{{#if PageSectionList.SecondButtonText}}\n  <a href="{{ PageSectionList.SecondButtonLink }}" class="btn-secondary">{{ PageSectionList.SecondButtonText }}</a>\n{{/if}}',
      valueFormat: 'plain',
      description: 'Current slide secondary action button in PageSectionList.'
    }
  ];

  const parentHeroKeys = new Set([
    'Section Title',
    'Section MiniTitle',
    'Section Description',
    'Section FullDescription',
    'Section Icon',
    'ImageUrl',
    'ButtonText',
    'ButtonLink',
    'SecondaryButtonText',
    'SecondaryButtonLink'
  ]);

  const parentTokens = PAGE_SECTION_CANONICAL_TOKENS
    .filter(t => parentHeroKeys.has(t.label))
    .map(t => ({
      label: t.label === 'ImageUrl' ? 'Section ImageUrl' : t.label,
      token: t.label === 'Section Description' ? '{{ PageSection.Description }}' : t.token,
      htmlSnippet: t.htmlSnippet,
      description: t.description
    }));

  return [...heroSlides, ...parentTokens];
}

/**
 * Returns canonical raw token list consumed by AI surgical transformation rules.
 */
export function getBodySectionTargetPlaceholders(): string[] {
  return [
    ...PAGE_SECTION_CANONICAL_TOKENS.map(t => t.rawToken),
    '{{ PageSection.VideoUrl }}',
    '{{ PageSection.YoutubeUrlLink }}',
    '{{ PageSection.DirectUrl }}',
    '{{#each PageSectionLists}}',
    ...PAGE_SECTION_LIST_CANONICAL_TOKENS.filter(t => t.scope === 'PageSectionList').map(t => t.rawToken),
    '{{ PageSectionList.ButtonLink }}',
    '{{ PageSectionList.SecondButtonLink }}',
    '{{ PageSectionList.SortOrder }}',
    '{{ Form "Contact_Us" }}',
    '{{ CustomClass }}'
  ];
}

/**
 * Returns canonical raw token list consumed by Hero AI surgical transformation rules.
 */
export function getHeroSectionTargetPlaceholders(): string[] {
  return [
    '{{ PageSection.Title }}',
    '{{ PageSection.MiniTitle }}',
    '{{ PageSection.Description }}',
    '{{{ PageSection.FullDescription }}}',
    '{{ PageSection.ImageUrl }}',
    '{{ PageSection.SecondImageUrl }}',
    '{{ PageSection.VideoUrl }}',
    '{{ PageSection.YoutubeUrlLink }}',
    '{{ PageSection.ButtonText }}',
    '{{ PageSection.ButtonLink }}',
    '{{ PageSection.SecondButtonText }}',
    '{{ PageSection.SecondButtonLink }}',
    '{{#each PageSectionLists}}',
    '{{ PageSectionList.Title }}',
    '{{ PageSectionList.MiniTitle }}',
    '{{ PageSectionList.Description }}',
    '{{{ PageSectionList.MoreDescription }}}',
    '{{ PageSectionList.ImageUrl }}',
    '{{ PageSectionList.ButtonText }}',
    '{{ PageSectionList.ButtonLink }}',
    '{{ PageSectionList.SecondButtonText }}',
    '{{ PageSectionList.SecondButtonLink }}',
    '{{ CustomClass }}'
  ];
}

