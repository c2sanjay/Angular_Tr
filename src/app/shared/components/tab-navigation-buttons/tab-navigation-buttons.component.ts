import { Component, ElementRef, Input } from '@angular/core';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';

@Component({
  selector: 'app-tab-navigation-buttons',
  templateUrl: './tab-navigation-buttons.component.html',
})
export class TabNavigationButtonsComponent {
  constructor(public tabNavigationService: TabNavigationService) {}
  @Input() formContainer!: ElementRef;

  // For form.io Prev and Next
  onPreviousTab() {
    this.tabNavigationService.goToPreviousTab(this.formContainer);
  }

  onNextTab() {
    this.tabNavigationService.goToNextTab(this.formContainer);
  }
}
