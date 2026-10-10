import type { AiRuleContext, ICategoryAiRule } from './category-ai-rule.interface';

/**
 * AI Transformation Rule Strategy for Blog Post Article Details ('blog_detail' / 'blog-detail').
 */
export class BlogDetailAiRule implements ICategoryAiRule {
  readonly categoryKey = 'blog_detail';
  readonly displayName = 'Blog Detail';

  readonly targetPlaceholders: string[] = [
    '{{ Title }}',
    '{{ Summary }}',
    '{{ FullDescription }}',
    '{{ Category }}',
    '{{ PublishedDate }}',
    '{{ AuthorName }}',
    '{{ AuthorRole }}',
    '{{ AuthorAvatarUrl }}',
    '{{ AuthorBio }}',
    '{{ ImageUrl }}',
    '{{#each Tags}}',
    '{{#each RecentArticles}}',
    '{{ Form "Comment_Submit" }}',
    '{{ CustomClass }}'
  ];

  buildSurgicalPrompt(context: AiRuleContext): string {
    return `You are a specialized surgical code transformer for Ozikol BCC CMS Single Article / Blog Post Details.
Your mission is to replace static article text, author profiles, and comment sections with canonical Ozikol Handlebars tokens.

TARGET PLACEHOLDERS & STRUCTURAL PATTERNS:
1. Article Headline & Metadata:
   - Article Title / H1: {{ Title }}
   - Category / Badge: {{ Category }}
   - Published Date: {{ PublishedDate }}
   - Article Featured Image: {{#if ImageUrl}}<img src="{{ ImageUrl }}" alt="{{ Title }}" />{{/if}}

2. Article Body:
   - Article Excerpt / Intro: {{ Summary }}
   - Full Article Body Content: {{ FullDescription }}

3. Author Box / Biography:
   - Author Name: {{ AuthorName }}
   - Author Role / Title: {{ AuthorRole }}
   - Author Avatar: {{#if AuthorAvatarUrl}}<img src="{{ AuthorAvatarUrl }}" alt="{{ AuthorName }}" />{{/if}}
   - Author Bio: {{ AuthorBio }}

4. Tags & Related Posts:
   - Tags: {{#each Tags}}<a href="{{ Url }}" class="[tag classes]">{{ Name }}</a>{{/each}}
   - Related/Recent Articles:
     {{#each RecentArticles}}
       <li><a href="{{ Url }}">{{ Title }}</a></li>
     {{/each}}

5. Comments Section / Submission Form:
   If a comment form exists, inject {{ Form "Comment_Submit" }}.

6. Root Container:
   Ensure the root article wrapper includes class "{{ CustomClass }}".

MANDATORY RULES:
- 100% PRESERVATION: Keep EVERY existing CSS class, ID, layout container, and typography verbatim.
- ZERO INVENTIONS: Do not add elements not present in the original HTML.
- Return ONLY the transformed raw HTML. No markdown code blocks, no explanations.`;
  }
}
