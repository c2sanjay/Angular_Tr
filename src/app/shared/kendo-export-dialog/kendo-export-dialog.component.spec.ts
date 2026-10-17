import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KendoExportDialogComponent } from './kendo-export-dialog.component';
import {  provideNoopAnimations } from '@angular/platform-browser/animations';

Object.defineProperty(HTMLElement.prototype, 'animate', {
  value: () => ({
    finished: Promise.resolve(),
    cancel: jest.fn(),
  }),
});

describe('KendoExportDialogComponent', () => {
  let component: KendoExportDialogComponent;
  let fixture: ComponentFixture<KendoExportDialogComponent>;

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [KendoExportDialogComponent],
    providers: [provideNoopAnimations()],
  }).compileComponents();

  fixture = TestBed.createComponent(KendoExportDialogComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
});

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit confirmed false on cancel', () => {
    const spy = jest.spyOn(component.closeDialog, 'emit');
    component.onCancel();
    expect(spy).toHaveBeenCalledWith({ confirmed: false });
  });

  it('should emit confirmed true with selectedOption on confirm', () => {
    const spy = jest.spyOn(component.closeDialog, 'emit');
    component.selectedOption = 'CSV';
    component.onConfirm();
    expect(spy).toHaveBeenCalledWith({ confirmed: true, value: 'CSV' });
  });

  it('should set selectedOption on dropdown change', () => {
    component.onDropdownChange('EXCEL');
    expect(component.selectedOption).toBe('EXCEL');
  });
});
