import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewiconComponent } from './viewicon.component';

describe('ViewiconComponent', () => {
  let component: ViewiconComponent;
  let fixture: ComponentFixture<ViewiconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewiconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewiconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ViewiconComponent', () => {
    expect(component).toBeTruthy();
  });
});
