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
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    mobile = '';
    name = '';
    email = '';

    isLoading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    constructor(
        private userService: UserService,
        private router: Router
    ) { }

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

            if (response.success && response.user) {
                this.successMessage.set('Login successful! Redirecting...');

                // Store user data with proper format for UserService
                const userProfile = {
                    userId: response.user.userId.toString(),
                    name: response.user.name,
                    mobile: response.user.mobile,
                    token: response.token || '',
                    loginTime: Date.now(),
                    expiresAt: Date.now() + (5 * 60 * 60 * 1000), // 5 hours
                    userRoleType: response.user.userRoleType
                };

                // Store in both formats for compatibility
                localStorage.setItem('liveWebinar-user', JSON.stringify(userProfile));
                localStorage.setItem('liveWebinar-token', response.token || '');

                // Role-based redirect
                setTimeout(() => {
                    this.redirectBasedOnRole(response.user!.userRoleType);
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

    private redirectBasedOnRole(role: UserRole) {
        switch (role) {
            case UserRole.Admin:
                console.log('🎤 Redirecting to dashboard for admin/host');
                this.router.navigate(['/dashboard']);
                break;
            case UserRole.Host:
                console.log('🎤 Redirecting to viwer for host');
                this.router.navigate(['/viewer']);
                break;
            case UserRole.Guest:
            default:
                console.log('👥 Redirecting to viewer for guest');
                this.router.navigate(['/dashboard']);
                break;
        }
    }
}