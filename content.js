function getDifficulty() {
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]'); // LeetCode renders difficulty (Easy/Medium/Hard) in a div
  return difficultyElement ? difficultyElement.textContent : null; // Return the text if found, otherwise null
}

function createPopup(timeAdded, totalTime) {
  // Remove any existing popup
  const existingPopup = document.querySelector('.leetcode-reward-popup');
  if (existingPopup) { // Remove any existing popup to avoid duplicates
    existingPopup.remove();
  }

  const popup = document.createElement('div');   // Create a new popup element
  popup.className = 'leetcode-reward-popup';
  popup.innerHTML = `
    <h3>🎉 Success!</h3>
    <p>You earned <span class="time-added">${timeAdded} minutes</span> of social media time!</p>
    <p class="total-time">Total time available: ${Math.floor(totalTime / 60)} minutes</p>
  `;

  document.body.appendChild(popup);   // Attach the popup to the page

  // Remove popup after 5 seconds
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(100%)';
    setTimeout(() => popup.remove(), 500);
  }, 5000);
}

//  Create a popup for already solved problems
function createAlreadySolvedNotification() {
  const existingPopup = document.querySelector('.leetcode-reward-popup'); // Remove any existing popup
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('div');
  popup.className = 'leetcode-reward-popup leetcode-warning-popup';
  popup.innerHTML = `
    <h3>⚠️ Already solved!</h3>
    <p>This problem has been solved in the current period. No time added.</p>
  `;
  document.body.appendChild(popup);

  // Remove popup after 5 seconds
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(100%)';
    setTimeout(() => popup.remove(), 500);
  }, 5000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'showRewardPopup') {
    createPopup(message.timeAdded, message.totalTime);
  }else if (message.type === 'showAlreadySolvedNotification') { 
    createAlreadySolvedNotification();
  }
});

function getProblemContext() {
  const questionTitle = document.querySelector('.text-title-large a.no-underline').innerText;  // Grab the title
  const questionContent = document.querySelector('div[class*="_1l1MA"]').innerText;  // Grab the problem statement text
  return `Title: ${questionTitle}\n\n${questionContent}`;
}