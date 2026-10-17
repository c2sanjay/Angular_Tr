import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { TabComponent } from './tab.component';

@Component({
  template: `
    <app-tab label="Test Tab">
      <ng-template #tabContent let-data>
        <div>Projected Content {{ data }}</div>
      </ng-template>
    </app-tab>
  `,
})
class TestHostComponent {
  @ViewChild(TabComponent) tabComponent!: TabComponent;
  @ViewChild('tabContent') templateRef!: TemplateRef<any>;
}

describe('TabComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges(); 
  });

  it('should accept label as input', () => {
    const tab = hostComponent.tabComponent;
    expect(tab.label).toBe('Test Tab');
  });

 
});
