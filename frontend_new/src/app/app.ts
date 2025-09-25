import { Component, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserLoginComponent } from './components/user-login.component';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, UserLoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('liveWebinar');
  protected readonly showLogin = signal(true);
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
      (window as any).forceShowApp = () => {
        this.showLogin.set(false);
        this.isLoading.set(false);
      };
    }
  }

  ngOnInit() {
    // Only check authentication status on the browser side
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthenticationStatus();
      
      // Set up periodic session validation (every 5 minutes)
      setInterval(() => {
        this.validateSession();
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      // On server side, show login by default
      this.isLoading.set(false);
    }
  }

  private checkAuthenticationStatus() {
    try {
      const userData = localStorage.getItem('liveWebinar-user');
      
      console.log('🔍 Raw localStorage data:', userData);
      
      if (userData) {
        const user = JSON.parse(userData);
        
        console.log('🔍 Parsed user data:', user);
        console.log('🔍 User has token:', !!user.token);
        console.log('🔍 User expiresAt:', user.expiresAt);
        console.log('🔍 Current time:', new Date().getTime());
        console.log('🔍 Is expired?', new Date().getTime() >= user.expiresAt);
        
        // Check if user data has required fields and if token hasn't expired
        if (user.token && user.expiresAt && new Date().getTime() < user.expiresAt) {
          const timeLeft = user.expiresAt - new Date().getTime();
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          
          console.log('✅ Valid session found for user:', user.name, user.mobile);
          console.log('🕐 Session expires in:', minutesLeft, 'minutes');
          console.log('📊 User ID:', user.userId);
          this.showLogin.set(false);
        } else {
          console.log('❌ Session expired or invalid, requiring re-login');
          console.log('Current time:', new Date().toLocaleString());
          if (user.expiresAt) {
            console.log('Expiry time:', new Date(user.expiresAt).toLocaleString());
          }
          this.clearUserData();
        }
      } else {
        console.log('ℹ️ No user session found, showing login');
        this.showLogin.set(true);
      }
    } catch (error) {
      console.error('❌ Error checking authentication status:', error);
      this.clearUserData();
    } finally {
      this.isLoading.set(false);
    }
  }

  private clearUserData() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('liveWebinar-user');
    }
    this.showLogin.set(true);
  }

  onLoginSuccess() {
    console.log('✅ Login successful, hiding login modal');
    this.showLogin.set(false);
  }

  private validateSession() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const userData = localStorage.getItem('liveWebinar-user');
      
      if (userData) {
        const user = JSON.parse(userData);
        
        // Check if session has expired
        if (!user.expiresAt || new Date().getTime() >= user.expiresAt) {
          console.log('⏰ Session expired during use, redirecting to login');
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
