import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { ViewerLoginRequest } from '../models/user.models';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-overlay">
      <div class="login-modal">
        <div class="login-header">
          <h2>Join Live Webinar</h2>
          <p>Enter your details to join the webinar</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="login-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="loginData.name"
              required
              minlength="2"
              placeholder="Enter your full name"
              [disabled]="isLoading()"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="mobile">Mobile Number</label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              [(ngModel)]="loginData.mobile"
              required
              pattern="[0-9]{10}"
              placeholder="Enter 10-digit mobile number"
              [disabled]="isLoading()"
              class="form-input"
            />
            <small class="helper-text">10-digit mobile number without country code</small>
          </div>

          @if (errorMessage()) {
            <div class="error-message">
              {{ errorMessage() }}
            </div>
          }

          @if (warningMessage()) {
            <div class="warning-message">
              {{ warningMessage() }}
              <button type="button" (click)="proceedWithLogout()" class="btn-secondary">
                Yes, Login Here
              </button>
            </div>
          }

          <button 
            type="submit" 
            [disabled]="!loginForm.form.valid || isLoading()"
            class="btn-primary"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              Connecting...
            } @else {
              Join Webinar
            }
          </button>
        </form>

        <div class="login-footer">
          <p class="small-text">By joining, you agree to participate respectfully in this live webinar.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .login-modal {
      background: #2D3748;
      border-radius: 12px;
      padding: 2rem;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-header h2 {
      color: #E2E8F0;
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .login-header p {
      color: #A0AEC0;
      margin: 0;
      font-size: 0.9rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      color: #E2E8F0;
      font-weight: 500;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #4A5568;
      border-radius: 6px;
      background: #1A202C;
      color: #E2E8F0;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #5A67D8;
      box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.1);
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .helper-text {
      color: #A0AEC0;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }

    .error-message {
      background: rgba(254, 178, 178, 0.1);
      border: 1px solid #F56565;
      color: #FED7D7;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .warning-message {
      background: rgba(251, 211, 141, 0.1);
      border: 1px solid #ED8936;
      color: #FBBF24;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .btn-primary {
      width: 100%;
      background: #5A67D8;
      color: white;
      border: none;
      padding: 0.875rem;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-primary:hover:not(:disabled) {
      background: #4C51BF;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid #ED8936;
      color: #FBBF24;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      margin-left: 0.5rem;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .login-footer {
      margin-top: 1.5rem;
      text-align: center;
    }

    .small-text {
      color: #A0AEC0;
      font-size: 0.8rem;
      margin: 0;
    }
  `]
})
export class UserLoginComponent {
  @Output() loginSuccess = new EventEmitter<void>();

  loginData: ViewerLoginRequest = {
    name: '',
    mobile: '',
    email: ''
  };

  isLoading = signal(false);
  errorMessage = signal('');
  warningMessage = signal('');
  pendingLogout = false;

  constructor(private userService: UserService) {}

  async onSubmit() {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.warningMessage.set('');

    try {
      const result = await this.userService.loginUser(this.loginData);

      if (result.success) {
        if (result.shouldLogoutOther) {
          this.warningMessage.set(`This mobile number is already logged in from another device. Do you want to logout from there and login here?`);
          this.pendingLogout = true;
        } else {
          console.log('✅ Login successful');
          this.loginSuccess.emit();
        }
      } else {
        this.errorMessage.set(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      this.errorMessage.set('Network error. Please check your connection.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async proceedWithLogout() {
    this.isLoading.set(true);
    this.warningMessage.set('');

    try {
      // Force login by including forceLogout flag
      const result = await this.userService.loginUser({
        ...this.loginData,
        forceLogout: true
      } as any);

      if (result.success) {
        console.log('✅ Force login successful');
        this.loginSuccess.emit();
      } else {
        this.errorMessage.set(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      this.errorMessage.set('Network error. Please check your connection.');
    } finally {
      this.isLoading.set(false);
    }
  }
}