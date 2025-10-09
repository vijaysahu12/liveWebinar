import { Component, OnInit, OnDestroy, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { SignalrService } from '../services/signalr.service';
import { Subscription } from 'rxjs';
import {
    DashboardResponse,
    WebinarScheduleDto,
    UserRole,
    WebinarStatus,
    SubscriptionType,
    CreateWebinarRequest,
    AdminUserInfo,
    AdminCreateUserRequest,
    AdminUpdateUserRequest
} from '../models/user.models';

// Chat interface for guest view
interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: Date;
    userId: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="dashboard-container">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1>🎥 Live Webinar Dashboard vj</h1>
          <div class="user-info">
            <span class="welcome">Welcome, {{ dashboard()?.user?.name }}</span>
            <span class="role-badge" [class]="getRoleClass()">
              {{ getRoleText() }}
            </span>
            <button class="logout-btn" (click)="logout()">🚪 Logout</button>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <div class="error-message">{{ error() }}</div>
          <button class="retry-btn" (click)="loadDashboard()">🔄 Retry</button>
        </div>
      } @else if (dashboard()) {
        <div class="dashboard-content" [class.full-screen-guest]="isGuest()">
          
          <!-- Stats Cards - Only show for non-guests -->
          @if (!isGuest()) {
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <h3>{{ dashboard()?.totalRegistrations || 0 }}</h3>
                  <p>Total Registrations</p>
                </div>
              </div>
              
              @if (isHostOrAdmin()) {
                <div class="stat-card">
                  <div class="stat-icon">🎤</div>
                  <div class="stat-content">
                    <h3>{{ dashboard()?.totalWebinarsHosted || 0 }}</h3>
                    <p>Webinars Hosted</p>
                  </div>
                </div>
              }
              
              <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-content">
                  <h3>{{ dashboard()?.upcomingWebinars?.length || 0 }}</h3>
                  <p>Upcoming Events</p>
                </div>
              </div>

              @if (dashboard()?.activeSubscription) {
                <div class="stat-card premium">
                  <div class="stat-icon">👑</div>
                  <div class="stat-content">
                    <h3>Premium</h3>
                    <p>Active Subscription</p>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Guest View: Video + Chat -->
          @if (isGuest()) {
            <section class="guest-section">
              <div class="video-chat-container">
                <!-- Left Side: Live Streaming (70%) -->
                <div class="video-section">
                  <!-- Event header -->
                  <div class="event-header">
                    <div style="flex:1">
                      <div class="event-title">Algo Trading Setup for Crypto</div>
                      <div class="event-meta" style="margin-top:6px">
                        <div class="pill">Event: Oct 5, 2025 • 07:00 PM IST</div>
                        <div class="pill">Duration: 90 mins</div>
                        <div class="pill live-pill">LIVE</div>
                      </div>
                    </div>
                  </div>

                  <!-- Video player area -->
                  <div class="video-area">
                    <iframe 
                      src="https://www.youtube.com/embed/2kT42dG4xpg?si=pp0ho09c9_h4hnGj"
                      title="YouTube video player" 
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin" 
                      allowfullscreen>
                    </iframe>
                  </div>
                </div>

                <!-- Right Side: Chat (30%) -->
                <div class="chat-section">
                  <div class="chat-header">
                    <h3>Live Chat</h3>
                    <div class="chat-controls">
                      <div class="chat-stats">{{ chatMessages().length }} messages</div>
                      <div class="signalr-status" [class.connected]="signalrConnected()">
                        {{ signalrConnected() ? '🟢 Connected' : '🔴 Disconnected' }}
                      </div>
                      <button class="test-btn" (click)="testSignalRConnection()">Test SignalR</button>
                    </div>
                  </div>

                  <div class="chat-messages">
                    @for (message of chatMessages(); track message.id) {
                      <div class="chat-message" [class.own-message]="message.userId === getUserId()">
                        <div class="message-header">
                          <span class="username">{{ message.username }}</span>
                          <span class="timestamp">{{ message.timestamp | date:'HH:mm' }}</span>
                        </div>
                        <div class="message-content">{{ message.message }}</div>
                      </div>
                    }

                    @if (chatMessages().length === 0) {
                      <div class="no-messages">
                        <p>💬 No messages yet. Start the conversation!</p>
                      </div>
                    }
                  </div>

                  <div class="chat-input">
                    <input 
                      type="text" 
                      placeholder="Type your message..." 
                      [(ngModel)]="currentMessage"
                      (keypress)="onChatKeyPress($event)"
                      class="message-input" 
                    />
                    <button 
                      (click)="sendChatMessage()" 
                      [disabled]="!currentMessage.trim()"
                      class="send-btn">
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </section>
          }

          <!-- Host Controls -->
          @if (isHostOrAdmin()) {
            <section class="section">
              <div class="section-header">
                <h2>🎤 Host Controls</h2>
                <div class="host-actions">
                  <button class="create-btn" (click)="showCreateWebinar.set(true)">
                    ➕ Create Webinar
                  </button>
                  <button class="poll-btn" (click)="showCreatePoll.set(true)">
                    📊 Create Poll
                  </button>
                </div>
              </div>

              @if (dashboard()?.myWebinars && dashboard()!.myWebinars.length > 0) {
                <div class="webinars-grid">
                  @for (webinar of dashboard()!.myWebinars; track webinar.id) {
                    <div class="webinar-card host-webinar">
                      <div class="webinar-thumbnail">
                        @if (webinar.thumbnailUrl) {
                          <img [src]="webinar.thumbnailUrl" [alt]="webinar.title">
                        } @else {
                          <div class="default-thumbnail">🎥</div>
                        }
                        <div class="webinar-status" [class]="getStatusClass(webinar.status)">
                          {{ getStatusText(webinar.status) }}
                        </div>
                      </div>
                      <div class="webinar-content">
                        <h3>{{ webinar.title }}</h3>
                        <p class="webinar-description">{{ webinar.description }}</p>
                        <div class="webinar-meta">
                          <span class="webinar-date">
                            📅 {{ formatDate(webinar.scheduledDateTime) }}
                          </span>
                          <span class="webinar-registrations">
                            👥 {{ webinar.registeredCount }} registered
                          </span>
                        </div>
                        <div class="webinar-actions">
                          @if (webinar.isLive) {
                            <button class="action-btn live-btn" (click)="joinWebinar(webinar.id)">
                              🔴 Go Live
                            </button>
                          } @else {
                            <button class="action-btn manage-btn" (click)="manageWebinar(webinar.id)">
                              ⚙️ Manage
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <p>No webinars created yet</p>
                  <button class="create-btn" (click)="showCreateWebinar.set(true)">
                    🎬 Create Your First Webinar
                  </button>
                </div>
              }
            </section>
          }

          <!-- Admin Controls -->
          @if (isAdmin()) {
            <section class="section">
              <div class="section-header">
                <h2>👑 Admin Controls</h2>
                <div class="admin-buttons">
                  <button class="create-btn" (click)="showUsers()">
                    👥 Manage Users
                  </button>
                  <button class="create-btn" (click)="showCreateUser.set(true)">
                    ➕ Create User
                  </button>
                </div>
              </div>

              <!-- User Management Modal -->
              @if (showUserManagement()) {
                <div class="modal-overlay" (click)="showUserManagement.set(false)">
                  <div class="modal-content user-management-modal" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                      <h3>👥 User Management</h3>
                      <button class="close-btn" (click)="showUserManagement.set(false)">✕</button>
                    </div>
                    
                    <div class="modal-body">
                      @if (usersLoading()) {
                        <div class="loading-container">
                          <div class="loading-spinner"></div>
                          <p>Loading users...</p>
                        </div>
                      } @else if (usersError()) {
                        <div class="error-message">{{ usersError() }}</div>
                      } @else {
                        <div class="users-table-container">
                          <table class="users-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (user of users(); track user.id) {
                                <tr>
                                  <td>{{ user.name }}</td>
                                  <td>{{ user.mobile }}</td>
                                  <td>{{ user.email }}</td>
                                  <td>
                                    <span class="role-badge" [class]="'role-' + user.userRoleType">
                                      {{ user.userRoleType === 0 ? 'Guest' : user.userRoleType === 1 ? 'Admin' : 'Host' }}
                                    </span>
                                  </td>
                                  <td>
                                    <span class="status-badge" [class]="user.isActive ? 'active' : 'inactive'">
                                      {{ user.isActive ? 'Active' : 'Inactive' }}
                                    </span>
                                  </td>
                                  <td>{{ user.createdAt | date:'short' }}</td>
                                  <td>
                                    <button class="action-btn edit-btn" (click)="editUser(user)">✏️</button>
                                    <button class="action-btn delete-btn" (click)="deleteUser(user.id)">🗑️</button>
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                          
                          <!-- Pagination -->
                          <div class="pagination">
                            <button class="page-btn" [disabled]="currentPage() === 1" (click)="previousPage()">
                              ← Previous
                            </button>
                            <span class="page-info">
                              Page {{ currentPage() }} of {{ Math.ceil(totalUsers() / pageSize) }}
                              ({{ totalUsers() }} total users)
                            </span>
                            <button class="page-btn" [disabled]="(currentPage() * pageSize) >= totalUsers()" (click)="nextPage()">
                              Next →
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Create User Modal -->
              @if (showCreateUser()) {
                <div class="modal-overlay" (click)="showCreateUser.set(false)">
                  <div class="modal-content create-user-modal" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                      <h3>➕ Create New User</h3>
                      <button class="close-btn" (click)="showCreateUser.set(false)">✕</button>
                    </div>
                    
                    <div class="modal-body">
                      <form class="user-form" (ngSubmit)="createUser()">
                        <div class="form-row">
                          <div class="form-group">
                            <label for="userName">Name *</label>
                            <input type="text" id="userName" [(ngModel)]="newUser.name" required>
                          </div>
                          <div class="form-group">
                            <label for="userMobile">Mobile *</label>
                            <input type="tel" id="userMobile" [(ngModel)]="newUser.mobile" required>
                          </div>
                        </div>
                        
                        <div class="form-row">
                          <div class="form-group">
                            <label for="userEmail">Email</label>
                            <input type="email" id="userEmail" [(ngModel)]="newUser.email">
                          </div>
                          <div class="form-group">
                            <label for="userRole">Role</label>
                            <select id="userRole" [(ngModel)]="newUser.userRoleType">
                              @for (role of getRoleOptions(); track role.value) {
                                <option [value]="role.value">{{ role.label }}</option>
                              }
                            </select>
                          </div>
                        </div>
                        
                        <div class="form-row">
                          <div class="form-group">
                            <label for="userCity">City</label>
                            <input type="text" id="userCity" [(ngModel)]="newUser.city">
                          </div>
                          <div class="form-group">
                            <label for="userState">State</label>
                            <input type="text" id="userState" [(ngModel)]="newUser.state">
                          </div>
                        </div>
                        
                        <div class="form-row">
                          <div class="form-group">
                            <label for="userCountry">Country</label>
                            <input type="text" id="userCountry" [(ngModel)]="newUser.country">
                          </div>
                          <div class="form-group checkbox-group">
                            <label>
                              <input type="checkbox" [(ngModel)]="newUser.isActive">
                              Active User
                            </label>
                          </div>
                        </div>
                        
                        <div class="form-actions">
                          <button type="button" class="cancel-btn" (click)="showCreateUser.set(false)">Cancel</button>
                          <button type="submit" class="submit-btn">Create User</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              }

              <!-- Edit User Modal -->
              @if (editingUser()) {
                <div class="modal-overlay" (click)="cancelUserEdit()">
                  <div class="modal-content edit-user-modal" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                      <h3>✏️ Edit User</h3>
                      <button class="close-btn" (click)="cancelUserEdit()">✕</button>
                    </div>
                    
                    <div class="modal-body">
                      <form class="user-form" (ngSubmit)="updateUser()">
                        <div class="form-row">
                          <div class="form-group">
                            <label for="editUserName">Name</label>
                            <input type="text" id="editUserName" [(ngModel)]="editingUser()!.name">
                          </div>
                          <div class="form-group">
                            <label for="editUserMobile">Mobile (Read Only)</label>
                            <input type="tel" id="editUserMobile" [value]="editingUser()!.mobile" readonly>
                          </div>
                        </div>
                        
                        <div class="form-row">
                          <div class="form-group">
                            <label for="editUserEmail">Email</label>
                            <input type="email" id="editUserEmail" [(ngModel)]="editingUser()!.email">
                          </div>
                          <div class="form-group">
                            <label for="editUserRole">Role</label>
                            <select id="editUserRole" [(ngModel)]="editingUser()!.userRoleType">
                              @for (role of getRoleOptions(); track role.value) {
                                <option [value]="role.value">{{ role.label }}</option>
                              }
                            </select>
                          </div>
                        </div>
                        
                        <div class="form-row">
                          <div class="form-group">
                            <label for="editUserCity">City</label>
                            <input type="text" id="editUserCity" [(ngModel)]="editingUser()!.city">
                          </div>
                          <div class="form-group">
                            <label for="editUserState">State</label>
                            <input type="text" id="editUserState" [(ngModel)]="editingUser()!.state">
                          </div>
                        </div>
                        
                        <div class="form-row">
                          <div class="form-group">
                            <label for="editUserCountry">Country</label>
                            <input type="text" id="editUserCountry" [(ngModel)]="editingUser()!.country">
                          </div>
                          <div class="form-group checkbox-group">
                            <label>
                              <input type="checkbox" [(ngModel)]="editingUser()!.isActive">
                              Active User
                            </label>
                          </div>
                        </div>
                        
                        <div class="form-actions">
                          <button type="button" class="cancel-btn" (click)="cancelUserEdit()">Cancel</button>
                          <button type="submit" class="submit-btn">Update User</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              }
            </section>
          }

          <!-- Registered Webinars -->
          @if (dashboard()?.registeredWebinars && dashboard()!.registeredWebinars.length > 0) {
            <section class="section">
              <h2>🎯 My Registrations</h2>
              <div class="webinars-grid">
                @for (webinar of dashboard()!.registeredWebinars; track webinar.id) {
                  <div class="webinar-card">
                    <div class="webinar-thumbnail">
                      @if (webinar.thumbnailUrl) {
                        <img [src]="webinar.thumbnailUrl" [alt]="webinar.title">
                      } @else {
                        <div class="default-thumbnail">🎥</div>
                      }
                      @if (webinar.isLive) {
                        <div class="live-indicator">🔴 LIVE</div>
                      }
                    </div>
                    <div class="webinar-content">
                      <h3>{{ webinar.title }}</h3>
                      <p class="webinar-host">Host: {{ webinar.hostName }}</p>
                      <div class="webinar-meta">
                        <span class="webinar-date">
                          📅 {{ formatDate(webinar.scheduledDateTime) }}
                        </span>
                        <span class="webinar-duration">
                          ⏱️ {{ webinar.durationMinutes }} min
                        </span>
                      </div>
                      <div class="webinar-actions">
                        @if (webinar.canAccess && webinar.isAccessible) {
                          <button class="action-btn join-btn" (click)="joinWebinar(webinar.id)">
                            {{ webinar.isLive ? '🔴 Join Live' : '▶️ Join' }}
                          </button>
                        } @else if (!webinar.isAccessible) {
                          <span class="access-info">Access available at scheduled time</span>
                        } @else {
                          <button class="action-btn disabled" disabled>
                            ❌ No Access
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- Upcoming Webinars -->
          @if (dashboard()?.upcomingWebinars && dashboard()!.upcomingWebinars.length > 0) {
            <section class="section">
              <h2>🚀 Upcoming Webinars</h2>
              <div class="webinars-grid">
                @for (webinar of dashboard()!.upcomingWebinars.slice(0, 6); track webinar.id) {
                  <div class="webinar-card">
                    <div class="webinar-thumbnail">
                      @if (webinar.thumbnailUrl) {
                        <img [src]="webinar.thumbnailUrl" [alt]="webinar.title">
                      } @else {
                        <div class="default-thumbnail">🎥</div>
                      }
                      @if (webinar.requiredSubscription === SubscriptionType.Paid) {
                        <div class="premium-badge">👑 Premium</div>
                      }
                    </div>
                    <div class="webinar-content">
                      <h3>{{ webinar.title }}</h3>
                      <p class="webinar-host">Host: {{ webinar.hostName }}</p>
                      <div class="webinar-meta">
                        <span class="webinar-date">
                          📅 {{ formatDate(webinar.scheduledDateTime) }}
                        </span>
                        <span class="webinar-price">
                          {{ webinar.price > 0 ? '💰 ₹' + webinar.price : '🆓 Free' }}
                        </span>
                      </div>
                      <div class="webinar-actions">
                        @if (webinar.isRegistered) {
                          <button class="action-btn registered-btn" disabled>
                            ✅ Registered
                          </button>
                        } @else {
                          <button class="action-btn register-btn" (click)="registerForWebinar(webinar.id)">
                            🎫 Register
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        </div>
      }
    </div>

    <!-- Create Webinar Modal -->
    @if (showCreateWebinar()) {
      <div class="modal-overlay" (click)="showCreateWebinar.set(false)">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🎬 Create New Webinar</h3>
            <button class="modal-close" (click)="showCreateWebinar.set(false)">×</button>
          </div>
          <form (ngSubmit)="createWebinar()" class="create-form">
            <div class="form-group">
              <label>Title</label>
              <input [(ngModel)]="newWebinar.title" name="title" required class="form-input">
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newWebinar.description" name="description" class="form-textarea"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Date & Time</label>
                <input type="datetime-local" [(ngModel)]="newWebinar.scheduledDateTime" name="scheduledDateTime" required class="form-input">
              </div>
              <div class="form-group">
                <label>Duration (minutes)</label>
                <input type="number" [(ngModel)]="newWebinar.durationMinutes" name="durationMinutes" min="30" max="480" class="form-input">
              </div>
            </div>
            <div class="form-group">
              <label>Stream URL</label>
              <input [(ngModel)]="newWebinar.streamUrl" name="streamUrl" placeholder="YouTube, Zoom, or other streaming URL" class="form-input">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Subscription Required</label>
                <select [(ngModel)]="newWebinar.requiredSubscription" name="requiredSubscription" class="form-select">
                  <option [value]="SubscriptionType.Free">Free</option>
                  <option [value]="SubscriptionType.Paid">Premium Only</option>
                </select>
              </div>
              <div class="form-group">
                <label>Price (₹)</label>
                <input type="number" [(ngModel)]="newWebinar.price" name="price" min="0" class="form-input">
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="cancel-btn" (click)="showCreateWebinar.set(false)">Cancel</button>
              <button type="submit" class="create-btn" [disabled]="!newWebinar.title">Create Webinar</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Create Poll Modal -->
    @if (showCreatePoll()) {
      <div class="modal-overlay" (click)="showCreatePoll.set(false)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📊 Create Poll</h3>
            <button class="modal-close" (click)="showCreatePoll.set(false)">×</button>
          </div>
          <form (ngSubmit)="createPoll()" class="create-form">
            <div class="form-group">
              <label>Poll Question*</label>
              <input type="text" [(ngModel)]="newPoll.question" name="question" required 
                     placeholder="Enter your poll question..." class="form-input">
            </div>
            
            <div class="form-group">
              <label>Options</label>
              @for (option of newPoll.options; track $index) {
                <div class="option-input-group">
                  <input type="text" [(ngModel)]="newPoll.options[$index]" 
                         [name]="'option' + $index" required 
                         placeholder="Option {{ $index + 1 }}" class="form-input">
                  @if (newPoll.options.length > 2) {
                    <button type="button" class="remove-option-btn" (click)="removeOption($index)">
                      🗑️
                    </button>
                  }
                </div>
              }
              @if (newPoll.options.length < 5) {
                <button type="button" class="add-option-btn" (click)="addOption()">
                  ➕ Add Option
                </button>
              }
            </div>
            
            <div class="form-group">
              <label>Duration (seconds)</label>
              <select [(ngModel)]="newPoll.durationSeconds" name="duration" class="form-select">
                <option [value]="0">No time limit (manual close)</option>
                <option [value]="30">30 seconds</option>
                <option [value]="60">1 minute</option>
                <option [value]="120">2 minutes</option>
                <option [value]="300">5 minutes</option>
              </select>
            </div>
            
            <div class="modal-actions">
              <button type="button" class="cancel-btn" (click)="showCreatePoll.set(false)">Cancel</button>
              <button type="submit" class="create-btn" [disabled]="!isPollFormValid()">
                📊 Create Poll
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
    styles: [`
    /* Dashboard Container */
    .dashboard-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
    }

    /* Header */
    .dashboard-header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    /* Compact header for guest view */
    .dashboard-container:has(.guest-section) .dashboard-header {
      padding: 0.5rem 0;
    }

    .dashboard-container:has(.guest-section) .header-content {
      padding: 0.5rem 1rem;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-header h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .welcome {
      font-weight: 600;
      color: #4a5568;
      font-size: 0.95rem;
    }

    .role-badge {
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 2px solid;
    }

    .role-badge.admin {
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      color: white;
      border-color: #ff6b6b;
      box-shadow: 0 2px 10px rgba(255, 107, 107, 0.3);
    }

    .role-badge.host {
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      color: white;
      border-color: #4ecdc4;
      box-shadow: 0 2px 10px rgba(78, 205, 196, 0.3);
    }

    .role-badge.guest {
      background: linear-gradient(135deg, #a8e6cf, #88d8a3);
      color: #2d3748;
      border-color: #88d8a3;
      box-shadow: 0 2px 10px rgba(136, 216, 163, 0.3);
    }

    .logout-btn {
      background: linear-gradient(135deg, #ff7675, #d63031);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 10px rgba(214, 48, 49, 0.3);
    }

    .logout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(214, 48, 49, 0.4);
    }

    /* Loading States */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      color: white;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-container {
      text-align: center;
      padding: 2rem;
      color: white;
    }

    .error-message {
      background: rgba(255, 107, 107, 0.9);
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .retry-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .retry-btn:hover {
      background: white;
      color: #667eea;
    }

    /* Main Content */
    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      flex: 1;
    }

    /* Full screen styles for guest view */
    .dashboard-container:has(.guest-section) {
      padding: 0;
      margin: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }

    .dashboard-container:has(.guest-section) .dashboard-content {
      max-width: none;
      margin: 0;
      padding: 0;
      height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
    }

    .dashboard-content.full-screen-guest {
      max-width: none;
      margin: 0;
      padding: 0;
      height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }

    .stat-card.premium::before {
      background: linear-gradient(90deg, #ffd700, #ffed4e);
    }

    .stat-icon {
      font-size: 2.5rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
    }

    .stat-content h3 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: #2d3748;
      line-height: 1;
    }

    .stat-content p {
      margin: 0.5rem 0 0 0;
      color: #718096;
      font-weight: 500;
      font-size: 0.9rem;
    }

    /* Sections */
    .section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e2e8f0;
    }

    .section-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #2d3748;
    }

    /* Buttons */
    .create-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .create-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
    }

    /* Webinars Grid */
    .webinars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .webinar-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      border: 1px solid #e2e8f0;
    }

    .webinar-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .webinar-card.host-webinar {
      border-left: 4px solid #4ecdc4;
    }

    .webinar-thumbnail {
      position: relative;
      height: 200px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .webinar-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-thumbnail {
      font-size: 3rem;
      color: white;
    }

    .webinar-status {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .webinar-status.scheduled {
      background: #4ecdc4;
      color: white;
    }

    .webinar-status.live {
      background: #ff6b6b;
      color: white;
      animation: pulse 2s infinite;
    }

    .webinar-status.completed {
      background: #a8e6cf;
      color: #2d3748;
    }

    .live-indicator {
      position: absolute;
      top: 12px;
      left: 12px;
      background: #ff6b6b;
      color: white;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      animation: pulse 2s infinite;
    }

    .premium-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #2d3748;
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .webinar-content {
      padding: 1.5rem;
    }

    .webinar-content h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #2d3748;
      line-height: 1.3;
    }

    .webinar-description {
      color: #718096;
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .webinar-host {
      color: #4a5568;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .webinar-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .webinar-meta span {
      background: #f7fafc;
      color: #4a5568;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid #e2e8f0;
    }

    .webinar-date {
      background: rgba(102, 126, 234, 0.1) !important;
      color: #667eea !important;
      border-color: rgba(102, 126, 234, 0.2) !important;
    }

    .webinar-duration, .webinar-registrations {
      background: rgba(78, 205, 196, 0.1) !important;
      color: #4ecdc4 !important;
      border-color: rgba(78, 205, 196, 0.2) !important;
    }

    .webinar-price {
      background: rgba(255, 215, 0, 0.1) !important;
      color: #b7791f !important;
      border-color: rgba(255, 215, 0, 0.2) !important;
    }

    .webinar-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      min-width: 120px;
      padding: 0.6rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.85rem;
    }

    .live-btn {
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      color: white;
      box-shadow: 0 2px 10px rgba(255, 107, 107, 0.3);
    }

    .live-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
    }

    .manage-btn {
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      color: white;
      box-shadow: 0 2px 10px rgba(78, 205, 196, 0.3);
    }

    .manage-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(78, 205, 196, 0.4);
    }

    .join-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
    }

    .join-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    }

    .register-btn {
      background: linear-gradient(135deg, #a8e6cf, #88d8a3);
      color: #2d3748;
      box-shadow: 0 2px 10px rgba(136, 216, 163, 0.3);
    }

    .register-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(136, 216, 163, 0.4);
    }

    .registered-btn {
      background: #e2e8f0;
      color: #718096;
      cursor: not-allowed;
    }

    .disabled {
      background: #e2e8f0 !important;
      color: #a0aec0 !important;
      cursor: not-allowed !important;
      box-shadow: none !important;
    }

    .access-info {
      color: #718096;
      font-size: 0.85rem;
      text-align: center;
      padding: 0.6rem;
      background: #f7fafc;
      border-radius: 6px;
      font-style: italic;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      color: #718096;
    }

    .empty-state p {
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-container {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid #e2e8f0;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 16px 16px 0 0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .create-form {
      padding: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #2d3748;
      font-size: 0.9rem;
    }

    .form-input, .form-textarea, .form-select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      background: white;
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-textarea {
      min-height: 100px;
      resize: vertical;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }

    .cancel-btn {
      background: #e2e8f0;
      color: #4a5568;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .cancel-btn:hover {
      background: #cbd5e0;
    }

    /* Poll Creation Styles */
    .host-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .poll-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .poll-btn:hover {
      background: linear-gradient(135deg, #764ba2, #667eea);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .option-input-group {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .option-input-group input {
      flex: 1;
    }

    .remove-option-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.3s ease;
    }

    .remove-option-btn:hover {
      background: #dc2626;
    }

    .add-option-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: all 0.3s ease;
    }

    .add-option-btn:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .header-content {
        padding: 1rem;
        flex-direction: column;
        gap: 1rem;
      }

      .dashboard-content {
        padding: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .webinars-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .modal-container {
        margin: 1rem;
        max-width: calc(100% - 2rem);
      }

      .create-form {
        padding: 1rem;
      }

      .modal-actions {
        flex-direction: column;
      }
    }

    @media (max-width: 480px) {
      .user-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .webinar-actions {
        flex-direction: column;
      }

      .action-btn {
        min-width: auto;
      }
    }

    /* User Management Styles */
    .admin-buttons {
      display: flex;
      gap: 1rem;
    }

    .user-management-modal,
    .create-user-modal,
    .edit-user-modal {
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
    }

    .users-table-container {
      overflow-x: auto;
      margin: 1rem 0;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .users-table th,
    .users-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .users-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #2d3748;
    }

    .users-table tbody tr:hover {
      background: #f7fafc;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-0 {
      background: #e2e8f0;
      color: #4a5568;
    }

    .role-1 {
      background: #fed7d7;
      color: #c53030;
    }

    .role-2 {
      background: #c6f6d5;
      color: #2f855a;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.active {
      background: #c6f6d5;
      color: #2f855a;
    }

    .status-badge.inactive {
      background: #fed7d7;
      color: #c53030;
    }

    .action-btn {
      background: none;
      border: none;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
      margin: 0 0.25rem;
    }

    .edit-btn:hover {
      background: #e2f8ff;
    }

    .delete-btn:hover {
      background: #fed7d7;
    }

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .page-btn {
      background: #4299e1;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .page-btn:hover:not(:disabled) {
      background: #3182ce;
    }

    .page-btn:disabled {
      background: #e2e8f0;
      color: #a0aec0;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 0.875rem;
      color: #4a5568;
    }

    .user-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: #2d3748;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .form-group input[readonly] {
      background: #f7fafc;
      color: #4a5568;
    }

    .checkbox-group {
      flex-direction: row;
      align-items: center;
      gap: 0.75rem;
    }

    .checkbox-group input[type="checkbox"] {
      width: auto;
      margin: 0;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
    }

    .submit-btn {
      background: #4299e1;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .submit-btn:hover {
      background: #3182ce;
    }

    @media (max-width: 768px) {
      .admin-buttons {
        flex-direction: column;
      }
      
      .users-table {
        font-size: 0.875rem;
      }
      
      .users-table th,
      .users-table td {
        padding: 0.5rem;
      }
      
      .form-row {
        grid-template-columns: 1fr;
      }
      
      .pagination {
        flex-direction: column;
        gap: 1rem;
      }
    }

    /* Guest View Styles */
    .guest-section {
      margin-top: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .video-chat-container {
      display: flex;
      gap: 0;
      height: 100%;
      background: white;
      overflow: hidden;
      flex: 1;
    }

    .video-section {
      flex: 7;
      display: flex;
      flex-direction: column;
      height: 100%;
      border-right: 1px solid #e5e7eb;
    }

    .event-header {
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .event-title {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .event-meta {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .pill {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      backdrop-filter: blur(10px);
    }

    .live-pill {
      background: #ff4444 !important;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .video-area {
      flex: 1;
      position: relative;
      height: 100%;
      overflow: hidden;
    }

    .video-area iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .chat-section {
      flex: 3;
      display: flex;
      flex-direction: column;
      border-left: 1px solid #e5e7eb;
      height: 100%;
      overflow: hidden;
    }

    .chat-header {
      padding: 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .chat-header h3 {
      margin: 0;
      color: #374151;
      font-size: 1.1rem;
    }

    .chat-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .chat-stats {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .signalr-status {
      font-size: 0.75rem;
      color: #ef4444;
      font-weight: 600;
    }

    .signalr-status.connected {
      color: #10b981;
    }

    .test-btn {
      padding: 0.25rem 0.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .test-btn:hover {
      background: #2563eb;
    }

    .chat-messages {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      scroll-behavior: smooth;
      height: 100%;
    }

    .chat-message {
      background: #f3f4f6;
      padding: 0.75rem;
      border-radius: 8px;
      max-width: 80%;
    }

    .chat-message.own-message {
      background: #dbeafe;
      margin-left: auto;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .username {
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .timestamp {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .message-content {
      color: #111827;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .no-messages {
      text-align: center;
      color: #6b7280;
      margin-top: 2rem;
    }

    .chat-input {
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .message-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      resize: none;
    }

    .message-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .send-btn {
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .send-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .send-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    /* Responsive Design for Guest View */
    @media (max-width: 1024px) {
      .video-chat-container {
        flex-direction: column;
        height: auto;
      }

      .video-section {
        flex: none;
        height: 50vh;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
      }

      .chat-section {
        flex: none;
        height: 50vh;
        border-left: none;
        border-top: 1px solid #e5e7eb;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container:has(.guest-section) .header-content {
        padding: 0.5rem;
        flex-direction: column;
        gap: 0.5rem;
      }

      .user-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .video-section {
        height: 40vh;
      }

      .chat-section {
        height: 60vh;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
    dashboard = signal<DashboardResponse | null>(null);
    loading = signal(true);
    error = signal('');
    showCreateWebinar = signal(false);
    showCreatePoll = signal(false); // Add poll creation modal

    // User Management signals
    showUserManagement = signal(false);
    users = signal<AdminUserInfo[]>([]);
    usersLoading = signal(false);
    usersError = signal('');
    showCreateUser = signal(false);
    editingUser = signal<AdminUserInfo | null>(null);
    totalUsers = signal(0);
    currentPage = signal(1);
    pageSize = 10;

    // Chat properties for guest view
    chatMessages = signal<ChatMessage[]>([]);
    currentMessage = '';

    // SignalR properties
    signalrConnected = signal(false);
    signalrSubscriptions: Subscription[] = [];
    webinarId = '1'; // Default webinar ID for the live session

    // Poll creation properties
    newPoll = {
        question: '',
        options: ['', ''],
        durationSeconds: 60
    };

    newWebinar: CreateWebinarRequest = {
        title: '',
        description: '',
        scheduledDateTime: '',
        durationMinutes: 90,
        thumbnailUrl: '',
        streamUrl: '',
        requiredSubscription: SubscriptionType.Free,
        price: 0
    };

    newUser: AdminCreateUserRequest = {
        name: '',
        mobile: '',
        email: '',
        city: '',
        state: '',
        country: '',
        userRoleType: UserRole.Guest,
        isActive: true
    };

    // Expose enums to template
    SubscriptionType = SubscriptionType;
    WebinarStatus = WebinarStatus;
    UserRole = UserRole;
    Math = Math;

    constructor(
        private userService: UserService,
        private router: Router,
        private signalrService: SignalrService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    async ngOnInit() {
          debugger;
        await this.loadDashboard();
      
        // Redirect guests to viewer page for better experience
        if (this.isGuest()) {
            console.log('👥 Guest user detected, redirecting to viewer page');
            this.router.navigate(['/dashboard']);
            this.initializeSignalR();

            return;
        }
    }

    async loadDashboard() {
        this.loading.set(true);
        this.error.set('');

        try {
            const userData = localStorage.getItem('liveWebinar-user');
            if (!userData) {
                console.log('No user data found, redirecting to login');
                this.router.navigate(['/login']);
                return;
            }

            const user = JSON.parse(userData);
            console.log('Loading dashboard for user:', user);

            // First check if backend is accessible
            try {
                const healthCheck = await fetch('http://localhost:5021/api/webinar/dashboard/' + user.userId, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });

                if (!healthCheck.ok) {
                    throw new Error(`Backend server error: ${healthCheck.status} ${healthCheck.statusText}`);
                }

                const dashboard = await healthCheck.json();
                console.log('Dashboard data received:', dashboard);
                this.dashboard.set(dashboard);
            } catch (fetchError: any) {
                // If fetch fails, try the UserService method as fallback
                console.log('Direct fetch failed, trying UserService:', fetchError.message);
                try {
                    const dashboard = await this.userService.getUserDashboard(user.userId);
                    this.dashboard.set(dashboard);
                } catch (serviceError: any) {
                    throw new Error('Both fetch and service failed: ' + serviceError.message);
                }
            }

        } catch (error: any) {
            console.error('Dashboard loading error:', error);

            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                this.error.set(`Unable to connect to server at http://localhost:5021. 
        \nPlease ensure:
        \n1. Backend server is running
        \n2. No firewall blocking port 5021
        \n3. CORS is properly configured
        \n\nDetailed error: ${error.message}`);
            } else if (error.name === 'TimeoutError') {
                this.error.set('Server response timeout. The backend may be starting up, please wait and try again.');
            } else {
                this.error.set(error.message || 'Failed to load dashboard');
            }
        } finally {
            this.loading.set(false);
        }
    }

    isHostOrAdmin(): boolean {
        const role = this.dashboard()?.user?.userRoleType;
        return role === UserRole.Host || role === UserRole.Admin;
    }

    getRoleClass(): string {
        const role = this.dashboard()?.user?.userRoleType;
        return role === UserRole.Admin ? 'admin' : role === UserRole.Host ? 'host' : 'guest';
    }

    getRoleText(): string {
        const role = this.dashboard()?.user?.userRoleType;
        return role === UserRole.Admin ? '👑 Admin' : role === UserRole.Host ? '🎤 Host' : '👥 Viewer';
    }

    getStatusClass(status: WebinarStatus): string {
        switch (status) {
            case WebinarStatus.Live: return 'live';
            case WebinarStatus.Completed: return 'completed';
            case WebinarStatus.Cancelled: return 'cancelled';
            default: return 'scheduled';
        }
    }

    getStatusText(status: WebinarStatus): string {
        switch (status) {
            case WebinarStatus.Live: return 'LIVE';
            case WebinarStatus.Completed: return 'Completed';
            case WebinarStatus.Cancelled: return 'Cancelled';
            default: return 'Scheduled';
        }
    }

    // Poll creation methods
    addOption() {
        if (this.newPoll.options.length < 5) {
            this.newPoll.options.push('');
        }
    }

    removeOption(index: number) {
        if (this.newPoll.options.length > 2) {
            this.newPoll.options.splice(index, 1);
        }
    }

    isPollFormValid(): boolean {
        return !!(this.newPoll.question.trim() &&
            this.newPoll.options.every(opt => opt.trim()) &&
            this.newPoll.options.length >= 2);
    }

    async createPoll() {
        if (!this.isPollFormValid()) {
            return;
        }

        try {
            // Get user data to verify role
            const currentUser = this.dashboard()?.user;
            if (!currentUser) {
                console.error('No user data available');
                return;
            }

            // Check if user is host or admin
            if (currentUser.userRoleType !== UserRole.Host && currentUser.userRoleType !== UserRole.Admin) {
                console.error('Only hosts and admins can create polls');
                return;
            }

            // Filter out empty options and trim
            const validOptions = this.newPoll.options
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0);

            // Call SignalR service to create poll
            if (this.signalrService && this.signalrService.connection && this.signalrService.connection.state === 'Connected') {
                await this.signalrService.connection.invoke('CreatePoll',
                    this.webinarId,
                    this.newPoll.question.trim(),
                    validOptions,
                    this.newPoll.durationSeconds
                );

                console.log('📊 Poll created successfully');

                // Reset form and close modal
                this.resetPollForm();
                this.showCreatePoll.set(false);

            } else {
                console.error('SignalR connection not available');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
        }
    }

    private resetPollForm() {
        this.newPoll = {
            question: '',
            options: ['', ''],
            durationSeconds: 60
        };
    }

    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString();
    }

    async createWebinar() {
        try {
            const userData = localStorage.getItem('liveWebinar-user');
            if (!userData) return;

            const user = JSON.parse(userData);
            await this.userService.createWebinar(this.newWebinar, user.userId);

            this.showCreateWebinar.set(false);
            this.resetNewWebinar();
            await this.loadDashboard();
        } catch (error: any) {
            alert('Failed to create webinar: ' + error.message);
        }
    }

    resetNewWebinar() {
        this.newWebinar = {
            title: '',
            description: '',
            scheduledDateTime: '',
            durationMinutes: 90,
            thumbnailUrl: '',
            streamUrl: '',
            requiredSubscription: SubscriptionType.Free,
            price: 0
        };
    }

    joinWebinar(webinarId: number) {
        this.router.navigate(['/viewer'], { queryParams: { webinarId } });
    }

    manageWebinar(webinarId: number) {
        // Navigate to webinar management page
        this.router.navigate(['/viewer'], { queryParams: { webinarId, mode: 'host' } });
    }

    async registerForWebinar(webinarId: number) {
        try {
            const userData = localStorage.getItem('liveWebinar-user');
            if (!userData) return;

            const user = JSON.parse(userData);
            await this.userService.registerForWebinar({
                webinarId,
                subscriptionType: SubscriptionType.Free,
                amountPaid: 0
            }, user.userId);

            await this.loadDashboard();
        } catch (error: any) {
            alert('Failed to register: ' + error.message);
        }
    }

    // User Management Methods
    isAdmin(): boolean {
        const role = this.dashboard()?.user?.userRoleType;
        return role === UserRole.Admin;
    }

    async showUsers() {
        if (!this.isAdmin()) {
            alert('Admin access required');
            return;
        }

        this.showUserManagement.set(true);
        await this.loadUsers();
    }

    async loadUsers() {
        if (!this.isAdmin()) return;

        this.usersLoading.set(true);
        this.usersError.set('');

        try {
            const response = await this.userService.getAllUsers(this.currentPage(), this.pageSize);
            this.users.set(response.users);
            this.totalUsers.set(response.totalCount);
        } catch (error: any) {
            this.usersError.set(error.message || 'Failed to load users');
        } finally {
            this.usersLoading.set(false);
        }
    }

    async createUser() {
        if (!this.isAdmin()) {
            alert('Admin access required');
            return;
        }

        if (!this.newUser.name || !this.newUser.mobile) {
            alert('Name and mobile are required');
            return;
        }

        try {
            await this.userService.createUser(this.newUser);
            this.showCreateUser.set(false);
            this.resetNewUser();
            await this.loadUsers();
            alert('User created successfully');
        } catch (error: any) {
            alert('Failed to create user: ' + error.message);
        }
    }

    editUser(user: AdminUserInfo) {
        this.editingUser.set({ ...user });
    }

    async updateUser() {
        const user = this.editingUser();
        if (!user || !this.isAdmin()) return;

        try {
            const updateData: AdminUpdateUserRequest = {
                id: user.id,
                name: user.name,
                email: user.email,
                city: user.city,
                state: user.state,
                country: user.country,
                userRoleType: user.userRoleType,
                isActive: user.isActive
            };

            await this.userService.updateUser(updateData);
            this.editingUser.set(null);
            await this.loadUsers();
            alert('User updated successfully');
        } catch (error: any) {
            alert('Failed to update user: ' + error.message);
        }
    }

    async deleteUser(userId: number) {
        if (!this.isAdmin()) {
            alert('Admin access required');
            return;
        }

        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            await this.userService.deleteUser(userId);
            await this.loadUsers();
            alert('User deleted successfully');
        } catch (error: any) {
            alert('Failed to delete user: ' + error.message);
        }
    }

    resetNewUser() {
        this.newUser = {
            name: '',
            mobile: '',
            email: '',
            city: '',
            state: '',
            country: '',
            userRoleType: UserRole.Guest,
            isActive: true
        };
    }

    cancelUserEdit() {
        this.editingUser.set(null);
    }

    getRoleOptions() {
        return [
            { value: UserRole.Guest, label: 'Guest' },
            { value: UserRole.Host, label: 'Host' },
            { value: UserRole.Admin, label: 'Admin' }
        ];
    }

    async nextPage() {
        if ((this.currentPage() * this.pageSize) < this.totalUsers()) {
            this.currentPage.set(this.currentPage() + 1);
            await this.loadUsers();
        }
    }

    async previousPage() {
        if (this.currentPage() > 1) {
            this.currentPage.set(this.currentPage() - 1);
            await this.loadUsers();
        }
    }

    logout() {
        localStorage.removeItem('liveWebinar-user');
        localStorage.removeItem('liveWebinar-token');
        this.router.navigate(['/login']);
    }

    // Guest role checking method
    isGuest(): boolean {
        const role = this.dashboard()?.user?.userRoleType;
        return role === UserRole.Guest;
    }

    // Lifecycle method
    ngOnDestroy() {
        this.signalrSubscriptions.forEach(sub => sub.unsubscribe());
        this.signalrService.disconnect();
    }

    // SignalR Methods
    initializeSignalR() {
        if (!isPlatformBrowser(this.platformId)) {
            console.log('⚠️ Skipping SignalR initialization - not in browser environment');
            return;
        }

        console.log('🔗 Initializing SignalR connection for chat...');

        // Start SignalR connection with user ID
        const userId = this.getUserId() || this.generateGuestUserId();
        this.signalrService.startConnection(this.webinarId, userId, 'guest');

        // Subscribe to chat messages
        const chatSub = this.signalrService.chatMessage$.subscribe((message: ChatMessage) => {
            console.log('💬 Received chat message via SignalR:', message);

            // Check for duplicate messages by ID
            const existingMessage = this.chatMessages().find(m => m.id === message.id);
            if (!existingMessage) {
                this.chatMessages.update(messages => [...messages, message]);
                // Auto-scroll to bottom when new message is received
                setTimeout(() => this.scrollToBottom(), 100);
            } else {
                console.log('⚠️ Duplicate message ignored:', message.id);
            }
        });

        this.signalrSubscriptions.push(chatSub);

        // Monitor connection status
        const statusSub = this.signalrService.connectionStatus$.subscribe(status => {
            console.log('🔗 SignalR connection status:', status);
            this.signalrConnected.set(status === 'Connected');
        });

        this.signalrSubscriptions.push(statusSub);
    }

    generateGuestUserId(): string {
        // Generate a unique guest user ID (use timestamp + random)
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${900000000 + random}`;
    }

    testSignalRConnection() {
        console.log('🔧 Testing SignalR connection...');
        console.log('🔗 Connection state:', this.signalrConnected());

        if (this.signalrConnected()) {
            const testMessage: ChatMessage = {
                id: Date.now().toString(),
                username: 'Test User',
                message: 'Test message from SignalR',
                timestamp: new Date(),
                userId: this.getUserId()
            };

            console.log('📤 Sending test message:', testMessage);
            this.signalrService.sendChatMessage(this.webinarId, testMessage);
        } else {
            console.warn('⚠️ SignalR not connected');
        }
    }

    // Get current user ID for chat
    getUserId(): string {
        const userId = this.dashboard()?.user?.userId?.toString();
        if (userId && userId.trim() !== '') {
            return userId;
        }
        // Generate numeric guest user ID for SignalR compatibility
        return this.generateGuestUserId();
    }

    // Chat functionality for guest view
    sendChatMessage() {
        if (!this.currentMessage.trim()) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            username: this.dashboard()?.user?.name || 'Anonymous',
            message: this.currentMessage.trim(),
            timestamp: new Date(),
            userId: this.getUserId()
        };

        // Send message via SignalR to sync with other users
        if (this.signalrConnected()) {
            console.log('💬 Sending chat message via SignalR:', newMessage);
            // Only send via SignalR - don't add locally (it will come back via SignalR)
            this.signalrService.sendChatMessage(this.webinarId, newMessage);
        } else {
            console.warn('⚠️ SignalR not connected, adding message locally only');
            // Add to local chat if SignalR is not connected
            this.chatMessages.update(messages => [...messages, newMessage]);
            this.scrollToBottom();
        }

        this.currentMessage = '';
        console.log('💬 Chat message processed:', newMessage);
    }

    // Auto-scroll to bottom of chat messages
    scrollToBottom() {
        if (!isPlatformBrowser(this.platformId)) return;

        try {
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (error) {
            console.log('⚠️ Could not scroll to bottom:', error);
        }
    }

    onChatKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendChatMessage();
        }
    }
}