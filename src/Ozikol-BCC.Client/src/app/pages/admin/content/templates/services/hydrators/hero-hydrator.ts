import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens,
  injectDynamicForms,
  hydrateIconTokens
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
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)(?:IconText|Icon)\s*\}\}/gi, ctx.iconText || '');

      // Slide Item Conditionals (matches {{#if PageSectionList.MiniTitle}} or {{#if MiniTitle}})
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?MiniTitle', Boolean(item.miniTitle || item.subTitle));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ImageUrl', Boolean(item.imageUrl && item.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ButtonText', Boolean(item.buttonText && item.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?SecondaryButtonText', Boolean(item.secondaryButtonText && item.secondaryButtonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?Icon', Boolean(item.icon && item.icon.trim().length > 0));
      const slideDesc = item.description || item.moreDescription || item.fullDescription || '';
      const slideFullDesc = item.fullDescription || item.moreDescription || item.description || '';

      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?Description', Boolean(slideDesc && slideDesc.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?(?:MoreDescription|FullDescription)', Boolean(slideFullDesc && slideFullDesc.trim().length > 0));

      // Slide Item Scalars (supports {{ PageSectionList.Title }}, {{ Title }}, {{ this.Title }})
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, item.miniTitle || item.subTitle || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:PageSectionList\.|this\.)?Description\s*\}?\}\}/gi, slideDesc);
      rendered = rendered.replace(/\{\{\{?\s*(?:PageSectionList\.|this\.)?(?:MoreDescription|FullDescription)\s*\}?\}\}/gi, slideFullDesc);

      // Polymorphic Slide Icon Replacement
      const slideIconVal = item.iconText || item.icon || '';
      if (slideIconVal) {
        rendered = hydrateIconTokens(rendered, '(?:PageSectionList\\.|this\\.)?(?:IconText|Icon)', slideIconVal, item.title || 'Slide Icon');
      }

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

  // 3. Section Headline & Media Conditionals (for Root Section)
  const hasHeroTitle = Boolean(ctx.title && ctx.title.trim().length > 0);
  const hasHeroMiniTitle = Boolean((ctx.miniTitle && ctx.miniTitle.trim().length > 0) || (ctx.subTitle && ctx.subTitle.trim().length > 0));
  const hasHeroDesc = Boolean((ctx.description && ctx.description.trim().length > 0) || (ctx.fullDescription && ctx.fullDescription.trim().length > 0));
  const hasHeroFullDesc = Boolean((ctx.fullDescription && ctx.fullDescription.trim().length > 0) || (ctx.description && ctx.description.trim().length > 0));
  const isHeroButtonDisabled = Boolean(ctx.disableButton || (ctx as any).DisableButton);
  const hasHeroButton = Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0 && !isHeroButtonDisabled);
  const hasHeroButtonLink = Boolean(ctx.buttonLink && ctx.buttonLink.trim().length > 0 && ctx.buttonLink !== '#' && !isHeroButtonDisabled);
  const hasHeroSecondButton = Boolean(((ctx.secondaryButtonText && ctx.secondaryButtonText.trim().length > 0) || (ctx.secondButtonText && ctx.secondButtonText.trim().length > 0)) && !isHeroButtonDisabled);
  const hasHeroSecondButtonLink = Boolean(((ctx.secondaryButtonLink && ctx.secondaryButtonLink.trim().length > 0 && ctx.secondaryButtonLink !== '#') || (ctx.secondButtonLink && ctx.secondButtonLink.trim().length > 0 && ctx.secondButtonLink !== '#')) && !isHeroButtonDisabled);
  const hasHeroImage = Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0);
  const hasHeroSecondImage = Boolean(ctx.secondImageUrl && ctx.secondImageUrl.trim().length > 0);
  const hasHeroVideo = Boolean(ctx.videoUrl && ctx.videoUrl.trim().length > 0);
  const hasHeroYoutube = Boolean(ctx.youtubeUrlLink && ctx.youtubeUrlLink.trim().length > 0);
  const hasHeroIcon = Boolean(ctx.iconText && ctx.iconText.trim().length > 0);

  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?Title', hasHeroTitle);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:MiniTitle|Subtitle|SubTitle)', hasHeroMiniTitle);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?Description', hasHeroDesc);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?FullDescription', hasHeroFullDesc);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?ButtonText', hasHeroButton);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?ButtonLink', hasHeroButtonLink);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:SecondaryButtonText|SecondButtonText)', hasHeroSecondButton);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:SecondaryButtonLink|SecondButtonLink)', hasHeroSecondButtonLink);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?ImageUrl', hasHeroImage);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?SecondImageUrl', hasHeroSecondImage);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?VideoUrl', hasHeroVideo);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?YoutubeUrlLink', hasHeroYoutube);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:IconText|Icon)', hasHeroIcon);

  // 4. Headline Scalars (for Root Section - supports {{ Title }} or {{ PageSection.Title }})
  output = output.replace(/\{\{\s*(?:PageSection\.)?Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\{?\s*(?:PageSection\.)?Description\s*\}?\}\}/gi, ctx.description || ctx.fullDescription || '');
  output = output.replace(/\{\{\{?\s*(?:PageSection\.)?FullDescription\s*\}?\}\}/gi, ctx.fullDescription || ctx.description || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:Quote|Qoute)\s*\}\}/gi, ctx.quote || ctx.qoute || '');

  // 5. Button Scalars (for Root Section)
  output = output.replace(/\{\{\s*(?:PageSection\.)?ButtonText\s*\}\}/gi, !isHeroButtonDisabled ? (ctx.buttonText || '') : '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?ButtonLink\s*\}\}/gi, !isHeroButtonDisabled ? (ctx.buttonLink || '#') : '#');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:SecondaryButtonText|SecondButtonText)\s*\}\}/gi, !isHeroButtonDisabled ? (ctx.secondaryButtonText || ctx.secondButtonText || '') : '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:SecondaryButtonLink|SecondButtonLink)\s*\}\}/gi, !isHeroButtonDisabled ? (ctx.secondaryButtonLink || ctx.secondButtonLink || '#') : '#');
  output = output.replace(/\{\{\s*(?:PageSection\.)?DirectUrl\s*\}\}/gi, ctx.directUrl || '#');

  // 6. Media & Icon Scalars (for Root Section)
  output = output.replace(/\{\{\s*(?:PageSection\.)?ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');
  if (ctx.iconText) {
    output = hydrateIconTokens(output, '(?:PageSection\\.)?(?:IconText|Icon)', ctx.iconText, ctx.title || 'Hero Icon');
  }

  // 8. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 9. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
