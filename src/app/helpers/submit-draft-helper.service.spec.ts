import { TestBed } from '@angular/core/testing';
import { SubmitDraftHelperService } from './submit-draft-helper.service';
import { IndexedDBService } from 'src/app/common/services/indexed-db.service';
import { KendoNotificationService } from 'src/app/shared/services/kendo-notification.service';
import { CommonApiService } from 'src/app/shared/services/common-api.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

let service: SubmitDraftHelperService;
let indexedDBService: jest.Mocked<IndexedDBService>;
let kendoNotificationServiceMock: jest.Mocked<KendoNotificationService>;
let commonApiService: jest.Mocked<CommonApiService>;

const formData = {
  id: 1,
  formId: 101,
  formName: 'TestForm',
  CustomerID: '123',
  yardName: { name: 'Yard A' },
  version: 1,
};

const mockRouter = { navigate: jest.fn() };
const OFFLINE_SUBMIT_SUCCESS_MSG =
  'Form saved offline. Changes will sync once you are back online.';
let setIsLoading: jest.Mock;
let setIsDownloadEnabled: jest.Mock;
let showConfirm: jest.Mock;
let setCurrentFormName: jest.Mock;
let setCurrentCustomerId: jest.Mock;
let setCurrentFormId: jest.Mock;

const successMsg = 'Saved successfully';
const errorMsg = 'Save failed';

beforeEach(() => {
  indexedDBService = {
    add: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
  } as any;

  kendoNotificationServiceMock = {
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
  } as any;

  commonApiService = {
    _sFormCreation: jest.fn(),
    formCreation: jest.fn(),
  } as any;

  TestBed.configureTestingModule({
    providers: [
      SubmitDraftHelperService,
      { provide: IndexedDBService, useValue: indexedDBService },
      {
        provide: KendoNotificationService,
        useValue: kendoNotificationServiceMock,
      },
      { provide: CommonApiService, useValue: commonApiService },
      { provide: Router, useValue: mockRouter },
    ],
  });

  service = TestBed.inject(SubmitDraftHelperService);
  setIsLoading = jest.fn();
  setIsDownloadEnabled = jest.fn();
  showConfirm = jest.fn().mockResolvedValue(true);
  setCurrentFormName = jest.fn();
  setCurrentCustomerId = jest.fn();
  setCurrentFormId = jest.fn();
});

afterEach(() => jest.clearAllMocks());

// Online no previous submissions  syncCurrentData
it('should sync current submission if online and no prior data', async () => {
  const spy = jest.spyOn(service, 'syncCurrentData').mockImplementation();
  indexedDBService.getAll.mockReturnValue(of([]));

  await service.submitOrDraftHelper({
    type: 'submit',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: 'Submitted!',
    router: mockRouter as any,
    isOnline: true,
    setIsLoading,
    setIsDownloadEnabled,
    showConfirm,
  });

  expect(spy).toHaveBeenCalledWith(
    formData,
    'Submitted!',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );
});

// Offline  no previous  queueOfflineSave
it('should queue save if offline and no prior submission', async () => {
  const spy = jest.spyOn(service, 'queueOfflineSave').mockImplementation();
  indexedDBService.getAll.mockReturnValue(of([]));

  await service.submitOrDraftHelper({
    type: 'draft',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: 'Saved!',
    router: mockRouter as any,
    isOnline: false,
    setIsLoading,
    setIsDownloadEnabled,
    showConfirm,
  });

  expect(spy).toHaveBeenCalled();
});

// Offline draft with status=Submitted  warning
it('should warn if trying to draft a submitted form offline', async () => {
  indexedDBService.getAll.mockReturnValue(
    of([{ ...formData, status: 'Submitted' }]),
  );

  await service.submitOrDraftHelper({
    type: 'draft',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: '',
    router: mockRouter as any,
    isOnline: false,
    setIsLoading,
    setIsDownloadEnabled,
    showConfirm,
  });

  expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalled();
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

// clearOldOfflineData deletes outdated entries
it('should delete outdated items in clearOldOfflineData', () => {
  const outdated = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  indexedDBService.getAll.mockReturnValue(of([{ clientTimestamp: outdated }]));
  indexedDBService.delete.mockReturnValue(of(null));

  service.clearOldOfflineData();
  expect(indexedDBService.delete).toHaveBeenCalled();
});

it('should call delete for outdated items and log success', () => {
  const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const oldItem = { clientTimestamp: oldTimestamp };
  indexedDBService.getAll.mockReturnValue(of([oldItem]));
  indexedDBService.delete.mockReturnValue(of(undefined));
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  service.clearOldOfflineData();

  expect(indexedDBService.getAll).toHaveBeenCalledWith('offlineFormSubmission');
  expect(indexedDBService.delete).toHaveBeenCalledWith(
    'offlineFormSubmission',
    oldItem.clientTimestamp,
  );
  expect(consoleSpy).toHaveBeenCalledWith(
    'All older submissions have been cleared.',
  );
});

it('should log error if delete fails', () => {
  const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const oldItem = { clientTimestamp: oldTimestamp };
  indexedDBService.getAll.mockReturnValue(of([oldItem]));
  indexedDBService.delete.mockReturnValue(throwError(() => 'delete failed'));
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  service.clearOldOfflineData();

  expect(consoleSpy).toHaveBeenCalledWith(
    'delete failed',
    'Error clearing old submissions. Will retry in next cycle.',
  );
});

it('should do nothing if no outdated submissions', () => {
  const currentTimestamp = Date.now();
  const recentItem = { clientTimestamp: currentTimestamp };
  indexedDBService.getAll.mockReturnValue(of([recentItem]));
  service.clearOldOfflineData();

  expect(indexedDBService.delete).not.toHaveBeenCalled();
});

it('should show success and stop loading on successful save', () => {
  indexedDBService.add.mockReturnValue(of(undefined));

  service.queueOfflineSave(formData, successMsg, setIsLoading);

  expect(indexedDBService.add).toHaveBeenCalledWith(
    service.storeName,
    formData,
  );
  expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
    successMsg,
  );
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should show error and stop loading on failed save', () => {
  const error = errorMsg;
  indexedDBService.add.mockReturnValue(throwError(() => error));

  service.queueOfflineSave(formData, successMsg, setIsLoading);

  expect(indexedDBService.add).toHaveBeenCalledWith(
    service.storeName,
    formData,
  );
  expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
    'Failed to save offline data. Please try again.',
  );
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should sync current and offline submissions if previous submissions exist and online', async () => {
  const formDataWithId = {
    ...formData,
    formId: 101,
  };

  const previousSubmission = {
    ...formDataWithId,
    clientTimestamp: 999,
  };

  indexedDBService.getAll.mockReturnValue(of([previousSubmission]));
  jest.spyOn(service, 'postDataToServer').mockReturnValue(of(undefined));
  indexedDBService.delete.mockReturnValue(of(undefined));
  const syncSpy = jest.spyOn(service, 'syncCurrentData').mockImplementation();

  await service.submitOrDraftHelper({
    type: 'submit',
    formName: 'TestForm',
    submissionData: formDataWithId,
    toastrMsg: 'Submitted',
    router: mockRouter as any,
    isOnline: true,
    setIsLoading,
    setIsDownloadEnabled,
    showConfirm,
  });

  expect(service.postDataToServer).toHaveBeenCalledWith(previousSubmission);
  expect(indexedDBService.delete).toHaveBeenCalledWith(
    'offlineFormSubmission',
    999,
  );
  expect(syncSpy).toHaveBeenCalledWith(
    formDataWithId,
    'All current and offline submissions have been synced.',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );
});

it('should show error toast and stop loading if sync fails', async () => {
  const previousSubmission = {
    ...formData,
    clientTimestamp: 999,
    formId: 101,
    formName: 'TestForm',
  };

  indexedDBService.getAll.mockReturnValue(of([previousSubmission]));

  jest
    .spyOn(service, 'postDataToServer')
    .mockReturnValue(throwError(() => 'sync-error'));

  const syncSpy = jest.spyOn(service, 'syncCurrentData').mockImplementation();

  await service.submitOrDraftHelper({
    type: 'submit',
    formName: 'TestForm',
    submissionData: { ...formData, formId: 101 },
    toastrMsg: 'Submitted',
    router: mockRouter as any,
    isOnline: true,
    setIsLoading,
    setIsDownloadEnabled,
    showConfirm,
  });

  expect(service.postDataToServer).toHaveBeenCalledWith(previousSubmission);
  expect(syncSpy).not.toHaveBeenCalled();
  expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
    'sync-error',
  );
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should override submission after confirmation', async () => {
  const lastSubmission = {
    ...formData,
    status: 'Submitted',
    clientTimestamp: 888,
    version: 3,
  };

  indexedDBService.getAll.mockReturnValue(of([lastSubmission]));
  indexedDBService.delete.mockReturnValue(of(undefined));
  const queueSpy = jest
    .spyOn(service, 'queueOfflineSave')
    .mockImplementation(() => {});

  await service.submitOrDraftHelperNewForm({
    type: 'submit',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: '',
    router: mockRouter as any,
    isOnline: false,
    setIsLoading,
    setIsDownloadEnabled,
    setCurrentFormName,
    setCurrentCustomerId,
    setCurrentFormId,
    showConfirm,
  });

  await new Promise((resolve) => setTimeout(resolve));
  expect(showConfirm).toHaveBeenCalled();
  expect(indexedDBService.delete).toHaveBeenCalledWith(
    'offlineFormSubmission',
    888,
  );
  expect(queueSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      formId: 101,
      version: 3,
    }),
    'Submission overriden successfully. Changes will sync once you are back online.',
    setIsLoading,
  );
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should call newFormOnlineFunction if online', async () => {
  const previousSubmission = {
    ...formData,
    CustomerID: '123',
    yardName: { name: 'Yard A' },
    formName: 'TestForm',
  };

  indexedDBService.getAll.mockReturnValue(of([previousSubmission]));
  const onlineSpy = jest
    .spyOn(service, 'newFormOnlineFunction')
    .mockImplementation(() => {});

  await service.submitOrDraftHelperNewForm({
    type: 'submit',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: 'Online submit',
    router: mockRouter as any,
    isOnline: true,
    setIsLoading,
    setIsDownloadEnabled,
    setCurrentFormName,
    setCurrentCustomerId,
    setCurrentFormId,
    showConfirm,
  });

  expect(setCurrentFormName).toHaveBeenCalledWith('TestForm');
  expect(setCurrentCustomerId).toHaveBeenCalledWith('123');
  expect(onlineSpy).toHaveBeenCalledWith({
    previousSubmissions: [previousSubmission],
    lastOfflineSubmission: previousSubmission,
    submissionData: formData,
    router: mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
    setCurrentFormId,
    toastrMsg: 'Online submit',
  });
});

it('should warn and not allow changes if already submitted and type is draft', async () => {
  const lastSubmission = {
    ...formData,
    status: 'Submitted',
    clientTimestamp: 777,
    version: 2,
  };

  indexedDBService.getAll.mockReturnValue(of([lastSubmission]));

  await service.submitOrDraftHelperNewForm({
    type: 'draft',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: '',
    router: mockRouter as any,
    isOnline: false,
    setIsLoading,
    setIsDownloadEnabled,
    setCurrentFormName,
    setCurrentCustomerId,
    setCurrentFormId,
    showConfirm,
  });

  expect(kendoNotificationServiceMock.showWarning).toHaveBeenCalledWith(
    'This form has already been marked as submitted. Changes are not allowed now!',
  );
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should show error toast and stop loading if delete fails after confirmation', async () => {
  const lastSubmission = {
    ...formData,
    status: 'Submitted',
    clientTimestamp: 777,
    version: 2,
  };
  const deleteError = 'delete failed';
  indexedDBService.getAll.mockReturnValue(of([lastSubmission]));
  indexedDBService.delete.mockReturnValue(throwError(() => deleteError));
  showConfirm.mockResolvedValue(true);

  await service.submitOrDraftHelperNewForm({
    type: 'submit',
    formName: 'TestForm',
    submissionData: formData,
    toastrMsg: '',
    router: mockRouter as any,
    isOnline: false,
    setIsLoading,
    setIsDownloadEnabled,
    setCurrentFormName,
    setCurrentCustomerId,
    setCurrentFormId,
    showConfirm,
  });

  await new Promise((resolve) => setTimeout(resolve));
  expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
    'Failed to override the existing record.',
  );
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should sync data successfully and navigate to dashboard', (done) => {
  jest.spyOn(service, 'postDataToServer').mockReturnValue(of(undefined));

  service.syncCurrentData(
    formData,
    'Submitted successfully',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );

  setTimeout(() => {
    expect(setIsDownloadEnabled).toHaveBeenCalledWith(true);
    expect(kendoNotificationServiceMock.showSuccess).toHaveBeenCalledWith(
      'Submitted successfully',
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    done();
  }, 1600);
});

it('should queue offline submission if navigator is offline', () => {
  jest
    .spyOn(service, 'postDataToServer')
    .mockReturnValue(throwError(() => ({ status: 0 })));
  Object.defineProperty(navigator, 'onLine', {
    value: false,
    configurable: true,
  });

  const queueSpy = jest
    .spyOn(service, 'queueOfflineSave')
    .mockImplementation(() => {});

  service.syncCurrentData(
    formData,
    'Submitted offline',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );

  expect(queueSpy).toHaveBeenCalledWith(
    formData,
    'Form saved offline. Changes will sync once you are back online.',
    expect.any(Function),
  );
});

it('should queue if server error (status >= 500)', () => {
  jest
    .spyOn(service, 'postDataToServer')
    .mockReturnValue(throwError(() => ({ status: 500 })));
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  });

  const queueSpy = jest
    .spyOn(service, 'queueOfflineSave')
    .mockImplementation(() => {});

  service.syncCurrentData(
    formData,
    'Submit fallback',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );

  expect(queueSpy).toHaveBeenCalledWith(
    formData,
    'Server issue. Submission queued and will retry later.',
    expect.any(Function),
  );
});

it('should show error toast and stop loading on client error', () => {
  const errMsg = 'Invalid data';
  jest
    .spyOn(service, 'postDataToServer')
    .mockReturnValue(throwError(() => errMsg));

  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  });

  service.syncCurrentData(
    formData,
    'Submit failed',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );

  expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(errMsg);
  expect(setIsLoading).toHaveBeenCalledWith(false);
});

it('should call inline isLoading setter in syncCurrentData on server error', () => {
  jest
    .spyOn(service, 'postDataToServer')
    .mockReturnValue(throwError(() => ({ status: 500 })));

  const queueSpy = jest
    .spyOn(service, 'queueOfflineSave')
    .mockImplementation(() => {});
  (service as any).isLoading = false;
  service.syncCurrentData(
    formData,
    'test',
    mockRouter as any,
    setIsDownloadEnabled,
    setIsLoading,
  );

  expect(queueSpy).toHaveBeenCalled();
  queueSpy.mock.calls[0][2](true);
  expect((service as any).isLoading).toBe(true);
});

it('should return observable when _sFormCreation returns success', (done) => {
  const response = { IsSuccess: true, Message: '', data: 'mocked' };
  (commonApiService._sFormCreation as jest.Mock).mockReturnValue(of(response));
  service.postDataToServer(formData).subscribe((res) => {
    expect(res).toEqual(response);
    done();
  });
});

it('should throw error when response is falsy', (done) => {
  (commonApiService._sFormCreation as jest.Mock).mockReturnValue(of(null));

  service.postDataToServer(formData).subscribe({
    next: () => {
      done.fail('Expected error but got success');
    },
    error: (error) => {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toBe(
        "Cannot read properties of null (reading 'Message')",
      );
      done();
    },
  });
});

it('should throw error when IsSuccess is false', (done) => {
  const errorResponse = { IsSuccess: false, Message: 'Error occurred' };
  (commonApiService._sFormCreation as jest.Mock).mockReturnValue(
    of(errorResponse),
  );

  service.postDataToServer(formData).subscribe({
    next: () => {
      done.fail('Expected error but got success');
    },
    error: (error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Error occurred');
      done();
    },
  });
});

it('should call postSyncHandler if no offline submissions exist', () => {
  const postSyncHandler = jest.fn();
  const setIsSyncInProgress = jest.fn();
  const setIsDownloadEnabled = jest.fn();

  (indexedDBService.getAll as jest.Mock).mockReturnValue(of([]));
  service.syncAllOfflineFormSubmissions(
    postSyncHandler,
    setIsSyncInProgress,
    setIsDownloadEnabled,
  );
  expect(postSyncHandler).toHaveBeenCalledTimes(1);
  expect(setIsSyncInProgress).not.toHaveBeenCalled();
  expect(setIsDownloadEnabled).not.toHaveBeenCalled();
});

it('should call processOfflineSubmissions if offline submissions exist', () => {
  const postSyncHandler = jest.fn();
  const setIsSyncInProgress = jest.fn();
  const setIsDownloadEnabled = jest.fn();
  const mockSubmissions = [{ id: 1 }, { id: 2 }];
  const spy = jest.spyOn(service, 'processOfflineSubmissions');
  (indexedDBService.getAll as jest.Mock).mockReturnValue(of(mockSubmissions));
  service.syncAllOfflineFormSubmissions(
    postSyncHandler,
    setIsSyncInProgress,
    setIsDownloadEnabled,
  );
  expect(setIsDownloadEnabled).toHaveBeenCalledWith(false);
  expect(setIsSyncInProgress).toHaveBeenCalledWith(true);
  expect(spy).toHaveBeenCalledWith(
    mockSubmissions,
    setIsDownloadEnabled,
    setIsSyncInProgress,
    postSyncHandler,
  );
});

it('should post each submission, delete it from IndexedDB, and call handleSyncComplete', (done) => {
  const mockSubmissions = [
    { id: 1, clientTimestamp: 111 },
    { id: 2, clientTimestamp: 222 },
  ];

  const setIsDownloadEnabled = jest.fn();
  const setIsSyncInProgress = jest.fn();
  const postSyncHandler = jest.fn();
  jest.spyOn(service, 'postDataToServer').mockImplementation(() => of({}));
  (indexedDBService.delete as jest.Mock).mockReturnValue(of(true));
  const syncSpy = jest.spyOn(service as any, 'handleSyncComplete');

  service.processOfflineSubmissions(
    mockSubmissions,
    setIsDownloadEnabled,
    setIsSyncInProgress,
    postSyncHandler,
  );

  setTimeout(() => {
    expect(service.postDataToServer).toHaveBeenCalledTimes(2);
    expect(indexedDBService.delete).toHaveBeenCalledWith(
      service.storeName,
      111,
    );
    expect(indexedDBService.delete).toHaveBeenCalledWith(
      service.storeName,
      222,
    );
    expect(syncSpy).toHaveBeenCalledWith(
      true,
      setIsDownloadEnabled,
      setIsSyncInProgress,
      postSyncHandler,
    );
    done();
  }, 0);
});

it('should handle error when postDataToServer fails and still call handleSyncComplete', (done) => {
  const mockSubmissions = [
    { id: 1, clientTimestamp: 111 },
    { id: 2, clientTimestamp: 222 },
  ];
  const setIsDownloadEnabled = jest.fn();
  const setIsSyncInProgress = jest.fn();
  const postSyncHandler = jest.fn();
  jest
    .spyOn(service, 'postDataToServer')
    .mockReturnValueOnce(throwError(() => new Error('Failed')))
    .mockReturnValueOnce(of({}));

  jest
    .spyOn(service as any, 'handleSubmissionError')
    .mockImplementation(() => of(null));
  (indexedDBService.delete as jest.Mock).mockReturnValue(of(true));
  const syncSpy = jest.spyOn(service as any, 'handleSyncComplete');
  service.processOfflineSubmissions(
    mockSubmissions,
    setIsDownloadEnabled,
    setIsSyncInProgress,
    postSyncHandler,
  );

  setTimeout(() => {
    expect(service.postDataToServer).toHaveBeenCalledTimes(2);
    expect(service['handleSubmissionError']).toHaveBeenCalledWith(
      expect.any(Error),
      mockSubmissions[0],
    );
    expect(indexedDBService.delete).toHaveBeenCalledWith(
      service.storeName,
      222,
    );
    expect(syncSpy).toHaveBeenCalledWith(
      true,
      setIsDownloadEnabled,
      setIsSyncInProgress,
      postSyncHandler,
    );
    done();
  }, 0);
});

it('should show error toast and delete form if already submitted', (done) => {
  const err = {
    message: 'This form has already been submitted by someone',
  };
  const offlineForm = { clientTimestamp: 123 };
  (indexedDBService.delete as jest.Mock).mockReturnValue(of(true));
  service.handleSubmissionError(err, offlineForm).subscribe((result) => {
    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      err.message,
    );
    expect(indexedDBService.delete).toHaveBeenCalledWith(
      service.storeName,
      123,
    );
    expect(result).toBe(true);
    done();
  });
});

it('should rethrow the error if it is not an already submitted message', (done) => {
  const err = { message: 'Some other error' };
  const offlineForm = { clientTimestamp: 123 };
  service.handleSubmissionError(err, offlineForm).subscribe({
    next: () => done.fail('Expected error, but got success'),
    error: (e) => {
      expect(e).toBe(err);
      expect(kendoNotificationServiceMock.showError).not.toHaveBeenCalled();
      expect(indexedDBService.delete).not.toHaveBeenCalled();
      done();
    },
  });
});

describe('SubmitDraftHelperService - newFormOnlineFunction', () => {
  beforeEach(() => {
    jest
      .spyOn(service as any, 'postDataToServer')
      .mockImplementation((data: any) => of(data));
    jest.spyOn(service as any, 'syncCurrentData').mockImplementation(() => {});
  });

  it('should sync offline forms and then sync current data if previous submissions exist', () => {
    const submissionData = {
      formId: 101,
      CustomerID: 'cust1',
      yardName: { name: 'Yard A' },
      version: 1,
    };

    const lastOfflineSubmission = {
      formId: 202,
      version: 2,
    };

    const previousSubmissions = [
      { clientTimestamp: 123456, data: 'offline-data' },
    ];

    indexedDBService.delete.mockReturnValue(of(true));

    service.newFormOnlineFunction({
      previousSubmissions,
      lastOfflineSubmission,
      submissionData,
      router: mockRouter as any,
      setIsDownloadEnabled,
      setIsLoading,
      setCurrentFormId,
      toastrMsg: 'Submission success',
    });

    expect(setCurrentFormId).toHaveBeenCalledWith(lastOfflineSubmission.formId);
    expect(indexedDBService.delete).toHaveBeenCalledWith(
      service['storeName'],
      previousSubmissions[0].clientTimestamp,
    );
    expect((service as any).syncCurrentData).toHaveBeenCalledWith(
      {
        ...submissionData,
        formId: 202,
        version: 3,
      },
      'All current and offline submissions have been synced.',
      mockRouter,
      setIsDownloadEnabled,
      setIsLoading,
    );
  });

  it('should directly sync current data if no previous submissions', () => {
    const submissionData = {
      formId: 101,
      CustomerID: 'cust1',
      yardName: { name: 'Yard A' },
      version: 1,
    };

    service.newFormOnlineFunction({
      previousSubmissions: [],
      lastOfflineSubmission: null,
      submissionData,
      router: mockRouter as any,
      setIsDownloadEnabled,
      setIsLoading,
      setCurrentFormId,
      toastrMsg: 'Direct sync',
    });

    expect((service as any).syncCurrentData).toHaveBeenCalledWith(
      submissionData,
      'Direct sync',
      mockRouter,
      setIsDownloadEnabled,
      setIsLoading,
    );
  });

  it('should handle error during syncing previous submissions', () => {
    const submissionData = {
      formId: 101,
      CustomerID: 'cust1',
      yardName: { name: 'Yard A' },
      version: 1,
    };

    const lastOfflineSubmission = {
      formId: 202,
      version: 2,
    };

    const previousSubmissions = [
      { clientTimestamp: 123456, data: 'offline-data' },
    ];

    (service as any).postDataToServer.mockReturnValue(
      throwError(() => 'sync error'),
    );

    service.newFormOnlineFunction({
      previousSubmissions,
      lastOfflineSubmission,
      submissionData,
      router: mockRouter as any,
      setIsDownloadEnabled,
      setIsLoading,
      setCurrentFormId,
      toastrMsg: 'Submission failed',
    });

    expect(kendoNotificationServiceMock.showError).toHaveBeenCalledWith(
      'sync error',
    );
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });

  it('should handle offline submission with pending status by updating version and calling queueOfflineSave', async () => {
    const mockSubmissionData = {
      CustomerID: '123',
      yardName: { name: 'Yard A' },
      formId: 1001,
      version: 1,
    };

    const lastOfflineSubmission = {
      formName: 'TestForm',
      CustomerID: '123',
      yardName: { name: 'Yard A' },
      formId: 999,
      version: 1,
      clientTimestamp: 999999,
      status: 'Pending',
    };

    const mockIndexedDBService = {
      getAll: jest.fn().mockReturnValue(of([lastOfflineSubmission])),
      delete: jest.fn(),
    };

    const mockCommonApiService = {
      // If used inside the method, mock methods here too
    };

    // Create instance with all dependencies
    const service = new SubmitDraftHelperService(
      mockIndexedDBService as any,
      kendoNotificationServiceMock as any,
      mockCommonApiService as any,
    );

    // Override queueOfflineSave to spy on it
    const mockQueueOfflineSave = jest.fn();
    service.queueOfflineSave = mockQueueOfflineSave;

    // Mocks for callbacks
    const setIsLoading = jest.fn();
    const setCurrentFormId = jest.fn();

    await service.submitOrDraftHelperNewForm({
      type: 'submit',
      formName: 'TestForm',
      submissionData: mockSubmissionData,
      toastrMsg: 'Saved',
      router: {} as any,
      isOnline: false,
      setIsDownloadEnabled: jest.fn(),
      setIsLoading,
      setCurrentFormName: jest.fn(),
      setCurrentCustomerId: jest.fn(),
      setCurrentFormId,
      showConfirm: jest.fn(),
    });

    expect(setCurrentFormId).toHaveBeenCalledWith(lastOfflineSubmission.formId);

    expect(mockQueueOfflineSave).toHaveBeenCalledWith(
      {
        ...mockSubmissionData,
        formId: lastOfflineSubmission.formId,
        version: 2,
      },
      'Form saved offline. Changes will sync once you are back online.',
      setIsLoading,
    );
  });

  it('should call queueOfflineSave with new submission when no previous submission exists', async () => {
    const mockSubmissionData = {
      CustomerID: '123',
      yardName: { name: 'Yard A' },
      formId: 1001,
      version: 1,
    };

    const mockIndexedDBService = {
      getAll: jest.fn().mockReturnValue(of([])), // no previous submissions
    };

    const mockCommonApiService = {};

    const service = new SubmitDraftHelperService(
      mockIndexedDBService as any,
      kendoNotificationServiceMock as any,
      mockCommonApiService as any,
    );

    const mockQueueOfflineSave = jest.fn();
    service.queueOfflineSave = mockQueueOfflineSave;

    const setCurrentFormId = jest.fn();
    const setIsLoading = jest.fn();

    await service.submitOrDraftHelperNewForm({
      type: 'submit',
      formName: 'TestForm',
      submissionData: mockSubmissionData,
      toastrMsg: 'Saved',
      router: {} as any,
      isOnline: false,
      setIsDownloadEnabled: jest.fn(),
      setIsLoading,
      setCurrentFormName: jest.fn(),
      setCurrentCustomerId: jest.fn(),
      setCurrentFormId,
      showConfirm: jest.fn(),
    });

    expect(setCurrentFormId).toHaveBeenCalledWith(mockSubmissionData.formId);
    expect(mockQueueOfflineSave).toHaveBeenCalledWith(
      mockSubmissionData,
      OFFLINE_SUBMIT_SUCCESS_MSG,
      setIsLoading,
    );
  });
});
