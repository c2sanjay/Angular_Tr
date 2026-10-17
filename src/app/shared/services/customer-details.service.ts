import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CustomerDetailService {
  private currentCustomerName: string = '';

    setCustomerName(name: string) {
    this.currentCustomerName = name;
  }

  getCustomerName(): string {
    return this.currentCustomerName;
  }
}
