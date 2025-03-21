// Create and display the backup/restore dialog
function showConfigBackupDialog() {
    // Get current snippets
    chrome.storage.local.get('snippets', (result) => {
      const snippets = result.snippets || [];
      const jsonString = JSON.stringify(snippets, null, 2);
      
      // Create the modal container
      const modalContainer = document.createElement('div');
      modalContainer.className = 'config-modal-container';
      modalContainer.style.position = 'fixed';
      modalContainer.style.top = '0';
      modalContainer.style.left = '0';
      modalContainer.style.width = '100%';
      modalContainer.style.height = '100%';
      modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      modalContainer.style.zIndex = '10000';
      modalContainer.style.display = 'flex';
      modalContainer.style.justifyContent = 'center';
      modalContainer.style.alignItems = 'center';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'config-modal-content';
      modalContent.style.backgroundColor = '#ffffff';
      modalContent.style.borderRadius = '8px';
      modalContent.style.width = '90%';
      modalContent.style.maxWidth = '600px';
      modalContent.style.maxHeight = '90vh';
      modalContent.style.padding = '20px';
      modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      modalContent.style.display = 'flex';
      modalContent.style.flexDirection = 'column';
      modalContent.style.overflow = 'auto';
      
      // Create tabs
      const tabContainer = document.createElement('div');
      tabContainer.className = 'config-tabs';
      tabContainer.style.display = 'flex';
      tabContainer.style.borderBottom = '1px solid rgba(0, 0, 0, 0.12)';
      tabContainer.style.marginBottom = '16px';
      
      const exportTab = document.createElement('div');
      exportTab.className = 'config-tab config-tab-active';
      exportTab.textContent = 'Export Snippets';
      exportTab.style.padding = '10px 16px';
      exportTab.style.cursor = 'pointer';
      exportTab.style.borderBottom = '2px solid #6200ee';
      exportTab.style.color = '#6200ee';
      exportTab.style.fontWeight = '500';
      
      const importTab = document.createElement('div');
      importTab.className = 'config-tab';
      importTab.textContent = 'Import Snippets';
      importTab.style.padding = '10px 16px';
      importTab.style.cursor = 'pointer';
      importTab.style.borderBottom = '2px solid transparent';
      importTab.style.color = 'rgba(0, 0, 0, 0.6)';
      
      // Create content containers for tabs
      const exportContainer = document.createElement('div');
      exportContainer.className = 'config-tab-content';
      exportContainer.id = 'export-content';
      
      const importContainer = document.createElement('div');
      importContainer.className = 'config-tab-content';
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
      const exportTextArea = document.createElement('textarea');
      exportTextArea.value = jsonString;
      exportTextArea.style.width = '100%';
      exportTextArea.style.height = '200px';
      exportTextArea.style.marginBottom = '16px';
      exportTextArea.style.padding = '10px';
      exportTextArea.style.border = '1px solid rgba(0, 0, 0, 0.12)';
      exportTextArea.style.borderRadius = '4px';
      exportTextArea.style.fontFamily = 'monospace';
      exportTextArea.style.fontSize = '12px';
      exportTextArea.readOnly = true;
      
      // Export buttons
      const exportButtonContainer = document.createElement('div');
      exportButtonContainer.style.display = 'flex';
      exportButtonContainer.style.justifyContent = 'space-between';
      exportButtonContainer.style.marginBottom = '16px';
      
      const selectAllExportButton = document.createElement('button');
      selectAllExportButton.textContent = 'Select All';
      selectAllExportButton.className = 'button button-secondary';
      selectAllExportButton.style.padding = '8px 16px';
      selectAllExportButton.style.backgroundColor = 'transparent';
      selectAllExportButton.style.color = '#6200ee';
      selectAllExportButton.style.border = '1px solid #6200ee';
      selectAllExportButton.style.borderRadius = '18px';
      selectAllExportButton.style.fontWeight = '500';
      selectAllExportButton.style.cursor = 'pointer';
      
      const copyExportButton = document.createElement('button');
      copyExportButton.textContent = 'Copy to Clipboard';
      copyExportButton.className = 'button button-primary';
      copyExportButton.style.padding = '8px 16px';
      copyExportButton.style.backgroundColor = '#6200ee';
      copyExportButton.style.color = 'white';
      copyExportButton.style.border = 'none';
      copyExportButton.style.borderRadius = '18px';
      copyExportButton.style.fontWeight = '500';
      copyExportButton.style.cursor = 'pointer';
      
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
      
      // Add import text area
      const importTextArea = document.createElement('textarea');
      importTextArea.placeholder = '{"id":"example1","shortcut":"sig","text":"Best regards,\\nYour Name","category":"Personal"}';
      importTextArea.style.width = '100%';
      importTextArea.style.height = '200px';
      importTextArea.style.marginBottom = '16px';
      importTextArea.style.padding = '10px';
      importTextArea.style.border = '1px solid rgba(0, 0, 0, 0.12)';
      importTextArea.style.borderRadius = '4px';
      importTextArea.style.fontFamily = 'monospace';
      importTextArea.style.fontSize = '12px';
      
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
      importButton.style.padding = '8px 16px';
      importButton.style.backgroundColor = '#6200ee';
      importButton.style.color = 'white';
      importButton.style.border = 'none';
      importButton.style.borderRadius = '18px';
      importButton.style.fontWeight = '500';
      importButton.style.cursor = 'pointer';
      
      // Status message for import
      const importStatusMessage = document.createElement('div');
      importStatusMessage.style.marginTop = '10px';
      importStatusMessage.style.textAlign = 'center';
      importStatusMessage.style.fontWeight = '500';
      importStatusMessage.style.opacity = '0';
      importStatusMessage.style.transition = 'opacity 0.3s';
      
      // Footer buttons
      const footerContainer = document.createElement('div');
      footerContainer.style.borderTop = '1px solid rgba(0, 0, 0, 0.12)';
      footerContainer.style.paddingTop = '16px';
      footerContainer.style.marginTop = 'auto';
      footerContainer.style.display = 'flex';
      footerContainer.style.justifyContent = 'center';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.className = 'button button-secondary';
      closeButton.style.padding = '8px 16px';
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.color = '#6200ee';
      closeButton.style.border = '1px solid #6200ee';
      closeButton.style.borderRadius = '18px';
      closeButton.style.fontWeight = '500';
      closeButton.style.cursor = 'pointer';
      
      // EVENT LISTENERS
      
      // Tab switching
      exportTab.addEventListener('click', () => {
        exportTab.style.borderBottom = '2px solid #6200ee';
        exportTab.style.color = '#6200ee';
        importTab.style.borderBottom = '2px solid transparent';
        importTab.style.color = 'rgba(0, 0, 0, 0.6)';
        exportContainer.style.display = 'block';
        importContainer.style.display = 'none';
      });
      
      importTab.addEventListener('click', () => {
        importTab.style.borderBottom = '2px solid #6200ee';
        importTab.style.color = '#6200ee';
        exportTab.style.borderBottom = '2px solid transparent';
        exportTab.style.color = 'rgba(0, 0, 0, 0.6)';
        importContainer.style.display = 'block';
        exportContainer.style.display = 'none';
      });
      
      // Export buttons
      selectAllExportButton.addEventListener('click', () => {
        exportTextArea.select();
      });
      
      copyExportButton.addEventListener('click', () => {
        exportTextArea.select();
        document.execCommand('copy');
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
      modalContent.appendChild(tabContainer);
      modalContent.appendChild(exportContainer);
      modalContent.appendChild(importContainer);
      modalContent.appendChild(footerContainer);
      
      modalContainer.appendChild(modalContent);
      
      // Add to document
      document.body.appendChild(modalContainer);
      
      // Auto-select export text for convenience
      setTimeout(() => {
        exportTextArea.select();
      }, 100);
    });
  }
  
  // If this file is loaded in a page context, export the function
  if (typeof window !== 'undefined') {
    window.showConfigBackupDialog = showConfigBackupDialog;
  }