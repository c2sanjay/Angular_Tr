import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonAppModule } from '../common.module';
import { Router, NavigationEnd } from '@angular/router';
import { AccessRoleService } from '../services/access-role.service';
import { UserDetailService } from '../services/user-details.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-rsi-sidebar',
  standalone: true,
  imports: [CommonAppModule],
  templateUrl: './rsi-sidebar.component.html',
  styleUrl: './rsi-sidebar.component.scss',
})
export class RsiSidebarComponent implements OnInit {
  public showMenu = false;
  public userRole: string = '';
  public userDetails: any = {};
  public currentRoute: string = '';

  constructor(
    private readonly router: Router,
    private readonly accessRoleService: AccessRoleService,
    private readonly userDetailService: UserDetailService,
  ) {}

  @ViewChild('menuAnchor', { read: ElementRef }) public menuAnchor!: ElementRef;
  @ViewChild('menuPopup', { read: ElementRef }) public menuPopup!: ElementRef;

  @HostListener('document:click', ['$event'])
  public documentClick(event: MouseEvent): void {
    const target = event.target;
    if (target && !this.contains(target)) {
      this.togglemenuPopup(false);
    }
  }

  public togglemenuPopup(showMenu?: boolean): void {
    this.showMenu = showMenu ?? !this.showMenu;
  }

  private contains(target: EventTarget): boolean {
    return (
      this.menuAnchor?.nativeElement?.contains(target) ??
      (this.menuPopup ? this.menuPopup.nativeElement.contains(target) : false)
    );
  }

  ngOnInit(): void {
    this.userRole = this.accessRoleService.getRole();
    this.userDetails = this.userDetailService.getDetails();

    this.currentRoute = this.router.url;
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }
}
