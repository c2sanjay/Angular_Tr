import { AccessRoleService } from './access-role.service';

describe('AccessRoleService', () => {
  let service: AccessRoleService;

  const mockRsiServices = [
    { id: 1, name: 'Service A' },
    { id: 2, name: 'Service B' },
  ];

  beforeEach(() => {
    service = new AccessRoleService();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  describe('Role Management', () => {
    it('should set and get the role', () => {
      service.setRole('Admin');
      expect(service.getRole()).toBe('Admin');
    });

    it('should return true if role matches expected roles', () => {
      service.setRole('Customer User');
      expect(service.hasRole(['Customer User', 'Admin'])).toBeTruthy();
    });

    it('should return false if role does not match expected roles', () => {
      service.setRole('Viewer');
      expect(service.hasRole(['Admin', 'Editor'])).toBeFalsy();
    });

    it('should return true if role is set', () => {
      service.setRole('Admin');
      expect(service.isSet()).toBeTruthy();
    });

    it('should return false if role is not set', () => {
      expect(service.isSet()).toBeFalsy();
    });
  });

  describe('RSI Service Management', () => {
    it('should set rsiAppServices with given objects', () => {
      service.setRsiServices(mockRsiServices);
      expect((service as any)['rsiAppServices']).toEqual(mockRsiServices);
    });

    it('should return rsiAppServices using getRsiServices()', () => {
      service.setRsiServices(mockRsiServices);
      expect(service.getRsiServices()).toEqual(mockRsiServices);
    });

    it('should clear rsiAppServices using clearRsiServices()', () => {
      service.setRsiServices(mockRsiServices);
      expect(service.getRsiServices().length).toBe(2);

      service.clearRsiServices();
      expect(service.getRsiServices()).toEqual([]);
    });
  });
});
