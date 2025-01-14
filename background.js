let timeAllowed = 0;
let lastResetDate = new Date().toDateString();

// Reset timer daily
function checkAndResetDaily() {
  const currentDate = new Date().toDateString();
  if (currentDate !== lastResetDate) {
    timeAllowed = 0;
    lastResetDate = currentDate;
    chrome.storage.local.set({ timeAllowed, lastResetDate });
  }
}

// Initialize state from storage
chrome.storage.local.get(['timeAllowed', 'lastResetDate'], (result) => {
  timeAllowed = result.timeAllowed || 0;
  lastResetDate = result.lastResetDate || new Date().toDateString();
  checkAndResetDaily();
});

// Listen for LeetCode submissions
chrome.webRequest.onCompleted.addListener(
  function(details) {
    const url = details.url;
    const pattern = new RegExp("https:\\/\\/leetcode.com\\/problems\\/[^/]+\\/submit\\/");
    if (pattern.test(url)) {
      const problem = url.split("/")[4];
      // Add delay to ensure submission is processed
      setTimeout(() => checkSubmission(problem), 1500);
    }
  },
  { urls: ["*://*.leetcode.com/*"] }
);

// Check submission result and difficulty
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
    
    // Validate submissions data
    if (!data.submissions_dump || !data.submissions_dump.length) {
      console.log('No submissions found yet, retrying in 1.5 seconds...');
      setTimeout(() => checkSubmission(problem), 1500);
      return;
    }
    
    // Get latest submission
    const submission = data.submissions_dump[0];
    if (!submission || !submission.id) {
      console.log('Invalid submission data, retrying in 1.5 seconds...');
      setTimeout(() => checkSubmission(problem), 1500);
      return;
    }

    const submissionId = submission.id;
    
    // Poll for result
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
            // Get problem difficulty from content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs && tabs[0] && tabs[0].id) {
                chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  function: getDifficulty,
                }, (results) => {
                  if (results && results[0] && results[0].result) {
                    const difficulty = results[0].result;
                    updateTimeAllowed(difficulty);
                  } else {
                    console.log('Could not determine problem difficulty');
                  }
                });
              }
            });
          }
          clearInterval(checkInterval);
        }
        
        if (Date.now() - startTime > 10000) {
          clearInterval(checkInterval);
          console.log('Timeout while checking submission status');
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

// Update allowed time based on difficulty
function updateTimeAllowed(difficulty) {
  const timeRewards = {
    'Easy': 10,
    'Medium': 20,
    'Hard': 40
  };
  
  const timeAdded = timeRewards[difficulty];
  if (timeAdded) {
    timeAllowed += timeAdded * 60; // Convert to seconds
    chrome.storage.local.set({ timeAllowed });

    // Send message to content script to show popup
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'showRewardPopup',
          timeAdded: timeAdded,
          totalTime: timeAllowed
        }).catch(error => console.error('Error sending popup message:', error));
      }
    });
  } else {
    console.log('Invalid difficulty level received:', difficulty);
  }
}

// Function that will be injected into the page
function getDifficulty() {
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
  return difficultyElement ? difficultyElement.textContent : null;
}

// // Block social media if time is up
// chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
//   checkAndResetDaily();
  
//   if (timeAllowed <= 0 && 
//       (details.url.includes('youtube.com') || 
//        details.url.includes('instagram.com'))) {
//     chrome.tabs.update(details.tabId, {
//       url: chrome.runtime.getURL('blocked.html')
//     });
//   }
// });

// // Decrease time when on social media
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//   if (changeInfo.status === 'complete' && 
//       (tab.url?.includes('youtube.com') || 
//        tab.url?.includes('instagram.com'))) {
//     const interval = setInterval(() => {
//       checkAndResetDaily();
//       if (timeAllowed > 0) {
//         timeAllowed--;
//         chrome.storage.local.set({ timeAllowed });
//       } else {
//         clearInterval(interval);
//         chrome.tabs.update(tabId, {
//           url: chrome.runtime.getURL('blocked.html')
//         });
//       }
//     }, 1000);
//   }
// });

// Replace the existing URL checking functions with these updated versions:

// Helper function to check if URL is a social media main page
function isSocialMediaMainPage(url) {
  if (!url) return false;
  
  // Create URL object for better parsing
  try {
    const urlObj = new URL(url);
    
    // Define patterns for main social media pages
    const youtubePattern = /^(www\.)?youtube\.com\/?($|\/watch|\/feed|\/trending|\/subscriptions|\/playlist|\/channel|\/c\/|\/user\/)/i;
    const instagramPattern = /^(www\.)?instagram\.com\/?($|\/p\/|\/reels\/|\/stories\/|\/explore\/)/i;
    const twitterPattern = /^(www\.)?twitter\.com\/?($|\/home|\/explore|\/notifications|\/messages|\/i\/|\/[^/]+$)/i;
    const xPattern = /^(www\.)?x\.com\/?($|\/home|\/explore|\/notifications|\/messages|\/i\/|\/[^/]+$)/i;
    const facebookPattern = /^(www\.)?facebook\.com\/?($|\/profile|\/groups|\/marketplace|\/watch|\/gaming|\/messages|\/notifications|\/feed|\/photos|\/videos)/i;
    
    // Explicitly exclude login and authentication pages
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

    // Check if URL matches any exclude patterns
    if (excludePatterns.some(pattern => pattern.test(urlObj.hostname) || pattern.test(urlObj.pathname))) {
      return false;
    }

    // Check if URL matches social media patterns
    return (
      (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') && youtubePattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'instagram.com' || urlObj.hostname === 'www.instagram.com') && instagramPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'twitter.com' || urlObj.hostname === 'www.twitter.com') && twitterPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'x.com' || urlObj.hostname === 'www.x.com') && xPattern.test(urlObj.host + urlObj.pathname) || // Include x.com for Twitter
      (urlObj.hostname === 'facebook.com' || urlObj.hostname === 'www.facebook.com') && facebookPattern.test(urlObj.host + urlObj.pathname)
    );
  } catch (e) {
    console.error('Error parsing URL:', e);
    return false;
  }
}

// Update the blocking listener
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  checkAndResetDaily();
  
  if (timeAllowed <= 0 && isSocialMediaMainPage(details.url)) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
});

// Update the time counter listener
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && isSocialMediaMainPage(tab.url)) {
    const interval = setInterval(() => {
      checkAndResetDaily();
      if (timeAllowed > 0) {
        timeAllowed--;
        chrome.storage.local.set({ timeAllowed });
      } else {
        clearInterval(interval);
        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL('blocked.html')
        });
      }
    }, 1000);
  }
});