import { Component, Input } from '@angular/core';
import { KENDO_DIALOGS } from '@progress/kendo-angular-dialog';

@Component({
  selector: 'app-kendo-loading-dialog',
  standalone: true,
  imports: [KENDO_DIALOGS],
  templateUrl: './kendo-loading-dialog.component.html',
})
export class KendoLoadingDialogComponent {
  @Input() message: string = '';
}
