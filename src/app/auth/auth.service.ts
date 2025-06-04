import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from './../../environments/environment';
import { tap } from 'rxjs';

export interface UserResponse {
  user: {
    name: string;
    userId: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  user = signal<UserResponse['user'] | null>(null);
  private apiUrl = environment.apiUrl;
  private readonly loginUrl = 'auth/login';
  private readonly registerUrl = 'auth/register';

  login(email: string, password: string) {
    return this.http.post<UserResponse>(
      this.apiUrl + this.loginUrl,
      { email, password },
      { withCredentials: true }
    );
  }
  register(email: string, password: string) {
    return this.http.post<UserResponse>(
      this.apiUrl + this.registerUrl,
      { email, password },
      { withCredentials: true }
    );
  }
  getCurrentUser() {
    return this.http.get<UserResponse>(this.apiUrl + 'users/showMe', {
      withCredentials: true,
    });
  }
  logout() {
    return this.http
      .delete<{ msg: string }>(this.apiUrl + 'auth/logout', {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          this.user.set(null);
        })
      );
  }

  refreshToken() {
    return this.http.get<{ msg: string }>(this.apiUrl + 'auth/refresh-token', {
      withCredentials: true,
    });
  }
}
