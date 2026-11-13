using System;
using System.Collections.Generic;

namespace Ozikol.Central.Services.Seo
{
    /// <summary>
    /// Represents a platform support capability badge (e.g., Windows Desktop, Web, Mobile).
    /// </summary>
    public class PlatformSupportBadge
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // "Desktop", "Web", "Mobile", "Edge"
        public string Icon { get; set; } = string.Empty;
        public string TechnicalDetail { get; set; } = string.Empty; // e.g. "Native Windows 10/11 x64 (.exe)"
    }

    /// <summary>
    /// Represents a high-value Question and Answer pair optimized for SEO and LLM knowledge graphs.
    /// </summary>
    public class FeatureFaqItem
    {
        public string Question { get; set; } = string.Empty;
        public string Answer { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents an industry-specific application of the feature.
    /// </summary>
    public class IndustryUseCaseItem
    {
        public string IndustryKey { get; set; } = string.Empty; // "healthcare", "retail-pos", "education", "corporate-governance"
        public string IndustryName { get; set; } = string.Empty;
        public string Headline { get; set; } = string.Empty;
        public string ProblemSolved { get; set; } = string.Empty;
        public string SolutionSummary { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents a comprehensive metadata and knowledge manifest for an Ozikol BCC feature.
    /// Used by SEO engines, JSON-LD Schema generators, and AI llms.txt discovery pipelines.
    /// </summary>
    public class FeatureKnowledgeEntry
    {
        public string FeatureCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Tagline { get; set; } = string.Empty;
        public string SuiteName { get; set; } = string.Empty;
        public string RouteSlug { get; set; } = string.Empty; // e.g. "/features/staff-rota"
        public string Summary { get; set; } = string.Empty;
        public string ArchitecturalMoat { get; set; } = string.Empty;

        public List<PlatformSupportBadge> Platforms { get; set; } = new();
        public List<string> KeyCapabilities { get; set; } = new();
        public List<FeatureFaqItem> Faqs { get; set; } = new();
        public List<IndustryUseCaseItem> IndustryUseCases { get; set; } = new();
    }

    /// <summary>
    /// Service contract providing unified feature knowledge, FAQ schemas, and cross-platform matrix.
    /// </summary>
    public interface IFeatureKnowledgeRegistry
    {
        /// <summary>
        /// Retrieves the knowledge manifest for a feature by its code (e.g. "bcp-staff-rota") or route slug (e.g. "/features/staff-rota").
        /// </summary>
        FeatureKnowledgeEntry? GetFeature(string featureCodeOrSlug);

        /// <summary>
        /// Retrieves all registered feature knowledge entries.
        /// </summary>
        IReadOnlyList<FeatureKnowledgeEntry> GetAllFeatures();

        /// <summary>
        /// Retrieves all features relevant to a specific industry vertical (e.g. "healthcare", "retail-pos").
        /// </summary>
        IReadOnlyList<FeatureKnowledgeEntry> GetFeaturesForIndustry(string industryKey);

        /// <summary>
        /// Generates the raw JSON-LD string for FAQPage and SoftwareApplication schema for a given feature.
        /// </summary>
        string GenerateJsonLdSchema(FeatureKnowledgeEntry entry, string currentUrl);
    }
}
