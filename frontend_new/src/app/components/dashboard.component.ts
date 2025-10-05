import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { 
  DashboardResponse, 
  WebinarScheduleDto, 
  UserRole, 
  WebinarStatus, 
  SubscriptionType,
  CreateWebinarRequest 
} from '../models/user.models';

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
        <div class="dashboard-content">
          
          <!-- Stats Cards -->
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

          <!-- Host Controls -->
          @if (isHostOrAdmin()) {
            <section class="section">
              <div class="section-header">
                <h2>🎤 Host Controls</h2>
                <button class="create-btn" (click)="showCreateWebinar.set(true)">
                  ➕ Create Webinar
                </button>
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
  `,
  styles: [`
    /* Dashboard Container */
    .dashboard-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
  `]
})
export class DashboardComponent implements OnInit {
  dashboard = signal<DashboardResponse | null>(null);
  loading = signal(true);
  error = signal('');
  showCreateWebinar = signal(false);
  
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

  // Expose enums to template
  SubscriptionType = SubscriptionType;
  WebinarStatus = WebinarStatus;
  UserRole = UserRole;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
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
    const role = this.dashboard()?.user?.role;
    return role === UserRole.Host || role === UserRole.Admin;
  }

  getRoleClass(): string {
    const role = this.dashboard()?.user?.role;
    return role === UserRole.Admin ? 'admin' : role === UserRole.Host ? 'host' : 'guest';
  }

  getRoleText(): string {
    const role = this.dashboard()?.user?.role;
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

  logout() {
    localStorage.removeItem('liveWebinar-user');
    localStorage.removeItem('liveWebinar-token');
    this.router.navigate(['/login']);
  }
}