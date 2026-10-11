/**
 * services/skills.js
 * One-Click Saved Skills Library & Custom Recipe Engine.
 */

import { StorageService } from './storage.js';

export const DEFAULT_SKILLS = [
  {
    id: 'skill_summary_action_items',
    title: 'Action Item Extractor',
    description: 'Summarizes key decisions and extracts a checklist of actionable tasks and deadlines.',
    category: 'summarize',
    isDefault: true,
    prompt: `Analyze the provided page content. Extract:
1. Executive Summary (2 sentences)
2. Decisions Made or Key Takeaways
3. Action Item Checklist with Owners/Deadlines if mentioned:
   - [ ] Task 1
   - [ ] Task 2
4. Risks or Unanswered Questions`
  },
  {
    id: 'skill_draft_reply',
    title: 'Draft Polite & Professional Reply',
    description: 'Generates a polite, structured email or forum response to selected or visible content.',
    category: 'chat',
    isDefault: true,
    prompt: `Based on the message/post on this page or selected text, draft a clear, polite, and professional response. Maintain a respectful tone and propose clear next steps.`
  },
  {
    id: 'skill_eli5',
    title: 'Explain Like I\'m 5 (ELI5)',
    description: 'Breaks down complex technical jargon, research, or policies into simple language with intuitive analogies.',
    category: 'chat',
    isDefault: true,
    prompt: `Explain the key concepts of this page as if speaking to a 10-year-old. Replace all dense jargon with real-world everyday analogies, keeping the explanation engaging and crystal clear.`
  },
  {
    id: 'skill_table_extractor',
    title: 'Extract Structured Data & Tables',
    description: 'Finds key numerical data, pricing tables, or comparison metrics and formats as Markdown tables.',
    category: 'summarize',
    isDefault: true,
    prompt: `Scan the page for any data, specifications, pricing, or comparative information. Present the structured data in clean Markdown tables with key takeaways highlighted below each table.`
  }
];

export const SkillsService = {
  async getAllSkills() {
    const data = await StorageService.get('savedSkills');
    const customSkills = data.savedSkills || [];
    return [...DEFAULT_SKILLS, ...customSkills];
  },

  async addCustomSkill(skill) {
    const data = await StorageService.get('savedSkills');
    const customSkills = data.savedSkills || [];
    const newSkill = {
      id: 'custom_' + Date.now(),
      title: skill.title,
      description: skill.description || '',
      category: skill.category || 'chat',
      prompt: skill.prompt,
      isDefault: false
    };
    customSkills.push(newSkill);
    await StorageService.set({ savedSkills: customSkills });
    return newSkill;
  },

  async deleteCustomSkill(id) {
    const data = await StorageService.get('savedSkills');
    const customSkills = (data.savedSkills || []).filter(s => s.id !== id);
    await StorageService.set({ savedSkills: customSkills });
  }
};
