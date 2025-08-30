/**
 * Simple test version of the web app to debug bundling issues
 */

console.log("Webapp script starting...");

// Simple initialization without complex imports
function simpleInit() {
  console.log("Simple init called");
  
  // Test IndexedDB support
  if (!window.indexedDB) {
    showError("Your browser doesn't support IndexedDB. Please use a modern browser like Chrome, Firefox, Safari, or Edge.");
    return;
  }

  console.log("IndexedDB supported");
  
  // Update projects list
  const container = document.getElementById("projects-container");
  if (container) {
    container.innerHTML = "<p>No projects yet. Create your first project above!</p>";
  }

  // Setup basic event handlers
  setupBasicHandlers();
}

function setupBasicHandlers() {
  const createBtn = document.getElementById("create-project-btn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const projectName = document.getElementById("project-name").value.trim();
      if (!projectName) {
        showError("Please enter a project name");
        return;
      }
      
      showSuccess(`Project "${projectName}" would be created (demo mode)`);
      document.getElementById("project-name").value = "";
    });
  }

  const importBtn = document.getElementById("import-font-btn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      showSuccess("Import functionality coming soon!");
    });
  }
}

function showError(message) {
  console.error(message);
  const container = document.getElementById("error-container");
  if (container) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.cssText = "float: right; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit;";
    closeBtn.onclick = () => errorDiv.remove();
    errorDiv.appendChild(closeBtn);
    
    container.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 10000);
  }
}

function showSuccess(message) {
  console.log(message);
  const container = document.getElementById("error-container");
  if (container) {
    const successDiv = document.createElement("div");
    successDiv.className = "error-message";
    successDiv.style.cssText = "color: green; background: lightgreen; border-color: green;";
    successDiv.textContent = message;
    
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.cssText = "float: right; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit;";
    closeBtn.onclick = () => successDiv.remove();
    successDiv.appendChild(closeBtn);
    
    container.appendChild(successDiv);
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 5000);
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  simpleInit();
});

console.log("Webapp script loaded");