using System;
using System.Text.RegularExpressions;

namespace Ozikol_BCC.Application.Common
{
    /// <summary>
    /// Represents structured, human-readable client browser and device telemetry.
    /// </summary>
    public class UserAgentInfo
    {
        /// <summary>
        /// Gets or sets the primary browser name (e.g. "Google Chrome", "Mozilla Firefox", "Apple Safari", "Microsoft Edge").
        /// </summary>
        public string BrowserName { get; set; } = "Web Browser";

        /// <summary>
        /// Gets or sets the major release version string of the browser.
        /// </summary>
        public string BrowserVersion { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the client operating system (e.g. "Windows 10/11", "macOS", "iOS", "Android", "Linux").
        /// </summary>
        public string OperatingSystem { get; set; } = "Unknown OS";

        /// <summary>
        /// Gets or sets the device classification: "Desktop", "Mobile", or "Tablet".
        /// </summary>
        public string DeviceType { get; set; } = "Desktop";

        /// <summary>
        /// Gets or sets the human-friendly summary title, e.g. "Google Chrome on Windows 10/11".
        /// </summary>
        public string FriendlyDeviceTitle { get; set; } = "Web Browser Session";

        /// <summary>
        /// Gets or sets the detailed browser and platform snippet, e.g. "Google Chrome 155 • Desktop".
        /// </summary>
        public string FriendlyBrowserDetails { get; set; } = "Desktop Browser";

        /// <summary>
        /// Gets or sets the client application classification: "Web Browser", "Desktop App", or "Mobile App".
        /// </summary>
        public string ClientType { get; set; } = "Web Browser";

        /// <summary>
        /// Gets or sets the canonical Material Symbols icon name (e.g. "language", "desktop_windows", "laptop_mac", "smartphone", "tablet").
        /// </summary>
        public string Icon { get; set; } = "language";
    }

    /// <summary>
    /// High-fidelity parser for extracting clean browser, OS, and device categories from HTTP User-Agent strings.
    /// </summary>
    public static class UserAgentParser
    {
        private static readonly Regex EdgeRegex = new(@"Edg(?:e|A|iOS)?\/([0-9]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex OperaRegex = new(@"(?:OPR|Opera)\/([0-9]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex VivaldiRegex = new(@"Vivaldi\/([0-9]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex SamsungRegex = new(@"SamsungBrowser\/([0-9]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex ChromeRegex = new(@"Chrome\/([0-9]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex FirefoxRegex = new(@"(?:Firefox|FxiOS)\/([0-9]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex SafariVersionRegex = new(@"Version\/([0-9]+).*Safari", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        /// <summary>
        /// Parses an HTTP User-Agent string into structured human-readable telemetry.
        /// </summary>
        /// <param name="userAgent">The raw User-Agent header value.</param>
        /// <returns>A populated <see cref="UserAgentInfo"/> instance.</returns>
        public static UserAgentInfo Parse(string? userAgent)
        {
            var info = new UserAgentInfo();
            if (string.IsNullOrWhiteSpace(userAgent))
            {
                return info;
            }

            var ua = userAgent.Trim();

            // Check for native mobile and desktop applications (White-labeled, zero platform vendor name in tenant UI)
            if (ua.Contains("BCC-Client", StringComparison.OrdinalIgnoreCase) || ua.Contains("OzikolBCC-Flutter", StringComparison.OrdinalIgnoreCase) || ua.Contains("Flutter", StringComparison.OrdinalIgnoreCase))
            {
                var isMobile = ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) || ua.Contains("Android", StringComparison.OrdinalIgnoreCase) || ua.Contains("iOS", StringComparison.OrdinalIgnoreCase);
                var isApple = ua.Contains("iOS", StringComparison.OrdinalIgnoreCase) || ua.Contains("macOS", StringComparison.OrdinalIgnoreCase);
                var os = ua.Contains("Android", StringComparison.OrdinalIgnoreCase) ? "Android" :
                         ua.Contains("iOS", StringComparison.OrdinalIgnoreCase) ? "iOS" :
                         ua.Contains("Windows", StringComparison.OrdinalIgnoreCase) ? "Windows" :
                         ua.Contains("macOS", StringComparison.OrdinalIgnoreCase) ? "macOS" :
                         ua.Contains("Linux", StringComparison.OrdinalIgnoreCase) ? "Linux" : "Device";

                info.BrowserName = isMobile ? "Mobile App" : "Desktop App";
                info.ClientType = isMobile ? "Mobile App" : "Desktop App";
                info.OperatingSystem = os;
                info.DeviceType = isMobile ? "Mobile" : "Desktop";
                info.FriendlyDeviceTitle = $"{info.BrowserName} on {os}";
                info.FriendlyBrowserDetails = $"{info.BrowserName} • {info.DeviceType}";
                info.Icon = isMobile ? "smartphone" : (isApple ? "laptop_mac" : (os == "Linux" ? "terminal" : "desktop_windows"));
                return info;
            }

            // Already friendly format check (e.g. "Google Chrome on Windows 10/11", "Desktop App on Windows")
            if (!ua.StartsWith("Mozilla/", StringComparison.OrdinalIgnoreCase) && ua.Contains(" on "))
            {
                var parts = ua.Split(" on ", 2, StringSplitOptions.TrimEntries);
                var firstPart = parts[0];
                var secondPart = parts.Length > 1 ? parts[1] : "Device";

                var isDesktopApp = firstPart.Contains("Desktop App", StringComparison.OrdinalIgnoreCase);
                var isMobileApp = firstPart.Contains("Mobile App", StringComparison.OrdinalIgnoreCase);
                var isMobile = isMobileApp || ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) || ua.Contains("Android", StringComparison.OrdinalIgnoreCase) || ua.Contains("iOS", StringComparison.OrdinalIgnoreCase);

                info.BrowserName = firstPart;
                info.OperatingSystem = secondPart;
                info.DeviceType = isMobile ? "Mobile" : "Desktop";
                info.ClientType = isDesktopApp ? "Desktop App" : (isMobileApp ? "Mobile App" : "Web Browser");
                info.FriendlyDeviceTitle = ua;
                info.FriendlyBrowserDetails = $"{firstPart} • {info.DeviceType}";
                info.Icon = isDesktopApp ? (secondPart.Contains("macOS", StringComparison.OrdinalIgnoreCase) ? "laptop_mac" : "desktop_windows") :
                            (isMobileApp ? "smartphone" : "language");
                return info;
            }

            // 1. Detect Operating System & Form Factor
            if (ua.Contains("Windows NT 10.0", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Windows 10/11";
                info.DeviceType = "Desktop";
                info.Icon = "desktop_windows";
            }
            else if (ua.Contains("Windows NT 6.3", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Windows 8.1";
                info.DeviceType = "Desktop";
                info.Icon = "desktop_windows";
            }
            else if (ua.Contains("Windows NT 6.1", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Windows 7";
                info.DeviceType = "Desktop";
                info.Icon = "desktop_windows";
            }
            else if (ua.Contains("Windows", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Windows";
                info.DeviceType = "Desktop";
                info.Icon = "desktop_windows";
            }
            else if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "iOS (iPhone)";
                info.DeviceType = "Mobile";
                info.Icon = "smartphone";
            }
            else if (ua.Contains("iPad", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "iPadOS";
                info.DeviceType = "Tablet";
                info.Icon = "tablet";
            }
            else if (ua.Contains("Macintosh", StringComparison.OrdinalIgnoreCase) || ua.Contains("Mac OS X", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "macOS";
                info.DeviceType = "Desktop";
                info.Icon = "laptop_mac";
            }
            else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase))
            {
                if (ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase))
                {
                    info.OperatingSystem = "Android";
                    info.DeviceType = "Mobile";
                    info.Icon = "smartphone";
                }
                else
                {
                    info.OperatingSystem = "Android Tablet";
                    info.DeviceType = "Tablet";
                    info.Icon = "tablet";
                }
            }
            else if (ua.Contains("Ubuntu", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Ubuntu Linux";
                info.DeviceType = "Desktop";
                info.Icon = "terminal";
            }
            else if (ua.Contains("Linux", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "Linux";
                info.DeviceType = "Desktop";
                info.Icon = "terminal";
            }
            else if (ua.Contains("CrOS", StringComparison.OrdinalIgnoreCase))
            {
                info.OperatingSystem = "ChromeOS";
                info.DeviceType = "Desktop";
                info.Icon = "laptop";
            }

            // 2. Detect Browser & Version
            Match match;
            if ((match = EdgeRegex.Match(ua)).Success)
            {
                info.BrowserName = "Microsoft Edge";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if ((match = OperaRegex.Match(ua)).Success)
            {
                info.BrowserName = "Opera";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if ((match = VivaldiRegex.Match(ua)).Success)
            {
                info.BrowserName = "Vivaldi";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if ((match = SamsungRegex.Match(ua)).Success)
            {
                info.BrowserName = "Samsung Internet";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if ((match = ChromeRegex.Match(ua)).Success)
            {
                info.BrowserName = "Google Chrome";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if ((match = FirefoxRegex.Match(ua)).Success)
            {
                info.BrowserName = "Mozilla Firefox";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if ((match = SafariVersionRegex.Match(ua)).Success)
            {
                info.BrowserName = "Apple Safari";
                info.BrowserVersion = match.Groups[1].Value;
            }
            else if (ua.Contains("Safari", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chrome", StringComparison.OrdinalIgnoreCase))
            {
                info.BrowserName = "Apple Safari";
            }

            var verSnippet = !string.IsNullOrEmpty(info.BrowserVersion) ? $" {info.BrowserVersion}" : string.Empty;
            info.FriendlyDeviceTitle = $"{info.BrowserName} on {info.OperatingSystem}";
            info.FriendlyBrowserDetails = $"{info.BrowserName}{verSnippet} • {info.DeviceType} Browser";
            info.ClientType = "Web Browser";
            info.Icon = info.DeviceType == "Mobile" ? "smartphone" : (info.DeviceType == "Tablet" ? "tablet" : "language");

            return info;
        }
    }
}
