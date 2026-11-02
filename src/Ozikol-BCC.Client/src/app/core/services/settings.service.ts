import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface BrandSettings {
  siteTitle: string;
  companyName?: string;
  logoUrl?: string;
  whiteLogoUrl?: string;
  primaryColor: string;
}

export interface TerminologyAliases {
  groupAlias: string;
  categoryAlias: string;
  subCategoryAlias: string;
  alumniAlias: string;
}

export interface FeatureExpirationNotice {
  featureCode: string;
  featureName: string;
  expiresAt: string;
  daysRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface FeatureFlags {
  enableChat: boolean;
  enableEVoting: boolean;
  enableGrants: boolean;
  enableAts: boolean;
  activeFeatures?: string[];
}

export interface ClientAppConfig {
  platformName: string;
  oneSignalAppId?: string;
  sentryDsn?: string;
  cloudflareTurnstileSiteKey?: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string;
  minimumAppVersion: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private brandSubject = new BehaviorSubject<BrandSettings>({
    siteTitle: '',
    companyName: '',
    primaryColor: '#0050e5'
  });
  public brand$ = this.brandSubject.asObservable();

  private aliasesSubject = new BehaviorSubject<TerminologyAliases>({
    groupAlias: 'Group',
    categoryAlias: 'Category',
    subCategoryAlias: 'Sub-Category',
    alumniAlias: 'Member'
  });
  public aliases$ = this.aliasesSubject.asObservable();

  private featuresSubject = new BehaviorSubject<FeatureFlags>({
    enableChat: true,
    enableEVoting: true,
    enableGrants: true,
    enableAts: true,
    activeFeatures: []
  });
  public features$ = this.featuresSubject.asObservable();

  private expirationsSubject = new BehaviorSubject<FeatureExpirationNotice[]>([]);
  public expirations$ = this.expirationsSubject.asObservable();

  private clientConfigSubject = new BehaviorSubject<ClientAppConfig>({
    platformName: 'Ozikol BCC',
    isMaintenanceMode: false,
    minimumAppVersion: '1.0.0'
  });
  public clientConfig$ = this.clientConfigSubject.asObservable();

  constructor(private api: ApiService) {}

  public loadSettings(): void {
    // 0. Load Central Master Dynamic Client Config
    this.api.get<any>('SetupApi/client-config').subscribe({
      next: (res) => {
        if (res && res.isSuccess && res.data) {
          this.clientConfigSubject.next(res.data);
        }
      },
      error: (err) => console.warn('Using default fallback client config.', err)
    });

    // 1. Load Database Brand Settings
    this.api.get<any>('SettingsApi/brand').subscribe({
      next: (res) => {
        if (res && res.isSuccess && res.data) {
          this.brandSubject.next({
            siteTitle: res.data.siteTitle || res.data.organizationDisplayName || res.data.companyName || '',
            companyName: res.data.companyName || res.data.organizationDisplayName || '',
            logoUrl: res.data.companyLogoUrl || res.data.logoUrl,
            whiteLogoUrl: res.data.companyWhiteLogoUrl || res.data.whiteLogoUrl,
            primaryColor: res.data.primaryColor || '#0050e5'
          });
        }
      },
      error: (err) => console.warn('Using default neutral brand settings.', err)
    });

    // 2. Load Database Terminology Aliases
    this.api.get<any>('SettingsApi/aliases').subscribe({
      next: (res) => {
        if (res && res.isSuccess && res.data) {
          this.aliasesSubject.next({
            groupAlias: res.data.groupAlias || 'Group',
            categoryAlias: res.data.categoryAlias || 'Category',
            subCategoryAlias: res.data.subCategoryAlias || 'Sub-Category',
            alumniAlias: res.data.alumniAlias || 'Member'
          });
        }
      },
      error: (err) => console.warn('Using default terminology aliases.', err)
    });

    // 3. Load Database Feature Flags & Central Entitlements
    this.api.get<any>('SettingsApi/features').subscribe({
      next: (res) => {
        if (res && res.isSuccess && res.data) {
          this.featuresSubject.next({
            enableChat: res.data.enableChat ?? true,
            enableEVoting: res.data.enableEVoting ?? true,
            enableGrants: res.data.enableGrants ?? true,
            enableAts: res.data.enableAts ?? true,
            activeFeatures: res.data.activeFeatures || []
          });
        }
      },
      error: (err) => console.warn('Using default feature flags.', err)
    });
  }

  /**
   * Loads upcoming capability expiration notices.
   * Strictly intended for BCC Administrators.
   */
  public loadFeatureExpirations(): void {
    this.api.get<any>('SettingsApi/feature-expirations').subscribe({
      next: (res) => {
        if (res && res.isSuccess && Array.isArray(res.data)) {
          this.expirationsSubject.next(res.data);
        }
      },
      error: () => this.expirationsSubject.next([])
    });
  }

  /**
   * Checks whether a specific modular capability is currently active for the tenant.
   */
  public isFeatureActive(featureCode: string): boolean {
    const flags = this.featuresSubject.value;
    if (!flags.activeFeatures || flags.activeFeatures.length === 0) {
      return true; // Unrestricted default
    }
    return flags.activeFeatures.includes(featureCode);
  }

  public get currentAliases(): TerminologyAliases {
    return this.aliasesSubject.value;
  }

  public get currentBrand(): BrandSettings {
    return this.brandSubject.value;
  }

  public get currentFeatures(): FeatureFlags {
    return this.featuresSubject.value;
  }

  public get currentExpirations(): FeatureExpirationNotice[] {
    return this.expirationsSubject.value;
  }
}
