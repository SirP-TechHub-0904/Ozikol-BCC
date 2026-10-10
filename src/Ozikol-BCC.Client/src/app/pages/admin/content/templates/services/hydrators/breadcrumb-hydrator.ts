import {
  HydrationContext,
  resolveDepthAwareIf,
  replaceDepthAwareEach,
  replaceCommonScalars,
  scrubRemainingTokens
} from './hydration-core.utils';

/**
 * Dedicated Hydrator for Category: Breadcrumbs & Page Banner ('breadcrumb').
 * Handles:
 * - Banner Headline: {{ PageTitle }} or {{ Title }}
 * - Subtitle / Eyebrow: {{ SubTitle }} or {{ MiniTitle }} or {{ Description }}
 * - Background Image: {{ BackgroundImageUrl }} or {{ ImageUrl }}
 * - Breadcrumbs Trail Loop: {{#each Breadcrumbs}}
 *   Child Tokens: {{ Title }} (or {{ Label }}), {{ Url }}, {{ IsActive }}, {{ IsLast }}, {{ CustomClass }}
 *   Conditionals: {{#if IsActive}}, {{#if IsLast}}, {{#unless IsLast}}
 * - Root Tokens: {{ CustomClass }}
 */
export function hydrateBreadcrumb(template: string, ctx: HydrationContext): string {
  if (!template) return '';

  let output = template;

  // 1. Resolve Breadcrumbs Trail Array
  const trail = (ctx.breadcrumbs && ctx.breadcrumbs.length > 0)
    ? ctx.breadcrumbs
    : [
        { title: 'Home', url: '/', isActive: false },
        { title: ctx.pageTitle || ctx.title || 'Page', url: '#', isActive: true }
      ];

  const breadcrumbMatcher = (openTag: string) => {
    return /^\{\{#each\s+(?:Breadcrumbs|BreadcrumbTrail)\b[^}]*\}\}/i.test(openTag) ? { matched: true } : null;
  };

  // 2. Loop: {{#each Breadcrumbs}}
  output = replaceDepthAwareEach(output, breadcrumbMatcher, (innerTemplate) => {
    if (trail.length === 0) return '';

    return trail.map((crumb, idx) => {
      let rendered = innerTemplate;
      const isLast = idx === trail.length - 1;
      const isActive = Boolean(crumb.isActive || isLast);

      // Conditionals: {{#if IsActive}}, {{#if IsLast}}, {{#unless IsLast}}
      rendered = resolveDepthAwareIf(rendered, 'IsActive', isActive);
      rendered = resolveDepthAwareIf(rendered, 'IsLast', isLast);

      // Support unless IsLast
      rendered = rendered.replace(
        /\{\{#unless\s+IsLast\}\}([\s\S]*?)\{\{\/unless\}\}/gi,
        !isLast ? '$1' : ''
      );

      // Child Tokens
      rendered = rendered.replace(/\{\{\s*(?:Title|Label|Name)\s*\}\}/gi, crumb.title || '');
      rendered = rendered.replace(/\{\{\s*Url\s*\}\}/gi, crumb.url || '#');
      rendered = rendered.replace(/\{\{\s*IsActive\s*\}\}/gi, isActive ? 'active' : '');
      rendered = rendered.replace(/\{\{\s*CustomClass\s*\}\}/gi, crumb.customClass || '');

      return rendered;
    }).join('\n');
  });

  // 3. Banner Scalars
  const effectiveTitle = ctx.pageTitle || ctx.title || 'Corporate Journal & Insights';
  const effectiveSubTitle = ctx.subTitle || ctx.miniTitle || ctx.description || 'HOME / CURRENT PAGE';
  const effectiveBg = ctx.backgroundImageUrl || ctx.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80';

  output = output.replace(/\{\{\s*(?:PageTitle|Title)\s*\}\}/gi, effectiveTitle);
  output = output.replace(/\{\{\s*(?:SubTitle|Subtitle|MiniTitle|Description)\s*\}\}/gi, effectiveSubTitle);
  output = output.replace(/\{\{\s*(?:BackgroundImageUrl|ImageUrl)\s*\}\}/gi, effectiveBg);

  // 4. Common Brand Scalars & CustomClass
  output = replaceCommonScalars(output, ctx);

  // 5. Final scrub
  output = scrubRemainingTokens(output);

  return output;
}
