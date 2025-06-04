import { Component, EventEmitter, input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  thirdBtn = input<boolean>();
  title = input.required<string>();
  description = input.required<string>();
  @Output() clicked = new EventEmitter<string>();

  onSubmit() {
    this.clicked.emit('submit');
  }
  onCancel() {
    this.clicked.emit('cancel');
  }
  onContinue() {
    this.clicked.emit('continue');
  }
}
