(function waitForFormio() {
  if (!window.Formio || !Formio.Components) {
   console.warn("Formio is not yet available. Retrying...");
    setTimeout(waitForFormio, 100);
    return;
  }

  // ------------------------------------
  // 1. Register Railcar Id Dropdown Component
  // ------------------------------------
  

  Formio.registerComponent("YardName", class YardNameDropdown extends Formio.Components.components.select {
    
    static schema(...extend) {
        return {
            ...Formio.Components.components.select.schema(...extend),
            type: "YardName",
            key: "YardName",
            label: "YardName",
            placeholder: "Select a YardName",
            dataSrc: "url",
            data: { 
                url: "https://api.dev.trinsightlogisticsplatform.com/api/YardCustomer",
                headers: [] 
            },
            valueProperty: "id",
            dataPath: 'roles',
            template: "<span>{{ item.name }}</span>",
            refreshOn: 'Any Change',
            clearOnRefresh: true,
            customConditional: "show = data.userRole === 'admin';",
            widget: "html5",
            input: true
        };
    }

    async updateHeader() {
        const token = await this.getToken();
        this.component.data.headers = [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'X-Custom-Header', value: 'Custom Value' },
            { key: 'Authorization', value: `Bearer ${token}` } 
        ];
    }

    async getToken() {
        const auth0Module = await import('@auth0/auth0-spa-js'); 
        const createAuth0Client = auth0Module.createAuth0Client; // Extract the function
    
        const auth0Client = await createAuth0Client({
            domain: "trs-dev.us.auth0.com",
            client_id: "8B3F5DDQM1HROhDvi3BcRAcgrcriMNMD"
        });
    
        return await auth0Client.getTokenSilently();
    }

    attach(element) {
        super.attach(element);
        this.updateHeader();
    }

    static get builderInfo() {
        return {
            title: "TR YardName Drdn",
            group: "basic",
            icon: "list",
            weight: 0,
            schema: YardNameDropdown.schema()
        };
    }
});


  Formio.registerComponent("Railcar", class RailcarDropdown extends Formio.Components.components.select {
    static schema(...extend) {
      return {
        ...Formio.Components.components.select.schema(...extend),
        type: "Railcar",
        key: "Railcar",
        label: "Railcar ID",
        placeholder: "Select a Railcar ID",
        dataSrc: "url",
        data: { url: "https://trinityrails-api.mobileprogramming.net/api/InspectionHub/GetInspectionCustomersV2",
          headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'X-Custom-Header', value: 'Custom Value' },
            { key: 'Authorization', value: 'Bearer auth0-token'}
          ],
         },
        valueProperty: "id",
         dataPath: 'roles',
        template: "<span>{{ item.railcarid }}</span>",
        refreshOn: 'Any Change',
        clearOnRefresh: true, 
        customConditional: "show = data.userRole === 'admin';",
        widget: "html5",
        input: true
      };
    }

    static get builderInfo() {
      return {
        title: "TR Railcar ID Drdn",
        group: "basic",
        icon: "list",
        weight: 0,
        schema: RailcarDropdown.schema()
      };
    }

  });
  
  
    // ------------------------------------
  // 2. Register CustomerName Dropdown Component
  // ------------------------------------
  Formio.registerComponent("CustomerName", class CustomerDropdown extends Formio.Components.components.select {
    static schema(...extend) {
      return {
        ...Formio.Components.components.select.schema(...extend),
        type: "CustomerName",
        key: "CustomerName",
        label: "Customer Name",
        placeholder: "Select a Customer Name",
        dataSrc: "url",
        data: { url: "https://trinityrails-api.mobileprogramming.net/api/Customers",
          headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'X-Custom-Header', value: 'Custom Value' },
            { key: 'Authorization', value: 'Bearer auth0-token'}
          ],
         },
        valueProperty: "id",
         dataPath: 'roles',
        template: "<span>{{ item.name }}</span>",
        refreshOn: 'Any Change',
        clearOnRefresh: true, // Clear previous selection when refreshed
        customConditional: "show = data.userRole === 'admin';",
        widget: "html5",
        input: true
      };
    }

    static get builderInfo() {
      return {
        title: "TR Customer Drdn",
        group: "basic",
        icon: "list",
        weight: 1,
        schema: CustomerDropdown.schema()
      };
    }

  });
  
  
  // ------------------------------------
  // 4. Register Custom Dropdown Component
  // ------------------------------------
  Formio.registerComponent("customDropdown", class CustomDropdown1 extends Formio.Components.components.select {
    static schema(...extend) {
      return {
        ...Formio.Components.components.select.schema(...extend),
        type: "customDropdown",
        key: "customDropdown",
        label: "Custom Dropdown",
        placeholder: "Select a user",
        dataSrc: "url",
        data: { url: "https://trinityrails-api.mobileprogramming.net/api/InspectionHub/GetInspectionCustomersV2",
         },
        valueProperty: "id",
        template: "<span>{{ item.railcarid }}</span>",
        widget: "html5",
        input: true
      };
    }

    static get builderInfo() {
      return {
        title: "TR Dropdown",
        group: "basic",
        icon: "list",
        weight: 4,
        schema: CustomDropdown1.schema()
      };
    }

    attach(element) {
      super.attach(element);
      this.on("change", (event) => {
        const selectedUserId = event.data.customDropdown;
        if (selectedUserId) {
          fetch(``)
            .then(response => response.json())
            .then(user => {
              const emailField = this.root.getComponent("userEmail");
              if (emailField) {
                emailField.setValue(user.email);
              }
            })
            .catch(err => console.error("Error fetching email:", err));
        }
      });
    }
  });
  // ------------------------------------
  // 5. Register Email Field Component
  // ------------------------------------
  Formio.registerComponent("emailField", class EmailField extends Formio.Components.components.textfield {
    static schema(...extend) {
      return {
        ...Formio.Components.components.textfield.schema(...extend),
        type: "emailField",
        key: "userEmail",
        label: "User Email",
        disabled: true,
        input: true
      };
    }

    static get builderInfo() {
      return {
        title: "TR Email",
        group: "basic",
        icon: "envelope",
        weight: 5,
        schema: EmailField.schema()
      };
    }
  });
  // ------------------------------------
  // 6. Register Custom Date-Time Component
  // ------------------------------------
  Formio.registerComponent('customDatetime', class CustomDatetime extends Formio.Components.components.datetime {
    static schema(...extend) {
      return {
        ...Formio.Components.components.datetime.schema(...extend),
        type: 'customDatetime',
        key: 'customDatetime',
        label: 'Current Date & Time',
        format: 'yyyy-MM-dd HH:mm',  // Customize the display format
        enableDate: true,
        enableTime: true,
        defaultValue: new Date().toISOString(), // Set default value to current date-time
        widget: {
          type: 'calendar', // Ensures it uses the date picker UI
          displayInTimezone: 'viewer',
          locale: 'en',
          useLocaleSettings: true
        },
        input: true
      };
    }

    static get builderInfo() {
      return {
        title: 'TR Date-Time',
        group: 'basic',
        icon: 'calendar',
        weight: 6,
        schema: CustomDatetime.schema()
      };
    }

    attach(element) {
      super.attach(element);

      // Ensure it populates the default current date and time when rendered
      if (!this.dataValue) {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 16); // Formats to YYYY-MM-DDTHH:MM for compatibility
        this.setValue(formattedDate);
      }

      // Ensure input is properly recognized as a date picker
      const inputElement = this.element.querySelector('input[type="text"], input[type="datetime-local"]');
      if (inputElement) {
        inputElement.setAttribute('type', 'datetime-local'); // Force it to show as a date-time picker
      }
    }
  });
  // ------------------------------------
  // 7. Register the  customRadio Component
  // ------------------------------------
  Formio.registerComponent("customRadio", class CustomRadio extends Formio.Components.components.radio {

    static schema(...extend) {
      return {
        ...Formio.Components.components.radio.schema(...extend),
        type: "customRadio",
        key: "customRadio",
        label: "Select Users",
        dataSrc: "url",   // Form.io automatically fetches the data
        data: {
          url: "https://trinityrails-api.mobileprogramming.net/api/InspectionHub/GetInspectionCustomersV2"  // API endpoint
        },
        valueProperty: "id",   // Use ID as the value
        template: "{{ item.railcarid }}",   // Display username
        input: true,
        //validate: { required: true },
        customClass: "radio-custom"
      };
    }

    static get builderInfo() {
      return {
        title: "TR Radio",
        group: "basic",
        // icon: "fa fa-dot-circle-o",
        icon: "dot-circle-o",
        weight: 7,
        schema: CustomRadio.schema()
      };
    }
  });
  // ------------------------------------
  // // 8. Register Custom Checkbox Component
  // ------------------------------------
  Formio.registerComponent("customCheckbox", class CustomCheckbox extends Formio.Components.components.selectboxes {
    static schema(...extend) {
      return {
        ...Formio.Components.components.selectboxes.schema(...extend),
        type: "customCheckbox",
        key: "customCheckbox",
        label: "Select Users",
        dataSrc: "url",
        data: {
          url: "https://trinityrails-api.mobileprogramming.net/api/InspectionHub/GetInspectionCustomersV2"
        },
        valueProperty: "id",
        template: "{{ item.railcarid }}",
        input: true,
        //validate: { required: true },
        customClass: "checkbox-custom"
      };
    }

    static get builderInfo() {
      return {
        title: "TR Checkbox",
        group: "basic",
        icon: "check-square",
        weight: 8,
        schema: CustomCheckbox.schema()
      };
    }
  });

  Formio.registerComponent("customselect", class CustomSelectComponent extends Formio.Components.components.textfield {
    static schema(...extend) {
    return {
      ...Formio.Components.components.select.schema(...extend),
        type: 'customselect',
        label: 'Custom Select',
        key: 'customSelect',
        placeholder: "Select",
        widget: "html5",
        input: true,
        data: { values: [] },
      };
    }
  
    static get builderInfo() {
      return {
        title: 'TR Custom Select',
        group: 'basic',
        icon: 'list',
        weight: 5,
        schema: CustomSelectComponent.schema()
      };
    }
  
    attach(element) {
      super.attach(element);
     // const button = this.ce('button', { class: 'btn btn-primary' }, 'Load Options');
     /// this.addEventListener(button, 'click', () => this.loadOptions());
     // element.appendChild(button);
  
      return element;
    }
  
    loadOptions() {
      // Call Angular service to fetch data
      // This can also emit an event your Angular wrapper listens to
      this.emit('customLoadOptions');
     }
    updateOptions(options) {
      if (Array.isArray(options)) {
        this.component.data.values = options.map((item) => ({
          label: item.name, // Adjust according to API response
          value: item.id,
        }));
        this.redraw(); // Refresh component UI
      }
    }
  });
})();
