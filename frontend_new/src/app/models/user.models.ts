export enum UserRole {
  Guest = 0,
  Admin = 1,
  Host = 2
}

export enum SubscriptionType {
  Free = 0,
  Paid = 1
}

export enum WebinarStatus {
  Scheduled = 0,
  Live = 1,
  Completed = 2,
  Cancelled = 3
}

export interface LoginRequest {
  mobile: string;
  name: string;
  email: string;
}

export interface ViewerLoginRequest {
  mobile: string;
  name: string;
  email?: string;
  forceLogout?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: UserDto;
  token?: string;
}

export interface UserDto {
  userId: number;
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface WebinarScheduleDto {
  id: number;
  title: string;
  description: string;
  scheduledDateTime: string;
  durationMinutes: number;
  thumbnailUrl: string;
  streamUrl: string;
  status: WebinarStatus;
  requiredSubscription: SubscriptionType;
  price: number;
  hostName: string;
  registeredCount: number;
  canAccess: boolean;
  isRegistered: boolean;
  isLive: boolean;
  isAccessible: boolean;
}

export interface CreateWebinarRequest {
  title: string;
  description: string;
  scheduledDateTime: string;
  durationMinutes: number;
  thumbnailUrl: string;
  streamUrl: string;
  requiredSubscription: SubscriptionType;
  price: number;
}

export interface WebinarRegistrationRequest {
  webinarId: number;
  subscriptionType: SubscriptionType;
  paymentTransactionId?: string;
  amountPaid: number;
}

export interface SubscriptionRequest {
  type: SubscriptionType;
  endDate?: string;
  amountPaid: number;
  paymentTransactionId?: string;
}

export interface WebinarAccessResponse {
  canAccess: boolean;
  message: string;
  webinar?: WebinarScheduleDto;
  remainingTime?: string;
}

export interface DashboardResponse {
  user: UserDto;
  upcomingWebinars: WebinarScheduleDto[];
  myWebinars: WebinarScheduleDto[];
  registeredWebinars: WebinarScheduleDto[];
  activeSubscription?: UserSubscription;
  totalRegistrations: number;
  totalWebinarsHosted: number;
}

export interface UserSubscription {
  id: number;
  userId: number;
  type: SubscriptionType;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  amountPaid: number;
  paymentTransactionId?: string;
  createdAt: string;
}