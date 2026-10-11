/**
 * sidepanel/error-handler.js
 * Toast notifications and user-facing error handling controller.
 */

export const ErrorHandler = {
  toastContainer: null,

  init() {
    this.toastContainer = document.getElementById('toast-container');
  },

  showToast(message, type = 'info', durationMs = 4000) {
    if (!this.toastContainer) {
      this.toastContainer = document.getElementById('toast-container');
    }
    if (!this.toastContainer) {
      alert(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `snip-toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" title="Dismiss">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 300);
      }
    }, durationMs);
  },

  showError(err) {
    const msg = typeof err === 'string' ? err : (err.message || 'An unexpected error occurred.');
    this.showToast(msg, 'error', 6000);
  },

  showSuccess(msg) {
    this.showToast(msg, 'success', 3500);
  },

  showWarning(msg) {
    this.showToast(msg, 'warning', 4500);
  }
};
