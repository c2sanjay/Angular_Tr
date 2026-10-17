import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TruckpicComponent } from './truckpic.component';

describe('TruckpicComponent', () => {
  let component: TruckpicComponent;
  let fixture: ComponentFixture<TruckpicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TruckpicComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TruckpicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
