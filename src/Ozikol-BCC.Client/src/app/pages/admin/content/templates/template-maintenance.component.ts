import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiService } from '../../../../core/services/api.service';

export interface VaultStats {
  totalTemplates: number;
  defaultTemplatesCount: number;
  customTemplatesCount: number;
  menuCount: number;
  heroCount: number;
  bodyCount: number;
  footerCount: number;
  blogCount: number;
  breadcrumbCount: number;
  ecommerceCount: number;
  activeThemeSuiteName: string;
  headTagsCount: number;
  bodyOpenTagsCount: number;
  footerTagsCount: number;
}

@Component({
  selector: 'app-template-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './template-maintenance.component.html',
  styleUrls: ['./template-maintenance.component.scss']
})
export class TemplateMaintenanceComponent implements OnInit {
  loading: boolean = false;
  clearing: boolean = false;
  reinstalling: boolean = false;

  // Confirmation Safety Word
  confirmationInput: string = '';
  readonly REQUIRED_CONFIRM_WORD: string = 'PURGE ALL';

  // Live Vault Stats
  stats: VaultStats = {
    totalTemplates: 0,
    defaultTemplatesCount: 0,
    customTemplatesCount: 0,
    menuCount: 0,
    heroCount: 0,
    bodyCount: 0,
    footerCount: 0,
    blogCount: 0,
    breadcrumbCount: 0,
    ecommerceCount: 0,
    activeThemeSuiteName: 'None Detected',
    headTagsCount: 0,
    bodyOpenTagsCount: 0,
    footerTagsCount: 0
  };

  // State after successful purge
  purgeCompleted: boolean = false;
  wipeContentOnPurgeAll: boolean = true;

  // Specific Suite Deletion State
  installedSuites: { code: string; name: string; templateCount: number; isDefault: boolean }[] = [];
  selectedSuiteCode: string = '';
  loadingSuiteLinkedContent: boolean = false;
  suiteLinkedContent: {
    suiteCode: string;
    suiteName: string;
    templateCount: number;
    templates: any[];
    codeInjectionCount: number;
    codeInjections: any[];
    linkedSectionCount: number;
    linkedSections: any[];
  } | null = null;
  deleteSuiteLinkedContentCheckbox: boolean = false;
  deletingSuite: boolean = false;

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadVaultStats();
  }

  /**
   * Loads live counts of templates and code injection tags from the tenant database.
   */
  loadVaultStats(): void {
    this.loading = true;
    this.api.get<any>('ContentApi/templates/installed').subscribe({
      next: (res: any) => {
        const list: any[] = res?.data || (Array.isArray(res) ? res : []);
        this.stats.totalTemplates = list.length;
        this.stats.defaultTemplatesCount = list.filter(t => t.isDefault === true).length;
        this.stats.customTemplatesCount = list.filter(t => !t.isDefault).length;
        this.stats.menuCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'menu').length;
        this.stats.heroCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'hero').length;
        this.stats.bodyCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'body').length;
        this.stats.footerCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'footer').length;
        this.stats.blogCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'blog').length;
        this.stats.breadcrumbCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'breadcrumb').length;
        this.stats.ecommerceCount = list.filter(t => (t.categoryKey || '').toLowerCase() === 'ecommerce').length;

        // Discover and build installedSuites dynamically
        const suiteMap = new Map<string, { code: string; name: string; templateCount: number; isDefault: boolean }>();
        list.forEach(t => {
          const vCode = (t.variantCode || '').toUpperCase();
          const tKey = (t.templateKey || '').toUpperCase();
          const rawName = (t.name || '').trim();

          let code = 'suite_corporate';
          let name = 'Corporate Suite';
          let isDefault = t.isDefault ?? false;

          if (vCode.includes('APEX') || rawName.toUpperCase().includes('APEX')) {
            code = 'suite_apexmodern';
            name = 'Apex Modern Theme';
          } else {
            const match = vCode.match(/SUITE_([A-Z0-9]+)/) || tKey.match(/SUITE_([A-Z0-9]+)/);
            if (match) {
              const tag = match[1].toLowerCase();
              code = `suite_${tag}`;
              name = tag.charAt(0).toUpperCase() + tag.slice(1) + ' Theme';
            } else if (!t.isDefault) {
              const nameMatch = rawName.match(/^(.+?\b(?:Theme|Suite|Pro|Portal)\b)/i);
              if (nameMatch) {
                name = nameMatch[1].trim();
                code = 'suite_' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
              }
            }
          }

          if (!suiteMap.has(code)) {
            suiteMap.set(code, { code, name, templateCount: 0, isDefault });
          }
          suiteMap.get(code)!.templateCount++;
        });

        this.installedSuites = Array.from(suiteMap.values());

        // Default select first suite if none selected
        if (!this.selectedSuiteCode && this.installedSuites.length > 0) {
          this.onSuiteSelected(this.installedSuites[0].code);
        } else if (this.selectedSuiteCode) {
          this.onSuiteSelected(this.selectedSuiteCode);
        }

        const activeT = list.find(t => t.isActive && ((t.categoryKey || '').toLowerCase() === 'menu' || (t.categoryKey || '').toLowerCase() === 'hero' || (t.categoryKey || '').toLowerCase() === 'footer')) ||
                        list.find(t => t.isActive);
        if (activeT) {
          const vCode = (activeT.variantCode || '').toUpperCase();
          const rawName = (activeT.name || '').trim();
          if (vCode.includes('APEX') || rawName.toUpperCase().includes('APEX')) {
            this.stats.activeThemeSuiteName = 'Apex Modern Theme';
          } else {
            const nameMatch = rawName.match(/^(.+?\b(?:Theme|Suite|Pro|Portal)\b)/i);
            if (nameMatch) {
              this.stats.activeThemeSuiteName = nameMatch[1].trim();
            } else {
              const match = vCode.match(/SUITE_([A-Z0-9]+)/);
              if (match) {
                const tag = match[1].toLowerCase();
                this.stats.activeThemeSuiteName = tag.charAt(0).toUpperCase() + tag.slice(1) + ' Theme';
              } else {
                this.stats.activeThemeSuiteName = 'Corporate Suite';
              }
            }
          }
        } else if (list.length > 0) {
          this.stats.activeThemeSuiteName = 'Custom Installed Blueprints';
        } else {
          this.stats.activeThemeSuiteName = 'None (Empty Vault)';
        }

        // Fetch injection tags from ContentApi/code-injections
        this.api.get<any>('ContentApi/code-injections').subscribe({
          next: (tagRes: any) => {
            this.loading = false;
            const tagList: any[] = tagRes?.data || (Array.isArray(tagRes) ? tagRes : []);
            this.stats.headTagsCount = tagList.filter(t => t.zone === 'head').length;
            this.stats.bodyOpenTagsCount = tagList.filter(t => t.zone === 'body_open').length;
            this.stats.footerTagsCount = tagList.filter(t => t.zone === 'footer').length;
          },
          error: () => {
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load current vault status from server.');
      }
    });
  }

  /**
   * Fetches linked content and code injections inventory for the selected theme suite.
   */
  onSuiteSelected(code: string): void {
    this.selectedSuiteCode = code;
    this.deleteSuiteLinkedContentCheckbox = false;
    if (!code) {
      this.suiteLinkedContent = null;
      return;
    }

    this.loadingSuiteLinkedContent = true;
    this.api.get<any>(`ContentApi/templates/suites/${code}/linked-content`).subscribe({
      next: (res: any) => {
        this.loadingSuiteLinkedContent = false;
        if (res?.data) {
          this.suiteLinkedContent = res.data;
        }
      },
      error: () => {
        this.loadingSuiteLinkedContent = false;
      }
    });
  }

  /**
   * Deletes the currently selected Theme Suite from the database.
   */
  executeDeleteSelectedSuite(): void {
    if (!this.selectedSuiteCode) {
      this.toast.error('Please select a theme suite to delete.');
      return;
    }

    const suiteName = this.suiteLinkedContent?.suiteName || this.selectedSuiteCode;
    const confirmMsg = `Are you sure you want to permanently delete the theme suite '${suiteName}'?` +
      (this.deleteSuiteLinkedContentCheckbox ? ' All associated website page sections will also be deleted.' : ' Associated page content will be unlinked and preserved.');

    if (!confirm(confirmMsg)) {
      return;
    }

    this.deletingSuite = true;
    this.api.delete<any>(`ContentApi/templates/suites/${this.selectedSuiteCode}?deleteLinkedContent=${this.deleteSuiteLinkedContentCheckbox}`).subscribe({
      next: (res) => {
        this.deletingSuite = false;
        this.toast.success(res?.message || `Theme suite '${suiteName}' deleted successfully.`);
        this.selectedSuiteCode = '';
        this.suiteLinkedContent = null;
        this.loadVaultStats();
      },
      error: (err) => {
        this.deletingSuite = false;
        const errorMsg = err?.error?.message || err?.message || 'Server error';
        this.toast.error('Failed to delete theme suite: ' + errorMsg);
      }
    });
  }

  /**
   * Evaluates if safety confirmation input matches the mandatory keyword.
   */
  get isConfirmed(): boolean {
    return this.confirmationInput.trim().toUpperCase() === this.REQUIRED_CONFIRM_WORD;
  }

  /**
   * Executes the irreversible purge operation against the tenant database.
   */
  executePurgeAll(): void {
    if (!this.isConfirmed) {
      this.toast.warning(`Please type '${this.REQUIRED_CONFIRM_WORD}' exactly to unlock purge.`);
      return;
    }

    this.clearing = true;
    const startTime = Date.now();
    this.api.delete<any>(`ContentApi/templates/clear-all?wipeContent=${this.wipeContentOnPurgeAll}`).subscribe({
      next: (res) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 2200 - elapsed);
        setTimeout(() => {
          this.clearing = false;
          this.purgeCompleted = true;
          this.confirmationInput = '';
          this.toast.success(res?.message || 'Vault wiped completely. All templates and code injections purged.');
          this.loadVaultStats();
        }, delay);
      },
      error: (err) => {
        this.clearing = false;
        const errorMsg = err?.error?.message || err?.message || 'Server error';
        this.toast.error('Failed to purge vault: ' + errorMsg);
      }
    });
  }

  /**
   * Restores factory Corporate Suite templates and standard 3-zone code injections.
   * Keeps loading state active for 2.5 seconds to provide clear visual confirmation.
   */
  executeReinstallDefaults(): void {
    this.reinstalling = true;
    const startTime = Date.now();
    this.api.post<any>('ContentApi/templates/reinstall-defaults', {}).subscribe({
      next: (res) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 2500 - elapsed);
        setTimeout(() => {
          this.reinstalling = false;
          this.purgeCompleted = false;
          this.toast.success(res?.message || 'Factory default Corporate Theme Suite restored.');
          this.loadVaultStats();
        }, delay);
      },
      error: (err) => {
        this.reinstalling = false;
        this.toast.error('Failed to reinstall defaults: ' + (err?.message || 'Server error'));
      }
    });
  }
}
