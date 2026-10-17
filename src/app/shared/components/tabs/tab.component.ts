import { Component, Input, TemplateRef, ContentChild } from '@angular/core';

@Component({
  selector: 'app-tab',
  template: `<ng-template><ng-content></ng-content></ng-template>`,
})
export class TabComponent {
  @Input() label!: string;
  @ContentChild(TemplateRef) content!: TemplateRef<any>;
}
