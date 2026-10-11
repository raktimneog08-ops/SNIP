/**
 * sidepanel/chat.js
 * In-context grounded page chat controller with streaming responses and history.
 */

import { Prompts } from '../services/prompts.js';
import { ErrorHandler } from './error-handler.js';
import { sendTabMessage } from '../services/tab-bridge.js';

export class ChatController {
  constructor(geminiClient, getLanguage) {
    this.gemini = geminiClient;
    this.getLanguage = getLanguage;
    this.messagesContainer = document.getElementById('chat-messages');
    this.input = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('btn-chat-send');
    this.clearBtn = document.getElementById('btn-chat-clear');

    this.history = []; // [{ role: 'user'|'model', content: string }]
    this.cachedPageContext = null;
  }

  init() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.clearBtn.addEventListener('click', () => this.clearChat());
  }

  async fetchPageContext() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return { title: '', url: '', textContent: '' };

      const res = await sendTabMessage(tab.id, { type: 'EXTRACT_ARTICLE' });

      if (res && res.article) {
        return {
          title: res.article.title || tab.title || '',
          url: tab.url || '',
          textContent: res.article.textContent || ''
        };
      }
      return { title: tab.title || '', url: tab.url || '', textContent: '' };
    } catch (_) {
      return { title: '', url: '', textContent: '' };
    }
  }

  async sendMessage() {
    const text = this.input.value.trim();
    if (!text) return;

    this.input.value = '';
    this._appendBubble('user', text);

    if (!this.cachedPageContext) {
      this.cachedPageContext = await this.fetchPageContext();
    }

    const lang = this.getLanguage();
    const systemPrompt = Prompts.buildPageChatSystemPrompt(this.cachedPageContext, lang);

    this.history.push({ role: 'user', content: text });

    const modelBubble = this._appendBubble('model', 'Thinking...');
    let accumulatedText = '';

    try {
      this.sendBtn.disabled = true;

      await this.gemini.chatWithHistory(this.history, systemPrompt, (chunk, isDone) => {
        accumulatedText += chunk;
        modelBubble.innerHTML = this._formatChatText(accumulatedText);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        if (isDone) {
          this.history.push({ role: 'model', content: accumulatedText });
          this.sendBtn.disabled = false;
        }
      });
    } catch (err) {
      this.sendBtn.disabled = false;
      modelBubble.innerHTML = `<span style="color: var(--danger);">⚠️ Error: ${err.message}</span>`;
      ErrorHandler.showError(err);
    }
  }

  clearChat() {
    this.history = [];
    this.cachedPageContext = null;
    this.messagesContainer.innerHTML = `
      <div class="chat-bubble model">
        👋 Chat cleared! Ask me anything about the active page.
      </div>
    `;
    ErrorHandler.showSuccess('Chat history cleared.');
  }

  _appendBubble(role, initialText) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = this._formatChatText(initialText);
    this.messagesContainer.appendChild(bubble);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    return bubble;
  }

  _formatChatText(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}
