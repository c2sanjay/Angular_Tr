import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditiconComponent } from './editicon.component';

describe('EditiconComponent', () => {
  let component: EditiconComponent;
  let fixture: ComponentFixture<EditiconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditiconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditiconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the EditiconComponent', () => {
    expect(component).toBeTruthy();
  });
});
