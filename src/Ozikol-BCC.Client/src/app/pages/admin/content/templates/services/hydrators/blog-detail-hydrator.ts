import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens,
  injectDynamicForms
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Blog Article Details ('blog_detail').
 * Handles:
 * - Article Body: {{ FullDescription }}, {{ Summary }}, {{ Title }}
 * - Author Metadata: {{ AuthorName }}, {{ AuthorBio }}, {{ AuthorAvatarUrl }}, {{ AuthorRole }}, {{ PublishedDate }}
 * - Tags Cloud: {{#each Tags}}
 * - Related Articles: {{#each RecentArticles}}
 * - Dynamic Forms (Comments, Newsletter): {{ Form "..." }}
 */
export function hydrateBlogDetail(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Dynamic Forms Injection
  output = injectDynamicForms(output, ctx);

  // 2. Author & Cover Conditionals
  output = resolveDepthAwareIf(output, 'AuthorAvatarUrl', Boolean(ctx.authorAvatarUrl && ctx.authorAvatarUrl.trim().length > 0));
  output = resolveDepthAwareIf(output, 'AuthorBio', Boolean(ctx.authorBio && ctx.authorBio.trim().length > 0));
  output = resolveDepthAwareIf(output, 'ImageUrl', Boolean(ctx.imageUrl && ctx.imageUrl.trim().length > 0));

  // 3. Article Tags Cloud Loop: {{#each Tags}}
  const rawTags = ctx.tags || [];
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

  // 4. Related / Recent Articles Loop: {{#each RecentArticles}}
  const rawRecent = ctx.recentArticles || [];
  const recentMatcher = (openTag: string) => {
    return /^\{\{#each\s+RecentArticles\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, recentMatcher, (innerTemplate) => {
    if (rawRecent.length === 0) return '';
    return rawRecent.map(art => {
      let rendered = innerTemplate;
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, art.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, art.url || '#');
      rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, art.publishedDate || 'Recently');
      rendered = rendered.replace(/\{\{\s*CoverImageUrl\s*\}\}/gi, art.coverImageUrl || '');
      return rendered;
    }).join('\n');
  });

  // 5. Article & Author Scalars
  output = output.replace(/\{\{\s*Title\s*\}\}/gi, ctx.title || '');
  output = output.replace(/\{\{\s*FullDescription\s*\}\}/gi, ctx.fullDescription || ctx.description || '');
  output = output.replace(/\{\{\s*Summary\s*\}\}/gi, ctx.description || '');
  output = output.replace(/\{\{\s*AuthorName\s*\}\}/gi, ctx.authorName || 'Staff Writer');
  output = output.replace(/\{\{\s*AuthorBio\s*\}\}/gi, ctx.authorBio || '');
  output = output.replace(/\{\{\s*AuthorAvatarUrl\s*\}\}/gi, ctx.authorAvatarUrl || '');
  output = output.replace(/\{\{\s*AuthorRole\s*\}\}/gi, ctx.authorRole || 'Author');
  output = output.replace(/\{\{\s*PublishedDate\s*\}\}/gi, ctx.publishedDate || 'Recently');
  output = output.replace(/\{\{\s*ImageUrl\s*\}\}/gi, ctx.imageUrl || '');

  // 6. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 7. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
