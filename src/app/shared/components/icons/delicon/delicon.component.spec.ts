import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeliconComponent } from './delicon.component';

describe('DeliconComponent', () => {
  let component: DeliconComponent;
  let fixture: ComponentFixture<DeliconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeliconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the DeliconComponent', () => {
    expect(component).toBeTruthy();
  });
});
