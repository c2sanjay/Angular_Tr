import { ActionReducerMap } from '@ngrx/store';
import { dropdownReducer, ICustomerState } from './customer-dropdown.reducer';

export interface AppState {
  customers: ICustomerState;
}

export const reducers: ActionReducerMap<AppState> = {
  customers: dropdownReducer,
};
