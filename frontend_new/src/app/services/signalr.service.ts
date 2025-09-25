import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class SignalrService {
    private hubConnection: signalR.HubConnection | null = null;
    public counts$ = new Subject<{ viewers: number, participants: number }>();
    public overlay$ = new Subject<any>();
    public connectionStatus$ = new Subject<string>();
    public messages$ = new Subject<string>();
    public forceDisconnect$ = new Subject<any>();
    public chatMessage$ = new Subject<any>();


    startConnection(webinarId: string, userId: string, role: string = 'viewer') {
        const connectionUrl = `http://localhost:5021/hubs/webinar?webinarId=${webinarId}&userId=${userId}&role=${role}`;
        console.log('🔗 Attempting to connect to:', connectionUrl);
        
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(connectionUrl, { 
                skipNegotiation: true, 
                transport: signalR.HttpTransportType.WebSockets 
            })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.hubConnection.start().then(() => {
            console.log('✅ SignalR connected successfully to webinar:', webinarId);
            console.log('Connection ID:', this.hubConnection?.connectionId);
            this.connectionStatus$.next('Connected');
            this.registerHandlers();
            // Request initial viewer count
            this.getViewerCount(webinarId);
        }).catch(err => {
            // Log error to console for debugging, but don't show error to user
            console.error('❌ SignalR connection failed (server may be unavailable):', err);
            console.warn('⚠️ Running in offline mode - UI will display without live data');
            
            // Set a neutral status that won't show error messages to user
            this.connectionStatus$.next('Offline');
            
            // Emit default/mock data so the UI displays normally
            this.counts$.next({ viewers: 0, participants: 0 });
        });

        // Handle reconnection events
        this.hubConnection.onreconnecting(() => {
            console.log('🔄 SignalR attempting to reconnect...');
            this.connectionStatus$.next('Reconnecting...');
        });

        this.hubConnection.onreconnected(() => {
            console.log('✅ SignalR reconnected successfully');
            this.connectionStatus$.next('Connected');
            this.getViewerCount(webinarId);
        });

        this.hubConnection.onclose((error) => {
            if (error) {
                console.error('❌ SignalR connection closed with error:', error);
                console.warn('⚠️ Server connection lost - continuing in offline mode');
            } else {
                console.log('✅ SignalR connection closed gracefully');
            }
            this.connectionStatus$.next('Offline');
        });
    }


    private registerHandlers() {
        if (!this.hubConnection) return;
        
        console.log('🔧 Registering SignalR event handlers...');
        
        this.hubConnection.on('CountsUpdated', (viewers: number, participants: number) => {
            console.log('📊 CountsUpdated event received:', { viewers, participants });
            this.counts$.next({ viewers, participants });
        });
        
        this.hubConnection.on('Overlay', (payload: any) => {
            console.log('📺 Overlay event received:', payload);
            this.overlay$.next(payload);
        });
        
        this.hubConnection.on('Connected', (message: string) => {
            console.log('✅ Connected event received:', message);
            this.messages$.next(message);
        });
        
        this.hubConnection.on('UserDisconnected', (message: string) => {
            console.log('👋 UserDisconnected event received:', message);
            this.messages$.next(message);
        });
        
        this.hubConnection.on('Pong', (timestamp: string) => {
            console.log('🏓 Pong received at:', timestamp);
        });
        
        this.hubConnection.on('ForceDisconnect', (data: any) => {
            console.log('⚠️ ForceDisconnect event received:', data);
            this.forceDisconnect$.next(data);
        });
        
        this.hubConnection.on('Error', (errorMessage: string) => {
            console.error('❌ Server error:', errorMessage);
            this.messages$.next(`Error: ${errorMessage}`);
        });
        
        this.hubConnection.on('ChatMessage', (chatData: any) => {
            console.log('💬 Chat message received:', chatData);
            this.chatMessage$.next(chatData);
        });
        
        console.log('✅ All SignalR event handlers registered');
    }

    getViewerCount(webinarId: string) {
        if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
            console.log('📊 Requesting viewer count for webinar:', webinarId);
            this.hubConnection.invoke('GetViewerCount', webinarId)
                .catch(err => {
                    console.error('❌ Failed to get viewer count:', err);
                    // Don't show error to user, just continue with current count
                });
        } else {
            console.warn('⚠️ Cannot get viewer count - SignalR not connected (server offline). State:', this.hubConnection?.state);
            // Don't show error to user, just maintain current state
        }
    }

    ping() {
        if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
            this.hubConnection.invoke('Ping')
                .catch(err => {
                    console.error('❌ Ping failed:', err);
                    // Don't show error to user
                });
        } else {
            console.log('🏓 Ping skipped - server offline');
        }
    }

    disconnect() {
        if (this.hubConnection) {
            this.hubConnection.stop();
            this.connectionStatus$.next('Disconnected');
        }
    }

    sendOverlay(webinarId: string, payload: any) {
        // call backend endpoint or hub method (if host) — demo uses HTTP POST to BroadcastController
        fetch(`http://localhost:5000/api/broadcast/overlay/${webinarId}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        }).catch(err => {
            console.error('❌ Failed to send overlay (server offline):', err);
            // Don't show error to user
        });
    }
    
    sendChatMessage(webinarId: string, chatMessage: any) {
        if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
            console.log('💬 Sending chat message to webinar:', webinarId);
            this.hubConnection.invoke('SendChatMessage', webinarId, chatMessage)
                .catch(err => {
                    console.error('❌ Failed to send chat message:', err);
                    // Don't show error to user
                });
        } else {
            console.warn('⚠️ Cannot send chat message - SignalR not connected');
        }
    }
}