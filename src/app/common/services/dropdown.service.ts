import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IndexedDBService } from './indexed-db.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DropdownService {
  roles: string[] = [];
  constructor(
    private readonly http: HttpClient,
    private readonly indexedDB: IndexedDBService,
  ) {}

  //Fetch API Data and Store/cache in IndexedDB
  fetchAndCache(key: string, url: string, token: string): Promise<void> {
    if (!token || !url) return Promise.resolve(); // skip invalid calls

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    return firstValueFrom(this.http.get<any[]>(url, { headers }))
      .then(async(data) => {
        if (data) {
         await this.indexedDB.set(key, data);
        }
      })
      .catch((err) => {
        console.error(`Failed to fetch ${key}:`, err);
      });
  }


  async injectDropdownData(
    formInstance: any,
    key: string,
    prefillValues?: Record<string, string>,
  ): Promise<void> {
   
    try {
      const data = await this.indexedDB.get(key);
      if (!Array.isArray(data) || data.length === 0) return;

      const dropdown = formInstance.getComponent(key);
      if (!dropdown) return this.logMissingDropdown(key);

      this.prepareDropdown(dropdown);

      const values = this.buildDropdownValues(
        data,
        dropdown.component.template,
      );
      dropdown.component.data = { values };
      dropdown.component.template = '';
    setTimeout(()=>{
 this.refreshDropdown(dropdown);
    })
     

      if (this.tryApplyPrefill(dropdown, values, prefillValues?.[key])) return;

      this.applyAutoSelectIfEmpty(dropdown, values);
    } catch (error) {
      console.error(`Error injecting dropdown data for key "${key}":`, error);
    }
    
  }

  private logMissingDropdown(key: string): void {
    console.warn(`Dropdown component with key "${key}" not found.`);
  }

  private prepareDropdown(dropdown: any): void {
    dropdown.disabled = true;
    dropdown.component.dataSrc = 'values';
  }

  private buildDropdownValues(data: any[], template: string): any[] {
    return data.map((item) => {
      let computedLabel = template
        ? template.replace(/{item\.(\w+)}/g, (_, property) =>
            item[property] != null ? item[property].toString() : '',
          )
        : '';

      if (!computedLabel.trim()) {
        computedLabel = item.name?.toString() ?? '';
      }

      return {
        item,
        label: computedLabel,
        value: item,
      };
    });
  }

  private refreshDropdown(dropdown: any): void {
    if (typeof dropdown.redraw === 'function') {
      dropdown.redraw();
    } else {
      dropdown.setValue(dropdown.getValue());
    }
    dropdown.disabled = false;
  }

  private tryApplyPrefill(
    dropdown: any,
    values: any[],
    prefillTarget?: string,
  ): boolean {
    if (!prefillTarget) return false;

    const matched = values.find((v) =>
      [v.label, v.value?.name, v.item?.name, v.value?.id, v.item?.id].includes(
        prefillTarget,
      ),
    );

    if (matched) {
      const isMultiple = dropdown.component?.multiple;
      dropdown.setValue(isMultiple ? [matched.value] : matched.value);
      dropdown.disabled = true;
      return true;
    }

    return false;
  }

  private applyAutoSelectIfEmpty(dropdown: any, values: any[]): void {
    const currentValue = dropdown.getValue();
    const isEmpty =
      currentValue == null ||
      currentValue === '' ||
      (Array.isArray(currentValue) && currentValue.length === 0);

    if (!isEmpty) return;

    if (values.length === 1) {
      dropdown.setValue(values[0].value);
      return;
    }

    const yardFromUrl = decodeURIComponent(
      new URLSearchParams(window.location.search).get('yard') ?? '',
    );

    const matchedYard = values.find((v) =>
      [v.label, v.value?.name, v.item?.name].includes(yardFromUrl),
    );

    if (matchedYard) {
      const isMultiple = dropdown.component?.multiple;
      dropdown.setValue(isMultiple ? [matchedYard.value] : matchedYard.value);
    }
  }

  attachClickEventsOnce(
    formInstance: any,
    keys: string[],
    callback: (key: string) => void,
  ): void {
    keys.forEach((key) => {
      const dropdown = formInstance.getComponent(key);

      if (dropdown?.element) {
        const existingHandler = dropdown._clickHandler;
        if (existingHandler) {
          dropdown.element.removeEventListener('click', existingHandler);
        }

        // Create a new handler and store it for later removal
        const handler = () => {
          callback(key);
          dropdown._clickHandler = null;
        };

        dropdown._clickHandler = handler;

        dropdown.element.addEventListener('click', handler, { once: true });
      }
    });
  }
}
