import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { API_ENDPOINTS } from 'src/app/shared/constants/api-endpoints';
@Injectable({
  providedIn: 'root',
})
export class CommonApiService {
  public baseUrl = environment.trinityRailApiUrl;

  constructor(private readonly http: HttpClient) {}

  // Get Form Submission
  _sFormCreation(formdata: any): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.formSubmission.Submission}`;

    return this.http
      .post(url, JSON.stringify(formdata), { responseType: 'json' })
      .pipe(
        tap((response: any) => console.log(' API Response:', response)),
        catchError((error) => {
          const errorMessage = this.getErrorMessage(error);
          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  // Get listing of customer details
  _sCustomerListing(): Observable<any> {
    const url = `${environment.TrinityURL}/Customers`;

    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sGetInspectionFormList(
    customerId: number,
    yardIds: number[] = [],
  ): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormList}`;

    let params = new HttpParams().set('customerId', customerId.toString());

    if (yardIds.length > 0) {
      yardIds.forEach((id) => {
        params = params.append('yardId', id.toString());
      });
    }

    return this.http.get(url, { params }).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sGetCustomerNameByFormName(formName: string[]): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.GetCustomerByFormPath}?formPath=${formName}`;

    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sGetFormMgmtListingYardOnly(yardIds?: number[]): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormList}`;

    let params = new HttpParams();

    if (yardIds && yardIds.length > 0) {
      yardIds.forEach((id) => {
        params = params.append('yardId', id.toString());
      });
    }

    return this.http.get(url, { params }).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  //Inspection Customers Dropdown change
  _sGetInspectionCustomers(
    customerId: string,
    start: string,
    end: string,
    yardId?: number[],
  ): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.InspectionHub.List}`;

    let params = new HttpParams();

    params = params
      .set('customerId', customerId)
      .set('startDate', start)
      .set('endDate', end);

    if (yardId && yardId.length > 0)
      params = params.set('yardId', yardId.join(','));

    return this.http.get(url, { params }).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sInspectionFormDetailGetById(id: number) {
    const url = `${this.baseUrl}/${API_ENDPOINTS.InspectionHub.InspectionFormDetailGetById}?inspectionFormDetailId=${id}`;

    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  //FormManagement Customer Count
  _sInspectionFormCustomerCountList(): Observable<any> {
    const url = `${environment.trinityRailApiUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormCustomerCountList}`;
    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }
  _sDeleteInspectionRecord(id: number) {
    const url = `${this.baseUrl}/${API_ENDPOINTS.InspectionHub.DeleteInspectionFormDetail}/${id}`;

    return this.http.post(url, {}).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }
  // Get listing of RailYards CustomerId
  _sGetRailYardsByCustomer(customerId: number): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.Customer.GetYardByCustomerId}?cusotmerId=${customerId}`;

    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sGetCustomerByFormPath(formPath: string) {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.GetCustomerByFormPath}?formPath=${formPath}`;

    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sAssignInspectionFormToCustomer(payload: any) {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.AssignInspectionFormToCustomer}`;

    return this.http.post(url, payload).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  _sGetInspectionFormByCustomerId(customerId: number): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.Customer.GetInspectionFormByCustomerId}?customerId=${customerId}`;
    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  getInspectionDetailsById(inspectionId: number): Observable<any> {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.GetAssignDetailById}?id=${inspectionId}`;
    return this.http.get(url).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  unassignInspectionForm(payload: any) {
    const url = `${this.baseUrl}/${API_ENDPOINTS.FormManagement.DeleteAssignInspectionFormToCustomer}`;

    return this.http.post(url, payload).pipe(
      catchError((error) => {
        const errorMessage = this.getErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  //Error Handling
  getErrorMessage(error: any): string {
    const backendMessage =
      error?.error?.Message || error?.error?.message || error?.message;

    let finalMessage: string;

    if (error.status === 0) {
      finalMessage =
        backendMessage || 'Network error: Server is down or unreachable.';
    } else if (error.status >= 400 && error.status < 500) {
      finalMessage = backendMessage || 'Client error occurred.';
    } else if (error.status >= 500) {
      finalMessage = backendMessage || 'Server error: Please try again later.';
    } else {
      finalMessage = backendMessage || 'An unexpected error occurred.';
    }

    return error?.statusText
      ? `${error.statusText}: ${finalMessage}`
      : finalMessage;
  }
}
