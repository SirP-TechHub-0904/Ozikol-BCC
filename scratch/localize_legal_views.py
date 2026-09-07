import os

legal_dir = r"c:\Users\JURAY\source\Ozikol-BCC\src\Ozikol.Central\Pages\Legal"

pages = [
    ("PrivacyNotice.cshtml", "privacy-notice"),
    ("TermsOfUse.cshtml", "terms-of-use"),
    ("Cookies.cshtml", "cookies"),
    ("PrivacyChoices.cshtml", "privacy-choices"),
    ("PoliciesAndReports.cshtml", "policies-and-reports")
]

for filename, slug in pages:
    filepath = os.path.join(legal_dir, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Ensure culture links on navigation
    content = content.replace('href="/privacy-notice"', 'href="/@currentCulture/privacy-notice"')
    content = content.replace('href="/terms-of-use"', 'href="/@currentCulture/terms-of-use"')
    content = content.replace('href="/cookies"', 'href="/@currentCulture/cookies"')
    content = content.replace('href="/privacy-choices"', 'href="/@currentCulture/privacy-choices"')
    content = content.replace('href="/policies-and-reports"', 'href="/@currentCulture/policies-and-reports"')

    # Breadcrumb updates
    content = content.replace('<span>Back to Portal</span>', '<span>@SharedLocalizer["Legal_Breadcrumb_Back"]</span>')
    content = content.replace('<a href="/@currentCulture">Home</a>', '<a href="/@currentCulture">@SharedLocalizer["Legal_Breadcrumb_Home"]</a>')
    content = content.replace('<a href="/@currentCulture/policies-and-reports">Legal &amp; Governance</a>', '<a href="/@currentCulture/policies-and-reports">@SharedLocalizer["Legal_Breadcrumb_Hub"]</a>')

    # Metadata bar updates
    content = content.replace('<span>Last Updated: <strong>', '<span>@SharedLocalizer["Legal_Meta_LastUpdated"]: <strong>')
    content = content.replace('<span>Effective: <strong>', '<span>@SharedLocalizer["Legal_Meta_Effective"]: <strong>')
    content = content.replace('<span>Print Policy</span>', '<span>@SharedLocalizer["Legal_Meta_Print"]</span>')
    content = content.replace('title="Print this legal policy"', 'title="@SharedLocalizer["Legal_Meta_Print"]"')

    # Sidebar updates
    content = content.replace('<h3 class="oz-legal-card__title">Legal &amp; Governance Hub</h3>', '<h3 class="oz-legal-card__title">@SharedLocalizer["Legal_Nav_Title"]</h3>')
    content = content.replace('<span>Privacy Notice</span>', '<span>@SharedLocalizer["Legal_Nav_PrivacyNotice"]</span>')
    content = content.replace('<span>Terms of Use</span>', '<span>@SharedLocalizer["Legal_Nav_TermsOfUse"]</span>')
    content = content.replace('<span>Cookie Policy</span>', '<span>@SharedLocalizer["Legal_Nav_Cookies"]</span>')
    content = content.replace('<span>Privacy Choices &amp; Rights</span>', '<span>@SharedLocalizer["Legal_Nav_PrivacyChoices"]</span>')
    content = content.replace('<span>Privacy Choices</span>', '<span>@SharedLocalizer["Legal_Nav_PrivacyChoices"]</span>')
    content = content.replace('<span>Policies &amp; Compliance Reports</span>', '<span>@SharedLocalizer["Legal_Nav_PoliciesReports"]</span>')
    content = content.replace('<span>Corporate Policies &amp; Reports</span>', '<span>@SharedLocalizer["Legal_Nav_PoliciesReports"]</span>')

    # Help/contact card
    content = content.replace('<h4>Legal &amp; Compliance Inquiries</h4>', '<h4>@SharedLocalizer["Legal_Help_Title"]</h4>')
    content = content.replace('<h4>Need Legal Assistance?</h4>', '<h4>@SharedLocalizer["Legal_Help_Title"]</h4>')
    content = content.replace('<p>Need custom Data Processing Agreements (DPA), standard contractual clauses, or sovereign compliance confirmation?</p>', '<p>@SharedLocalizer["Legal_Help_Desc"]</p>')
    content = content.replace('Contact Legal Desk', '@SharedLocalizer["Legal_Help_Btn"]')

    # Add fallback notice if document is in English but user is browsing in another culture
    old_raw = "@Html.Raw(doc.ContentHtml)"
    new_raw = """@if (currentCulture != "en" && doc != null && (doc.Culture == "en" || string.IsNullOrEmpty(doc.Culture)))
                {
                    <div class="oz-legal-callout oz-legal-callout--info mb-4">
                        <p><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> @SharedLocalizer["Legal_Fallback_Notice"]</p>
                    </div>
                }
                @Html.Raw(doc.ContentHtml)"""
    
    if old_raw in content and "Legal_Fallback_Notice" not in content:
        content = content.replace(old_raw, new_raw)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {filename}")
