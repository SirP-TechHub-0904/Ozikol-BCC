using System;
using System.Collections.Generic;

namespace Ozikol.MasterDomain.Help
{
    /// <summary>
    /// Transfer representation of page help documentation served to clients.
    /// </summary>
    public class MasterPageHelpDto
    {
        /// <summary>Unique identifier.</summary>
        public Guid Id { get; set; }

        /// <summary>Normalized route URL path (e.g. "/workforce/console/analytics").</summary>
        public string RouteKey { get; set; } = string.Empty;

        /// <summary>Feature suite name (e.g. "Workforce & Shifts").</summary>
        public string FeatureSuite { get; set; } = string.Empty;

        /// <summary>Canonical page title.</summary>
        public string PageTitle { get; set; } = string.Empty;

        /// <summary>Brief summary statement.</summary>
        public string? ShortSummary { get; set; }

        /// <summary>Full rich-text/markdown workflow overview.</summary>
        public string OverviewMarkdown { get; set; } = string.Empty;

        /// <summary>Serialized JSON actions array.</summary>
        public string? ActionsJson { get; set; }

        /// <summary>Parsed structured action items list.</summary>
        public List<HelpActionItemDto>? Actions { get; set; }

        /// <summary>Serialized JSON related routes array.</summary>
        public string? RelatedRoutesJson { get; set; }

        /// <summary>Parsed structured related routes list.</summary>
        public List<HelpRelatedRouteDto>? RelatedRoutes { get; set; }

        /// <summary>Interactive tour walkthrough steps JSON.</summary>
        public string? TourStepsJson { get; set; }

        /// <summary>Page category ("Console", "Workspace", "Settings", etc.).</summary>
        public string Category { get; set; } = "Console";

        /// <summary>Whether this documentation is published.</summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>Author or modifier email.</summary>
        public string? LastUpdatedBy { get; set; }

        /// <summary>Last updated timestamp.</summary>
        public DateTime UpdatedAtUtc { get; set; }
    }

    /// <summary>
    /// Structured representation of an interactive action, button, or control.
    /// </summary>
    public class HelpActionItemDto
    {
        /// <summary>Button or control label (e.g. "Create Shift").</summary>
        public string Trigger { get; set; } = string.Empty;

        /// <summary>Icon identifier (e.g. "plus", "refresh", "download").</summary>
        public string? Icon { get; set; }

        /// <summary>Clear explanation of what the button does.</summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>Optional route destination if this action navigates.</summary>
        public string? Route { get; set; }
    }

    /// <summary>
    /// Sibling or related navigation shortcut inside the active suite.
    /// </summary>
    public class HelpRelatedRouteDto
    {
        /// <summary>Display title.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Target application route URL.</summary>
        public string Route { get; set; } = string.Empty;

        /// <summary>Icon identifier.</summary>
        public string? Icon { get; set; }
    }

    /// <summary>
    /// Request payload for developer or admin authoring/updating page help.
    /// </summary>
    public class SaveMasterPageHelpRequest
    {
        /// <summary>Route URL path.</summary>
        public string RouteKey { get; set; } = string.Empty;

        /// <summary>Feature suite name.</summary>
        public string FeatureSuite { get; set; } = string.Empty;

        /// <summary>Page title.</summary>
        public string PageTitle { get; set; } = string.Empty;

        /// <summary>Summary.</summary>
        public string? ShortSummary { get; set; }

        /// <summary>Markdown documentation.</summary>
        public string OverviewMarkdown { get; set; } = string.Empty;

        /// <summary>Actions JSON or structured items.</summary>
        public string? ActionsJson { get; set; }

        /// <summary>Related routes JSON.</summary>
        public string? RelatedRoutesJson { get; set; }

        /// <summary>Tour steps JSON.</summary>
        public string? TourStepsJson { get; set; }

        /// <summary>Category ("Console", "Workspace").</summary>
        public string Category { get; set; } = "Console";

        /// <summary>Published flag.</summary>
        public bool IsPublished { get; set; } = true;
    }

    /// <summary>
    /// Lightweight search match result.
    /// </summary>
    public class MasterHelpTopicSearchResultDto
    {
        /// <summary>Route path.</summary>
        public string RouteKey { get; set; } = string.Empty;

        /// <summary>Page title.</summary>
        public string PageTitle { get; set; } = string.Empty;

        /// <summary>Feature suite name.</summary>
        public string FeatureSuite { get; set; } = string.Empty;

        /// <summary>Concise summary.</summary>
        public string? ShortSummary { get; set; }

        /// <summary>Category.</summary>
        public string Category { get; set; } = "Console";
    }
}
