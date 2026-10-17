import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KendoLoadingDialogComponent } from './kendo-loading-dialog.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('KendoLoadingDialogComponent', () => {
  let component: KendoLoadingDialogComponent;
  let fixture: ComponentFixture<KendoLoadingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KendoLoadingDialogComponent],
      providers: [provideNoopAnimations()], // disables animations
    }).compileComponents();

    fixture = TestBed.createComponent(KendoLoadingDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should bind the message input', () => {
    component.message = 'Loading data...';
    fixture.detectChanges();
    expect(component.message).toBe('Loading data...');
  });

  it('should render the message in template (if applicable)', () => {
    component.message = 'Please wait...';
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Please wait...');
  });
});
