# SweetCode - Gamify LeetCode Practice

## Overview
SweetCode is a Chromium extension designed to gamify your LeetCode practice sessions. It rewards you with social media usage time based on the difficulty of the LeetCode problems you solve. Once installed, SweetCode helps you stay productive by blocking social media websites (currently Instagram and YouTube) when your allotted time runs out. Your time allowance resets daily.

## Key Features
- **Earn Rewards**: Gain social media time based on LeetCode problem difficulty:
  - Easy: 10 minutes
  - Medium: 20 minutes
  - Hard: 40 minutes
- **Automatic Reset**: Time allowance resets every day.
- **Website Blocking**: Blocks access to specified social media websites when time runs out.
- **Customizable**: Easily add more websites to block or modify time rewards.

## How to Use

### Clone the Repository
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/decodingafterlife/SweetCode.git
   ```

2. Navigate to the project directory:
   ```bash
   cd SweetCode
   ```

### Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the directory where you cloned the repository.
4. The extension will now appear in your extensions list.

### Customize/Add Blocked Websites
1. Open the `manifest.json` file in a text editor.
2. Under `host_permissions`, add the URLs of additional websites you want to block:
   ```json
   "https://www.facebook.com/*",
   "https://www.twitter.com/*"
   ```
3. Open `background.js` and edit the following functions to include the domains of the new websites:

   #### Block social media if time is up
   ```javascript
   chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
     checkAndResetDaily();
     
     if (timeAllowed <= 0 && 
         (details.url.includes('youtube.com') || 
          details.url.includes('instagram.com') || 
          details.url.includes('facebook.com') || 
          details.url.includes('twitter.com'))) {
       chrome.tabs.update(details.tabId, {
         url: chrome.runtime.getURL('blocked.html')
       });
     }
   });
   ```

   #### Decrease time when on social media
   ```javascript
   chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
     if (changeInfo.status === 'complete' && 
         (tab.url?.includes('youtube.com') || 
          tab.url?.includes('instagram.com') || 
          tab.url?.includes('facebook.com') || 
          tab.url?.includes('twitter.com'))) {
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
   ```

4. Save both files and reload the extension on the `chrome://extensions/` page.

### Adjust Reward Times
1. Open the `background.js` file in a text editor.
2. Locate the `timeRewards` object:
   ```javascript
   const timeRewards = {
     'Easy': 10,
     'Medium': 20,
     'Hard': 40
   };
   ```
3. Modify the values to set your desired reward times (in minutes). For example:
   ```javascript
   const timeRewards = {
     'Easy': 5,
     'Medium': 15,
     'Hard': 30
   };
   ```
4. Save the file and reload the extension on the `chrome://extensions/` page.

## How It Works
1. **Track LeetCode Submissions**: The extension listens for LeetCode problem submissions using the LeetCode API. When you successfully submit a problem, it checks the difficulty level.
2. **Reward Social Media Time**: Based on the problem difficulty, it adds the corresponding time to your social media allowance.
3. **Block Social Media**: If your time runs out and you try to access a blocked site (e.g., Instagram or YouTube), you will be redirected to a custom "Time's Up!" page.

## Notes
- This extension can be used in all Chromium based browsers.
- Your social media time is tracked locally in Chrome's storage and resets daily.
- The extension currently supports Instagram and YouTube blocking by default.

## Contributing
Feel free to fork this repository and submit pull requests to enhance the functionality of SweetCode. Suggestions for additional features are welcome!

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

Enjoy productive coding sessions and guilt-free social media breaks with SweetCode!

