import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormmgmticonComponent } from './formmgmticon.component';

describe('FormmgmticonComponent', () => {
  let component: FormmgmticonComponent;
  let fixture: ComponentFixture<FormmgmticonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormmgmticonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormmgmticonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the FormmgmticonComponent', () => {
    expect(component).toBeTruthy();
  });
});
