namespace Ozikol.MasterDomain.Blueprints;

/// <summary>
/// Represents a self-contained, turnkey template blueprint package loaded directly from the central repository.
/// Encapsulates the canonical HTML markup, scoped CSS stylesheets, interactive JavaScript, and default mock sandbox JSON data.
/// </summary>
public class TemplateBlueprint
{
    /// <summary>
    /// Gets or sets the category identifier (e.g. "menu", "hero", "breadcrumb", "body", "footer", "blog", "blog-detail").
    /// </summary>
    public string CategoryKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the specific sub-section or variant identifier (e.g. "01-feature-grid", "Menu_Classic", "Hero_Slider").
    /// </summary>
    public string SectionKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the friendly display name of the blueprint archetype.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique variant code for tracking and template selection.
    /// </summary>
    public string VariantCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the raw Handlebars/HTML template markup with canonical tokens.
    /// </summary>
    public string HtmlTemplate { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the scoped CSS stylesheet rules.
    /// </summary>
    public string CssStyles { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the interactive client JavaScript logic (if any).
    /// </summary>
    public string JsScript { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the raw JSON payload representing preview sandbox mock data.
    /// </summary>
    public string SampleContentJson { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Material Symbols icon identifier representing the blueprint visually.
    /// </summary>
    public string Icon { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the badge or category pill text (e.g. "Features", "Split", "Pricing").
    /// </summary>
    public string Badge { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the architectural summary or description of the blueprint layout.
    /// </summary>
    public string Description { get; set; } = string.Empty;
}
