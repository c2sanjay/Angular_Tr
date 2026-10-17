import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncModeComponent } from './sync-mode.component';

describe('SyncModeComponent', () => {
  let component: SyncModeComponent;
  let fixture: ComponentFixture<SyncModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SyncModeComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SyncModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have default isSyncInProgress as true', () => {
    expect(component.isSyncInProgress).toBe(true);
  });

  it('should set isOnline to true if navigator is online', () => {
    expect(typeof component.isOnline).toBe('boolean');
    // Can't guarantee initial state, but should match navigator.onLine
    expect(component.isOnline).toBe(navigator.onLine);
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

  it('should respond to window:online and window:offline events', () => {
    // Simulate offline event
    window.dispatchEvent(new Event('offline'));
    expect(component.isOnline).toBe(false);

    // Simulate online event
    window.dispatchEvent(new Event('online'));
    expect(component.isOnline).toBe(true);
  });
});
