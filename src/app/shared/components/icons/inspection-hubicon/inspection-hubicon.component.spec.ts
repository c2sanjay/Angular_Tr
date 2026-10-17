import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InspectionHubiconComponent } from './inspection-hubicon.component';

describe('InspectionHubiconComponent', () => {
  let component: InspectionHubiconComponent;
  let fixture: ComponentFixture<InspectionHubiconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InspectionHubiconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InspectionHubiconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
