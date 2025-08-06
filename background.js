let timeAllowed = 0;
let lastResetDate = new Date().toDateString();

// Daily reset functionality
function checkAndResetDaily() {
  const currentDate = new Date().toDateString();
  if (currentDate !== lastResetDate) {
    timeAllowed = 0;
    lastResetDate = currentDate;
    chrome.storage.local.set({ timeAllowed, lastResetDate });
  }
}

// Load saved data on startup
chrome.storage.local.get(['timeAllowed', 'lastResetDate'], (result) => {
  timeAllowed = result.timeAllowed || 0;
  lastResetDate = result.lastResetDate || new Date().toDateString();
  checkAndResetDaily();
});

// Watch for LeetCode submissions
chrome.webRequest.onCompleted.addListener(
  function(details) {
    const url = details.url;
    const pattern = new RegExp("https:\\/\\/leetcode.com\\/problems\\/[^/]+\\/submit\\/");
    if (pattern.test(url)) {
      const problem = url.split("/")[4];
      setTimeout(() => checkSubmission(problem), 1500);
    }
  },
  { urls: ["*://*.leetcode.com/*"] }
);

// Check if submission was accepted and award time
async function checkSubmission(problem) {
  try {
    const response = await fetch(`https://leetcode.com/api/submissions/${problem}/`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.submissions_dump || !data.submissions_dump.length) {
      setTimeout(() => checkSubmission(problem), 1500);
      return;
    }
    
    const submission = data.submissions_dump[0];
    if (!submission || !submission.id) {
      setTimeout(() => checkSubmission(problem), 1500);
      return;
    }

    const submissionId = submission.id;
    
    // Check submission result
    let startTime = Date.now();
    const checkInterval = setInterval(async () => {
      try {
        const checkResponse = await fetch(`https://leetcode.com/submissions/detail/${submissionId}/check/`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!checkResponse.ok) {
          throw new Error(`HTTP error! status: ${checkResponse.status}`);
        }

        const checkData = await checkResponse.json();
        
        if (checkData.state === "SUCCESS") {
          if (checkData.status_msg === "Accepted") {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs && tabs[0] && tabs[0].id) {
                chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  function: getDifficulty,
                }, (results) => {
                  if (results && results[0] && results[0].result) {
                    const difficulty = results[0].result;
                    updateTimeAllowed(difficulty);
                  }
                });
              }
            });
          }
          clearInterval(checkInterval);
        }
        
        if (Date.now() - startTime > 10000) {
          clearInterval(checkInterval);
        }
      } catch (error) {
        clearInterval(checkInterval);
        console.error('Error checking submission status:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('Error fetching submission:', error);
  }
}

// Award time based on problem difficulty
function updateTimeAllowed(difficulty) {
  const timeRewards = {
    'Easy': 10,
    'Medium': 20,
    'Hard': 40
  };
  
  const timeAdded = timeRewards[difficulty];
  if (timeAdded) {
    timeAllowed += timeAdded * 60;
    chrome.storage.local.set({ timeAllowed });

    // Show reward popup
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          });
          
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'showRewardPopup',
              timeAdded: timeAdded,
              totalTime: timeAllowed
            }).catch(error => {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: '🎉 LeetCode Success!',
                message: `You earned ${timeAdded} minutes! Total: ${Math.floor(timeAllowed / 60)} minutes`
              });
            });
          }, 100);
          
        } catch (injectionError) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: '🎉 LeetCode Success!',
            message: `You earned ${timeAdded} minutes! Total: ${Math.floor(timeAllowed / 60)} minutes`
          });
        }
      }
    });
  }
}

// Handle hint button time deductions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'deductTime') {
    timeAllowed -= message.cost * 60;
    chrome.storage.local.set({ timeAllowed });
  }
});

function isLeetCodeProblemPage(url) {
  return url && url.includes("leetcode.com/problems/");
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && isLeetCodeProblemPage(tab.url)) {
    chrome.action.enable(tabId);
  }
});

// Extract difficulty from LeetCode page
function getDifficulty() {
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
  return difficultyElement ? difficultyElement.textContent : null;
}

// Check if URL is a time-wasting social media page
function isSocialMediaMainPage(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    const youtubePattern = /^(www\.)?youtube\.com\/?($|\/watch|\/feed|\/trending|\/subscriptions|\/playlist|\/channel|\/c\/|\/user\/)/i;
    const instagramPattern = /^(www\.)?instagram\.com\/?($|\/p\/|\/reels\/|\/stories\/|\/explore\/)/i;
    const twitterPattern = /^(www\.)?twitter\.com\/?($|\/home|\/explore|\/notifications|\/messages|\/i\/|\/[^/]+$)/i;
    const xPattern = /^(www\.)?x\.com\/?($|\/home|\/explore|\/notifications|\/messages|\/i\/|\/[^/]+$)/i;
    const facebookPattern = /^(www\.)?facebook\.com\/?($|\/profile|\/groups|\/marketplace|\/watch|\/gaming|\/messages|\/notifications|\/feed|\/photos|\/videos)/i;
    const webnovelPattern = /^(www\.)?webnovel\.com\/?.*/i; 
    const novelbinPattern = /^(www\.)?novelbin\.com\/?.*/i; 
    
    // Skip login and auth pages
    const excludePatterns = [
      /accounts\.google\.com/,
      /signin/,
      /login/,
      /auth/,
      /servicelogin/,
      /signup/,
      /registration/,
      /forgot/,
      /recover/,
      /help/,
      /support/
    ];

    if (excludePatterns.some(pattern => pattern.test(urlObj.hostname) || pattern.test(urlObj.pathname))) {
      return false;
    }

    return (
      (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') && youtubePattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'instagram.com' || urlObj.hostname === 'www.instagram.com') && instagramPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'twitter.com' || urlObj.hostname === 'www.twitter.com') && twitterPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'x.com' || urlObj.hostname === 'www.x.com') && xPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'facebook.com' || urlObj.hostname === 'www.facebook.com') && facebookPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'webnovel.com' || urlObj.hostname === 'www.webnovel.com') && webnovelPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'novelbin.com' || urlObj.hostname === 'www.novelbin.com') && novelbinPattern.test(urlObj.host + urlObj.pathname)
    );
  } catch (e) {
    console.error('Error parsing URL:', e);
    return false;
  }
}

// Block social media when time runs out
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  checkAndResetDaily();
  
  if (timeAllowed <= 0 && isSocialMediaMainPage(details.url)) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
});

let activeTimers = {};

// Start countdown timer on social media sites
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    if (activeTimers[tabId]) {
      clearInterval(activeTimers[tabId]);
      delete activeTimers[tabId];
    }
    
    if (isSocialMediaMainPage(tab.url)) {
      activeTimers[tabId] = setInterval(() => {
        checkAndResetDaily();
        if (timeAllowed > 0) {
          timeAllowed--;
          chrome.storage.local.set({ timeAllowed });
        } else {
          clearInterval(activeTimers[tabId]);
          delete activeTimers[tabId];
          chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL('blocked.html')
          });
        }
      }, 1000);
    }
  }
});

// Handle tab switching
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    Object.keys(activeTimers).forEach(tabId => {
      if (parseInt(tabId) !== activeInfo.tabId) {
        clearInterval(activeTimers[tabId]);
        delete activeTimers[tabId];
      }
    });
    
    if (activeTimers[activeInfo.tabId]) {
      clearInterval(activeTimers[activeInfo.tabId]);
      delete activeTimers[activeInfo.tabId];
    }
    
    if (isSocialMediaMainPage(tab.url)) {
      activeTimers[activeInfo.tabId] = setInterval(() => {
        checkAndResetDaily();
        if (timeAllowed > 0) {
          timeAllowed--;
          chrome.storage.local.set({ timeAllowed });
        } else {
          clearInterval(activeTimers[activeInfo.tabId]);
          delete activeTimers[activeInfo.tabId];
          chrome.tabs.update(activeInfo.tabId, {
            url: chrome.runtime.getURL('blocked.html')
          });
        }
      }, 1000);
    }
  });
});

// Cleanup when tabs close
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (activeTimers[tabId]) {
    clearInterval(activeTimers[tabId]);
    delete activeTimers[tabId];
  }
});

// Cleanup on extension shutdown
chrome.runtime.onSuspend.addListener(function() {
  Object.keys(activeTimers).forEach(tabId => {
    if (activeTimers[tabId]) {
      clearInterval(activeTimers[tabId]);
      delete activeTimers[tabId];
    }
  });
  
  chrome.storage.local.set({ timeAllowed });
});

self.addEventListener('beforeunload', function() {
  Object.keys(activeTimers).forEach(tabId => {
    if (activeTimers[tabId]) {
      clearInterval(activeTimers[tabId]);
      delete activeTimers[tabId];
    }
  });
});
