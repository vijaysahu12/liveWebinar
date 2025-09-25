import { ChangeDetectionStrategy, Component, effect, OnInit, signal, Inject, PLATFORM_ID } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SignalrService } from '../services/signalr.service';

interface EventConfig {
    title: string;
    startISO: string;
    durationMinutes: number;
    type: string;
}

interface Poll {
    id: string;
    type: string;
    question: string;
    options: string[];
    duration: number;
}
@Component({
    selector: 'app-viewer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './viewer.component.html',
    styleUrls: ['./viewer.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewerComponent implements OnInit {
    showChat = signal(false);
    hostPanelMinimized = signal(false);
    viewerCount = signal(0);
    liveTimer = signal(new Date(0));
    participants = signal(0);
    hostBroadcastStatus = signal('Live');
    streamStatus = signal('● LIVE');
    connectionStatus = signal('Connecting...');

    viewers = 0;
    overlays: any[] = [];
    private webinarId = '1'; // Changed from 'webinar-1' to '1' to match backend int parsing
    private userId = '';

    constructor(private sr: SignalrService, @Inject(PLATFORM_ID) private platformId: Object) {
        // Initialize userId - will be set properly in ngOnInit when platform is available
        this.userId = '';
        
        effect(() => {
            // This effect can be used to react to changes in signals
            console.log('Viewer count changed to:', this.viewerCount());
            console.log('Total participants:', this.participants());
        });

        // Timer for live duration
        setInterval(() => {
            this.liveTimer.update(t => {
                t.setSeconds(t.getSeconds() + 1);
                return t;
            });
        }, 1000);
    }
    ngOnInit(): void {
        // Only access localStorage in the browser (not during SSR)
        if (isPlatformBrowser(this.platformId)) {
            // Get authenticated user data from localStorage
            const userData = localStorage.getItem('liveWebinar-user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    this.userId = user.userId.toString();
                    console.log('🆔 Using authenticated userId:', this.userId, 'for user:', user.name, '(' + user.mobile + ')');
                } catch (error) {
                    console.error('❌ Error parsing user data:', error);
                    // Fallback - should not happen if login flow works correctly
                    this.userId = 'viewer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                }
            } else {
                console.warn('⚠️ No authenticated user found - this should not happen');
                // Fallback - should not happen if login flow works correctly
                this.userId = 'viewer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            }
        } else {
            // Fallback for SSR - generate temporary ID
            this.userId = 'viewer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            console.log('🆔 Using temporary userId for SSR:', this.userId);
        }
        
        console.log('🚀 Starting viewer component with:', {
            webinarId: this.webinarId,
            userId: this.userId
        });
        
        // Start SignalR connection with unique user ID
        this.sr.startConnection(this.webinarId, this.userId, 'viewer');
        
        // Subscribe to viewer count updates from SignalR
        this.sr.counts$.subscribe(counts => {
            console.log('📊 Received count update:', counts);
            this.viewerCount.set(counts.viewers);
            this.participants.set(counts.participants);
            console.log(`Real-time update: ${counts.viewers} viewers, ${counts.participants} total`);
        });
        
        // Subscribe to connection status updates
        this.sr.connectionStatus$.subscribe(status => {
            this.connectionStatus.set(status);
            
            // Log connection status to console, but don't show errors to user
            if (status === 'Offline') {
                console.warn('⚠️ Connection status: Server is offline - running in offline mode');
                console.log('� UI will continue to display normally without live data updates');
            } else if (status === 'Connected') {
                console.log('✅ Connection status: Connected to server');
            } else if (status === 'Reconnecting...') {
                console.log('🔄 Connection status: Attempting to reconnect to server...');
            } else {
                console.log('�🔗 Connection status:', status);
            }
        });
        
        // Subscribe to overlay updates (polls, messages, etc.)
        this.sr.overlay$.subscribe(overlay => {
            console.log('📺 Received overlay:', overlay);
            this.overlays.push(overlay);
            setTimeout(() => this.overlays.shift(), (overlay.duration || 10) * 1000);
        });
        
        // Subscribe to general messages
        this.sr.messages$.subscribe(message => {
            console.log('💬 SignalR message:', message);
        });
        
        // Subscribe to force disconnect events
        this.sr.forceDisconnect$.subscribe(data => {
            console.log('⚠️ Force disconnect received:', data);
            this.handleForceDisconnect(data);
        });
        
        this.showChat.set(true);
        
        // Ping every 30 seconds to keep connection alive (only if connected)
        setInterval(() => {
            if (this.connectionStatus() === 'Connected') {
                console.log('🏓 Sending ping...');
                this.sr.ping();
            } else {
                console.log('🏓 Ping skipped - server offline or disconnected');
            }
        }, 30000);

        // Debug: Log current viewer count every 5 seconds
        setInterval(() => {
            console.log('🔍 Current viewer count signal value:', this.viewerCount());
        }, 5000);
    }

    toggleChat() {
        this.showChat.update(val => !val);
    }

    toggleHostPanel() {
        this.hostPanelMinimized.update(val => !val);
    }

    // Manual viewer count methods (for demo purposes)
    incrementViewerCount() {
        if (this.connectionStatus() === 'Connected') {
            // Request updated viewer count from server
            this.sr.getViewerCount(this.webinarId);
        } else {
            console.log('📊 Cannot increment viewer count - server offline');
        }
    }

    resetViewerCount() {
        // This would be a server operation in production
        console.log('Reset viewer count (demo only)');
    }
    
    // Method to manually refresh viewer count
    refreshViewerCount() {
        if (this.connectionStatus() === 'Connected') {
            this.sr.getViewerCount(this.webinarId);
        } else {
            console.log('📊 Cannot refresh viewer count - server offline');
        }
    }
    
    // Method to disconnect from SignalR
    disconnect() {
        this.sr.disconnect();
    }
    
    // Method to clear stored user ID (for testing purposes)
    clearUserId() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('liveWebinar-userId');
            console.log('🗑️ Cleared stored user ID. Refresh page to get new ID.');
        }
    }
    
    // Handle force disconnect from another session
    private handleForceDisconnect(data: any) {
        console.warn('🔒 Session disconnected - another login detected from:', data.newLocation);
        
        // Log detailed information for debugging
        console.log('ForceDisconnect data received:', data);
        
        if (isPlatformBrowser(this.platformId)) {
            // Show user-friendly message only if we have valid data
            if (data && data.newLocation) {
                const message = `Your session has been disconnected because you logged in from another location (${data.newLocation}). This connection will now be closed.`;
                alert(message);
            } else {
                // Generic message if data is incomplete
                alert('Your session has been disconnected due to another login. This connection will now be closed.');
            }
            
            // Clear session data to prevent auto-reconnect
            localStorage.removeItem('liveWebinar-user');
            
            // Redirect to login or reload page
            window.location.reload();
        }
        
        // Disconnect from SignalR to prevent reconnection attempts
        this.sr.disconnect();
    }
    
    // Method to get current user ID
    getCurrentUserId(): string {
        return this.userId;
    }
    
    // Method to test offline mode (for development/testing)
    testOfflineMode() {
        console.log('🧪 Testing offline mode...');
        this.sr.disconnect();
        this.connectionStatus.set('Offline');
        this.viewerCount.set(0);
        this.participants.set(0);
        console.log('📱 UI should now display in offline mode with no error messages to user');
    }
}