import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ChatSession, Message } from '../model/chatSession';
import { Observable } from 'rxjs';
import { AppService } from './app.service';

export interface Session {
  _id: string;
  createdAt: Date;
  firstUserContent: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatApiService {
  private http = inject(HttpClient);
  private appService = inject(AppService);

  sendMessage(
    message: Message,
    sessionId: string | null
  ): Observable<{
    type: 'chunk' | 'final';
    data: string | { sessionId: string; message: string };
  }> {
    const url = sessionId
      ? `${environment.apiUrl}chat/${sessionId}`
      : `${environment.apiUrl}chat/`;

    return new Observable(observer => {
      fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })
        .then(response => {
          if (!response.body) {
            observer.error('No response body');
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          const processLine = (line: string) => {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();

              try {
                const parsed = JSON.parse(data);
                if (
                  typeof parsed === 'object' &&
                  parsed.sessionId &&
                  parsed.message
                ) {
                  parsed.message = parsed.message.trim();
                  observer.next({ type: 'final', data: parsed });
                  observer.complete();
                } else {
                  observer.next({ type: 'chunk', data });
                }
              } catch {
                observer.next({ type: 'chunk', data });
              }
            }
          };

          const read = () => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  observer.complete();
                  return;
                }

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                lines.forEach(processLine);
                read();
              })
              .catch(err => observer.error(err));
          };

          read();
        })
        .catch(err => observer.error(err));
    });
  }

  getAllSessions() {
    return this.http.get<{ sessions: Session[] }>(`${environment.apiUrl}chat`, {
      withCredentials: true,
    });
  }

  getSession(id: string) {
    return this.http.get<ChatSession>(`${environment.apiUrl}chat/${id}`, {
      withCredentials: true,
    });
  }
  deleteSession(id: string) {
    return this.http.delete(`${environment.apiUrl}chat/${id}`, {
      withCredentials: true,
    });
  }
  editSession(id: string, history: Message[]) {
    return this.http.patch(`${environment.apiUrl}chat/${id}`, history, {
      withCredentials: true,
    });
  }

  ///////////////////////////////////
  // NO STREAMING DATA
  //////////////////////////////////
  // sendMessage(message: Message, sessionId: string | null) {
  //   const url = sessionId
  //     ? `${environment.apiUrl}chat/${sessionId}`
  //     : `${environment.apiUrl}chat/`;
  //   return this.http.post<any>(url, message, {
  //     withCredentials: true,
  //   });
  // }
}
