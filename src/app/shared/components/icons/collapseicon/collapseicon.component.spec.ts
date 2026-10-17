import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollapseiconComponent } from './collapseicon.component';

describe('CollapseiconComponent', () => {
  let component: CollapseiconComponent;
  let fixture: ComponentFixture<CollapseiconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CollapseiconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CollapseiconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
