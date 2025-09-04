(() => {
  'use strict';

const HINT_PROMPTS = {
  ordinary: {
    systemPrompt: `You are a helpful LeetCode tutor providing ORDINARY level hints.

Your goal: Give a gentle nudge in the right direction without revealing too much.
Rules:
- FIRST LINE must be exactly: "Here's an Ordinary level hint..."
- Do NOT write anything before that first line.
- Focus on understanding the problem better.
- Suggest what data structures or concepts to consider.
- Ask guiding questions that help the student think.
- Keep it simple, concise, and encouraging.
- Do NOT provide code, pseudo-code, or partial algorithms.
- Stop immediately when you reach 50 words. Do NOT exceed 50 words.
- STRICTLY respond in no more than 50 words. The first line counts as part of the 50 words.
- Do not add filler or background text before or after the hint.`,
    temperature: 0.3,
    maxWords: 50
  },

  advanced: {
    systemPrompt: `You are an experienced LeetCode mentor providing ADVANCED level hints.

Your goal: Provide deeper and more specific guidance without fully solving the problem.
Rules:
- FIRST LINE must be exactly: "Here's an Advanced level hint..."
- Do NOT write anything before that first line.
- Explain the general approach or recognized problem pattern.
- Mention specific algorithms or techniques (e.g., "two pointers", "DFS with memoization") without giving full implementation.
- Discuss time/space complexity considerations.
- Suggest how to break the problem into manageable steps.
- Avoid giving complete pseudo-code or direct answers.
- Stop immediately when you reach 75 words. Do NOT exceed 75 words.
- STRICTLY respond in no more than 75 words. The first line counts as part of the 75 words.
- Do not add filler or background text before or after the hint.`,
    temperature: 0.3,
    maxWords: 75
  },

  expert: {
    systemPrompt: `You are a LeetCode expert providing EXPERT level hints.

Your goal: Give comprehensive strategic guidance for optimal problem-solving.
Rules:
- FIRST LINE must be exactly: "Here's an Expert level hint..."
- Do NOT write anything before that first line.
- Explain the optimal algorithm and why it works.
- Discuss alternative approaches and trade-offs.
- Analyze time and space complexity in detail.
- Mention important edge cases.
- Provide a high-level roadmap for the implementation.
- Let the student write the actual code.
- Stop immediately when you reach 100 words. Do NOT exceed 100 words.
- STRICTLY respond in no more than 100 words. The first line counts as part of the 100 words.
- Do not add filler or background text before or after the hint.`,
    temperature: 0.3,
     maxWords: 100
  }
};


  function filterResponse(text, maxWords) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text.trimStart();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/<reflection>[\s\S]*?<\/reflection>/gi, '');
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    cleaned = cleaned.replace(/^(Assistant:|AI:|System:)\s*/i, '');
    
    const match = cleaned.match(/(Here's an (Ordinary|Advanced|Expert) level hint.*)/i);
  if (match) {
    cleaned = match[1] + ' ' + cleaned.slice(match.index + match[0].length).trim();
  }
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

  return cleaned;
}

  function extractModelText(responseJson) {
    try {
      if (!responseJson) return '';

      if (responseJson.choices && responseJson.choices[0] && responseJson.choices[0].message && typeof responseJson.choices[0].message.content === 'string') {
        return responseJson.choices[0].message.content;
      }

      if (responseJson.generations && responseJson.generations[0] && responseJson.generations[0][0] && responseJson.generations[0][0].text) {
        return responseJson.generations[0][0].text;
      }

      return JSON.stringify(responseJson).slice(0, 1000);
    } catch (e) {
      return '';
    }
  }

  window.generateHint = async function (apiKey, model, level, problemContext) {
    if (!apiKey) throw new Error('Groq API key is required.');
    if (!model) throw new Error('Model name is required.');
    if (!HINT_PROMPTS[level]) throw new Error('Invalid hint level.');

    const promptConfig = HINT_PROMPTS[level];

    const systemMessage = promptConfig.systemPrompt;
    const userMessage = `Problem Context:\n${problemContext}\n\nPlease provide a ${level.toUpperCase()}-level hint for this problem. Keep within ${promptConfig.maxWords} words. Do NOT provide code or full solution.`;

    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: promptConfig.temperature,
      max_tokens: Math.ceil(promptConfig.maxWords * 1.6)
    };

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Groq API error ${resp.status}: ${errText || resp.statusText}`);
    }

    const data = await resp.json();
    let raw = extractModelText(data);
    raw = filterResponse(raw, promptConfig.maxWords);
    return raw;
  };

})();
