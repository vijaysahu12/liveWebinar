import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('liveWebinar');
  protected readonly isLoading = signal(true);

  constructor(
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Add global debug methods for session troubleshooting
    if (isPlatformBrowser(this.platformId)) {
      (window as any).debugSession = () => this.debugSessionStatus();
      (window as any).clearSession = () => this.clearUserData();
      (window as any).checkAuth = () => this.checkAuthenticationStatus();
    }
  }

  ngOnInit() {
    // Only run on browser side
    if (isPlatformBrowser(this.platformId)) {
      // Initialize and stop loading
      this.isLoading.set(false);
      
      // Set up periodic session validation (every 5 minutes)
      setInterval(() => {
        this.validateSession();
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      // On server side, stop loading
      this.isLoading.set(false);
    }
  }

  private checkAuthenticationStatus() {
    // Session validation is now handled by route guards
    // This method kept for debugging purposes only
    console.log('🔍 Session check - now handled by route-based authentication');
  }

  private clearUserData() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('liveWebinar-user');
      localStorage.removeItem('liveWebinar-token');
      console.log('🗑️ Session data cleared');
    }
  }

  onLoginSuccess() {
    console.log('✅ Login successful - handled by route navigation');
  }

  private validateSession() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const userData = localStorage.getItem('liveWebinar-user');
      const token = localStorage.getItem('liveWebinar-token');
      
      if (userData) {
        const user = JSON.parse(userData);
        
        // Check if session has expired (only if expiration is set)
        if (user.expiresAt && new Date().getTime() >= user.expiresAt) {
          console.log('⏰ Session expired during use, clearing data');
          this.clearUserData();
        } else if (!token && !user.token) {
          console.log('⚠️ No authentication token found, clearing data');
          this.clearUserData();
        }
      }
    } catch (error) {
      console.error('❌ Error validating session:', error);
      this.clearUserData();
    }
  }

  private debugSessionStatus() {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('Debug: Not in browser context');
      return;
    }

    const userData = localStorage.getItem('liveWebinar-user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const currentTime = new Date().getTime();
        const timeLeft = user.expiresAt - currentTime;
        
        console.log('=== SESSION DEBUG INFO ===');
        console.log('User:', user.name, '(' + user.mobile + ')');
        console.log('User ID:', user.userId);
        console.log('Login Time:', new Date(user.loginTime).toLocaleString());
        console.log('Expires At:', new Date(user.expiresAt).toLocaleString());
        console.log('Current Time:', new Date(currentTime).toLocaleString());
        console.log('Time Left (minutes):', Math.floor(timeLeft / (1000 * 60)));
        console.log('Is Valid:', timeLeft > 0);
        console.log('Has Token:', !!user.token);
        console.log('==========================');
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    } else {
      console.log('No session data found');
    }
  }
}
