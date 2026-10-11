/**
 * sidepanel/summarize.js
 * Article and YouTube summarization controller with clickable timestamps, Hinglish support,
 * and automatic content script auto-injection recovery.
 */

import { Prompts } from '../services/prompts.js';
import { ErrorHandler } from './error-handler.js';
import { sendTabMessage } from '../services/tab-bridge.js';

export class SummarizeController {
  constructor(geminiClient, getLanguage) {
    this.gemini = geminiClient;
    this.getLanguage = getLanguage;
    this.outputContainer = document.getElementById('summary-output');
    this.copyBtn = document.getElementById('btn-copy-summary');
    this.ytBanner = document.getElementById('yt-banner');
    this.pageTitleEl = document.getElementById('active-page-title');
    this.lastSummaryText = '';
  }

  init() {
    document.getElementById('btn-summarize-page').addEventListener('click', () => this.summarizePage());
    document.getElementById('btn-explain-selection').addEventListener('click', () => this.explainSelection());
    document.getElementById('btn-summarize-yt').addEventListener('click', () => this.summarizeYouTube());
    this.copyBtn.addEventListener('click', () => this.copySummary());

    this.checkYouTubeStatus();
  }

  async checkYouTubeStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      if (tab.title) {
        this.pageTitleEl.textContent = tab.title;
      }

      const res = await sendTabMessage(tab.id, { type: 'GET_YOUTUBE_DATA' });
      if (res && res.isYouTube) {
        this.ytBanner.style.display = 'block';
      } else {
        this.ytBanner.style.display = 'none';
      }
    } catch (_) {}
  }

  async summarizePage() {
    try {
      this._setLoading('Analyzing and extracting clean article content...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active browser tab found.');

      const response = await sendTabMessage(tab.id, { type: 'EXTRACT_ARTICLE' });

      if (!response || response.error) {
        throw new Error(response ? response.error : 'Could not read article from page. Ensure page has finished loading.');
      }

      const article = response.article;
      const lang = this.getLanguage();
      const prompt = Prompts.buildArticleSummaryPrompt(article, lang);

      this.outputContainer.innerHTML = '';
      this.lastSummaryText = '';

      await this.gemini.streamGenerateContent(prompt, null, (chunk, isDone) => {
        this.lastSummaryText += chunk;
        this._renderMarkdown(this.lastSummaryText);
        if (isDone) {
          this.copyBtn.style.display = 'inline-flex';
          ErrorHandler.showSuccess('Summary generated successfully!');
        }
      });
    } catch (err) {
      this._renderError(err.message);
      ErrorHandler.showError(err);
    }
  }

  async summarizeYouTube() {
    try {
      this._setLoading('Fetching YouTube video details and chapters...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active browser tab found.');

      const ytData = await sendTabMessage(tab.id, { type: 'GET_YOUTUBE_DATA' });

      if (!ytData || !ytData.isYouTube) {
        throw new Error('Not an active YouTube video watch page.');
      }

      const lang = this.getLanguage();
      const prompt = Prompts.buildYouTubeSummaryPrompt(ytData, lang);

      this.outputContainer.innerHTML = '';
      this.lastSummaryText = '';

      await this.gemini.streamGenerateContent(prompt, null, (chunk, isDone) => {
        this.lastSummaryText += chunk;
        this._renderMarkdown(this.lastSummaryText, true);
        if (isDone) {
          this.copyBtn.style.display = 'inline-flex';
          this._bindTimestampLinks(tab.id);
          ErrorHandler.showSuccess('YouTube summary ready!');
        }
      });
    } catch (err) {
      this._renderError(err.message);
      ErrorHandler.showError(err);
    }
  }

  async explainSelection(customText = null) {
    try {
      this._setLoading('Analyzing selected text...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active tab.');

      let textToExplain = customText;
      if (!textToExplain) {
        const selRes = await sendTabMessage(tab.id, { type: 'GET_SELECTED_TEXT' });
        textToExplain = selRes ? selRes.selectedText : '';
      }

      if (!textToExplain) {
        throw new Error('No text selected on page. Please highlight text on the web page first.');
      }

      const lang = this.getLanguage();
      const prompt = Prompts.buildExplainSelectionPrompt(textToExplain, tab.title || '', lang);

      this.outputContainer.innerHTML = '';
      this.lastSummaryText = '';

      await this.gemini.streamGenerateContent(prompt, null, (chunk, isDone) => {
        this.lastSummaryText += chunk;
        this._renderMarkdown(this.lastSummaryText);
        if (isDone) {
          this.copyBtn.style.display = 'inline-flex';
          ErrorHandler.showSuccess('Explanation generated!');
        }
      });
    } catch (err) {
      this._renderError(err.message);
      ErrorHandler.showError(err);
    }
  }

  copySummary() {
    if (!this.lastSummaryText) return;
    navigator.clipboard.writeText(this.lastSummaryText).then(() => {
      ErrorHandler.showSuccess('Summary copied to clipboard!');
    });
  }

  _setLoading(msg) {
    this.outputContainer.innerHTML = `
      <div style="text-align: center; padding: 25px 0;">
        <div style="font-size: 20px; margin-bottom: 8px; animation: spin 1s infinite linear;">⏳</div>
        <p style="color: var(--text-muted); font-size: 12px;">${msg}</p>
      </div>
    `;
    this.copyBtn.style.display = 'none';
  }

  _renderError(msg) {
    this.outputContainer.innerHTML = `
      <div style="padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 12px;">
        <strong>Error:</strong> ${msg}
      </div>
    `;
  }

  _renderMarkdown(text, isYouTube = false) {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>');

    if (isYouTube) {
      html = html.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (match, timeStr) => {
        return `<a class="yt-timestamp-link" data-timestamp="${timeStr}" title="Jump to ${timeStr}">⏱️ ${timeStr}</a>`;
      });
    }

    html = html.replace(/\n\n/g, '<br><br>');

    this.outputContainer.innerHTML = html;
  }

  _bindTimestampLinks(tabId) {
    const links = this.outputContainer.querySelectorAll('.yt-timestamp-link');
    links.forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const timeStr = link.getAttribute('data-timestamp');
        const seconds = this._parseTimeToSeconds(timeStr);

        const res = await sendTabMessage(tabId, { type: 'SEEK_YOUTUBE', seconds });
        if (res && res.error) {
          ErrorHandler.showError('Could not seek video player.');
        } else {
          ErrorHandler.showSuccess(`Jumped to ${timeStr}!`);
        }
      });
    });
  }

  _parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }
}
