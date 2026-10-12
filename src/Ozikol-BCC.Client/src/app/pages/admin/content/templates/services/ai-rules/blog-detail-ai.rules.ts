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
   - Published Date: {{#if PublishedDate}}<span class="[original date classes]">{{ PublishedDate }}</span>{{/if}} (or if nested inside a meta column: {{#if PublishedDate}}<div class="[original meta col classes]"><span>Published on:</span><h5>{{ PublishedDate }}</h5></div>{{/if}})
   - Estimated Reading Time: {{#if ReadingTime}}<span class="[original time classes]">{{ ReadingTime }}</span>{{/if}}
   - Main Article Headline (H1 / Title): <h1 class="[original title classes]">{{ Title }}</h1>
     * Note: If animation libraries (GSAP, SplitText) split words into character divs (e.g. <div>I</div><div>n</div>...), collapse them cleanly into {{ Title }}.
   - Lead Narrative / Subtitle / Excerpt:
     {{#if Summary}}
       <p class="[original lead classes]">{{ Summary }}</p>
     {{/if}}
   - Header Comment Counters (if present, e.g. "05 comments", "3 Comments"):
     Replace static count numbers with a neutral discussion link:
     <span>Discussion</span> <h5><a href="#review">Join the conversation</a></h5>

2. Featured Cover Image:
   Look for the hero/header cover image for the article:
   {{#if CoverImageUrl}}
     <img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original image classes]" />
   {{/if}}
   * Or if styled as a CSS background-image: style="background-image: url('{{ CoverImageUrl }}');"

3. Editorial Article Body:
   - If the input HTML already has a dedicated content body container (e.g. <div class="entry-content">, <div class="post-content">, <div class="post-body">, <div class="article-body">, <div class="blog-details-content">):
     Keep that container and its original classes exactly as-is, and replace all sample text, static paragraphs, quotes, galleries, and lists within it with:
     {{{ Body }}}
   - If sample paragraphs and headings are direct children of the article wrapper WITHOUT a dedicated inner container:
     Replace that entire sequence of sample narrative paragraphs and mock content with:
     <div class="post-body">
       {{{ Body }}}
     </div>
   - CRITICAL: MUST use triple braces {{{ Body }}} so rich HTML formatting is not escaped.

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
   Look for topic tags or category pills strip (e.g. <div class="article-tags">, <div class="tagcloude">, <div class="tagcloud">, <div class="widget_tag_cloud">):
   - COEXISTENCE WITH SOCIAL SHARE: If the tags block shares a parent footer or row with Social Share buttons (e.g. <div class="tj-tags-post"> containing .tagcloud and .post-share, or <div class="article-footer"> containing .article-tags and .article-share):
     Wrap ONLY the inner tag cloud sub-container in {{#if Tags}}...{{/if}}. NEVER wrap the shared outer row in {{#if Tags}}, so that social share icons remain visible even when an article has zero tags.
   - If tags have their own dedicated container without sharing with social buttons, wrap the entire tags block in {{#if Tags}}...{{/if}}.
   - Keep ONLY ONE representative tag link inside {{#each Tags}} and discard static duplicates:
     {{#if Tags}}
     <div class="[original tag cloud classes]">
       {{#each Tags}}
       <a href="{{ Url }}" class="[original tag classes]">#{{ Name }}</a>
       {{/each}}
     </div>
     {{/if}}

6. Sidebar & Two-Column Layout (if present):
   If the input HTML contains a sidebar column (<aside>, .sidebar, .blog-sidebar, .col-lg-4, etc.):
   - STRIP RUNTIME PIN-SPACERS (GSAP ScrollTrigger): If a <div class="pin-spacer" style="... width: ...px; height: ...px;"> wrapper is present around the sidebar (injected by GSAP ScrollTrigger when inspected from DevTools), discard the .pin-spacer wrapper and all its hardcoded inline pixel styles. Keep the inner sidebar (<div class="tj-main-sidebar ..."> or <aside class="...">) directly inside its column (<div class="col-lg-4">) so the sidebar remains 100% fluid and responsive.
   - Preserve the sidebar container, its grid column layout, and every widget within it.
   - Sidebar Categories Widget:
     Wrap in {{#if BlogCategories}}...{{/if}}. Keep ONLY ONE category item inside {{#each BlogCategories}} and discard duplicates:
     {{#if BlogCategories}}
     <div class="[original widget classes]">
       <h4 class="[original title classes]">Categories</h4>
       <ul class="[original list classes]">
         {{#each BlogCategories}}
         <li>
           <a href="{{ Url }}" class="[original category link classes]">
             <span>{{ Name }}</span>
             {{#if Count}}<span class="[original count classes]">({{ Count }})</span>{{/if}}
           </a>
         </li>
         {{/each}}
       </ul>
     </div>
     {{/if}}
   - Sidebar Recent / Recommended Posts Widget:
     Wrap in {{#if RecentArticles}}...{{/if}}. Keep ONLY ONE item inside {{#each RecentArticles}} and discard duplicates:
     {{#if RecentArticles}}
     <div class="[original widget classes]">
       <h4 class="[original title classes]">Related Posts</h4>
       <ul class="[original list classes]">
         {{#each RecentArticles}}
         <li>
           <a href="{{ Url }}" class="[original item classes]">
             {{#if CoverImageUrl}}<img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original thumbnail classes]" />{{/if}}
             <span class="[original date classes]">{{ PublishedDate }}</span>
             <h5 class="[original title classes]">{{ Title }}</h5>
           </a>
         </li>
         {{/each}}
       </ul>
     </div>
     {{/if}}
   - Sidebar Tags Cloud Widget:
     Wrap in {{#if Tags}}...{{/if}}:
     {{#if Tags}}
     <div class="[original widget classes]">
       <h4 class="[original title classes]">Tags</h4>
       <div class="[original cloud classes]">
         {{#each Tags}}<a href="{{ Url }}" class="[original tag classes]">#{{ Name }}</a>{{/each}}
       </div>
     </div>
     {{/if}}
   - Sidebar Newsletter / Subscription Widget:
     Replace the subscription form with: {{ Form "Newsletter_Subscribe" }}
   - Search Widget: Preserve the original search form and input fields.

7. Related / Recent Articles Bottom Grid (if present outside sidebar):
   {{#if RecentArticles}}
   <div class="[original grid classes]">
     {{#each RecentArticles}}
       <div class="[original related card classes]">
         {{#if CoverImageUrl}}<img src="{{ CoverImageUrl }}" alt="{{ Title }}" class="[original thumbnail classes]" />{{/if}}
         <a href="{{ Url }}" class="[original link classes]">{{ Title }}</a>
         {{#if PublishedDate}}<span class="[original date classes]">{{ PublishedDate }}</span>{{/if}}
       </div>
     {{/each}}
   </div>
   {{/if}}

8. Comments Section & Submission Form (if present):
   Look for the comment list and response form block (e.g. <div class="comments-sec">, <div class="entry-comments">, <div class="post-comments">, <form class="comment-form">):
   - DISCARD ALL STATIC MOCK VISITOR COMMENTS: Remove all hardcoded dummy visitor comments, nested replies, commenter names (e.g. Mariya Dcosta, Andrew Dian, Josefa Donald), mock timestamps, and dummy commenter avatars (<ol class="comment-list">, <div class="post-comments">). Dynamic visitor comments are handled by the system.
   - Comment Counter Headings (e.g. "Comments (03)", "Comments (5)"): Remove static count numbers or keep the section title clean: <h3 class="[original title classes]">Discussion &amp; Responses</h3>.
   - Replace the static submission <form ...>...</form> block with the canonical form engine:
     {{ Form "Comment_Submit" }}
   - Preserve the surrounding section structure, reply headers ("Leave a Reply"), and disclaimers.

9. Back to Articles / Navigation Button (if present):
   If there is a return link to the blog feed (e.g. "Back to Blog", "All Articles"):
   <a href="/blog" class="[original back link classes]">[original text & icons]</a>

10. Root Container:
   Ensure the root article/section wrapper element includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY single existing CSS class, ID, HTML tag, attribute, style, and structure from the input HTML exactly as-is.
- ZERO INVENTIONS: DO NOT inject or invent any element (such as comments, sidebars, or widgets) that is not in the input HTML.
- ZERO GENERIC OVERWRITES: Keep all original CSS classes verbatim.
- STRIP DEVTOOLS / RUNTIME ARTIFACTS: 
  * Strip library runtime animation styles ('transform: translate(...)', 'opacity: 1', 'visibility: inherit', 'translate: none', 'rotate: none', 'scale: none').
  * Strip runtime pin-spacers (<div class="pin-spacer" style="...">) injected by GSAP ScrollTrigger to keep containers responsive.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations, no <style> tags.`;
  }
}
