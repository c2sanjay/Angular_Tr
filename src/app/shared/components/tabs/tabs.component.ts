import {
  Component,
  ContentChildren,
  QueryList,
  AfterContentInit,
  Output,
  EventEmitter,
} from '@angular/core';
import { TabComponent } from './tab.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
})
export class TabsComponent implements AfterContentInit {
  @ContentChildren(TabComponent) tabs!: QueryList<TabComponent>;
  @Output() tabChanged = new EventEmitter<number>();
  public selectedIndex = 2;

  ngAfterContentInit() {
    if (this.tabs.length > 0) {
      this.selectTab(this.selectedIndex);
    }
  }

  selectTab(index: number) {
    if (index < 0 || index >= this.tabs.length) return;
    this.selectedIndex = index;
    this.tabChanged.emit(index); // This emits a number
  }
}
