import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { TimezoneService } from './timezone.service';
import { of, throwError } from 'rxjs';

describe('TimezoneService', () => {
  let service: TimezoneService;
  let httpClientSpy: jest.Mocked<HttpClient>;
  let localStorageSpy: jest.SpyInstance;

  beforeEach(() => {
    httpClientSpy = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpClient>;

    localStorageSpy = jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'setItem');

    TestBed.configureTestingModule({
      providers: [
        TimezoneService,
        { provide: HttpClient, useValue: httpClientSpy }
      ]
    });

    service = TestBed.inject(TimezoneService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('loadTimezone', () => {
    it('should use cached timezone from localStorage if available', async () => {
      const mockTimezone = 'America/New_York';
      localStorageSpy.mockReturnValue(mockTimezone);

      await service.loadTimezone();

      expect(localStorageSpy).toHaveBeenCalledWith('user_timezone');
      expect(httpClientSpy.get).not.toHaveBeenCalled();
      expect(service.timezone).toBe(mockTimezone);
    });

    it('should fall back to UTC when API call fails', async () => {
      httpClientSpy.get.mockReturnValue(throwError(() => new Error('API error')));

      await service.loadTimezone();

      expect(httpClientSpy.get).toHaveBeenCalled();
      expect(service.timezone).toBe('UTC');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should fall back to UTC when API response has no timezone', async () => {
      const mockResponse = { timezone: null };
      httpClientSpy.get.mockReturnValue(of(mockResponse));

      await service.loadTimezone();

      expect(service.timezone).toBe('UTC');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getTimezone', () => {
    it('should return the current timezone', () => {
      service.timezone = 'Asia/Tokyo';
      expect(service.getTimezone()).toBe('Asia/Tokyo');
    });

    it('should return UTC by default', () => {
      service.timezone = 'UTC';
      expect(service.getTimezone()).toBe('UTC');
    });
  });

  
});