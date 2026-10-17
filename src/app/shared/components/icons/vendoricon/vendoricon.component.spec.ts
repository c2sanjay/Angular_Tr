import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendoriconComponent } from './vendoricon.component';

describe('VendoriconComponent', () => {
  let component: VendoriconComponent;
  let fixture: ComponentFixture<VendoriconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VendoriconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VendoriconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the VendoriconComponent', () => {
    expect(component).toBeTruthy();
  });
});
