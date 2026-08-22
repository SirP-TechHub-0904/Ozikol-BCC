import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService, BrandSettings } from '../../../core/services/settings.service';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-container d-flex align-items-center gap-2">
      <img *ngIf="brand.logoUrl" [src]="brand.logoUrl" [alt]="brand.siteTitle || brand.companyName || 'Portal Logo'" class="logo-img" height="36" />
      <span *ngIf="!brand.logoUrl" class="logo-icon-badge d-flex align-items-center justify-content-center rounded text-white font-weight-bold">
        🏢
      </span>
      <span *ngIf="showTitle && (brand.siteTitle || brand.companyName)" class="logo-title font-weight-bold text-truncate">
        {{ brand.siteTitle || brand.companyName }}
      </span>
    </div>
  `,
  styles: [`
    .logo-container { cursor: pointer; }
    .logo-img { max-height: 36px; width: auto; object-fit: contain; }
    .logo-icon-badge { width: 36px; height: 36px; font-size: 1.1rem; background-color: #6f42c1 !important; }
    .logo-title { font-size: 1.1rem; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
  `]
})
export class LogoComponent implements OnInit {
  @Input() showTitle = true;
  brand: BrandSettings = { siteTitle: '', primaryColor: '#6f42c1' };

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.settingsService.brand$.subscribe(brand => {
      this.brand = brand;
    });
  }
}
