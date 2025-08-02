function getDifficulty() {
  const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
  return difficultyElement ? difficultyElement.textContent : null;
}

function createPopup(timeAdded, totalTime) {
  // Remove any existing popup
  const existingPopup = document.querySelector('.leetcode-reward-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('div');
  popup.className = 'leetcode-reward-popup';
  popup.innerHTML = `
    <h3>🎉 Success!</h3>
    <p>You earned <span class="time-added">${timeAdded} minutes</span> of social media time!</p>
    <p class="total-time">Total time available: ${Math.floor(totalTime / 60)} minutes</p>
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
  }
});

function getProblemContext() {
  const questionTitle = document.querySelector('.text-title-large a.no-underline').innerText;
  const questionContent = document.querySelector('div[class*="_1l1MA"]').innerText;
  return `Title: ${questionTitle}\n\n${questionContent}`;
}