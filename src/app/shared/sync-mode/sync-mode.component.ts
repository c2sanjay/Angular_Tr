import { Component, HostListener, Input } from '@angular/core';

@Component({
  selector: 'app-sync-mode',
  templateUrl: './sync-mode.component.html',
})
export class SyncModeComponent {
  @Input() isSyncInProgress: boolean = true;

  isOnline: boolean = navigator.onLine;
  @HostListener('window:online')
  online() {
    this.isOnline = true;
  }
  @HostListener('window:offline') offline() {
    this.isOnline = false;
  }
}
