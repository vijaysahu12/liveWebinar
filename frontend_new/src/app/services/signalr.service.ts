import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class SignalrService {
    private hubConnection: signalR.HubConnection | null = null;
    public counts$ = new Subject<{ viewers: number, participants: number }>();
    public overlay$ = new Subject<any>();


    startConnection(webinarId: string, userId: string, role: string = 'viewer') {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(`http://localhost:5000/hubs/webinar?webinarId=${webinarId}&userId=${userId}&role=${role}`, { skipNegotiation: true, transport: signalR.HttpTransportType.WebSockets })
            .withAutomaticReconnect()
            .build();


        this.hubConnection.start().then(() => {
            console.log('SignalR connected');
            this.registerHandlers();
        }).catch(err => console.error(err));
    }


    private registerHandlers() {
        if (!this.hubConnection) return;
        this.hubConnection.on('CountsUpdated', (viewers: number, participants: number) => {
            this.counts$.next({ viewers, participants });
        });
        this.hubConnection.on('Overlay', (payload: any) => {
            this.overlay$.next(payload);
        });
    }


    sendOverlay(webinarId: string, payload: any) {
        // call backend endpoint or hub method (if host) — demo uses HTTP POST to BroadcastController
        fetch(`http://localhost:5000/api/broadcast/overlay/${webinarId}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
    }
}