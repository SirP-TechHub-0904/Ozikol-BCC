import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../localization/language_provider.dart';

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
      badge: 'Suite 02 • Core Identity',
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
      badge: 'Suite 03 • Community Add-on',
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
      badge: 'Suite 04 • Operations Add-on',
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
      badge: 'Suite 05 • Events Add-on',
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
      badge: 'Suite 06 • Commerce Add-on',
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
      badge: 'Suite 07 • Fiscal Add-on',
      icon: Icons.account_balance_rounded,
      title: 'Finance & Banking Rail',
      shortDesc: 'Institutional fiscal governance engine: automate recurring membership dues, issue professional multi-currency invoices, connect banking gateways, and manage grant applications.',
      whoUsesIt: 'Finance controllers, Treasurers, Accountants, Grant officers, Executive directors.',
      capabilities: [
        'Member Dues Invoicing with recurring billing schedules',
        'Multi-currency Invoice Generation with PDF receipt export',
        'Integrated Banking Gateways & Settlement reconciliation',
        'Proposals, Philanthropic Grants Pipeline & Donor Funding Logs',
      ],
      impact: 'Automates payment collection cycles, reduces late dues, and delivers real-time ledger accounting.',
    ),
    'communication_support': SuiteInfoItem(
      key: 'communication_support',
      badge: 'Suite 08 • Engagement Add-on',
      icon: Icons.campaign_rounded,
      title: 'Communication & Support Hub',
      shortDesc: 'Unified multi-channel outreach and member assistance center. Broadcast mass alerts across Email, SMS, WhatsApp, and in-app feeds, with automated helpdesk ticketing.',
      whoUsesIt: 'Communications teams, Customer support reps, Community liaisons, Crisis responders.',
      capabilities: [
        'Mass Notification Studio with Email, SMS, WhatsApp & In-App delivery',
        'Real-time Anti-Spam Scanner & Mailbox Blacklist Guard',
        'Delivery Telemetry, Open-rate and Click-through Analytics',
        'Internal Ozikol Chat Messenger for staff & team collaboration',
        'Embeddable Live Chat Widget for public websites',
        'Multi-agent Helpdesk Ticketing System with SLA routing',
        'Social Bio Link-Tree Landing Page Builder',
      ],
      impact: 'Unifies broadcast communication and member issue resolution under a single deliverability-checked queue.',
    ),
    'forms_intelligence': SuiteInfoItem(
      key: 'forms_intelligence',
      badge: 'Suite 09 • Data Add-on',
      icon: Icons.dynamic_form_rounded,
      title: 'Forms & Intelligence',
      shortDesc: 'No-code dynamic form builder and feedback engine. Create member onboarding questionnaires, event registration surveys, voting ballots, and automate downstream actions.',
      whoUsesIt: 'Research officers, Program managers, HR evaluators, Event planners, Community organizers.',
      capabilities: [
        'Drag-and-Drop Dynamic Form & Survey Builder',
        'Survey Response Analytics with real-time charts & CSV exports',
        'Custom Field Schema Designer with conditional branching',
        'Automated workflow triggers based on form submission values',
      ],
      impact: 'Replaces external tools with deeply integrated data capture directly linked to member profiles.',
    ),
    'reports_forms': SuiteInfoItem(
      key: 'forms_intelligence',
      badge: 'Suite 09 • Data Add-on',
      icon: Icons.dynamic_form_rounded,
      title: 'Forms & Intelligence',
      shortDesc: 'No-code dynamic form builder and feedback engine. Create member onboarding questionnaires, event registration surveys, voting ballots, and automate downstream actions.',
      whoUsesIt: 'Research officers, Program managers, HR evaluators, Event planners, Community organizers.',
      capabilities: [
        'Drag-and-Drop Dynamic Form & Survey Builder',
        'Survey Response Analytics with real-time charts & CSV exports',
        'Custom Field Schema Designer with conditional branching',
        'Automated workflow triggers based on form submission values',
      ],
      impact: 'Replaces external tools with deeply integrated data capture directly linked to member profiles.',
    ),
    'academy_training': SuiteInfoItem(
      key: 'academy_training',
      badge: 'Suite 10 • Education Add-on',
      icon: Icons.school_rounded,
      title: 'Academy & Training Suite',
      shortDesc: 'Modern Learning Management System (LMS) and credentialing engine. Host video lessons, track student progress, administer quizzes, and generate cryptographically verifiable QR certificates.',
      whoUsesIt: 'Training officers, Educators, Certification coordinators, HR learning leads.',
      capabilities: [
        'Course Curriculum Builder with modular video, audio & text lessons',
        'Student Enrollment, Quiz Scoring & Progress Telemetry',
        'Dynamic Certificate Designer with automated credential generation',
        'Cryptographic QR-Code Verification Portal for public credential verification',
      ],
      impact: 'Enables continuous education, compliance accreditation, and monetization of training programs under your own brand.',
    ),
    'compliance_governance': SuiteInfoItem(
      key: 'compliance_governance',
      badge: 'Suite 11 • Governance Add-on',
      icon: Icons.verified_user_rounded,
      title: 'Compliance & Governance Vault',
      shortDesc: 'Enterprise trust, security, and physical access suite. Securely archive confidential contracts, verify customer identities (KYC), and issue digital visitor gate passes.',
      whoUsesIt: 'Legal counsel, Compliance officers, Security personnel, Facility receptionists, Audit committees.',
      capabilities: [
        'Document Vault & Cloud Archive with role-based access encryption',
        'KYC & Government Identity Document Verification Pipeline',
        'Visitor & Digital Gate Pass Management with entry/exit timestamps',
        'Policy acknowledgment tracking and audit verification trail',
      ],
      impact: 'Guarantees regulatory compliance, protects sensitive institutional documents, and digitizes physical visitor security.',
    ),
    'demographics_census': SuiteInfoItem(
      key: 'demographics_census',
      badge: 'Suite 12 • Community Add-on',
      icon: Icons.analytics_rounded,
      title: 'Demographics & Census',
      shortDesc: 'Territorial and population analytics for communities, municipalities, and religious organizations. Map geographic spread, issue digital resident ID cards, and analyze demographic shifts.',
      whoUsesIt: 'Community leaders, Municipal boards, NGO field directors, Census coordinators, Faith organizations.',
      capabilities: [
        'Community Geographic Census with territorial heatmaps',
        'Digital Resident & Member ID Card Generation with QR codes',
        'Demographic Analytics & Longitudinal Cohort Growth Charts',
        'Household & Family Unit Relationship Grouping',
      ],
      impact: 'Delivers clear demographic insights to allocate community resources, plan outreach programs, and issue verifiable digital identity badges.',
    ),
    'billing_subscriptions': SuiteInfoItem(
      key: 'billing_subscriptions',
      badge: 'Suite 13 • Platform Governance',
      icon: Icons.credit_card_rounded,
      title: 'Billing & Subscriptions',
      shortDesc: 'Tenant subscription and feature billing management. Track plan usage, manage credit card payment methods, review past invoices, and add modular feature add-ons.',
      whoUsesIt: 'Tenant Owners, Primary Billing Contacts, Financial Administrators.',
      capabilities: [
        'Subscription Dashboard with active plan and renewal cycle details',
        'Payment Methods Management (Stripe, Cards, Bank Transfers)',
        'Transparent Bill Calculator based on active members and activated suites',
        'Modular Feature Add-on Marketplace with instant activation',
      ],
      impact: 'Provides total transparency into tenant infrastructure costs and self-service scalability.',
    ),
    'security_audit': SuiteInfoItem(
      key: 'security_audit',
      badge: 'Suite 14 • Platform Protection',
      icon: Icons.security_rounded,
      title: 'Security & Audit',
      shortDesc: 'Comprehensive platform security and compliance logging. Inspect immutable audit logs, review authentication history, enforce security policies, and manage active sessions.',
      whoUsesIt: 'Security administrators, IT directors, Compliance auditors, System administrators.',
      capabilities: [
        'Live Security & Audit Logs with IP tracking and payload inspection',
        'Login & Access History with geo-location risk flagging',
        'Active Sessions Directory with one-click remote session termination',
        'Global Security Policies (MFA enforcement, password rotation rules)',
      ],
      impact: 'Ensures zero unauthorized access, maintains forensic audit trails for SOC2/ISO27001 compliance, and safeguards tenant data.',
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
                          label: context.trc('suite.core_capabilities', fallback: 'Key Capabilities'),
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
                          label: context.trc('suite.business_impact', fallback: 'Business Impact'),
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
                    child: Text(context.trc('common.dismiss', fallback: 'Dismiss'), style: const TextStyle(fontWeight: FontWeight.w600)),
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
