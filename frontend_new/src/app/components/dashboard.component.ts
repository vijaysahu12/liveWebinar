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
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
    // Core dashboard state
    dashboard = signal<DashboardResponse | null>(null);
    loading = signal(true);
    error = signal('');

    // Modal visibility states
    showCreateWebinar = signal(false);
    showCreatePoll = signal(false);
    showCreateUser = signal(false);
    showEditUser = signal(false);

    // User management
    users = signal<AdminUserInfo[]>([]);
    editingUserData: AdminUserInfo = {
        id: 0,
        name: '',
        email: '',
        mobile: '',
        city: '',
        state: '',
        country: '',
        userRoleType: UserRole.Guest,
        isActive: true,
        createdAt: '',
        lastLoginAt: '',
        isEmailVerified: false,
        isMobileVerified: false
    };

    // Chat for guest view
    chatMessages = signal<ChatMessage[]>([]);
    newChatMessage = '';

    // SignalR
    signalrConnected = signal(false);
    signalrSubscriptions: Subscription[] = [];
    webinarId = '1';

    // Dashboard UI state
    activeAdminTab = 'users';
    viewerCount = signal(0);
    isChatEnabled = true;

    // Poll overlay for guests
    showBlockingPoll = false;
    blockingPoll: any = null;
    selectedBlockingOption = '';

    // Form data objects
    newPoll = {
        question: '',
        options: ['', ''],
        type: 'regular',
        duration: 5
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
        await this.loadDashboard();
        if (this.isGuest()) {
            this.initializeSignalR();
        }
    }

    ngOnDestroy() {
        this.signalrSubscriptions.forEach(sub => sub.unsubscribe());
        this.signalrService.disconnect();
    }

    async loadDashboard() {
        this.loading.set(true);
        this.error.set('');

        try {
            const userData = localStorage.getItem('liveWebinar-user');
            if (!userData) {
                this.router.navigate(['/login']);
                return;
            }

            const user = JSON.parse(userData);
            const dashboard = await this.userService.getUserDashboard(user.userId);
            this.dashboard.set(dashboard);
        } catch (error: any) {
            this.error.set(error.message || 'Failed to load dashboard');
        } finally {
            this.loading.set(false);
        }
    }

    // Role checking methods
    isAdmin(): boolean {
        return this.dashboard()?.user?.userRoleType === UserRole.Admin;
    }

    isHost(): boolean {
        return this.dashboard()?.user?.userRoleType === UserRole.Host;
    }

    isGuest(): boolean {
        return this.dashboard()?.user?.userRoleType === UserRole.Guest;
    }
    
        isHostOrAdmin(): boolean {
            const role = this.dashboard()?.user?.userRoleType;
            return role === UserRole.Host || role === UserRole.Admin;
        }

    getRoleClass(): string {
        const role = this.dashboard()?.user?.userRoleType;
        return 'role-' + (role === UserRole.Admin ? 'admin' : role === UserRole.Host ? 'host' : 'guest');
    }

    getRoleText(): string {
        const role = this.dashboard()?.user?.userRoleType;
        return role === UserRole.Admin ? '👑 Admin' : role === UserRole.Host ? '🎤 Host' : '👥 Viewer';
    }

    // Poll methods
    addOption() {
        if (this.newPoll.options.length < 6) {
            this.newPoll.options.push('');
        }
    }

    removeOption(index: number) {
        if (this.newPoll.options.length > 2) {
            this.newPoll.options.splice(index, 1);
        }
    }

    async createPoll() {
        try {
            const currentUser = this.dashboard()?.user;
            if (!currentUser || (currentUser.userRoleType !== UserRole.Host && currentUser.userRoleType !== UserRole.Admin)) {
                return;
            }

            const validOptions = this.newPoll.options.filter(opt => opt.trim().length > 0);
            
            if (this.signalrService?.connection?.state === 'Connected') {
                await this.signalrService.connection.invoke('CreatePoll',
                    this.webinarId, this.newPoll.question.trim(), validOptions, this.newPoll.duration * 60);

                this.newPoll = { question: '', options: ['', ''], type: 'regular', duration: 5 };
                this.showCreatePoll.set(false);
            }
        } catch (error) {
            console.error('Error creating poll:', error);
        }
    }

    // Host controls
    startWebinar() { console.log('Starting webinar...'); }
    stopWebinar() { console.log('Stopping webinar...'); }
    toggleChat() { this.isChatEnabled = !this.isChatEnabled; }
    shareScreen() { console.log('Sharing screen...'); }

    // Webinar management
    async createWebinar() {
        try {
            const userData = localStorage.getItem('liveWebinar-user');
            if (!userData) return;

            const user = JSON.parse(userData);
            await this.userService.createWebinar(this.newWebinar, user.userId);
            
            this.showCreateWebinar.set(false);
            this.newWebinar = {
                title: '', description: '', scheduledDateTime: '', durationMinutes: 90,
                thumbnailUrl: '', streamUrl: '', requiredSubscription: SubscriptionType.Free, price: 0
            };
            await this.loadDashboard();
        } catch (error: any) {
            alert('Failed to create webinar: ' + error.message);
        }
    }

    async scheduleWebinar() { await this.createWebinar(); }
    editWebinar(webinar: any) { console.log('Editing webinar:', webinar); }
    deleteWebinar(webinarId: number) { if (confirm('Delete this webinar?')) console.log('Deleting:', webinarId); }

    // User management
    async createUser() {
        if (!this.isAdmin()) return;
        try {
            await this.userService.createUser(this.newUser);
            this.showCreateUser.set(false);
            this.newUser = { name: '', mobile: '', email: '', city: '', state: '', country: '', userRoleType: UserRole.Guest, isActive: true };
            alert('User created successfully');
        } catch (error: any) {
            alert('Failed to create user: ' + error.message);
        }
    }

    editUser(user: AdminUserInfo) { this.editingUserData = { ...user }; this.showEditUser.set(true); }

    async updateUser() {
        if (!this.isAdmin()) return;
        try {
            const updateData: AdminUpdateUserRequest = {
                id: this.editingUserData.id, name: this.editingUserData.name, email: this.editingUserData.email,
                city: this.editingUserData.city, state: this.editingUserData.state, country: this.editingUserData.country,
                userRoleType: this.editingUserData.userRoleType, isActive: this.editingUserData.isActive
            };
            await this.userService.updateUser(updateData);
            this.showEditUser.set(false);
            alert('User updated successfully');
        } catch (error: any) {
            alert('Failed to update user: ' + error.message);
        }
    }

    async deleteUser(userId: number) {
        if (!this.isAdmin() || !confirm('Delete this user?')) return;
        try {
            await this.userService.deleteUser(userId);
            alert('User deleted successfully');
        } catch (error: any) {
            alert('Failed to delete user: ' + error.message);
        }
    }

    // Chat functionality
    initializeSignalR() {
        if (!isPlatformBrowser(this.platformId)) return;
        const userId = this.getUserId();
        this.signalrService.startConnection(this.webinarId, userId, 'guest');

        const chatSub = this.signalrService.chatMessage$.subscribe((message: ChatMessage) => {
            if (!this.chatMessages().find(m => m.id === message.id)) {
                this.chatMessages.update(messages => [...messages, message]);
                setTimeout(() => this.scrollToBottom(), 100);
            }
        });
        this.signalrSubscriptions.push(chatSub);

        const statusSub = this.signalrService.connectionStatus$.subscribe(status => {
            this.signalrConnected.set(status === 'Connected');
        });
        this.signalrSubscriptions.push(statusSub);
    }

    sendChatMessage() {
        if (!this.newChatMessage.trim()) return;
        const message: ChatMessage = {
            id: Date.now().toString(), username: this.dashboard()?.user?.name || 'Anonymous',
            message: this.newChatMessage.trim(), timestamp: new Date(), userId: this.getUserId()
        };

        if (this.signalrConnected()) {
            this.signalrService.sendChatMessage(this.webinarId, message);
        } else {
            this.chatMessages.update(messages => [...messages, message]);
            this.scrollToBottom();
        }
        this.newChatMessage = '';
    }

    getUserId(): string {
        const userId = this.dashboard()?.user?.userId?.toString();
        return userId || (900000000 + Math.floor(Math.random() * 1000)).toString();
    }

    scrollToBottom() {
        if (!isPlatformBrowser(this.platformId)) return;
        try {
            const element = document.querySelector('.chat-messages');
            if (element) element.scrollTop = element.scrollHeight;
        } catch (error) {
            console.log('Could not scroll to bottom:', error);
        }
    }

    // Utility methods
    formatDateTime(dateString: string): string { return new Date(dateString).toLocaleString(); }
    formatDate(dateString: string): string { return new Date(dateString).toLocaleDateString(); }
    formatTime(date: Date): string { return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    getVideoStreamUrl(): string { 
        // Check if there are any webinars with stream URLs
        const webinars = this.dashboard()?.upcomingWebinars || [];
        const liveWebinar = webinars.find(w => w.status === WebinarStatus.Live);
        return liveWebinar?.streamUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ'; 
    }

    voteBlockingPoll() {
        if (!this.selectedBlockingOption) return;
        console.log('Voting on poll:', this.selectedBlockingOption);
        this.showBlockingPoll = false;
        this.blockingPoll = null;
        this.selectedBlockingOption = '';
    }

    logout() {
        localStorage.removeItem('liveWebinar-user');
        localStorage.removeItem('liveWebinar-token');
        this.router.navigate(['/login']);
    }
}