import { Component, EventEmitter, Output } from '@angular/core';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';

const EXPORT_TYPE_OPTIONS = [
  { text: 'CSV', value: 'CSV' },
  { text: 'EXCEL', value: 'EXCEL' },
  { text: 'PDF', value: 'PDF' },
];

@Component({
  selector: 'app-kendo-export-dialog',
  standalone: true,
  imports: [KENDO_INPUTS, KENDO_DIALOGS, KENDO_BUTTONS, DropDownsModule],
  templateUrl: './kendo-export-dialog.component.html',
})
export class KendoExportDialogComponent {
  @Output() closeDialog = new EventEmitter<{
    confirmed: boolean;
    value?: string;
  }>();

  options = EXPORT_TYPE_OPTIONS;
  selectedOption: any;

  public onCancel(): void {
    this.closeDialog.emit({ confirmed: false });
  }

  public onConfirm(): void {
    this.closeDialog.emit({ confirmed: true, value: this.selectedOption });
  }

  public onDropdownChange(format: any): void {
    this.selectedOption = format;
  }
}
