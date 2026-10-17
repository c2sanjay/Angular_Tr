import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingComponent } from './landing/landing.component';
import { AuthRouting } from './auth.routing';
import { CommonAppModule } from '../shared/common.module';

@NgModule({
  declarations: [LandingComponent],
  imports: [CommonModule, CommonAppModule, AuthRouting],
  exports: [LandingComponent],
})
export class AuthModule {}
