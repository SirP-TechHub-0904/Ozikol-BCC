import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './core/components/toast-container.component';
import { TenantStateService } from './core/services/tenant-state.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Ozikol-BCC.Client';
  isTenantNotFound$: Observable<boolean>;
  isCheckingTenant$: Observable<boolean>;

  constructor(private tenantState: TenantStateService) {
    this.isTenantNotFound$ = this.tenantState.isTenantNotFound$;
    this.isCheckingTenant$ = this.tenantState.isCheckingTenant$;
  }
}
