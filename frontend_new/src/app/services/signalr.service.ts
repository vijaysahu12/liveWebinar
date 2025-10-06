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
    
    // New engagement event subjects
    public pollCreated$ = new Subject<any>();
    public pollVote$ = new Subject<any>();
    public engagementContent$ = new Subject<any>();
    public contentInteraction$ = new Subject<any>();
    public questionAsked$ = new Subject<any>();
    public questionAnswered$ = new Subject<any>();
    public privateQuestionAsked$ = new Subject<any>();


    startConnection(webinarId: string, userId: string, role: string = 'viewer') {
        console.log('🔗 startConnection called with:', { webinarId, userId, role });
        
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
            console.log('⚠️ Skipping SignalR connection - not in browser environment');
            return;
        }
        
        // Use protocol-relative URL or check current protocol
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const baseUrl = `${protocol}//localhost:5021`;
        const connectionUrl = `${baseUrl}/hubs/webinar?webinarId=${webinarId}&userId=${userId}&role=${role}`;
        console.log('🔗 Attempting to connect to:', connectionUrl);
        
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(connectionUrl, { 
                skipNegotiation: false, // Allow negotiation for transport fallback
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents,
                accessTokenFactory: () => {
                    // Add token if available
                    const token = localStorage.getItem('liveWebinar-token');
                    return token || '';
                }
            })
            .withAutomaticReconnect([0, 2000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.hubConnection.start().then(() => {
            console.log('✅ SignalR connected successfully to webinar:', webinarId);
            console.log('Connection ID:', this.hubConnection?.connectionId);
            console.log('Connection state:', this.hubConnection?.state);
            this.connectionStatus$.next('Connected');
            this.registerHandlers();
            // Request initial viewer count
            this.getViewerCount(webinarId);
        }).catch(err => {
            // Log detailed error information
            console.error('❌ SignalR connection failed:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                url: connectionUrl
            });
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
        
        // Engagement event handlers
        this.hubConnection.on('PollCreated', (pollData: any) => {
            console.log('📊 Poll created:', pollData);
            this.pollCreated$.next(pollData);
        });
        
        this.hubConnection.on('PollVote', (voteData: any) => {
            console.log('🗳️ Poll vote received:', voteData);
            this.pollVote$.next(voteData);
        });
        
        this.hubConnection.on('EngagementContent', (contentData: any) => {
            console.log('🎯 Engagement content received:', contentData);
            this.engagementContent$.next(contentData);
        });
        
        this.hubConnection.on('ContentInteraction', (interactionData: any) => {
            console.log('👆 Content interaction received:', interactionData);
            this.contentInteraction$.next(interactionData);
        });
        
        this.hubConnection.on('QuestionAsked', (questionData: any) => {
            console.log('❓ Question asked:', questionData);
            this.questionAsked$.next(questionData);
        });
        
        this.hubConnection.on('PrivateQuestionAsked', (questionData: any) => {
            console.log('🔒 Private question asked:', questionData);
            this.privateQuestionAsked$.next(questionData);
        });
        
        this.hubConnection.on('QuestionAnswered', (answerData: any) => {
            console.log('✅ Question answered:', answerData);
            this.questionAnswered$.next(answerData);
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

    // Connection status check
    isConnected(): boolean {
        return this.hubConnection?.state === signalR.HubConnectionState.Connected;
    }

    // Get the connection object for direct invocation
    get connection(): signalR.HubConnection | null {
        return this.hubConnection;
    }

    // Engagement feature methods
    createPoll(webinarId: string, question: string, options: string[], duration: number = 0) {
        if (this.isConnected()) {
            this.hubConnection!.invoke('CreatePoll', webinarId, question, options, duration)
                .catch(err => console.error('❌ Failed to create poll:', err));
        }
    }

    votePoll(webinarId: string, pollId: string, optionIndex: number) {
        if (this.isConnected()) {
            this.hubConnection!.invoke('VotePoll', webinarId, pollId, optionIndex)
                .catch(err => console.error('❌ Failed to vote:', err));
        }
    }

    sendEngagementContent(webinarId: string, type: string, title: string, description: string, content: any) {
        if (this.isConnected()) {
            this.hubConnection!.invoke('SendEngagementContent', webinarId, type, title, description, content)
                .catch(err => console.error('❌ Failed to send engagement content:', err));
        }
    }

    interactWithContent(webinarId: string, contentId: string, interactionType: string, data?: any) {
        if (this.isConnected()) {
            this.hubConnection!.invoke('InteractWithContent', webinarId, contentId, interactionType, data)
                .catch(err => console.error('❌ Failed to interact with content:', err));
        }
    }

    askQuestion(webinarId: string, questionText: string, isPublic: boolean = true) {
        if (this.isConnected()) {
            this.hubConnection!.invoke('AskQuestion', webinarId, questionText, isPublic)
                .catch(err => console.error('❌ Failed to ask question:', err));
        }
    }

    answerQuestion(webinarId: string, questionId: string, answerText: string, isPublic: boolean = true) {
        if (this.isConnected()) {
            this.hubConnection!.invoke('AnswerQuestion', webinarId, questionId, answerText, isPublic)
                .catch(err => console.error('❌ Failed to answer question:', err));
        }
    }
}