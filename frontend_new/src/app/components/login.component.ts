import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { LoginRequest, LoginResponse, UserRole } from '../models/user.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>🎥 Live Webinar</h1>
          <p>Join or host amazing live sessions</p>
        </div>

        <div class="login-tabs">
          <button 
            class="tab-btn"
            [class.active]="loginType() === 'guest'"
            (click)="setLoginType('guest')">
            👥 Join as Viewer
          </button>
          <button 
            class="tab-btn"
            [class.active]="loginType() === 'host'"
            (click)="setLoginType('host')">
            🎤 Host/Admin
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          @if (errorMessage()) {
            <div class="error-message">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="success-message">{{ successMessage() }}</div>
          }

          <div class="form-group">
            <label for="mobile">Mobile Number</label>
            <input 
              type="tel" 
              id="mobile"
              [(ngModel)]="mobile"
              name="mobile"
              placeholder="Enter 10-digit mobile number"
              maxlength="10"
              pattern="[0-9]{10}"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="name">Full Name</label>
            <input 
              type="text" 
              id="name"
              [(ngModel)]="name"
              name="name"
              placeholder="Enter your full name"
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="email">Email (Optional)</label>
            <input 
              type="email" 
              id="email"
              [(ngModel)]="email"
              name="email"
              placeholder="Enter your email"
              class="form-input"
            />
          </div>

          @if (loginType() === 'host') {
            <div class="host-info">
              <p>🔐 Host/Admin access requires proper authorization</p>
            </div>
          }

          <button 
            type="submit" 
            class="login-btn"
            [disabled]="isLoading() || !mobile || !name">
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              Logging in...
            } @else {
              {{ loginType() === 'guest' ? '🎯 Join Webinar' : '🚀 Access Dashboard' }}
            }
          </button>
        </form>

        <div class="login-footer">
          <p>By continuing, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 450px;
      animation: slideUp 0.6s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .login-header h1 {
      margin: 0;
      font-size: 2rem;
      color: #333;
      font-weight: 700;
    }

    .login-header p {
      margin: 8px 0 0 0;
      color: #666;
      font-size: 1rem;
    }

    .login-tabs {
      display: flex;
      margin-bottom: 25px;
      border-radius: 12px;
      background: #f8f9fa;
      padding: 4px;
    }

    .tab-btn {
      flex: 1;
      padding: 12px 16px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .tab-btn.active {
      background: #667eea;
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .tab-btn:hover:not(.active) {
      background: #e9ecef;
    }

    .login-form {
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #333;
    }

    .form-input {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e9ecef;
      border-radius: 10px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .host-info {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 20px;
    }

    .host-info p {
      margin: 0;
      color: #856404;
      font-size: 0.9rem;
    }

    .login-btn {
      width: 100%;
      padding: 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .login-btn:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }

    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid transparent;
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #fecaca;
    }

    .success-message {
      background: #dcfce7;
      color: #16a34a;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #bbf7d0;
    }

    .login-footer {
      text-align: center;
    }

    .login-footer p {
      margin: 0;
      color: #666;
      font-size: 0.85rem;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 30px 20px;
        margin: 10px;
      }
      
      .login-header h1 {
        font-size: 1.6rem;
      }
    }
  `]
})
export class LoginComponent {
  loginType = signal<'guest' | 'host'>('guest');
  mobile = '';
  name = '';
  email = '';
  
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  setLoginType(type: 'guest' | 'host') {
    this.loginType.set(type);
    this.clearMessages();
  }

  clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  async onSubmit() {
    this.clearMessages();

    // Validate form
    if (!this.mobile || !this.name) {
      this.errorMessage.set('Please fill in all required fields');
      return;
    }

    if (!/^\d{10}$/.test(this.mobile)) {
      this.errorMessage.set('Please enter a valid 10-digit mobile number');
      return;
    }

    this.isLoading.set(true);

    try {
      const loginRequest: LoginRequest = {
        mobile: this.mobile,
        name: this.name,
        email: this.email || ''
      };

      const response = await this.userService.login(loginRequest);

      if (response.success) {
        this.successMessage.set('Login successful! Redirecting...');
        
        // Store user data
        localStorage.setItem('liveWebinar-user', JSON.stringify(response.user));
        localStorage.setItem('liveWebinar-token', response.token || '');
        
        // Redirect based on user role
        setTimeout(() => {
          if (response.user?.role === UserRole.Admin || response.user?.role === UserRole.Host) {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/viewer-dashboard']);
          }
        }, 1500);
      } else {
        this.errorMessage.set(response.message);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage.set(error.message || 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}