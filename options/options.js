// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  loadSettings();
  
  // Setup event listeners
  setupEventListeners();
});

// Load settings from storage
function loadSettings() {
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || getDefaultSettings();
    
    // Update UI with saved settings
    document.getElementById('enableExtension').checked = settings.enableExtension !== false;
    document.getElementById('triggerChar').value = settings.triggerChar || ':';
  });
}

// Get default settings
function getDefaultSettings() {
  return {
    enableExtension: true,
    triggerChar: ':'
  };
}

// Safe message sending with error handling
function safelyNotifyTabs(message) {
  chrome.tabs.query({active: true}, (tabs) => {
    // Only try to send to active tabs
    if (tabs && tabs.length > 0) {
      tabs.forEach((tab) => {
        try {
          // Send message with error handling
          chrome.tabs.sendMessage(tab.id, message, (response) => {
            // Handle normal response
            if (chrome.runtime.lastError) {
              // Silent error - this is expected for tabs that don't have our content script
              console.log(`Message not sent to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
            }
          });
        } catch (error) {
          // This should rarely happen because we're using the callback for error handling
          console.error('Error sending message to tab', error);
        }
      });
    }
  });
}

// Save settings
function saveSettings() {
  let triggerChar = document.getElementById('triggerChar').value;
  
  // Make sure there's a trigger character
  if (!triggerChar) {
    triggerChar = ':';
    document.getElementById('triggerChar').value = triggerChar;
  }
  
  const settings = {
    enableExtension: document.getElementById('enableExtension').checked,
    triggerChar: triggerChar
  };
  
  chrome.storage.local.set({ settings }, () => {
    // Show save confirmation
    showSnackbar('Settings saved successfully');
    
    // Notify content scripts about the settings change
    safelyNotifyTabs({ action: 'settingsUpdated', settings });
  });
}

// Show a snackbar notification
function showSnackbar(message) {
  const snackbar = document.getElementById('snackbar');
  snackbar.textContent = message;
  snackbar.classList.add('show');
  
  // Hide the snackbar after 3 seconds
  setTimeout(() => {
    snackbar.classList.remove('show');
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Save settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  
  // Limit trigger character to one character
  document.getElementById('triggerChar').addEventListener('input', function() {
    if (this.value.length > 1) {
      this.value = this.value.charAt(0);
    }
  });
}