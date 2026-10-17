import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsComponent } from './tabs.component';
import { TabComponent } from './tab.component';
import { Component, EventEmitter, QueryList } from '@angular/core';

@Component({
  selector: 'app-mock-tab',
  template: '<ng-content></ng-content>',
})
class MockTabComponent extends TabComponent {}

@Component({
  template: `
    <app-tabs>
      <app-mock-tab></app-mock-tab>
      <app-mock-tab></app-mock-tab>
      <app-mock-tab></app-mock-tab>
    </app-tabs>
  `,
})
class TestHostComponent {}

describe('TabsComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TabsComponent;

  const mockTabs = () => {
    const tabs = new QueryList<TabComponent>();
    (tabs as any).reset([
      {} as TabComponent,
      {} as TabComponent,
      {} as TabComponent,
    ]);
    return tabs;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabsComponent, MockTabComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const tabsComponentEl = fixture.debugElement.children[0].componentInstance;
    component = tabsComponentEl;

    component.tabs = mockTabs();
    component.tabChanged = new EventEmitter<number>();
    jest.spyOn(component.tabChanged, 'emit');
  });

  it('should initialize selectedIndex to 2', () => {
    expect(component.selectedIndex).toBe(2);
  });

  it('should not change selectedIndex or emit if index is invalid', () => {
    const originalIndex = component.selectedIndex;

    component.selectTab(-1);
    component.selectTab(10);

    expect(component.selectedIndex).toBe(originalIndex);
    expect(component.tabChanged.emit).not.toHaveBeenCalled();
  });

  it('should update selectedIndex and emit tabChanged if index is valid', () => {
    component.selectTab(1);

    expect(component.selectedIndex).toBe(1);
    expect(component.tabChanged.emit).toHaveBeenCalledWith(1);
  });

  it('should not change selectedIndex or emit tabChanged if index is out of bounds', () => {
    component.selectedIndex = 0;

    component.selectTab(-1);
    component.selectTab(10);

    expect(component.selectedIndex).toBe(0);
    expect(component.tabChanged.emit).not.toHaveBeenCalled();
  });
  it('should call selectTab with selectedIndex in ngAfterContentInit when tabs exist', () => {
  component.tabs = new QueryList<TabComponent>();
  (component.tabs as any).reset([
    {} as TabComponent,
    {} as TabComponent,
    {} as TabComponent,
  ]);
  component.selectedIndex = 1;

  const spy = jest.spyOn(component, 'selectTab');
  component.ngAfterContentInit();

  expect(spy).toHaveBeenCalledWith(1);
});

});
