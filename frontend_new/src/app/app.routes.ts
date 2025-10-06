import { Routes } from '@angular/router';
import { ViewerComponent } from './viewer/viewer.component';
import { LoginComponent } from './components/login.component';
import { DashboardComponent } from './components/dashboard-simple.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'viewer', component: ViewerComponent },
  { path: 'viewer-dashboard', component: DashboardComponent },
  { path: 'admin-dashboard', component: DashboardComponent },
  { path: 'dashboard', component: DashboardComponent }, // Unified dashboard route
  // Redirect old routes to new unified system
  { path: '**', redirectTo: '/login' }
];
