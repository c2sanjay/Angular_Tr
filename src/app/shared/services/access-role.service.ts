import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccessRoleService {
  private userRole: string = '';
  private rsiAppServices: any[] = [];

  setRole(role: string) {
    this.userRole = role;
  }

  getRole(): string {
    return this.userRole;
  }

  hasRole(expectedRoles: string[]): boolean {
    return expectedRoles.includes(this.userRole);
  }

  isSet(): boolean {
    return this.userRole !== '';
  }

  setRsiServices(objects: any[]) {
    this.rsiAppServices = objects;
  }

  getRsiServices(): any[] {
    return this.rsiAppServices;
  }

  clearRsiServices() {
    this.rsiAppServices = [];
  }
}
