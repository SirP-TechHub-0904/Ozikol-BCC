namespace Ozikol_BCC.EmailServices.Postmark.Configuration;

/// <summary>
/// Configuration bound from the Postmark section. ServerToken is the provider secret;
/// SenderEmail must be a verified sender/signature in Postmark.
/// </summary>
public class PostmarkOptions
{
    public const string SectionName = "Postmark";

    public string ServerToken { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
}
