# SweetCode - Gamify LeetCode Practice

<p align="center">
  <a href="https://gssoc.girlscript.tech/">
    <img src="https://github.com/decodingafterlife/SweetCode/blob/main/Images/GSSOC.jpeg" alt="GSSoC Logo" width="120">
  </a>
  <br>
  <a href="https://gssoc.girlscript.tech/">
    <img src="https://img.shields.io/badge/GSSoC-2025-orange.svg?style=for-the-badge" alt="GSSoC'25">
  </a>
</p>

## Overview
SweetCode is a browser extension designed to gamify your LeetCode practice sessions by rewarding you with social media usage time based on the difficulty of the problems you solve. Once installed, it helps you stay productive by limiting access to social media websites until your earned time runs out, resetting daily. As part of its core experience, SweetCode also features an AI Hint Assistant that provides helpful hints for LeetCode problems in exchange for your earned social media time, making your learning both focused and efficient.

**New Feature**: AI Hint Assistant - Get helpful hints for LeetCode problems in exchange for your earned social media time.

## Have a look

### AI Assistant Interface
![AI Assistant Popup](https://github.com/anaypatil101/SweetCode/blob/docs/update-readme-ai-features/Images/ai-assistant-popup.png?raw=true)

### Hint System
![Hint Display](https://github.com/anaypatil101/SweetCode/blob/docs/update-readme-ai-features/Images/hint-display.png?raw=true)

### Social Media Blocking
![Blocked Page](https://github.com/anaypatil101/SweetCode/blob/docs/update-readme-ai-features/Images/blocked-page.png?raw=true)

### Success Rewards
![Success Reward](https://github.com/anaypatil101/SweetCode/blob/docs/update-readme-ai-features/Images/success-reward.png?raw=true)

## Key Features
- **Earn Rewards**: Gain social media time based on LeetCode problem difficulty:
  - Easy: 10 minutes.
  - Medium: 20 minutes.
  - Hard: 40 minutes.
- **AI Hint Assistant**: Get hints for LeetCode problems using AI (costs social media time):
  - Ordinary Hint: 2 minutes.
  - Advanced Hint: 3 minutes.
  - Expert Hint: 5 minutes.
- **Automatic Reset**: Time allowance resets to zero every day.
- **Controlled Access**: Only allows access to social media websites when time is available.
- **Customizable**: Easily modify time rewards or add/remove social media platforms.

## How to Use

### Clone the Repository
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/sweetcode.git
   ```

2. Navigate to the project directory:
   ```bash
   cd sweetcode
   ```

### Load the Extension
1. Open your Chromium-based browser (Chrome, Edge, Brave, etc.) and navigate to Extensions.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the directory where you cloned the repository.
4. The extension will now appear in your extensions list.

### Setup AI Hint Assistant

#### 1. Get Your Groq API Key
To use the AI Hint Assistant feature, you'll need a Groq API key:

1. **Sign up for Groq**: Visit [Groq's website](https://console.groq.com/) and create an account.
2. **Log in**: Use your credentials to access the Groq console.
3. **Navigate to API Keys**: Go to the [API Keys section](https://console.groq.com/keys) in your dashboard.
4. **Create a new key**: Click "Create API Key" and give it a descriptive name.
5. **Copy your key**: Save the generated API key securely - you'll need it for the extension.

#### 2. Configure the Extension
1. Click on the SweetCode extension icon in your browser toolbar.
2. Enter your Groq API key in the "Groq API Key" field.
3. Select your preferred AI model from the dropdown:
   - **Llama3-8b**: Fast and efficient for general hints.
   - **Gemma-9b**: Good balance of speed and quality.
   - **DeepSeek-70b**: Most advanced model for detailed hints.
4. The extension will automatically save your settings.

#### 3. Using the AI Hints
1. Navigate to any LeetCode problem page.
2. Click the SweetCode extension icon to open the AI Assistant.
3. Choose your hint level:
   - **Ordinary Hint**: Basic guidance to get you started.
   - **Advanced Hint**: More detailed approach suggestions.
   - **Expert Hint**: Comprehensive strategy and insights.
4. The AI will analyze the problem and provide a helpful hint.
5. The corresponding time cost will be deducted from your social media allowance.

**Note**: The hint buttons only appear when you're on a LeetCode problem page. The AI analyzes the problem context automatically to provide relevant hints.

> 💡 **Tip**: See the screenshots above for visual examples of the AI Assistant interface and hint system in action.

### Customize Social Media Websites
The extension now uses an improved helper function for better website management. To add or remove social media platforms:

1. Open the `background.js` file in a text editor.
2. Locate the `isSocialMediaMainPage` function (around line 177).
3. The function now uses a more robust pattern-matching system with better URL parsing.

To add a new social media platform, follow this pattern:

```javascript
// Add your pattern definition
const yourPlatformPattern = /^(www\.)?yourplatform\.com\/?.*/i;

// Add to the return statement
return (
  // ... existing patterns ...
  (urlObj.hostname === 'yourplatform.com' || urlObj.hostname === 'www.yourplatform.com') && yourPlatformPattern.test(urlObj.host + urlObj.pathname)
);
```

**Example**: Adding LinkedIn support:
```javascript
const linkedinPattern = /^(www\.)?linkedin\.com\/?.*/i;

return (
  // ... existing patterns ...
  (urlObj.hostname === 'linkedin.com' || urlObj.hostname === 'www.linkedin.com') && linkedinPattern.test(urlObj.host + urlObj.pathname)
);
```

The helper function automatically excludes authentication pages, login forms, and other non-content pages to provide a better user experience.

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
4. Save the file and reload the extension on the extensions page.

## How It Works
1. **Track LeetCode Submissions**: The extension listens for LeetCode problem submissions. When you successfully submit a problem, it checks the difficulty level.
2. **Reward Social Media Time**: Based on the problem difficulty, it adds the corresponding time to your social media allowance.
3. **AI Hint System**: When you request a hint, the extension sends the problem context to Groq's AI API and deducts time from your allowance.
4. **Allow Social Media Access**: If your time runs out, you can only access the main pages of social media platforms (e.g., Instagram, YouTube, Facebook, Twitter/X). Other websites remain accessible as usual.

## Notes
- Your social media time is tracked locally in your browser's storage and resets daily.
- The extension currently supports Instagram, YouTube, Facebook, Twitter/X, WebNovel, and NovelBin by default, with customization options to add others.
- The AI Hint Assistant requires an active internet connection and a valid Groq API key.
- Hint costs are deducted immediately when you request them, regardless of whether you use the hint or not.

## Contributing
Please go through [CONTRIBUTING.md](https://github.com/decodingafterlife/SweetCode/blob/main/CONTRIBUTING.md) and follow the [Code of Conduct](https://github.com/decodingafterlife/SweetCode/blob/main/CODE_OF_CONDUCT.md)



