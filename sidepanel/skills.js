/**
 * sidepanel/skills.js
 * Saved One-Click Skills controller.
 */

import { SkillsService } from '../services/skills.js';
import { ErrorHandler } from './error-handler.js';
import { sendTabMessage } from '../services/tab-bridge.js';

export class SkillsController {
  constructor(geminiClient, switchTabCallback, summarizeController) {
    this.gemini = geminiClient;
    this.switchTab = switchTabCallback;
    this.summarize = summarizeController;
    this.listContainer = document.getElementById('skills-list');
    this.titleInput = document.getElementById('skill-title-input');
    this.promptInput = document.getElementById('skill-prompt-input');
    this.addBtn = document.getElementById('btn-add-skill');
  }

  async init() {
    this.addBtn.addEventListener('click', () => this.addCustomSkill());
    await this.renderSkills();
  }

  async renderSkills() {
    const skills = await SkillsService.getAllSkills();
    this.listContainer.innerHTML = skills.map(skill => `
      <div class="card" style="margin-bottom: 6px; padding: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
          <strong style="font-size: 12.5px;">${skill.title}</strong>
          ${!skill.isDefault ? `<button class="btn btn-outline btn-sm delete-skill-btn" data-id="${skill.id}" title="Delete skill">✕</button>` : ''}
        </div>
        <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px;">${skill.description || 'Custom prompt skill'}</p>
        <button class="btn btn-primary btn-sm btn-block run-skill-btn" data-id="${skill.id}">
          ▶️ Run Skill
        </button>
      </div>
    `).join('');

    this.listContainer.querySelectorAll('.run-skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const skill = skills.find(s => s.id === id);
        if (skill) this.runSkill(skill);
      });
    });

    this.listContainer.querySelectorAll('.delete-skill-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        await SkillsService.deleteCustomSkill(id);
        await this.renderSkills();
        ErrorHandler.showSuccess('Custom skill deleted.');
      });
    });
  }

  async runSkill(skill) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No active browser tab found.');

      ErrorHandler.showToast(`Executing skill: "${skill.title}"...`, 'info');

      // Extract active page text
      const res = await sendTabMessage(tab.id, { type: 'EXTRACT_ARTICLE' });

      const pageContent = res && res.article ? res.article.textContent : '';

      const fullPrompt = `${skill.prompt}

PAGE TITLE: ${tab.title || ''}
PAGE URL: ${tab.url || ''}

PAGE CONTENT:
${(pageContent || '').slice(0, 30000)}
`;

      // Switch to summarize tab and stream response
      this.switchTab('summarize');
      const outputContainer = document.getElementById('summary-output');
      const copyBtn = document.getElementById('btn-copy-summary');
      outputContainer.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px 0;">Running "${skill.title}"...</p>`;

      let accumulated = '';
      await this.gemini.streamGenerateContent(fullPrompt, null, (chunk, isDone) => {
        accumulated += chunk;
        this.summarize._renderMarkdown(accumulated);
        if (isDone) {
          copyBtn.style.display = 'inline-flex';
          this.summarize.lastSummaryText = accumulated;
          ErrorHandler.showSuccess(`Skill "${skill.title}" completed!`);
        }
      });
    } catch (err) {
      ErrorHandler.showError(err);
    }
  }

  async addCustomSkill() {
    const title = this.titleInput.value.trim();
    const prompt = this.promptInput.value.trim();

    if (!title || !prompt) {
      ErrorHandler.showWarning('Please provide both a Title and a Prompt for your custom skill.');
      return;
    }

    await SkillsService.addCustomSkill({ title, prompt });
    this.titleInput.value = '';
    this.promptInput.value = '';
    await this.renderSkills();
    ErrorHandler.showSuccess('New custom skill added to your library!');
  }
}
