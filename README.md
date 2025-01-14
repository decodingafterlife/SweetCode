# SweetCode - Gamify LeetCode Practice

## Overview
SweetCode is a Chrome extension designed to gamify your LeetCode practice sessions. It rewards you with social media usage time based on the difficulty of the LeetCode problems you solve. Once installed, SweetCode helps you stay productive by allowing access only to social media websites (currently Instagram, YouTube, Facebook, Twitter/X) when your allotted time runs out. Your time allowance resets daily.

## Key Features
- **Earn Rewards**: Gain social media time based on LeetCode problem difficulty:
  - Easy: 10 minutes
  - Medium: 20 minutes
  - Hard: 40 minutes
- **Automatic Reset**: Time allowance resets every day.
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
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the directory where you cloned the repository.
4. The extension will now appear in your extensions list.

### Customize Social Media Websites
1. Open the `background.js` file in a text editor.
2. Locate the `isSocialMediaMainPage` function and edit the patterns to include or remove specific social media platforms. The default configuration supports:
   - YouTube
   - Instagram
   - Facebook
   - Twitter/X

   Example:
   ```javascript
   const linkedinPattern = /^(www\.)?linkedin\.com\/?.*/i; // Adding LinkedIn as a social media platform
   ```

3. Add the new pattern to the return statement in the `isSocialMediaMainPage` function:
   ```javascript
   return (
     ... // Existing patterns
     (urlObj.hostname === 'linkedin.com' || urlObj.hostname === 'www.linkedin.com') && linkedinPattern.test(urlObj.host + urlObj.pathname)
   );
   ```

4. Save the file and reload the extension on the `chrome://extensions/` page.

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
1. **Track LeetCode Submissions**: The extension listens for LeetCode problem submissions. When you successfully submit a problem, it checks the difficulty level.
2. **Reward Social Media Time**: Based on the problem difficulty, it adds the corresponding time to your social media allowance.
3. **Allow Social Media Access**: If your time runs out, you can only access the main pages of social media platforms (e.g., Instagram, YouTube, Facebook, Twitter/X). Other websites remain accessible as usual.

## Notes
- Your social media time is tracked locally in Chrome's storage and resets daily.
- The extension currently supports Instagram, YouTube, Facebook, Twitter/X by default, with customization options to add others like LinkedIn.

## Contributing
Feel free to fork this repository and submit pull requests to enhance the functionality of SweetCode. Suggestions for additional features are welcome!

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

Enjoy productive coding sessions and guilt-free social media breaks with SweetCode!

