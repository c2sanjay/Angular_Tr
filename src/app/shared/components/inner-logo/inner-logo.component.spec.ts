import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnerLogoComponent } from './inner-logo.component';

describe('InnerLogoComponent', () => {
  let component: InnerLogoComponent;
  let fixture: ComponentFixture<InnerLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnerLogoComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InnerLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
