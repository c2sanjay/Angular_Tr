import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaArrowRightIconComponent } from './fa-arrow-right-icon.component';

describe('FaArrowRightIconComponent', () => {
  let component: FaArrowRightIconComponent;
  let fixture: ComponentFixture<FaArrowRightIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FaArrowRightIconComponent], 
    }).compileComponents();

    fixture = TestBed.createComponent(FaArrowRightIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
