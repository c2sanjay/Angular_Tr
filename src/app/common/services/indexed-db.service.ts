import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { from, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private readonly dbPromise: Promise<IDBDatabase>;
  constructor(private readonly dbService: NgxIndexedDBService) {
    this.dbPromise = this.createDatabase(); // NOSONAR
  }

  private async createDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RailDatabase', 3);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('DraftForms')) {
          const store = db.createObjectStore('DraftForms', {
            keyPath: 'id',
            autoIncrement: true,
          });

          store.createIndex('status', 'status', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error as any as Error);
    });
  }

  add(storeName: string, data: any): Observable<any> {
    return this.dbService.add(storeName, data);
  }

  getAll(storeName: string): Observable<any[]> {
    return this.dbService.getAll(storeName);
  }

  /**
   * Delete an entry from IndexedDB
   * @param storeName Table name
   * @param id Primary key of the entry
   */
  delete(storeName: string, id: number): Observable<any> {
    return this.dbService.delete(storeName, id);
  }
  // update(storeName: string, value: any): Observable<any> {
  //   return from(this.dbService.update(storeName, value));
  // }

  /// Index DB STORAGE /////////////////
  //Step 4: Fetch API Data and Store in IndexedDB

  //private dbName = 'FormAPICachedDB';
  private readonly dbName = 'RailCarFormDataDB';
  private readonly storeName = 'APIData';

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error as any as Error);
    });
  }

  async get(key: string): Promise<any> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data ?? null);
      request.onerror = () => reject(request.error as any as Error);
      tx.oncomplete = () => db.close();
    });
  }

  async set(key: string, data: any): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    store.put({ key, data });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error as any as Error);
    });
  }

  // Expose getByKey
  getByKey(storeName: string, key: number): Observable<any> {
    return from(
      this.dbPromise.then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction([storeName], 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.get(key);

          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error as Error);
        });
      }),
    );
  }

  // Expose update
  update(storeName: string, value: any): Observable<any> {
    return from(
      this.dbPromise.then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction([storeName], 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.put(value);

          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error as Error);
        });
      }),
    );
  }

  // Your reusable method
  updateStatus(store: string, id: number, newStatus: string): Observable<any> {
    return this.getByKey(store, id).pipe(
      switchMap((entry: any) => {
        if (entry) {
          entry.status = newStatus;
          return this.update(store, entry);
        }
        return from([null]);
      }),
    );
  }
}
