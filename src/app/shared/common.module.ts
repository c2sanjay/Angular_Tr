import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppLogoComponent } from './components/app-logo/app-logo.component';
import { AppLoginImgComponent } from './components/app-login-img/app-login-img.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InnerLogoComponent } from './components/inner-logo/inner-logo.component';
import { SorticonComponent } from './components/icons/sorticon/sorticon.component';
import { ExpandiconComponent } from './components/icons/expandicon/expandicon.component';
import { ViewiconComponent } from './components/icons/viewicon/viewicon.component';
import { DeleteiconComponent } from './components/icons/deleteicon/deleteicon.component';
import { EditiconComponent } from './components/icons/editicon/editicon.component';
import { DownloadIconComponent } from './components/icons/download-icon/download-icon.component';
import { ProfilepicComponent } from './components/icons/profilepic/profilepic.component';
import { VendoriconComponent } from './components/icons/vendoricon/vendoricon.component';
import { InspectionHubiconComponent } from './components/icons/inspection-hubicon/inspection-hubicon.component';
import { FormmgmticonComponent } from './components/icons/formmgmticon/formmgmticon.component';
import { LogouticonComponent } from './components/icons/logouticon/logouticon.component';
import { TruckpicComponent } from './components/icons/truckpic/truckpic.component';
import { PrinticonComponent } from './components/icons/printicon/printicon.component';
import { EditIconComponent } from './components/icons/edit-icon/edit-icon.component';
import { DeliconComponent } from './components/icons/delicon/delicon.component';
import { CollapseiconComponent } from './components/icons/collapseicon/collapseicon.component';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { TabsComponent } from './components/tabs/tabs.component';
import { TabComponent } from './components/tabs/tab.component';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
import { TabNavigationButtonsComponent } from './components/tab-navigation-buttons/tab-navigation-buttons.component';
import { OfflineModeComponent } from './offline-mode/offline-mode.component';
import { SyncModeComponent } from './sync-mode/sync-mode.component';
import { CommonApiService } from './services/common-api.service';
import { FaArrowRightIconComponent } from './components/icons/fa-arrow-right-icon/fa-arrow-right-icon.component';
import { FaArrowLeftIconComponent } from './components/icons/fa-arrow-left-icon/fa-arrow-left-icon.component';
import { FaDownloadIconComponent } from './components/icons/fa-download-icon/fa-download-icon.component';

const modules = [CommonModule, FormsModule, ReactiveFormsModule, RouterModule];
@NgModule({
  declarations: [
    AppLogoComponent,
    AppLoginImgComponent,
    InnerLogoComponent,
    SorticonComponent,
    ExpandiconComponent,
    CollapseiconComponent,
    DeleteiconComponent,
    EditiconComponent,
    DownloadIconComponent,
    ViewiconComponent,
    ProfilepicComponent,
    VendoriconComponent,
    InspectionHubiconComponent,
    LogouticonComponent,
    FormmgmticonComponent,
    TruckpicComponent,
    PrinticonComponent,
    EditIconComponent,
    DeliconComponent,
    TabsComponent,
    TabComponent,
    LoadingSpinnerComponent,
    TabNavigationButtonsComponent,
    OfflineModeComponent,
    SyncModeComponent,
    FaArrowRightIconComponent,
    FaArrowLeftIconComponent,
    FaDownloadIconComponent,
  ],
  imports: [modules, DropDownsModule, ButtonsModule],
  exports: [
    AppLogoComponent,
    AppLoginImgComponent,
    modules,
    InnerLogoComponent,
    SorticonComponent,
    ExpandiconComponent,
    CollapseiconComponent,
    DeleteiconComponent,
    EditiconComponent,
    DownloadIconComponent,
    ViewiconComponent,
    ProfilepicComponent,
    VendoriconComponent,
    LogouticonComponent,
    InspectionHubiconComponent,
    FormmgmticonComponent,
    TruckpicComponent,
    PrinticonComponent,
    EditIconComponent,
    DeliconComponent,
    TabsComponent,
    TabComponent,
    LoadingSpinnerComponent,
    TabNavigationButtonsComponent,
    OfflineModeComponent,
    SyncModeComponent,
    FaArrowRightIconComponent,
    FaArrowLeftIconComponent,
    FaDownloadIconComponent,
  ],
  providers: [CommonApiService],
})
export class CommonAppModule {}
