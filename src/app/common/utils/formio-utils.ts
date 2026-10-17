import { DropdownService } from '../services/dropdown.service';

//Dynamic keys for dropdown API Keys
export function getDropdownKeys(formInstance: any): string[] {
  const dropdownKeys: string[] = [];
  formInstance.everyComponent((component: any) => {
    if (
      component?.component?.dataSrc &&
      ['values', 'url', 'resource', 'custom'].includes(
        component.component.dataSrc,
      )
    ) {
      dropdownKeys.push(component.component.key);
    }
  });

  return dropdownKeys;
}

//scan form Component and fetch api url
export function processComponents(
  components: any[],
  token: string,
  dropdownService: DropdownService,
): Promise<void[]> {
  const fetchPromises: Promise<void>[] = [];

  const recurse = (comps: any[]) => {
    for (const comp of comps) {
      if (comp.type === 'select' && comp.data?.url) {
        fetchPromises.push(
          dropdownService.fetchAndCache(comp.key, comp.data.url, token),
        );
      }
      if (comp.components) recurse(comp.components);
    }
  };

  recurse(components);
  return Promise.all(fetchPromises);
}
