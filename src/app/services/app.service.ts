import { Injectable, signal } from '@angular/core';
import { ChatSession } from '../model/chatSession';
import { Session } from './chat-api.service';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  showMenu = signal(false);
  resetSession = signal(false);
  loadSession = signal<ChatSession | null>(null);
  userSessionsHistory = signal<Session[] | []>([]);
  editMode = signal<boolean>(false);
  isDeleting = signal(false);
  currentSessionId = '';
}
