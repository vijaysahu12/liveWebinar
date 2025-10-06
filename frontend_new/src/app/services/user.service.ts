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
  ViewerLoginRequest,
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminUserListResponse,
  AdminUpdateUserRequest
} from '../models/user.models';

export interface UserProfile {
  mobile: string;
  name: string;
  userId: string;
  token: string;
  loginTime: number;
  expiresAt: number;
  userRoleType: number; // 0=Guest, 1=Admin, 2=Host
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
    // UNIFIED LOGIN: Use the same endpoint as the main login method
    try {
      const loginRequest: LoginRequest = {
        mobile: loginData.mobile,
        name: loginData.name,
        email: loginData.email || ''
      };

      console.log('🔄 Using unified login endpoint for viewer login');
      const response = await this.login(loginRequest);
      
      if (response.success && response.user) {
        // Store user data in the correct format
        const user: UserProfile = {
          userId: response.user.userId.toString(),
          name: response.user.name,
          mobile: response.user.mobile,
          token: response.token || '',
          loginTime: Date.now(),
          expiresAt: Date.now() + this.TOKEN_LIFETIME,
          userRoleType: response.user.userRoleType
        };

        console.log('🔍 User object to save:', user);
        
        this.saveUserToStorage(user);
        this.userSubject.next(user);
        
        console.log('✅ User logged in successfully:', user.name);
        
        // Convert to legacy response format for backward compatibility
        return {
          success: true,
          message: response.message,
          token: response.token,
          userId: response.user.userId,
          name: response.user.name,
          mobile: response.user.mobile,
          shouldLogoutOther: false
        };
      } else {
        return {
          success: false,
          message: response.message || 'Login failed'
        };
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Return user-friendly error message
      return {
        success: false,
        message: error.message || 'Unable to connect to server. Please check your connection and try again.'
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
      const response = await this.http.post<LoginResponse>(`${this.apiUrl}/user/login`, loginData).toPromise();
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

  // Admin User Management Methods
  async createUser(userData: AdminCreateUserRequest): Promise<AdminCreateUserResponse> {
    try {
      const user = this.getCurrentUser();
      if (!user?.token) {
        throw new Error('Authentication required');
      }

      const response = await this.http.post<AdminCreateUserResponse>(
        `${this.apiUrl}/user/admin/create-user`, 
        userData,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      ).toPromise();
      
      return response!;
    } catch (error: any) {
      console.error('Create user error:', error);
      throw new Error(error.error?.message || 'Failed to create user');
    }
  }

  async getAllUsers(page: number = 1, pageSize: number = 50): Promise<AdminUserListResponse> {
    try {
      const user = this.getCurrentUser();
      if (!user?.token) {
        throw new Error('Authentication required');
      }

      const response = await this.http.get<AdminUserListResponse>(
        `${this.apiUrl}/user/admin/users?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      ).toPromise();
      
      return response!;
    } catch (error: any) {
      console.error('Get users error:', error);
      throw new Error(error.error?.message || 'Failed to fetch users');
    }
  }

  async updateUser(userData: AdminUpdateUserRequest): Promise<AdminCreateUserResponse> {
    try {
      const user = this.getCurrentUser();
      if (!user?.token) {
        throw new Error('Authentication required');
      }

      const response = await this.http.put<AdminCreateUserResponse>(
        `${this.apiUrl}/user/admin/update-user`, 
        userData,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      ).toPromise();
      
      return response!;
    } catch (error: any) {
      console.error('Update user error:', error);
      throw new Error(error.error?.message || 'Failed to update user');
    }
  }

  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.getCurrentUser();
      if (!user?.token) {
        throw new Error('Authentication required');
      }

      const response = await this.http.delete<{ success: boolean; message: string }>(
        `${this.apiUrl}/user/admin/delete-user/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      ).toPromise();
      
      return response!;
    } catch (error: any) {
      console.error('Delete user error:', error);
      throw new Error(error.error?.message || 'Failed to delete user');
    }
  }
}
