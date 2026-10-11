/**
 * services/agent-planner.js
 * AI Action Planner for Browser Agent.
 * Generates and validates single-step browser actions with strict JSON schema compliance.
 */

import { Prompts } from './prompts.js';
import { SafetyService } from './safety.js';

export class AgentPlanner {
  constructor(geminiClient) {
    this.gemini = geminiClient;
  }

  /**
   * Plans the single next browser action based on user goal and scanned elements.
   * @param {string} userGoal
   * @param {Array} elements
   * @param {Object} userProfile
   * @param {Array} pastActions
   * @param {string} currentUrl
   */
  async planNextAction(userGoal, elements, userProfile = {}, pastActions = [], currentUrl = '') {
    if (!elements || elements.length === 0) {
      return {
        action: 'ABORT',
        rationale: 'No interactive elements detected on the page. Please re-scan or verify page loaded.',
        isFinalStep: true
      };
    }

    const prompt = Prompts.buildActionPlanningPrompt(userGoal, elements, userProfile, pastActions);
    const rawResponse = await this.gemini.generateContent(prompt);

    const parsedAction = this.parseActionJson(rawResponse);

    // Validate proposed element and safety
    if (parsedAction.action !== 'FINISH' && parsedAction.action !== 'ABORT') {
      const targetElement = elements.find(el => el.id === Number(parsedAction.elementId));
      if (!targetElement) {
        throw new Error(`AI proposed an invalid element ID #${parsedAction.elementId}. Available IDs: 1 to ${elements.length}.`);
      }

      parsedAction.targetElement = targetElement;

      // Validate against safety rules
      const safetyCheck = SafetyService.validateProposedAction(parsedAction, targetElement, currentUrl);
      if (!safetyCheck.safe) {
        return {
          action: 'ABORT',
          elementId: targetElement.id,
          targetElement,
          rationale: `SAFETY SHIELD ACTIVATED: ${safetyCheck.error}`,
          isFinalStep: true
        };
      }
    }

    return parsedAction;
  }

  /**
   * Extracts and validates JSON object from LLM response.
   * Handles markdown fences, raw text, or partial JSON.
   */
  parseActionJson(rawText = '') {
    let cleanText = rawText.trim();

    // Strip markdown code fences if model wrapped response in ```json ... ```
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
    }

    // Try finding JSON object bounds { ... }
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
      const obj = JSON.parse(cleanText);

      // Normalize action name
      const action = (obj.action || 'ABORT').toUpperCase();
      if (!['CLICK', 'TYPE', 'SELECT', 'FINISH', 'ABORT'].includes(action)) {
        throw new Error(`Unknown action type: "${obj.action}"`);
      }

      return {
        action,
        elementId: obj.elementId !== undefined ? Number(obj.elementId) : null,
        value: obj.value !== undefined ? String(obj.value) : '',
        rationale: obj.rationale || 'Next logical browser step',
        isFinalStep: Boolean(obj.isFinalStep || action === 'FINISH' || action === 'ABORT')
      };
    } catch (parseErr) {
      console.error('[Snip Agent] JSON Parse failure. Raw output:', rawText);
      throw new Error(`Failed to parse AI action response: ${parseErr.message}`);
    }
  }
}
