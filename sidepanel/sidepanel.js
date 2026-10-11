/**
 * sidepanel/sidepanel.js
 * Master Application Controller for Snip Chrome Side Panel.
 */

import { GeminiClient } from '../services/gemini.js';
import { StorageService } from '../services/storage.js';
import { SafetyService } from '../services/safety.js';
import { ErrorHandler } from './error-handler.js';
import { SummarizeController } from './summarize.js';
import { ChatController } from './chat.js';
import { AgentController } from './agent.js';
import { VisionController } from './vision.js';
import { ProfileController } from './profile.js';
import { SkillsController } from './skills.js';

class SnipApp {
  constructor() {
    this.gemini = new GeminiClient('');
    this.currentLanguage = 'en'; // 'en' | 'hinglish'
    this.activeTabId = null;

    // UI elements
    this.langToggleBtn = document.getElementById('lang-toggle-btn');
    this.safetyIndicator = document.getElementById('safety-indicator');
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    this.apiKeyInput = document.getElementById('setting-api-key');
    this.modelSelect = document.getElementById('setting-model-select');
    this.saveSettingsBtn = document.getElementById('btn-save-settings');

    // Sub-controllers
    this.summarize = null;
    this.chat = null;
    this.agent = null;
    this.vision = null;
    this.profile = null;
    this.skills = null;
  }

  async init() {
    ErrorHandler.init();

    // 1. Load Settings
    await this.loadSettings();

    // 2. Initialize Sub-controllers
    this.summarize = new SummarizeController(this.gemini, () => this.currentLanguage);
    this.chat = new ChatController(this.gemini, () => this.currentLanguage);
    this.agent = new AgentController(this.gemini);
    this.vision = new VisionController(this.gemini);
    this.profile = new ProfileController(
      (tab) => this.switchTab(tab),
      () => this.agent.proposeNextStep()
    );
    this.skills = new SkillsController(
      this.gemini,
      (tab) => this.switchTab(tab),
      this.summarize
    );

    this.summarize.init();
    this.chat.init();
    this.agent.init();
    this.vision.init();
    await this.profile.init();
    await this.skills.init();

    // 3. Setup Tab Navigation
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // 4. Setup Language Toggle
    this.langToggleBtn.addEventListener('click', () => this.toggleLanguage());

    // 5. Setup Settings Save & Shortcuts
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    document.getElementById('header-settings-btn')?.addEventListener('click', () => this.switchTab('settings'));
    document.getElementById('btn-goto-settings')?.addEventListener('click', () => this.switchTab('settings'));

    // 6. Tab Change & URL Watcher
    this.updateActiveTabContext();
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => this.updateActiveTabContext());
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === 'complete') this.updateActiveTabContext();
      });
    }

    // 7. Check for Pending Context Menu Actions
    this.checkPendingContextAction();
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.pendingContextAction) {
          this.checkPendingContextAction();
        }
      });
    }
  }

  switchTab(tabName) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });
  }

  async loadSettings() {
    const settings = await StorageService.getSettings();
    const apiKeyBanner = document.getElementById('api-key-banner');

    if (settings.apiKey) {
      this.gemini.setApiKey(settings.apiKey);
      this.apiKeyInput.value = settings.apiKey;
      if (apiKeyBanner) apiKeyBanner.style.display = 'none';
    } else {
      if (apiKeyBanner) apiKeyBanner.style.display = 'block';
    }

    if (settings.selectedModel) {
      this.gemini.setModel(settings.selectedModel);
      this.modelSelect.value = settings.selectedModel;
    }
    if (settings.language) {
      this.currentLanguage = settings.language;
      this.updateLangButtonLabel();
    }
  }

  async saveSettings() {
    const key = this.apiKeyInput.value.trim();
    const model = this.modelSelect.value;

    if (!key) {
      ErrorHandler.showWarning('Please enter a valid Gemini API key.');
      return;
    }

    this.gemini.setApiKey(key);
    this.gemini.setModel(model);

    await StorageService.saveSettings({
      apiKey: key,
      selectedModel: model,
      language: this.currentLanguage
    });

    const apiKeyBanner = document.getElementById('api-key-banner');
    if (apiKeyBanner) apiKeyBanner.style.display = 'none';

    ErrorHandler.showSuccess('Settings saved! Gemini is ready.');
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'hinglish' : 'en';
    this.updateLangButtonLabel();
    StorageService.saveSettings({ language: this.currentLanguage });
    ErrorHandler.showToast(`Output language set to: ${this.currentLanguage.toUpperCase()}`, 'info', 2000);
  }

  updateLangButtonLabel() {
    if (this.currentLanguage === 'hinglish') {
      this.langToggleBtn.textContent = '🌐 HI-EN (Hinglish)';
      this.langToggleBtn.style.background = '#fef3c7';
      this.langToggleBtn.style.color = '#b45309';
    } else {
      this.langToggleBtn.textContent = '🌐 EN (English)';
      this.langToggleBtn.style.background = 'var(--primary-light)';
      this.langToggleBtn.style.color = 'var(--primary)';
    }
  }

  async updateActiveTabContext() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      this.activeTabId = tab.id;
      const urlEval = SafetyService.evaluateUrl(tab.url || '');

      const internalBanner = document.getElementById('internal-page-banner');
      if (urlEval.isSensitive) {
        this.safetyIndicator.textContent = '⚠️ Protected (Sensitive)';
        this.safetyIndicator.className = 'safety-pill sensitive';
        this.safetyIndicator.title = urlEval.reason || 'Sensitive page';
        if (internalBanner) internalBanner.style.display = 'none';
      } else if (!urlEval.isAllowed) {
        this.safetyIndicator.textContent = '⛔ Internal / Blocked';
        this.safetyIndicator.className = 'safety-pill sensitive';
        this.safetyIndicator.title = urlEval.reason;
        if (internalBanner) internalBanner.style.display = 'block';
      } else {
        this.safetyIndicator.textContent = '🛡️ Shield Active';
        this.safetyIndicator.className = 'safety-pill';
        this.safetyIndicator.title = 'Safe browsing mode active. Passwords and CVVs shielded.';
        if (internalBanner) internalBanner.style.display = 'none';
      }

      if (this.summarize) {
        this.summarize.checkYouTubeStatus();
      }
    } catch (_) {}
  }

  async checkPendingContextAction() {
    const data = await StorageService.get('pendingContextAction');
    const pending = data.pendingContextAction;
    if (!pending || !pending.actionType) return;

    // Remove from storage to prevent duplicate runs
    await StorageService.remove('pendingContextAction');

    const { actionType, selectedText } = pending;
    if (!selectedText) return;

    if (actionType === 'explain') {
      this.switchTab('summarize');
      this.summarize.explainSelection(selectedText);
    } else if (actionType === 'translate') {
      this.switchTab('summarize');
      const lang = this.currentLanguage === 'hinglish' ? 'Hinglish' : 'Hindi';
      const prompt = `Translate the following text into ${lang}:\n\n"${selectedText}"`;
      const outputContainer = document.getElementById('summary-output');
      outputContainer.innerHTML = '<p class="text-muted" style="text-align: center;">Translating selection...</p>';
      let acc = '';
      await this.gemini.streamGenerateContent(prompt, null, (chunk, done) => {
        acc += chunk;
        this.summarize._renderMarkdown(acc);
      });
    } else if (actionType === 'reply') {
      this.switchTab('summarize');
      const profile = await StorageService.getUserProfile();
      const prompt = `Draft a polite, professional reply to this message:\n\n"${selectedText}"\n\nSender Name: ${profile.fullName || 'User'}`;
      const outputContainer = document.getElementById('summary-output');
      outputContainer.innerHTML = '<p class="text-muted" style="text-align: center;">Drafting reply...</p>';
      let acc = '';
      await this.gemini.streamGenerateContent(prompt, null, (chunk, done) => {
        acc += chunk;
        this.summarize._renderMarkdown(acc);
      });
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new SnipApp();
  app.init().catch(err => {
    console.error('[Snip App Init Error]', err);
  });
});
