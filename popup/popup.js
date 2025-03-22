// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load snippets
  loadSnippets();
  
  // Setup event listeners
  setupEventListeners();
});

// Load snippets from storage
function loadSnippets() {
  chrome.storage.local.get('snippets', (result) => {
    const snippets = result.snippets || [];
    renderSnippets(snippets);
    updateCategories(snippets);
  });
}

// Render snippets in the list
function renderSnippets(snippets, categoryFilter = 'all') {
  const snippetsList = document.getElementById('snippetsList');
  const emptyState = document.getElementById('emptyState');
  
  // Clear current list
  snippetsList.innerHTML = '';
  
  // Filter snippets by category if needed
  const filteredSnippets = categoryFilter === 'all' 
    ? snippets 
    : snippets.filter(snippet => snippet.category === categoryFilter);
  
  // Show empty state if no snippets
  if (filteredSnippets.length === 0) {
    snippetsList.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    snippetsList.style.display = 'block';
    emptyState.style.display = 'none';
    
    // Add each snippet to the list
    filteredSnippets.forEach(snippet => {
      const listItem = document.createElement('li');
      listItem.className = 'snippet-item';
      listItem.dataset.id = snippet.id;
      
      const textContainer = document.createElement('div');
      textContainer.className = 'snippet-content';
      
      const primaryText = document.createElement('div');
      primaryText.className = 'snippet-primary';
      
      const shortcutSpan = document.createElement('span');
      shortcutSpan.className = 'snippet-shortcut';
      shortcutSpan.textContent = snippet.shortcut; // Just show the shortcut without the trigger
      
      const categorySpan = document.createElement('span');
      categorySpan.className = 'snippet-category';
      categorySpan.textContent = snippet.category ? ` (${snippet.category})` : '';
      
      primaryText.appendChild(shortcutSpan);
      primaryText.appendChild(categorySpan);
      
      const secondaryText = document.createElement('div');
      secondaryText.className = 'snippet-text';
      secondaryText.textContent = snippet.text.replace(/\n/g, ' ');
      
      textContainer.appendChild(primaryText);
      textContainer.appendChild(secondaryText);
      
      const actions = document.createElement('div');
      actions.className = 'snippet-actions';
      
      const editButton = document.createElement('button');
      editButton.className = 'icon-button';
      editButton.innerHTML = '<span class="icon-edit"></span>';
      editButton.title = 'Edit Snippet';
      editButton.setAttribute('aria-label', 'Edit Snippet');
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditDialog(snippet);
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'icon-button';
      deleteButton.innerHTML = '<span class="icon-delete"></span>';
      deleteButton.title = 'Delete Snippet';
      deleteButton.setAttribute('aria-label', 'Delete Snippet');
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteDialog(snippet.id);
      });
      
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      
      listItem.appendChild(textContainer);
      listItem.appendChild(actions);
      
      // Make whole list item clickable to edit
      listItem.addEventListener('click', () => openEditDialog(snippet));
      
      snippetsList.appendChild(listItem);
    });
  }
}

// Update categories list
function updateCategories(snippets) {
  const categorySelect = document.getElementById('categorySelect');
  const categories = new Set();
  
  // Save the currently selected category
  const currentCategory = categorySelect.value;
  
  // Collect all categories
  snippets.forEach(snippet => {
    if (snippet.category) {
      categories.add(snippet.category);
    }
  });
  
  // Clear current list (except 'All')
  while (categorySelect.options.length > 1) {
    categorySelect.remove(1);
  }
  
  // Add each category
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  
  // Try to restore the previously selected category
  if (currentCategory && Array.from(categorySelect.options).some(option => option.value === currentCategory)) {
    categorySelect.value = currentCategory;
  } else {
    categorySelect.value = 'all';
  }
}

// Open the dialog to add a new snippet
function openAddDialog() {
  const dialog = document.getElementById('snippetDialog');
  const form = document.getElementById('snippetForm');
  
  // Reset the form
  form.reset();
  document.getElementById('snippetId').value = '';
  
  // Update dialog title
  dialog.querySelector('.dialog-title').textContent = 'Add New Snippet';
  
  // Update shortcut preview
  updateShortcutPreview();
  
  // Show the dialog
  dialog.style.display = 'flex';
}

// Open the dialog to edit an existing snippet
function openEditDialog(snippet) {
  const dialog = document.getElementById('snippetDialog');
  
  // Fill the form with snippet data
  document.getElementById('shortcut').value = snippet.shortcut;
  document.getElementById('snippetText').value = snippet.text;
  document.getElementById('category').value = snippet.category || '';
  document.getElementById('snippetId').value = snippet.id;
  
  // Update dialog title
  dialog.querySelector('.dialog-title').textContent = 'Edit Snippet';
  
  // Update shortcut preview
  updateShortcutPreview();
  
  // Show the dialog
  dialog.style.display = 'flex';
}

// Open the dialog to confirm snippet deletion
function openDeleteDialog(snippetId) {
  const dialog = document.getElementById('deleteDialog');
  
  // Store the snippet ID
  document.getElementById('confirmDeleteBtn').dataset.id = snippetId;
  
  // Show the dialog
  dialog.style.display = 'flex';
}

// Close any open dialog
function closeDialog(dialogId) {
  const dialog = document.getElementById(dialogId);
  dialog.style.display = 'none';
}

// Save a snippet
function saveSnippet() {
  const shortcut = document.getElementById('shortcut').value.trim();
  const text = document.getElementById('snippetText').value;
  const category = document.getElementById('category').value.trim();
  const id = document.getElementById('snippetId').value || `snippet_${Date.now()}`;
  
  // Validate shortcut
  if (!shortcut) {
    alert('Shortcut is required');
    return;
  }
  
  // Validate text
  if (!text) {
    alert('Expanded text is required');
    return;
  }
  
  const snippet = {
    id,
    shortcut,
    text,
    category: category || null
  };
  
  chrome.storage.local.get('snippets', (result) => {
    const snippets = result.snippets || [];
    
    // Check if this is an update
    const index = snippets.findIndex(s => s.id === id);
    
    // Check for duplicate shortcuts
    const duplicateIndex = snippets.findIndex(s => 
      s.shortcut === shortcut && s.id !== id
    );
    
    if (duplicateIndex >= 0) {
      // Alert about duplicate shortcut
      alert(`Shortcut "${shortcut}" is already in use by another snippet. Please choose a different shortcut.`);
      return;
    }
    
    if (index >= 0) {
      // Update existing snippet
      snippets[index] = snippet;
    } else {
      // Add new snippet
      snippets.push(snippet);
    }
    
    // Save to storage
    chrome.storage.local.set({ snippets }, () => {
      // Reload the list
      renderSnippets(snippets);
      updateCategories(snippets);
      
      // Close the dialog
      closeDialog('snippetDialog');
    });
  });
}

// Delete a snippet
function deleteSnippet(snippetId) {
  chrome.storage.local.get('snippets', (result) => {
    const snippets = result.snippets || [];
    
    // Filter out the snippet to delete
    const updatedSnippets = snippets.filter(s => s.id !== snippetId);
    
    // Save to storage
    chrome.storage.local.set({ snippets: updatedSnippets }, () => {
      // Reload the list
      renderSnippets(updatedSnippets);
      updateCategories(updatedSnippets);
      
      // Close the dialog
      closeDialog('deleteDialog');
    });
  });
}

// Load and use trigger character from settings
function getTriggerChar(callback) {
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || {};
    const triggerChar = settings.triggerChar || ':';
    callback(triggerChar);
  });
}

// Update shortcut preview
function updateShortcutPreview() {
  const shortcut = document.getElementById('shortcut').value.trim();
  
  getTriggerChar(triggerChar => {
    document.getElementById('shortcutPreview').textContent = shortcut ? `${shortcut}${triggerChar}` : `shortcut${triggerChar}`;
  });
}

// Open settings dialog
function openSettingsDialog() {
  const dialog = document.getElementById('settingsDialog');
  
  // Load current settings
  chrome.storage.local.get('settings', (result) => {
    const settings = result.settings || { enableExtension: true, triggerChar: ':' };
    
    document.getElementById('enableExtension').checked = settings.enableExtension !== false;
    document.getElementById('triggerChar').value = settings.triggerChar || ':';
  });
  
  // Show the dialog
  dialog.style.display = 'flex';
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
    // Notify content scripts about the settings change
    chrome.tabs.query({active: true}, (tabs) => {
      if (tabs && tabs.length > 0) {
        tabs.forEach((tab) => {
          try {
            chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', settings });
          } catch (e) {
            console.error('Error sending message to tab', e);
          }
        });
      }
    });
    
    // Close the dialog
    closeDialog('settingsDialog');
  });
}

// Insert a variable at the cursor position
function insertVariable(variable) {
  const textarea = document.getElementById('snippetText');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  
  textarea.value = text.substring(0, start) + variable + text.substring(end);
  
  // Set cursor position after the inserted variable
  textarea.selectionStart = start + variable.length;
  textarea.selectionEnd = start + variable.length;
  
  // Focus the textarea
  textarea.focus();
}

// Setup event listeners
function setupEventListeners() {
  // Add new snippet
  document.getElementById('addSnippetBtn').addEventListener('click', openAddDialog);
  document.getElementById('addFirstSnippetBtn').addEventListener('click', openAddDialog);
  
  // Save snippet
  document.getElementById('saveSnippetBtn').addEventListener('click', saveSnippet);
  
  // Cancel buttons for dialogs
  document.getElementById('cancelBtn').addEventListener('click', () => closeDialog('snippetDialog'));
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => closeDialog('deleteDialog'));
  document.getElementById('cancelSettingsBtn').addEventListener('click', () => closeDialog('settingsDialog'));
  
  // Delete snippet
  document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
    const snippetId = this.dataset.id;
    if (snippetId) {
      deleteSnippet(snippetId);
    }
  });
  
  // Open config backup/restore dialog
  document.getElementById('configBtn').addEventListener('click', function() {
    showConfigBackupDialog();
  });
  
  // Open settings dialog
  document.getElementById('settingsBtn').addEventListener('click', function() {
    openSettingsDialog();
  });
  
  // Save settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  
  // Update shortcut preview on input
  document.getElementById('shortcut').addEventListener('input', updateShortcutPreview);
  
  // Insert variables
  document.querySelectorAll('.variable-btn').forEach(button => {
    button.addEventListener('click', function() {
      insertVariable(this.dataset.variable);
    });
  });
  
  // Filter by category
  document.getElementById('categorySelect').addEventListener('change', function() {
    const category = this.value;
    
    chrome.storage.local.get('snippets', (result) => {
      const snippets = result.snippets || [];
      renderSnippets(snippets, category);
    });
  });
  
  // Close dialogs when clicking outside of them
  document.querySelectorAll('.dialog-container').forEach(dialog => {
    dialog.addEventListener('click', function(event) {
      if (event.target === this) {
        this.style.display = 'none';
      }
    });
  });
}