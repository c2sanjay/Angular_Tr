import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaArrowLeftIconComponent } from './fa-arrow-left-icon.component';

describe('FaArrowLeftIconComponent', () => {
  let component: FaArrowLeftIconComponent;
  let fixture: ComponentFixture<FaArrowLeftIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FaArrowLeftIconComponent],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FaArrowLeftIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
