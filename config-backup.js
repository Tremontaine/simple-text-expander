// Create and display the backup/restore dialog
function showConfigBackupDialog() {
  // Get current snippets
  chrome.storage.local.get('snippets', (result) => {
    const snippets = result.snippets || [];
    const jsonString = JSON.stringify(snippets, null, 2);
    
    // Create the modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'dialog-container';
    modalContainer.style.display = 'flex';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'dialog';
    
    // Create tabs
    const tabContainer = document.createElement('div');
    tabContainer.className = 'export-import-tabs';
    
    const exportTab = document.createElement('div');
    exportTab.className = 'tab active';
    exportTab.textContent = 'Export Snippets';
    
    const importTab = document.createElement('div');
    importTab.className = 'tab';
    importTab.textContent = 'Import Snippets';
    
    // Create content containers for tabs
    const exportContainer = document.createElement('div');
    exportContainer.className = 'dialog-content';
    exportContainer.id = 'export-content';
    
    const importContainer = document.createElement('div');
    importContainer.className = 'dialog-content';
    importContainer.id = 'import-content';
    importContainer.style.display = 'none';
    
    // EXPORT TAB CONTENT
    
    // Add header for export
    const exportHeader = document.createElement('div');
    exportHeader.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #6200ee; font-size: 18px;">Export Snippets</h3>
      <p style="margin: 0 0 16px 0; color: rgba(0, 0, 0, 0.6);">This is your snippets data in JSON format. Copy it and save to a file for backup:</p>
    `;
    
    // Add export text area
    const exportTextArea = document.createElement('pre');
    exportTextArea.className = 'json-content';
    exportTextArea.textContent = jsonString;
    exportTextArea.style.whiteSpace = 'pre'; // Preserve whitespace
    exportTextArea.style.fontFamily = 'monospace';
    exportTextArea.style.fontSize = '12px';
    exportTextArea.style.padding = '12px';
    exportTextArea.style.backgroundColor = '#f7f7f7';
    exportTextArea.style.border = '1px solid var(--border-color)';
    exportTextArea.style.borderRadius = '4px';
    exportTextArea.style.overflow = 'auto';
    exportTextArea.style.height = '200px';
    
    // Export buttons
    const exportButtonContainer = document.createElement('div');
    exportButtonContainer.style.display = 'flex';
    exportButtonContainer.style.justifyContent = 'space-between';
    exportButtonContainer.style.marginBottom = '16px';
    
    const selectAllExportButton = document.createElement('button');
    selectAllExportButton.textContent = 'Select All';
    selectAllExportButton.className = 'button button-secondary';
    
    const copyExportButton = document.createElement('button');
    copyExportButton.textContent = 'Copy to Clipboard';
    copyExportButton.className = 'button button-primary';
    
    // Status message for export
    const exportStatusMessage = document.createElement('div');
    exportStatusMessage.style.marginTop = '10px';
    exportStatusMessage.style.textAlign = 'center';
    exportStatusMessage.style.color = '#4CAF50';
    exportStatusMessage.style.fontWeight = '500';
    exportStatusMessage.style.opacity = '0';
    exportStatusMessage.style.transition = 'opacity 0.3s';
    
    // IMPORT TAB CONTENT
    
    // Add header for import
    const importHeader = document.createElement('div');
    importHeader.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #6200ee; font-size: 18px;">Import Snippets</h3>
      <p style="margin: 0 0 16px 0; color: rgba(0, 0, 0, 0.6);">Paste your snippets JSON data below to import:</p>
    `;
    
    // Add import text area with better formatting
    const importTextArea = document.createElement('textarea');
    importTextArea.className = 'form-textarea json-textarea';
    // Create a nicely formatted placeholder example
    const placeholderExample = JSON.stringify([
      {
        "id": "example1",
        "shortcut": "sig",
        "text": "Best regards,\nYour Name",
        "category": "Personal"
      }
    ], null, 2);
    importTextArea.placeholder = placeholderExample;
    importTextArea.style.fontFamily = 'monospace';
    importTextArea.style.whiteSpace = 'pre';
    importTextArea.style.fontSize = '12px';
    importTextArea.style.height = '200px';
    importTextArea.style.padding = '12px';
    
    // Import note
    const importNote = document.createElement('div');
    importNote.innerHTML = `
      <p style="margin-bottom: 16px; color: rgba(0, 0, 0, 0.6); font-size: 13px;">
        <strong>Note:</strong> Importing will replace all your current snippets. Make sure to back up 
        your existing snippets using the Export tab before importing new ones.
      </p>
    `;
    
    // Import button
    const importButtonContainer = document.createElement('div');
    importButtonContainer.style.display = 'flex';
    importButtonContainer.style.justifyContent = 'flex-end';
    importButtonContainer.style.marginBottom = '16px';
    
    const importButton = document.createElement('button');
    importButton.textContent = 'Import Snippets';
    importButton.className = 'button button-primary';
    
    // Status message for import
    const importStatusMessage = document.createElement('div');
    importStatusMessage.style.marginTop = '10px';
    importStatusMessage.style.textAlign = 'center';
    importStatusMessage.style.fontWeight = '500';
    importStatusMessage.style.opacity = '0';
    importStatusMessage.style.transition = 'opacity 0.3s';
    
    // Footer buttons
    const footerContainer = document.createElement('div');
    footerContainer.className = 'dialog-actions';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'button button-secondary';
    
    // Add title
    const titleElement = document.createElement('div');
    titleElement.className = 'dialog-title';
    titleElement.textContent = 'Backup & Restore';
    
    // EVENT LISTENERS
    
    // Tab switching
    exportTab.addEventListener('click', () => {
      exportTab.classList.add('active');
      importTab.classList.remove('active');
      exportContainer.style.display = 'block';
      importContainer.style.display = 'none';
    });
    
    importTab.addEventListener('click', () => {
      importTab.classList.add('active');
      exportTab.classList.remove('active');
      importContainer.style.display = 'block';
      exportContainer.style.display = 'none';
    });
    
    // Export buttons
    selectAllExportButton.addEventListener('click', () => {
      // Create a range to select the content
      const range = document.createRange();
      range.selectNodeContents(exportTextArea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    
    copyExportButton.addEventListener('click', () => {
      // Select the content
      const range = document.createRange();
      range.selectNodeContents(exportTextArea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Copy to clipboard
      document.execCommand('copy');
      
      // Show confirmation
      exportStatusMessage.textContent = 'Copied to clipboard!';
      exportStatusMessage.style.opacity = '1';
      setTimeout(() => {
        exportStatusMessage.style.opacity = '0';
      }, 2000);
    });
    
    // Import button
    importButton.addEventListener('click', () => {
      try {
        const importedData = JSON.parse(importTextArea.value);
        
        // Validate the imported data
        if (!Array.isArray(importedData)) {
          throw new Error('Invalid format: Data must be an array');
        }
        
        // Check if each item in the array has the required properties
        const hasInvalidSnippets = importedData.some(snippet => {
          return (
            typeof snippet !== 'object' ||
            snippet === null ||
            typeof snippet.id !== 'string' ||
            typeof snippet.shortcut !== 'string' ||
            typeof snippet.text !== 'string'
          );
        });
        
        if (hasInvalidSnippets) {
          throw new Error('Invalid format: Some snippets are missing required properties (id, shortcut, text)');
        }
        
        // Additional validation: Ensure no empty shortcuts
        const hasEmptyShortcuts = importedData.some(snippet => snippet.shortcut.trim() === '');
        if (hasEmptyShortcuts) {
          throw new Error('Invalid format: Shortcuts cannot be empty');
        }
        
        // Store the imported snippets
        chrome.storage.local.set({ snippets: importedData }, () => {
          importStatusMessage.textContent = 'Snippets imported successfully!';
          importStatusMessage.style.color = '#4CAF50';
          importStatusMessage.style.opacity = '1';
          setTimeout(() => {
            importStatusMessage.style.opacity = '0';
            // Reload the page or update the UI as needed
            if (typeof loadSnippets === 'function') {
              loadSnippets();
            }
          }, 2000);
        });
      } catch (error) {
        importStatusMessage.textContent = 'Error: ' + error.message;
        importStatusMessage.style.color = '#B00020';
        importStatusMessage.style.opacity = '1';
        setTimeout(() => {
          importStatusMessage.style.opacity = '0';
        }, 3000);
      }
    });
    
    // Close button
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalContainer);
    });
    
    // Outside click to close
    modalContainer.addEventListener('click', (event) => {
      if (event.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
    
    // ASSEMBLE THE UI
    
    // Add tabs
    tabContainer.appendChild(exportTab);
    tabContainer.appendChild(importTab);
    
    // Assemble export tab
    exportButtonContainer.appendChild(selectAllExportButton);
    exportButtonContainer.appendChild(copyExportButton);
    
    exportContainer.appendChild(exportHeader);
    exportContainer.appendChild(exportTextArea);
    exportContainer.appendChild(exportButtonContainer);
    exportContainer.appendChild(exportStatusMessage);
    
    // Assemble import tab
    importButtonContainer.appendChild(importButton);
    
    importContainer.appendChild(importHeader);
    importContainer.appendChild(importTextArea);
    importContainer.appendChild(importNote);
    importContainer.appendChild(importButtonContainer);
    importContainer.appendChild(importStatusMessage);
    
    // Add footer
    footerContainer.appendChild(closeButton);
    
    // Assemble the modal
    modalContent.appendChild(titleElement);
    modalContent.appendChild(tabContainer);
    modalContent.appendChild(exportContainer);
    modalContent.appendChild(importContainer);
    modalContent.appendChild(footerContainer);
    
    modalContainer.appendChild(modalContent);
    
    // Add to document
    document.body.appendChild(modalContainer);
    
    // Auto-select export text for convenience
    setTimeout(() => {
      const range = document.createRange();
      range.selectNodeContents(exportTextArea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, 100);
  });
}

// If this file is loaded in a page context, export the function
if (typeof window !== 'undefined') {
  window.showConfigBackupDialog = showConfigBackupDialog;
}