import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens,
  injectDynamicForms
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Blog Feed ('blog').
 * Handles:
 * - Articles Loop: {{#each Articles}}
 * - Article Card Tokens: {{ Title }}, {{ Summary }}, {{ Category }}, {{ PublishedDate }}, {{ AuthorName }}, {{ Url }}, {{ CoverImageUrl }}, {{ CustomClass }}
 * - Blog Categories Loop: {{#each BlogCategories}} ({{ Name }}, {{ Count }}, {{ Url }})
 * - Tags Cloud Loop: {{#each Tags}} ({{ Name }}, {{ Url }})
 * - Dynamic Forms: {{ Form "..." }}
 */
export function hydrateBlogFeed(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Dynamic Forms Injection
  output = injectDynamicForms(output, ctx);

  // 2. Resolve Top-Level Conditionals
  output = resolveDepthAwareIf(output, 'MiniTitle', Boolean(ctx.miniTitle && ctx.miniTitle.trim().length > 0));
  output = resolveDepthAwareIf(output, 'Description', Boolean(ctx.description && ctx.description.trim().length > 0));
  output = resolveDepthAwareIf(output, 'ButtonText', Boolean(ctx.buttonText && ctx.buttonText.trim().length > 0));
  output = resolveDepthAwareIf(output, 'ButtonLink', Boolean(ctx.buttonLink && ctx.buttonLink.trim().length > 0));

  // 3. Articles Loop: {{#each Articles}}
  const rawArticles = ctx.articles || [];
  const activeArticles = rawArticles.filter(a => a.publish !== false);
  output = resolveDepthAwareIf(output, 'Articles', activeArticles.length > 0);

  const articleMatcher = (openTag: string) => {
    return /^\{\{#each\s+Articles\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, articleMatcher, (innerTemplate) => {
    if (activeArticles.length === 0) return '';

    return activeArticles.map((art: any) => {
      let rendered = innerTemplate;

      const coverImg = (art.coverImageUrl || art.CoverImageUrl || art.imageUrl || art.ImageUrl || '').trim();
      const summaryText = (art.summary || art.Summary || art.excerpt || art.Excerpt || art.description || art.Description || '').trim();
      const catText = (art.category || art.Category || 'General').trim();
      const authorText = (art.authorName || art.AuthorName || art.author || art.Author || 'Staff Writer').trim();
      const pubDate = (art.publishedDate || art.PublishedDate || art.date || art.Date || 'Recently').trim();
      const articleUrl = (art.url || art.Url || art.directUrl || art.DirectUrl || (art.id ? `/blog/${art.id}` : '#')).trim();
      const titleText = (art.title || art.Title || '').trim();

      rendered = resolveDepthAwareIf(rendered, 'CoverImageUrl', Boolean(coverImg.length > 0));
      rendered = resolveDepthAwareIf(rendered, 'ImageUrl', Boolean(coverImg.length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Summary', Boolean(summaryText.length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Category', Boolean(catText.length > 0));
      rendered = resolveDepthAwareIf(rendered, 'AuthorName', Boolean(authorText.length > 0));
      rendered = resolveDepthAwareIf(rendered, 'PublishedDate', Boolean(pubDate.length > 0));

      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, titleText);
      rendered = rendered.replace(/\{\{\s*Summary\s*\}\}/gi, summaryText);
      rendered = rendered.replace(/\{\{\s*Category\s*\}\}/gi, catText);
      rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, pubDate);
      rendered = rendered.replace(/\{\{\s*AuthorName\s*\}\}/gi, authorText);
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, articleUrl);
      rendered = rendered.replace(/\{\{\s*CoverImageUrl\s*\}\}/gi, coverImg);
      rendered = rendered.replace(/\{\{\s*ImageUrl\s*\}\}/gi, coverImg);
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, art.customClass || '');

      return rendered;
    }).join('\n');
  });

  // 4. Blog Categories Loop: {{#each BlogCategories}}
  const rawCategories = ctx.blogCategories || [];
  output = resolveDepthAwareIf(output, 'BlogCategories', rawCategories.length > 0);
  const categoryMatcher = (openTag: string) => {
    return /^\{\{#each\s+BlogCategories\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, categoryMatcher, (innerTemplate) => {
    if (rawCategories.length === 0) return '';
    return rawCategories.map(cat => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Name\s*\}\}/gi, cat.name || '');
      rendered = rendered.replace(/\{\{\s*Count\s*\}\}/gi, String(cat.count ?? 0));
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, cat.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, cat.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 5. Blog Tags Cloud Loop: {{#each Tags}}
  const rawTags = ctx.tags || [];
  output = resolveDepthAwareIf(output, 'Tags', rawTags.length > 0);
  const tagMatcher = (openTag: string) => {
    return /^\{\{#each\s+Tags\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, tagMatcher, (innerTemplate) => {
    if (rawTags.length === 0) return '';
    return rawTags.map(tag => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Name\s*\}\}/gi, tag.name || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, tag.url || '#');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, tag.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 6. Section Scalars & Action Button
  output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || '');
  output = output.replace(/\{\{\s*ButtonText\s*\}\}/gi, ctx.buttonText || 'View All Articles');
  output = output.replace(/\{\{\s*(?:ButtonLink|DirectUrl|BlogUrl)\s*\}\}/gi, ctx.buttonLink || ctx.directUrl || '/blog');

  // 7. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 8. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
