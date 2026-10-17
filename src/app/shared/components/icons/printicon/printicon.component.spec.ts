import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrinticonComponent } from './printicon.component';

describe('PrinticonComponent', () => {
  let component: PrinticonComponent;
  let fixture: ComponentFixture<PrinticonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrinticonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinticonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the PrinticonComponent', () => {
    expect(component).toBeTruthy();
  });
});
