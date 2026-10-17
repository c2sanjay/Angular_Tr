import { CustomerDetailService } from './customer-details.service';

describe('CustomerDetailService', () => {
  let service: CustomerDetailService;

  beforeEach(() => {
    service = new CustomerDetailService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty string by default', () => {
    expect(service.getCustomerName()).toBe('');
  });

  it('should set and get customer name correctly', () => {
    const testName = 'Acme Corp';
    service.setCustomerName(testName);
    expect(service.getCustomerName()).toBe(testName);
  });
});
