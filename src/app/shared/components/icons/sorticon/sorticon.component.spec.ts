import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SorticonComponent } from './sorticon.component';

describe('SorticonComponent', () => {
  let component: SorticonComponent;
  let fixture: ComponentFixture<SorticonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SorticonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SorticonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
