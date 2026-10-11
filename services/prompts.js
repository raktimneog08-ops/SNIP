/**
 * services/prompts.js
 * Master Prompt Engineering Engine for Snip.
 * Supports standard English and conversational Hinglish outputs.
 */

export const Prompts = {
  /**
   * System instruction modifier for target language.
   */
  getLanguageInstruction(language = 'en') {
    if (language === 'hinglish') {
      return `LANGUAGE REQUIREMENT: Respond in natural, conversational Hinglish (a mixture of Hindi and English written in Latin script, as commonly used in India/South Asia). Keep technical and domain words in English, while conversational connectors, explanations, and advice are in Hindi words written in English letters. Example: "Yeh article explain karta hai ki neural networks kaise train hote hain. Sabse pehle input data ko clean karna zaroori hai."`;
    }
    return `LANGUAGE REQUIREMENT: Respond in clear, concise, fluent English.`;
  },

  /**
   * Structured Article Summary Prompt:
   * 1. One-line TL;DR
   * 2. Five key points
   * 3. What to do next
   */
  buildArticleSummaryPrompt(article, language = 'en') {
    const langInstr = this.getLanguageInstruction(language);
    const textSnippet = (article.textContent || '').slice(0, 30000);

    return `${langInstr}

You are Snip, a browser AI agent. Analyze the following web page/article and provide a structured summary in strictly formatted Markdown.

TITLE: ${article.title || 'Web Page'}
BYLINE: ${article.byline || 'Unknown'}
URL: ${article.url || ''}

CONTENT:
${textSnippet}

REQUIRED FORMAT:
### 📌 TL;DR
> [Single crisp sentence summarizing the core takeaway]

### 🎯 5 Key Points
- **Point 1**: [Detailed insight]
- **Point 2**: [Detailed insight]
- **Point 3**: [Detailed insight]
- **Point 4**: [Detailed insight]
- **Point 5**: [Detailed insight]

### 🚀 What To Do Next / Actionable Takeaways
- [Concrete next step or application of this knowledge]
- [Practical recommendation for the reader]
`;
  },

  /**
   * YouTube Video Summarizer Prompt:
   * Generates chapter-style notes with exact timestamps [MM:SS]
   */
  buildYouTubeSummaryPrompt(videoData, language = 'en') {
    const langInstr = this.getLanguageInstruction(language);

    return `${langInstr}

You are Snip. Summarize this YouTube video based on its title, description, and available transcript/metadata.

VIDEO TITLE: ${videoData.title || 'YouTube Video'}
CHANNEL: ${videoData.author || 'Unknown'}
VIDEO ID: ${videoData.videoId || ''}
DESCRIPTION:
${(videoData.description || '').slice(0, 3000)}

TRANSCRIPT / CAPTIONS:
${(videoData.transcriptText || videoData.description || 'No captions available.').slice(0, 20000)}

INSTRUCTIONS:
1. Provide a quick 2-sentence executive summary of the video.
2. Provide chapter-by-chapter notes with clickable timestamp markers in the exact format: \`[MM:SS]\` or \`[HH:MM:SS]\` followed by a concise heading and key takeaways.
3. If no transcript was present, base your best timestamp estimate from chapters mentioned in the video description.
4. Conclude with a "Key Takeaway" section.
`;
  },

  /**
   * Explains selected text in plain language.
   */
  buildExplainSelectionPrompt(selectedText, pageTitle = '', language = 'en') {
    const langInstr = this.getLanguageInstruction(language);

    return `${langInstr}

You are Snip. A user selected this specific text on "${pageTitle}":

"""
${selectedText}
"""

Explain this text in plain, easy-to-understand language. Clarify any dense jargon, acronyms, or complex logic. Provide a brief analogy if helpful. Keep your response under 3 short paragraphs.
`;
  },

  /**
   * Context-grounded Page Chat System Instruction.
   * Prevents hallucinations by strictly confining answers to page text.
   */
  buildPageChatSystemPrompt(pageContext, language = 'en') {
    const langInstr = this.getLanguageInstruction(language);
    const content = (pageContext.textContent || '').slice(0, 35000);

    return `You are Snip, a helpful Chrome side-panel AI agent.
${langInstr}

CRITICAL RULES:
1. Answer the user's questions ONLY using the extracted web page content provided below.
2. If the user asks something that is NOT mentioned or cannot be directly deduced from this page content, you MUST reply: "This information is not available on the current page."
3. Do not hallucinate, make up facts, or guess external URLs outside this page.
4. Keep answers concise, factual, and direct.

CURRENT PAGE CONTEXT:
Title: ${pageContext.title || ''}
URL: ${pageContext.url || ''}
Content:
${content}
`;
  },

  /**
   * Drafts a contextual reply (email, comment, post).
   */
  buildDraftReplyPrompt(selectedText, tone = 'professional', userProfile = {}, language = 'en') {
    const langInstr = this.getLanguageInstruction(language);
    const authorName = userProfile.fullName || 'The User';
    const authorRole = userProfile.jobTitle ? ` (${userProfile.jobTitle})` : '';

    return `${langInstr}

You are Snip. Draft a ${tone} reply to the following message or post:

"""
${selectedText}
"""

Sender details (if applicable): ${authorName}${authorRole}.
Requirements:
1. Be polite, concise, and direct.
2. Provide 2 draft variations:
   - Option A: Short & Direct
   - Option B: Detailed & Thoughtful
`;
  },

  /**
   * Translates text.
   */
  buildTranslatePrompt(selectedText, targetLanguage = 'Hindi') {
    return `Translate the following text accurately into ${targetLanguage}. Maintain tone, formatting, and technical terminology where appropriate:

"""
${selectedText}
"""
`;
  },

  /**
   * Action Planning Prompt:
   * Reasons over numbered element map to propose the single next browser action.
   */
  buildActionPlanningPrompt(userGoal, elements, userProfile = {}, pastActions = []) {
    // Format compact elements inventory
    const elementsList = elements
      .slice(0, 80) // Keep top visible elements
      .map(el => {
        const sensitiveTag = el.isSensitive ? ' [PROTECTED/SENSITIVE]' : '';
        const val = el.value ? ` current_value="${el.value}"` : '';
        return `[#${el.id}] <${el.tag} type="${el.type || ''}" name="${el.name || ''}" placeholder="${el.placeholder || ''}" label="${el.label || ''}"${val}>${sensitiveTag}`;
      })
      .join('\n');

    const profileSummary = Object.entries(userProfile)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `${k}: "${v}"`)
      .join(', ');

    const pastActionsStr = pastActions.length > 0
      ? pastActions.map((a, i) => `${i + 1}. ${a.action} on #${a.elementId} (${a.status})`).join('\n')
      : 'None yet.';

    return `You are Snip, an expert browser automation planner.
A user wants to achieve this goal on the current webpage:
GOAL: "${userGoal}"

AVAILABLE USER PROFILE INFORMATION (for form filling if relevant):
${profileSummary || 'No profile data saved.'}

PAST ACTIONS TAKEN IN THIS SESSION:
${pastActionsStr}

PAGE INTERACTIVE ELEMENTS (Numbered Action Map):
${elementsList}

SAFETY DIRECTIVES:
1. NEVER propose an action on any element marked [PROTECTED/SENSITIVE] (passwords, payment cards, CVV, OTP). If the goal requires it, set action to "ABORT" with rationale explaining why.
2. Propose exactly ONE single atomic action step at a time.
3. If the goal is already satisfied, propose "FINISH".

OUTPUT FORMAT:
Respond with ONLY a raw valid JSON object (no markdown, no backticks, no explanatory prose outside JSON):
{
  "action": "CLICK" | "TYPE" | "SELECT" | "FINISH" | "ABORT",
  "elementId": <number id of element from list>,
  "value": "<text to type or option to select, or empty string>",
  "rationale": "<clear explanation of why this step is proposed>",
  "isFinalStep": <boolean>
}
`;
  }
};
