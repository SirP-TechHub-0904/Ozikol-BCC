import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens,
  injectDynamicForms
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Hero ('hero').
 * Handles:
 * - Slider Loops (for Hero Sliders / Carousels): {{#each PageSectionLists}}, {{#SectionLists}}, {{#each Slides}}, {{#each Items}}
 * - Child Slide Tokens: {{ Title }}, {{ MiniTitle }}, {{ Description }}, {{ MoreDescription }}, {{ ImageUrl }}, {{ ButtonText }}, {{ ButtonLink }}, {{ SecondaryButtonText }}, {{ SecondaryButtonLink }}, {{ CustomClass }}
 * - Root Headline scalars (for Static Hero banners): {{ Title }}, {{ MiniTitle }}, {{ SubTitle }}, {{ Description }}, {{ FullDescription }}, {{ Qoute }}
 * - Root Action buttons: {{ ButtonText }}, {{ ButtonLink }}, {{ SecondaryButtonText }}, {{ SecondaryButtonLink }}
 * - Root Media tokens: {{ ImageUrl }}, {{ SecondImageUrl }}, {{ VideoUrl }}, {{ YoutubeUrlLink }}
 * - Conditionals: {{#if ImageUrl}}, {{#if VideoUrl}}, {{#if ButtonText}}, {{#if SecondaryButtonText}}
 * - Form Injections: {{ Form "..." }}
 * - Root Section CustomClass: {{ CustomClass }}
 */
export function hydrateHero(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Dynamic Forms Injection
  output = injectDynamicForms(output, ctx);

  // 2. Slider / Carousel Loop Hydration: {{#each PageSectionLists}} or {{#SectionLists}} or {{#each Slides}}
  const rawItems: any[] = ctx.items || (ctx as any).pageSectionLists || (ctx as any).slides || [];
  const activeItems = rawItems
    .filter((i: any) => i.publish !== false)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const slideLoopMatcher = (openTag: string) => {
    return /^\{\{#(?:each\s+)?(?:PageSectionLists|SectionLists|Slides|Items)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, slideLoopMatcher, (innerTemplate) => {
    if (activeItems.length === 0) return '';

    return activeItems.map((item: any, idx: number) => {
      let rendered = innerTemplate;

      // Slide Loop Conditionals (@first, @last)
      rendered = rendered.replace(/\{\{#if\s+@first\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, c) => idx === 0 ? c : '');
      rendered = rendered.replace(/\{\{#if\s+@last\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_m, c) => idx === activeItems.length - 1 ? c : '');
      rendered = rendered.replace(/\{\{\s*@first\s*\}\}/gi, idx === 0 ? 'true' : 'false');
      rendered = rendered.replace(/\{\{\s*@last\s*\}\}/gi, idx === activeItems.length - 1 ? 'true' : 'false');
      rendered = rendered.replace(/\{\{\s*@activeClass\s*\}\}/gi, idx === 0 ? 'active' : '');

      // Slide Item Conditionals
      rendered = resolveDepthAwareIf(rendered, 'MiniTitle', Boolean(item.miniTitle || item.subTitle));
      rendered = resolveDepthAwareIf(rendered, 'ImageUrl', Boolean(item.imageUrl && item.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'ButtonText', Boolean(item.buttonText && item.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'SecondaryButtonText', Boolean(item.secondaryButtonText && item.secondaryButtonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Icon', Boolean(item.icon && item.icon.trim().length > 0));

      // Slide Item Scalars
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, item.miniTitle || item.subTitle || '');
      rendered = rendered.replace(/\{\{\{?\s*Description\s*\}?\}\}/gi, item.description || '');
      rendered = rendered.replace(/\{\{\{?\s*MoreDescription\s*\}?\}\}/gi, item.moreDescription || '');
      rendered = rendered.replace(/\{\{\s*Icon\s*\}\}/gi, item.icon || 'star');
      rendered = rendered.replace(/\{\{\s*IconText\s*\}\}/gi, item.iconText || '');
      rendered = rendered.replace(/\{\{\s*ButtonText\s*\}\}/gi, item.buttonText || '');
      rendered = rendered.replace(/\{\{\s*ButtonLink\s*\}\}/gi, item.buttonLink || '#');
      rendered = rendered.replace(/\{\{\s*SecondaryButtonText\s*\}\}/gi, item.secondaryButtonText || '');
      rendered = rendered.replace(/\{\{\s*SecondaryButtonLink\s*\}\}/gi, item.secondaryButtonLink || '#');
      rendered = rendered.replace(/\{\{\s*ImageUrl\s*\}\}/gi, item.imageUrl || ctx.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*VideoUrl\s*\}\}/gi, item.videoUrl || '');
      rendered = rendered.replace(/\{\{\s*DirectUrl\s*\}\}/gi, item.directUrl || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, item.customClass || '');
      rendered = rendered.replace(/\{\{\s*@index\s*\}\}/gi, String(idx));
      rendered = rendered.replace(/\{\{\s*@number\s*\}\}/gi, String(idx + 1));

      return rendered;
    }).join('\n');
  });

  // 3. Media Conditionals (for Root Section)
  output = resolveDepthAwareIf(output, 'ImageUrl', Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'SecondImageUrl', Boolean(ctx.secondImageUrl && ctx.secondImageUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'VideoUrl', Boolean(ctx.videoUrl && ctx.videoUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'YoutubeUrlLink', Boolean(ctx.youtubeUrlLink && ctx.youtubeUrlLink.trim().length > 0));

  // 4. Action Button Conditionals (for Root Section)
  output = resolveDepthAwareIf(output, 'ButtonText', Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0));
  output = resolveDepthAwareIf(output, 'SecondaryButtonText', Boolean(ctx.secondaryButtonText && ctx.secondaryButtonText.trim().length > 0));

  // 5. Headline Scalars (for Root Section)
  output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || '');
  output = output.replace(/\{\{\s*FullDescription\s*\}\}/gi, ctx.fullDescription || ctx.description || '');
  output = output.replace(/\{\{\s*Qoute\s*\}\}/gi, ctx.qoute || '');

  // 6. Button Scalars (for Root Section)
  output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || '');
  output = output.replace(/\{\{\s*ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
  output = output.replace(/\{\{\s*SecondaryButtonText\s*\}\}/gi, ctx.secondaryButtonText || '');
  output = output.replace(/\{\{\s*SecondaryButtonLink\s*\}\}/gi, ctx.secondaryButtonLink || '#');
  output = output.replace(/\{\{\s*DirectUrl\s*\}\}/gi, ctx.directUrl || '#');

  // 7. Media Scalars (for Root Section)
  output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
  output = output.replace(/\{\{\s*SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
  output = output.replace(/\{\{\s*VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
  output = output.replace(/\{\{\s*YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');

  // 8. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 9. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
