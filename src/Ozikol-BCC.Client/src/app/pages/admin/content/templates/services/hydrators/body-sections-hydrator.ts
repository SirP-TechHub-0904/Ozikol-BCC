import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens,
  injectDynamicForms
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Body Sections & Cards ('body' / 'bodysections').
 * Handles:
 * - Repeater Cards: {{#each PageSectionLists}} or {{#each Items}}
 * - Card Tokens: {{ Title }}, {{ Subtitle }}, {{ Description }}, {{ Icon }}, {{ IconText }}, {{ ButtonText }}, {{ ButtonLink }}, {{ ImageUrl }}, {{ DirectUrl }}, {{ CustomClass }}, {{ SortOrder }}
 * - Section Headlines: {{ Title }}, {{ MiniTitle }}, {{ Description }}, {{ ButtonText }}
 * - Dynamic Forms: {{ Form "..." }}
 */
export function hydrateBodySections(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Dynamic Forms Injection
  output = injectDynamicForms(output, ctx);

  // 2. Section Headline Conditionals
  output = resolveDepthAwareIf(output, 'ButtonText', Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0));
  output = resolveDepthAwareIf(output, 'ImageUrl', Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0));

  // 3. Repeater Cards Loop: {{#each PageSectionLists}} or {{#each Items}}
  const rawItems = ctx.items || [];
  const activeItems = rawItems
    .filter(i => i.publish !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const cardMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:PageSectionLists|Items)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, cardMatcher, (innerTemplate) => {
    if (activeItems.length === 0) return '';

    return activeItems.map((item, idx) => {
      let rendered = innerTemplate;

      // Item Card Conditionals
      rendered = resolveDepthAwareIf(rendered, 'ImageUrl', Boolean(item.imageUrl && item.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'ButtonText', Boolean(item.buttonText && item.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Icon', Boolean(item.icon && item.icon.trim().length > 0));

      // Item Card Scalars
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, item.miniTitle || item.subTitle || '');
      rendered = rendered.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, item.icon || 'verified');
      rendered = rendered.replace(/\{\{\s*IconText\s*\}\}/gi, item.iconText || '');
      rendered = rendered.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || '');
      rendered = rendered.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || '#');
      rendered = rendered.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*DirectUrl\s*\}\}/gi, item.directUrl || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
      rendered = rendered.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(item.sortOrder ?? idx + 1));

      return rendered;
    }).join('\n');
  });

  // 4. Section Level Scalars
  output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || '');
  output = output.replace(/\{\{\s*FullDescription\s*\}\}/gi, ctx.fullDescription || ctx.description || '');
  output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
  output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
  output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');

  // 5. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 6. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
