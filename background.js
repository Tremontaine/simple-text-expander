// Background script for text expander

// Load default snippets from storage.js
// Default snippets are defined here to ensure consistency
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
    shortcut: 'clip',
    text: '%CLIPBOARD%',
    category: 'Variables'
  },
  {
    id: 'example4',
    shortcut: 'email',
    text: 'Please email me at %CURSOR%@example.com for further information.',
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
    // Try to get clipboard text with better error handling
    try {
      navigator.clipboard.readText()
        .then(clipboardText => {
          sendResponse({ clipboardContent: clipboardText || '' });
        })
        .catch(error => {
          console.error('Failed to read clipboard:', error);
          // Return a more user-friendly error
          sendResponse({ 
            error: 'Failed to read clipboard: ' + (error.message || 'Access denied'),
            clipboardContent: ''
          });
        });
    } catch (e) {
      console.error('Exception accessing clipboard API:', e);
      sendResponse({ 
        error: 'Exception accessing clipboard: ' + (e.message || 'Unknown error'),
        clipboardContent: ''
      });
    }
    
    return true; // Keep the message channel open for async response
  }
});