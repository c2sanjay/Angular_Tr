import { createReducer, on } from '@ngrx/store';
import {
  setCustomers,
  setSelectedCustomer,
  ICustomer,
} from './customer-dropdown.actions';

export interface ICustomerState {
  customers: ICustomer[];
  selectedCustomer: ICustomer | null;
}

export const initialState: ICustomerState = {
  customers: [],
  selectedCustomer: null,
};

export const dropdownReducer = createReducer(
  initialState,
  on(setCustomers, (state, { customers }) => ({ ...state, customers })),
  on(setSelectedCustomer, (state, { customer }) => ({
    ...state,
    selectedCustomer: customer,
  })),
);
