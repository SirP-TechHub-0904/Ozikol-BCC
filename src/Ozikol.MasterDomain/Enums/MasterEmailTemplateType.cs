namespace Ozikol.MasterDomain.Enums;

/// <summary>
/// Categorical types of central transactional email templates managed in MasterCatalogDbContext.
/// </summary>
public enum MasterEmailTemplateType
{
    /// <summary>
    /// Initial welcoming email dispatched to new tenant administrators upon successful registration.
    /// Supports dynamic placeholders such as {{businessname}}.
    /// </summary>
    WelcomeEmailTemplate = 1
}

