// Text Expander Content Script

let snippets = [];
let listening = false;
let buffer = '';
let TRIGGER_CHAR = ':'; // Default trigger character

// Load snippets and settings from storage
function loadSnippetsAndSettings() {
  chrome.storage.local.get(['snippets', 'settings'], (result) => {
    if (result.snippets) {
      snippets = result.snippets;
    }
    
    // Load trigger character from settings
    if (result.settings && result.settings.triggerChar) {
      TRIGGER_CHAR = result.settings.triggerChar;
    }
  });
}

// Listen for storage changes to update snippets and settings
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.snippets) {
      snippets = changes.snippets.newValue;
    }
    if (changes.settings && changes.settings.newValue && changes.settings.newValue.triggerChar) {
      TRIGGER_CHAR = changes.settings.newValue.triggerChar;
    }
  }
});

// Process special variables in the text
async function processVariables(text) {
  const now = new Date();
  
  // Replace %DATE% with current date
  text = text.replace(/%DATE%/g, now.toLocaleDateString());
  
  // Replace %TIME% with current time
  text = text.replace(/%TIME%/g, now.toLocaleTimeString());
  
  // Replace %DATETIME% with current date and time
  text = text.replace(/%DATETIME%/g, now.toLocaleString());
  
  // Handle clipboard
  if (text.includes('%CLIPBOARD%')) {
    try {
      // Get clipboard content asynchronously
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({action: 'getClipboard'}, response => {
          resolve(response);
        });
      });
      
      if (response && response.clipboardContent) {
        text = text.replace(/%CLIPBOARD%/g, response.clipboardContent);
      }
    } catch (error) {
      console.error('Error getting clipboard content:', error);
    }
  }
  
  return text;
}

// Find and expand snippet
async function expandSnippet(shortcut) {
  for (const snippet of snippets) {
    if (snippet.shortcut === shortcut) {
      const expanded = await processVariables(snippet.text);
      return expanded;
    }
  }
  return null;
}

// Process the %CURSOR% variable and return the text and cursor position
function processCursorVariable(text) {
  const cursorMarker = '%CURSOR%';
  const cursorIndex = text.indexOf(cursorMarker);
  
  if (cursorIndex >= 0) {
    // Remove the cursor marker and return its position
    return {
      text: text.replace(cursorMarker, ''),
      cursorOffset: cursorIndex
    };
  }
  
  return {
    text: text,
    cursorOffset: -1 // No cursor marker found
  };
}

// Check if an element is editable
function isEditableElement(element) {
  return (
    element.nodeName === 'TEXTAREA' || 
    element.nodeName === 'INPUT' ||
    element.isContentEditable ||
    (element.nodeName === 'INPUT' && 
     ['text', 'search', 'url', 'tel', 'email'].includes(element.type))
  );
}

// Handle input in editable elements
async function handleInput(event) {
  // Only process if event has data or is a deletion
  if (!event.data && event.inputType !== 'deleteContentBackward') {
    return;
  }
  
  const element = event.target;
  
  // Check if element is a valid input element
  if (!isEditableElement(element)) {
    return;
  }
  
  // Get the current cursor position
  const cursorPos = element.selectionStart || 0;
  
  // Update our buffer
  if (event.inputType === 'deleteContentBackward') {
    buffer = buffer.slice(0, -1);
  } else if (event.data) {
    buffer += event.data;
  }
  
  // Check if the last character is the trigger
  if (buffer.endsWith(TRIGGER_CHAR)) {
    // Extract the potential shortcut (everything before the trigger)
    const shortcutCandidate = buffer.slice(0, -1).split(' ').pop();
    
    // Try to expand the shortcut
    const expansion = await expandSnippet(shortcutCandidate);
    
    if (expansion) {
      // Prevent default only if we have a matching expansion
      event.preventDefault();
      
      // Calculate the start position to replace
      const startPos = cursorPos - shortcutCandidate.length - 1;
      
      if (element.value !== undefined) {
        // Handle standard input elements
        // Get the text before and after the shortcut
        const beforeText = element.value.substring(0, startPos);
        const afterText = element.value.substring(cursorPos);
        
        // Process the expansion for cursor positioning
        const { text, cursorOffset } = processCursorVariable(expansion);
        
        // Replace the shortcut with the expanded text
        element.value = beforeText + text + afterText;
        
        // Set the cursor position
        if (cursorOffset >= 0) {
          // If %CURSOR% was in the text, position cursor there
          element.selectionStart = startPos + cursorOffset;
          element.selectionEnd = startPos + cursorOffset;
        } else {
          // Otherwise position cursor at the end of the expanded text
          element.selectionStart = startPos + text.length;
          element.selectionEnd = startPos + text.length;
        }
        
        // Dispatch an input event to trigger any listeners on the page
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (element.isContentEditable) {
        // Handle contentEditable elements (not fully implemented)
        // This is a simplified implementation; a complete solution would require more complex DOM manipulation
        console.log('ContentEditable expansion not yet fully supported');
      }
      
      // Clear the buffer
      buffer = '';
    }
  }
  
  // Keep buffer reasonable (max 30 chars)
  if (buffer.length > 30) {
    buffer = buffer.slice(-30);
  }
}

// Setup event listeners
function setupListeners() {
  if (listening) return;
  
  // Listen for all input events on the page
  document.addEventListener('beforeinput', handleInput, true);
  
  listening = true;
}

// Initialize
function init() {
  loadSnippetsAndSettings();
  setupListeners();
}

// Start the extension
init();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reloadSnippets') {
    loadSnippetsAndSettings();
    sendResponse({success: true});
  } else if (message.action === 'settingsUpdated') {
    // Handle settings update
    if (message.settings) {
      if (message.settings.enableExtension !== undefined) {
        // Enable/disable the extension based on settings
        if (message.settings.enableExtension) {
          if (!listening) {
            setupListeners();
          }
        } else {
          // Remove event listeners if extension is disabled
          if (listening) {
            document.removeEventListener('beforeinput', handleInput, true);
            listening = false;
          }
        }
      }
      
      if (message.settings.triggerChar) {
        TRIGGER_CHAR = message.settings.triggerChar;
      }
    }
    sendResponse({success: true});
  }
  return true; // Keep the message channel open for async responses
});