let timeAllowed = 0; // social media time earned
let lastResetTime = Date.now();
let solvedProblems = {};
let resetPeriodDays = 7; // Default to a weekly reset

// Reset timer based on customizable period
function checkAndResetPeriodically() {
  const currentTime = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  if (currentTime - lastResetTime >= resetPeriodDays * oneDayInMs) {
    timeAllowed = 0; // Reset earned time 
    solvedProblems = {};
    lastResetTime = currentTime;
    chrome.storage.local.set({ timeAllowed, lastResetTime, solvedProblems });
  }
}

// Initialize state from storage
chrome.storage.local.get(['timeAllowed', 'lastResetTime', 'solvedProblems', 'resetPeriodDays'], (result) => {
  timeAllowed = result.timeAllowed || 0;
  lastResetTime = result.lastResetTime || Date.now();
  solvedProblems = result.solvedProblems || {};
  resetPeriodDays = result.resetPeriodDays || 1;
  checkAndResetPeriodically();
});

// Listen for LeetCode submissions
chrome.webRequest.onCompleted.addListener(
  function(details) {
    const url = details.url;
    const pattern = new RegExp("https:\\/\\/leetcode.com\\/problems\\/[^/]+\\/submit\\/");
    if (pattern.test(url)) {
      const problem = url.split("/")[4]; // Extract the problem name slug
      // Add delay to ensure submission is processed
      setTimeout(() => checkSubmission(problem), 1500);
    }
  },
  { urls: ["*://*.leetcode.com/*"] }
);

// Check submission result and difficulty
async function checkSubmission(problem) {
  try {
    // Step 1: Fetch the user's submission history for the given problem
    const response = await fetch(`https://leetcode.com/api/submissions/${problem}/`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    // Step 2: If request failed, stop and show error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();// Parse the JSON response
    
    // Validate submissions data
    if (!data.submissions_dump || !data.submissions_dump.length) {
      console.log('No submissions found yet, retrying in 1.5 seconds...');
      setTimeout(() => checkSubmission(problem), 1500);// Retry after 1.5s
      return;
    }
    
    // Get latest submission
    const submission = data.submissions_dump[0];
    // Validate that it has an ID
    if (!submission || !submission.id) {
      console.log('Invalid submission data, retrying in 1.5 seconds...');
      setTimeout(() => checkSubmission(problem), 1500);
      return;
    }

    const submissionId = submission.id;// Unique ID of the latest submission
    
    // Start polling the submission status (every 1 second)
    let startTime = Date.now();
    const checkInterval = setInterval(async () => {
      try {
        //Check submission result using its ID
        const checkResponse = await fetch(`https://leetcode.com/submissions/detail/${submissionId}/check/`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!checkResponse.ok) { //If request fails, stop the interval
          throw new Error(`HTTP error! status: ${checkResponse.status}`);
        }

        const checkData = await checkResponse.json();
        
        if (checkData.state === "SUCCESS") {
          if (checkData.status_msg === "Accepted") {// The problem was accepted!
           // Check if the problem has already been solved this period
           if(!solvedProblems[problem]){
             chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs && tabs[0] && tabs[0].id) {
                chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  function: getDifficulty,
                }, (results) => {
                  if (results && results[0] && results[0].result) {
                    const difficulty = results[0].result;
                    updateTimeAllowed(difficulty);
                    // Add the problem to the solved list and save it
                    solvedProblems[problem] = true;
                    chrome.storage.local.set({ solvedProblems });
                  } else {
                    console.log('Could not determine problem difficulty');
                  }
                });
              }
            });
           }else{
            console.log(`Problem "${problem}" already solved this period. No reward added.`);
           }
          }
          clearInterval(checkInterval);  // Stop checking since we got a result
        }
        
        if (Date.now() - startTime > 10000) {//Timeout after 10 seconds if no success
          clearInterval(checkInterval);
          console.log('Timeout while checking submission status');
        }
      } catch (error) { // Stop polling if there's an error
        clearInterval(checkInterval);
        console.error('Error checking submission status:', error);
      }
    }, 1000);
  } catch (error) {     // If initial fetch fails, log the error
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

// Listen for time deduction messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'deductTime') {
    timeAllowed -= message.cost * 60; // Convert minutes to seconds
    chrome.storage.local.set({ timeAllowed });
  }
});

function isLeetCodeProblemPage(url) {
  return url && url.includes("leetcode.com/problems/");
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && isLeetCodeProblemPage(tab.url)) {
    chrome.action.enable(tabId);
  } else {
    chrome.action.disable(tabId);
  }
});

// Function that will be injected into the page
function getDifficulty() {
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
  return difficultyElement ? difficultyElement.textContent : null;
}

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
    const webnovelPattern =  /^(www\.)?webnovel\.com\/?.*/i; 
    const novelbinPattern =  /^(www\.)?novelbin\.com\/?.*/i; 
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
      (urlObj.hostname === 'facebook.com' || urlObj.hostname === 'www.facebook.com') && facebookPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'webnovel.com' || urlObj.hostname === 'www.webnovel.com') && webnovelPattern.test(urlObj.host + urlObj.pathname) ||
      (urlObj.hostname === 'novelbin.com' || urlObj.hostname === 'www.novelbin.com') && novelbinPattern.test(urlObj.host + urlObj.pathname)
    );
  } catch (e) { // Handle malformed URL errors gracefully
    console.error('Error parsing URL:', e);
    return false;
  }
}

// Update the blocking listener
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  checkAndResetPeriodically();
  
  if (timeAllowed <= 0 && isSocialMediaMainPage(details.url)) {
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
});

// Update the time counter listener
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && isSocialMediaMainPage(tab.url)) { // Wait until the page has fully loaded and it's a known social media site
    const interval = setInterval(() => {
      checkAndResetPeriodically();
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

// Listen for messages to update the reset period
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateResetPeriod') {
    const newPeriod = parseInt(message.period, 10);
    if (!isNaN(newPeriod) && newPeriod > 0) {
      resetPeriodDays = newPeriod;
      chrome.storage.local.set({ resetPeriodDays });
      console.log(`Reset period updated to ${newPeriod} days.`);
    }
  }
});