namespace Ozikol_BCC.Website.Models;

public sealed class BcpPageHeaderModel
{
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? Icon { get; set; }
    public string? Eyebrow { get; set; }
    public string? BackUrl { get; set; }
    public string? BackText { get; set; }
    public IReadOnlyList<BcpPageHeaderButton> Buttons { get; set; } = [];
}

public sealed class BcpPageHeaderButton
{
    public BcpPageHeaderButton()
    {
    }

    public BcpPageHeaderButton(string text, string url, string icon, bool isPrimary = false)
    {
        Text = text;
        Url = url;
        Icon = icon;
        IsPrimary = isPrimary;
    }

    public string Text { get; set; } = string.Empty;
    public string Url { get; set; } = "javascript:void(0)";
    public string Icon { get; set; } = "chevron_right";
    public bool IsPrimary { get; set; }
    public bool IsDisabled { get; set; }
    public string? Target { get; set; }
    public string? AriaLabel { get; set; }
}
