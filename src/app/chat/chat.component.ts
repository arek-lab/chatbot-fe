import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  NgZone,
  effect,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ChatApiService } from '../services/chat-api.service';
import { Message } from '../model/chatSession';
import { CommonModule } from '@angular/common';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import removeMd from 'remove-markdown';
import { LoaderComponent } from '../loader/loader.component';
import { AppService } from '../services/app.service';
import { ModalComponent } from '../modal/modal.component';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LoaderComponent, ModalComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private chatService = inject(ChatApiService);
  private appService = inject(AppService);
  private apiService = inject(ChatApiService);
  private sanitizer = inject(DomSanitizer);
  private zone = inject(NgZone);
  editMode = this.appService.editMode;

  messageForm = new FormGroup({
    message: new FormControl('', Validators.required),
  });

  messages: Message[] = [];
  renderedMessages: (Message & { renderedContent?: SafeHtml })[] = [];

  loading = false;
  sessionId: string | null = null;

  @ViewChild('chatWrapper') chatWrapper!: ElementRef<HTMLDivElement>;

  partialAssistantMessage = '';
  lastAssistantMessageIndex = -1;

  isEditMode = this.appService.editMode;
  isEditing = signal<boolean>(false);
  editedIndex = signal<number | null>(null);
  title = 'Usuwanie części kontekstu czatu';
  description =
    'Potwierdź usunięcie. Zaznaczona część kontekstu zostanie usunięta i nie będzie wpływała na odpowiedź asystenta.';

  constructor() {
    effect(
      () => {
        if (this.appService.resetSession()) {
          this.newChat();
          this.appService.resetSession.set(false);
        }

        if (this.appService.loadSession()) {
          const loadedSession = this.appService.loadSession();
          this.zone.run(() => {
            this.sessionId = loadedSession?._id as string;
            this.appService.currentSessionId = this.sessionId;
            this.messages = [...loadedSession!.history];
            this.renderCurrentMessages();
            this.lastAssistantMessageIndex = this.messages.length - 1;
            this.scrollToBottom();
          });
          this.appService.loadSession.set(null);
        }
      },
      { allowSignalWrites: true }
    );
  }

  renderCurrentMessages() {
    this.renderedMessages = this.messages.map(msg => {
      if (msg.role === 'assistant') {
        const html = marked.parse(msg.content);
        const sanitized = this.sanitizer.bypassSecurityTrustHtml(
          html as string
        );
        return {
          ...msg,
          renderedContent: sanitized,
        };
      }
      return msg;
    });
  }

  onSubmit(): void {
    if (!this.canSendMessage()) return;

    const userMessage = this.buildUserMessage();
    this.addMessage(userMessage);
    this.scrollToBottom();
    this.loading = true;
    this.messageForm.reset();
    this.resetAssistantState();

    this.chatService.sendMessage(userMessage, this.sessionId).subscribe({
      next: res => {
        this.handleResponseChunk(res);
        this.loading = false;
      },
      error: err => {
        this.handleError(err);
        this.loading = false;
      },
    });
  }

  private canSendMessage(): boolean {
    return !this.messageForm.invalid && !this.loading;
  }

  private buildUserMessage(): Message {
    const content = this.messageForm.value.message?.trim();
    return {
      role: 'user',
      content: content || '',
    };
  }

  private resetAssistantState(): void {
    this.partialAssistantMessage = '';
    this.lastAssistantMessageIndex = -1;
    this.loading = true;
  }

  private handleResponseChunk(res: any): void {
    if (res.type === 'chunk') {
      this.processChunk(res.data as string);
    } else if (res.type === 'final') {
      this.processFinal(res.data as { sessionId: string; message: string });
    }
  }

  private processChunk(raw: string): void {
    const rawChunk = raw.replace(/\\n/g, '\n').replace('"', '');
    const preparedChunk = rawChunk
      .replace(/^#{1,6}\s?/gm, '\n\n')
      .replace(/^- /gm, '\n\n- ');
    const plainText = removeMd(preparedChunk);

    this.partialAssistantMessage += plainText
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, ' ');

    const cleanText = this.partialAssistantMessage
      .replace(/\n{2,}/g, '<br>')
      .replace(/\n/g, ' ');

    if (this.lastAssistantMessageIndex === -1) {
      this.addInitialAssistantMessage(cleanText);
    } else {
      this.updateAssistantMessage(cleanText);
    }

    this.scrollToBottom();
  }

  private addInitialAssistantMessage(cleanText: string): void {
    const assistantMsg: Message = {
      role: 'assistant',
      content: this.partialAssistantMessage,
    };

    this.messages = [...this.messages, assistantMsg];
    this.renderedMessages = [
      ...this.renderedMessages,
      {
        ...assistantMsg,
        renderedContent: this.sanitizer.bypassSecurityTrustHtml(cleanText),
      },
    ];
    this.lastAssistantMessageIndex = this.messages.length - 1;
  }

  private updateAssistantMessage(cleanText: string): void {
    this.messages[this.lastAssistantMessageIndex].content =
      this.partialAssistantMessage;
    this.renderedMessages[this.lastAssistantMessageIndex] = {
      ...this.renderedMessages[this.lastAssistantMessageIndex],
      content: this.partialAssistantMessage,
      renderedContent: this.sanitizer.bypassSecurityTrustHtml(cleanText),
    };
  }

  private processFinal(data: { sessionId: string; message: string }): void {
    this.sessionId = data.sessionId;
    const finalContent = data.message.trim();

    if (this.lastAssistantMessageIndex !== -1) {
      this.messages[this.lastAssistantMessageIndex].content = finalContent;

      const html = marked.parse(finalContent);
      const sanitized = this.sanitizer.bypassSecurityTrustHtml(html as string);

      this.renderedMessages[this.lastAssistantMessageIndex] = {
        ...this.renderedMessages[this.lastAssistantMessageIndex],
        content: finalContent,
        renderedContent: sanitized,
      };
    }

    if (this.renderedMessages.length === 2) {
      this.apiService.getAllSessions().subscribe({
        next: res => this.appService.userSessionsHistory.set(res.sessions),
      });
    }

    this.scrollToBottom();
  }

  private handleError(err: any): void {
    this.addMessage({
      role: 'assistant',
      content: '[Błąd połączenia z serwerem]\n' + err.message,
    });
  }

  private async addMessage(msg: Message) {
    this.messages.push(msg);

    if (msg.role === 'assistant') {
      const html = marked.parse(msg.content.trim());
      this.renderedMessages.push({
        ...msg,
        renderedContent: this.sanitizer.bypassSecurityTrustHtml(html as string),
      });
    } else {
      this.renderedMessages.push(msg);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatWrapper) {
        this.chatWrapper.nativeElement.scrollTop =
          this.chatWrapper.nativeElement.scrollHeight;
      }
    }, 100);
  }

  handleEnter(event: Event) {
    if (!(event as KeyboardEvent).shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  handleTextareaResize(event: any) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  newChat() {
    this.messages = [];
    this.renderedMessages = [];
    this.sessionId = null;
    this.messageForm.reset();
  }
  onEditSession(index: number) {
    this.editedIndex.set(index);
    setTimeout(() => {
      this.isEditing.set(true);
    }, 1000);
  }
  handleModalEvent(event: string) {
    if (event === 'submit') {
      if (this.editedIndex()! <= 1) {
        this.apiService
          .deleteSession(this.sessionId!)
          .pipe(switchMap(() => this.apiService.getAllSessions()))
          .subscribe({
            next: res => {
              this.appService.userSessionsHistory.set(res.sessions);
            },
            error: err => {},
          });
      }
      this.messages = this.messages.slice(0, this.editedIndex()!);
      this.apiService
        .editSession(this.sessionId as string, this.messages)
        .subscribe({
          next: res => {
            this.isEditMode.set(false);
            this.editedIndex.set(null);
            this.renderCurrentMessages();
          },
          error: err => {},
        });
    } else if (event === 'cancel') {
      this.editedIndex.set(null);
      this.isEditMode.set(false);
    } else if (event === 'continue') this.isEditing.set(false);
  }
}

///////////////////////////////////////////
// No streaming
///////////////////////////////////////////
// onSubmit() {
//   if (this.messageForm.invalid || this.loading) return;

//   const content = this.messageForm.value.message?.trim();
//   if (!content) return;

//   const userMessage: Message = {
//     role: 'user',
//     content,
//   };

//   this.addMessage(userMessage);
//   this.scrollToBottom();
//   this.loading = true;
//   this.messageForm.reset();

//   this.chatService.sendMessage(userMessage, this.sessionId).subscribe({
//     next: res => {
//       this.sessionId = res.sessionId;
//       this.addMessage(res.assistantMessage);
//       this.loading = false;
//       this.scrollToBottom();
//     },
//     error: err => {
//       this.loading = false;
//       this.addMessage({
//         role: 'assistant',
//         content: '[Błąd połączenia z serwerem]\n' + err.message,
//       });
//     },
//   });
// }

// private async addMessage(msg: Message) {
//   this.messages.push(msg);
//   if (msg.role === 'assistant') {
//     const html = await marked.parse(msg.content);
//     this.renderedMessages.push({
//       ...msg,
//       renderedContent: this.sanitizer.bypassSecurityTrustHtml(html),
//     });
//   } else {
//     this.renderedMessages.push(msg);
//   }
// }

// private scrollToBottom() {
//   setTimeout(() => {
//     if (this.chatWrapper) {
//       this.chatWrapper.nativeElement.scrollTop =
//         this.chatWrapper.nativeElement.scrollHeight;
//     }
//   }, 100);
// }

// handleEnter(event: Event) {
//   if (!(event as KeyboardEvent).shiftKey) {
//     event.preventDefault();
//     this.onSubmit();
//   }
// }
// handleTextareaResize(event: any) {
//   const textarea = event.target;
//   textarea.style.height = 'auto';
//   textarea.style.height = textarea.scrollHeight + 'px';
// }
