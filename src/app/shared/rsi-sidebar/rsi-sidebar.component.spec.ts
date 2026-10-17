import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RsiSidebarComponent } from './rsi-sidebar.component';
import { CUSTOM_ELEMENTS_SCHEMA, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { AccessRoleService } from '../services/access-role.service';
import { UserDetailService } from '../services/user-details.service';
import { Subject } from 'rxjs';

describe('RsiSidebarComponent', () => {
  let component: RsiSidebarComponent;
  let fixture: ComponentFixture<RsiSidebarComponent>;

  const mockRouterEvents$ = new Subject<any>();

  const mockRouter = {
    url: '/dashboard',
    events: mockRouterEvents$.asObservable(),
    navigate: jest.fn(),
    navigateByUrl: jest.fn(),
    createUrlTree: jest.fn(() => ({})),
    serializeUrl: jest.fn(() => '/dashboard'),
  };

  const mockAccessRoleService = {
    getRole: jest.fn().mockReturnValue('Admin'),
  };

  const mockUserDetailService = {
    getDetails: jest.fn().mockReturnValue({ name: 'Test User' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsiSidebarComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: AccessRoleService, useValue: mockAccessRoleService },
        { provide: UserDetailService, useValue: mockUserDetailService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RsiSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize userRole, userDetails, and currentRoute', () => {
    expect(component.userRole).toBe('Admin');
    expect(component.userDetails).toEqual({ name: 'Test User' });
    expect(component.currentRoute).toBe('/dashboard');
  });

  it('should update currentRoute on NavigationEnd event', () => {
    const newRoute = '/forms';
    mockRouterEvents$.next(new NavigationEnd(1, '/dashboard', newRoute));
    expect(component.currentRoute).toBe(newRoute);
  });

  it('should toggle menu popup visibility', () => {
    component.showMenu = false;
    component.togglemenuPopup();
    expect(component.showMenu).toBe(true);

    component.togglemenuPopup(false);
    expect(component.showMenu).toBe(false);
  });

  it('should close menu if clicked outside of menuAnchor and menuPopup', () => {
    component.menuAnchor = {
      nativeElement: { contains: () => false }
    } as ElementRef;

    component.menuPopup = {
      nativeElement: { contains: () => false }
    } as ElementRef;

    const event = {
      target: document.createElement('div')
    } as unknown as MouseEvent;

    const spy = jest.spyOn(component, 'togglemenuPopup');
    component.documentClick(event);

    expect(spy).toHaveBeenCalledWith(false);
  });
  it('should return true if target is contained within menuAnchor', () => {
  const mockTarget = document.createElement('div');
  const anchorEl = document.createElement('div');
  anchorEl.appendChild(mockTarget);

  component.menuAnchor = {
    nativeElement: anchorEl,
  } as ElementRef;

  component.menuPopup = {
    nativeElement: document.createElement('div'),
  } as ElementRef;

  const result = component['contains'](mockTarget);
  expect(result).toBe(true);
});

it('should return false if target is not contained in either menuAnchor or menuPopup', () => {
  const mockTarget = document.createElement('div');

  component.menuAnchor = {
    nativeElement: document.createElement('div'),
  } as ElementRef;

  component.menuPopup = {
    nativeElement: document.createElement('div'),
  } as ElementRef;

  const result = component['contains'](mockTarget);
  expect(result).toBe(false);
});

it('should return false if both menuAnchor and menuPopup are null/undefined', () => {
  const mockTarget = document.createElement('div');
  component.menuAnchor = undefined as any;
  component.menuPopup = undefined as any;

  const result = component['contains'](mockTarget);
  expect(result).toBe(false);
});

it('should return true if menuPopup contains the target and menuAnchor is null', () => {
  const mockTarget = document.createElement('div');
  const popupEl = document.createElement('div');
  popupEl.appendChild(mockTarget);

  component.menuAnchor = null as any;

  component.menuPopup = {
    nativeElement: popupEl,
  } as ElementRef;

  const result = component['contains'](mockTarget);
  expect(result).toBe(true);
});


});
