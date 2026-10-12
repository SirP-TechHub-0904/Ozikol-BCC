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

  // 3. Articles Loop: {{#each Articles}}
  const rawArticles = ctx.articles || [];
  const activeArticles = rawArticles.filter(a => a.publish !== false);
  output = resolveDepthAwareIf(output, 'Articles', activeArticles.length > 0);

  const articleMatcher = (openTag: string) => {
    return /^\{\{#each\s+Articles\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, articleMatcher, (innerTemplate) => {
    if (activeArticles.length === 0) return '';

    return activeArticles.map(art => {
      let rendered = innerTemplate;

      rendered = resolveDepthAwareIf(rendered, 'CoverImageUrl', Boolean(art.coverImageUrl && art.coverImageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Summary', Boolean(art.summary && art.summary.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'Category', Boolean(art.category && art.category.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'AuthorName', Boolean(art.authorName && art.authorName.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'PublishedDate', Boolean(art.publishedDate && art.publishedDate.trim().length > 0));

      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, art.title || '');
      rendered = rendered.replace(/\{\{\s*Summary\s*\}\}/gi, art.summary || '');
      rendered = rendered.replace(/\{\{\s*Category\s*\}\}/gi, art.category || 'General');
      rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, art.publishedDate || 'Recently');
      rendered = rendered.replace(/\{\{\s*AuthorName\s*\}\}/gi, art.authorName || 'Staff Writer');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, art.url || '#');
      rendered = rendered.replace(/\{\{\s*CoverImageUrl\s*\}\}/gi, art.coverImageUrl || '');
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

  // 6. Section Scalars
  output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*(?:MiniTitle|Subtitle|SubTitle)\s*\}\}/gi, ctx.miniTitle || ctx.subTitle || '');
  output = output.replace(/\{\{\s*Description\s*\}\}/gi, ctx.description || '');

  // 7. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 8. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
