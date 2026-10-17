import { selectAllCustomers, selectSelectedCustomer, selectCustomerState } from './customer-dropdown.selectors';

describe('Customer Dropdown Selectors', () => {
  const mockState = {
    customers: {
      customers: [
        { id: 1, name: 'Customer A' },
        { id: 2, name: 'Customer B' },
      ],
      selectedCustomer: { id: 1, name: 'Customer A' },
    },
  };

  it('selectCustomerState should select the customers feature state', () => {
    const result = selectCustomerState.projector(mockState.customers);
    expect(result).toEqual(mockState.customers);
  });

  it('selectAllCustomers should select all customers', () => {
    const customersState = mockState.customers;
    const result = selectAllCustomers.projector(customersState);
    expect(result).toEqual(customersState.customers);
  });

  it('selectSelectedCustomer should select the selected customer', () => {
    const customersState = mockState.customers;
    const result = selectSelectedCustomer.projector(customersState);
    expect(result).toEqual(customersState.selectedCustomer);
  });
});
