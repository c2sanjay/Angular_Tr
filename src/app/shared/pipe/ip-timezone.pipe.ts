import { Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';
@Pipe({
  name: 'ipTimezone',
})
export class IpTimezonePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '-';

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const dateTime = DateTime.fromISO(value.toString(), {
      zone: 'utc',
    }).setZone(userTz);

    return dateTime.toFormat('MM/dd/yyyy HH:mm:ss');
  }
}
