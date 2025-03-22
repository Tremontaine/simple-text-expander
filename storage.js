// Storage utility for text expander snippets

// Default snippets to use as examples
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

// Get all snippets
function getSnippets() {
  return new Promise((resolve) => {
    chrome.storage.local.get('snippets', (result) => {
      if (result.snippets) {
        resolve(result.snippets);
      } else {
        // Initialize with default snippets
        chrome.storage.local.set({ snippets: DEFAULT_SNIPPETS }, () => {
          resolve(DEFAULT_SNIPPETS);
        });
      }
    });
  });
}

// Get settings
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      if (result.settings) {
        resolve(result.settings);
      } else {
        // Initialize with default settings
        chrome.storage.local.set({ settings: DEFAULT_SETTINGS }, () => {
          resolve(DEFAULT_SETTINGS);
        });
      }
    });
  });
}

// Save a new snippet
function saveSnippet(snippet) {
  return new Promise((resolve) => {
    getSnippets().then((snippets) => {
      // Generate a unique ID if not provided
      if (!snippet.id) {
        snippet.id = 'snippet_' + Date.now();
      }
      
      // Check if this is an update to an existing snippet
      const index = snippets.findIndex(s => s.id === snippet.id);
      
      if (index >= 0) {
        // Update existing snippet
        snippets[index] = snippet;
      } else {
        // Add new snippet
        snippets.push(snippet);
      }
      
      chrome.storage.local.set({ snippets }, () => {
        resolve(snippet);
      });
    });
  });
}

// Delete a snippet
function deleteSnippet(snippetId) {
  return new Promise((resolve) => {
    getSnippets().then((snippets) => {
      const filteredSnippets = snippets.filter(s => s.id !== snippetId);
      chrome.storage.local.set({ snippets: filteredSnippets }, () => {
        resolve(true);
      });
    });
  });
}

// Export all snippets as JSON
function exportSnippets() {
  return getSnippets();
}

// Import snippets from JSON
function importSnippets(snippets) {
  if (!Array.isArray(snippets)) {
    return Promise.reject(new Error('Invalid format'));
  }
  
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ snippets }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(snippets);
      }
    });
  });
}

// Get all categories
function getCategories() {
  return getSnippets().then(snippets => {
    const categories = new Set();
    snippets.forEach(snippet => {
      if (snippet.category) {
        categories.add(snippet.category);
      }
    });
    return Array.from(categories);
  });
}

// Export the functions
const textExpander = {
  getSnippets,
  getSettings,
  saveSnippet,
  deleteSnippet,
  exportSnippets,
  importSnippets,
  getCategories,
  DEFAULT_SNIPPETS,
  DEFAULT_SETTINGS
};