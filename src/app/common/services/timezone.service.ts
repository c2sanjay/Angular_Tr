// timezone.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TimezoneService {
  public timezone: string = 'UTC';

  constructor(private readonly http: HttpClient) {
    this.loadTimezone(); //NOSONAR
  }

  async loadTimezone() {
    const cached = localStorage.getItem('user_timezone');
    if (cached) {
      this.timezone = cached;
      return;
    }

    try {
      const res: any = await firstValueFrom(this.http.get('https://ipwho.is/'));
      this.timezone = res.timezone?.id ?? 'UTC';
    } catch {
      this.timezone = 'UTC';
    }
  }

  getTimezone() {
    return this.timezone;
  }
}
