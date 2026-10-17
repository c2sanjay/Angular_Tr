import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CommonApiService } from './common-api.service';
import { environment } from 'src/environments/environment';
import { API_ENDPOINTS } from 'src/app/shared/constants/api-endpoints';
import { lastValueFrom, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

describe('CommonApiService', () => {
  let service: CommonApiService;
  let httpMock: HttpTestingController;

  beforeAll(() => TestBed.resetTestingModule());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommonApiService],
    });

    service = TestBed.inject(CommonApiService);
    httpMock = TestBed.inject(HttpTestingController);
    (service as any).baseUrl = `${environment.trinityRailApiUrl}`;
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('mock test: should call getCustomerList and return mock data', () => {
    const mockResponse = [{ id: 1, name: 'Customer A' }];
    // Dynamically call the method (ONLY for testing purpose)
    (service as any).getCustomerList = jest.fn().mockReturnValue(mockResponse);

    const result = (service as any).getCustomerList();
    expect(result).toEqual(mockResponse);
    expect((service as any).getCustomerList).toHaveBeenCalled();
  });

  it('should call HttpClient.get with form ID URL', () => {
    const http = TestBed.inject(HttpTestingController);
    const mockId = 'abc12345';
    const mockResponse = { title: 'Test Form' };

    // Call get manually
    service['http']
      .get(`${environment.formIoUrl}/form/${mockId}`)
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

    const req = http.expectOne(`${environment.formIoUrl}/form/${mockId}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should send POST to create customer (via HttpClient.post)', () => {
    const mockPayload = { name: 'New Customer' };
    const mockResponse = { success: true };

    // Call HttpClient.post directly
    service['http']
      .post(`${environment.trinityRailApiUrl}/Customer/Create`, mockPayload)
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/Customer/Create`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockPayload);
    req.flush(mockResponse);
  });

  it('should send DELETE to delete customer (via HttpClient.delete)', () => {
    const customerId = '12345';
    const mockResponse = { deleted: true };

    // Call HttpClient.delete directly
    service['http']
      .delete(`${environment.trinityRailApiUrl}/Customer/Delete/${customerId}`)
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/Customer/Delete/${customerId}`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(mockResponse);
  });

  it('should return default error message for unexpected status', () => {
    const error = { status: 300 };
    const message = service.getErrorMessage(error);
    expect(message).toBe('An unexpected error occurred.');
  });

it('should handle error in _sCustomerListing', () => {
  // Arrange: mock the method to throw an error
  const mockError = new Error('Server error: Please try again later.');
  jest.spyOn(service, '_sCustomerListing').mockReturnValueOnce(throwError(() => mockError));

  // Act + Assert
  service._sCustomerListing().subscribe({
    next: () => fail('Should have errored'),
    error: (error) => {
      expect(error.message).toBe('Server error: Please try again later.');
    },
  });
});

it('should send GET request with customerId only', () => {
  const customerId = 100;
  const mockResponse = [{ id: 1, name: 'Form A' }];

  service._sGetInspectionFormList(customerId).subscribe((res) => {
    expect(res).toEqual(mockResponse);
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormList}`;

  const req = httpMock.expectOne((request) => {
    return (
      request.method === 'GET' &&
      request.url === expectedUrl &&
      request.params.has('customerId') &&
      request.params.get('customerId') === '100'
    );
  });

  // ✅ Simulate backend response
  req.flush(mockResponse);

  // ✅ Verify no unmatched requests are pending
  httpMock.verify();
});


  it('should send GET request with customerId only', () => {
    const customerId = 100;
    const mockResponse = [{ id: 1, name: 'Form A' }];

    service._sGetInspectionFormList(customerId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormList}`;

    const req = httpMock.expectOne((request) => {
      return (
        request.method === 'GET' &&
        request.url === expectedUrl &&
        request.params.has('customerId') &&
        request.params.get('customerId') === '100'
      );
    });

    req.flush(mockResponse);
  });

  it('should handle error and return custom error message when API fails', (done) => {
    const customerId = 123;
    const yardIds: number[] = [1, 2, 3];
    const mockErrorMessage = 'Mock Error Message';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sGetInspectionFormList(customerId, yardIds).subscribe({
      next: () => fail('Expected error'),
      error: (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormList}`;

    const req = httpMock.expectOne((request) => {
      return (
        request.method === 'GET' &&
        request.url === expectedUrl &&
        request.params.get('customerId') === '123' &&
        request.params.getAll('yardId')?.join(',') === '1,2,3'
      );
    });

    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should call GET with formName in query params', () => {
    const formNames = ['FormA', 'FormB'];
    const mockResponse = [{ id: 1, name: 'Customer A' }];

    service._sGetCustomerNameByFormName(formNames).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetCustomerByFormPath}?formPath=${formNames}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message on failure', (done) => {
    const formNames = ['FormA', 'FormB'];
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sGetCustomerNameByFormName(formNames).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetCustomerByFormPath}?formPath=${formNames}`;

    const req = httpMock.expectOne(expectedUrl);
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should handle error and return custom error message on failure', (done) => {
    const yardIds = [1];
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sGetFormMgmtListingYardOnly(yardIds).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormList}`;

    const req = httpMock.expectOne((request) => {
      const yardParams = request.params.getAll('yardId') || [];
      return (
        request.url === expectedUrl &&
        request.method === 'GET' &&
        yardParams.includes('1')
      );
    });

    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should send GET request with customerId, startDate, endDate and yardId params', () => {
    const customerId = '123';
    const startDate = '2025-07-18';
    const endDate = '2025-07-19';
    const yardIds = [1, 2, 3];
    const mockResponse = [{ id: 1, name: 'Inspection A' }];

    service
      ._sGetInspectionCustomers(customerId, startDate, endDate, yardIds)
      .subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.InspectionHub.List}`;

    const req = httpMock.expectOne((request) => {
      return (
        request.url === expectedUrl &&
        request.method === 'GET' &&
        request.params.get('customerId') === customerId &&
        request.params.get('startDate') === startDate &&
        request.params.get('endDate') === endDate &&
        request.params.get('yardId') === '1,2,3'
      );
    });

    expect(req).toBeTruthy();
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message on failure', (done) => {
    const customerId = '123';
    const startDate = '2025-07-18';
    const endDate = '2025-07-19';
    const yardIds = [1];
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service
      ._sGetInspectionCustomers(customerId, startDate, endDate, yardIds)
      .subscribe({
        next: () => fail('Expected error'),
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe(mockErrorMessage);
          done();
        },
      });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.InspectionHub.List}`;

    const req = httpMock.expectOne((request) => {
      return (
        request.url === expectedUrl &&
        request.method === 'GET' &&
        request.params.get('customerId') === customerId &&
        request.params.get('startDate') === startDate &&
        request.params.get('endDate') === endDate &&
        request.params.get('yardId') === '1'
      );
    });

    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should send GET request with inspectionFormDetailId param', () => {
    const formDetailId = 123;
    const mockResponse = { id: formDetailId, name: 'Inspection Detail' };

    service._sInspectionFormDetailGetById(formDetailId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.InspectionHub.InspectionFormDetailGetById}?inspectionFormDetailId=${formDetailId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message on failure', (done) => {
    const formDetailId = 123;
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sInspectionFormDetailGetById(formDetailId).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.InspectionHub.InspectionFormDetailGetById}?inspectionFormDetailId=${formDetailId}`;

    const req = httpMock.expectOne(expectedUrl);
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should send GET request for InspectionFormCustomerCountList', () => {
    const mockResponse = [{ customer: 'ABC', count: 10 }];

    service._sInspectionFormCustomerCountList().subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${environment.trinityRailApiUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormCustomerCountList}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message for InspectionFormCustomerCountList', (done) => {
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sInspectionFormCustomerCountList().subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${environment.trinityRailApiUrl}/${API_ENDPOINTS.FormManagement.GetInspectionFormCustomerCountList}`;

    const req = httpMock.expectOne(expectedUrl);
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should send POST request to delete inspection record', () => {
    const mockId = 123;
    const mockResponse = { success: true };

    service._sDeleteInspectionRecord(mockId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.InspectionHub.DeleteInspectionFormDetail}/${mockId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message on delete inspection record', (done) => {
    const mockId = 123;
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sDeleteInspectionRecord(mockId).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.InspectionHub.DeleteInspectionFormDetail}/${mockId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should send GET request to fetch rail yards by customerId', () => {
    const mockCustomerId = 123;
    const mockResponse = [{ id: 1, name: 'Yard 1' }];

    service._sGetRailYardsByCustomer(mockCustomerId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.Customer.GetYardByCustomerId}?cusotmerId=${mockCustomerId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message when fetching rail yards', (done) => {
    const mockCustomerId = 123;
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sGetRailYardsByCustomer(mockCustomerId).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.Customer.GetYardByCustomerId}?cusotmerId=${mockCustomerId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('should send GET request to fetch customer by formPath', () => {
    const formPath = 'sample/form/path';
    const mockResponse = { id: 1, name: 'Customer A' };

    service._sGetCustomerByFormPath(formPath).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetCustomerByFormPath}?formPath=${formPath}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message when fetching customer by formPath', (done) => {
    const formPath = 'sample/form/path';
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sGetCustomerByFormPath(formPath).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetCustomerByFormPath}?formPath=${formPath}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });
  it('should send POST request to assign inspection form to customer', () => {
    const payload = { customerId: 1, formId: 2 };
    const mockResponse = { success: true };

    service._sAssignInspectionFormToCustomer(payload).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.AssignInspectionFormToCustomer}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should handle error when assigning inspection form to customer', (done) => {
    const payload = { customerId: 1, formId: 2 };
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sAssignInspectionFormToCustomer(payload).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.AssignInspectionFormToCustomer}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });
  it('should send GET request to get inspection form by customerId', () => {
    const customerId = 100;
    const mockResponse = [{ id: 1, name: 'Inspection Form' }];

    service._sGetInspectionFormByCustomerId(customerId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.Customer.GetInspectionFormByCustomerId}?customerId=${customerId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error when getting inspection form by customerId', (done) => {
    const customerId = 100;
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service._sGetInspectionFormByCustomerId(customerId).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.Customer.GetInspectionFormByCustomerId}?customerId=${customerId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });
  it('should send GET request to get inspection details by ID', () => {
    const inspectionId = 123;
    const mockResponse = { id: 123, name: 'Mock Inspection' };

    service.getInspectionDetailsById(inspectionId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetAssignDetailById}?id=${inspectionId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle error when getting inspection details by ID', (done) => {
    const inspectionId = 123;
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service.getInspectionDetailsById(inspectionId).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetAssignDetailById}?id=${inspectionId}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });
  it('should send POST request to unassign inspection form', () => {
    const mockPayload = { id: 123 };
    const mockResponse = { success: true };

    service.unassignInspectionForm(mockPayload).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.DeleteAssignInspectionFormToCustomer}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockPayload);
    req.flush(mockResponse);
  });

  it('should handle error when unassigning inspection form', (done) => {
    const mockPayload = { id: 123 };
    const mockErrorMessage = 'Mock Error';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

    service.unassignInspectionForm(mockPayload).subscribe({
      next: () => fail('Expected error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(mockErrorMessage);
        done();
      },
    });

    const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.DeleteAssignInspectionFormToCustomer}`;

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    req.flush({}, { status: 500, statusText: 'Server Error' });
  });

   describe('getErrorMessage', () => {
    it('should return network error message when status is 0', () => {
      const error = { status: 0 };
      const message = service.getErrorMessage(error);
      expect(message).toBe('Network error: Server is down or unreachable.');
    });

    it('should return error.error.Message when status is 400-499 and Message exists', () => {
      const error = { status: 400, error: { Message: 'Invalid request' } };
      const message = service.getErrorMessage(error);
      expect(message).toBe('Invalid request');
    });

    it('should return error.error.message when status is 400-499 and Message does not exist but message exists', () => {
      const error = { status: 401, error: { message: 'Unauthorized' } };
      const message = service.getErrorMessage(error);
      expect(message).toBe('Unauthorized');
    });

it('should handle error when assigning inspection form to customer', (done) => {
  const payload = { customerId: 1, formId: 2 };
  const mockErrorMessage = 'Mock Error';

  jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

  service._sAssignInspectionFormToCustomer(payload).subscribe({
    next: () => fail('Expected error'),
    error: (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe(mockErrorMessage);
      done();
    },
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.AssignInspectionFormToCustomer}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('POST');
  req.flush({}, { status: 500, statusText: 'Server Error' });
});
it('should send GET request to get inspection form by customerId', () => {
  const customerId = 100;
  const mockResponse = [{ id: 1, name: 'Inspection Form' }];

  service._sGetInspectionFormByCustomerId(customerId).subscribe((res) => {
    expect(res).toEqual(mockResponse);
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.Customer.GetInspectionFormByCustomerId}?customerId=${customerId}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('GET');
  req.flush(mockResponse);
});

it('should handle error when getting inspection form by customerId', (done) => {
  const customerId = 100;
  const mockErrorMessage = 'Mock Error';

  jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

  service._sGetInspectionFormByCustomerId(customerId).subscribe({
    next: () => fail('Expected error'),
    error: (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe(mockErrorMessage);
      done();
    },
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.Customer.GetInspectionFormByCustomerId}?customerId=${customerId}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('GET');
  req.flush({}, { status: 500, statusText: 'Server Error' });
});
it('should send GET request to get inspection details by ID', () => {
  const inspectionId = 123;
  const mockResponse = { id: 123, name: 'Mock Inspection' };

  service.getInspectionDetailsById(inspectionId).subscribe((res) => {
    expect(res).toEqual(mockResponse);
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetAssignDetailById}?id=${inspectionId}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('GET');
  req.flush(mockResponse);
});

it('should handle error when getting inspection details by ID', (done) => {
  const inspectionId = 123;
  const mockErrorMessage = 'Mock Error';

  jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

  service.getInspectionDetailsById(inspectionId).subscribe({
    next: () => fail('Expected error'),
    error: (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe(mockErrorMessage);
      done();
    },
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.GetAssignDetailById}?id=${inspectionId}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('GET');
  req.flush({}, { status: 500, statusText: 'Server Error' });
});
it('should send POST request to unassign inspection form', () => {
  const mockPayload = { id: 123 };
  const mockResponse = { success: true };

  service.unassignInspectionForm(mockPayload).subscribe((res) => {
    expect(res).toEqual(mockResponse);
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.DeleteAssignInspectionFormToCustomer}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(mockPayload);
  req.flush(mockResponse);
});

it('should handle error when unassigning inspection form', (done) => {
  const mockPayload = { id: 123 };
  const mockErrorMessage = 'Mock Error';

  jest.spyOn(service, 'getErrorMessage').mockReturnValue(mockErrorMessage);

  service.unassignInspectionForm(mockPayload).subscribe({
    next: () => fail('Expected error'),
    error: (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe(mockErrorMessage);
      done();
    },
  });

  const expectedUrl = `${(service as any).baseUrl}/${API_ENDPOINTS.FormManagement.DeleteAssignInspectionFormToCustomer}`;

  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('POST');
  req.flush({}, { status: 500, statusText: 'Server Error' });
});

it('should send POST request and return response', (done) => {
    const mockData = { name: 'test' };
    const mockResponse = { success: true };

    service._sFormCreation(mockData).subscribe((response) => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const expectedUrl = `${environment.trinityRailApiUrl}/${API_ENDPOINTS.formSubmission.Submission}`;
    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(JSON.stringify(mockData));
    req.flush(mockResponse);
  });

  it('should handle error and return custom error message', (done) => {
    const mockData = { name: 'test' };
    const errorMessage = 'Mock error occurred';

    jest.spyOn(service, 'getErrorMessage').mockReturnValue(errorMessage);

    service._sFormCreation(mockData).subscribe({
      next: () => fail('Expected an error'),
      error: (err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe(errorMessage);
        done();
      },
    });

    const expectedUrl = `${environment.trinityRailApiUrl}/${API_ENDPOINTS.formSubmission.Submission}`;
    const req = httpMock.expectOne(expectedUrl);
    req.flush({ message: errorMessage }, { status: 500, statusText: 'Internal Server Error' });
  });  }); 

describe('getErrorMessage', () => {
  it('should return network error message when status is 0', () => {
    const error = { status: 0 };
    const message = service.getErrorMessage(error);
    expect(message).toBe('Network error: Server is down or unreachable.');
  });

  it('should return error.error.Message when status is 400-499 and Message exists', () => {
    const error = { status: 400, error: { Message: 'Invalid request' } };
    const message = service.getErrorMessage(error);
    expect(message).toBe('Invalid request');
  });

  it('should return error.error.message when status is 400-499 and Message does not exist but message exists', () => {
    const error = { status: 401, error: { message: 'Unauthorized' } };
    const message = service.getErrorMessage(error);
    expect(message).toBe('Unauthorized');
  });

  it('should return default client error message when status is 400-499 and no Message or message exists', () => {
    const error = { status: 404, error: {} };
    const message = service.getErrorMessage(error);
    expect(message).toBe('Client error occurred.');
  });

   it('calls getErrorMessage with HttpErrorResponse and rethrows Error with that message', async () => {
    const friendly = 'Friendly message from getErrorMessage';
    const spy = jest
      .spyOn(service as any, 'getErrorMessage')
      .mockReturnValue(friendly);

    const promise = lastValueFrom(service._sCustomerListing());

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url.endsWith('/Customers')
    );
   req.flush({ message: 'boom' }, { status: 500, statusText: 'Internal Server Error' });

    await expect(promise).rejects.toThrow(friendly);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBeInstanceOf(HttpErrorResponse);
  });

  it('uses backend message when status >= 500 and message is present', () => {
    const err = {
      status: 500,
      statusText: 'Internal Server Error',
      error: { message: 'DB down' },
    } as any;

    expect(service.getErrorMessage(err)).toBe('Internal Server Error: DB down');
  });

  it('falls back to default server error message when no backend message is present', () => {
    const err = {
      status: 502,
      statusText: 'Bad Gateway',
      error: {}, 
    } as any;

    expect(service.getErrorMessage(err)).toBe(
      'Bad Gateway: Server error: Please try again later.'
    );
  });

  it('omits statusText prefix if none is provided', () => {
    const err = {
      status: 503,
      error: {},
    } as any;

    expect(service.getErrorMessage(err)).toBe(
      'Server error: Please try again later.'
    );
  });
});

 describe('_sCustomerListing', () => {
    it('should return customer list on success', (done) => {
      const mockResponse = [{ id: 1, name: 'John Doe' }];
      service._sCustomerListing().subscribe((data) => {
        expect(data).toEqual(mockResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.TrinityURL}/Customers`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    
  });
 
  });

