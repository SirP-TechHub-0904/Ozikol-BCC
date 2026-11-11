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
  const hasTitle = Boolean(ctx.title && ctx.title.trim().length > 0);
  const hasMiniTitle = Boolean((ctx.miniTitle && ctx.miniTitle.trim().length > 0) || (ctx.subTitle && ctx.subTitle.trim().length > 0));
  const hasDesc = Boolean((ctx.description && ctx.description.trim().length > 0) || (ctx.fullDescription && ctx.fullDescription.trim().length > 0));
  const hasFullDesc = Boolean((ctx.fullDescription && ctx.fullDescription.trim().length > 0) || (ctx.description && ctx.description.trim().length > 0));
  const isButtonDisabled = Boolean(ctx.disableButton || (ctx as any).DisableButton);
  const hasButton = Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0 && !isButtonDisabled);
  const hasButtonLink = Boolean(ctx.buttonLink && ctx.buttonLink.trim().length > 0 && ctx.buttonLink !== '#' && !isButtonDisabled);
  const hasSecondButton = Boolean(((ctx.secondButtonText && ctx.secondButtonText.trim().length > 0) || (ctx.secondaryButtonText && ctx.secondaryButtonText.trim().length > 0)) && !isButtonDisabled);
  const hasSecondButtonLink = Boolean(((ctx.secondButtonLink && ctx.secondButtonLink.trim().length > 0 && ctx.secondButtonLink !== '#') || (ctx.secondaryButtonLink && ctx.secondaryButtonLink.trim().length > 0 && ctx.secondaryButtonLink !== '#')) && !isButtonDisabled);
  const hasImage = Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0);
  const hasSecondImage = Boolean(ctx.secondImageUrl && ctx.secondImageUrl.trim().length > 0);
  const hasVideo = Boolean(ctx.videoUrl && ctx.videoUrl.trim().length > 0);
  const hasYoutube = Boolean(ctx.youtubeUrlLink && ctx.youtubeUrlLink.trim().length > 0);
  const hasIcon = Boolean(ctx.iconText && ctx.iconText.trim().length > 0);
  const quoteVal = (ctx.qoute || ctx.quote || '').trim();
  const hasQuote = quoteVal.length > 0;

  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?Title', hasTitle);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:MiniTitle|Subtitle|SubTitle)', hasMiniTitle);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?Description', hasDesc);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?FullDescription', hasFullDesc);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?ButtonText', hasButton);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?ButtonLink', hasButtonLink);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:SecondButtonText|SecondaryButtonText)', hasSecondButton);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:SecondButtonLink|SecondaryButtonLink)', hasSecondButtonLink);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?ImageUrl', hasImage);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?SecondImageUrl', hasSecondImage);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?VideoUrl', hasVideo);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?YoutubeUrlLink', hasYoutube);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:IconText|Icon)', hasIcon);
  output = resolveDepthAwareIf(output, '(?:PageSection\\.)?(?:Quote|Qoute)', hasQuote);

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

      // Parent PageSection conditionals inside loop
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)Title', hasTitle);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)(?:MiniTitle|Subtitle|SubTitle)', hasMiniTitle);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)Description', hasDesc);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)FullDescription', hasFullDesc);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)ImageUrl', hasImage);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)ButtonText', hasButton);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)ButtonLink', hasButtonLink);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)(?:SecondButtonText|SecondaryButtonText)', hasSecondButton);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)(?:SecondButtonLink|SecondaryButtonLink)', hasSecondButtonLink);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSection\\.|\\.\\.\\/)(?:IconText|Icon)', hasIcon);

      // Parent PageSection tokens accessible inside loop via PageSection. or ../
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)Title\s*\}\}/gi, ctx.title || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:\.\.\/|PageSection\.)Description\s*\}?\}\}/gi, ctx.description || ctx.fullDescription || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:\.\.\/|PageSection\.)FullDescription\s*\}?\}\}/gi, ctx.fullDescription || ctx.description || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)ButtonText\s*\}\}/gi, !isButtonDisabled ? (ctx.buttonText || '') : '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)ButtonLink\s*\}\}/gi, !isButtonDisabled ? (ctx.buttonLink || '#') : '#');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)(?:SecondButtonText|SecondaryButtonText)\s*\}\}/gi, !isButtonDisabled ? (ctx.secondButtonText || ctx.secondaryButtonText || '') : '');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)(?:SecondButtonLink|SecondaryButtonLink)\s*\}\}/gi, !isButtonDisabled ? (ctx.secondButtonLink || ctx.secondaryButtonLink || '#') : '#');
      rendered = rendered.replace(/\{\{\s*(?:\.\.\/|PageSection\.)(?:IconText|Icon)\s*\}\}/gi, ctx.iconText || '');

      // Loop Index Conditionals (@first, @last)
      const isFirst = idx === 0;
      const isLast = idx === activeItems.length - 1;
      const indexNumber = idx + 1;
      const itemId = item.id || `item-${indexNumber}`;

      rendered = resolveDepthAwareIf(rendered, '@first', isFirst);
      rendered = resolveDepthAwareIf(rendered, '@last', isLast);
      rendered = rendered.replace(/\{\{#unless\s+@first\}\}([\s\S]*?)\{\{\/unless\}\}/gi, isFirst ? '' : '$1');
      rendered = rendered.replace(/\{\{#unless\s+@last\}\}([\s\S]*?)\{\{\/unless\}\}/gi, isLast ? '' : '$1');

      // Item Card Conditionals (matches {{#if PageSectionList.MiniTitle}} or {{#if MiniTitle}})
      const itemDesc = item.description || item.moreDescription || item.fullDescription || '';
      const itemFullDesc = item.fullDescription || item.moreDescription || item.description || '';
      const hasItemDesc = Boolean(itemDesc && itemDesc.trim().length > 0);
      const hasItemFullDesc = Boolean(itemFullDesc && itemFullDesc.trim().length > 0);

      const hasItemButtonLink = Boolean(item.buttonLink && item.buttonLink.trim().length > 0 && item.buttonLink !== '#');
      const hasItemSecondButton = Boolean((item.secondButtonText && item.secondButtonText.trim().length > 0) || (item.secondaryButtonText && item.secondaryButtonText.trim().length > 0));
      const hasItemSecondButtonLink = Boolean((item.secondButtonLink && item.secondButtonLink.trim().length > 0 && item.secondButtonLink !== '#') || (item.secondaryButtonLink && item.secondaryButtonLink.trim().length > 0 && item.secondaryButtonLink !== '#'));

      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ImageUrl', Boolean(item.imageUrl && item.imageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ButtonText', Boolean(item.buttonText && item.buttonText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?ButtonLink', hasItemButtonLink);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?(?:SecondButtonText|SecondaryButtonText)', hasItemSecondButton);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?(?:SecondButtonLink|SecondaryButtonLink)', hasItemSecondButtonLink);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?Icon', Boolean(item.icon && item.icon.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?IconText', Boolean(item.iconText && item.iconText.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?MiniTitle', Boolean(item.miniTitle && item.miniTitle.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?Description', hasItemDesc);
      rendered = resolveDepthAwareIf(rendered, '(?:PageSectionList\\.|this\\.)?(?:MoreDescription|FullDescription)', hasItemFullDesc);

      // Item Card Scalars (supports {{ Title }}, {{ PageSectionList.Title }}, {{ this.Title }})
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?Title\s*\}\}/gi, item.title || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, item.miniTitle || item.subTitle || '');
      rendered = rendered.replace(/\{\{\{?\s*(?:PageSectionList\.|this\.)?Description\s*\}?\}\}/gi, itemDesc);
      rendered = rendered.replace(/\{\{\{?\s*(?:PageSectionList\.|this\.)?(?:MoreDescription|FullDescription)\s*\}?\}\}/gi, itemFullDesc);

      // Polymorphic Icon Replacement (handles <img> tags, class attributes, and standalone tokens)
      const itemIconVal = item.iconText || item.icon || '';
      if (itemIconVal) {
        rendered = hydrateIconTokens(rendered, '(?:PageSectionList\\.|this\\.)?(?:IconText|Icon)', itemIconVal, item.title || 'Item Icon');
      }

      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?ButtonText\s*\}\}/gi, item.buttonText || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?ButtonLink\s*\}\}/gi, item.buttonLink || '#');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?(?:SecondButtonText|SecondaryButtonText)\s*\}\}/gi, item.secondButtonText || item.secondaryButtonText || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?(?:SecondButtonLink|SecondaryButtonLink)\s*\}\}/gi, item.secondButtonLink || item.secondaryButtonLink || '#');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?ImageUrl\s*\}\}/gi, item.imageUrl || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?VideoUrl\s*\}\}/gi, item.videoUrl || '');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?DirectUrl\s*\}\}/gi, item.directUrl || '#');
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.|this\.)?CustomClass\s*\}\}/gi, item.customClass || '');
      rendered = rendered.replace(/\{\{\s*@index\s*\}\}/gi, String(idx));
      rendered = rendered.replace(/\{\{\s*(?:@number|Index)\s*\}\}/gi, String(indexNumber));
      rendered = rendered.replace(/\{\{\s*(?:PageSectionList\.)?(?:Id|UniqueId)\s*\}\}/gi, String(itemId));
      rendered = rendered.replace(/\{\{\s*SortOrder\s*\}\}/gi, String(item.sortOrder ?? indexNumber));

      return rendered;
    }).join('\n');
  });

  // 4. Section Level Scalars (supports {{ Title }} or {{ PageSection.Title }})
  output = output.replace(/\{\{\s*(?:PageSection\.)?Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\{?\s*(?:PageSection\.)?Description\s*\}?\}\}/gi, ctx.description || ctx.fullDescription || '');
  output = output.replace(/\{\{\{?\s*(?:PageSection\.)?FullDescription\s*\}?\}\}/gi, ctx.fullDescription || ctx.description || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:Quote|Qoute)\s*\}\}/gi, ctx.quote || ctx.qoute || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?ButtonText\s*\}\}/gi, !isButtonDisabled ? (ctx.buttonText || '') : '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?ButtonLink\s*\}\}/gi, !isButtonDisabled ? (ctx.buttonLink || '#') : '#');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:SecondButtonText|SecondaryButtonText)\s*\}\}/gi, !isButtonDisabled ? (ctx.secondButtonText || ctx.secondaryButtonText || '') : '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?(?:SecondButtonLink|SecondaryButtonLink)\s*\}\}/gi, !isButtonDisabled ? (ctx.secondButtonLink || ctx.secondaryButtonLink || '#') : '#');
  output = output.replace(/\{\{\s*(?:PageSection\.)?ImageUrl\s*\}\}/gi, ctx.imageUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?SecondImageUrl\s*\}\}/gi, ctx.secondImageUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?VideoUrl\s*\}\}/gi, ctx.videoUrl || '');
  output = output.replace(/\{\{\s*(?:PageSection\.)?YoutubeUrlLink\s*\}\}/gi, ctx.youtubeUrlLink || '');
  if (ctx.iconText) {
    output = hydrateIconTokens(output, '(?:PageSection\\.)?(?:IconText|Icon)', ctx.iconText, ctx.title || 'Section Icon');
  }
  output = output.replace(/\{\{\s*DirectUrl\s*\}\}/gi, ctx.directUrl || '#');
  output = output.replace(/\{\{\s*BackgroundColor\s*\}\}/gi, ctx.backgroundColor || '');

  // 5. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 6. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
