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

      // Parent PageSection conditionals inside slide loop
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)MiniTitle', Boolean(ctx.miniTitle || ctx.subTitle));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)ImageUrl', Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)ButtonText', Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)SecondaryButtonText', Boolean(ctx.secondaryButtonText && ctx.secondaryButtonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)Description', Boolean(ctx.description && ctx.description.trim().length > 0));

      // Parent PageSection tokens accessible inside slide loop via PageSection. or ../
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)Title\s*\}\}/gi, ctx.title || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:\.\.\/|PageSection\.)Description\s*\}?\}\}/gi, ctx.description || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)ButtonText\s*\}\}/gi, ctx.buttonText || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');

      // Slide Item Conditionals (matches {{#if PageSectionList.MiniTitle}} or {{#if MiniTitle}})
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?MiniTitle', Boolean(item.miniTitle || item.subTitle));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ImageUrl', Boolean(item.imageUrl && item.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ButtonText', Boolean(item.buttonText && item.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?SecondaryButtonText', Boolean(item.secondaryButtonText && item.secondaryButtonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?Icon', Boolean(item.icon && item.icon.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?Description', Boolean(item.description && item.description.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?MoreDescription', Boolean(item.moreDescription && item.moreDescription.trim().length > 0));

      // Slide Item Scalars (supports {{ PageSectionList.Title }}, {{ Title }}, {{ this.Title }})
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, item.miniTitle || item.subTitle || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:PageSectionList\.|this\.)?Description\s*\}?\}\}/gi, item.description || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:PageSectionList\.|this\.)?MoreDescription\s*\}?\}\}/gi, item.moreDescription || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?Icon\s*\}\}/gi, item.icon || 'star');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?IconText\s*\}\}/gi, item.iconText || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?ButtonText\s*\}\}/gi, item.buttonText || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?ButtonLink\s*\}\}/gi, item.buttonLink || '#');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?SecondaryButtonText\s*\}\}/gi, item.secondaryButtonText || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?SecondaryButtonLink\s*\}\}/gi, item.secondaryButtonLink || '#');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?ImageUrl\s*\}\}/gi, item.imageUrl || ctx.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?VideoUrl\s*\}\}/gi, item.videoUrl || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?DirectUrl\s*\}\}/gi, item.directUrl || '#');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?CustomClass\s*\}\}/gi, item.customClass || '');
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

  // 5. Headline Scalars (for Root Section - supports {{ Title }} or {{ PageSection.Title }})
  output = output.replace(/\{\{\s*(?:PageSection\.)?Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?Description\s*\}\}/gi, ctx.description || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?FullDescription\s*\}\}/gi, ctx.fullDescription || ctx.description || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?Qoute\s*\}\}/gi, ctx.qoute || '');

  // 6. Button Scalars (for Root Section)
  output = output.replace(/\{\{\s*(?:PageSection\.)?ButtonText\s*\}\}/gi, ctx.buttonText || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?ButtonLink\s*\}\}/gi, ctx.buttonLink || '#');
  output = output.replace(/\{\{\s*(?:PageSection\.)?SecondaryButtonText\s*\}\}/gi, ctx.secondaryButtonText || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?SecondaryButtonLink\s*\}\}/gi, ctx.secondaryButtonLink || '#');
  output = output.replace(/\{\{\s*(?:PageSection\.)?DirectUrl\s*\}\}/gi, ctx.directUrl || '#');

  // 7. Media Scalars (for Root Section)
  output = output.replace(/\{\{\s*(?:PageSection\.)?ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');

  // 8. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 9. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
