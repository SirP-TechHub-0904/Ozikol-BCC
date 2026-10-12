import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Blog Post Article Details ('blog_detail' / 'blog-detail').
 */
export class BlogDetailAiRule implements ICategoryAiRule {
  readonly categoryKey = 'blog_detail';
  readonly displayName = 'Blog Detail';

  readonly targetPlaceholders: string[] = [
    '{{ Title }}',
    '{{ ArticleHeadline }}',
    '{{ Summary }}',
    '{{ ArticleLead }}',
    '{{{ Body }}}',
    '{{{ FullDescription }}}',
    '{{{ Content }}}',
    '{{ Category }}',
    '{{ PublishedDate }}',
    '{{ ReadingTime }}',
    '{{ CoverImageUrl }}',
    '{{ ImageUrl }}',
    '{{ AuthorName }}',
    '{{ AuthorRole }}',
    '{{ AuthorAvatarUrl }}',
    '{{ AuthorAvatar }}',
    '{{ AuthorBio }}',
    '{{#each Tags}}',
    '{{ Name }}',
    '{{ Url }}',
    '{{#each BlogCategories}}',
    '{{ Count }}',
    '{{#each RecentArticles}}',
    '{{ Form "Comment_Submit" }}',
    '{{ Form "Newsletter_Subscribe" }}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Single Article / Blog Post Details.
Your mission is to replace static article headlines, metadata, editorial body content, author profile cards, tag clouds, and comment sections with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Article Headline & Meta:
   - Category Badge / Pill: {{#if Category}}<span class="[original category classes]">{{ Category }}</span>{{/if}}
   - Published Date: {{#if PublishedDate}}<span class="[original date classes]">{{ PublishedDate }}</span>{{/if}}
   - Estimated Reading Time: {{#if ReadingTime}}<span class="[original time classes]">{{ ReadingTime }}</span>{{/if}}
   - Main Article Headline (H1 / Title): <h1 class="[original title classes]">{{ Title }}</h1>
     * Note: If animation libraries (GSAP, SplitText) split words into character divs (e.g. <div>I</div><div>n</div>...), collapse them cleanly into {{ Title }}.
   - Lead Narrative / Subtitle / Excerpt:
     {{#if Summary}}
       <p class="[original lead classes]">{{ Summary }}</p>
     {{/if}}

2. Featured Cover Image:
   Look for the hero/header cover image for the article:
   {{#if CoverImageUrl}}
     <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original image classes]" />
   {{/if}}
   * Or if styled as a CSS background-image: style="background-image: url('{{ CoverImageUrl }}');"

3. Editorial Article Body:
   Look for the main reading container (.entry-content, .post-content, .article-body, .blog-details-content, etc.).
   Replace the static paragraphs, sample text, and mock article copy with the unescaped body token:
   <div class="[original body container classes]">
     {{{ Body }}}
   </div>

4. Author Profile Card / Signature Strip:
   Look for author byline, author box, or writer profile card:
   - Author Avatar Image:
     {{#if AuthorAvatarUrl}}
       <img src="{{ AuthorAvatarUrl }}" alt="{{ AuthorName }}" class="[original avatar classes]" />
     {{/if}}
   - Author Name: <span class="[original author name classes]">{{ AuthorName }}</span>
   - Author Role / Title:
     {{#if AuthorRole}}<span class="[original role classes]">{{ AuthorRole }}</span>{{/if}}
   - Author Biography:
     {{#if AuthorBio}}<p class="[original bio classes]">{{ AuthorBio }}</p>{{/if}}

5. Tags Taxonomy Cloud:
   Look for topic tags or category pills strip. Keep ONLY ONE representative tag pill inside {{#each Tags}} and discard static duplicates:
   {{#each Tags}}
     <a href="{{ Url }}" class="[original tag classes]">#{{ Name }}</a>
   {{/each}}

6. Sidebar & Two-Column Layout (if present):
   If the input HTML contains a sidebar column (<aside>, .sidebar, .blog-sidebar, .col-lg-4, etc.):
   - Preserve the sidebar container, its grid column layout, and every widget within it.
   - Sidebar Categories Widget:
     Keep ONLY ONE category item inside {{#each BlogCategories}} and discard duplicates:
     {{#each BlogCategories}}
       <a href="{{ Url }}" class="[original category link classes]">
         <span>{{ Name }}</span>
         {{#if Count}}<span class="[original count classes]">({{ Count }})</span>{{/if}}
       </a>
     {{/each}}
   - Sidebar Recent / Recommended Posts Widget:
     Keep ONLY ONE item inside {{#each RecentArticles}} and discard duplicates:
     {{#each RecentArticles}}
       <a href="{{ Url }}" class="[original item classes]">
         {{#if CoverImageUrl}}<img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original thumbnail classes]" />{{/if}}
         <span class="[original date classes]">{{ PublishedDate }}</span>
         <h5 class="[original title classes]">{{ Title }}</h5>
       </a>
     {{/each}}
   - Sidebar Tags Cloud Widget:
     {{#each Tags}}<a href="{{ Url }}" class="[original tag classes]">#{{ Name }}</a>{{/each}}
   - Sidebar Newsletter / Subscription Widget:
     Replace the subscription form with: {{ Form "Newsletter_Subscribe" }}
   - Search Widget: Preserve the original search form and input fields.

7. Related / Recent Articles Bottom Grid (if present outside sidebar):
   {{#each RecentArticles}}
     <div class="[original related card classes]">
       {{#if CoverImageUrl}}<img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original thumbnail classes]" />{{/if}}
       <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
       {{#if PublishedDate}}<span class="[original date classes]">{{ PublishedDate }}</span>{{/if}}
     </div>
   {{/each}}

8. Comments Section / Submission Form (if present):
   Look for the comment list and response form block (e.g. <div class="comments-area">, <form class="comment-form">):
   - Keep the surrounding container card and replace/augment the form with:
     {{ Form "Comment_Submit" }}

9. Back to Articles / Navigation Button (if present):
   If there is a return link to the blog feed (e.g. "Back to Blog", "All Articles"):
   <a href="/blog" class="[original back link classes]">[original text & icons]</a>

10. Root Container:
   Ensure the root article/section wrapper element includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY single existing CSS class, ID, HTML tag, attribute, style, and structure from the input HTML exactly as-is.
- ZERO INVENTIONS: DO NOT inject or invent any element (such as comments, sidebars, or widgets) that is not in the input HTML.
- ZERO GENERIC OVERWRITES: Keep all original CSS classes verbatim.
- STRIP RUNTIME ANIMATION INLINE STYLES: Strip library runtime styles ('transform: translate(...)', 'opacity: 1', 'visibility: inherit') while keeping layout classes.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations, no <style> tags.`;
  }
}
