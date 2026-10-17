import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageNotFoundComponent } from './page-not-found.component';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PageNotFoundComponent', () => {
  let component: PageNotFoundComponent;
  let fixture: ComponentFixture<PageNotFoundComponent>;

   const mockRouter = {
    navigate: jest.fn()
  };

  const mockLocation = {
    back: jest.fn()
  };

  const mockAccessRoleService = {
    // stub/mock methods here if needed
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageNotFoundComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation },
        { provide: AccessRoleService, useValue: mockAccessRoleService }
      ],
      schemas: [NO_ERRORS_SCHEMA] // ignore unknown tags in HTML
    }).compileComponents();

    fixture = TestBed.createComponent(PageNotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to dashboard when redirectToDashboard is called', () => {
    component.redirectToDashboard();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['dashboard']);
  });

  it('should call location.back when goBack is called', () => {
    component.goBack();
    expect(mockLocation.back).toHaveBeenCalled();
  });
});
