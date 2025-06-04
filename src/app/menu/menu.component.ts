import { Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { AppService } from '../services/app.service';
import { ChatApiService, Session } from '../services/chat-api.service';
import { ModalComponent } from '../modal/modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [ModalComponent, CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
})
export class MenuComponent {
  private authService = inject(AuthService);
  private appService = inject(AppService);
  private apiService = inject(ChatApiService);
  private router = inject(Router);
  currentId = signal<string>('');
  displayedId = signal<string>('');
  sessions = this.appService.userSessionsHistory;
  isDeleting = this.appService.isDeleting;
  deletingItem = null;
  title = 'Usuwanie sesji czatu';
  description = 'Potwierdź usunięcie jeżeli chcesz usunąć całą sesję czatu.';

  constructor() {
    this.getAllSessions();
  }

  getAllSessions() {
    this.apiService.getAllSessions().subscribe({
      next: res => {
        this.appService.userSessionsHistory.set(res.sessions);
      },
      error: err => {},
    });
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: err => console.error('Logout error:', err),
    });
  }

  onNewChat() {
    this.appService.resetSession.set(true);
    this.currentId.set('');
  }

  onLoadSession(id: string) {
    this.currentId.set(id);
    this.apiService.getSession(id).subscribe({
      next: res => {
        this.displayedId.set(res._id as string);
        this.appService.loadSession.set(res);
      },
      error: err => {},
    });
  }

  onDeleteSession(id: string) {
    this.appService.isDeleting.set(true);
    this.currentId.set(id);
  }
  confirmDeleting(id: string) {
    this.apiService.deleteSession(id).subscribe({
      next: res => {
        this.getAllSessions();
      },
    });
  }
  onEditContext(id: string, index: number) {
    this.appService.editMode.set(true);
  }
  handleModalEvent(event: string) {
    if (event === 'submit') {
      this.apiService.deleteSession(this.currentId()).subscribe({
        next: res => {
          this.getAllSessions();
          if (this.appService.currentSessionId === this.currentId())
            this.onNewChat();
        },
        error: err => {},
      });
    }
  }
}
