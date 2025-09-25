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

interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: Date;
    userId: string;
}

interface PollOption {
    id: string;
    text: string;
    votes: number;
    percentage: number;
}

interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    duration: number; // in seconds, 0 = no timeout
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    totalVotes: number;
    allowMultiple: boolean;
}

interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    duration: number; // in seconds, 0 = no timeout
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    totalVotes: number;
    allowMultiple: boolean;
}

interface QuickMessage {
    id: string;
    message: string;
    timestamp: Date;
    duration: number; // in seconds
    type: 'info' | 'warning' | 'success' | 'announcement';
}

interface QRCode {
    id: string;
    type: 'app_download' | 'payment' | 'external_link' | 'file_download';
    title: string;
    description: string;
    qrData: string; // URL or data to encode
    displayDuration: number; // in seconds
    timestamp: Date;
}

interface FileShare {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    description: string;
    downloadCount: number;
    timestamp: Date;
}

interface LikeRequest {
    id: string;
    message: string;
    isForced: boolean; // true if users must click to continue
    duration: number;
    targetLikes: number;
    currentLikes: number;
    timestamp: Date;
}

interface QuestionAnswer {
    id: string;
    question: string;
    type: 'multiple_choice' | 'single_choice' | 'text_input';
    options?: string[];
    correctAnswer?: string | string[];
    timeLimit: number; // in seconds
    isActive: boolean;
    responses: { userId: string; answer: string | string[]; timestamp: Date }[];
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
    showChat = signal(true); // Changed to true by default for new layout
    hostPanelMinimized = signal(false);
    viewerCount = signal(0);
    liveTimer = signal(new Date(0));
    participants = signal(0);
    hostBroadcastStatus = signal('Live');
    streamStatus = signal('● LIVE');
    connectionStatus = signal('Connecting...');
    
    // Chat-related properties
    chatMessages = signal<ChatMessage[]>([]);
    currentMessage = signal('');
    chatInputDisabled = signal(false);
    
    // Modal control properties
    showPollModal = signal(false);
    showAnnouncementModal = signal(false);
    showQAModal = signal(false);

    viewers = 0;
    overlays: any[] = [];
    private webinarId = '1'; // Changed from 'webinar-1' to '1' to match backend int parsing
    public userId = ''; // Made public for template access
    private username = ''; // Store username for chat

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
                    this.username = user.name; // Store username for chat
                    console.log('🆔 Using authenticated userId:', this.userId, 'for user:', user.name, '(' + user.mobile + ')');
                } catch (error) {
                    console.error('❌ Error parsing user data:', error);
                    // Fallback - should not happen if login flow works correctly
                    this.userId = 'viewer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                    this.username = 'Anonymous';
                }
            } else {
                console.warn('⚠️ No authenticated user found - this should not happen');
                // Fallback - should not happen if login flow works correctly
                this.userId = 'viewer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                this.username = 'Anonymous';
            }
        } else {
            // Fallback for SSR - generate temporary ID
            this.userId = 'viewer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            console.log('🆔 Using temporary userId for SSR:', this.userId);
        }
        
        // Set up global reference for onclick handlers
        if (typeof window !== 'undefined') {
            (window as any).viewerComponent = this;
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
        
        // Subscribe to chat messages
        this.sr.chatMessage$.subscribe(chatData => {
            console.log('💬 Chat message received:', chatData);
            this.addChatMessage(chatData);
        });
        
        // Subscribe to engagement events
        this.sr.pollCreated$.subscribe(pollData => {
            console.log('📊 Poll created received:', pollData);
            this.displayEngagementOverlay('poll', pollData);
        });
        
        this.sr.pollVote$.subscribe(voteData => {
            console.log('🗳️ Poll vote received:', voteData);
            this.handlePollVote(voteData);
        });
        
        this.sr.engagementContent$.subscribe(contentData => {
            console.log('🎯 Engagement content received:', contentData);
            this.displayEngagementOverlay(contentData.type, contentData);
        });
        
        this.sr.contentInteraction$.subscribe(interactionData => {
            console.log('👆 Content interaction received:', interactionData);
            this.handleContentInteraction(interactionData);
        });
        
        this.sr.questionAsked$.subscribe(questionData => {
            console.log('❓ Question asked received:', questionData);
            this.displayEngagementOverlay('question', questionData);
        });
        
        this.sr.questionAnswered$.subscribe(answerData => {
            console.log('✅ Question answered received:', answerData);
            this.handleQuestionAnswer(answerData);
        });
        
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
        
        // Make component methods accessible from global scope for HTML onclick events
        (window as any).viewerComponent = this;
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
    
    // Chat methods
    sendChatMessage() {
        const message = this.currentMessage().trim();
        if (!message || this.chatInputDisabled()) return;
        
        if (this.connectionStatus() === 'Connected') {
            const chatMessage: ChatMessage = {
                id: Date.now().toString() + '-' + this.userId,
                username: this.username,
                message: message,
                timestamp: new Date(),
                userId: this.userId
            };
            
            console.log('💬 Sending chat message:', chatMessage);
            this.sr.sendChatMessage(this.webinarId, chatMessage);
            this.currentMessage.set('');
        } else {
            console.warn('⚠️ Cannot send message - server offline');
            // Add to local messages as a fallback
            this.addChatMessage({
                id: Date.now().toString(),
                username: this.username,
                message: message + ' (offline)',
                timestamp: new Date(),
                userId: this.userId
            });
            this.currentMessage.set('');
        }
    }
    
    onChatKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendChatMessage();
        }
    }
    
    updateCurrentMessage(event: any) {
        this.currentMessage.set(event.target.value);
    }
    
    private addChatMessage(message: ChatMessage) {
        this.chatMessages.update(messages => {
            const newMessages = [...messages, message];
            // Keep only last 100 messages to prevent memory issues
            return newMessages.slice(-100);
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
            const chatContainer = document.querySelector('.chat-messages');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 100);
    }

    // =================== ENGAGEMENT FEATURES ===================

    // Poll Management
    createQuickPoll() {
        const question = "Did you find this session helpful?";
        const options = ["Very helpful", "Somewhat helpful", "Not helpful"];
        
        // Create poll data structure
        const pollData = {
            id: 'quick-poll-' + Date.now(),
            title: 'Quick Poll',
            question: question,
            options: options.map((text, index) => ({ text, index, votes: 0 })),
            duration: 60,
            totalVotes: 0,
            createdAt: new Date()
        };
        
        // Show poll immediately for testing/demo purposes
        this.displayEngagementOverlay('poll', pollData);
        
        // Also send to SignalR if connected
        if (this.connectionStatus() === 'Connected') {
            this.createPoll(question, options, 60); // 60 seconds duration
        } else {
            console.log('📊 Poll displayed locally - SignalR not connected');
        }
    }

    createPoll(question: string, options: string[], duration: number = 0) {
        this.sr.createPoll(this.webinarId, question, options, duration);
    }

    votePoll(pollId: string, optionIndex: number) {
        this.sr.votePoll(this.webinarId, pollId, optionIndex);
    }

    // QR Code Features
    shareQRCode(type: 'payment' | 'download' | 'link', title: string, url: string) {
        const qrContent = {
            type: type,
            title: title,
            url: url,
            qrImageData: this.generateQRCodeData(url) // You'll need to implement QR generation
        };
        
        this.sendEngagementContent('qr_code', title, `Scan to ${type}`, qrContent);
    }

    sharePaymentQR() {
        this.shareQRCode('payment', 'Premium Content Access', 'https://payment.example.com/premium');
    }

    shareDownloadQR() {
        this.shareQRCode('download', 'Download Mobile App', 'https://apps.example.com/download');
    }

    // Like/Heart Button Request
    requestLikes(message: string = "Show some love! ❤️", targetLikes: number = 100) {
        const likeRequest = {
            id: Date.now().toString(),
            message: message,
            targetLikes: targetLikes,
            currentLikes: 0,
            duration: 30, // 30 seconds
            isActive: true,
            likedUsers: []
        };
        
        this.sendEngagementContent('like_request', 'Like Request', message, likeRequest);
    }

    sendLike(contentId: string) {
        this.interactWithContent(contentId, 'like', { userId: this.userId });
    }

    forceLikeRequest() {
        const message = "Click the heart button to continue watching! ❤️";
        const likeRequest = {
            message: message,
            targetLikes: 1,
            currentLikes: 0,
            duration: 0, // No timeout - forced interaction
            isActive: true,
            likedUsers: [],
            isForced: true
        };
        
        this.sendEngagementContent('like_request', 'Required Interaction', message, likeRequest);
    }

    // File Sharing
    shareFile(fileName: string, fileUrl: string, description?: string) {
        const fileShare = {
            id: Date.now().toString(),
            fileName: fileName,
            fileUrl: fileUrl,
            description: description || '',
            downloadCount: 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };
        
        this.sendEngagementContent('file_share', `Download: ${fileName}`, description || '', fileShare);
    }

    sharePresentation() {
        this.shareFile('webinar-presentation.pdf', '/downloads/presentation.pdf', 'Today\'s presentation slides');
    }

    shareResources() {
        this.shareFile('additional-resources.zip', '/downloads/resources.zip', 'Bonus materials and resources');
    }

    downloadFile(fileShare: any) {
        // Track download interaction
        this.interactWithContent(fileShare.id, 'download', { fileName: fileShare.fileName });
        
        // Open download URL
        window.open(fileShare.fileUrl, '_blank');
    }

    // Announcements
    makeAnnouncement(title: string, message: string, duration: number = 10) {
        const announcement = {
            title: title,
            message: message,
            duration: duration,
            type: 'announcement',
            timestamp: new Date()
        };
        
        this.sendEngagementContent('announcement', title, message, announcement);
    }

    sendQuickAnnouncement() {
        this.makeAnnouncement('Important Update', 'Don\'t forget to follow us for more sessions!', 15);
    }

    // Q&A Features
    askQuestion(questionText: string, isPublic: boolean = true) {
        this.sr.askQuestion(this.webinarId, questionText, isPublic);
    }

    answerQuestion(questionId: string, answerText: string, isPublic: boolean = true) {
        this.sr.answerQuestion(this.webinarId, questionId, answerText, isPublic);
    }

    // Modal Control Methods
    openPollModal() {
        this.showPollModal.set(true);
    }

    closePollModal() {
        this.showPollModal.set(false);
    }

    openAnnouncementModal() {
        this.showAnnouncementModal.set(true);
    }

    closeAnnouncementModal() {
        this.showAnnouncementModal.set(false);
    }

    openQAModal() {
        this.showQAModal.set(true);
    }

    closeQAModal() {
        this.showQAModal.set(false);
    }

    // Modal Form Handlers
    createPollFromModal() {
        // Get values from modal form using DOM queries
        const questionEl = document.getElementById('pollQuestion') as HTMLInputElement;
        const opt1El = document.querySelector('input[placeholder="Option 1"]') as HTMLInputElement;
        const opt2El = document.querySelector('input[placeholder="Option 2"]') as HTMLInputElement;
        const opt3El = document.querySelector('input[placeholder="Option 3 (optional)"]') as HTMLInputElement;
        const opt4El = document.querySelector('input[placeholder="Option 4 (optional)"]') as HTMLInputElement;
        const allowMultipleEl = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

        if (questionEl && opt1El && opt2El) {
            const question = questionEl.value.trim();
            const options = [
                opt1El.value.trim(),
                opt2El.value.trim(),
                opt3El?.value.trim(),
                opt4El?.value.trim()
            ].filter(opt => opt.length > 0);

            if (question && options.length >= 2) {
                this.createPoll(question, options);
                this.closePollModal();
                // Clear form
                questionEl.value = '';
                opt1El.value = '';
                opt2El.value = '';
                if (opt3El) opt3El.value = '';
                if (opt4El) opt4El.value = '';
                if (allowMultipleEl) allowMultipleEl.checked = false;
            }
        }
    }

    makeAnnouncementFromModal() {
        const titleEl = document.getElementById('announcementTitle') as HTMLInputElement;
        const textEl = document.getElementById('announcementText') as HTMLTextAreaElement;
        const durationEl = document.querySelector('select') as HTMLSelectElement;

        if (titleEl && textEl) {
            const title = titleEl.value.trim();
            const text = textEl.value.trim();
            const duration = durationEl ? parseInt(durationEl.value) : 10;

            if (title && text) {
                this.makeAnnouncement(title, text, duration);
                this.closeAnnouncementModal();
                // Clear form
                titleEl.value = '';
                textEl.value = '';
                if (durationEl) durationEl.value = '10';
            }
        }
    }

    askQuestionFromModal() {
        const questionEl = document.getElementById('questionText') as HTMLTextAreaElement;
        const isPublicEl = document.querySelector('input[type="checkbox"]') as HTMLInputElement;

        if (questionEl) {
            const question = questionEl.value.trim();
            const isPublic = isPublicEl ? isPublicEl.checked : true;

            if (question) {
                this.askQuestion(question, isPublic);
                this.closeQAModal();
                // Clear form
                questionEl.value = '';
                if (isPublicEl) isPublicEl.checked = true;
            }
        }
    }

    // Generic Engagement Content Sender
    private sendEngagementContent(type: string, title: string, description: string, content: any) {
        this.sr.sendEngagementContent(this.webinarId, type, title, description, content);
    }

    private interactWithContent(contentId: string, interactionType: string, data?: any) {
        this.sr.interactWithContent(this.webinarId, contentId, interactionType, data);
    }

    // QR Code Generation (placeholder - you'll need a proper QR code library)
    private generateQRCodeData(url: string): string {
        // This is a placeholder. In a real implementation, you'd use a QR code library
        // like 'qrcode' or 'angularx-qrcode' to generate the actual QR code
        return `data:image/svg+xml;base64,${btoa(`<svg>QR Code for: ${url}</svg>`)}`;
    }

    // ================== ENGAGEMENT EVENT HANDLERS ==================
    
    displayEngagementOverlay(type: string, data: any) {
        console.log('🎯 displayEngagementOverlay called with:', type, data);
        
        const overlayContainer = document.getElementById('overlayContainer');
        if (!overlayContainer) {
            console.error('❌ overlayContainer not found!');
            return;
        }
        
        console.log('✅ overlayContainer found:', overlayContainer);
        
        // Show the overlay by adding active class
        overlayContainer.classList.add('active');
        console.log('✅ Added active class to overlay');
        
        const overlayElement = document.createElement('div');
        overlayElement.className = 'engagement-item';
        overlayElement.id = `engagement-${data.id}`;
        
        let content = '';
        
        switch (type) {
            case 'poll':
                content = this.createPollHTML(data);
                console.log('📊 Generated poll HTML:', content);
                break;
            case 'qr_code':
                content = this.createQRCodeHTML(data);
                break;
            case 'file_share':
                content = this.createFileShareHTML(data);
                break;
            case 'like_request':
                content = this.createLikeRequestHTML(data);
                break;
            case 'announcement':
                content = this.createAnnouncementHTML(data);
                break;
            case 'question':
                content = this.createQuestionHTML(data);
                break;
            default:
                content = `<div class="engagement-content">${data.description || data.title}</div>`;
        }
        
        overlayElement.innerHTML = `
            <div class="engagement-header">
                <div class="engagement-title">${data.title}</div>
                <button class="engagement-close" onclick="this.parentElement.parentElement.remove(); window.viewerComponent.checkOverlayVisibility()">×</button>
            </div>
            ${content}
        `;
        
        console.log('✅ Created overlay element:', overlayElement);
        
        overlayContainer.appendChild(overlayElement);
        console.log('✅ Appended to overlayContainer');
        
        // Auto-remove after duration (if specified)
        if (data.duration && data.duration > 0) {
            setTimeout(() => {
                const element = document.getElementById(`engagement-${data.id}`);
                if (element) {
                    element.remove();
                    this.checkOverlayVisibility();
                }
            }, data.duration * 1000);
        }
    }
    
    checkOverlayVisibility() {
        const overlayContainer = document.getElementById('overlayContainer');
        if (!overlayContainer) return;
        
        // Check if there are any engagement items in the overlay
        const engagementItems = overlayContainer.querySelectorAll('.engagement-item');
        
        if (engagementItems.length === 0) {
            // No engagement items, hide the overlay
            overlayContainer.classList.remove('active');
        } else {
            // Has engagement items, show the overlay
            overlayContainer.classList.add('active');
        }
    }
    
    private createPollHTML(data: any): string {
        const optionsHTML = data.options.map((option: any, index: number) => 
            `<button class="poll-option" onclick="window.viewerComponent.votePoll('${data.id}', ${index})">
                ${option.text}
            </button>`
        ).join('');
        
        return `
            <div class="engagement-content">
                <div class="poll-question">${data.question}</div>
                <div class="poll-options">${optionsHTML}</div>
                ${data.endTime ? `<div class="poll-timer">Ends: ${new Date(data.endTime).toLocaleTimeString()}</div>` : ''}
            </div>
        `;
    }
    
    private createQRCodeHTML(data: any): string {
        return `
            <div class="engagement-content">
                <div class="qr-container">
                    <div class="qr-image">${data.content.qrImageData}</div>
                    <div class="qr-description">${data.description}</div>
                    <button class="action-btn" onclick="window.open('${data.content.url}', '_blank')">
                        Open Link
                    </button>
                </div>
            </div>
        `;
    }
    
    private createFileShareHTML(data: any): string {
        return `
            <div class="engagement-content">
                <div class="file-download" onclick="window.viewerComponent.downloadFile(${JSON.stringify(data.content).replace(/"/g, '&quot;')})">
                    <div class="file-info">
                        <div class="file-name">📁 ${data.content.fileName}</div>
                        <div class="file-description">${data.content.description || 'Click to download'}</div>
                    </div>
                    <div class="file-icon">⬇️</div>
                </div>
            </div>
        `;
    }
    
    private createLikeRequestHTML(data: any): string {
        return `
            <div class="engagement-content">
                <div class="like-request">
                    <div>${data.content.message}</div>
                    <button class="like-button" onclick="window.viewerComponent.sendLike('${data.id}')">❤️</button>
                    <div class="like-progress">
                        <div class="like-counter">${data.content.currentLikes || 0} / ${data.content.targetLikes} likes</div>
                        <div class="like-bar">
                            <div class="like-bar-fill" style="width: ${((data.content.currentLikes || 0) / data.content.targetLikes) * 100}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    private createAnnouncementHTML(data: any): string {
        return `
            <div class="engagement-content">
                <div class="announcement-content">
                    <div style="font-size: 1.1rem; margin-bottom: 8px;">${data.title}</div>
                    <div>${data.description}</div>
                </div>
            </div>
        `;
    }
    
    private createQuestionHTML(data: any): string {
        return `
            <div class="engagement-content">
                <div class="question-content">
                    <div><strong>❓ ${data.askedBy} asks:</strong></div>
                    <div style="margin: 8px 0; font-style: italic;">${data.questionText}</div>
                    ${this.isHost() ? `
                        <textarea id="answer-${data.id}" placeholder="Type your answer..." style="width: 100%; margin: 8px 0; padding: 8px;"></textarea>
                        <button class="action-btn" onclick="window.viewerComponent.answerQuestion('${data.id}', document.getElementById('answer-${data.id}').value)">
                            Answer
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    handlePollVote(voteData: any) {
        // Update poll results in real-time
        const pollElement = document.getElementById(`engagement-${voteData.pollId}`);
        if (pollElement) {
            // Update vote counts and percentages
            console.log('Updating poll results:', voteData);
        }
    }
    
    handleContentInteraction(interactionData: any) {
        console.log('Content interaction:', interactionData);
        
        if (interactionData.interactionType === 'like') {
            // Update like counter
            const likeCounter = document.querySelector(`#engagement-${interactionData.contentId} .like-counter`);
            const likeFill = document.querySelector(`#engagement-${interactionData.contentId} .like-bar-fill`);
            
            if (likeCounter && likeFill) {
                // You would need to track the actual counts - this is a simplified example
                console.log('Like interaction received for content:', interactionData.contentId);
            }
        }
    }
    
    handleQuestionAnswer(answerData: any) {
        // Display answer in the question overlay
        const questionElement = document.getElementById(`engagement-${answerData.questionId}`);
        if (questionElement) {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'question-answer';
            answerDiv.innerHTML = `
                <div style="margin-top: 12px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                    <strong>✅ ${answerData.answeredBy} answered:</strong><br>
                    ${answerData.answerText}
                </div>
            `;
            questionElement.appendChild(answerDiv);
        }
    }

    // Utility Methods
    isHost(): boolean {
        // Check if current user is host (you might need to implement role checking)
        const userData = localStorage.getItem('liveWebinar-user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.role === 'host' || user.isHost === true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }

    // Quick Action Methods for Hosts
    quickEngagementActions() {
        if (!this.isHost()) {
            console.warn('Only hosts can perform engagement actions');
            return;
        }

        // Example of combined engagement
        setTimeout(() => this.createQuickPoll(), 1000);
        setTimeout(() => this.requestLikes(), 5000);
        setTimeout(() => this.shareDownloadQR(), 10000);
        setTimeout(() => this.makeAnnouncement('Thank You!', 'Thanks for participating!'), 15000);
    }
}