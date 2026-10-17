import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from 'src/environments/environment';


describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const CUSTOMER_COUNT_URL = `${environment.trinityRailApiUrl}/FormAssignToCustomer/FormAssignToCustomerCounts`;
  const FORMIO_USER_URL = `${environment.formIoUrl}/user`;
  const VALIDATE_RSI_URL = (email: string) =>
    `${environment.trinityRailApiUrl}/InspectionHub/CheckUserRegistration?email=${email}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('CustomerAssigned()', () => {

     it('should call getFormListing and return expected data with headers', () => {
    const mockResponse = [{ _id: 'form1' }, { _id: 'form2' }];
    const expectedUrl = `${environment.formIoUrl}/form?limit=150`;
   
    service.getFormListing().subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('x-token')).toBe(environment.apiKey);
    req.flush(mockResponse);
  });
  });

  describe('getUser()', () => {
    it('should call getUser and return data', () => {
      const mockUsers = [{ email: 'test@domain.com' }];

      service.getUser().subscribe((data) => {
        expect(data).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(FORMIO_USER_URL);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });
  });

 
});
