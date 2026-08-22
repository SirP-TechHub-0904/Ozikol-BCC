import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TopbarComponent } from './topbar/topbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TopbarComponent, SidebarComponent],
  template: `
    <div class="main-app-shell d-flex flex-column min-vh-100 bg-dark text-white">
      <app-topbar (toggleSidebar)="sidebarOpen = !sidebarOpen"></app-topbar>
      <div class="app-body d-flex flex-grow-1">
        <app-sidebar [class.d-none]="!sidebarOpen" class="d-md-block"></app-sidebar>
        <main class="main-content flex-grow-1 p-4">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .main-app-shell { background-color: #0b0f19 !important; font-family: 'Inter', system-ui, sans-serif; }
    .main-content { overflow-y: auto; max-height: calc(100vh - 60px); background-color: #0b0f19; }
  `]
})
export class MainLayoutComponent {
  sidebarOpen = true;
}
