class CustomModal {
    constructor() {
        this.createBaseHTML();
        this.overlay = document.getElementById('custom-modal-overlay');
        this.modal = document.getElementById('custom-modal');
        this.textContainer = document.getElementById('custom-modal-text');
        this.inputContainer = document.getElementById('custom-modal-input');
        this.buttonsContainer = document.getElementById('custom-modal-buttons');
        this.closeBtn = document.getElementById('custom-modal-close');

        this.closeBtn.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        this.currentResolve = null;
    }

    createBaseHTML() {
        if (document.getElementById('custom-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.className = 'custom-modal-overlay';

        overlay.innerHTML = `
            <div id="custom-modal" class="custom-modal">
                <div class="custom-modal-bubbles">
                    <div class="custom-modal-bubble" style="width: 40px; height: 40px; left: 10%; animation-duration: 3s;"></div>
                    <div class="custom-modal-bubble" style="width: 60px; height: 60px; left: 70%; animation-duration: 4s;"></div>
                    <div class="custom-modal-bubble" style="width: 30px; height: 30px; left: 40%; animation-duration: 2.5s;"></div>
                </div>
                <button id="custom-modal-close" class="custom-modal-close">&times;</button>
                <div class="custom-modal-content">
                    <div id="custom-modal-text" class="custom-modal-text"></div>
                    <input type="text" id="custom-modal-input" class="custom-modal-input" style="display: none;">
                    <div id="custom-modal-buttons" class="custom-modal-buttons"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    open() {
        document.body.style.overflow = 'hidden';
        this.overlay.classList.add('active');
        if (this.inputContainer.style.display !== 'none') {
            this.inputContainer.focus();
        }
    }

    close(returnValue = null) {
        document.body.style.overflow = '';
        this.overlay.classList.remove('active');
        if (this.currentResolve) {
            this.currentResolve(returnValue);
            this.currentResolve = null;
        }
    }

    createButton(text, type, onClick) {
        const btn = document.createElement('button');
        btn.className = `custom-modal-btn ${type}`;
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        return btn;
    }

    reset() {
        this.inputContainer.style.display = 'none';
        this.inputContainer.value = '';

        // Remove any custom form fields
        const existingFormFields = document.getElementById('custom-modal-form-fields');
        if (existingFormFields) existingFormFields.remove();

        this.buttonsContainer.innerHTML = '';
        if (this.currentResolve) {
            this.currentResolve(null);
            this.currentResolve = null;
        }
    }

    alert(message) {
        return new Promise((resolve) => {
            this.reset();
            this.currentResolve = resolve;

            // Allow multiline string handling via simple <br> conversion
            this.textContainer.innerHTML = message.replace(/\n/g, '<br>');

            const btn = this.createButton('Aceptar', 'confirm', () => this.close(true));
            this.buttonsContainer.appendChild(btn);

            this.open();
        });
    }

    confirm(message) {
        return new Promise((resolve) => {
            this.reset();
            this.currentResolve = resolve;
            this.textContainer.innerHTML = message.replace(/\n/g, '<br>');

            const cancelBtn = this.createButton('Cancelar', 'cancel', () => this.close(false));
            const confirmBtn = this.createButton('Aceptar', 'confirm', () => this.close(true));

            this.buttonsContainer.appendChild(cancelBtn);
            this.buttonsContainer.appendChild(confirmBtn);

            this.open();
        });
    }

    prompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            this.reset();
            this.currentResolve = resolve;
            this.textContainer.innerHTML = message.replace(/\n/g, '<br>');

            this.inputContainer.style.display = 'block';
            this.inputContainer.value = defaultValue;

            const cancelBtn = this.createButton('Cancelar', 'cancel', () => this.close(null));
            const confirmBtn = this.createButton('Aceptar', 'confirm', () => {
                this.close(this.inputContainer.value);
            });

            this.buttonsContainer.appendChild(cancelBtn);
            this.buttonsContainer.appendChild(confirmBtn);

            this.open();
        });
    }

    form(title, fields) {
        return new Promise((resolve) => {
            this.reset();
            this.currentResolve = resolve;
            this.textContainer.innerHTML = title;

            const formContainer = document.createElement('div');
            formContainer.id = 'custom-modal-form-fields';
            formContainer.style.textAlign = 'left';

            fields.forEach(field => {
                if (field.type === 'textarea') {
                    const textarea = document.createElement('textarea');
                    textarea.id = `modal-field-${field.id}`;
                    textarea.className = 'custom-modal-input';
                    textarea.placeholder = field.placeholder;
                    textarea.rows = field.rows || 3;
                    formContainer.appendChild(textarea);
                } else {
                    const input = document.createElement('input');
                    input.type = field.type || 'text';
                    input.id = `modal-field-${field.id}`;
                    input.className = 'custom-modal-input';
                    input.placeholder = field.placeholder;
                    formContainer.appendChild(input);
                }
            });

            this.textContainer.parentNode.insertBefore(formContainer, this.inputContainer);

            const cancelBtn = this.createButton('Cancelar', 'cancel', () => this.close(null));
            const confirmBtn = this.createButton('Aceptar', 'confirm', () => {
                const results = {};
                fields.forEach(field => {
                    results[field.id] = document.getElementById(`modal-field-${field.id}`).value;
                });
                this.close(results);
            });

            this.buttonsContainer.appendChild(cancelBtn);
            this.buttonsContainer.appendChild(confirmBtn);

            this.open();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const customModalInstance = new CustomModal();
    window.showAlert = (message) => customModalInstance.alert(message);
    window.showConfirm = (message) => customModalInstance.confirm(message);
    window.showPrompt = (message, defaultValue = '') => customModalInstance.prompt(message, defaultValue);
    window.showForm = (title, fields) => customModalInstance.form(title, fields);
});
