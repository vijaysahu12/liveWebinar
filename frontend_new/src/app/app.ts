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
  ) {}

  ngOnInit() {
    // Only check authentication status on the browser side
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthenticationStatus();
    } else {
      // On server side, show login by default
      this.isLoading.set(false);
    }
  }

  private checkAuthenticationStatus() {
    try {
      const userData = localStorage.getItem('webinar_user');
      const userToken = localStorage.getItem('webinar_token');
      
      if (userData && userToken) {
        const user = JSON.parse(userData);
        const tokenExpiry = localStorage.getItem('webinar_token_expiry');
        
        // Check if token is still valid (not expired)
        if (tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
          console.log('User already logged in:', user.name, user.mobile);
          this.showLogin.set(false);
        } else {
          console.log('Token expired, requiring re-login');
          this.clearUserData();
        }
      } else {
        console.log('No user data found, showing login');
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      this.clearUserData();
    } finally {
      this.isLoading.set(false);
    }
  }

  private clearUserData() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('webinar_user');
      localStorage.removeItem('webinar_token');
      localStorage.removeItem('webinar_token_expiry');
    }
    this.showLogin.set(true);
  }

  onLoginSuccess() {
    console.log('Login successful, hiding login modal');
    this.showLogin.set(false);
  }
}
