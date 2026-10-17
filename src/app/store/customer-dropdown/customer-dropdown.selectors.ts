import { createSelector, createFeatureSelector } from '@ngrx/store';
import { ICustomerState } from './customer-dropdown.reducer';

export const selectCustomerState =
  createFeatureSelector<ICustomerState>('customers');

export const selectAllCustomers = createSelector(
  selectCustomerState,
  (state) => state.customers,
);

export const selectSelectedCustomer = createSelector(
  selectCustomerState,
  (state) => state.selectedCustomer,
);
