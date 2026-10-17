import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabNavigationButtonsComponent } from './tab-navigation-buttons.component';
import { TabNavigationService } from 'src/app/common/services/tab-navigation.service';
import { ElementRef } from '@angular/core';

describe('TabNavigationButtonsComponent', () => {
  let component: TabNavigationButtonsComponent;
  let fixture: ComponentFixture<TabNavigationButtonsComponent>;
  let mockTabNavigationService: any;

  beforeEach(async () => {
    mockTabNavigationService = {
      goToPreviousTab: jest.fn(),
      goToNextTab: jest.fn(),
    };

    await TestBed.configureTestingModule({
      declarations: [TabNavigationButtonsComponent],
      providers: [
        { provide: TabNavigationService, useValue: mockTabNavigationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TabNavigationButtonsComponent);
    component = fixture.componentInstance;

    // Create a dummy form container
    component.formContainer = {
      nativeElement: document.createElement('div')
    } as ElementRef;

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call goToPreviousTab with formContainer', () => {
    component.onPreviousTab();
    expect(mockTabNavigationService.goToPreviousTab).toHaveBeenCalledWith(component.formContainer);
  });

  it('should call goToNextTab with formContainer', () => {
    component.onNextTab();
    expect(mockTabNavigationService.goToNextTab).toHaveBeenCalledWith(component.formContainer);
  });
});
