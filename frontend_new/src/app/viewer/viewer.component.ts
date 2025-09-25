import { ChangeDetectionStrategy, Component, effect, OnInit, signal } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
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

    viewers = 0;
    overlays: any[] = [];

    constructor(private sr: SignalrService) {
        effect(() => {
            // This effect can be used to react to changes in signals
            // For example, updating the viewer count or timer display
            console.log('Viewer count changed to: ' + this.viewerCount());
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
        const webinarId = 'webinar-1';
        const userId = 'viewer-' + Math.random().toString(36).substr(2, 6);
        this.sr.startConnection(webinarId, userId, 'viewer');
        this.sr.counts$.subscribe(c => { this.viewerCount.set(c.viewers); this.participants.set(c.participants); });
        this.sr.overlay$.subscribe(p => { this.overlays.push(p); setTimeout(() => this.overlays.shift(), (p.duration || 10) * 1000) });
    }

    toggleChat() {
        this.showChat.update(val => !val);
    }

    toggleHostPanel() {
        this.hostPanelMinimized.update(val => !val);
    }

    incrementViewerCount() {
        this.viewerCount.update(count => count + 1);
    }

    resetViewerCount() {
        this.viewerCount.set(0);
    }
}