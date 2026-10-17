import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  getFormListing(): Observable<any> {
    const headers = new HttpHeaders({ 'x-token': environment.apiKey });
    return this.http.get(`${environment.formIoUrl}/form?limit=150`, {
      headers,
    });
  }

  getUser(): Observable<any> {
    return this.http.get(`${environment.formIoUrl}/user`);
  }
}
