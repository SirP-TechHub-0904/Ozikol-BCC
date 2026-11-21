import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './core/components/toast-container.component';
import { ConfirmDialogComponent } from './core/components/confirm-dialog.component';
import { TenantStateService } from './core/services/tenant-state.service';
import { SettingsService } from './core/services/settings.service';
import { OneSignalService } from './core/services/onesignal.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Workspace Portal';
  isTenantNotFound$: Observable<boolean>;
  isCheckingTenant$: Observable<boolean>;

  constructor(
    private tenantState: TenantStateService,
    private settingsService: SettingsService,
    private oneSignal: OneSignalService
  ) {
    this.isTenantNotFound$ = this.tenantState.isTenantNotFound$;
    this.isCheckingTenant$ = this.tenantState.isCheckingTenant$;
    this.settingsService.loadSettings();
    this.oneSignal.init();
  }
}
