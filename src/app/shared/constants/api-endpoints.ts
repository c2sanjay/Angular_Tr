export const API_ENDPOINTS = {
  InspectionHub: {
    List: 'InspectionForm/GetInspectionHubList',
    InspectionFormDetailGetById: 'InspectionForm/InspectionFormDetailGetById',
    DeleteInspectionFormDetail: 'InspectionForm/DeleteInspectionFormDetail',
  },
  FormManagement: {
    GetInspectionFormCustomerCountList:
      'InspectionForm/GetInspectionFormCustomerCountList',
    GetCustomerByFormPath: 'Customer/GetCustomerByFormPath',
    AssignInspectionFormToCustomer:
      'CustomerInspectionForm/AssignInspectionFormToCustomer',
    GetInspectionFormList: 'InspectionForm/GetInspectionFormList',
    GetAssignDetailById: 'CustomerInspectionForm/GetAssignDetailById',
    DeleteAssignInspectionFormToCustomer:
      'CustomerInspectionForm/DeleteAssignInspectionFormToCustomer',
  },
  formSubmission: {
    Submission: 'InspectionForm/SaveInspectionFormDetail',
  },
  Customer: {
    GetYardByCustomerId: 'Customer/GetYardByCustomerId',
    GetInspectionFormByCustomerId:
      'InspectionForm/GetInspectionFormByCustomerId',
    GetCustomer: 'Customer/GetCustomer',
  },
};
