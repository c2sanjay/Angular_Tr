import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kendo-confirm-dialog',
  standalone: true,
  imports: [KENDO_INPUTS, KENDO_DIALOGS, KENDO_BUTTONS, CommonModule],
  templateUrl: './kendo-confirm-dialog.component.html',
})
export class KendoConfirmDialogComponent {
  @Input() message: string = '';
  @Input() title: string = '';
  @Input() type: 'danger' | 'warning' | 'info' | 'success' = 'warning';
  @Output() closeDialog = new EventEmitter<string>();

  onClose(status: string) {
    this.closeDialog.emit(status);
  }
}
