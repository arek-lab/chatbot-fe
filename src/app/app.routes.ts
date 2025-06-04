import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ChatbotComponent,
    canActivate: [authGuard],
  },
  { path: 'auth/:authType', component: AuthComponent },
];
