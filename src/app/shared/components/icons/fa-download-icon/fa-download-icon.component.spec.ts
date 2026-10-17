import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaDownloadIconComponent } from './fa-download-icon.component';

describe('FaDownloadIconComponent', () => {
  let component: FaDownloadIconComponent;
  let fixture: ComponentFixture<FaDownloadIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FaDownloadIconComponent],  
    }).compileComponents();

    fixture = TestBed.createComponent(FaDownloadIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
