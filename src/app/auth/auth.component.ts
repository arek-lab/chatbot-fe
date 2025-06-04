import { Component, inject, input } from '@angular/core';
import { AuthService } from './auth.service';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  private authService = inject(AuthService);
  authType = input.required<'login' | 'register'>();
  private router = inject(Router);

  authForm = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(5)],
    }),
  });

  onSubmit() {
    if (this.authForm.invalid) return;
    const { email, password } = this.authForm.value;
    if (this.authForm.invalid) return;
    const action$ =
      this.authType() === 'register'
        ? this.authService.register(email!, password!)
        : this.authService.login(email!, password!);

    action$.subscribe({
      next: res => {
        this.router.navigate(['/']);
      },
      error: err => {
        console.error(`${this.authType()} error`, err);
      },
    });
  }
}
