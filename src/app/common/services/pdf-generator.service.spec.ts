import jsPDF from 'jspdf';
import { PdfGeneratorService } from './pdf-generator.service';
import { saveAs } from 'file-saver';

const mockJsPdf = {
  addPage: jest.fn(),
  addImage: jest.fn(),
  save: jest.fn(),
  output: jest
    .fn()
    .mockReturnValue(new Blob(['mockPDF'], { type: 'application/pdf' })),
  getImageProperties: jest.fn(() => ({ width: 1000, height: 2000 })),
  internal: {
    pageSize: {
      getWidth: () => 595,
      getHeight: () => 842,
    },
  },
};

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn(() => mockJsPdf),
}));

const mockCanvas = document.createElement('canvas');
mockCanvas.width = 1000;
mockCanvas.height = 2000;
mockCanvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,fake');

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve(mockCanvas)),
}));

jest.mock('file-saver', () => ({
  __esModule: true,
  saveAs: jest.fn(),
}));

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;
  let component: any;

  const addElement = (selector: string, tag = 'div') => {
    const el = document.createElement(tag);
    if (selector.startsWith('.')) {
      el.classList.add(selector.substring(1));
    } else if (selector.startsWith('#')) {
      el.id = selector.substring(1);
    } else if (selector.startsWith('[ref=')) {
      el.setAttribute('ref', selector.replace(/\[ref="(.+)"\]/, '$1'));
    }
    document.body.appendChild(el);
    return el;
  };

  beforeEach(() => {
    service = new PdfGeneratorService();
    document.body.innerHTML = '';
    component = {
      enableSubmitbtn: function () {
        const submitButton = document.querySelector(
          'button[type="submit"].primary-purple-btn',
        ) as HTMLElement;
        if (submitButton) {
          submitButton.style.display = '';
        }
      },
    };

    class DummyComponent {
      enableSubmitbtn() {
        const submitButton = document.querySelector(
          'button[type="submit"].primary-purple-btn',
        ) as HTMLElement;
        if (submitButton) {
          submitButton.style.display = '';
        }

        const draftButton = document.querySelector(
          'button[type="button"].primary-purple-outline-btn',
        ) as HTMLElement;
        if (draftButton) {
          draftButton.style.display = '';
        }
      }
    }

    component = new DummyComponent();
    document.body.innerHTML = `
    <button type="submit" class="primary-purple-btn" style="display:none">Submit</button>
    <button type="button" class="primary-purple-outline-btn" style="display:none">Save as Draft</button>`;
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('PDF generation logic', () => {
    it('should add image only (first page)', async () => {
      const result = await (service as any).sliceCanvasToMultiplePages(
        mockJsPdf,
        mockCanvas,
        true,
      );
      expect(mockJsPdf.addPage).not.toHaveBeenCalled();
      expect(mockJsPdf.addImage).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should add page and image (not first page)', async () => {
      const result = await (service as any).sliceCanvasToMultiplePages(
        mockJsPdf,
        mockCanvas,
        false,
      );
      expect(mockJsPdf.addPage).toHaveBeenCalled();
      expect(mockJsPdf.addImage).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should call saveAs on non-iOS in downloadPDFFilledForm', async () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Chrome',
        configurable: true,
      });

      const container = document.createElement('div');
      const formInstance = {
        form: { display: 'form' },
        _form: { title: 'MyForm' },
      };
      await service.downloadPDFFilledForm(
        container,
        formInstance,
        'MyTitle',
        '2025-07-11',
      );
      expect(saveAs).toHaveBeenCalled();
    });

    it('should generate PDF for form display in downloadPDF()', async () => {
      const formInstance = {
        form: { display: 'form' },
        _form: { title: 'My Form' },
      };
      const container = document.createElement('div');
      const radio = document.createElement('div');
      radio.className = 'radio-custom';
      document.body.appendChild(radio);

      jest.spyOn<any, any>(service, 'captureFormTabs').mockResolvedValue(true);

      await service.downloadPDF(container, formInstance);

      expect(mockJsPdf.save).toHaveBeenCalled();
      expect(jsPDF).toHaveBeenCalled();
      expect(document.querySelector('.radio-custom')).toBeNull();
    });

    it('should fallback to Untitled_Form if form title is missing', async () => {
      const formInstance = {
        form: { display: 'form' },
        _form: {},
      };
      const container = document.createElement('div');
      jest.spyOn<any, any>(service, 'captureFormTabs').mockResolvedValue(true);

      await service.downloadPDF(container, formInstance);

      expect(mockJsPdf.save).toHaveBeenCalledWith(
        expect.stringContaining('Untitled_Form'),
      );
    });

    it('should capture wizard pages in captureWizardPages()', async () => {
      const formInstance = {
        pages: [0, 1, 2],
        setPage: jest.fn(() => Promise.resolve()),
      };
      const container = document.createElement('div');
      jest
        .spyOn<any, any>(service, 'sliceCanvasToMultiplePages')
        .mockResolvedValue(false);

      const result = await (service as any).captureWizardPages(
        mockJsPdf,
        container,
        formInstance,
        true,
      );

      expect(formInstance.setPage).toHaveBeenCalledTimes(3);
      expect(result).toBe(false);
    });

    it('should handle missing pages gracefully in captureWizardPages()', async () => {
      const formInstance = {
        setPage: jest.fn(() => Promise.resolve()),
      };
      const container = document.createElement('div');
      jest
        .spyOn<any, any>(service, 'sliceCanvasToMultiplePages')
        .mockResolvedValue(false);

      const result = await (service as any).captureWizardPages(
        mockJsPdf,
        container,
        formInstance,
        true,
      );
      expect(formInstance.setPage).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    it('should call captureWizardPages for wizard form', async () => {
      const formInstance = {
        form: { display: 'wizard' },
        _form: { title: 'Wizard Form' },
        setPage: jest.fn(),
        pages: [1, 2],
      };
      const container = document.createElement('div');
      jest
        .spyOn<any, any>(service, 'captureWizardPages')
        .mockResolvedValue(true);

      await service.downloadPDF(container, formInstance);

      expect(service['captureWizardPages']).toHaveBeenCalled();
    });

    it('should capture simple form if no tabs in captureFormTabs()', async () => {
      const formInstance = { form: { display: 'form' } };
      const container = document.createElement('div');
      jest
        .spyOn<any, any>(service, 'sliceCanvasToMultiplePages')
        .mockResolvedValue(false);

      const result = await (service as any).captureFormTabs(
        mockJsPdf,
        container,
        formInstance,
        true,
      );

      expect(result).toBe(false);
    });

    it('should click and restore tabs in captureFormTabs()', async () => {
      const container = document.createElement('div');
      const tab1 = document.createElement('a');
      const tab2 = document.createElement('a');
      tab1.setAttribute('ref', 'tabLink-tabs');
      tab2.setAttribute('ref', 'tabLink-tabs');
      tab2.classList.add('active');
      container.appendChild(tab1);
      container.appendChild(tab2);
      const formInstance = { form: { display: 'form' } };
      jest
        .spyOn<any, any>(service, 'sliceCanvasToMultiplePages')
        .mockResolvedValue(false);

      const result = await (service as any).captureFormTabs(
        mockJsPdf,
        container,
        formInstance,
        true,
      );

      expect(result).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('should handle missing formInstance.form gracefully in downloadPDF', async () => {
      const container = document.createElement('div');
      const formInstance = { _form: { title: 'Missing Form' } };
      jest.spyOn<any, any>(service, 'captureFormTabs').mockResolvedValue(true);

      await service.downloadPDF(container, formInstance);

      expect(mockJsPdf.save).toHaveBeenCalledWith(
        expect.stringContaining('Missing Form'),
      );
    });

    it('should handle DOM manipulation in disableSubmitbtn()', () => {
      const submitBtn = document.createElement('button');
      submitBtn.classList.add('primary-purple-btn');
      submitBtn.setAttribute('type', 'submit');
      document.body.appendChild(submitBtn);

      const draftBtn = document.createElement('button');
      draftBtn.classList.add('primary-purple-outline-btn');
      draftBtn.setAttribute('type', 'button');
      document.body.appendChild(draftBtn);

      document.body.appendChild(addElement('.formio-button-add-row'));
      document.body.appendChild(
        addElement('[ref="datagrid-unloadingActiveSealReporting-addRow"]'),
      );
      document.body.appendChild(addElement('[ref="suffix"]'));
      document.body.appendChild(addElement('.hide-on-print'));
      document.body.appendChild(addElement('.formio-button-remove-row'));

      const scrollable = document.createElement('div');
      scrollable.classList.add('table-scrollable');
      document.body.appendChild(scrollable);

      service.disableSubmitbtn();

      const updatedSubmitBtn = document.querySelector(
        'button.primary-purple-btn',
      ) as HTMLElement;
      const updatedScrollable = document.querySelector(
        '[data-restore-scrollable]',
      ) as HTMLElement;

      expect(updatedSubmitBtn.style.display).toBe('none');
      expect(updatedScrollable.classList.contains('table-scrollable')).toBe(
        false,
      );
      expect(updatedScrollable.getAttribute('data-restore-scrollable')).toBe(
        'true',
      );
    });

    it('should handle DOM restoration in enableSubmitbtn()', () => {
      const submitBtn = addElement('button.primary-purple-btn');
      submitBtn.setAttribute('type', 'submit');
      const draftBtn = addElement('button.primary-purple-outline-btn');
      draftBtn.setAttribute('type', 'button');
      addElement('.formio-button-add-row');
      addElement('[ref="datagrid-unloadingActiveSealReporting-addRow"]');
      addElement('[ref="suffix"]');
      addElement('.hide-on-print');
      addElement('.formio-button-remove-row');
      const scrollTable = addElement('div');
      scrollTable.setAttribute('data-restore-scrollable', 'true');
      service.enableSubmitbtn();
      expect(submitBtn.style.display).toBe('');
      expect(scrollTable.classList.contains('table-scrollable')).toBe(true);
      expect(scrollTable.hasAttribute('data-restore-scrollable')).toBe(false);
    });

    it('should use anchor method in downloadPDFFilledForm for iOS devices', async () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'iPhone',
        configurable: true,
      });

      const container = document.createElement('div');
      const formInstance = {
        form: { display: 'form' },
        _form: { title: 'MyForm' },
      };

      const clickMock = jest.fn();
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      const revokeMock = jest.fn();

      globalThis.URL.createObjectURL = jest.fn(() => 'blob:url');
      globalThis.URL.revokeObjectURL = revokeMock;

      const link = document.createElement('a');
      link.click = clickMock;
      document.createElement = jest.fn(() => link);

      await service.downloadPDFFilledForm(
        container,
        formInstance,
        'MyForm',
        '2025-07-11',
      );

      expect(clickMock).toHaveBeenCalled();
      expect(revokeMock).toHaveBeenCalledWith('blob:url');
    });

    it('should handle undefined formInstance gracefully in downloadPDF', async () => {
      const container = document.createElement('div');
      const emptyFormInstance: any = {};
      jest.spyOn<any, any>(service, 'captureFormTabs').mockResolvedValue(true);

      await expect(
        service.downloadPDF(container, emptyFormInstance),
      ).resolves.toBeUndefined();
      expect(mockJsPdf.save).toHaveBeenCalledWith(
        expect.stringContaining('Untitled_Form'),
      );
    });

    it('should handle corrupt canvas in sliceCanvasToMultiplePages()', async () => {
      const corruptCanvas = document.createElement('canvas');
      corruptCanvas.toDataURL = jest.fn(() => {
        throw new Error('Corrupt canvas');
      });

      await expect(
        (service as any).sliceCanvasToMultiplePages(
          mockJsPdf,
          corruptCanvas,
          true,
        ),
      ).rejects.toThrow('Corrupt canvas');
    });

    it('should handle missing canvas.toDataURL gracefully', async () => {
      const badCanvas = document.createElement('canvas');
      delete (badCanvas as any).toDataURL;

      await expect(
        (service as any).sliceCanvasToMultiplePages(mockJsPdf, badCanvas, true),
      ).rejects.toThrow();
    });

    it('should skip addImage if imgHeight is 0 or undefined', async () => {
      const testCanvas = document.createElement('canvas');
      testCanvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,bad');
      const mockPdf = {
        ...mockJsPdf,
        getImageProperties: jest.fn(() => ({ width: 0, height: 0 })),
        addImage: jest.fn(),
      };

      const result = await (service as any).sliceCanvasToMultiplePages(
        mockPdf,
        testCanvas,
        true,
      );
      expect(mockPdf.addImage).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should enable the submit button by clearing display style', () => {
      const button = document.querySelector(
        'button.primary-purple-btn',
      ) as HTMLButtonElement;
      expect(button.style.display).toBe('none'); // Initially hidden

      component.enableSubmitbtn();

      expect(button.style.display).toBe('');
    });

    it('should set draftButton.style.display to empty string', () => {
      component.enableSubmitbtn();

      const draftButton = document.querySelector(
        'button[type="button"].primary-purple-outline-btn',
      ) as HTMLElement;

      expect(draftButton).toBeTruthy();
      expect(draftButton.style.display).toBe('');
    });
  });
});
