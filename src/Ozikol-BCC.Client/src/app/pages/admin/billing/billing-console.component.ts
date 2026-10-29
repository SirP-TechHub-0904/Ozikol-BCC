import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../../environments/environment';
import {
  BillingService,
  BillingFeaturesSnapshot,
  BillingFeatureItem
} from './services/billing.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SuiteFeatureGroup {
  suiteName: string;
  suiteLetter: string;
  suiteIndex: number;
  features: Array<BillingFeatureItem & { serialNo: number }>;
  availableCount: number;
  comingSoonCount: number;
}

/**
 * Subscription Plans & Master Capability Directory Console (Suite 13 - Page 1).
 * Displays all platform capabilities from MasterCatalogDbContext grouped by the 10 canonical suites,
 * showing Available for Use vs. Coming Soon posture, tier classification, and subscription rates.
 */
@Component({
  selector: 'app-billing-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './billing-console.component.html',
  styleUrls: ['./billing-console.component.css']
})
export class BillingConsoleComponent implements OnInit, OnDestroy {
  /**
   * Canonical ordering of the 10 platform suites matching the Master Feature Catalog (/centralwks/features).
   */
  static readonly CanonicalSuites: string[] = [
    'People, Community & Collaboration',
    'Workforce, Rota & Scheduling',
    'Reports, Forms & Analytics',
    'Events & Training Management',
    'Finance & Commercial Revenue',
    'Operations & Workflows',
    'Communication, AI & Support',
    'Compliance, Learning & Certification',
    'Demographics & Civic Census',
    'Life Events & Publications'
  ];

  isLoading = false;
  viewMode: 'cards' | 'table' = 'cards';

  // Filter & Search controls
  searchQuery = '';
  selectedSuite = '';
  availabilityFilter: 'all' | 'available' | 'coming_soon' = 'all';
  tierFilter: 'all' | 'compulsory' | 'optional' = 'all';

  // Snapshot data from MasterCatalogDbContext via /api/billing/features
  snapshot: BillingFeaturesSnapshot = this.buildDefaultSnapshot();

  // Feature Details Modal
  selectedFeatureDetail: (BillingFeatureItem & { serialNo?: number; suiteLetter?: string }) | null = null;
  showFeatureDetailModal = false;

  // Contextual Suite Info Modal
  showInfoModal = false;

  // Real-time WebSocket state (/hubs/notifications)
  isRealtimeConnected = false;
  private hubConnection: signalR.HubConnection | null = null;
  private routeSub: Subscription | null = null;

  constructor(
    private billingService: BillingService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSnapshot();
    this.startRealtimeSocket();
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.hubConnection = null;
    }
  }

  /**
   * Establishes a real-time SignalR WebSocket connection to /hubs/notifications
   * so any capability toggled in Master (/centralwks/features) updates the UI automatically.
   */
  private startRealtimeSocket(): void {
    const apiOrigin = environment.apiUrl.startsWith('http')
      ? environment.apiUrl.replace(/\/api\/?$/, '')
      : typeof window !== 'undefined'
        ? `${window.location.origin}${environment.apiUrl.replace(/\/api\/?$/, '')}`
        : '';

    const tenantKey =
      localStorage.getItem('tenant_key') ||
      localStorage.getItem('tenant_domain') ||
      'workspace';

    const hubUrl = `${apiOrigin}/hubs/notifications?tenantKey=${encodeURIComponent(tenantKey)}`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection.on('BillingUpdated', (incoming: BillingFeaturesSnapshot) => {
      this.ngZone.run(() => {
        if (incoming) {
          this.snapshot = incoming;
          if (this.selectedFeatureDetail) {
            const refreshed = this.allOrderedFeatures.find(
              f => f.featureCode === this.selectedFeatureDetail?.featureCode
            );
            if (refreshed) {
              this.selectedFeatureDetail = refreshed;
            } else {
              this.closeFeatureDetail();
            }
          }
          this.toastService.info(
            'Master Catalog Synchronized',
            'Published capabilities and availability updated in real time.'
          );
        }
      });
    });

    this.hubConnection
      .start()
      .then(() => {
        this.ngZone.run(() => {
          this.isRealtimeConnected = true;
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.isRealtimeConnected = false;
        });
      });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        this.isRealtimeConnected = false;
      });
    });

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => {
        this.isRealtimeConnected = true;
        this.loadSnapshot();
      });
    });
  }

  /**
   * Loads the live Master Feature Catalog snapshot from the backend API.
   */
  loadSnapshot(): void {
    this.isLoading = true;
    this.billingService.getFeaturesSnapshot().subscribe({
      next: res => {
        this.isLoading = false;
        if (res && res.success && res.data) {
          const totalLoaded =
            (res.data.included?.length || 0) +
            (res.data.subscribed?.length || 0) +
            (res.data.available?.length || 0);
          if (totalLoaded > 0) {
            this.snapshot = res.data;
          }
        }
      },
      error: err => {
        this.isLoading = false;
        console.warn('Using resilient Master Feature Catalog snapshot:', err);
      }
    });
  }

  /**
   * Resolves the 0-based canonical suite order index matching Master (/centralwks/features).
   */
  getSuiteOrder(category?: string): number {
    if (!category) return 999;
    const clean = category.trim().toLowerCase();
    const idx = BillingConsoleComponent.CanonicalSuites.findIndex(
      s => s.toLowerCase() === clean
    );
    return idx >= 0 ? idx : 500;
  }

  /**
   * Resolves the Suite Letter (A - J) for a given suite category.
   */
  getSuiteLetter(category?: string): string {
    const idx = this.getSuiteOrder(category);
    if (idx >= 0 && idx < 26) {
      return String.fromCharCode(65 + idx);
    }
    return '•';
  }

  /**
   * All capabilities combined and ordered in canonical Master sequence with running serial numbers.
   */
  get allOrderedFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    const combined: BillingFeatureItem[] = [
      ...(this.snapshot.included || []),
      ...(this.snapshot.subscribed || []),
      ...(this.snapshot.available || [])
    ];

    const sorted = combined.sort((a, b) => {
      const suiteDiff = this.getSuiteOrder(a.category) - this.getSuiteOrder(b.category);
      if (suiteDiff !== 0) return suiteDiff;
      const orderDiff = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
      if (orderDiff !== 0) return orderDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    return sorted.map((item, idx) => ({
      ...item,
      serialNo: idx + 1,
      suiteLetter: this.getSuiteLetter(item.category)
    }));
  }

  /**
   * Distinct suites present in the catalog arranged in canonical order.
   */
  get canonicalSuiteOptions(): Array<{ name: string; letter: string; count: number }> {
    const all = this.allOrderedFeatures;
    const map = new Map<string, number>();
    for (const f of all) {
      const cat = f.category || 'Operations';
      map.set(cat, (map.get(cat) || 0) + 1);
    }

    const keys = Array.from(map.keys()).sort(
      (a, b) => this.getSuiteOrder(a) - this.getSuiteOrder(b)
    );

    return keys.map(k => ({
      name: k,
      letter: this.getSuiteLetter(k),
      count: map.get(k) || 0
    }));
  }

  /**
   * Filtered capabilities based on search keyword, suite, availability, and tier class.
   */
  get filteredFeatures(): Array<BillingFeatureItem & { serialNo: number; suiteLetter: string }> {
    const term = this.searchQuery.trim().toLowerCase();

    return this.allOrderedFeatures.filter(f => {
      if (term) {
        const matchName = f.name?.toLowerCase().includes(term);
        const matchCode = f.featureCode?.toLowerCase().includes(term);
        const matchCat = f.category?.toLowerCase().includes(term);
        const matchDesc = f.description?.toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchCat && !matchDesc) {
          return false;
        }
      }

      if (this.selectedSuite && f.category?.toLowerCase() !== this.selectedSuite.toLowerCase()) {
        return false;
      }

      if (this.availabilityFilter === 'available' && !f.isAvailableForUse) {
        return false;
      }
      if (this.availabilityFilter === 'coming_soon' && f.isAvailableForUse) {
        return false;
      }

      if (this.tierFilter === 'compulsory' && !f.isCompulsory) {
        return false;
      }
      if (this.tierFilter === 'optional' && f.isCompulsory) {
        return false;
      }

      return true;
    });
  }

  /**
   * Filtered capabilities grouped by canonical suite for the Suite Cards view.
   */
  get groupedSuites(): SuiteFeatureGroup[] {
    const filtered = this.filteredFeatures;
    const groupsMap = new Map<string, Array<BillingFeatureItem & { serialNo: number }>>();

    for (const item of filtered) {
      const cat = item.category || 'Operations';
      if (!groupsMap.has(cat)) {
        groupsMap.set(cat, []);
      }
      groupsMap.get(cat)!.push(item);
    }

    const sortedSuites = Array.from(groupsMap.keys()).sort(
      (a, b) => this.getSuiteOrder(a) - this.getSuiteOrder(b)
    );

    return sortedSuites.map(suiteName => {
      const feats = groupsMap.get(suiteName) || [];
      return {
        suiteName,
        suiteLetter: this.getSuiteLetter(suiteName),
        suiteIndex: this.getSuiteOrder(suiteName) + 1,
        features: feats,
        availableCount: feats.filter(x => x.isAvailableForUse).length,
        comingSoonCount: feats.filter(x => !x.isAvailableForUse).length
      };
    });
  }

  // ── KPI Summary Counters & Currency Helpers ──
  get currencySymbol(): string {
    return this.snapshot?.currencySymbol || '$';
  }

  get currencyCode(): string {
    return this.snapshot?.currencyCode || 'USD';
  }

  /**
   * Formats a numeric amount in the tenant's running currency determined from Central.
   */
  formatAmount(amount?: number): string {
    const val = Number(amount || 0);
    return `${this.currencySymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  get totalSuitesCount(): number {
    return this.canonicalSuiteOptions.length;
  }

  get totalCapabilitiesCount(): number {
    return this.allOrderedFeatures.length;
  }

  get availableForUseCount(): number {
    return this.allOrderedFeatures.filter(f => f.isAvailableForUse).length;
  }

  get comingSoonCount(): number {
    return this.allOrderedFeatures.filter(f => !f.isAvailableForUse).length;
  }

  get compulsoryCount(): number {
    return this.allOrderedFeatures.filter(f => f.isCompulsory).length;
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim().length > 0 ||
      this.selectedSuite !== '' ||
      this.availabilityFilter !== 'all' ||
      this.tierFilter !== 'all'
    );
  }

  // ── UI Filter & Modal Actions ──
  filterByAvailability(filter: 'all' | 'available' | 'coming_soon'): void {
    this.availabilityFilter = this.availabilityFilter === filter ? 'all' : filter;
  }

  selectAvailabilityTab(tab: 'all' | 'available' | 'coming_soon'): void {
    this.availabilityFilter = tab;
  }

  filterByTier(tier: 'all' | 'compulsory' | 'optional'): void {
    this.tierFilter = this.tierFilter === tier ? 'all' : tier;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedSuite = '';
    this.availabilityFilter = 'all';
    this.tierFilter = 'all';
  }

  openFeatureDetail(feat: BillingFeatureItem & { serialNo?: number; suiteLetter?: string }): void {
    this.selectedFeatureDetail = feat;
    this.showFeatureDetailModal = true;
  }

  closeFeatureDetail(): void {
    this.showFeatureDetailModal = false;
    this.selectedFeatureDetail = null;
  }

  openInfoModal(): void {
    this.showInfoModal = true;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
  }

  /**
   * Builds the complete canonical 10-suite Master Feature Catalog fallback so the UI
   * always matches MasterCatalogDbContext 1-to-1 even before backend connection completes.
   */
  private buildDefaultSnapshot(): BillingFeaturesSnapshot {
    const raw: Array<Partial<BillingFeatureItem> & { name: string; featureCode: string; category: string }> = [
      // Suite A: People, Community & Collaboration
      { featureCode: 'bcp-community-messenger', name: 'Community Messenger & Team Chat', category: 'People, Community & Collaboration', icon: 'chat', isAvailableForUse: true, sortOrder: 1, description: 'Real-time 1-to-1 DMs, group channels, and platform-wide floating quick chat with end-to-end encryption.' },
      { featureCode: 'bcp-committees', name: 'Committees & Sub-Groups', category: 'People, Community & Collaboration', icon: 'groups', isAvailableForUse: true, sortOrder: 2, description: 'Manage committee leadership, meeting schedules, minutes, voting resolutions, and member rosters.' },
      { featureCode: 'bcp-alumni-directory', name: 'Alumni Network & Directory', category: 'People, Community & Collaboration', icon: 'badge', isAvailableForUse: true, sortOrder: 3, description: 'Searchable alumni directory, graduating class portals, career networking, and mentoring rosters.' },
      { featureCode: 'bcp-whistleblowing', name: 'Anonymous Whistleblowing & Feedback', category: 'People, Community & Collaboration', icon: 'security', isAvailableForUse: false, sortOrder: 4, description: 'Encrypted, anonymous whistleblowing submission channel and internal investigation management ledger.' },

      // Suite B: Workforce, Rota & Scheduling
      { featureCode: 'bcp-staff-rota', name: 'Staff & Volunteer Rota Scheduling', category: 'Workforce, Rota & Scheduling', icon: 'calendar_month', isAvailableForUse: false, sortOrder: 5, description: 'Multi-department weekly shift scheduling, recurring duty patterns, on-call assignment, and conflict detection.' },
      { featureCode: 'bcp-shift-swaps', name: 'Shift Swaps & Leave Management', category: 'Workforce, Rota & Scheduling', icon: 'swap_horiz', isAvailableForUse: false, sortOrder: 6, description: 'Peer-to-peer shift trade approvals, annual leave accrual tracking, sick leave requests, and supervisor sign-offs.' },
      { featureCode: 'bcp-attendance-tracking', name: 'Biometric & QR Attendance Tracking', category: 'Workforce, Rota & Scheduling', icon: 'fingerprint', isAvailableForUse: false, sortOrder: 7, description: 'Clock-in/out via mobile QR codes, biometric device sync, geolocation geofencing, and timesheet reports.' },
      { featureCode: 'bcp-appointment-booking', name: 'Appointment & Facility Booking', category: 'Workforce, Rota & Scheduling', icon: 'book_online', isAvailableForUse: false, sortOrder: 8, description: 'Online calendar booking for consultations, counseling, meeting rooms, shared equipment, and venues.' },
      { featureCode: 'bcp-calendar-followups', name: 'Calendar & Automated Follow-Up Routine', category: 'Workforce, Rota & Scheduling', icon: 'event_repeat', isAvailableForUse: false, sortOrder: 9, description: 'Two-way calendar synchronization, routine appointment reminders, and automated member follow-up cadences.' },

      // Suite C: Reports, Forms & Analytics
      { featureCode: 'bcp-interval-reporting', name: 'Interval & Periodic Reporting', category: 'Reports, Forms & Analytics', icon: 'assessment', isAvailableForUse: false, sortOrder: 10, description: 'Automated weekly, monthly, and annual operational reports with PDF exports and executive summaries.' },
      { featureCode: 'bcp-form-builder', name: 'Custom Dynamic Form Builder', category: 'Reports, Forms & Analytics', icon: 'dynamic_form', isAvailableForUse: true, sortOrder: 11, description: 'Drag-and-drop form designer with conditional logic, payment collection, file uploads, and webhook integrations.' },
      { featureCode: 'bcp-survey-analytics', name: 'Survey & Opinion Poll Analytics', category: 'Reports, Forms & Analytics', icon: 'poll', isAvailableForUse: false, sortOrder: 12, description: 'Create multi-question satisfaction surveys, NPS sentiment scoring, and real-time response distribution charts.' },
      { featureCode: 'bcp-reference-forms', name: 'Reference Form & Referee Verification', category: 'Reports, Forms & Analytics', icon: 'fact_check', isAvailableForUse: false, sortOrder: 13, description: 'Design custom confidential reference questionnaires, dispatch secure magic links, and generate vetting dossiers.' },

      // Suite D: Events & Training Management
      { featureCode: 'bcp-event-ticketing', name: 'Event Registration & Ticketing', category: 'Events & Training Management', icon: 'confirmation_number', isAvailableForUse: false, sortOrder: 14, description: 'Multi-tier event ticketing, seat reservation maps, promo codes, and QR code door check-in.' },
      { featureCode: 'bcp-speaker-sessions', name: 'Speaker & Session Lineup Management', category: 'Events & Training Management', icon: 'podium', isAvailableForUse: false, sortOrder: 15, description: 'Manage conference tracks, keynote speaker bios, slide deck downloads, and live session Q&A.' },
      { featureCode: 'bcp-attendee-management', name: 'Attendee Badges & Check-In Kiosk', category: 'Events & Training Management', icon: 'qr_code_scanner', isAvailableForUse: false, sortOrder: 16, description: 'Instant badge printing, self-service kiosk check-in, and attendance certificate generation.' },

      // Suite E: Finance & Commercial Revenue
      { featureCode: 'bcp-invoicing-dues', name: 'Membership Dues & Recurring Invoicing', category: 'Finance & Commercial Revenue', icon: 'receipt_long', isAvailableForUse: false, sortOrder: 17, description: 'Automated membership dues collection, pledge tracking, arrears reminders, and instant digital receipts.' },
      { featureCode: 'bcp-store-ecommerce', name: 'Store & E-Commerce Catalog', category: 'Finance & Commercial Revenue', icon: 'shopping_bag', isAvailableForUse: true, sortOrder: 18, description: 'Online storefront for merchandise, digital resources, publications, and orders with inventory tracking.' },
      { featureCode: 'bcp-proposal-pipeline', name: 'Commercial Proposals & Bidding Pipeline', category: 'Finance & Commercial Revenue', icon: 'request_quote', isAvailableForUse: false, sortOrder: 19, description: 'Create client proposals, interactive pricing tables, e-signature approvals, and deal stage tracking.' },
      { featureCode: 'bcp-grant-ledger', name: 'Grants, Donations & Fund Accounting', category: 'Finance & Commercial Revenue', icon: 'volunteer_activism', isAvailableForUse: false, sortOrder: 20, description: 'Restricted fund accounting, donor giving statements, grant milestone tracking, and disbursement ledgers.' },
      { featureCode: 'bcp-embedded-banking', name: 'Virtual Wallets & Payout Treasury', category: 'Finance & Commercial Revenue', icon: 'account_balance', isAvailableForUse: false, sortOrder: 21, description: 'Multi-currency sub-accounts, automated split settlements, vendor payouts, and bank reconciliation.' },

      // Suite F: Operations & Workflows
      { featureCode: 'bcp-recruitment-hiring', name: 'Applicant Tracking & Talent Recruitment', category: 'Operations & Workflows', icon: 'work', isAvailableForUse: false, sortOrder: 22, description: 'Job board publishing, resume parsing, interview scorecards, and offer letter automation.' },
      { featureCode: 'bcp-elections-evoting', name: 'Secure E-Voting & Elections Center', category: 'Operations & Workflows', icon: 'how_to_vote', isAvailableForUse: false, sortOrder: 23, description: 'Tamper-evident digital ballots, voter eligibility verification, secret tallying, and instant certified results.' },
      { featureCode: 'bcp-equipment-fleet', name: 'Equipment & Vehicle Logistics', category: 'Operations & Workflows', icon: 'local_shipping', isAvailableForUse: false, sortOrder: 24, description: 'Track organizational vehicles, maintenance schedules, fuel logs, and driver trip assignments.' },
      { featureCode: 'bcp-company-assets', name: 'IT & Fixed Asset Inventory Register', category: 'Operations & Workflows', icon: 'inventory_2', isAvailableForUse: false, sortOrder: 25, description: 'Barcode asset tagging, custodian custody sign-offs, depreciation schedules, and audit trails.' },
      { featureCode: 'bcp-project-tasks', name: 'Project Kanban & Milestone Tracker', category: 'Operations & Workflows', icon: 'view_kanban', isAvailableForUse: false, sortOrder: 26, description: 'Agile task boards, Gantt timelines, deliverable checklists, and cross-team workload balancing.' },

      // Suite G: Communication, AI & Support
      { featureCode: 'bcp-ai-smart-assist', name: 'AI Smart Assist & Workflows', category: 'Communication, AI & Support', icon: 'smart_toy', isAvailableForUse: true, sortOrder: 27, description: 'AI-powered document summarization, draft generation, member inquiry auto-replies, and intelligent search.' },
      { featureCode: 'bcp-mass-communication', name: 'Mass Multi-Channel SMS & Email', category: 'Communication, AI & Support', icon: 'campaign', isAvailableForUse: true, sortOrder: 28, description: 'Broadcast bulk SMS, targeted email newsletters, WhatsApp announcements, and delivery receipts.' },
      { featureCode: 'bcp-helpdesk-support', name: 'Helpdesk & Ticketing Support', category: 'Communication, AI & Support', icon: 'support_agent', isAvailableForUse: false, sortOrder: 29, description: 'Multi-agent ticket queue, SLA resolution timers, automated routing, canned answers, and CSAT surveys.' },
      { featureCode: 'bcp-live-chat', name: 'Live Chat & Widget Messenger', category: 'Communication, AI & Support', icon: 'forum', isAvailableForUse: false, sortOrder: 30, description: 'Embeddable website live chat widget, real-time agent notifications, file sharing, and visitor routing.' },
      { featureCode: 'bcp-social-media', name: 'Social Media Publisher & Queue', category: 'Communication, AI & Support', icon: 'share', isAvailableForUse: false, sortOrder: 31, description: 'Schedule and publish posts across social channels with engagement analytics tracking.' },
      { featureCode: 'bcp-bio-link', name: 'Bio Link Hub & Public Microsite', category: 'Communication, AI & Support', icon: 'link', isAvailableForUse: false, sortOrder: 32, description: 'Custom branded link-in-bio hub, event buttons, donation links, and embeddable social widgets.' },
      { featureCode: 'bcp-gocall-ai', name: 'Voice & Video Conferencing Rooms', category: 'Communication, AI & Support', icon: 'video_call', isAvailableForUse: false, sortOrder: 33, description: 'Browser-based HD video meetings, screen sharing, automated AI meeting minutes, and cloud recording.' },

      // Suite H: Compliance, Learning & Certification
      { featureCode: 'bcp-document-management', name: 'Document Vault & Revision Control', category: 'Compliance, Learning & Certification', icon: 'folder_managed', isAvailableForUse: false, sortOrder: 34, description: 'Encrypted digital document storage, role-based access permissions, version history, and audit watermarking.' },
      { featureCode: 'bcp-learning-management', name: 'Learning Management & Course LMS', category: 'Compliance, Learning & Certification', icon: 'school', isAvailableForUse: false, sortOrder: 35, description: 'Video lectures, quiz assessments, course progress tracking, instructor gradebooks, and completion diplomas.' },
      { featureCode: 'bcp-certificate-verification', name: 'Certificate Issuance & Verification', category: 'Compliance, Learning & Certification', icon: 'workspace_premium', isAvailableForUse: false, sortOrder: 36, description: 'Issue tamper-proof certificates with QR validation codes and public verification lookup portal.' },
      { featureCode: 'bcp-visitor-gate', name: 'Visitor & Gate Pass Management', category: 'Compliance, Learning & Certification', icon: 'badge', isAvailableForUse: false, sortOrder: 37, description: 'Pre-register guests, dispatch QR gate passes, notify hosts on arrival, and maintain security logs.' },
      { featureCode: 'bcp-kyc-verification', name: 'Identity KYC & Background Vetting', category: 'Compliance, Learning & Certification', icon: 'verified_user', isAvailableForUse: false, sortOrder: 38, description: 'Automated government ID verification, facial liveness checks, and compliance screening.' },

      // Suite I: Demographics & Civic Census
      { featureCode: 'bcp-community-census', name: 'Household & Community Census Registry', category: 'Demographics & Civic Census', icon: 'family_restroom', isAvailableForUse: false, sortOrder: 39, description: 'Structured household enumeration, socio-economic profiling, dependency mapping, and ward registries.' },
      { featureCode: 'bcp-field-surveyor', name: 'Offline Field Enumeration App', category: 'Demographics & Civic Census', icon: 'explore', isAvailableForUse: false, sortOrder: 40, description: 'Offline-first mobile data collection with GPS coordinates, photo capture, and background sync.' },
      { featureCode: 'bcp-resident-id-cards', name: 'Digital & Printable Member ID Cards', category: 'Demographics & Civic Census', icon: 'contact_mail', isAvailableForUse: false, sortOrder: 41, description: 'Custom PVC card designer, Apple/Google Wallet pass generation, and instant QR status verification.' },
      { featureCode: 'bcp-demographic-analytics', name: 'Demographic & Population Intelligence', category: 'Demographics & Civic Census', icon: 'query_stats', isAvailableForUse: false, sortOrder: 42, description: 'Age pyramids, geographic heatmaps, occupational distributions, and longitudinal growth trends.' },

      // Suite J: Life Events & Publications
      { featureCode: 'bcp-digital-memorials', name: 'Digital Memorials & Funeral Tributes', category: 'Life Events & Publications', icon: 'local_fire_department', isAvailableForUse: false, sortOrder: 43, description: 'Online memorial portals, virtual tributes, biography galleries, eulogy streams, and printable booklets.' },
      { featureCode: 'bcp-wedding-portals', name: 'Weddings & Celebration Portals', category: 'Life Events & Publications', icon: 'celebration', isAvailableForUse: false, sortOrder: 44, description: 'Digital celebration invitations, RSVP registry, order of service flipbook, and guest photo sharing.' },
      { featureCode: 'bcp-digital-brochures', name: 'Digital Brochures & Magazine Publishing', category: 'Life Events & Publications', icon: 'auto_stories', isAvailableForUse: false, sortOrder: 45, description: 'Interactive 3D page-flip brochures, anniversary magazines, souvenir programmes, and PDF downloads.' }
    ];

    const items: BillingFeatureItem[] = raw.map((r, i) => ({
      featureId: `feat-${i + 1}`,
      featureCode: r.featureCode,
      name: r.name,
      category: r.category,
      description: r.description,
      icon: r.icon || 'extension',
      isCompulsory: true,
      isSubscribed: true,
      isActive: true,
      isAvailableForUse: !!r.isAvailableForUse,
      sortOrder: r.sortOrder || i + 1,
      billingType: 'FlatSubscription',
      autoRenew: true,
      billingCadence: 'Included',
      status: 'Included',
      monthlyPrice: 0,
      quarterlyPrice: 0,
      yearlyPrice: 0.74,
      effectivePrice: 0,
      severity: 'None'
    }));

    return {
      tenantKey: 'workspace',
      serverTimeUtc: new Date().toISOString(),
      included: items,
      subscribed: [],
      available: [],
      notices: [],
      totalRecurringMonthly: 0
    };
  }
}
