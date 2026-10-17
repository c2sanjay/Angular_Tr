import { Injectable, ElementRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TabNavigationService {
  totalTabs = 0;
  currentTabIndex = 0;
  isTabNavigationVisible = false;

  constructor() {}

  setupTabNavigation(formContainer: ElementRef<HTMLElement>) {
    const container = formContainer.nativeElement;
    const tabLinks = container.querySelectorAll('a[ref="tabLink-tabs"]');

    if (tabLinks.length > 0) {
      this.isTabNavigationVisible = true;
      this.totalTabs = tabLinks.length;

      // Setup click listeners to track currentTabIndex
      tabLinks.forEach((tabLink, index) => {
        tabLink.addEventListener('click', () => {
          this.currentTabIndex = index;
        });
      });
    } else {
      this.isTabNavigationVisible = false;
    }
  }

  goToPreviousTab(formContainer: ElementRef<HTMLElement>) {
    if (this.currentTabIndex > 0) {
      this.currentTabIndex--;
      this.activateTab(formContainer, this.currentTabIndex);
    }
  }

  goToNextTab(formContainer: ElementRef<HTMLElement>) {
    if (this.currentTabIndex < this.totalTabs - 1) {
      this.currentTabIndex++;
      this.activateTab(formContainer, this.currentTabIndex);
    }
  }

  activateTab(formContainer: ElementRef<HTMLElement>, index: number) {
    const container = formContainer.nativeElement;
    const tabLinks = container.querySelectorAll('a[ref="tabLink-tabs"]');
    if (tabLinks.length > index) {
      (tabLinks[index] as HTMLElement).click();
      this.scrollToTop(formContainer);
    }
  }

  private scrollToTop(formContainer: ElementRef<HTMLElement>) {
    formContainer.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
