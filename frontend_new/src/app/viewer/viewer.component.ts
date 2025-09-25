import { ChangeDetectionStrategy, Component, effect, OnInit, signal } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';

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

// @Component({
//   selector: 'app-viewer',
//   templateUrl: './viewer.component.html',
//   styleUrls: ['./viewer.component.css'],
//   animations: [
//     trigger('slideInOut', [
//       state('void', style({ transform: 'translateX(100%)', opacity: 0 })),
//       state('*', style({ transform: 'translateX(0)', opacity: 1 })),
//       transition(':enter', [
//         animate('300ms cubic-bezier(.25,.8,.25,1)')
//       ]),
//       transition(':leave', [
//         animate('200ms cubic-bezier(.25,.8,.25,1)', style({ transform: 'translateX(100%)', opacity: 0 }))
//       ])
//     ])
//   ]
// })



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

    constructor() {
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
        throw new Error('Method not implemented.');
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