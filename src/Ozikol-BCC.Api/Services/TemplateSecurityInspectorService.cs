using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace Ozikol_BCC.Api.Services
{
    /// <summary>
    /// Represents an identified security or integrity violation within template source code.
    /// </summary>
    public class TemplateSecurityViolation
    {
        /// <summary>
        /// Source field where violation was detected (e.g. HtmlTemplate, CssStyles, JsScript, DefaultContentJson).
        /// </summary>
        public string Field { get; set; } = string.Empty;

        /// <summary>
        /// Vulnerability taxonomy class (e.g. SqlInjection, DynamicExecution, CredentialTheft, BlacklistedUrl, MaliciousCss).
        /// </summary>
        public string ThreatCategory { get; set; } = string.Empty;

        /// <summary>
        /// Severity tier: "Critical" blocks template persistence; "Warning" alerts the administrator.
        /// </summary>
        public string Severity { get; set; } = "Critical";

        /// <summary>
        /// Exact offending code snippet extracted from the template source.
        /// </summary>
        public string Snippet { get; set; } = string.Empty;

        /// <summary>
        /// Approximate 1-based line number where the violation originates.
        /// </summary>
        public int? LineNumber { get; set; }

        /// <summary>
        /// Taxonomy category alias.
        /// </summary>
        public string Category => ThreatCategory;

        /// <summary>
        /// Clear descriptive explanation detailing why this code pattern is blocked.
        /// </summary>
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Aggregated result of a template security and code integrity inspection.
    /// </summary>
    public class TemplateSecurityScanResult
    {
        /// <summary>
        /// True when no Critical violations were identified.
        /// </summary>
        public bool IsSecure => !Violations.Any(v => v.Severity == "Critical");

        /// <summary>
        /// True when all security checks passed without critical blocking violations.
        /// </summary>
        public bool IsPassed => IsSecure;

        /// <summary>
        /// Critical violations that block template persistence.
        /// </summary>
        public IEnumerable<TemplateSecurityViolation> CriticalViolations => Violations.Where(v => v.Severity == "Critical");

        /// <summary>
        /// True if any non-blocking warning notices were raised.
        /// </summary>
        public bool HasWarnings => Violations.Any(v => v.Severity == "Warning");

        /// <summary>
        /// List of all detected security violations and warnings.
        /// </summary>
        public List<TemplateSecurityViolation> Violations { get; set; } = new();
    }

    /// <summary>
    /// Contract for server-side pre-persistence template security validation.
    /// Prevents SQL injection, XSS escalation, credential harvesting, and suspicious external links.
    /// </summary>
    public interface ITemplateSecurityInspectorService
    {
        /// <summary>
        /// Performs deep heuristic and regex inspection on template code assets before database persistence.
        /// </summary>
        /// <param name="htmlTemplate">Semantic HTML markup.</param>
        /// <param name="cssStyles">Scoped CSS stylesheets.</param>
        /// <param name="jsScript">Client-side JavaScript code.</param>
        /// <param name="defaultContentJson">Dynamic JSON sample mock content.</param>
        /// <returns>A populated <see cref="TemplateSecurityScanResult"/> containing detected violations.</returns>
        TemplateSecurityScanResult Inspect(
            string? htmlTemplate,
            string? cssStyles,
            string? jsScript,
            string? defaultContentJson = null);
    }

    /// <summary>
    /// Defense-in-depth gatekeeper implementation inspecting template assets for SQL injection,
    /// XSS, browser credential theft, and spam/phishing URLs prior to database updates.
    /// </summary>
    public class TemplateSecurityInspectorService : ITemplateSecurityInspectorService
    {
        // 1. SQL Injection & Database Threat Signatures
        private static readonly (Regex Pattern, string Category, string Message)[] SqlInjectionRules = new[]
        {
            (new Regex(@"'\s*(--|/\*)", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "SQL literal quote directly followed by comment delimiter detected."),

            (new Regex(@"\b(DROP|ALTER|TRUNCATE)\s+TABLE\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "Destructive DDL SQL statement (DROP/ALTER/TRUNCATE TABLE) detected."),

            (new Regex(@"\bUNION\s+(ALL\s+)?SELECT\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "Classic SQL UNION SELECT data exfiltration pattern detected."),

            (new Regex(@"\b(XP_CMDSHELL|SP_EXECUTESQL)\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "Restricted SQL Server stored procedure execution signature detected."),

            (new Regex(@"(?<![\.\?])\bEXEC(UTE)?\s*\(", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "Dynamic SQL execution function signature (EXEC(...)) detected."),

            (new Regex(@"\bOR\s+['""]?1['""]?\s*=\s*['""]?1\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "Tautological SQL bypass pattern ('OR 1=1') detected."),

            (new Regex(@"\b(INFORMATION_SCHEMA|SYS\.OBJECTS|SYSOBJECTS)\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "SqlInjection", "Database system catalog schema interrogation keyword detected.")
        };

        // 2. JavaScript Execution & Storage Theft Signatures
        private static readonly (Regex Pattern, string Category, string Severity, string Message)[] JavaScriptRules = new[]
        {
            (new Regex(@"\beval\s*\(", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "DangerousExecution", "Critical", "Dynamic code evaluation via eval() is strictly prohibited in template scripts."),

            (new Regex(@"\bnew\s+Function\s*\(", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "DangerousExecution", "Critical", "Dynamic code compilation via new Function() is strictly prohibited."),

            (new Regex(@"\b(setTimeout|setInterval)\s*\(\s*['""`]", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "DangerousExecution", "Critical", "String-based timer execution is prohibited. Use typed arrow functions instead."),

            (new Regex(@"\bdocument\.cookie\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "CredentialTheft", "Critical", "Direct access to browser session cookies (document.cookie) is prohibited."),

            (new Regex(@"\b(window\.)?(localStorage|sessionStorage)\.(get|set|remove|clear)", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "CredentialTheft", "Warning", "Template script accesses browser storage APIs. Ensure sensitive tenant auth tokens are not exposed."),

            (new Regex(@"\b(window\.)?(parent|top)\.location\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "FrameHijacking", "Critical", "Frame navigation hijacking targeting top/parent window detected.")
        };

        // 3. HTML Markup & Event Handler Signatures
        private static readonly (Regex Pattern, string Category, string Severity, string Message)[] HtmlRules = new[]
        {
            (new Regex(@"<\s*script[^>]*\bsrc\s*=\s*['""]?(https?:)?//(?!cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com)[^'""\s>]+", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "UntrustedScriptSource", "Critical", "Remote script tags loading from untrusted or unverified CDN domains are blocked."),

            (new Regex(@"\bon(error|load|unload|click|mouseover|mouseenter|focus|blur|submit)\s*=\s*['""]?\s*(javascript:)?", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "InlineEventHandler", "Warning", "Inline HTML event handlers (e.g. onerror=, onload=) detected. Prefer clean event listeners in the JS tab."),

            (new Regex(@"\bhref\s*=\s*['""]?\s*javascript:\s*", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "JavascriptPseudoProtocol", "Critical", "Executable javascript: pseudo-protocol in HTML hyperlinks is prohibited."),

            (new Regex(@"<\s*(base|embed|object|applet)\b", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "DangerousHtmlElement", "Critical", "Potentially hazardous HTML element (<base>, <embed>, <object>) is prohibited.")
        };

        // 4. CSS Injection & Keylogging Signatures
        private static readonly (Regex Pattern, string Category, string Severity, string Message)[] CssRules = new[]
        {
            (new Regex(@"\bexpression\s*\(", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "MaliciousCss", "Critical", "Legacy CSS expression() executable evaluation detected."),

            (new Regex(@"\bbehavior\s*:\s*url", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "MaliciousCss", "Critical", "Internet Explorer HTC behavior binding detected in CSS."),

            (new Regex(@"input\[type=['""]?password['""]?\][^{]*{[^}]*background(-image)?\s*:\s*url", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "CssKeylogging", "Critical", "CSS attribute selector targeting password inputs with background exfiltration URL detected.")
        };

        // 5. URL Blacklist & Suspicious Link Signatures (Aligned with Rule 6 Spam/Phishing Policies)
        private static readonly (Regex Pattern, string Category, string Severity, string Message)[] UrlRules = new[]
        {
            (new Regex(@"https?://(www\.)?(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|buff\.ly|ow\.ly|adf\.ly|bitly\.com)/[A-Za-z0-9_-]+", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "BlacklistedUrl", "Critical", "URL shorteners (e.g. bit.ly, tinyurl) are prohibited to protect domain sender reputation and prevent phishing."),

            (new Regex(@"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?", RegexOptions.Compiled | RegexOptions.IgnoreCase),
                "RawIpAddressLink", "Warning", "Direct IP address link detected. Domain-named endpoints with valid SSL certificates are strongly recommended.")
        };

        /// <inheritdoc />
        public TemplateSecurityScanResult Inspect(
            string? htmlTemplate,
            string? cssStyles,
            string? jsScript,
            string? defaultContentJson = null)
        {
            var result = new TemplateSecurityScanResult();

            // 1. Inspect HTML Template
            if (!string.IsNullOrWhiteSpace(htmlTemplate))
            {
                ScanText(htmlTemplate, "HtmlTemplate", HtmlRules, result);
                ScanSqlPatterns(htmlTemplate, "HtmlTemplate", result);
                ScanUrls(htmlTemplate, "HtmlTemplate", result);
            }

            // 2. Inspect Scoped CSS Styles
            if (!string.IsNullOrWhiteSpace(cssStyles))
            {
                ScanText(cssStyles, "CssStyles", CssRules, result);
                ScanSqlPatterns(cssStyles, "CssStyles", result);
                ScanUrls(cssStyles, "CssStyles", result);
            }

            // 3. Inspect Client JavaScript
            if (!string.IsNullOrWhiteSpace(jsScript))
            {
                ScanText(jsScript, "JsScript", JavaScriptRules, result);
                ScanSqlPatterns(jsScript, "JsScript", result);
                ScanUrls(jsScript, "JsScript", result);
            }

            // 4. Inspect Sample Content JSON
            if (!string.IsNullOrWhiteSpace(defaultContentJson))
            {
                ScanSqlPatterns(defaultContentJson, "DefaultContentJson", result);
                ScanUrls(defaultContentJson, "DefaultContentJson", result);
            }

            return result;
        }

        private static void ScanText(
            string content,
            string fieldName,
            IEnumerable<(Regex Pattern, string Category, string Severity, string Message)> rules,
            TemplateSecurityScanResult result)
        {
            foreach (var (pattern, category, severity, message) in rules)
            {
                var matches = pattern.Matches(content);
                foreach (Match match in matches)
                {
                    var snippet = ExtractSnippet(content, match.Index, match.Length);
                    var line = CalculateLineNumber(content, match.Index);

                    result.Violations.Add(new TemplateSecurityViolation
                    {
                        Field = fieldName,
                        ThreatCategory = category,
                        Severity = severity,
                        Snippet = snippet,
                        LineNumber = line,
                        Message = message
                    });
                }
            }
        }

        private static void ScanSqlPatterns(string content, string fieldName, TemplateSecurityScanResult result)
        {
            foreach (var (pattern, category, message) in SqlInjectionRules)
            {
                var matches = pattern.Matches(content);
                foreach (Match match in matches)
                {
                    var snippet = ExtractSnippet(content, match.Index, match.Length);
                    var line = CalculateLineNumber(content, match.Index);

                    result.Violations.Add(new TemplateSecurityViolation
                    {
                        Field = fieldName,
                        ThreatCategory = category,
                        Severity = "Critical",
                        Snippet = snippet,
                        LineNumber = line,
                        Message = message
                    });
                }
            }
        }

        private static void ScanUrls(string content, string fieldName, TemplateSecurityScanResult result)
        {
            foreach (var (pattern, category, severity, message) in UrlRules)
            {
                var matches = pattern.Matches(content);
                foreach (Match match in matches)
                {
                    var snippet = ExtractSnippet(content, match.Index, match.Length);
                    var line = CalculateLineNumber(content, match.Index);

                    result.Violations.Add(new TemplateSecurityViolation
                    {
                        Field = fieldName,
                        ThreatCategory = category,
                        Severity = severity,
                        Snippet = snippet,
                        LineNumber = line,
                        Message = message
                    });
                }
            }
        }

        /// <summary>
        /// Safely extracts a readable excerpt of code around a detected match index.
        /// </summary>
        private static string ExtractSnippet(string text, int index, int length)
        {
            const int padding = 35;
            var start = Math.Max(0, index - padding);
            var end = Math.Min(text.Length, index + length + padding);
            var snippet = text[start..end].Replace("\r", " ").Replace("\n", " ").Trim();
            return snippet.Length > 120 ? snippet[..120] + "..." : snippet;
        }

        /// <summary>
        /// Computes the 1-based line number for a specific character offset in the source string.
        /// </summary>
        private static int CalculateLineNumber(string text, int index)
        {
            if (string.IsNullOrEmpty(text) || index <= 0) return 1;
            var line = 1;
            for (var i = 0; i < Math.Min(index, text.Length); i++)
            {
                if (text[i] == '\n') line++;
            }
            return line;
        }
    }
}
