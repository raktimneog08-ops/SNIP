/**
 * sidepanel/agent.js
 * Browser Action Agent controller with Human-in-the-Loop approval and audit log.
 */

import { AgentPlanner } from '../services/agent-planner.js';
import { StorageService } from '../services/storage.js';
import { SafetyService } from '../services/safety.js';
import { ErrorHandler } from './error-handler.js';
import { sendTabMessage } from '../services/tab-bridge.js';

export class AgentController {
  constructor(geminiClient) {
    this.gemini = geminiClient;
    this.planner = new AgentPlanner(geminiClient);

    this.scannedElements = [];
    this.currentGoal = '';
    this.currentProposal = null;
    this.activeTabId = null;
    this.activeTabUrl = '';
    this.sessionActions = [];

    // UI elements
    this.elementsBadge = document.getElementById('elements-count-badge');
    this.goalInput = document.getElementById('agent-goal-input');
    this.proposalCard = document.getElementById('action-proposal-card');
    this.proposalType = document.getElementById('proposal-action-type');
    this.proposalTarget = document.getElementById('proposal-element-target');
    this.proposalRationale = document.getElementById('proposal-rationale');
    this.proposalValueBox = document.getElementById('proposal-value-box');
    this.logContainer = document.getElementById('action-log-container');
  }

  init() {
    document.getElementById('btn-scan-elements').addEventListener('click', () => this.scanElements(true));
    document.getElementById('btn-clear-overlay').addEventListener('click', () => this.clearOverlay());
    document.getElementById('btn-start-agent').addEventListener('click', () => this.proposeNextStep());

    document.getElementById('btn-approve-action').addEventListener('click', () => this.approveAction());
    document.getElementById('btn-skip-action').addEventListener('click', () => this.skipAction());
    document.getElementById('btn-stop-action').addEventListener('click', () => this.stopAgent());
    document.getElementById('btn-clear-log').addEventListener('click', () => this.clearAuditLog());

    this.renderAuditLog();
  }

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      this.activeTabId = tab.id;
      this.activeTabUrl = tab.url || '';
    }
    return tab;
  }

  async scanElements(showNotice = false) {
    try {
      const tab = await this.getActiveTab();
      if (!tab || !tab.id) throw new Error('No active browser tab found.');

      const urlEval = SafetyService.evaluateUrl(tab.url);
      if (!urlEval.isAllowed) {
        throw new Error(urlEval.reason || 'Browser automation is restricted on this page.');
      }

      const res = await sendTabMessage(tab.id, { type: 'SCAN_ELEMENTS' });

      if (!res || res.error) {
        throw new Error(res ? res.error : 'Could not scan elements. Please refresh the page and try again.');
      }

      this.scannedElements = res.elements || [];
      this.elementsBadge.textContent = `${this.scannedElements.length} elements`;

      // Render non-intrusive numbered badges
      await sendTabMessage(tab.id, {
        type: 'TOGGLE_OVERLAY',
        visible: true,
        elements: this.scannedElements
      });

      if (showNotice) {
        ErrorHandler.showSuccess(`Action Map created! Indexed ${this.scannedElements.length} interactive elements.`);
      }

      return this.scannedElements;
    } catch (err) {
      ErrorHandler.showError(err);
      return [];
    }
  }

  async clearOverlay() {
    try {
      const tab = await this.getActiveTab();
      if (tab && tab.id) {
        await sendTabMessage(tab.id, { type: 'TOGGLE_OVERLAY', visible: false });
      }
      this.proposalCard.style.display = 'none';
      this.currentProposal = null;
      ErrorHandler.showSuccess('Numbered badges cleared.');
    } catch (_) {}
  }

  async proposeNextStep() {
    const goal = this.goalInput.value.trim();
    if (!goal) {
      ErrorHandler.showWarning('Please enter a goal or task for Snip to achieve.');
      return;
    }
    this.currentGoal = goal;

    try {
      const tab = await this.getActiveTab();
      if (!tab) throw new Error('No active tab.');

      // Check URL safety
      const urlEval = SafetyService.evaluateUrl(tab.url);
      if (urlEval.isSensitive) {
        throw new Error('Safety Shield: Automation is blocked on sensitive banking, auth, or checkout pages.');
      }

      // Re-scan if elements list is empty
      if (this.scannedElements.length === 0) {
        await this.scanElements(false);
      }

      if (this.scannedElements.length === 0) {
        throw new Error('No interactive elements found on the page.');
      }

      ErrorHandler.showToast('Planning next action step...', 'info', 2000);

      const profile = await StorageService.getUserProfile();
      const plan = await this.planner.planNextAction(
        this.currentGoal,
        this.scannedElements,
        profile,
        this.sessionActions,
        tab.url
      );

      if (plan.action === 'FINISH') {
        this.proposalCard.style.display = 'none';
        ErrorHandler.showSuccess(`Goal achieved: ${plan.rationale}`);
        await this.clearOverlay();
        return;
      }

      if (plan.action === 'ABORT') {
        this.proposalCard.style.display = 'none';
        ErrorHandler.showError(`Action halted: ${plan.rationale}`);
        await this.clearOverlay();
        return;
      }

      this.currentProposal = plan;
      this._renderProposalCard(plan);

      // Highlight target badge on page
      if (plan.elementId) {
        sendTabMessage(tab.id, {
          type: 'HIGHLIGHT_BADGE',
          elementId: plan.elementId
        });
      }
    } catch (err) {
      ErrorHandler.showError(err);
    }
  }

  _renderProposalCard(plan) {
    this.proposalType.textContent = plan.action;
    this.proposalTarget.textContent = `Element #${plan.elementId} (${plan.targetElement ? (plan.targetElement.label || plan.targetElement.tag) : ''})`;
    this.proposalRationale.textContent = plan.rationale || 'Next recommended browser step.';

    if (plan.action === 'TYPE' || plan.action === 'SELECT') {
      this.proposalValueBox.style.display = 'block';
      this.proposalValueBox.textContent = `Value: "${plan.value || ''}"`;
    } else {
      this.proposalValueBox.style.display = 'none';
    }

    this.proposalCard.style.display = 'block';
    this.proposalCard.scrollIntoView({ behavior: 'smooth' });
  }

  async approveAction() {
    if (!this.currentProposal) return;
    const plan = this.currentProposal;

    try {
      const tab = await this.getActiveTab();
      if (!tab || !tab.id) throw new Error('Active tab lost.');

      ErrorHandler.showToast(`Executing ${plan.action} on #${plan.elementId}...`, 'info', 2000);

      const execRes = await sendTabMessage(tab.id, {
        type: 'EXECUTE_ACTION',
        action: {
          action: plan.action,
          elementId: plan.elementId,
          value: plan.value
        }
      });

      if (!execRes || execRes.error) {
        throw new Error(execRes ? execRes.error : 'Execution failed.');
      }

      const logItem = {
        url: tab.url || '',
        pageTitle: tab.title || '',
        goal: this.currentGoal,
        action: plan.action,
        elementId: plan.elementId,
        elementLabel: plan.targetElement?.label || '',
        value: plan.value,
        status: 'SUCCESS',
        rationale: plan.rationale
      };

      this.sessionActions.push(logItem);
      await StorageService.appendActionLog(logItem);
      await this.renderAuditLog();

      ErrorHandler.showSuccess(execRes.message || 'Action executed successfully!');
      this.proposalCard.style.display = 'none';
      this.currentProposal = null;

      // Automatically plan next step if not final
      if (!plan.isFinalStep) {
        setTimeout(async () => {
          await this.scanElements(false);
          await this.proposeNextStep();
        }, 600);
      } else {
        ErrorHandler.showSuccess('Workflow complete!');
        await this.clearOverlay();
      }
    } catch (err) {
      ErrorHandler.showError(err);
      if (plan) {
        await StorageService.appendActionLog({
          url: this.activeTabUrl,
          pageTitle: '',
          goal: this.currentGoal,
          action: plan.action,
          elementId: plan.elementId,
          status: 'FAILED',
          rationale: err.message
        });
        await this.renderAuditLog();
      }
    }
  }

  async skipAction() {
    if (!this.currentProposal) return;
    const plan = this.currentProposal;

    const logItem = {
      url: this.activeTabUrl,
      pageTitle: '',
      goal: this.currentGoal,
      action: 'SKIP',
      elementId: plan.elementId,
      status: 'SKIPPED',
      rationale: `User skipped ${plan.action} on #${plan.elementId}`
    };

    this.sessionActions.push(logItem);
    await StorageService.appendActionLog(logItem);
    await this.renderAuditLog();

    this.proposalCard.style.display = 'none';
    this.currentProposal = null;
    ErrorHandler.showToast('Action skipped. Requesting alternative step...', 'info');

    // Request next step
    setTimeout(() => this.proposeNextStep(), 300);
  }

  async stopAgent() {
    const logItem = {
      url: this.activeTabUrl,
      pageTitle: '',
      goal: this.currentGoal,
      action: 'STOP',
      status: 'STOPPED',
      rationale: 'User stopped agent execution.'
    };

    this.sessionActions.push(logItem);
    await StorageService.appendActionLog(logItem);
    await this.renderAuditLog();

    await this.clearOverlay();
    ErrorHandler.showToast('Agent stopped by user.', 'warning');
  }

  async renderAuditLog() {
    const logs = await StorageService.getActionLogs();
    if (!logs || logs.length === 0) {
      this.logContainer.innerHTML = `
        <p class="text-muted" style="text-align: center; padding: 10px 0; font-size: 11.5px;">
          No actions executed yet.
        </p>
      `;
      return;
    }

    this.logContainer.innerHTML = logs.map(item => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <div class="log-item">
          <span class="log-status-badge log-status-${item.status}">${item.status}</span>
          <div style="flex: 1;">
            <div><strong>${item.action}</strong> ${item.elementId ? `on #${item.elementId}` : ''} ${item.value ? `("${item.value}")` : ''}</div>
            <div style="color: var(--text-muted); font-size: 10.5px;">${item.rationale || item.goal} • <time>${timeStr}</time></div>
          </div>
        </div>
      `;
    }).join('');
  }

  async clearAuditLog() {
    await StorageService.clearActionLogs();
    await this.renderAuditLog();
    ErrorHandler.showSuccess('Audit log cleared.');
  }
}
