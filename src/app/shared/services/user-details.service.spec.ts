import { UserDetailService } from './user-details.service';

describe('UserDetailService', () => {
  let service: UserDetailService;

  const userDetails = {
    email: 'test@domian.com',
    username: 'test',
    token: 'abc12345',
  };

  const emptyDetails = { email: '', username: '', token: '' };

  beforeEach(() => {
    service = new UserDetailService();
  });

  it('should be created with default details', () => {
    expect(service).toBeTruthy();
    expect(service.getDetails()).toEqual(emptyDetails);
  });

  it('should set and retrieve user details', () => {
    service.setDetails(userDetails);
    expect(service.getDetails()).toEqual(userDetails);
  });

  it('should not update if same details are set again', () => {
    service.setDetails(userDetails);
    const spy = jest.spyOn<any, any>(service as any, 'areDetailsEqual');
    service.setDetails(userDetails);
    expect(spy).toHaveReturnedWith(true);
    expect(service.getDetails()).toEqual(userDetails);
  });

  it('should reset details to empty', () => {
    service.setDetails(userDetails);
    service.resetDetails();
    expect(service.getDetails()).toEqual(emptyDetails);
  });

  it('should get individual fields from user details', () => {
    service.setDetails(userDetails);
    expect(service.getEmail()).toBe(userDetails.email);
    expect(service.getUsername()).toBe(userDetails.username);
    expect(service.getToken()).toBe(userDetails.token);
  });
});
