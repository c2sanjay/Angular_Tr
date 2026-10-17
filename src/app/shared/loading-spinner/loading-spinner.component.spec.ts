import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoadingSpinnerComponent], 
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.isLoading).toBe(false);
    expect(component.isRelative).toBe(true);
  });

  it('should accept input values', () => {
    component.isLoading = true;
    component.isRelative = false;
    fixture.detectChanges();

    expect(component.isLoading).toBe(true);
    expect(component.isRelative).toBe(false);
  });
});
