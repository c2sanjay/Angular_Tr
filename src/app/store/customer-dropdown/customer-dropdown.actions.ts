import { createAction, props } from '@ngrx/store';

export interface ICustomer {
  id: number;
  name: string;
}

export const setCustomers = createAction(
  '[Customer] Set Customers',
  props<{ customers: ICustomer[] }>(),
);

export const setSelectedCustomer = createAction(
  '[Customer] Set Selected Customer',
  props<{ customer: ICustomer }>(),
);
