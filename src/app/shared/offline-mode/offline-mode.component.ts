import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-offline-mode',
  templateUrl: './offline-mode.component.html',
})
export class OfflineModeComponent {
  isOnline: boolean = navigator.onLine;

  @HostListener('window:online')
  online() {
    this.isOnline = true;
  }
  @HostListener('window:offline') offline() {
    this.isOnline = false;
  }
}
