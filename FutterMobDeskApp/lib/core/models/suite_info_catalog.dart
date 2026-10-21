import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Represents structured domain knowledge and capabilities for an enterprise suite.
class SuiteInfoItem {
  /// Unique identifier key matching the suite (e.g. 'core_command', 'user_management').
  final String key;

  /// High-level badge label (e.g. 'Executive Command • Core Platform').
  final String badge;

  /// Primary icon representing the suite.
  final IconData icon;

  /// Title of the suite.
  final String title;

  /// Short summary description.
  final String shortDesc;

  /// Target audience / administrative roles who operate this suite.
  final String whoUsesIt;

  /// List of core modular capabilities and sub-workflows.
  final List<String> capabilities;

  /// Explanation of how this suite impacts organization efficiency and operations.
  final String impact;

  const SuiteInfoItem({
    required this.key,
    required this.badge,
    required this.icon,
    required this.title,
    required this.shortDesc,
    required this.whoUsesIt,
    required this.capabilities,
    required this.impact,
  });
}

/// Catalog containing domain metadata and capabilities for all 14 enterprise suites.
/// Powers the contextual info triggers across Desktop and Mobile navigation drawers.
class SuiteInfoCatalog {
  static const Map<String, SuiteInfoItem> _items = {
    'core_command': SuiteInfoItem(
      key: 'core_command',
      badge: 'Executive Command • Core Platform',
      icon: Icons.space_dashboard_rounded,
      title: 'Central Command & Cockpit',
      shortDesc: 'The unified executive cockpit for leadership and directors. Aggregates real-time telemetry across revenue, operations, task queues, and automated audit health.',
      whoUsesIt: 'Executive leadership, C-suite, Board members, Managing Directors, Operations Heads.',
      capabilities: [
        'Central Executive Command Cockpit with real-time KPI aggregations',
        'Visual Analytics & System Health Telemetry',
        'Cross-organizational task delegation and status boards',
        'Active alert dispatch monitor and milestone trackers',
      ],
      impact: 'Provides real-time visibility into high-level organizational health and operational bottlenecks without manual spreadsheet reporting.',
    ),
    'user_management': SuiteInfoItem(
      key: 'user_management',
      badge: 'Suite 01 • Core Identity',
      icon: Icons.manage_accounts_rounded,
      title: 'User Management & Access Control',
      shortDesc: 'Unified directory and security governance suite. Manage user directories, categorized cohorts, custom registration forms, dynamic leaderboards, and role-based permissions.',
      whoUsesIt: 'System administrators, HR managers, Membership coordinators, Community managers.',
      capabilities: [
        'Central Member Directory with real-time status and quick search',
        'Role & Permission Matrices with granular security policies',
        'Dynamic Registration Form Builder with custom field schemas',
        'Member KPIs, Badges & Activity Telemetry Leaderboards',
        'Direct Member Invitations and Security Credential Management',
      ],
      impact: 'Secures organizational identity, automates self-registration onboarding, and delivers continuous member engagement metrics.',
    ),
    'people_community': SuiteInfoItem(
      key: 'people_community',
      badge: 'Suite 02 • Community Add-on',
      icon: Icons.groups_rounded,
      title: 'People, Groups & Community',
      shortDesc: 'Comprehensive member identity, staff directory, and community organization hub. Manages classifications, sub-categories, alumni tracking, and working committee collaboration.',
      whoUsesIt: 'HR managers, Membership coordinators, Community managers, Alumni directors, Association secretaries.',
      capabilities: [
        'Central Member Directory with quick search, filters & export',
        'Category & Sub-Category Segmentation (e.g. VIP, Staff, Volunteers)',
        'Interactive Working Groups, Working Committees & Community Hubs',
        'Alumni Network Tracking & Graduation Cohorts',
        'Real-time Ozikol Chat Messenger for staff and member collaboration',
        'Confidential Whistleblowing & Feedback Oversight',
      ],
      impact: 'Transforms passive contact lists into structured, searchable communities with custom taxonomy and lifecycle history.',
    ),
    'workforce_shifts': SuiteInfoItem(
      key: 'workforce_shifts',
      badge: 'Suite 03 • Operations Add-on',
      icon: Icons.calendar_month_rounded,
      title: 'Workforce, Shifts & Scheduling',
      shortDesc: 'Operational staff and volunteer roster management. Coordinate rota shifts, handle shift swaps, track clock-in attendance, and synchronize team calendars.',
      whoUsesIt: 'Operations managers, Shift supervisors, Volunteer coordinators, Department leads.',
      capabilities: [
        'Visual Staff & Volunteer Rota Scheduling',
        'Interactive Shift Swaps & Leave Request Approvals',
        'Clock-In Attendance Tracking with verification',
        'Master Team Calendar & Automated Follow-Up Reminders',
      ],
      impact: 'Eliminates scheduling conflicts, ensures adequate operational coverage, and automates labor attendance tracking.',
    ),
    'events_ticketing': SuiteInfoItem(
      key: 'events_ticketing',
      badge: 'Suite 04 • Events Add-on',
      icon: Icons.confirmation_number_rounded,
      title: 'Events & Ticketing',
      shortDesc: 'Comprehensive event planning and ticketing platform. Sell tickets, manage attendee tiers, coordinate multi-track speaker sessions, and verify QR check-ins.',
      whoUsesIt: 'Event directors, Conference coordinators, Program managers, Ticket sales agents.',
      capabilities: [
        'Event Publishing & Multi-Tier Pass Ticketing Engine',
        'Speaker & Session Track Agenda Builder',
        'Real-Time QR Code Attendee Check-In Desk',
        'Attendee Communication & Automated Badge Generation',
      ],
      impact: 'Maximizes ticket revenue and streamlines day-of-event check-in lines with fast QR scanning.',
    ),
    'commerce_store': SuiteInfoItem(
      key: 'commerce_store',
      badge: 'Suite 05 • Commerce Add-on',
      icon: Icons.storefront_rounded,
      title: 'Commerce & Store Studio',
      shortDesc: 'Full-featured physical and digital product storefront. Manage product variants, inventory levels, promotional categories, shopping cart checkout, and fulfillment dispatch.',
      whoUsesIt: 'Merchandise teams, Retail businesses, Non-profits selling branded items, Digital creators.',
      capabilities: [
        'Product Catalog & Inventory Management with low-stock alerts',
        'New Product Creation with Multi-image Galleries & Variants',
        'Category Taxonomy & Storefront Showcase Sorting',
        'Customer Order Processing, Tracking & Fulfillment Pipeline',
        'Store Financial Transaction Ledger & Settlement Summaries',
      ],
      impact: 'Enables direct digital and merchandise commerce without expensive third-party store transaction fees.',
    ),
    'finance_banking': SuiteInfoItem(
      key: 'finance_banking',
      badge: 'Suite 06 • Finance Add-on',
      icon: Icons.account_balance_rounded,
      title: 'Finance & Embedded Banking',
      shortDesc: 'Complete financial automation and dues management. Issue invoices, track membership dues, process payouts, and manage grants and sponsorships.',
      whoUsesIt: 'Finance officers, Treasurers, Accountants, Grant administrators.',
      capabilities: [
        'Automated Invoicing & Member Dues Collection',
        'Embedded Banking Rails & Direct Automated Payouts',
        'Proposal & Grant Allocation Tracking',
        'Real-time Financial Audit Trail & Reconciliation',
      ],
      impact: 'Automates payment collection cycles, reduces late dues, and delivers real-time ledger accounting.',
    ),
    'communication_support': SuiteInfoItem(
      key: 'communication_support',
      badge: 'Suite 07 • Communications',
      icon: Icons.campaign_rounded,
      title: 'Communication & Helpdesk Studio',
      shortDesc: 'Multi-channel outbound broadcasting and customer support hub. Send broadcast campaigns across Email, SMS, WhatsApp, and in-app feeds, with automated helpdesk ticketing.',
      whoUsesIt: 'Public relations teams, Support agents, Communications leads, Dispatchers.',
      capabilities: [
        'Mass Broadcast Studio (Email, SMS, WhatsApp, In-App Notifications)',
        'GoCall AI Emergency Voice Dispatch & Alerts',
        'Multi-Tier Helpdesk & Ticketing Automation',
        'Live Chat Widget Configuration & Routing',
      ],
      impact: 'Unifies broadcast communication and member issue resolution under a single deliverability-checked queue.',
    ),
    'reports_forms': SuiteInfoItem(
      key: 'reports_forms',
      badge: 'Suite 08 • Intelligence',
      icon: Icons.insights_rounded,
      title: 'Data Collection & Intelligence',
      shortDesc: 'Dynamic survey builders, interval business intelligence reports, reference form checks, and organization knowledge repositories.',
      whoUsesIt: 'Data analysts, Operations officers, Quality assurance leads, Researchers.',
      capabilities: [
        'Dynamic Multi-Interval Business Intelligence Reports',
        'Custom Forms & Surveys Builder with live analytics',
        'Reference Form System for member and staff vetting',
        'Central Knowledge Base & Documentation Repository',
      ],
      impact: 'Eliminates external survey subscriptions and turns raw operational data into actionable intelligence.',
    ),
    'academy_training': SuiteInfoItem(
      key: 'academy_training',
      badge: 'Suite 09 • Education Add-on',
      icon: Icons.school_rounded,
      title: 'Academy, LMS & Training',
      shortDesc: 'Full educational course delivery and certificate verification platform. Create video and module curricula, administer exams, and issue verifiable digital credentials.',
      whoUsesIt: 'Training officers, Educators, Certification coordinators, HR learning leads.',
      capabilities: [
        'Curriculum & Course Management with multimedia modules',
        'Automated Quiz, Exam & Assessment Engine',
        'Digital Certificate Issuance with public verification QR codes',
        'Student Progress Tracking & Course Analytics',
      ],
      impact: 'Standardizes organizational onboarding and generates training revenue with verifiable certificates.',
    ),
    'compliance_governance': SuiteInfoItem(
      key: 'compliance_governance',
      badge: 'Suite 10 • Governance',
      icon: Icons.policy_rounded,
      title: 'Compliance, Governance & Vault',
      shortDesc: 'Confidential document cloud repository, automated KYC identity verification, and physical facility visitor gate access logs.',
      whoUsesIt: 'Compliance officers, Legal counsel, Security staff, Facility managers.',
      capabilities: [
        'Document Cloud Vault with role-based access control',
        'Automated KYC & Identity Document Verification',
        'Visitor Gate Management & Physical Entry Logging',
        'Regulatory Compliance Checklist & Policy Auditing',
      ],
      impact: 'Guarantees audit readiness, reduces physical security risks, and enforces strict document access compliance.',
    ),
    'demographics_census': SuiteInfoItem(
      key: 'demographics_census',
      badge: 'Suite 11 • Field & Census',
      icon: Icons.map_rounded,
      title: 'Demographics, Census & ID Cards',
      shortDesc: 'Field mapping, census enumeration tools, and official digital member ID card generation with NFC/QR verification.',
      whoUsesIt: 'Census teams, Field surveyors, Community leaders, Security personnel.',
      capabilities: [
        'Community Census & Geographic Household Mapping',
        'Mobile Field Surveyor Data Collection Tools',
        'Digital Member ID Card Generator with QR codes',
        'Demographic Heatmaps & Population Intelligence',
      ],
      impact: 'Empowers field teams to capture accurate on-the-ground census data and issues instant verified member IDs.',
    ),
    'billing_subscriptions': SuiteInfoItem(
      key: 'billing_subscriptions',
      badge: 'Suite 12 • Subscriptions',
      icon: Icons.credit_card_rounded,
      title: 'Feature Billing & Licenses',
      shortDesc: 'Central tenant license and subscription management. View active plan quotas, renew feature licenses, and manage payment methods.',
      whoUsesIt: 'Tenant owners, Billing administrators, Finance directors.',
      capabilities: [
        'Active Modular Capability & License Overview',
        'Plan Renewal & Automated Invoicing',
        'Usage Quotas & Resource Consumption Telemetry',
        'Payment Method & Billing History Management',
      ],
      impact: 'Gives full transparency into recurring subscription costs and ensures seamless feature license renewals.',
    ),
    'security_audit': SuiteInfoItem(
      key: 'security_audit',
      badge: 'Suite 13 • Security Audit',
      icon: Icons.security_rounded,
      title: 'Security Audit & Forensics',
      shortDesc: 'Immutable audit logs and system forensic trails. Track administrative actions, authentication attempts, permission modifications, and security anomalies.',
      whoUsesIt: 'Security officers, System administrators, Forensic auditors.',
      capabilities: [
        'Real-time Security Event & Access Logging',
        'IP Address & Geolocation Tracking on sensitive actions',
        'Credential & Role Modification Audit Trail',
        'Anomaly Detection & Exportable Compliance Logs',
      ],
      impact: 'Guarantees complete accountability for all administrative actions and protects against unauthorized access.',
    ),
  };

  /// Retrieves the metadata item for the specified [suiteKey].
  static SuiteInfoItem? get(String suiteKey) => _items[suiteKey];

  /// Displays the contextual suite capabilities modal.
  /// Renders a centered dialog on Desktop (width >= 768px) and a bottom sheet on Mobile.
  static void show(BuildContext context, String suiteKey) {
    final item = _items[suiteKey];
    if (item == null) return;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDesktop = MediaQuery.of(context).size.width >= 768;

    if (isDesktop) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
          contentPadding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          title: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: isDark ? 0.25 : 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Icon(item.icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.badge.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 20),
                tooltip: 'Close',
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.shortDesc,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                    ),
                  ),
                  const SizedBox(height: 18),
                  _buildSectionCard(
                    icon: Icons.badge_outlined,
                    label: 'Target Roles & Users',
                    content: Text(
                      item.whoUsesIt,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                      ),
                    ),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 14),
                  _buildSectionCard(
                    icon: Icons.checklist_rounded,
                    label: 'Modular Capabilities',
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: item.capabilities.map((c) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(top: 4, right: 8),
                              child: Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF16A34A)),
                            ),
                            Expanded(
                              child: Text(
                                c,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                                ),
                              ),
                            ),
                          ],
                        ),
                      )).toList(),
                    ),
                    isDark: isDark,
                  ),
                  const SizedBox(height: 14),
                  _buildSectionCard(
                    icon: Icons.bolt_rounded,
                    label: 'Business Impact',
                    content: Text(
                      item.impact,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                      ),
                    ),
                    isDark: isDark,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('Understood', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: isDark ? 0.25 : 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Icon(item.icon, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.badge.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          Text(
                            item.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: isDark ? AppColors.onSurfaceDark : AppColors.onSurfaceLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.of(context).size.height * 0.55,
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.shortDesc,
                          style: TextStyle(
                            fontSize: 12.5,
                            height: 1.45,
                            color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                          ),
                        ),
                        const SizedBox(height: 14),
                        _buildSectionCard(
                          icon: Icons.checklist_rounded,
                          label: 'Key Capabilities',
                          content: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: item.capabilities.map((c) => Padding(
                              padding: const EdgeInsets.only(bottom: 5),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.only(top: 3, right: 6),
                                    child: Icon(Icons.check_circle_rounded, size: 13, color: Color(0xFF16A34A)),
                                  ),
                                  Expanded(
                                    child: Text(
                                      c,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )).toList(),
                          ),
                          isDark: isDark,
                        ),
                        const SizedBox(height: 12),
                        _buildSectionCard(
                          icon: Icons.bolt_rounded,
                          label: 'Business Impact',
                          content: Text(
                            item.impact,
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                            ),
                          ),
                          isDark: isDark,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Dismiss', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }

  static Widget _buildSectionCard({
    required IconData icon,
    required String label,
    required Widget content,
    required bool isDark,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B).withValues(alpha: 0.6) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          content,
        ],
      ),
    );
  }
}
