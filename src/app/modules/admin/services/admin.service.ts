import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CommonApiService } from 'src/app/shared/services/common-api.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  constructor(
    private readonly http: HttpClient,
    private readonly commonApiService: CommonApiService,
  ) {}

  getProjectList(): Observable<any[]> {
    return this.http.get<any>(`${environment.formIoUrl}/ashcroftterminal`).pipe(
      catchError((error) => {
        const errorMessage = this.commonApiService.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sgetCustomersById(customerId: number[]): Observable<any> {
    return this.http
      .get(`${environment.TrinityURL}/Customers/${customerId}`)
      .pipe(
        catchError((error) => {
          const errorMessage = this.commonApiService.getErrorMessage(error);
          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  getFormsAssignedById(customerId: number): Observable<any> {
    return this.http
      .get(
        `${environment.trinityRailApiUrl}/FormsAssignToCustomer/${customerId}`,
      )
      .pipe(
        catchError((error) => {
          const errorMessage = this.commonApiService.getErrorMessage(error);
          return throwError(() => new Error(errorMessage));
        }),
      );
  }
}
