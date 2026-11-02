using FluentAssertions;
using Ozikol_BCC.Application.Services.Notifications;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    /// <summary>
    /// Unit test suite verifying that <see cref="TenantEmailShellService"/> dynamically wraps inner
    /// message snippets in a white-labeled HTML shell while strictly avoiding any platform branding leaks.
    /// </summary>
    public class TenantEmailShellServiceTests
    {
        private readonly TenantEmailShellService _shellService;

        public TenantEmailShellServiceTests()
        {
            _shellService = new TenantEmailShellService();
        }

        [Fact]
        public void WrapWithTenantShell_WrapsInnerSnippet_WithTenantBrandingAndZeroOzikolLeaks()
        {
            // Arrange
            var innerHtml = "<p>Your role has been updated to Senior Lead.</p>";
            var title = "Security Notice";
            var firstName = "First";
            var brandName = "Apex Global Logistics";
            var actionUrl = "https://apex.company.com/users/security";
            var actionText = "Review Security";

            // Act
            var result = _shellService.WrapWithTenantShell(
                innerHtml: innerHtml,
                title: title,
                recipientFirstName: firstName,
                tenantBrandName: brandName,
                actionUrl: actionUrl,
                actionText: actionText,
                badgeLabel: "Security");

            // Assert
            result.Should().Contain("Apex Global Logistics");
            result.Should().Contain("Hello <strong>First</strong>,");
            result.Should().Contain("Your role has been updated to Senior Lead.");
            result.Should().Contain("https://apex.company.com/users/security");
            result.Should().Contain("Review Security");
            result.Should().Contain("dispatched by <strong>Apex Global Logistics</strong>");
            result.Should().NotContain("Ozikol");
            result.Should().NotContain("testspace");
        }

        [Fact]
        public void WrapWithTenantShell_WhenAlreadyCompleteHtml_DoesNotDoubleWrap()
        {
            // Arrange
            var fullHtml = "<!DOCTYPE html><html><body>Already complete</body></html>";

            // Act
            var result = _shellService.WrapWithTenantShell(
                innerHtml: fullHtml,
                title: "Test Full Doc");

            // Assert
            result.Should().Be(fullHtml);
        }
    }
}
