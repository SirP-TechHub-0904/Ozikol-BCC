using System.Collections.Generic;

namespace Ozikol_BCC.Application.Constants
{
    /// <summary>
    /// Single-source-of-truth canonical Handlebars placeholder contract shared across
    /// backend AI template compilers, copilot prompt builders, and documentation.
    /// Enforces strict 1-to-1 field mapping with explicit parent/child scoping and zero cross-fallbacks.
    /// </summary>
    public static class CanonicalCmsPlaceholders
    {
        /// <summary>
        /// Canonical scoped tokens for a parent PageSection database record.
        /// </summary>
        public static readonly IReadOnlyList<string> PageSectionTokens = new[]
        {
            "{{ PageSection.Title }}",
            "{{ PageSection.MiniTitle }}",
            "{{ PageSection.Description }}",
            "{{{ PageSection.FullDescription }}}",
            "{{ PageSection.Qoute }}",
            "{{ PageSection.ImageUrl }}",
            "{{ PageSection.SecondImageUrl }}",
            "{{ PageSection.VideoUrl }}",
            "{{ PageSection.YoutubeUrlLink }}",
            "{{ PageSection.IconText }}",
            "{{ PageSection.ButtonText }}",
            "{{ PageSection.ButtonLink }}",
            "{{ PageSection.SecondButtonText }}",
            "{{ PageSection.SecondButtonLink }}",
            "{{ PageSection.DirectUrl }}",
            "{{ Form \"Contact_Us\" }}",
            "{{ CustomClass }}"
        };

        /// <summary>
        /// Canonical scoped tokens inside an active {{#each PageSectionLists}} repeater block.
        /// Mirrors PageSectionList database columns verbatim (Description = short plain text, MoreDescription = extended rich HTML).
        /// </summary>
        public static readonly IReadOnlyList<string> PageSectionListTokens = new[]
        {
            "{{#each PageSectionLists}}",
            "{{ PageSectionList.Title }}",
            "{{ PageSectionList.MiniTitle }}",
            "{{ PageSectionList.Description }}",
            "{{{ PageSectionList.MoreDescription }}}",
            "{{ PageSectionList.IconText }}",
            "{{ PageSectionList.ImageUrl }}",
            "{{ PageSectionList.ButtonText }}",
            "{{ PageSectionList.ButtonLink }}",
            "{{ PageSectionList.SecondButtonText }}",
            "{{ PageSectionList.SecondButtonLink }}",
            "{{ PageSectionList.SortOrder }}"
        };

        /// <summary>
        /// Returns the standardized prompt specification block for Parent Section and Child PageSectionLists
        /// to keep all LLM copilot and section-compiler prompts aligned with client hydrators.
        /// </summary>
        /// <returns>Formatted instruction block describing strict discrete placeholder usage.</returns>
        public static string BuildSectionAndListPromptSpec()
        {
            return @"CANONICAL SECTION & CARD PLACEHOLDER RULES (STRICT DISCRETE FIELDS - ZERO CROSS-FALLBACK):
- Parent Section Fields (ALWAYS use PageSection. prefix for clarity):
  * Main Headline: {{ PageSection.Title }}
  * Eyebrow / Badge: {{#if PageSection.MiniTitle}}<span class=""..."">{{ PageSection.MiniTitle }}</span>{{/if}}
  * Short Intro Summary (plain text, 1-2 sentences): {{#if PageSection.Description}}<p class=""..."">{{ PageSection.Description }}</p>{{/if}}
  * Extended Rich HTML Body (WYSIWYG narrative/HTML content — MUST use triple braces inside <div>, NEVER <p>, and NEVER reuse Description):
    {{#if PageSection.FullDescription}}<div class=""..."">{{{ PageSection.FullDescription }}}</div>{{/if}}
  * Highlight Quote: {{#if PageSection.Qoute}}<blockquote>{{ PageSection.Qoute }}</blockquote>{{/if}}
  * Primary / Secondary Media: {{ PageSection.ImageUrl }}, {{ PageSection.SecondImageUrl }}, {{ PageSection.VideoUrl }}, {{ PageSection.YoutubeUrlLink }}
  * Root Icon: <i class=""{{ PageSection.IconText }}""></i>
  * Primary CTA: {{#if PageSection.ButtonText}}<a href=""{{ PageSection.ButtonLink }}"" class=""..."">{{ PageSection.ButtonText }}</a>{{/if}}
  * Secondary CTA: {{#if PageSection.SecondButtonText}}<a href=""{{ PageSection.SecondButtonLink }}"" class=""..."">{{ PageSection.SecondButtonText }}</a>{{/if}}
  * Dynamic Form Embeds: {{ Form ""Contact_Us"" }} or {{ Form ""Newsletter_Subscribe"" }}
  * Root Container Class: {{ CustomClass }}

- Repeating Child Items / Slides / Cards Loop (ALWAYS scope child properties with PageSectionList.):
  {{#each PageSectionLists}}
    <div class=""[original card/slide classes]"">
      {{#if PageSectionList.IconText}}<i class=""{{ PageSectionList.IconText }}""></i>{{/if}}
      {{#if PageSectionList.MiniTitle}}<span class=""..."">{{ PageSectionList.MiniTitle }}</span>{{/if}}
      {{#if PageSectionList.ImageUrl}}<img src=""{{ PageSectionList.ImageUrl }}"" alt=""{{ PageSectionList.Title }}"" />{{/if}}
      <h3>{{ PageSectionList.Title }}</h3>
      {{#if PageSectionList.Description}}<p>{{ PageSectionList.Description }}</p>{{/if}}
      {{#if PageSectionList.MoreDescription}}<div class=""card-rich-desc"">{{{ PageSectionList.MoreDescription }}}</div>{{/if}}
      {{#if PageSectionList.ButtonText}}<a href=""{{ PageSectionList.ButtonLink }}"">{{ PageSectionList.ButtonText }}</a>{{/if}}
      {{#if PageSectionList.SecondButtonText}}<a href=""{{ PageSectionList.SecondButtonLink }}"">{{ PageSectionList.SecondButtonText }}</a>{{/if}}
    </div>
  {{/each}}
  CRITICAL: Matching {{#if ...}} condition names MUST match the inner token scope (e.g. {{#if PageSection.FullDescription}} -> {{{ PageSection.FullDescription }}}, NEVER mix unprefixed #if with prefixed body). NEVER use PageSectionList.FullDescription (use PageSectionList.MoreDescription).";
        }
    }
}

