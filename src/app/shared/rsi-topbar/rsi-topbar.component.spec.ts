import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RsiTopbarComponent } from './rsi-topbar.component';
import { AuthService } from '@auth0/auth0-angular';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { ElementRef } from '@angular/core';
import { of } from 'rxjs';

describe('RsiTopbarComponent', () => {
  let component: RsiTopbarComponent;
  let fixture: ComponentFixture<RsiTopbarComponent>;

  const mockAuthService = {
    logout: jest.fn(),
     user$: of({ email: 'test@example.com' }),
  };

  const mockAccessRoleService = {
    getRsiServices: jest.fn().mockReturnValue([
      { name: 'Service A' },
      { name: 'Service B' },
    ]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsiTopbarComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AccessRoleService, useValue: mockAccessRoleService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RsiTopbarComponent);
    component = fixture.componentInstance;

    // Mock ElementRefs
    component.appsAnchor = { nativeElement: document.createElement('div') } as ElementRef;
    component.logoutAnchor = { nativeElement: document.createElement('div') } as ElementRef;
    component.appsPopup = { nativeElement: document.createElement('div') } as ElementRef;
    component.logoutPopup = { nativeElement: document.createElement('div') } as ElementRef;

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call getRsiServices on init', () => {
    component.ngOnInit();
    expect(mockAccessRoleService.getRsiServices).toHaveBeenCalled();
    expect(component.rsiServices.length).toBe(2);
  });

  it('should toggle apps popup', () => {
    component.toggleAppsPopup(true);
    expect(component.showApps).toBe(true);
    expect(component.showLogout).toBe(false);

    component.toggleAppsPopup(false);
    expect(component.showApps).toBe(false);
  });

  it('should toggle logout popup', () => {
    component.toggleLogoutPopup(true);
    expect(component.showLogout).toBe(true);
    expect(component.showApps).toBe(false);

    component.toggleLogoutPopup(false);
    expect(component.showLogout).toBe(false);
  });

  it('should handle document click and close both popups if clicked outside', () => {
    const outsideElement = document.createElement('div');
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: outsideElement });

    component.showApps = true;
    component.showLogout = true;

    component.documentClick(event);
    expect(component.showApps).toBe(false);
    expect(component.showLogout).toBe(false);
  });

  it('should not close popups if clicked inside anchor or popup', () => {
    const event = new MouseEvent('click', { bubbles: true });

    Object.defineProperty(event, 'target', {
      value: component.appsAnchor.nativeElement,
    });

    component.showApps = true;
    component.showLogout = true;

    component.documentClick(event);
    expect(component.showApps).toBe(true);
    expect(component.showLogout).toBe(true);
  });

  it('should trigger logout and show dialog', () => {
    component.logout();
    expect(component.showLogoutDialog).toBe(true);
    expect(mockAuthService.logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: window.location.origin },
    });
  });

  it('should show apps popup and hide logout popup when toggleAppsPopup(true) is called', () => {
  component.showLogout = true;

  component.toggleAppsPopup(true);

  expect(component.showApps).toBe(true);
  expect(component.showLogout).toBe(false);
});

it('should hide apps popup when toggleAppsPopup(false) is called', () => {
  component.showApps = true;

  component.toggleAppsPopup(false);

  expect(component.showApps).toBe(false);
  expect(component.showLogout).toBe(false);
});

it('should toggle showApps when no argument is passed', () => {
  component.showApps = false;
  component.showLogout = true;

  component.toggleAppsPopup();

  expect(component.showApps).toBe(true); // toggled from false
  expect(component.showLogout).toBe(false);

  component.toggleAppsPopup();

  expect(component.showApps).toBe(false); // toggled from true
  expect(component.showLogout).toBe(false);
});

it('should explicitly set showLogout to true and showApps to false', () => {
    component.showApps = true;

    component.toggleLogoutPopup(true);

    expect(component.showLogout).toBe(true);
    expect(component.showApps).toBe(false);
  });

  it('should explicitly set showLogout to false and showApps to false', () => {
    component.showLogout = true;
    component.showApps = true;

    component.toggleLogoutPopup(false);

    expect(component.showLogout).toBe(false);
    expect(component.showApps).toBe(false);
  });

  it('should toggle showLogout if no argument is passed (from false to true)', () => {
    component.showLogout = false;
    component.showApps = true;

    component.toggleLogoutPopup();

    expect(component.showLogout).toBe(true);
    expect(component.showApps).toBe(false);
  });

  it('should toggle showLogout if no argument is passed (from true to false)', () => {
    component.showLogout = true;
    component.showApps = true;

    component.toggleLogoutPopup();

    expect(component.showLogout).toBe(false);
    expect(component.showApps).toBe(false);
  });

  
  describe('contains()', () => {
    const target = document.createElement('div');

    beforeEach(() => {
      component.appsAnchor = {
        nativeElement: { contains: jest.fn().mockReturnValue(false) },
      } as any;

      component.appsPopup = {
        nativeElement: { contains: jest.fn().mockReturnValue(false) },
      } as any;

      component.logoutAnchor = {
        nativeElement: { contains: jest.fn().mockReturnValue(false) },
      } as any;

      component.logoutPopup = {
        nativeElement: { contains: jest.fn().mockReturnValue(false) },
      } as any;
    });

    it('should return true if target is inside appsAnchor', () => {
      component.appsAnchor.nativeElement.contains.mockReturnValue(true);
      expect(component['contains'](target)).toBe(true);
    });

    it('should return false if target is not inside any elements', () => {
      expect(component['contains'](target)).toBe(false);
    });

    it('should return true if appsPopup contains the target', () => {
    component.appsAnchor = { nativeElement: { contains: jest.fn().mockReturnValue(undefined) } } as any;
    component.appsPopup = { nativeElement: { contains: jest.fn().mockReturnValue(true) } } as any;

    const result = (component as any).contains(target);
    expect(result).toBe(true);
  });

  it('should return false if appsPopup does not contain the target and fallback to logoutAnchor returns undefined', () => {
    component.appsAnchor = { nativeElement: { contains: jest.fn().mockReturnValue(undefined) } } as any;
    component.appsPopup = { nativeElement: { contains: jest.fn().mockReturnValue(false) } } as any;
    component.logoutAnchor = { nativeElement: { contains: jest.fn().mockReturnValue(undefined) } } as any;
    component.logoutPopup = { nativeElement: { contains: jest.fn().mockReturnValue(false) } } as any;

    const result = (component as any).contains(target);
    expect(result).toBe(false);
  });

  });

});
