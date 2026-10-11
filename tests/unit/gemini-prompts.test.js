/**
 * tests/unit/gemini-prompts.test.js
 * Unit tests for prompt generation across English, Hinglish, YouTube, Chat, and Action Planning.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Prompts } from '../../services/prompts.js';

test('Prompts - Article Summary formatting', () => {
  const article = {
    title: 'The Future of AI Agents',
    byline: 'Dr. Jane Smith',
    url: 'https://example.com/ai',
    textContent: 'AI agents are evolving from chatbots to user-controlled browser co-pilots.'
  };

  const englishPrompt = Prompts.buildArticleSummaryPrompt(article, 'en');
  assert.ok(englishPrompt.includes('TL;DR'), 'Contains TL;DR section');
  assert.ok(englishPrompt.includes('5 Key Points'), 'Contains 5 Key Points section');
  assert.ok(englishPrompt.includes('What To Do Next'), 'Contains Actionable Takeaways');
  assert.ok(englishPrompt.includes('clear, concise, fluent English'), 'Enforces English instruction');

  const hinglishPrompt = Prompts.buildArticleSummaryPrompt(article, 'hinglish');
  assert.ok(hinglishPrompt.includes('natural, conversational Hinglish'), 'Enforces Hinglish instruction');
});

test('Prompts - YouTube Video Summary prompt', () => {
  const ytData = {
    title: 'How Transformers Work in 10 Minutes',
    author: 'Tech Academy',
    videoId: 'abc123xyz',
    description: 'An intuitive guide to attention mechanisms.',
    transcriptText: '[00:30] Attention is all you need\n[03:45] Multi-head self-attention'
  };

  const prompt = Prompts.buildYouTubeSummaryPrompt(ytData, 'en');
  assert.ok(prompt.includes('How Transformers Work in 10 Minutes'));
  assert.ok(prompt.includes('[MM:SS]'));
  assert.ok(prompt.includes('Multi-head self-attention'));
});

test('Prompts - Grounded Page Chat System Instruction', () => {
  const context = {
    title: 'Quantum Computing Overview',
    url: 'https://example.com/quantum',
    textContent: 'Qubits exploit superposition and entanglement.'
  };

  const systemPrompt = Prompts.buildPageChatSystemPrompt(context, 'en');
  assert.ok(systemPrompt.includes('Answer the user\'s questions ONLY using the extracted web page content'));
  assert.ok(systemPrompt.includes('This information is not available on the current page'));
  assert.ok(systemPrompt.includes('Do not hallucinate'));
  assert.ok(systemPrompt.includes('Qubits exploit superposition'));
});

test('Prompts - Action Planning prompt construction', () => {
  const elements = [
    { id: 1, tag: 'INPUT', type: 'text', name: 'search_query', label: 'Search', isSensitive: false },
    { id: 2, tag: 'BUTTON', type: 'submit', name: '', label: 'Search Now', isSensitive: false },
    { id: 3, tag: 'INPUT', type: 'password', name: 'user_pwd', label: 'Password', isSensitive: true }
  ];

  const profile = { fullName: 'Alice Wonderland' };
  const prompt = Prompts.buildActionPlanningPrompt('Search for quantum supremacy', elements, profile, []);

  assert.ok(prompt.includes('[#1] <INPUT'));
  assert.ok(prompt.includes('[#3] <INPUT'));
  assert.ok(prompt.includes('[PROTECTED/SENSITIVE]'), 'Flags password as protected');
  assert.ok(prompt.includes('NEVER propose an action on any element marked [PROTECTED/SENSITIVE]'));
  assert.ok(prompt.includes('Alice Wonderland'));
});
