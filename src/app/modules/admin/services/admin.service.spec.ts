import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { environment } from 'src/environments/environment';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  let mockCommonApiService: { getErrorMessage: jest.Mock };

  beforeEach(() => {
    mockCommonApiService = {
      getErrorMessage: jest.fn().mockReturnValue('Mocked error'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminService,
        { provide: CommonApiService, useValue: mockCommonApiService },
      ],
    });

    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch project list', () => {
    const mockData = [{ id: 1, name: 'Test Project' }];
    service.getProjectList().subscribe((res) => expect(res).toEqual(mockData));

    const req = httpMock.expectOne(`${environment.formIoUrl}/ashcroftterminal`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should handle error in getProjectList', () => {
    service.getProjectList().subscribe({
      error: (error) => {
        expect(error.message).toBe('Mocked error');
        expect(mockCommonApiService.getErrorMessage).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.formIoUrl}/ashcroftterminal`);
    req.flush('Error', { status: 500, statusText: 'Server Error' });
  });

  it('should get customers by id', () => {
    service._sgetCustomersById([123]).subscribe();
    const req = httpMock.expectOne(`${environment.TrinityURL}/Customers/123`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

   it('should call getErrorMessage and rethrow error on failure', (done) => {
    const customerId = [123];

    service._sgetCustomersById(customerId).subscribe({
      next: () => {
        // This should not be called
        fail('Expected error, but got success');
      },
      error: (err) => {
        expect(mockCommonApiService.getErrorMessage).toHaveBeenCalled();
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Mocked error');
        done();
      },
    });

    const req = httpMock.expectOne(`${environment.TrinityURL}/Customers/${customerId}`);
    expect(req.request.method).toBe('GET');

    // Simulate an error
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should handle HTTP error and call getErrorMessage', (done) => {
    const customerId = 101;

    service.getFormsAssignedById(customerId).subscribe({
      next: () => fail('Expected error, but got success'),
      error: (err) => {
        expect(mockCommonApiService.getErrorMessage).toHaveBeenCalled();
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('Mocked error');
        done();
      },
    });

    const req = httpMock.expectOne(
      `${environment.trinityRailApiUrl}/FormsAssignToCustomer/${customerId}`
    );

    expect(req.request.method).toBe('GET');

    // Simulate server error
    req.flush('Internal server error', {
      status: 500,
      statusText: 'Server Error',
    });
  });

  });
