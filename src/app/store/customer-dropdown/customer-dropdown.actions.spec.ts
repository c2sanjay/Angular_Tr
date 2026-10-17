import { setCustomers, setSelectedCustomer, ICustomer } from './customer-dropdown.actions';

describe('Customer Actions', () => {
  const mockCustomers: ICustomer[] = [
    { id: 1, name: 'Customer A' },
    { id: 2, name: 'Customer B' },
  ];

  const mockCustomer: ICustomer = { id: 1, name: 'Customer A' };

  it('setCustomers action should create the correct action object', () => {
    const action = setCustomers({ customers: mockCustomers });

    expect(action.type).toBe('[Customer] Set Customers');
    expect(action.customers).toEqual(mockCustomers);
  });

  it('setSelectedCustomer action should create the correct action object', () => {
    const action = setSelectedCustomer({ customer: mockCustomer });

    expect(action.type).toBe('[Customer] Set Selected Customer');
    expect(action.customer).toEqual(mockCustomer);
  });
});
