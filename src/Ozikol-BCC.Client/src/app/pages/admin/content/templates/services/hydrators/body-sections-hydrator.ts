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
  output = resolveDepthAwareIf(output, 'MiniTitle', Boolean(ctx.miniTitle && ctx.miniTitle.trim().length > 0));
  output = resolveDepthAwareIf(output, 'ButtonText', Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0));
  output = resolveDepthAwareIf(output, 'SecondButtonText', Boolean(ctx.secondButtonText && ctx.secondButtonText.trim().length > 0));
  output = resolveDepthAwareIf(output, 'ImageUrl', Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'SecondImageUrl', Boolean(ctx.secondImageUrl && ctx.secondImageUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'VideoUrl', Boolean(ctx.videoUrl && ctx.videoUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'YoutubeUrlLink', Boolean(ctx.youtubeUrlLink && ctx.youtubeUrlLink.trim().length > 0));
  const quoteVal = (ctx.qoute || ctx.quote || '').trim();
  output = resolveDepthAwareIf(output, 'Qoute', quoteVal.length > 0);
  output = resolveDepthAwareIf(output, 'Quote', quoteVal.length > 0);

  // 3. Repeater Cards Loop: {{#each PageSectionLists}} or {{#each Items}}
  const rawItems = ctx.pageSectionLists || ctx.items || [];
  const activeItems = rawItems
    .filter((i: any) => i.publish !== false && i.disable !== true)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const cardMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:PageSectionLists|SectionLists|Items)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, cardMatcher, (innerTemplate) => {
    if (activeItems.length === 0) return '';

    return activeItems.map((item: any, idx: number) => {
      let rendered = innerTemplate;

      // Item Card Conditionals
      rendered = resolveDepthAwareIf(rendered, 'ImageUrl', Boolean(item.imageUrl && item.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'ButtonText', Boolean(item.buttonText && item.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Icon', Boolean(item.icon && item.icon.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'IconText', Boolean(item.iconText && item.iconText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'MoreDescription', Boolean(item.moreDescription && item.moreDescription.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'MiniTitle', Boolean(item.miniTitle && item.miniTitle.trim().length > 0));

      // Item Card Scalars
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, item.miniTitle || item.subTitle || '');
      rendered = rendered.replace(/\{\{\s*Description\s*\}\}/gi, item.description || '');
      rendered = rendered.replace(/\{\{\s*MoreDescription\s*\}\}/gi, item.moreDescription || '');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, item.icon || 'verified');
      rendered = rendered.replace(/\{\{\s*IconText\s*\}\}/gi, item.iconText || item.icon || 'verified');
      rendered = rendered.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || '');
      rendered = rendered.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || '#');
      rendered = rendered.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*VideoUrl\s*\}\}/gi, item.videoUrl || '');
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
  output = output.replace(/\{\{\s*Qoute\s*\}\}/gi, ctx.qoute || ctx.quote || '');
  output = output.replace(/\{\{\s*Quote\s*\}\}/gi, ctx.quote || ctx.qoute || '');
  output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
  output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
  output = output.replace(/\{\{\s*SecondButtonText\s*\}\}/gi, ctx.secondButtonText || '');
  output = output.replace(/\{\{\s*SecondButtonLink\s*\}\}/gi, ctx.secondButtonLink || '#');
  output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
  output = output.replace(/\{\{\s*SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
  output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
  output = output.replace(/\{\{\s*YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');
  output = output.replace(/\{\{\s*IconText\s*\}\}/gi, ctx.iconText || '');
  output = output.replace(/\{\{\s*DirectUrl\s*\}\}/gi, ctx.directUrl || '#');
  output = output.replace(/\{\{\s*BackgroundColor\s*\}\}/gi, ctx.backgroundColor || '');

  // 5. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 6. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
