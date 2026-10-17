import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IndexedDBApiDataService {
  private readonly dbName = 'OfflineCacheDB';
  private readonly storeName = 'HttpCache';

  constructor() {
    const request = indexedDB.open(this.dbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(this.storeName)) {
        db.createObjectStore(this.storeName);
      }
    };
  }

  set(key: string, value: any): void {
    const request = indexedDB.open(this.dbName);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(value, key);
    };
  }

  get(key: string): Promise<any> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => resolve(null);
      };
    });
  }
}
