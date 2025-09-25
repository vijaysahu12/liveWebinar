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
            console.error('❌ SignalR connection failed:', err);
            this.connectionStatus$.next('Failed to connect: ' + err.message);
        });

        // Handle reconnection events
        this.hubConnection.onreconnecting(() => {
            this.connectionStatus$.next('Reconnecting...');
        });

        this.hubConnection.onreconnected(() => {
            this.connectionStatus$.next('Reconnected');
            this.getViewerCount(webinarId);
        });

        this.hubConnection.onclose(() => {
            this.connectionStatus$.next('Disconnected');
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
        
        console.log('✅ All SignalR event handlers registered');
    }

    getViewerCount(webinarId: string) {
        if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
            console.log('📊 Requesting viewer count for webinar:', webinarId);
            this.hubConnection.invoke('GetViewerCount', webinarId);
        } else {
            console.warn('⚠️ Cannot get viewer count - SignalR not connected. State:', this.hubConnection?.state);
        }
    }

    ping() {
        if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
            this.hubConnection.invoke('Ping');
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
        });
    }
}