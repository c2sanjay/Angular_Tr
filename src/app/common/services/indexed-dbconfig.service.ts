import { Injectable } from '@angular/core';
import { DBConfig, ObjectStoreMeta } from 'ngx-indexed-db';
import { from, Observable, switchMap } from 'rxjs';
import { FORM_DB_NAME } from 'src/app/shared/constants/indexed-db-names';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBConfigService {
  private readonly dbName = 'RailDatabase'; // Database Name
  private readonly dbVersion = 3; // Database Version
  private db: IDBDatabase | null = null;
  private readonly dbReady!: Promise<void>;

  constructor() {
    this.dbReady = this.initDB(); //NOSONAR
  }

  generateDBConfig(
    storeName: string,
    fields: { name: string; unique?: boolean }[] = [],
  ): DBConfig {
    // If no fields are provided, allow flexible schema
    const objectStoreMeta: ObjectStoreMeta = {
      store: storeName,
      storeConfig: { keyPath: 'clientTimestamp', autoIncrement: true },
      storeSchema:
        fields.length > 0
          ? fields.map((field) => ({
              name: field.name,
              keypath: field.name,
              options: { unique: field.unique || false },
            }))
          : [],
    };

    return {
      name: this.dbName,
      version: this.dbVersion,
      objectStoresMeta: [objectStoreMeta], // Dynamic schema
    };
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (db.objectStoreNames.contains('formSubmissions')) {
          db.deleteObjectStore('formSubmissions');
        }

        if (!db.objectStoreNames.contains(FORM_DB_NAME)) {
          db.createObjectStore(FORM_DB_NAME, {
            keyPath: 'clientTimestamp',
          });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB initialization error:', event);
        reject(event as unknown as Error);
      };
    });
  }

  add(storeName: string, data: any): Observable<any> {
    return from(this.dbReady).pipe(
      switchMap(
        () =>
          new Observable((observer) => {
            if (!this.db) {
              observer.error('Database not initialized');
              return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => observer.next(data);
            request.onerror = () => observer.error('Add failed');

            transaction.oncomplete = () => observer.complete();
          }),
      ),
    );
  }

  getAll(storeName: string): Observable<any[]> {
    return new Observable((observer) => {
      if (!this.db) {
        observer.error('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      const request = store.getAll();

      request.onsuccess = () => observer.next(request.result);
      request.onerror = () => observer.error('GetAll failed');

      transaction.oncomplete = () => observer.complete();
    });
  }

  delete(storeName: string, key: any): Observable<void> {
    return from(
      new Promise<void>((resolve, reject) => {
        if (!this.db) {
          reject('Database not initialized' as unknown as Error);
          return;
        }

        const tx = this.db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e as unknown as Error);
      }),
    );
  }
}
