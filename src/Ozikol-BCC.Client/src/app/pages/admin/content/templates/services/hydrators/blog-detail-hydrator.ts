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
 * - Article Content & Body: {{{ Body }}}, {{{ FullDescription }}}, {{{ Content }}}, {{ Title }}, {{ Summary }}
 * - Author Metadata: {{ AuthorName }}, {{ AuthorRole }}, {{ AuthorAvatarUrl }}, {{ AuthorBio }}
 * - Publication & Taxonomy: {{ Category }}, {{ PublishedDate }}, {{ ReadingTime }}, {{ CoverImageUrl }}
 * - Tags Cloud Loop: {{#each Tags}}
 * - Related Articles Loop: {{#each RecentArticles}}
 * - Dynamic Form Embeds (Comments / Responses): {{ Form "Comment_Submit" }}
 */
export function hydrateBlogDetail(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Dynamic Forms Injection (handles {{ Form "Comment_Submit" }}, etc.)
  output = injectDynamicForms(output, ctx);

  // 2. Conditionals Resolution
  const resolvedCategory = (ctx.category || '').trim();
  const resolvedSummary = (ctx.summary || ctx.description || ctx.articleLead || '').trim();
  const resolvedCoverImage = (ctx.coverImageUrl || ctx.imageUrl || '').trim();
  const resolvedAuthorAvatar = (ctx.authorAvatarUrl || ctx.authorAvatar || '').trim();
  const resolvedAuthorBio = (ctx.authorBio || '').trim();
  const resolvedAuthorRole = (ctx.authorRole || ctx.authorTitle || '').trim();
  const resolvedPublishedDate = (ctx.publishedDate || ctx.publishDate || '').trim();
  const resolvedReadingTime = (ctx.readingTime || ctx.readTime || '').trim();

  const hasCategory = resolvedCategory.length > 0;
  const hasSummary = resolvedSummary.length > 0;
  const hasCoverImage = resolvedCoverImage.length > 0;
  const hasAuthorAvatar = resolvedAuthorAvatar.length > 0;
  const hasAuthorBio = resolvedAuthorBio.length > 0;
  const hasAuthorRole = resolvedAuthorRole.length > 0;
  const hasPublishedDate = resolvedPublishedDate.length > 0;
  const hasReadingTime = resolvedReadingTime.length > 0;

  output = resolveDepthAwareIf(output, 'Category', hasCategory);
  output = resolveDepthAwareIf(output, 'Summary', hasSummary);
  output = resolveDepthAwareIf(output, 'ArticleLead', hasSummary);
  output = resolveDepthAwareIf(output, 'CoverImageUrl', hasCoverImage);
  output = resolveDepthAwareIf(output, 'ImageUrl', hasCoverImage);
  output = resolveDepthAwareIf(output, 'AuthorAvatarUrl', hasAuthorAvatar);
  output = resolveDepthAwareIf(output, 'AuthorAvatar', hasAuthorAvatar);
  output = resolveDepthAwareIf(output, 'AuthorBio', hasAuthorBio);
  output = resolveDepthAwareIf(output, 'AuthorRole', hasAuthorRole);
  output = resolveDepthAwareIf(output, 'PublishedDate', hasPublishedDate);
  output = resolveDepthAwareIf(output, 'ReadingTime', hasReadingTime);
  output = resolveDepthAwareIf(output, 'ReadTime', hasReadingTime);

  // 3. Article Tags Cloud Loop: {{#each Tags}}
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

  // 4. Related / Recent Articles Loop: {{#each RecentArticles}}
  const rawRecent = ctx.recentArticles || [];
  output = resolveDepthAwareIf(output, 'RecentArticles', rawRecent.length > 0);
  const recentMatcher = (openTag: string) => {
    return /^\{\{#each\s+RecentArticles\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, recentMatcher, (innerTemplate) => {
    if (rawRecent.length === 0) return '';
    return rawRecent.map(art => {
      let rendered = innerTemplate;
      rendered = resolveDepthAwareIf(rendered, 'CoverImageUrl', Boolean(art.coverImageUrl && art.coverImageUrl.trim().length > 0));
      rendered = resolveDepthAwareIf(rendered, 'PublishedDate', Boolean(art.publishedDate && art.publishedDate.trim().length > 0));
      rendered = rendered.replace(/\{\{\s*Title\s*\}\}/gi, art.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, art.url || '#');
      rendered = rendered.replace(/\{\{\s*PublishedDate\s*\}\}/gi, art.publishedDate || 'Recently');
      rendered = rendered.replace(/\{\{\s*CoverImageUrl\s*\}\}/gi, art.coverImageUrl || '');
      return rendered;
    }).join('\n');
  });

  // 5. Sidebar Categories Loop: {{#each BlogCategories}}
  const rawCategories = ctx.blogCategories || [];
  output = resolveDepthAwareIf(output, 'BlogCategories', rawCategories.length > 0);
  const catMatcher = (openTag: string) => {
    return /^\{\{#each\s+BlogCategories\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  output = replaceDepthAwareEach(output, catMatcher, (innerTemplate) => {
    if (rawCategories.length === 0) return '';
    return rawCategories.map(cat => {
      let rendered = innerTemplate;
      rendered = resolveDepthAwareIf(rendered, 'Count', Boolean(cat.count !== undefined && cat.count !== null));
      rendered = rendered.replace(/\{\{\s*Name\s*\}\}/gi, cat.name || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, cat.url || '#');
      rendered = rendered.replace(/\{\{\s*Count\s*\}\}/gi, String(cat.count ?? ''));
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, cat.customClass || '');
      return rendered;
    }).join('\n');
  });

  // 6. Article Content & Body (Triple-mustaches first to preserve HTML tags; no summary/description fallback)
  const resolvedBody = ctx.body || ctx.fullDescription || ctx.content || '<p>Article content goes here.</p>';
  output = output.replace(/\{\{\{\s*(?:Body|FullDescription|Content)\s*\}\}\}/gi, resolvedBody);
  output = output.replace(/\{\{\s*(?:Body|FullDescription|Content)\s*\}\}/gi, resolvedBody);

  // 6. Article Headline & Excerpt Scalars
  const resolvedTitle = ctx.title || ctx.articleHeadline || 'Untitled Article';
  output = output.replace(/\{\{\s*(?:Title|ArticleHeadline|Headline)\s*\}\}/gi, resolvedTitle);

  output = output.replace(/\{\{\s*(?:Summary|ArticleLead|Lead|Excerpt)\s*\}\}/gi, resolvedSummary);

  // 7. Category & Meta Scalars
  output = output.replace(/\{\{\s*Category\s*\}\}/gi, ctx.category || 'Insights');
  output = output.replace(/\{\{\s*(?:PublishedDate|PublishDate)\s*\}\}/gi, ctx.publishedDate || ctx.publishDate || 'Recently Published');
  output = output.replace(/\{\{\s*(?:ReadingTime|ReadTime)\s*\}\}/gi, ctx.readingTime || ctx.readTime || '5 min read');

  // 8. Featured Cover Image
  output = output.replace(/\{\{\s*(?:CoverImageUrl|ImageUrl)\s*\}\}/gi, resolvedCoverImage);

  // 9. Author Metadata Scalars
  output = output.replace(/\{\{\s*AuthorName\s*\}\}/gi, ctx.authorName || 'Staff Writer');
  output = output.replace(/\{\{\s*(?:AuthorRole|AuthorTitle)\s*\}\}/gi, ctx.authorRole || ctx.authorTitle || 'Contributing Author');
  output = output.replace(/\{\{\s*(?:AuthorAvatarUrl|AuthorAvatar)\s*\}\}/gi, ctx.authorAvatarUrl || ctx.authorAvatar || '');
  output = output.replace(/\{\{\s*AuthorBio\s*\}\}/gi, ctx.authorBio || '');

  // 10. Replace Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 11. Final scrub of remaining unprocessed tokens
  output = scrubRemainingTokens(output);

  return output;
}
