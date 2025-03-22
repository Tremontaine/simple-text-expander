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

// Enhanced detection of editable elements
function isEditableElement(element) {
  if (!element) return false;
  
  // Check for standard editable elements
  if (element.nodeName === 'TEXTAREA') return true;
  
  // Check for all valid input types that accept text
  if (element.nodeName === 'INPUT') {
    const validTypes = ['text', 'search', 'url', 'tel', 'email', 'number', 'password', null, ''];
    return validTypes.includes(element.type);
  }
  
  // Check for contentEditable
  if (element.isContentEditable) return true;
  
  // Check for custom elements that might be editable
  if (element.getAttribute('role') === 'textbox' || 
      element.getAttribute('role') === 'searchbox' ||
      element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  // Check for shadow DOM elements
  try {
    if (element.shadowRoot) {
      const activeElement = element.shadowRoot.activeElement;
      if (activeElement) return isEditableElement(activeElement);
    }
  } catch (e) {
    // Ignore errors from cross-origin shadow roots
  }
  
  return false;
}

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
  // Handle clipboard with improved multi-method approach
  if (text.includes('%CLIPBOARD%')) {
    try {
      const clipboardContent = await getClipboardContent();
      text = text.replace(/%CLIPBOARD%/g, clipboardContent || '');
    } catch (error) {
      console.error('All clipboard access methods failed:', error);
      text = text.replace(/%CLIPBOARD%/g, '[Clipboard access failed]');
    }
  }
  
  return text;
}

// Find a shortcut match in the given text
function findShortcutMatch(text) {
  if (!text || !snippets || snippets.length === 0) return null;
  
  // Sort snippets by shortcut length (longest first) to ensure we match the longest possible shortcut
  const sortedSnippets = [...snippets].sort((a, b) => b.shortcut.length - a.shortcut.length);
  
  for (const snippet of sortedSnippets) {
    const searchStr = snippet.shortcut + TRIGGER_CHAR;
    if (text.endsWith(searchStr)) {
      return snippet.shortcut;
    }
  }
  
  return null;
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

// Improved setup listeners function
function setupListeners() {
  if (listening) return;
  
  // Listen for multiple event types for better compatibility
  document.addEventListener('beforeinput', handleInput, true);
  document.addEventListener('input', handleInputFallback, true);
  document.addEventListener('keydown', handleKeyDown, true);
  
  // Also handle dynamically added content
  setupMutationObserver();
  
  listening = true;
}

// Add a mutation observer to handle dynamically added elements
function setupMutationObserver() {
  const observer = new MutationObserver(function(mutations) {
    // Process new iframes that might be added
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeName === 'IFRAME') {
            try {
              const iframeDoc = node.contentDocument || node.contentWindow?.document;
              if (iframeDoc) {
                iframeDoc.addEventListener('beforeinput', handleInput, true);
                iframeDoc.addEventListener('input', handleInputFallback, true);
                iframeDoc.addEventListener('keydown', handleKeyDown, true);
              }
            } catch (e) {
              // Ignore cross-origin iframe errors
            }
          }
        });
      }
    });
  });
  
  try {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } catch (e) {
    console.error('Failed to set up mutation observer:', e);
  }
}

// Key down handler to track special keys
function handleKeyDown(event) {
  const element = event.target;
  if (!isEditableElement(element)) return;
  
  // Handle special keys
  if (event.key === 'Escape') {
    buffer = ''; // Clear buffer on Escape key
  } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    // Cursor moved, we should recalculate buffer based on new position
    buffer = ''; // For simplicity, just clear it
  }
}

// Fallback input handler for browsers that don't support beforeinput
function handleInputFallback(event) {
  const element = event.target;
  if (!isEditableElement(element)) return;
  
  // Only process if not already handled by beforeinput
  if (event.alreadyProcessed) return;
  
  // Get current value and cursor position
  let currentValue, cursorPosition;
  
  if (element.value !== undefined) {
    // Standard input elements
    currentValue = element.value;
    cursorPosition = element.selectionStart;
  } else if (element.isContentEditable) {
    // ContentEditable elements
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    currentValue = textNode.nodeValue;
    cursorPosition = range.startOffset;
  } else {
    return; // Unsupported element type
  }
  
  // Check for potential shortcut
  if (currentValue && currentValue.slice(0, cursorPosition).endsWith(TRIGGER_CHAR)) {
    const textBeforeCursor = currentValue.slice(0, cursorPosition);
    
    // FIXED: Use the findShortcutMatch function to find any matching shortcut that ends with trigger
    const shortcutCandidate = findShortcutMatch(textBeforeCursor);
    
    if (shortcutCandidate) {
      expandAndReplace(element, shortcutCandidate);
    }
  }
}

// Enhanced handleInput function
async function handleInput(event) {
  // Mark as processed to avoid duplicate handling in fallback
  event.alreadyProcessed = true;
  
  const element = event.target;
  if (!isEditableElement(element)) return;
  
  // Update buffer
  if (event.inputType === 'deleteContentBackward') {
    buffer = buffer.slice(0, -1);
  } else if (event.data) {
    buffer += event.data;
  }
  
  // Keep buffer reasonable (max 30 chars)
  if (buffer.length > 30) {
    buffer = buffer.slice(-30);
  }
  
  // Check if the last character is the trigger
  if (buffer.endsWith(TRIGGER_CHAR)) {
    // FIXED: Instead of splitting by space, use our new function to find any matching shortcut
    const shortcutCandidate = findShortcutMatch(buffer);
    
    if (shortcutCandidate) {
      // Try to expand the shortcut
      await expandAndReplace(element, shortcutCandidate);
    }
  }
}

// Separate function for expansion and replacement logic
async function expandAndReplace(element, shortcutCandidate) {
  if (!shortcutCandidate) return false;
  
  const expansion = await expandSnippet(shortcutCandidate);
  if (!expansion) return false; // No matching snippet
  
  // Process the expansion for cursor positioning
  const { text, cursorOffset } = processCursorVariable(expansion);
  
  try {
    if (element.nodeName === 'TEXTAREA' || element.nodeName === 'INPUT') {
      // Standard input element handling
      replaceInStandardInput(element, shortcutCandidate, text, cursorOffset);
    } else if (element.isContentEditable) {
      // ContentEditable handling 
      replaceInContentEditable(element, shortcutCandidate, text, cursorOffset);
    }
    
    // Clear buffer after expansion
    buffer = '';
    return true;
  } catch (e) {
    console.error('Error during text replacement:', e);
    return false;
  }
}

// Handle replacement in standard inputs
function replaceInStandardInput(element, shortcutCandidate, replacement, cursorOffset) {
  const cursorPos = element.selectionStart || 0;
  const triggerLength = TRIGGER_CHAR.length;
  
  // Get the current text
  const fullText = element.value;
  
  // Find the actual position of the shortcut
  const searchStr = shortcutCandidate + TRIGGER_CHAR;
  const searchStartPos = Math.max(0, cursorPos - searchStr.length - 10); // Look a bit further back to be safe
  const searchEndPos = cursorPos;
  
  const textToSearch = fullText.substring(searchStartPos, searchEndPos);
  const shortcutPos = textToSearch.lastIndexOf(searchStr);
  
  if (shortcutPos === -1) return; // Shortcut not found near cursor
  
  const actualStartPos = searchStartPos + shortcutPos;
  const beforeText = fullText.substring(0, actualStartPos);
  const afterText = fullText.substring(actualStartPos + searchStr.length);
  
  // Create the new value
  const newValue = beforeText + replacement + afterText;
  
  // Set new value
  element.value = newValue;
  
  // Set cursor position
  if (cursorOffset >= 0) {
    // Position at %CURSOR% marker
    element.selectionStart = actualStartPos + cursorOffset;
    element.selectionEnd = actualStartPos + cursorOffset;
  } else {
    // Position at end of expansion
    element.selectionStart = actualStartPos + replacement.length;
    element.selectionEnd = actualStartPos + replacement.length;
  }
  
  // Notify the page about the change
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Improve handling of contentEditable elements
function replaceInContentEditable(element, shortcutCandidate, replacement, cursorOffset) {
  // Get selection and range
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  let textNode = range.startContainer;
  
  // Make sure we're dealing with a text node
  if (textNode.nodeType !== Node.TEXT_NODE) {
    // Try to find a text node near the cursor
    let foundNode = false;
    const treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (treeWalker.nextNode()) {
      const node = treeWalker.currentNode;
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(node);
      if (nodeRange.compareBoundaryPoints(Range.END_TO_END, range) >= 0) {
        foundNode = true;
        textNode = node;
        break;
      }
    }
    if (!foundNode) return;
  }
  
  const text = textNode.nodeValue || '';
  const cursorPos = range.startOffset;
  
  // Find the shortcut in text before cursor
  const searchStr = shortcutCandidate + TRIGGER_CHAR;
  const textBeforeCursor = text.substring(0, cursorPos);
  
  // Find last occurrence of the shortcut before cursor
  const shortcutPos = textBeforeCursor.lastIndexOf(searchStr);
  if (shortcutPos === -1) return;
  
  // Create range to delete the shortcut
  const deleteRange = document.createRange();
  deleteRange.setStart(textNode, shortcutPos);
  deleteRange.setEnd(textNode, shortcutPos + searchStr.length);
  
  // Delete the shortcut
  deleteRange.deleteContents();
  
  // Insert the replacement
  const replacementNode = document.createTextNode(replacement);
  deleteRange.insertNode(replacementNode);
  
  // Set cursor position
  const newRange = document.createRange();
  if (cursorOffset >= 0) {
    // Position at %CURSOR% marker
    newRange.setStart(replacementNode, cursorOffset);
  } else {
    // Position at end of insertion
    newRange.setStart(replacementNode, replacement.length);
  }
  newRange.collapse(true);
  
  // Apply new selection
  selection.removeAllRanges();
  selection.addRange(newRange);
  
  // Fire input event for consistency
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// Initialize
function init() {
  loadSnippetsAndSettings();
  setupListeners();
  
  // Also attempt to handle iframes that are already on the page
  try {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.addEventListener('beforeinput', handleInput, true);
          iframeDoc.addEventListener('input', handleInputFallback, true);
          iframeDoc.addEventListener('keydown', handleKeyDown, true);
        }
      } catch (e) {
        // Ignore cross-origin iframe errors
      }
    });
  } catch (e) {
    console.error('Error setting up iframe listeners:', e);
  }
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
            document.removeEventListener('input', handleInputFallback, true);
            document.removeEventListener('keydown', handleKeyDown, true);
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