import { Component, inject } from '@angular/core';
import { AppService } from '../services/app.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  appService = inject(AppService);
  isDeleting = this.appService.isDeleting;

  showMenu(event: Event) {
    const input = (event.target as HTMLElement)
      .closest('.menu-icon')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

    const isChecked = input?.checked;
    this.appService.showMenu.set(!isChecked);
  }
}
