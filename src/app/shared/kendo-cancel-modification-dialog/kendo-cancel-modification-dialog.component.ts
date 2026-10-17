import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kendo-cancel-modification-dialog',
  standalone: true,
  imports: [KENDO_INPUTS, KENDO_DIALOGS, KENDO_BUTTONS, CommonModule],
  templateUrl: './kendo-cancel-modification-dialog.component.html',
})
export class KendoCancelModificationDialogComponent {
  @Input() message: string = '';
  @Input() type: 'danger' | 'warning' | 'info' | 'success' | null = null;
  @Output() closeDialog = new EventEmitter<string>();

  onClose(status: string) {
    this.closeDialog.emit(status);
  }
  
}
