import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KendoCancelModificationDialogComponent } from './kendo-cancel-modification-dialog.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('KendoCancelModificationDialogComponent', () => {
  let component: KendoCancelModificationDialogComponent;
  let fixture: ComponentFixture<KendoCancelModificationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KendoCancelModificationDialogComponent],
      providers: [provideNoopAnimations()], 
    }).compileComponents();

    fixture = TestBed.createComponent(KendoCancelModificationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit status on onClose', () => {
    const spy = jest.spyOn(component.closeDialog, 'emit');
    component.onClose('confirmed');
    expect(spy).toHaveBeenCalledWith('confirmed');
  });
});
