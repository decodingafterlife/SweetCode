let popupTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const customModelInput = document.getElementById("custom-model-input");
  const ordinaryHintBtn = document.getElementById('ordinary-hint');
  const advancedHintBtn = document.getElementById('advanced-hint');
  const expertHintBtn = document.getElementById('expert-hint');
  const hintContainer = document.getElementById('hint-container');
  const hintText = document.getElementById('hint-text');
  const errorContainer = document.getElementById('error-container');
  const errorText = document.getElementById('error-text');
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings');
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const aiTitle = document.getElementById('ai-title');

  // Load saved settings (API key and model)
  chrome.storage.local.get(['groq_api_key', 'selected_model'], (result) => {
    if (result.groq_api_key) {
      apiKeyInput.value = result.groq_api_key;
    }

    if (result.selected_model) {
      const presets = ['llama3-8b-8192', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'];

      if (presets.includes(result.selected_model)) {
        modelSelect.value = result.selected_model;
      } else {
        modelSelect.value = 'custom';
        customModelInput.value = result.selected_model;
      }
      toggleCustomInput();
    }
  });
  
  const resetPeriodInput = document.getElementById('reset-period');

  chrome.storage.local.get(['resetPeriodDays'], (result) => {
    if (result.resetPeriodDays) {
      resetPeriodInput.value = result.resetPeriodDays;
    }
  });


  // Save API key on change
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ 'groq_api_key': apiKeyInput.value });
  });

  modelSelect.addEventListener('change', toggleCustomInput);
  toggleCustomInput(); // run once on startup

  // Hint button clicks
  ordinaryHintBtn.addEventListener('click', () => getHint('ordinary'));
  advancedHintBtn.addEventListener('click', () => getHint('advanced'));
  expertHintBtn.addEventListener('click', () => getHint('expert'));

function getHint(level) {
  // Read the current allowed time first
  chrome.storage.local.get(['timeAllowed'], function(result) {
    const timeAllowed = result.timeAllowed || 0;
    if (timeAllowed <= -5) {
      showError('You have reached the hint limit! Solve a LeetCode problem to earn more time.');
      return;
    }

    const apiKey = apiKeyInput.value;
    const model = modelSelect.value === 'custom' ? customModelInput.value.trim() : modelSelect.value;

    // Check if custom model field is empty
    if (modelSelect.value === 'custom' && !model) {
      showError('Please enter a custom model name.');
      return;
    }

    if (!apiKey) {
      showError('Please enter your Groq API key.');
      return;
    }

    // Get the current leetcode problem
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
  });
}

async function fetchHint(apiKey, model, level, context) {
  const cost = {
    ordinary: 2,
    advanced: 3,
    expert: 5,
  };

  try {
    // Use the global window.generateHint() from prompts.js
    const hint = await window.generateHint(apiKey, model, level, context);

    hintText.innerText = hint;
    hintContainer.classList.remove('hidden');
    errorContainer.classList.add('hidden');

    // Deduct time
    chrome.runtime.sendMessage({ type: 'deductTime', cost: cost[level] });
    loadTimerFromStorage();
  } catch (error) {
    showError(error.message);
  }
}
  function showError(message) {
    errorText.innerText = message;
    errorContainer.classList.remove('hidden');
    hintContainer.classList.add('hidden');
  }

  function toggleCustomInput() {
    if (modelSelect.value === 'custom') {
      customModelInput.style.display = 'block';
      customModelInput.focus();
    } else {
      customModelInput.style.display = 'none';
      customModelInput.value = '';
    }
  }

  // Settings page navigation
  settingsBtn.addEventListener('click', () => {
    document.querySelector('.container').style.display = 'none';
    settingsView.style.display = 'block';
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsView.style.display = 'none';
    document.querySelector('.container').style.display = 'flex';
    
    // Make sure container keeps its layout
    const container = document.querySelector('.container');
    if (container) {
      container.style.flexDirection = 'column';
      container.style.gap = '15px';
    }
    
    // Check if we're on leetcode again
    setTimeout(() => {
      checkIfLeetCode();
    }, 50);
  });

  // Save settings button
  const saveSettingsBtn = document.getElementById('save-settings');
  saveSettingsBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelSelect.value === 'custom' ? customModelInput.value.trim() : modelSelect.value;

    if (!apiKey) {
      alert('Please enter your Groq API key before saving.');
      return;
    }

    if (modelSelect.value === 'custom' && !selectedModel) {
      alert('Please enter a custom model name before saving.');
      return;
    }
    const resetPeriod = Math.max(1, parseInt(resetPeriodInput.value, 10) || 7);
    chrome.storage.local.set({
      groq_api_key: apiKey,
      selected_model: selectedModel,
      resetPeriodDays: resetPeriod
    }, () => {
      alert('Settings saved successfully!');
      chrome.runtime.sendMessage({ type: 'updateResetPeriod', period: resetPeriod });
    });
  });

  function startRealtimeTimer() {
    if (popupTimerInterval) {
      clearInterval(popupTimerInterval);
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentUrl = tabs[0].url;
      if (isSocialMediaSite(currentUrl)) {
        loadTimerFromStorage();
        
        // Update timer every second
        popupTimerInterval = setInterval(function () {
          loadTimerFromStorage();
        }, 1000);
      } else {
        // Just load once for non-social media sites
        loadTimerFromStorage();
      }
    });
  }

  function isSocialMediaSite(url) {
    if (!url) return false;

    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('youtube.com') ||
        urlObj.hostname.includes('instagram.com') ||
        urlObj.hostname.includes('twitter.com') ||
        urlObj.hostname.includes('x.com') ||
        urlObj.hostname.includes('facebook.com') ||
        urlObj.hostname.includes('webnovel.com') ||
        urlObj.hostname.includes('novelbin.com')
      );
    } catch (e) {
      return false;
    }
  }

  // Listen for tab changes
  chrome.tabs.onActivated.addListener(function (activeInfo) {
    setTimeout(() => {
      startRealtimeTimer();
    }, 100);
  });

  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      setTimeout(() => {
        startRealtimeTimer();
      }, 100);
    }
  });

  // Startup
  checkIfLeetCode();
  startRealtimeTimer();

  chrome.storage.onChanged.addListener(function (changes, areaName) {
  if (areaName === 'local' && changes.timeAllowed) {
    updateTimerDisplay(changes.timeAllowed.newValue || 0);
  }
});

});

const hintsSection = document.querySelector('.hints');
const aiTitle = document.getElementById('ai-title');

function checkIfLeetCode() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs || !tabs[0] || !tabs[0].url) {
      return;
    }
    
    const url = tabs[0].url;
    const isLeet = url.indexOf('leetcode.com/problems/') !== -1;
    const aiBox = document.querySelector('.ai-box');

    if (isLeet) {
      if (aiBox && aiBox.style.display === 'none') { 
        aiBox.style.display = 'block';
      }
    } else {
      if (aiBox && aiBox.style.display !== 'none') { 
        aiBox.style.display = 'none'; 
      }
    }
  });
}

// Problem details from leetcode page
function getProblemContext() {
  const titleElement = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/problems/'));
  const questionTitle = titleElement ? titleElement.innerText : 'Title not found';
  const questionContent = document.querySelector('[data-track-load="description_content"]').innerText;
  return `Title: ${questionTitle}\n\n${questionContent}`;
}

// Timer 
function updateTimerDisplay(timeInSeconds) {
  timeInSeconds = Math.max(0, timeInSeconds);
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const formattedTime = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    timerElement.textContent = formattedTime;
  }
}

function loadTimerFromStorage() {
  chrome.storage.local.get(['timeAllowed'], function (result) {
    const timeAllowed = result.timeAllowed || 0;
    updateTimerDisplay(timeAllowed);
  });
}
