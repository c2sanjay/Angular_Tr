import { Injectable } from '@angular/core';

type T_Details = { email: string; username: string; token: string };

@Injectable({ providedIn: 'root' })
export class UserDetailService {
  private userDetails: T_Details = {
    email: '',
    username: '',
    token: '',
  };

  setDetails(details: T_Details) {
    if (this.areDetailsEqual(details, this.userDetails)) {
      return;
    }
    this.userDetails = details;
  }

  getDetails(): T_Details {
    return this.userDetails;
  }

  resetDetails() {
    this.userDetails = { email: '', username: '', token: '' };
  }

  getEmail(): string {
    return this.userDetails.email;
  }

  getUsername(): string {
    return this.userDetails.username;
  }

  getToken(): string {
    return this.userDetails.token;
  }

  private areDetailsEqual(a: T_Details, b: T_Details): boolean {
    return (
      a.email === b.email && a.username === b.username && a.token === b.token
    );
  }
}
