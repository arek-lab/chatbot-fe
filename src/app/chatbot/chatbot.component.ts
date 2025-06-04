import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { MenuComponent } from '../menu/menu.component';
import { AppService } from '../services/app.service';
import { CommonModule } from '@angular/common';
import { debounceTime, fromEvent, map, startWith, Subscription } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    RouterOutlet,
    ChatComponent,
    NavbarComponent,
    MenuComponent,
    CommonModule,
  ],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css',
})
export class ChatbotComponent {
  private appService = inject(AppService);
  showMenu = this.appService.showMenu;
  screenWidth = signal<number>(window.innerWidth);
  showMenuMobile = signal<boolean>(window.innerWidth >= 768);

  private resizeSub!: Subscription;

  constructor() {
    this.resizeSub = fromEvent(window, 'resize')
      .pipe(
        debounceTime(100),
        startWith(null),
        map(() => window.innerWidth)
      )
      .subscribe(width => {
        this.screenWidth.set(width);
      });

    effect(
      () => {
        const width = this.screenWidth();
        this.showMenuMobile.set(width >= 768);
        if (width >= 768) this.showMenu.set(true);
        else this.showMenu.set(false);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnDestroy(): void {
    if (this.resizeSub) this.resizeSub.unsubscribe();
  }
}
