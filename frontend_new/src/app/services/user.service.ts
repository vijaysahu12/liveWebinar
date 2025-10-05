import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { 
  LoginRequest, 
  LoginResponse, 
  UserDto, 
  DashboardResponse, 
  CreateWebinarRequest, 
  WebinarRegistrationRequest, 
  SubscriptionRequest, 
  WebinarAccessResponse,
  WebinarScheduleDto,
  ViewerLoginRequest
} from '../models/user.models';

export interface UserProfile {
  mobile: string;
  name: string;
  userId: string;
  token: string;
  loginTime: number;
  expiresAt: number;
}

// Legacy interface for backward compatibility
export interface LegacyLoginRequest {
  mobile: string;
  name: string;
}

export interface LegacyLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  userId?: number;
  name?: string;
  mobile?: string;
  shouldLogoutOther?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly STORAGE_KEY = 'liveWebinar-user';
  private readonly TOKEN_LIFETIME = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  public user$ = this.userSubject.asObservable();

  private apiUrl = 'http://localhost:5021/api';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  private loadUserFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const user: UserProfile = JSON.parse(stored);
        
        // Check if token is still valid (within 5 hours)
        if (Date.now() < user.expiresAt) {
          this.userSubject.next(user);
          console.log('🆔 Loaded user from storage:', user.name, user.mobile);
        } else {
          console.log('⏰ Stored user token expired, clearing storage');
          this.clearUserData();
        }
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearUserData();
    }
  }

  private saveUserToStorage(user: UserProfile): void {
    if (isPlatformBrowser(this.platformId)) {
      const dataToSave = JSON.stringify(user);
      console.log('💾 Saving to localStorage:', this.STORAGE_KEY, dataToSave);
      localStorage.setItem(this.STORAGE_KEY, dataToSave);
      
      // Verify it was saved
      const saved = localStorage.getItem(this.STORAGE_KEY);
      console.log('✅ Verified saved data:', saved);
    } else {
      console.log('⚠️ Not in browser, cannot save to localStorage');
    }
  }

  private clearUserData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.userSubject.next(null);
  }

  async loginUser(loginData: ViewerLoginRequest): Promise<LegacyLoginResponse> {
    try {
      const response = await fetch('http://localhost:5021/api/auth/login-viewer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const result: LegacyLoginResponse = await response.json();

      console.log('🔍 Raw backend response:', result);

      if (result.success && result.token && result.userId && result.name && result.mobile) {
        const user: UserProfile = {
          userId: result.userId.toString(),
          name: result.name,
          mobile: result.mobile,
          token: result.token,
          loginTime: Date.now(),
          expiresAt: Date.now() + this.TOKEN_LIFETIME
        };

        console.log('🔍 User object to save:', user);
        
        this.saveUserToStorage(user);
        this.userSubject.next(user);
        
        console.log('✅ User logged in successfully:', user.name);
        console.log('💾 User saved to localStorage with key:', this.STORAGE_KEY);
      }

      return result;
    } catch (error) {
      console.error('❌ Login failed - server may be unavailable:', error);
      console.warn('⚠️ Network error during login attempt');
      
      // Return user-friendly error message, don't expose technical details
      return {
        success: false,
        message: 'Unable to connect to server. Please check your connection and try again.'
      };
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    const user = this.getCurrentUser();
    return user !== null && Date.now() < user.expiresAt;
  }

  logout(): void {
    console.log('👋 Logging out user');
    this.clearUserData();
  }

  // Check if token is about to expire (within 30 minutes)
  isTokenExpiringSoon(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    const thirtyMinutes = 30 * 60 * 1000;
    return (user.expiresAt - Date.now()) < thirtyMinutes;
  }

  // Extend token expiry by another 5 hours
  extendToken(): void {
    const user = this.getCurrentUser();
    if (user) {
      user.expiresAt = Date.now() + this.TOKEN_LIFETIME;
      this.saveUserToStorage(user);
      this.userSubject.next(user);
    }
  }

  // New API methods for webinar management

  async login(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, loginData).toPromise();
      return response || { success: false, message: 'No response from server' };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.error?.message || 'Login failed');
    }
  }

  async getUserDashboard(userId: number): Promise<DashboardResponse> {
    try {
      const response = await this.http.get<DashboardResponse>(`${this.apiUrl}/webinar/dashboard/${userId}`).toPromise();
      if (!response) throw new Error('No response from server');
      return response;
    } catch (error: any) {
      console.error('Dashboard error:', error);
      throw new Error(error.error?.message || 'Failed to load dashboard');
    }
  }

  async getUpcomingWebinars(): Promise<WebinarScheduleDto[]> {
    try {
      const response = await this.http.get<WebinarScheduleDto[]>(`${this.apiUrl}/webinar/upcoming`).toPromise();
      return response || [];
    } catch (error: any) {
      console.error('Get webinars error:', error);
      throw new Error(error.error?.message || 'Failed to load webinars');
    }
  }

  async createWebinar(webinarData: CreateWebinarRequest, hostUserId: number): Promise<any> {
    try {
      const response = await this.http.post(`${this.apiUrl}/webinar/create?hostUserId=${hostUserId}`, webinarData).toPromise();
      return response;
    } catch (error: any) {
      console.error('Create webinar error:', error);
      throw new Error(error.error?.message || 'Failed to create webinar');
    }
  }

  async registerForWebinar(registrationData: WebinarRegistrationRequest, userId: number): Promise<any> {
    try {
      const response = await this.http.post(`${this.apiUrl}/webinar/register?userId=${userId}`, registrationData).toPromise();
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.error?.message || 'Failed to register for webinar');
    }
  }

  async checkWebinarAccess(webinarId: number, userId: number): Promise<WebinarAccessResponse> {
    try {
      const response = await this.http.get<WebinarAccessResponse>(`${this.apiUrl}/webinar/access/${webinarId}?userId=${userId}`).toPromise();
      if (!response) throw new Error('No response from server');
      return response;
    } catch (error: any) {
      console.error('Access check error:', error);
      throw new Error(error.error?.message || 'Failed to check webinar access');
    }
  }

  async promoteToHost(userId: number, adminUserId: number): Promise<any> {
    try {
      const response = await this.http.post(`${this.apiUrl}/auth/promote-to-host?userId=${userId}&adminUserId=${adminUserId}`, {}).toPromise();
      return response;
    } catch (error: any) {
      console.error('Promote to host error:', error);
      throw new Error(error.error?.message || 'Failed to promote user to host');
    }
  }

  async subscribe(subscriptionData: SubscriptionRequest, userId: number): Promise<any> {
    try {
      const response = await this.http.post(`${this.apiUrl}/auth/subscribe?userId=${userId}`, subscriptionData).toPromise();
      return response;
    } catch (error: any) {
      console.error('Subscribe error:', error);
      throw new Error(error.error?.message || 'Failed to create subscription');
    }
  }
}
