import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineModeComponent } from './offline-mode.component';

describe('OfflineModeComponent', () => {
  let component: OfflineModeComponent;
  let fixture: ComponentFixture<OfflineModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OfflineModeComponent], 
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set isOnline to true when online() is called', () => {
    component.isOnline = false;
    component.online();
    expect(component.isOnline).toBe(true);
  });

  it('should set isOnline to false when offline() is called', () => {
    component.isOnline = true;
    component.offline();
    expect(component.isOnline).toBe(false);
  });
});
