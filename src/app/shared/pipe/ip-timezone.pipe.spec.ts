import { IpTimezonePipe } from './ip-timezone.pipe';
import { DateTime } from 'luxon';

describe('IpTimezonePipe', () => {
  let pipe: IpTimezonePipe;

  beforeEach(() => {
    pipe = new IpTimezonePipe();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const formatDate = (input: string, timeZone: string): string =>
    DateTime.fromISO(input, { zone: 'utc' })
      .setZone(timeZone)
      .toFormat('MM/dd/yyyy HH:mm:ss');

  describe('transform', () => {
    it.each([null, undefined, ''])(
      'should return "-" for falsy input: %s',
      (value) => {
        expect(pipe.transform(value as any)).toBe('-');
      }
    );

    it('should format date using real user timezone', () => {
      const input = '2023-12-31T18:30:00Z';
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      expect(pipe.transform(input)).toBe(formatDate(input, userTz));
    });

    it('should fall back to UTC when user timezone is undefined', () => {
      jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
        resolvedOptions: () => ({ timeZone: undefined }),
      } as any);

      const input = '2023-12-31T18:30:00Z';
      expect(pipe.transform(input)).toBe(formatDate(input, 'UTC'));
    });

    it('should return "Invalid DateTime" for invalid ISO string', () => {
      const result = pipe.transform('not-a-date');
      expect(result).toBe('Invalid DateTime');
    });
  });
});
