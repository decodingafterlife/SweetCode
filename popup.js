document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const ordinaryHintBtn = document.getElementById('ordinary-hint');
  const advancedHintBtn = document.getElementById('advanced-hint');
  const expertHintBtn = document.getElementById('expert-hint');
  const hintContainer = document.getElementById('hint-container');
  const hintText = document.getElementById('hint-text');
  const errorContainer = document.getElementById('error-container');
  const errorText = document.getElementById('error-text');

  // Load saved API key
  chrome.storage.local.get('groq_api_key', (result) => {
    if (result.groq_api_key) {
      apiKeyInput.value = result.groq_api_key;
    }
  });

  // Save API key on change
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ 'groq_api_key': apiKeyInput.value });
  });

  ordinaryHintBtn.addEventListener('click', () => getHint('ordinary'));
  advancedHintBtn.addEventListener('click', () => getHint('advanced'));
  expertHintBtn.addEventListener('click', () => getHint('expert'));

  function getHint(level) {
    const apiKey = apiKeyInput.value;
    const model = modelSelect.value;

    if (!apiKey) {
      showError('Please enter your Groq API key.');
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          function: getProblemContext,
        },
        (results) => {
          if (results && results[0] && results[0].result) {
            const problemContext = results[0].result;
            fetchHint(apiKey, model, level, problemContext);
          } else {
            showError('Could not get problem context from LeetCode page.');
          }
        }
      );
    });
  }

  async function fetchHint(apiKey, model, level, context) {
    const cost = {
      ordinary: 2,
      advanced: 3,
      expert: 5,
    };

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for LeetCode. Provide a ${level} hint for the following problem. Do not solve the entire problem. Just provide a hint.`,
            },
            {
              role: 'user',
              content: context,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const hint = data.choices[0].message.content;

      hintText.innerText = hint;
      hintContainer.classList.remove('hidden');
      errorContainer.classList.add('hidden');

      // Deduct time
      chrome.runtime.sendMessage({ type: 'deductTime', cost: cost[level] });
    } catch (error) {
      showError(error.message);
    }
  }

  function showError(message) {
    errorText.innerText = message;
    errorContainer.classList.remove('hidden');
    hintContainer.classList.add('hidden');
  }
});

function getProblemContext() {
  const titleElement = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/problems/'));
  const questionTitle = titleElement ? titleElement.innerText : 'Title not found';
  const questionContent = document.querySelector('[data-track-load="description_content"]').innerText;
  return `Title: ${questionTitle}\n\n${questionContent}`;
}