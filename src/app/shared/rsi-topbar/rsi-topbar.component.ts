import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_POPUP } from '@progress/kendo-angular-popup';
import { AccessRoleService } from 'src/app/shared/services/access-role.service';
import { AuthService, LogoutOptions } from '@auth0/auth0-angular';
import { KendoLoadingDialogComponent } from '../kendo-loading-dialog/kendo-loading-dialog.component';

@Component({
  selector: 'app-rsi-topbar',
  standalone: true,
  imports: [
    KENDO_POPUP,
    KENDO_INPUTS,
    CommonModule,
    KendoLoadingDialogComponent,
  ],
  templateUrl: './rsi-topbar.component.html',
  styleUrl: './rsi-topbar.component.scss',
})
export class RsiTopbarComponent implements OnInit {
  public showApps = false;
  public showLogout = false;
  public showLogoutDialog = false;

  public rsiServices: any[] = [];

  @ViewChild('appsAnchor', { read: ElementRef }) public appsAnchor!: ElementRef;
  @ViewChild('logoutAnchor', { read: ElementRef })
  public logoutAnchor!: ElementRef;
  @ViewChild('appsPopup', { read: ElementRef }) public appsPopup!: ElementRef;
  @ViewChild('logoutPopup', { read: ElementRef })
  public logoutPopup!: ElementRef;

  @HostListener('document:click', ['$event'])
  public documentClick(event: MouseEvent): void {
    const target = event.target;
    if (target && !this.contains(target)) {
      this.toggleAppsPopup(false);
      this.toggleLogoutPopup(false);
    }
  }

  constructor(
    private readonly accessRoleService: AccessRoleService,
    public auth0: AuthService,
  ) {}

  ngOnInit() {
    this.rsiServices = this.accessRoleService.getRsiServices();
  }

  public toggleAppsPopup(showApps?: boolean): void {
    this.showApps = showApps ?? !this.showApps;
    this.showLogout = false;
  }

  public toggleLogoutPopup(showLogout?: boolean): void {
    this.showLogout = showLogout ?? !this.showLogout;
    this.showApps = false;
  }

  private contains(target: EventTarget): boolean {
    return (
      this.appsAnchor?.nativeElement?.contains(target) ||
      (this.appsPopup
        ? this.appsPopup.nativeElement.contains(target)
        : false) ||
      this.logoutAnchor?.nativeElement?.contains(target) ||
      (this.logoutPopup
        ? this.logoutPopup.nativeElement.contains(target)
        : false)
    ); //NOSONAR
  }

  public logout(): void {
    this.showLogoutDialog = true;
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    } as LogoutOptions);
  }
}
