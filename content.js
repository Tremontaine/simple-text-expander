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

// Get clipboard content using various methods
async function getClipboardContent() {
  // Method 1: Try the Clipboard API directly (most modern browsers)
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
  } catch (err) {
    console.log('Clipboard API failed:', err);
  }

  // Method 2: Try execCommand (older browsers)
  try {
    const textarea = document.createElement('textarea');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    document.body.appendChild(textarea);
    textarea.focus();
    
    const successful = document.execCommand('paste');
    if (successful) {
      const text = textarea.value;
      document.body.removeChild(textarea);
      return text;
    }
    document.body.removeChild(textarea);
  } catch (err) {
    console.log('execCommand paste failed:', err);
  }

  // Method 3: Try the background script (might work in extensions)
  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({action: 'getClipboard'}, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError });
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.clipboardContent !== undefined) {
      return response.clipboardContent;
    }
  } catch (err) {
    console.log('Background script clipboard access failed:', err);
  }

  // Method 4: Try using a contentEditable div (alternative for some browsers)
  try {
    const div = document.createElement('div');
    div.contentEditable = true;
    div.style.position = 'fixed';
    div.style.left = '-999px';
    document.body.appendChild(div);
    div.focus();
    
    document.execCommand('paste');
    const text = div.innerText;
    document.body.removeChild(div);
    
    if (text) {
      return text;
    }
  } catch (err) {
    console.log('contentEditable paste failed:', err);
  }
  
  // If all methods fail, return a placeholder
  return "[Clipboard access requires permission. Try using %CLIPBOARD% in a page where clipboard access is allowed.]";
}

// Process special variables in the text
async function processVariables(text) {
  // Handle date and time variables with 24-hour time format
  const now = new Date();
  
  // Format functions for date and time to ensure consistency
  const formatDate = (date) => {
    const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };
  
  const formatTime = (date) => {
    // 24-hour time format
    const options = { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
    return date.toLocaleTimeString(undefined, options);
  };
  
  const formatDateTime = (date) => {
    // 24-hour time format
    const options = { 
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false 
    };
    return date.toLocaleString(undefined, options);
  };
  
  // Replace date and time variables
  text = text.replace(/%DATE%/g, formatDate(now));
  text = text.replace(/%TIME%/g, formatTime(now));
  text = text.replace(/%DATETIME%/g, formatDateTime(now));
  
  // Handle clipboard with improved multi-method approach
  if (text.includes('%CLIPBOARD%')) {
    try {
      const clipboardContent = await getClipboardContent();
      text = text.replace(/%CLIPBOARD%/g, clipboardContent);
    } catch (error) {
      console.error('All clipboard access methods failed:', error);
      text = text.replace(/%CLIPBOARD%/g, '[Clipboard access failed]');
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
      
      // Calculate the start position to replace - FIXED CALCULATION
      const startPos = cursorPos - shortcutCandidate.length - TRIGGER_CHAR.length;
      const exactStartPos = startPos + 1; // Add 1 to correct the off-by-one error
      
      if (element.value !== undefined) {
        // Handle standard input elements
        // Get the text before and after the shortcut
        const beforeText = element.value.substring(0, exactStartPos);
        const afterText = element.value.substring(cursorPos);
        
        // Process the expansion for cursor positioning
        const { text, cursorOffset } = processCursorVariable(expansion);
        
        // Create the new value and store its length before applying
        const newValue = beforeText + text + afterText;
        const newValueLength = newValue.length;
        
        // Replace the shortcut with the expanded text
        element.value = newValue;
        
        // Set the cursor position more reliably
        if (cursorOffset >= 0) {
          // If %CURSOR% was in the text, position cursor there
          element.selectionStart = exactStartPos + cursorOffset;
          element.selectionEnd = exactStartPos + cursorOffset;
        } else {
          // Position cursor at the end of the expanded text
          // Calculate based on the complete new string length and afterText length
          element.selectionStart = newValueLength - afterText.length;
          element.selectionEnd = newValueLength - afterText.length;
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