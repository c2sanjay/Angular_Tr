import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteiconComponent } from './deleteicon.component';

describe('DeleteiconComponent', () => {
  let component: DeleteiconComponent;
  let fixture: ComponentFixture<DeleteiconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteiconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteiconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the DeleteiconComponent', () => {
    expect(component).toBeTruthy();
  });
});
