(() => {
  'use strict';

  const HINT_PROMPTS = {
    ordinary: {
      systemPrompt: `You are a helpful LeetCode tutor providing ORDINARY level hints.

Your goal: Give a gentle nudge in the right direction without revealing too much.
- Focus on understanding the problem better
- Suggest what data structures or concepts to consider
- Ask guiding questions that help the student think
- Keep it simple and encouraging
- DO NOT provide code or detailed algorithms

Word limit: 50 words maximum.`,
      temperature: 0.3,
      maxWords: 50
    },

    advanced: {
      systemPrompt: `You are an experienced LeetCode mentor providing ADVANCED level hints.

Your goal: Provide deeper and more specific guidance without fully solving the problem.
- Explain the general approach or recognized problem pattern
- Mention specific algorithms or techniques (e.g., "two pointers", "DFS with memoization")
- Discuss time/space complexity considerations
- Suggest how to break the problem into manageable steps
- Avoid giving complete pseudo-code or direct answers

Word limit: 100 words maximum.`,
      temperature: 0.3,
      maxWords: 100
    },

    expert: {
      systemPrompt: `You are a LeetCode expert providing EXPERT level hints.

Your goal: Give comprehensive strategic guidance for optimal problem-solving.
- Explain the optimal algorithm and why it works
- Discuss alternative approaches and trade-offs
- Analyze time and space complexity in detail
- Mention important edge cases
- Provide a high-level roadmap for the implementation
- Let the student write the actual code

Word limit: 150 words maximum.`,
      temperature: 0.3,
      maxWords: 150
    }
  };

  function filterResponse(text) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/<reflection>[\s\S]*?<\/reflection>/gi, '');
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    cleaned = cleaned.replace(/^(Assistant:|AI:|System:)\s*/i, '');
    cleaned = cleaned.replace(/^\s*(?:Sure[,\.]?\s*)?(?:here(?:'s| is)\s+(?:a\s+)?)?(?:hint|suggestion|note|tip)\s*[:\-]?\s*/i, '');

    cleaned = cleaned.replace(/^(?:Here['’]?s|Here is|You can)\b[\s\S]*?(?:\n{1,2}|$)/i, (m) => {
      return m.length > 140 ? '' : m;
    });

    cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

    cleaned = cleaned.trim();

    return cleaned;
  }

  function enforceWordLimit(content, maxWords) {
    if (!content) return '';
    const words = content.trim().split(/\s+/);
    if (words.length <= maxWords) return content.trim();
    return words.slice(0, maxWords).join(' ') + '...';
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

      const asString = JSON.stringify(responseJson);
      return asString.slice(0, 1000);
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

    raw = filterResponse(raw);
    const finalHint = enforceWordLimit(raw, promptConfig.maxWords);

    return finalHint;
  };

})();
