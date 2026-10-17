import { validateFormLocally, REQUIRED_FIELDS } from './validateFormLocally';

describe('validateFormLocally', () => {
  const validFormData: Record<string, any> = {
    customerName: { id: 1, name: 'Customer A' },
    yardName: { id: 10, name: 'Main Yard' },
    railCarId: 'RC123',
    inspectionCompletedBy: { id: 99, name: 'Inspector X' },
  };

  it('should return valid when all fields have allowed types and values', () => {
    expect(validateFormLocally(validFormData)).toEqual({
      isLocalFormValid: true,
    });
  });

  it.each(REQUIRED_FIELDS)(
    'should fail when %s is missing',
    ({ key, label }) => {
      const formData = { ...validFormData };
      delete formData[key];
      expect(validateFormLocally(formData)).toEqual({
        isLocalFormValid: false,
        formError: `${label} is required.`,
      });
    },
  );

  it.each(REQUIRED_FIELDS)('should fail when %s is null', ({ key, label }) => {
    const formData = { ...validFormData, [key]: null };
    expect(validateFormLocally(formData)).toEqual({
      isLocalFormValid: false,
      formError: `${label} is required.`,
    });
  });

  it.each(
    REQUIRED_FIELDS.filter(
      (f) => f.type === 'string' || f.type === 'string|object',
    ),
  )('should fail when %s is empty string', ({ key, label }) => {
    const formData = { ...validFormData, [key]: '' };
    expect(validateFormLocally(formData)).toEqual({
      isLocalFormValid: false,
      formError: `${label} is required.`,
    });
  });

  it.each(REQUIRED_FIELDS.filter((f) => f.type === 'string|object'))(
    'should fail when %s is empty string but type is string|object',
    ({ key, label }) => {
      const formData = { ...validFormData, [key]: '' };
      expect(validateFormLocally(formData)).toEqual({
        isLocalFormValid: false,
        formError: `${label} is required.`,
      });
    },
  );

  it.each(REQUIRED_FIELDS.filter((f) => f.type === 'object'))(
    'should fail when %s is empty object',
    ({ key, label }) => {
      const formData = { ...validFormData, [key]: {} };
      expect(validateFormLocally(formData)).toEqual({
        isLocalFormValid: false,
        formError: `${label} is required.`,
      });
    },
  );

  it.each(REQUIRED_FIELDS)(
    'should fail when %s type is not allowed',
    ({ key, label }) => {
      const invalidValue = 123; // same for all cases
      const formData = { ...validFormData, [key]: invalidValue };
      expect(validateFormLocally(formData)).toEqual({
        isLocalFormValid: false,
        formError: `${label} is required.`,
      });
    },
  );

  it('should pass for string|object type with object value', () => {
    const formData = { ...validFormData, railCarId: { id: 'RCX' } };
    expect(validateFormLocally(formData)).toEqual({
      isLocalFormValid: true,
    });
  });

  it('should pass for string|object type with string value', () => {
    const formData = { ...validFormData, railCarId: 'RCX' };
    expect(validateFormLocally(formData)).toEqual({
      isLocalFormValid: true,
    });
  });
});
