/**
 * Context passed into category-specific surgical prompt generators.
 */
export interface AiRuleContext {
  /** Raw HTML code extracted from Monaco editor */
  rawHtml: string;
  /** Raw CSS styles for layout and structural reference */
  rawCss?: string;
  /** Name of the active template or preset variant */
  templateName?: string;
}

/**
 * Strategy interface for category-specific AI token transformation rules.
 */
export interface ICategoryAiRule {
  /** Canonical category identifier (e.g., 'menu', 'hero', 'breadcrumb', 'cards', 'footer', 'blog', 'blog-detail') */
  readonly categoryKey: string;

  /** Human-readable display label (e.g., 'Navigation', 'Hero', 'Breadcrumbs') */
  readonly displayName: string;

  /** Array of canonical tokens managed by this category */
  readonly targetPlaceholders: string[];

  /**
   * Generates a surgical prompt customized specifically for this category's
   * structural requirements, token specifications, and loop replacements.
   *
   * @param context Active code and template context
   * @returns Formatted prompt string for LLM execution
   */
  buildSurgicalPrompt(context: AiRuleContext): string;
}
