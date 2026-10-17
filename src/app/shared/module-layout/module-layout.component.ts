import { Component } from '@angular/core';
import { RsiSidebarComponent } from 'src/app/shared/rsi-sidebar/rsi-sidebar.component';
import { RsiTopbarComponent } from 'src/app/shared/rsi-topbar/rsi-topbar.component';
import { CommonAppModule } from 'src/app/shared/common.module';

@Component({
  selector: 'app-module-layout',
  standalone: true,
  imports: [CommonAppModule, RsiSidebarComponent, RsiTopbarComponent],
  templateUrl: './module-layout.component.html',
})
export class ModuleLayoutComponent {}
