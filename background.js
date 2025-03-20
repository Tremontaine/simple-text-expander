// Background script for text expander

// Load default snippets from storage.js
// Default snippets are defined in storage.js, so we reuse them here
const DEFAULT_SNIPPETS = [
  {
    id: 'example1',
    shortcut: 'sig',
    text: 'Best regards,\nYour Name',
    category: 'Personal'
  },
  {
    id: 'example2',
    shortcut: 'addr',
    text: '123 Main St, Anytown, AT 12345',
    category: 'Personal'
  },
  {
    id: 'example3',
    shortcut: 'date',
    text: '%DATE%',
    category: 'Variables'
  }
];

// Default settings
const DEFAULT_SETTINGS = {
  enableExtension: true,
  triggerChar: ':'
};

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time installation
    chrome.storage.local.get(['snippets', 'settings'], (result) => {
      // Initialize snippets if none exist
      if (!result.snippets) {
        chrome.storage.local.set({ snippets: DEFAULT_SNIPPETS });
      }
      
      // Initialize settings if none exist
      if (!result.settings) {
        chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      }
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getClipboard') {
    // Get clipboard text
    navigator.clipboard.readText()
      .then(clipboardText => {
        sendResponse({ clipboardContent: clipboardText });
      })
      .catch(error => {
        console.error('Failed to read clipboard:', error);
        sendResponse({ error: 'Failed to read clipboard' });
      });
    
    return true; // Keep the message channel open for async response
  }
});