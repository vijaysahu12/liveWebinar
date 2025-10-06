import { Component, OnInit, OnDestroy, signal, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { SignalrService } from '../services/signalr.service';
import { UserRole } from '../models/user.models';
import { Subscription } from 'rxjs';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  userId: string;
}

interface WebinarEvent {
  id: string;
  title: string;
  description: string;
  scheduledDateTime: string;
  duration: number;
  status: 'Scheduled' | 'Live' | 'Completed' | 'Cancelled';
  registeredCount: number;
  viewerCount: number;
  hostName: string;
  thumbnailUrl?: string;
}

interface AdminUser {
  userId: string;
  name: string;
  mobile: string;
  email: string;
  userRoleType: number;
  createdAt: string;
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
          <h1>🎥 Live Webinar Dashboard</h1>
          <div class="user-info">
            <span class="welcome">Welcome, {{ currentUser()?.name }}</span>
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
      } @else {
        <div class="dashboard-content">
          
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
                    <!-- User status indicator -->
                    <div class="user-status">
                      <span class="status-badge guest-badge">👤 Viewing as Guest</span>
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
                    <div class="chat-stats">
                      {{ chatMessages().length }} messages
                      @if (signalrConnected()) {
                        <span class="connection-status connected">🟢 Live</span>
                      } @else {
                        <span class="connection-status disconnected">🔴 Offline</span>
                      }
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
                    <button 
                      (click)="testSignalRConnection()" 
                      class="test-btn"
                      style="margin-left: 0.5rem; padding: 0.75rem; background: #8b5cf6; color: white; border: none; border-radius: 6px;">
                      Test SignalR
                    </button>
                  </div>
                </div>
              </div>
            </section>
          }

          <!-- Admin/Host View -->
          @if (isHostOrAdmin()) {
            <div class="admin-dashboard">
              
              <!-- Admin Stats Overview -->
              <section class="admin-stats-section">
                <h2>📊 Dashboard Overview</h2>
                <div class="stats-grid">
                  <div class="stat-card live">
                    <div class="stat-icon">🔴</div>
                    <div class="stat-content">
                      <h3>{{ liveStreamCount() }}</h3>
                      <p>Live Streams</p>
                    </div>
                  </div>
                  <div class="stat-card events">
                    <div class="stat-icon">�</div>
                    <div class="stat-content">
                      <h3>{{ totalEvents() }}</h3>
                      <p>Total Events</p>
                    </div>
                  </div>
                  <div class="stat-card users">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                      <h3>{{ totalUsers() }}</h3>
                      <p>Total Users</p>
                    </div>
                  </div>
                  <div class="stat-card viewers">
                    <div class="stat-icon">👁️</div>
                    <div class="stat-content">
                      <h3>{{ activeViewers() }}</h3>
                      <p>Active Viewers</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Admin Tabs -->
              <section class="admin-tabs-section">
                <div class="tab-navigation">
                  <button 
                    class="tab-btn" 
                    [class.active]="activeTab() === 'events'"
                    (click)="setActiveTab('events')">
                    📅 Events Management
                  </button>
                  <button 
                    class="tab-btn" 
                    [class.active]="activeTab() === 'users'"
                    (click)="setActiveTab('users')">
                    👥 User Management
                  </button>
                  <button 
                    class="tab-btn" 
                    [class.active]="activeTab() === 'live'"
                    (click)="setActiveTab('live')">
                    🔴 Live Control
                  </button>
                  <button 
                    class="tab-btn" 
                    [class.active]="activeTab() === 'analytics'"
                    (click)="setActiveTab('analytics')">
                    📈 Analytics
                  </button>
                </div>

                <!-- Events Management Tab -->
                @if (activeTab() === 'events') {
                  <div class="tab-content">
                    <div class="section-header">
                      <h3>📅 Events Management</h3>
                      <button class="create-btn" (click)="showCreateEvent.set(true)">
                        ➕ Create Event
                      </button>
                    </div>

                    <div class="events-grid">
                      @for (event of events(); track event.id) {
                        <div class="event-card" [class]="'status-' + event.status.toLowerCase()">
                          <div class="event-header">
                            <h4>{{ event.title }}</h4>
                            <span class="status-badge" [class]="'status-' + event.status.toLowerCase()">
                              {{ event.status }}
                            </span>
                          </div>
                          <div class="event-details">
                            <p>📅 {{ formatDateTime(event.scheduledDateTime) }}</p>
                            <p>⏱️ {{ event.duration }} minutes</p>
                            <p>👥 {{ event.registeredCount }} registered</p>
                            @if (event.status === 'Live') {
                              <p>👁️ {{ event.viewerCount }} watching</p>
                            }
                          </div>
                          <div class="event-actions">
                            @if (event.status === 'Scheduled') {
                              <button class="btn-primary" (click)="startLiveStream(event.id)">
                                🔴 Go Live
                              </button>
                            }
                            @if (event.status === 'Live') {
                              <button class="btn-danger" (click)="stopLiveStream(event.id)">
                                ⏹️ Stop Stream
                              </button>
                            }
                            <button class="btn-secondary" (click)="editEvent(event)">
                              ✏️ Edit
                            </button>
                            <button class="btn-danger" (click)="deleteEvent(event.id)">
                              �️ Delete
                            </button>
                          </div>
                        </div>
                      }
                    </div>

                    @if (events().length === 0) {
                      <div class="empty-state">
                        <p>No events created yet</p>
                        <button class="create-btn" (click)="showCreateEvent.set(true)">
                          🎬 Create Your First Event
                        </button>
                      </div>
                    }
                  </div>
                }

                <!-- User Management Tab -->
                @if (activeTab() === 'users') {
                  <div class="tab-content">
                    <div class="section-header">
                      <h3>👥 User Management</h3>
                      <button class="create-btn" (click)="showCreateUser.set(true)">
                        ➕ Add User
                      </button>
                    </div>

                    <div class="users-table-container">
                      <table class="users-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (user of adminUsers(); track user.userId) {
                            <tr>
                              <td>{{ user.name }}</td>
                              <td>{{ user.mobile }}</td>
                              <td>{{ user.email || 'N/A' }}</td>
                              <td>
                                <span class="role-badge" [class]="'role-' + user.userRoleType">
                                  {{ getRoleText(user.userRoleType) }}
                                </span>
                              </td>
                              <td>{{ formatDate(user.createdAt) }}</td>
                              <td>
                                <button class="btn-small" (click)="editUser(user)">✏️</button>
                                <button class="btn-small btn-danger" (click)="deleteUser(user.userId)">🗑️</button>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>

                      @if (adminUsers().length === 0) {
                        <div class="empty-state">
                          <p>No users found</p>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Live Control Tab -->
                @if (activeTab() === 'live') {
                  <div class="tab-content">
                    <h3>🔴 Live Streaming Control</h3>
                    
                    <div class="live-control-panel">
                      <div class="current-stream">
                        <h4>Current Live Stream</h4>
                        @if (currentLiveEvent()) {
                          <div class="live-event-info">
                            <h5>{{ currentLiveEvent()?.title }}</h5>
                            <p>👁️ {{ currentLiveEvent()?.viewerCount }} viewers watching</p>
                            <p>🕐 Started: {{ formatDateTime(currentLiveEvent()?.scheduledDateTime || '') }}</p>
                            
                            <div class="live-controls">
                              <button class="btn-danger" (click)="stopCurrentStream()">
                                ⏹️ Stop Stream
                              </button>
                              <button class="btn-secondary" (click)="refreshViewers()">
                                🔄 Refresh Viewers
                              </button>
                            </div>
                          </div>
                        } @else {
                          <div class="no-live-stream">
                            <p>No live stream currently active</p>
                            <p>Select an event from Events Management to start streaming</p>
                          </div>
                        }
                      </div>

                      <!-- Live Stream Preview (if available) -->
                      @if (currentLiveEvent()) {
                        <div class="stream-preview">
                          <h4>🎥 Live Stream Preview</h4>
                          <div class="preview-area">
                            <iframe 
                              src="https://www.youtube.com/embed/2kT42dG4xpg?si=pp0ho09c9_h4hnGj"
                              title="Live Stream Preview" 
                              frameborder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              referrerpolicy="strict-origin-when-cross-origin" 
                              allowfullscreen>
                            </iframe>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Analytics Tab -->
                @if (activeTab() === 'analytics') {
                  <div class="tab-content">
                    <h3>📈 Analytics & Reports</h3>
                    
                    <div class="analytics-grid">
                      <div class="analytics-card">
                        <h4>📊 Event Statistics</h4>
                        <div class="metric">
                          <span class="label">Total Events:</span>
                          <span class="value">{{ events().length }}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Live Events:</span>
                          <span class="value">{{ getLiveEventsCount() }}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Completed Events:</span>
                          <span class="value">{{ getCompletedEventsCount() }}</span>
                        </div>
                      </div>

                      <div class="analytics-card">
                        <h4>👥 User Analytics</h4>
                        <div class="metric">
                          <span class="label">Total Users:</span>
                          <span class="value">{{ adminUsers().length }}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Admin Users:</span>
                          <span class="value">{{ getAdminUsersCount() }}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Guest Users:</span>
                          <span class="value">{{ getGuestUsersCount() }}</span>
                        </div>
                      </div>

                      <div class="analytics-card">
                        <h4>📺 Viewing Statistics</h4>
                        <div class="metric">
                          <span class="label">Current Viewers:</span>
                          <span class="value">{{ activeViewers() }}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Peak Viewers Today:</span>
                          <span class="value">{{ peakViewers() }}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Total Views:</span>
                          <span class="value">{{ totalViews() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </section>
            </div>
          }

        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
    }

    .dashboard-header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dashboard-header h1 {
      margin: 0;
      color: #2d3748;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .welcome {
      color: #4a5568;
      font-weight: 500;
    }

    .role-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .role-badge.guest {
      background: #e6fffa;
      color: #234e52;
      border: 1px solid #81e6d9;
    }

    .role-badge.admin {
      background: #fed7d7;
      color: #822727;
      border: 1px solid #fc8181;
    }

    .role-badge.host {
      background: #e6fffa;
      color: #234e52;
      border: 1px solid #4fd1c7;
    }

    .logout-btn {
      padding: 0.5rem 1rem;
      background: #e53e3e;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .logout-btn:hover {
      background: #c53030;
    }

    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
      color: white;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Guest View Styles */
    .guest-section {
      margin-top: 1rem;
    }

    .video-chat-container {
      display: flex;
      gap: 1.5rem;
      height: 600px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .video-section {
      flex: 7;
      display: flex;
      flex-direction: column;
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

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      backdrop-filter: blur(10px);
    }

    .guest-badge {
      background: rgba(34, 197, 94, 0.9);
      color: white;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .video-area {
      flex: 1;
      position: relative;
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
    }

    .chat-header {
      padding: 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-header h3 {
      margin: 0;
      color: #374151;
      font-size: 1.1rem;
    }

    .chat-stats {
      font-size: 0.875rem;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .connection-status {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 10px;
    }

    .connection-status.connected {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
    }

    .connection-status.disconnected {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }

    .chat-messages {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
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

    /* Admin Section */
    .admin-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-top: 1rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .admin-section h2 {
      margin: 0 0 1.5rem 0;
      color: #2d3748;
    }

    .admin-stats {
      margin-bottom: 2rem;
    }

    .stat-card {
      background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
      max-width: 300px;
    }

    .stat-icon {
      font-size: 2rem;
    }

    .stat-content h3 {
      margin: 0;
      font-size: 1.25rem;
    }

    .stat-content p {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
    }

    /* Admin Dashboard Styles */
    .admin-dashboard {
      margin-top: 1rem;
    }

    .admin-stats-section {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .admin-stats-section h2 {
      margin: 0 0 1.5rem 0;
      color: #2d3748;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-card.live {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    }

    .stat-card.events {
      background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
    }

    .stat-card.users {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.viewers {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .stat-icon {
      font-size: 2rem;
    }

    .stat-content h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .stat-content p {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
    }

    /* Admin Tabs */
    .admin-tabs-section {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .tab-navigation {
      display: flex;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
    }

    .tab-btn {
      flex: 1;
      padding: 1rem 1.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      font-weight: 500;
      color: #6b7280;
      transition: all 0.2s;
      border-bottom: 3px solid transparent;
    }

    .tab-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .tab-btn.active {
      background: white;
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }

    .tab-content {
      padding: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .section-header h3 {
      margin: 0;
      color: #2d3748;
    }

    .create-btn {
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .create-btn:hover {
      background: #2563eb;
    }

    /* Events Grid */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .event-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    .event-card.status-live {
      border-left: 4px solid #ff4444;
    }

    .event-card.status-scheduled {
      border-left: 4px solid #3b82f6;
    }

    .event-card.status-completed {
      border-left: 4px solid #10b981;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .event-header h4 {
      margin: 0;
      color: #2d3748;
      font-size: 1.1rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.status-live {
      background: #fee2e2;
      color: #dc2626;
    }

    .status-badge.status-scheduled {
      background: #dbeafe;
      color: #2563eb;
    }

    .status-badge.status-completed {
      background: #d1fae5;
      color: #059669;
    }

    .event-details {
      margin-bottom: 1.5rem;
    }

    .event-details p {
      margin: 0.5rem 0;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .event-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary, .btn-danger, .btn-small {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-small {
      padding: 0.25rem 0.5rem;
      background: #f3f4f6;
      color: #374151;
    }

    .btn-small:hover {
      background: #e5e7eb;
    }

    .btn-small.btn-danger {
      background: #fee2e2;
      color: #dc2626;
    }

    .btn-small.btn-danger:hover {
      background: #fecaca;
    }

    /* Users Table */
    .users-table-container {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .users-table th,
    .users-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    .users-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #374151;
    }

    .users-table tr:hover {
      background: #f9fafb;
    }

    .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge.role-0 {
      background: #e6fffa;
      color: #234e52;
    }

    .role-badge.role-1 {
      background: #fed7d7;
      color: #822727;
    }

    .role-badge.role-2 {
      background: #e6fffa;
      color: #234e52;
    }

    /* Live Control Panel */
    .live-control-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .current-stream {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .current-stream h4 {
      margin: 0 0 1rem 0;
      color: #2d3748;
    }

    .live-event-info h5 {
      margin: 0 0 0.5rem 0;
      color: #2d3748;
      font-size: 1.1rem;
    }

    .live-event-info p {
      margin: 0.5rem 0;
      color: #6b7280;
    }

    .live-controls {
      margin-top: 1rem;
      display: flex;
      gap: 0.75rem;
    }

    .no-live-stream {
      text-align: center;
      color: #6b7280;
      padding: 2rem;
    }

    .stream-preview {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .stream-preview h4 {
      margin: 0 0 1rem 0;
      color: #2d3748;
    }

    .preview-area {
      position: relative;
      height: 200px;
      border-radius: 8px;
      overflow: hidden;
    }

    .preview-area iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Analytics */
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .analytics-card {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .analytics-card h4 {
      margin: 0 0 1rem 0;
      color: #2d3748;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .metric:last-child {
      border-bottom: none;
    }

    .metric .label {
      color: #6b7280;
      font-weight: 500;
    }

    .metric .value {
      color: #2d3748;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      color: #6b7280;
    }

    .empty-state p {
      margin-bottom: 1rem;
    }

    /* Responsive Design for Admin */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }

      .events-grid {
        grid-template-columns: 1fr;
      }

      .live-control-panel {
        grid-template-columns: 1fr;
      }

      .analytics-grid {
        grid-template-columns: 1fr;
      }

      .tab-navigation {
        flex-wrap: wrap;
      }

      .tab-btn {
        flex: 1 1 50%;
      }
    }

    @media (max-width: 768px) {
      .event-actions {
        flex-direction: column;
      }

      .users-table-container {
        font-size: 0.875rem;
      }

      .users-table th,
      .users-table td {
        padding: 0.75rem 0.5rem;
      }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .video-chat-container {
        flex-direction: column;
        height: auto;
      }

      .video-section {
        flex: none;
        height: 300px;
      }

      .chat-section {
        flex: none;
        height: 400px;
        border-left: none;
        border-top: 1px solid #e5e7eb;
      }

      .header-content {
        padding: 0 1rem;
      }

      .dashboard-content {
        padding: 1rem;
      }
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
      }

      .user-info {
        flex-wrap: wrap;
        justify-content: center;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = signal(true);
  currentUser = signal<any>(null);
  chatMessages = signal<ChatMessage[]>([]);
  currentMessage = '';
  
  // SignalR subscription
  private chatSubscription?: Subscription;
  signalrConnected = signal(false);
  private readonly webinarId = '1'; // Default webinar ID

  // Admin Dashboard Properties
  activeTab = signal<'events' | 'users' | 'live' | 'analytics'>('events');
  events = signal<WebinarEvent[]>([]);
  adminUsers = signal<AdminUser[]>([]);
  showCreateEvent = signal(false);
  showCreateUser = signal(false);
  currentLiveEvent = signal<WebinarEvent | null>(null);
  
  // Statistics
  liveStreamCount = signal(1);
  totalEvents = signal(5);
  totalUsers = signal(25);
  activeViewers = signal(12);
  peakViewers = signal(45);
  totalViews = signal(1250);

  constructor(
    private userService: UserService,
    private router: Router,
    private signalrService: SignalrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    console.log('🚀 Dashboard component initializing...');
    this.loadUserData();
    this.initializeSampleChat();
    this.initializeSampleEvents();
    this.initializeSampleUsers();
    
    // Delay SignalR initialization to allow user data to load
    setTimeout(() => {
      console.log('🚀 Delayed SignalR initialization...');
      this.initializeSignalR();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
    this.signalrService.disconnect();
  }

  initializeSignalR() {
    // Only initialize SignalR in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      console.log('🔗 Skipping SignalR initialization during SSR');
      return;
    }

    const userId = this.getUserId();
    const role = this.isHostOrAdmin() ? 'host' : 'viewer';
    
    console.log('🔗 SignalR init check - userId:', userId, 'type:', typeof userId);
    
    // Don't start SignalR if we don't have a valid numeric user ID
    if (!userId || userId === '' || isNaN(Number(userId))) {
      console.log('🔗 No valid numeric user ID, creating guest user...');
      
      // For guests without login, we need to create a temporary user ID
      // Backend expects numeric userIds, so let's use a high number for guests
      const guestUserId = (900000000 + Math.floor(Math.random() * 99999999)).toString();
      console.log('🔗 Using guest user ID:', guestUserId);
      this.startSignalRConnection(guestUserId, role);
      return;
    }
    
    console.log('🔗 Using logged-in user ID:', userId);
    this.startSignalRConnection(userId, role);
  }

  private startSignalRConnection(userId: string, role: string) {
    console.log('🔗 Initializing SignalR connection...', { webinarId: this.webinarId, userId, role });
    
    // Start SignalR connection
    this.signalrService.startConnection(this.webinarId, userId, role);
    
    // Subscribe to incoming chat messages
    this.chatSubscription = this.signalrService.chatMessage$.subscribe((chatData: any) => {
      console.log('💬 Received chat message:', chatData);
      
      // Add received message to local chat
      const receivedMessage: ChatMessage = {
        id: chatData.id || Date.now().toString(),
        username: chatData.username || 'Unknown User',
        message: chatData.message || chatData.text || JSON.stringify(chatData),
        timestamp: new Date(chatData.timestamp || Date.now()),
        userId: chatData.userId || 'unknown'
      };
      
      // Check for duplicate messages by ID
      const existingMessage = this.chatMessages().find(m => m.id === receivedMessage.id);
      if (!existingMessage) {
        this.chatMessages.update(messages => [...messages, receivedMessage]);
        // Auto-scroll to bottom when new message is received
        setTimeout(() => this.scrollToBottom(), 100);
      } else {
        console.log('⚠️ Duplicate message ignored:', receivedMessage.id);
      }
    });
    
    // Monitor SignalR connection status
    this.signalrService.connectionStatus$.subscribe(status => {
      console.log('🔗 SignalR status:', status);
      this.signalrConnected.set(status === 'Connected');
    });
  }

  loadUserData() {
    console.log('👤 loadUserData called');
    try {
      // Check if we're in a browser environment
      if (typeof localStorage !== 'undefined') {
        const userData = localStorage.getItem('liveWebinar-user');
        console.log('👤 Raw localStorage data:', userData);
        if (userData) {
          const user = JSON.parse(userData);
          console.log('👤 Parsed user data:', user);
          console.log('👤 User role type:', user.userRoleType);
          console.log('👤 Is guest?', user.userRoleType === 0 || user.userRoleType === UserRole.Guest);
          console.log('👤 Is host/admin?', user.userRoleType === 1 || user.userRoleType === 2);
          this.currentUser.set(user);
        } else {
          console.log('👤 No user data found in localStorage');
        }
      } else {
        console.log('👤 localStorage not available (SSR)');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.loading.set(false);
      console.log('👤 loadUserData completed, loading set to false');
    }
  }

  initializeSampleChat() {
    const sampleMessages: ChatMessage[] = [
      {
        id: '1',
        username: 'TradingPro',
        message: 'Great session! Looking forward to the algo strategies.',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        userId: 'user1'
      },
      {
        id: '2',
        username: 'CryptoMaster',
        message: 'Can you share the backtesting results?',
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
        userId: 'user2'
      }
    ];
    this.chatMessages.set(sampleMessages);
  }

  isGuest(): boolean {
    const role = this.currentUser()?.userRoleType;
    // Show guest view by default if role is undefined/null, or if role is explicitly 0 (Guest)
    const isGuest = role === undefined || role === null || role === UserRole.Guest || role === 0;
    console.log('🔍 isGuest check - role:', role, 'UserRole.Guest:', UserRole.Guest, 'isGuest:', isGuest);
    return isGuest;
  }

  isHostOrAdmin(): boolean {
    const role = this.currentUser()?.userRoleType;
    // Only show admin view if role is explicitly 1 (Admin) or 2 (Host)
    const isHostOrAdmin = role === UserRole.Host || role === UserRole.Admin || role === 1 || role === 2;
    console.log('🔍 isHostOrAdmin check - role:', role, 'isHostOrAdmin:', isHostOrAdmin);
    return isHostOrAdmin;
  }

  getRoleClass(): string {
    const role = this.currentUser()?.userRoleType;
    return role === 1 ? 'admin' : role === 2 ? 'host' : 'guest';
  }

  getUserId(): string {
    return this.currentUser()?.userId?.toString() || '';
  }

  sendChatMessage() {
    if (!this.currentMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      username: this.currentUser()?.name || 'Anonymous',
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

  onChatKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
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

  testSignalRConnection() {
    console.log('🧪 Testing SignalR connection...');
    console.log('🧪 SignalR connected:', this.signalrConnected());
    console.log('🧪 Current user:', this.currentUser());
    console.log('🧪 User ID:', this.getUserId());
    
    // Send a test message via SignalR
    if (this.signalrConnected()) {
      const testMessage = {
        id: Date.now().toString(),
        username: 'Test User',
        message: '🧪 Test message sent at ' + new Date().toLocaleTimeString(),
        timestamp: new Date(),
        userId: this.getUserId() || 'test-user'
      };
      
      console.log('🧪 Sending test message:', testMessage);
      this.signalrService.sendChatMessage(this.webinarId, testMessage);
    } else {
      console.log('🧪 SignalR not connected, trying to reconnect...');
      // Try to reinitialize SignalR
      if (isPlatformBrowser(this.platformId)) {
        const userId = this.getUserId() || (900000000 + Math.floor(Math.random() * 99999999)).toString();
        const role = this.isHostOrAdmin() ? 'host' : 'viewer';
        console.log('🧪 Reinitializing SignalR with:', { userId, role });
        this.startSignalRConnection(userId, role);
      }
    }
  }

  logout() {
    localStorage.removeItem('liveWebinar-user');
    localStorage.removeItem('liveWebinar-token');
    this.router.navigate(['/login']);
  }

  // Initialize sample data and admin methods
  initializeSampleEvents() {
    const sampleEvents: WebinarEvent[] = [
      {
        id: '1',
        title: 'Algo Trading Setup for Crypto',
        description: 'Learn advanced cryptocurrency trading algorithms',
        scheduledDateTime: '2025-10-05T19:00:00',
        duration: 90,
        status: 'Live',
        registeredCount: 156,
        viewerCount: 89,
        hostName: 'Trading Expert',
        thumbnailUrl: ''
      },
      {
        id: '2',
        title: 'DeFi Investment Strategies',
        description: 'Explore decentralized finance opportunities',
        scheduledDateTime: '2025-10-07T18:00:00',
        duration: 60,
        status: 'Scheduled',
        registeredCount: 203,
        viewerCount: 0,
        hostName: 'DeFi Master',
        thumbnailUrl: ''
      },
      {
        id: '3',
        title: 'Technical Analysis Masterclass',
        description: 'Advanced chart patterns and indicators',
        scheduledDateTime: '2025-10-03T16:00:00',
        duration: 120,
        status: 'Completed',
        registeredCount: 341,
        viewerCount: 0,
        hostName: 'Chart Guru',
        thumbnailUrl: ''
      }
    ];
    
    this.events.set(sampleEvents);
    this.currentLiveEvent.set(sampleEvents.find(e => e.status === 'Live') || null);
  }

  initializeSampleUsers() {
    const sampleUsers: AdminUser[] = [
      {
        userId: '1',
        name: 'John Admin',
        mobile: '9876543210',
        email: 'john@example.com',
        userRoleType: 1, // Admin
        createdAt: '2025-09-15T10:00:00'
      },
      {
        userId: '2',
        name: 'Sarah Host',
        mobile: '9876543211',
        email: 'sarah@example.com',
        userRoleType: 2, // Host
        createdAt: '2025-09-20T14:30:00'
      },
      {
        userId: '3',
        name: 'Mike Viewer',
        mobile: '9876543212',
        email: 'mike@example.com',
        userRoleType: 0, // Guest
        createdAt: '2025-10-01T09:15:00'
      }
    ];
    
    this.adminUsers.set(sampleUsers);
  }

  // Tab Management
  setActiveTab(tab: 'events' | 'users' | 'live' | 'analytics') {
    this.activeTab.set(tab);
  }

  // Event Management Methods
  startLiveStream(eventId: string) {
    const events = this.events();
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
      events[eventIndex].status = 'Live';
      events[eventIndex].viewerCount = Math.floor(Math.random() * 100) + 10;
      this.events.set([...events]);
      this.currentLiveEvent.set(events[eventIndex]);
      console.log('🔴 Started live stream for:', events[eventIndex].title);
    }
  }

  stopLiveStream(eventId: string) {
    const events = this.events();
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
      events[eventIndex].status = 'Completed';
      events[eventIndex].viewerCount = 0;
      this.events.set([...events]);
      this.currentLiveEvent.set(null);
      console.log('⏹️ Stopped live stream for:', events[eventIndex].title);
    }
  }

  stopCurrentStream() {
    const currentEvent = this.currentLiveEvent();
    if (currentEvent) {
      this.stopLiveStream(currentEvent.id);
    }
  }

  refreshViewers() {
    const currentEvent = this.currentLiveEvent();
    if (currentEvent) {
      const newViewerCount = Math.floor(Math.random() * 150) + 50;
      const events = this.events();
      const eventIndex = events.findIndex(e => e.id === currentEvent.id);
      if (eventIndex !== -1) {
        events[eventIndex].viewerCount = newViewerCount;
        this.events.set([...events]);
        this.currentLiveEvent.set(events[eventIndex]);
        this.activeViewers.set(newViewerCount);
      }
    }
  }

  editEvent(event: WebinarEvent) {
    console.log('✏️ Edit event:', event.title);
    // In a real app, this would open an edit modal
    alert(`Edit event: ${event.title}`);
  }

  deleteEvent(eventId: string) {
    if (confirm('Are you sure you want to delete this event?')) {
      const events = this.events().filter(e => e.id !== eventId);
      this.events.set(events);
      console.log('🗑️ Deleted event:', eventId);
    }
  }

  // User Management Methods
  editUser(user: AdminUser) {
    console.log('✏️ Edit user:', user.name);
    // In a real app, this would open an edit modal
    alert(`Edit user: ${user.name}`);
  }

  deleteUser(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      const users = this.adminUsers().filter(u => u.userId !== userId);
      this.adminUsers.set(users);
      console.log('🗑️ Deleted user:', userId);
    }
  }

  // Utility Methods
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getRoleText(roleType?: number): string {
    if (roleType === undefined) {
      const role = this.currentUser()?.userRoleType;
      return role === 1 ? '👑 Admin' : role === 2 ? '🎤 Host' : '👥 Viewer';
    }
    return roleType === 1 ? 'Admin' : roleType === 2 ? 'Host' : 'Guest';
  }

  // Analytics Methods
  getLiveEventsCount(): number {
    return this.events().filter(e => e.status === 'Live').length;
  }

  getCompletedEventsCount(): number {
    return this.events().filter(e => e.status === 'Completed').length;
  }

  getAdminUsersCount(): number {
    return this.adminUsers().filter(u => u.userRoleType === 1).length;
  }

  getGuestUsersCount(): number {
    return this.adminUsers().filter(u => u.userRoleType === 0).length;
  }
}