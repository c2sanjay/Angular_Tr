import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout/layout.component';
import { IpTimezonePipe } from './pipe/ip-timezone.pipe';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [IpTimezonePipe, LayoutComponent],
  imports: [CommonModule, RouterModule],
  exports: [IpTimezonePipe, CommonModule, LayoutComponent, RouterModule],
})
export class SharedModule {}
