import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.css',
})
export class ConfirmModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Xác nhận xóa';
  @Input() message = 'Bạn có chắc chắn muốn xóa ghi chú này không?';
  @Input() confirmText = 'Xóa (Enter)';
  @Input() cancelText = 'Hủy (Esc)';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('confirmBtn') confirmBtn?: ElementRef<HTMLButtonElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      setTimeout(() => {
        this.confirmBtn?.nativeElement?.focus();
      }, 50);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.onConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.onCancel();
    }
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
