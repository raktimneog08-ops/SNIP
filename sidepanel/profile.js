/**
 * sidepanel/profile.js
 * Local User Profile controller and safe Form Autofill trigger.
 */

import { ProfileService } from '../services/profile.js';
import { StorageService } from '../services/storage.js';
import { ErrorHandler } from './error-handler.js';
import { sendTabMessage } from '../services/tab-bridge.js';

export class ProfileController {
  constructor(switchTabCallback, startAgentCallback) {
    this.switchTab = switchTabCallback;
    this.startAgent = startAgentCallback;
    this.fields = [
      'fullName', 'email', 'phone', 'addressLine1', 'city', 'zipCode', 'jobTitle', 'company', 'bio'
    ];
  }

  async init() {
    document.getElementById('btn-save-profile').addEventListener('click', () => this.saveProfile());
    document.getElementById('btn-quick-autofill').addEventListener('click', () => this.triggerAutofill());

    await this.loadProfile();
  }

  async loadProfile() {
    const profile = await ProfileService.getProfile();
    this.fields.forEach(field => {
      const input = document.getElementById(`prof-${field}`);
      if (input && profile[field]) {
        input.value = profile[field];
      }
    });
  }

  async saveProfile() {
    const profile = {};
    this.fields.forEach(field => {
      const input = document.getElementById(`prof-${field}`);
      if (input) {
        profile[field] = input.value.trim();
      }
    });

    await ProfileService.saveProfile(profile);
    ErrorHandler.showSuccess('Personal profile saved locally in chrome.storage!');
  }

  async triggerAutofill() {
    try {
      const profile = await ProfileService.getProfile();
      const hasAny = Object.values(profile).some(v => Boolean(v));
      if (!hasAny) {
        ErrorHandler.showWarning('Your profile is currently empty. Please fill in your name and details first.');
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active browser tab found.');

      ErrorHandler.showToast('Scanning active page form fields...', 'info');

      const res = await sendTabMessage(tab.id, { type: 'SCAN_ELEMENTS' });

      if (!res || !res.elements || res.elements.length === 0) {
        throw new Error('No form fields detected on this page.');
      }

      const autofillPlan = ProfileService.proposeAutofillPlan(res.elements, profile);
      if (autofillPlan.length === 0) {
        ErrorHandler.showWarning('No matching input fields found for your profile data on this page.');
        return;
      }

      // Switch to Agent tab and set goal
      this.switchTab('agent');
      const goalInput = document.getElementById('agent-goal-input');
      goalInput.value = `Autofill the contact form fields using my saved profile data (${autofillPlan.map(p => p.matchedKey).join(', ')}).`;

      // Trigger agent to propose the first step
      if (this.startAgent) {
        this.startAgent();
      }

      ErrorHandler.showSuccess(`Found ${autofillPlan.length} matching form fields! Review and approve each step in the Agent tab.`);
    } catch (err) {
      ErrorHandler.showError(err);
    }
  }
}
