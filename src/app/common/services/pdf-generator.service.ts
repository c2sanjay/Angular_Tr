import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDate } from '../../common/utils/date-utils';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root',
})
export class PdfGeneratorService {
  constructor() {}

  // PDF generation logic triggered by the Download PDF button.
  async downloadPDF(
    formContainer: HTMLElement,
    formInstance: any,
    _formTitle?: string,
    formattedDate: string = formatDate(new Date()),
  ): Promise<void> {
    this.disableSubmitbtn();

    const formTitle =
      _formTitle ?? formInstance?._form?.title ?? 'Untitled_Form';
    formContainer.classList.add('force-show-radios');
    const radioElements = document.querySelectorAll('.radio-custom');
    radioElements.forEach((el) => el.classList.remove('radio-custom'));

    const pdf = new jsPDF('p', 'pt', 'letter');

    const displayType = formInstance.form?.display ?? 'form';

    if (
      displayType === 'wizard' &&
      typeof formInstance.setPage === 'function'
    ) {
      await this.captureWizardPages(pdf, formContainer, formInstance, true);
    } else {
      await this.captureFormTabs(pdf, formContainer, formInstance, true);
    }

    pdf.save(`${formTitle} Form ${formattedDate}.pdf`);
    this.enableSubmitbtn();
  }

  // Wizard capture (existing logic)
  private async captureWizardPages(
    pdf: jsPDF,
    container: HTMLElement,
    formInstance: any,
    isFirstPage: boolean,
  ): Promise<boolean> {
    const totalPages = formInstance.pages?.length ?? 1;
    for (let i = 0; i < totalPages; i++) {
      await formInstance.setPage(i, { allowInvalidSubmit: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const bigCanvas = await html2canvas(container, { scale: 2 } as any);
      isFirstPage = await this.sliceCanvasToMultiplePages(
        pdf,
        bigCanvas,
        isFirstPage,
      );
    }
    return isFirstPage;
  }

  // Adding Header, Footer, and Watermark
  private async captureFormTabs(
    pdf: jsPDF,
    container: HTMLElement,
    formInstance: any,
    isFirstPage: boolean,
  ): Promise<boolean> {
    const tabLinks: NodeListOf<HTMLElement> = container.querySelectorAll(
      'a[ref="tabLink-tabs"], button.page-link[ref^="wizard-"]',
    );

    if (tabLinks.length > 0) {
      let originalTabIndex = -1;
      tabLinks.forEach((link, idx) => {
        if (link.classList.contains('active')) {
          originalTabIndex = idx;
        }
      });

      for (const tab of Array.from(tabLinks)) {
        tab.click();
        await new Promise((r) => setTimeout(r, 500));
        const bigCanvas = await html2canvas(container, { scale: 2 } as any);
        isFirstPage = await this.sliceCanvasToMultiplePages(
          pdf,
          bigCanvas,
          isFirstPage,
        );
      }

      if (originalTabIndex >= 0 && originalTabIndex < tabLinks.length) {
        tabLinks[originalTabIndex].click();
      }
    } else {
      const bigCanvas = await html2canvas(container, { scale: 2 } as any);

      isFirstPage = await this.sliceCanvasToMultiplePages(
        pdf,
        bigCanvas,
        isFirstPage,
      );
    }

    return isFirstPage;
  }

  private async sliceCanvasToMultiplePages(
    pdf: jsPDF,
    bigCanvas: HTMLCanvasElement,
    isFirstPage: boolean,
  ): Promise<boolean> {
    const topMargin = 20,
      bottomMargin = 20,
      leftMargin = 20,
      rightMargin = 20;
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - (leftMargin + rightMargin);
    const contentHeight = pdfHeight - (topMargin + bottomMargin);

    const imgData = bigCanvas.toDataURL('image/jpeg', 0.8);
    const imgProps = pdf.getImageProperties(imgData);

    const canvasWidth = imgProps.width;
    const canvasHeight = imgProps.height;
    const ratio = canvasWidth / canvasHeight;

    let imgHeight = contentWidth / ratio;

    if (imgHeight > contentHeight) {
      imgHeight = contentHeight;
    }

    if (!isFirstPage) {
      pdf.addPage();
    }
    isFirstPage = false;

    pdf.addImage(
      imgData,
      'JPEG',
      leftMargin,
      topMargin,
      contentWidth,
      imgHeight,
    );

    return isFirstPage;
  }

  disableSubmitbtn() {
    // Hide submit button
    const submitButton = document.querySelector(
      'button[type="submit"].primary-purple-btn',
    ) as HTMLElement;
    if (submitButton) {
      submitButton.style.display = 'none';
    }

    //   Hide "Save as Draft" button
    const draftButton = document.querySelector(
      'button[type="button"].primary-purple-outline-btn',
    ) as HTMLElement;
    if (draftButton) {
      draftButton.style.display = 'none';
    }

    // Hide add row buttons
    const addRow = document.querySelector(
      '.formio-button-add-row',
    ) as HTMLElement;
    const addRowButton = document.querySelector(
      '[ref="datagrid-unloadingActiveSealReporting-addRow"]',
    ) as HTMLElement;
    if (addRow) addRow.style.display = 'none';
    if (addRowButton) addRowButton.style.display = 'none';

    // Hide date pickers
    const datePickers = document.querySelectorAll('[ref="suffix"]');
    datePickers.forEach((el) => ((el as HTMLElement).style.display = 'none'));

    // Hide all elements with .hide-on-print
    const resetButtons: NodeListOf<HTMLElement> =
      document.querySelectorAll('.hide-on-print');
    resetButtons.forEach((button) => {
      button.style.display = 'none';
    });
    const removedRow: NodeListOf<HTMLElement> = document.querySelectorAll(
      '.formio-button-remove-row',
    );
    removedRow.forEach((button) => {
      button.style.display = 'none';
    });

    // Remove 'table-scrollable' class and mark for restore
    const scrollableTables = document.querySelectorAll('.table-scrollable');
    scrollableTables.forEach((el) => {
      el.classList.remove('table-scrollable');
      el.setAttribute('data-restore-scrollable', 'true');
    });
  }

  enableSubmitbtn() {
    // Show submit button
    const submitButton = document.querySelector(
      'button[type="submit"].primary-purple-btn',
    ) as HTMLElement;
    if (submitButton) {
      submitButton.style.display = '';
    }

    // Show "Save as Draft" button
    const draftButton = document.querySelector(
      'button[type="button"].primary-purple-outline-btn',
    ) as HTMLElement;
    if (draftButton) {
      draftButton.style.display = '';
    }

    // Show add row buttons
    const addRow = document.querySelector(
      '.formio-button-add-row',
    ) as HTMLElement;
    const addRowButton = document.querySelector(
      '[ref="datagrid-unloadingActiveSealReporting-addRow"]',
    ) as HTMLElement;
    if (addRow) addRow.style.display = '';
    if (addRowButton) addRowButton.style.display = '';

    // Show date pickers
    const datePickers = document.querySelectorAll('[ref="suffix"]');
    datePickers.forEach((el) => ((el as HTMLElement).style.display = ''));

    // Show all elements with .hide-on-print
    const resetButtons: NodeListOf<HTMLElement> =
      document.querySelectorAll('.hide-on-print');
    resetButtons.forEach((button) => {
      button.style.display = '';
    });

    const removedRow: NodeListOf<HTMLElement> = document.querySelectorAll(
      '.formio-button-remove-row',
    );
    removedRow.forEach((button) => {
      button.style.display = '';
    });

    // Re-add 'table-scrollable' class
    const scrollableTables = document.querySelectorAll(
      '[data-restore-scrollable]',
    );
    scrollableTables.forEach((el) => {
      el.classList.add('table-scrollable');
      el.removeAttribute('data-restore-scrollable');
    });
  }

  async downloadPDFFilledForm(
    formContainer: HTMLElement,
    formInstance: any,
    _formTitle?: string,
    formattedDate: string = formatDate(new Date()),
  ): Promise<void> {
    this.disableSubmitbtn();

    const formTitle =
      _formTitle ?? formInstance?._form?.title ?? 'Untitled_Form';
    formContainer.classList.add('force-show-radios');
    const radioElements = document.querySelectorAll('.radio-custom');
    radioElements.forEach((el) => el.classList.remove('radio-custom'));

    const pdf = new jsPDF('p', 'pt', 'letter');

    const displayType = formInstance.form?.display ?? 'form';

    if (
      displayType === 'wizard' &&
      typeof formInstance.setPage === 'function'
    ) {
      await this.captureWizardPages(pdf, formContainer, formInstance, true);
    } else {
      await this.captureFormTabs(pdf, formContainer, formInstance, true);
    }

    //  Convert PDF to Blob and use a download anchor
    const pdfBlob = pdf.output('blob');
    const fileName = `${formTitle} Form ${formattedDate}.pdf`;

    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } else {
      // For non-iOS devices, use saveAs
      saveAs(pdfBlob, fileName);
    }

    this.enableSubmitbtn();
  }
}
