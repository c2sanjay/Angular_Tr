import { Injectable } from '@angular/core';
import { KendoNotificationService } from '../shared/services/kendo-notification.service';
import { IndexedDBService } from 'src/app/common/services/indexed-db.service';
import { from, Observable, throwError } from 'rxjs';
import { catchError, concatMap, tap } from 'rxjs/operators';
import { CommonApiService } from '../shared/services/common-api.service';
import { Router } from '@angular/router';
import { FORM_DB_NAME } from '../shared/constants/indexed-db-names';

const OFFLINE_SUBMIT_SUCCESS_MSG =
  'Form saved offline. Changes will sync once you are back online.';

@Injectable({
  providedIn: 'root',
})
export class SubmitDraftHelperService {
  storeName = FORM_DB_NAME; // IndexedDB table
  isLoading = false;

  constructor(
    private readonly indexedDBService: IndexedDBService,
    private readonly kendoNotificationService: KendoNotificationService,
    private readonly commonApiService: CommonApiService,
  ) {}

  queueOfflineSave(
    formData: any,
    toastrSuccessMsg: string,
    setIsLoading: (val: boolean) => void,
  ) {
    this.indexedDBService.add(this.storeName, formData).subscribe({
      next: () => {
        this.kendoNotificationService.showSuccess(toastrSuccessMsg);
        setIsLoading(false);
      },
      error: (err) => {
        this.kendoNotificationService.showError(
          'Failed to save offline data. Please try again.',
        );
        setIsLoading(false);
      },
    });
  }

  clearOldOfflineData() {
    this.indexedDBService
      .getAll(this.storeName)
      .subscribe((existingSubmissions: any[]) => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const outdatedItems = existingSubmissions.filter(
          (item) => new Date(item.clientTimestamp).getTime() < sevenDaysAgo,
        );

        if (outdatedItems.length === 0) return;

        from(outdatedItems)
          .pipe(
            concatMap((offlineForm) => {
              return this.indexedDBService.delete(
                this.storeName,
                offlineForm.clientTimestamp,
              );
            }),
          )
          .subscribe({
            complete: () => {
              console.log('All older submissions have been cleared.');
            },
            error: (err) => {
              console.log(
                err,
                'Error clearing old submissions. Will retry in next cycle.',
              );
            },
          });
      });
  }

  async submitOrDraftHelper({
    type,
    formName,
    submissionData,
    toastrMsg,
    router,
    isOnline,
    setIsLoading,
    setIsDownloadEnabled,
    showConfirm,
  }: {
    type: string;
    formName: string;
    submissionData: any;
    toastrMsg: string;
    router: Router;
    isOnline: boolean;
    setIsLoading: (val: boolean) => void;
    setIsDownloadEnabled: (val: boolean) => void;
    showConfirm: () => Promise<boolean>;
  }): Promise<void> {
    this.indexedDBService
      .getAll(this.storeName)
      .subscribe(async (existingSubmissions: any[]) => {
        const previousSubmissions = existingSubmissions.filter(
          (item) =>
            item.formName === formName && item.formId === submissionData.formId,
        );

        if (isOnline) {
          if (previousSubmissions.length > 0) {
            from(previousSubmissions)
              .pipe(
                concatMap((offlineForm) =>
                  this.postDataToServer(offlineForm).pipe(
                    concatMap(() =>
                      this.indexedDBService.delete(
                        this.storeName,
                        offlineForm.clientTimestamp,
                      ),
                    ),
                  ),
                ),
              )
              .subscribe({
                complete: () => {
                  this.syncCurrentData(
                    submissionData,
                    'All current and offline submissions have been synced.',
                    router,
                    setIsDownloadEnabled,
                    setIsLoading,
                  );
                },
                error: (err) => {
                  this.kendoNotificationService.showError(
                    err ?? 'Error syncing submissions. Please try again later.',
                  );
                  setIsLoading(false);
                },
              });
          } else
            this.syncCurrentData(
              submissionData,
              toastrMsg,
              router,
              setIsDownloadEnabled,
              setIsLoading,
            );
        } else {
          const lastOfflineSubmission = previousSubmissions.at(-1);
          const currentOfflineSubmission = {
            ...submissionData,
            version: lastOfflineSubmission?.version
              ? lastOfflineSubmission.version + 1
              : submissionData?.version,
            synced: false,
          };

          if (
            lastOfflineSubmission?.status === 'Submitted' &&
            type === 'draft'
          ) {
            this.kendoNotificationService.showWarning(
              'This form has already been marked as submitted. Changes are not allowed now!',
            );
            setIsLoading(false);
            return;
          } else if (
            lastOfflineSubmission?.status === 'Submitted' &&
            type === 'submit'
          ) {
            const isConfirmed = await showConfirm();
            if (isConfirmed) {
              const overrideLastSubmission = {
                ...lastOfflineSubmission,
                clientTimestamp: Date.now(),
                version: lastOfflineSubmission?.version,
              };

              this.indexedDBService
                .delete(this.storeName, lastOfflineSubmission.clientTimestamp)
                .subscribe({
                  next: () => {
                    this.queueOfflineSave(
                      overrideLastSubmission,
                      'Submission overriden successfully. Changes will sync once you are back online.',
                      setIsLoading,
                    );
                  },
                  error: (err) => {
                    this.kendoNotificationService.showError(
                      'Failed to override the existing record.',
                    );
                    setIsLoading(false);
                  },
                });
            }
            setIsLoading(false);
            return;
          }
          this.queueOfflineSave(
            currentOfflineSubmission,
            OFFLINE_SUBMIT_SUCCESS_MSG,
            setIsLoading,
          );
        }
      });
  }

  async submitOrDraftHelperNewForm({
    type,
    formName,
    submissionData,
    toastrMsg,
    router,
    isOnline,
    setIsLoading,
    setIsDownloadEnabled,
    setCurrentFormName,
    setCurrentCustomerId,
    setCurrentFormId,
    showConfirm,
  }: {
    type: string;
    formName: string;
    submissionData: any;
    toastrMsg: string;
    router: Router;
    isOnline: boolean;
    setIsLoading: (val: boolean) => void;
    setIsDownloadEnabled: (val: boolean) => void;
    setCurrentFormName: (val: any) => void;
    setCurrentCustomerId: (val: string) => void;
    setCurrentFormId: (val: number) => void;
    showConfirm: () => Promise<boolean>;
  }): Promise<void> {
    this.indexedDBService
      .getAll(this.storeName)
      .subscribe(async (existingSubmissions: any[]) => {
        const previousSubmissions = existingSubmissions.filter(
          (item) =>
            item.formName === formName &&
            item.CustomerID === submissionData.CustomerID &&
            item.yardName?.name === submissionData.yardName?.name,
        );

        setCurrentFormName(formName);
        setCurrentCustomerId(submissionData?.CustomerID);
        const lastOfflineSubmission = previousSubmissions.at(-1);

        if (isOnline) {
          this.newFormOnlineFunction({
            previousSubmissions,
            lastOfflineSubmission,
            submissionData,
            router,
            setIsDownloadEnabled,
            setIsLoading,
            setCurrentFormId,
            toastrMsg,
          });
        } else {
          if (
            lastOfflineSubmission?.status === 'Submitted' &&
            type === 'draft'
          ) {
            this.kendoNotificationService.showWarning(
              'This form has already been marked as submitted. Changes are not allowed now!',
            );
            setIsLoading(false);
            return;
          } else if (
            lastOfflineSubmission?.status === 'Submitted' &&
            type === 'submit'
          ) {
            setCurrentFormId(lastOfflineSubmission?.formId);
            const isConfirmed = await showConfirm();
            if (isConfirmed) {
              const overrideLastSubmission = {
                ...submissionData,
                formId: lastOfflineSubmission?.formId,
                version: lastOfflineSubmission?.version,
              };

              this.indexedDBService
                .delete(this.storeName, lastOfflineSubmission.clientTimestamp)
                .subscribe({
                  next: () => {
                    this.queueOfflineSave(
                      overrideLastSubmission,
                      'Submission overriden successfully. Changes will sync once you are back online.',
                      setIsLoading,
                    );
                  },
                  error: (err) => {
                    this.kendoNotificationService.showError(
                      'Failed to override the existing record.',
                    );
                    setIsLoading(false);
                  },
                });
            }
            setIsLoading(false);
            return;
          } else if (lastOfflineSubmission?.status === 'Pending') {
            setCurrentFormId(lastOfflineSubmission?.formId);
            const latestOfflineSubmission = {
              ...submissionData,
              formId: lastOfflineSubmission?.formId,
              version: lastOfflineSubmission?.version
                ? lastOfflineSubmission.version + 1
                : submissionData?.version,
            };
            this.queueOfflineSave(
              latestOfflineSubmission,
              OFFLINE_SUBMIT_SUCCESS_MSG,
              setIsLoading,
            );
          } else {
            setCurrentFormId(submissionData?.formId);
            this.queueOfflineSave(
              submissionData,
              OFFLINE_SUBMIT_SUCCESS_MSG,
              setIsLoading,
            );
          }
        }
      });
  }

  newFormOnlineFunction({
    previousSubmissions,
    lastOfflineSubmission,
    submissionData,
    router,
    setIsDownloadEnabled,
    setIsLoading,
    setCurrentFormId,
    toastrMsg,
  }: {
    previousSubmissions: any;
    lastOfflineSubmission: any;
    submissionData: any;
    router: Router;
    setIsDownloadEnabled: (val: boolean) => void;
    setIsLoading: (val: boolean) => void;
    setCurrentFormId: (val: number) => void;
    toastrMsg: string;
  }) {
    if (previousSubmissions.length > 0) {
      setCurrentFormId(lastOfflineSubmission?.formId);
      from(previousSubmissions)
        .pipe(
          concatMap((offlineForm: any) =>
            this.postDataToServer(offlineForm).pipe(
              concatMap(() =>
                this.indexedDBService.delete(
                  this.storeName,
                  offlineForm.clientTimestamp,
                ),
              ),
            ),
          ),
        )
        .subscribe({
          complete: () => {
            const latestOfflineSubmission = {
              ...submissionData,
              formId: lastOfflineSubmission?.formId,
              version: lastOfflineSubmission?.version
                ? lastOfflineSubmission.version + 1
                : submissionData?.version,
            };
            this.syncCurrentData(
              latestOfflineSubmission,
              'All current and offline submissions have been synced.',
              router,
              setIsDownloadEnabled,
              setIsLoading,
            );
          },
          error: (err) => {
            this.kendoNotificationService.showError(
              err ?? 'Error syncing submissions. Please try again later.',
            );
            setIsLoading(false);
          },
        });
    } else {
      this.syncCurrentData(
        submissionData,
        toastrMsg,
        router,
        setIsDownloadEnabled,
        setIsLoading,
      );
    }
  }

  syncCurrentData(
    submissionData: any,
    toastrMsg: string,
    router: Router,
    setIsDownloadEnabled: (val: boolean) => void,
    setIsLoading: (val: boolean) => void,
  ) {
    this.postDataToServer(submissionData).subscribe({
      next: () => {
        setIsDownloadEnabled(true);
        this.kendoNotificationService.showSuccess(toastrMsg);
        setTimeout(() => {
          router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        if (!navigator.onLine) {
          this.queueOfflineSave(
            submissionData,
            OFFLINE_SUBMIT_SUCCESS_MSG,
            (val: boolean) => (this.isLoading = val),
          );
        } else if (err.status >= 500) {
          this.queueOfflineSave(
            submissionData,
            'Server issue. Submission queued and will retry later.',
            (val: boolean) => (this.isLoading = val),
          );
        } else {
          this.kendoNotificationService.showError(
            err?.error?.message ||
              err?.message ||
              err.toString() ||
              'An unexpected error occurred.',
          );
          setIsLoading(false);
        }
      },
    });
  }

  postDataToServer(data: any): Observable<any> {
    return this.commonApiService._sFormCreation(data).pipe(
      tap((response) => {
        if (!response || response.IsSuccess !== true)
          throw new Error(response.Message);
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }

  syncAllOfflineFormSubmissions(
    postSyncHandler: () => void,
    setIsSyncInProgress: (val: boolean) => void,
    setIsDownloadEnabled?: (val: boolean) => void,
  ) {
    this.indexedDBService
      .getAll(FORM_DB_NAME)
      .subscribe((existingSubmissions: any[]) => {
        if (existingSubmissions.length <= 0) {
          postSyncHandler();
          return;
        }

        if (setIsDownloadEnabled) setIsDownloadEnabled(false);
        setIsSyncInProgress(true);

        this.processOfflineSubmissions(
          existingSubmissions,
          setIsDownloadEnabled,
          setIsSyncInProgress,
          postSyncHandler,
        );
      });
  }

  processOfflineSubmissions(
    submissions: any[],
    setIsDownloadEnabled: ((val: boolean) => void) | undefined,
    setIsSyncInProgress: (val: boolean) => void,
    postSyncHandler: () => void,
  ) {
    let anySuccess = false;

    from(submissions)
      .pipe(
        concatMap((offlineForm) =>
          this.postDataToServer(offlineForm).pipe(
            tap(() => {
              anySuccess = true;
            }),
            concatMap(() =>
              this.indexedDBService.delete(
                this.storeName,
                offlineForm.clientTimestamp,
              ),
            ),
            catchError((err) => this.handleSubmissionError(err, offlineForm)),
          ),
        ),
      )
      .subscribe({
        complete: () =>
          this.handleSyncComplete(
            anySuccess,
            setIsDownloadEnabled,
            setIsSyncInProgress,
            postSyncHandler,
          ),
        error: (err) =>
          this.handleSyncError(err, setIsDownloadEnabled, setIsSyncInProgress),
      });
  }

  handleSubmissionError(err: any, offlineForm: any) {
    if (
      typeof err === 'object' &&
      typeof err.message === 'string' &&
      err.message.includes('This form has already been submitted by')
    ) {
      this.kendoNotificationService.showError(err.message);
      return this.indexedDBService.delete(
        this.storeName,
        offlineForm.clientTimestamp,
      );
    }
    return throwError(() => err);
  }

  handleSyncComplete(
    anySuccess: boolean,
    setIsDownloadEnabled: ((val: boolean) => void) | undefined,
    setIsSyncInProgress: (val: boolean) => void,
    postSyncHandler: () => void,
  ) {
    if (setIsDownloadEnabled) setIsDownloadEnabled(true);
    setIsSyncInProgress(false);
    if (anySuccess) {
      this.kendoNotificationService.showSuccess(
        'All offline submissions have been synced.',
      );
    }
    postSyncHandler();
  }

  handleSyncError(
    err: any,
    setIsDownloadEnabled: ((val: boolean) => void) | undefined,
    setIsSyncInProgress: (val: boolean) => void,
  ) {
    if (setIsDownloadEnabled) setIsDownloadEnabled(true);
    setIsSyncInProgress(false);
    this.kendoNotificationService.showError(
      err ?? 'Error syncing submissions. Please try again later.',
    );
  }
}
