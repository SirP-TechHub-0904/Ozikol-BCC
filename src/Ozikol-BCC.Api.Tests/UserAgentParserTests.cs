using FluentAssertions;
using Ozikol_BCC.Application.Common;
using Xunit;

namespace Ozikol_BCC.Api.Tests
{
    /// <summary>
    /// Unit test suite verifying that <see cref="UserAgentParser"/> accurately extracts human-readable
    /// browser names, release versions, operating systems, and device form factors from raw User-Agent headers.
    /// </summary>
    public class UserAgentParserTests
    {
        [Fact]
        public void Parse_ChromeWindows10_ReturnsCleanTitleAndVersion()
        {
            // Arrange - exact User-Agent from user's live session
            var ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert
            result.BrowserName.Should().Be("Google Chrome");
            result.BrowserVersion.Should().Be("155");
            result.OperatingSystem.Should().Be("Windows 10/11");
            result.DeviceType.Should().Be("Desktop");
            result.FriendlyDeviceTitle.Should().Be("Google Chrome on Windows 10/11");
            result.FriendlyBrowserDetails.Should().Be("Google Chrome 155 • Desktop");
            result.Icon.Should().Be("desktop_windows");
        }

        [Fact]
        public void Parse_SafariMacOS_ReturnsMacPlatformDetails()
        {
            // Arrange
            var ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert
            result.BrowserName.Should().Be("Apple Safari");
            result.BrowserVersion.Should().Be("18");
            result.OperatingSystem.Should().Be("macOS");
            result.DeviceType.Should().Be("Desktop");
            result.FriendlyDeviceTitle.Should().Be("Apple Safari on macOS");
            result.Icon.Should().Be("laptop_mac");
        }

        [Fact]
        public void Parse_IPhoneSafari_ReturnsMobilePlatformDetails()
        {
            // Arrange
            var ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert
            result.BrowserName.Should().Be("Apple Safari");
            result.BrowserVersion.Should().Be("17");
            result.OperatingSystem.Should().Be("iOS (iPhone)");
            result.DeviceType.Should().Be("Mobile");
            result.FriendlyDeviceTitle.Should().Be("Apple Safari on iOS (iPhone)");
            result.Icon.Should().Be("smartphone");
        }

        [Fact]
        public void Parse_EdgeWindows_ReturnsMicrosoftEdge()
        {
            // Arrange
            var ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2711.94";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert
            result.BrowserName.Should().Be("Microsoft Edge");
            result.BrowserVersion.Should().Be("128");
            result.OperatingSystem.Should().Be("Windows 10/11");
            result.FriendlyDeviceTitle.Should().Be("Microsoft Edge on Windows 10/11");
            result.Icon.Should().Be("desktop_windows");
        }

        [Fact]
        public void Parse_FirefoxWindows_ReturnsMozillaFirefox()
        {
            // Arrange
            var ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert
            result.BrowserName.Should().Be("Mozilla Firefox");
            result.BrowserVersion.Should().Be("130");
            result.OperatingSystem.Should().Be("Windows 10/11");
            result.FriendlyDeviceTitle.Should().Be("Mozilla Firefox on Windows 10/11");
            result.Icon.Should().Be("desktop_windows");
        }

        [Fact]
        public void Parse_FlutterWindowsDesktop_ReturnsDesktopAppPlatformDetails()
        {
            // Arrange - native desktop client User-Agent with BCC-Client header
            var ua = "BCC-Client/1.0 (Windows; Desktop; Windows 10 Pro)";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert - tenant sessions must be 100% white-labeled with zero vendor branding
            result.BrowserName.Should().Be("Desktop App");
            result.OperatingSystem.Should().Be("Windows");
            result.DeviceType.Should().Be("Desktop");
            result.FriendlyDeviceTitle.Should().Be("Desktop App on Windows");
            result.FriendlyBrowserDetails.Should().Be("Desktop App • Desktop");
            result.Icon.Should().Be("desktop_windows");
        }

        [Fact]
        public void Parse_FlutterAndroidMobile_ReturnsMobileAppPlatformDetails()
        {
            // Arrange - native mobile client User-Agent with BCC-Client header
            var ua = "BCC-Client/1.0 (Android; Mobile; Android 14)";

            // Act
            var result = UserAgentParser.Parse(ua);

            // Assert - tenant sessions must be 100% white-labeled with zero vendor branding
            result.BrowserName.Should().Be("Mobile App");
            result.OperatingSystem.Should().Be("Android");
            result.DeviceType.Should().Be("Mobile");
            result.FriendlyDeviceTitle.Should().Be("Mobile App on Android");
            result.FriendlyBrowserDetails.Should().Be("Mobile App • Mobile");
            result.Icon.Should().Be("smartphone");
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void Parse_NullOrEmpty_ReturnsGracefulDefaults(string? emptyUa)
        {
            // Act
            var result = UserAgentParser.Parse(emptyUa);

            // Assert
            result.BrowserName.Should().Be("Web Browser");
            result.OperatingSystem.Should().Be("Unknown OS");
            result.FriendlyDeviceTitle.Should().Be("Web Browser Session");
            result.Icon.Should().Be("computer");
        }
    }
}
