type AllowedType = 'string' | 'object' | 'string|object';

interface RequiredField {
  key: string;
  label: string;
  type: AllowedType;
}

export const REQUIRED_FIELDS: RequiredField[] = [
  { key: 'customerName', label: 'Customer Name', type: 'object' },
  { key: 'yardName', label: 'Yard Name', type: 'object' },
  { key: 'railCarId', label: 'Railcar ID', type: 'string|object' },
  {
    key: 'inspectionCompletedBy',
    label: 'Inspection Completed By',
    type: 'object',
  },
];

export function validateFormLocally(formData: Record<string, any>): {
  isLocalFormValid: boolean;
  formError?: string;
} {
  for (const { key, label, type } of REQUIRED_FIELDS) {
    const value = formData[key];
    const valueType = typeof value;

    const isEmptyString = valueType === 'string' && value.trim() === '';
    const isEmptyObject =
      valueType === 'object' &&
      value !== null &&
      Object.keys(value).length === 0;

    const typeAllowed =
      type === valueType ||
      (type === 'string|object' &&
        (valueType === 'string' || valueType === 'object'));

    if (
      value === undefined ||
      value === null ||
      !typeAllowed ||
      isEmptyString ||
      isEmptyObject
    ) {
      return { isLocalFormValid: false, formError: `${label} is required.` };
    }
  }

  return { isLocalFormValid: true };
}
