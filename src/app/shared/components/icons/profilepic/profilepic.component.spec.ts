import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilepicComponent } from './profilepic.component';

describe('ProfilepicComponent', () => {
  let component: ProfilepicComponent;
  let fixture: ComponentFixture<ProfilepicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProfilepicComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilepicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ProfilepicComponent', () => {
    expect(component).toBeTruthy();
  });
});
