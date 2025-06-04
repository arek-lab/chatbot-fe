import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private authService = inject(AuthService);
  // ngOnInit() {
  //   this.authService.getCurrentUser().subscribe({
  //     next: res => {
  //       this.authService.user.set(res.user);
  //     },
  //     error: () => {
  //       this.authService.user.set(null);
  //     },
  //   });
  // }
}
