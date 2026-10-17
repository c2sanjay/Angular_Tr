import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KendoConfirmDialogComponent } from './kendo-confirm-dialog.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('KendoConfirmDialogComponent', () => {
  let component: KendoConfirmDialogComponent;
  let fixture: ComponentFixture<KendoConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KendoConfirmDialogComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(KendoConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit "yes" when onClose("yes") is called', () => {
    const emitSpy = jest.spyOn(component.closeDialog, 'emit');
    component.onClose('yes');
    expect(emitSpy).toHaveBeenCalledWith('yes');
  });

  it('should emit "no" when onClose("no") is called', () => {
    const emitSpy = jest.spyOn(component.closeDialog, 'emit');
    component.onClose('no');
    expect(emitSpy).toHaveBeenCalledWith('no');
  });
});
