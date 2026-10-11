/**
 * services/storage.js
 * Asynchronous typed wrapper around chrome.storage.local with in-memory fallback for unit testing.
 */

const memoryStore = new Map();

export const StorageService = {
  isChromeStorageAvailable() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  },

  async get(keys) {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
          resolve(result || {});
        });
      });
    }

    // In-memory fallback
    if (typeof keys === 'string') {
      return { [keys]: memoryStore.get(keys) };
    }
    if (Array.isArray(keys)) {
      const res = {};
      keys.forEach(k => { res[k] = memoryStore.get(k); });
      return res;
    }
    if (keys && typeof keys === 'object') {
      const res = {};
      for (const [k, defaultVal] of Object.entries(keys)) {
        res[k] = memoryStore.has(k) ? memoryStore.get(k) : defaultVal;
      }
      return res;
    }
    return Object.fromEntries(memoryStore);
  },

  async set(items) {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, () => {
          resolve();
        });
      });
    }

    for (const [key, value] of Object.entries(items)) {
      memoryStore.set(key, value);
    }
  },

  async remove(keys) {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => {
          resolve();
        });
      });
    }

    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => memoryStore.delete(k));
  },

  // App Settings helpers
  async getSettings() {
    const data = await this.get({
      apiKey: '',
      selectedModel: 'gemini-2.5-flash',
      language: 'en', // 'en' | 'hinglish'
      autoClearBadgesOnStop: true
    });

    // Auto-migrate retired 1.5 models to gemini-2.5-flash
    if (!data.selectedModel || data.selectedModel === 'gemini-1.5-flash' || data.selectedModel === 'gemini-1.5-flash-8b') {
      data.selectedModel = 'gemini-2.5-flash';
      await this.set({ selectedModel: 'gemini-2.5-flash' });
    }

    return data;
  },

  async saveSettings(settings) {
    await this.set(settings);
  },

  // User Profile helpers
  async getUserProfile() {
    const data = await this.get('userProfile');
    return data.userProfile || {
      fullName: '',
      email: '',
      phone: '',
      addressLine1: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      jobTitle: '',
      company: '',
      bio: '',
      customNotes: ''
    };
  },

  async saveUserProfile(profile) {
    await this.set({ userProfile: profile });
  },

  // Action Audit Log helpers
  async getActionLogs() {
    const data = await this.get('actionAuditLogs');
    return data.actionAuditLogs || [];
  },

  async appendActionLog(entry) {
    const logs = await this.getActionLogs();
    logs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      ...entry
    });
    // Keep last 100 entries
    if (logs.length > 100) logs.length = 100;
    await this.set({ actionAuditLogs: logs });
  },

  async clearActionLogs() {
    await this.set({ actionAuditLogs: [] });
  }
};
