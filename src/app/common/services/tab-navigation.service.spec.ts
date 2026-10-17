import { TabNavigationService } from './tab-navigation.service';
import { ElementRef } from '@angular/core';

describe('TabNavigationService', () => {
  let service: TabNavigationService;
  let container: HTMLElement;
  let elementRef: ElementRef<HTMLElement>;
  let activateTabSpy: jest.SpyInstance;
  let scrollToTopSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new TabNavigationService();
    container = document.createElement('div');
    elementRef = new ElementRef<HTMLElement>(container);
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    activateTabSpy = jest
      .spyOn(TabNavigationService.prototype as any, 'activateTab')
      .mockImplementation(() => {});
    scrollToTopSpy = jest
      .spyOn(service as any, 'scrollToTop')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    activateTabSpy.mockRestore();
    scrollToTopSpy.mockRestore();
    jest.restoreAllMocks();
    container.innerHTML = '';
  });

  describe('setupTabNavigation', () => {
    it('should set isTabNavigationVisible=true and totalTabs when anchors exist', () => {
      for (let i = 0; i < 3; i++) {
        const a = document.createElement('a');
        a.setAttribute('ref', 'tabLink-tabs');
        container.appendChild(a);
      }

      service.setupTabNavigation(elementRef);

      expect(service.isTabNavigationVisible).toBe(true);
      expect(service.totalTabs).toBe(3);

      const links = container.querySelectorAll('a[ref="tabLink-tabs"]');
      links.forEach((link, idx) => {
        link.dispatchEvent(new MouseEvent('click'));
        expect(service.currentTabIndex).toBe(idx);
      });
    });

    it('should set isTabNavigationVisible=false when no anchors', () => {
      service.setupTabNavigation(elementRef);
      expect(service.isTabNavigationVisible).toBe(false);
      expect(service.totalTabs).toBe(0);
    });

    it('should decrement currentTabIndex and call activateTab', () => {
      service.currentTabIndex = 2;
      service.goToPreviousTab(elementRef);

      expect(service.currentTabIndex).toBe(1);
      expect(activateTabSpy).toHaveBeenCalledWith(elementRef, 1);
    });

    it('should not call activateTab when currentTabIndex is 0', () => {
      service.currentTabIndex = 0;
      service.goToPreviousTab(elementRef);

      expect(service.currentTabIndex).toBe(0);
      expect(activateTabSpy).not.toHaveBeenCalled();
    });

    it('should increment currentTabIndex and call activateTab if not on last tab', () => {
      service.currentTabIndex = 1;
      service.totalTabs = 3;

      service.goToNextTab(elementRef);

      expect(service.currentTabIndex).toBe(2);
      expect(activateTabSpy).toHaveBeenCalledWith(elementRef, 2);
    });

    it('should not change index or call activateTab if already on last tab', () => {
      service.currentTabIndex = 2;
      service.totalTabs = 3;

      service.goToNextTab(elementRef);

      expect(service.currentTabIndex).toBe(2);
      expect(activateTabSpy).not.toHaveBeenCalled();
    });
  });

  describe('activateTab', () => {
  beforeEach(() => {
    // Reset container and elementRef for each test
    container = document.createElement('div');
    elementRef = new ElementRef<HTMLElement>(container);

    // ✅ Do NOT mock activateTab here — we want the real implementation
    activateTabSpy.mockRestore();
  });

  it('should click the correct tab and call scrollToTop when index is valid', () => {
    // Create two mock tab elements
    const tab1 = document.createElement('a');
    const tab2 = document.createElement('a');

    // Set the required ref attribute
    tab1.setAttribute('ref', 'tabLink-tabs');
    tab2.setAttribute('ref', 'tabLink-tabs');

    // Add mock click handlers
    tab1.click = jest.fn();
    tab2.click = jest.fn();

    // Append to container
    container.appendChild(tab1);
    container.appendChild(tab2);

    // Call the real activateTab method
    service.activateTab(elementRef, 1);

    // Expect tab2 (index 1) to be clicked
    expect(tab2.click).toHaveBeenCalled();
    expect(tab1.click).not.toHaveBeenCalled();

    // Expect scrollToTop to be called
    expect(scrollToTopSpy).toHaveBeenCalledWith(elementRef);
  });

  it('should not call click or scrollToTop when index is out of bounds', () => {
    // Create one tab
    const tab1 = document.createElement('a');
    tab1.setAttribute('ref', 'tabLink-tabs');
    tab1.click = jest.fn();
    container.appendChild(tab1);

    // Index 5 is out of bounds
    service.activateTab(elementRef, 5);

    // Expect click NOT to be called
    expect(tab1.click).not.toHaveBeenCalled();

    // Expect scrollToTop NOT to be called
    expect(scrollToTopSpy).not.toHaveBeenCalled();
  });

  it('should call scrollIntoView with correct options', () => {
  const div = document.createElement('div');

  const scrollIntoViewMock = jest.fn();
  // @ts-ignore - override read-only property
  div.scrollIntoView = scrollIntoViewMock;

  const elementRef = { nativeElement: div } as ElementRef<HTMLElement>;

  //  Restore the real scrollToTop method (in case it was mocked globally)
  jest.spyOn(service as any, 'scrollToTop')
    .mockRestore?.(); // optional chaining in case not mocked

  (service as any).scrollToTop(elementRef);

  //  Assert scrollIntoView was called with expected params
  expect(scrollIntoViewMock).toHaveBeenCalledWith({
    behavior: 'smooth',
    block: 'start',
  });
});

});

});
