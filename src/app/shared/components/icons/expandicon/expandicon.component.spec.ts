import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpandiconComponent } from './expandicon.component';

describe('ExpandiconComponent', () => {
  let component: ExpandiconComponent;
  let fixture: ComponentFixture<ExpandiconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExpandiconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpandiconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
