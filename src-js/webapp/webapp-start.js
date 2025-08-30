/**
 * Entry point for standalone Fontra web app
 * Uses IndexedDB backend for local storage
 */

import { getBackend } from "@fontra/core/backend-api.js";
import { loaderSpinner } from "@fontra/core/loader-spinner.js";

// Initialize the web app
async function initWebApp() {
  try {
    const Backend = getBackend("indexeddb");
    await loadProjects(Backend);
    setupEventHandlers(Backend);
    hideLoader();
  } catch (error) {
    showError("Failed to initialize web app: " + error.message);
    hideLoader();
  }
}

async function loadProjects(Backend) {
  try {
    const projects = await Backend.getProjects();
    renderProjects(projects);
  } catch (error) {
    showError("Failed to load projects: " + error.message);
  }
}

function renderProjects(projects) {
  const container = document.getElementById("projects-container");
  
  if (projects.length === 0) {
    container.innerHTML = "<p>No projects yet. Create your first project above!</p>";
    return;
  }

  container.innerHTML = "";
  
  for (const projectId of projects) {
    const projectDiv = document.createElement("div");
    projectDiv.className = "project-item";
    
    projectDiv.innerHTML = `
      <div>
        <strong>${projectId}</strong>
      </div>
      <div>
        <button class="btn" onclick="openProject('${projectId}')">Open</button>
        <button class="btn" onclick="deleteProject('${projectId}')" style="background: var(--fontra-error-color);">Delete</button>
      </div>
    `;
    
    container.appendChild(projectDiv);
  }
}

function setupEventHandlers(Backend) {
  // Create project button
  document.getElementById("create-project-btn").addEventListener("click", async () => {
    const projectName = document.getElementById("project-name").value.trim();
    if (!projectName) {
      showError("Please enter a project name");
      return;
    }
    
    try {
      showLoader("Creating project...");
      await Backend.createProject(projectName);
      document.getElementById("project-name").value = "";
      await loadProjects(Backend);
      hideLoader();
      showSuccess(`Project "${projectName}" created successfully!`);
    } catch (error) {
      hideLoader();
      showError("Failed to create project: " + error.message);
    }
  });

  // Import font button
  document.getElementById("import-font-btn").addEventListener("click", () => {
    document.getElementById("font-file-input").click();
  });

  // Font file input
  document.getElementById("font-file-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      showLoader("Importing font...");
      const projectName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      // For now, just create an empty project with the font name
      // TODO: Parse the font file and extract actual font data
      await Backend.createProject(projectName);
      await loadProjects(Backend);
      hideLoader();
      showSuccess(`Font imported as project "${projectName}"`);
    } catch (error) {
      hideLoader();
      showError("Failed to import font: " + error.message);
    }
    
    // Clear the input
    event.target.value = "";
  });

  // Enter key in project name input
  document.getElementById("project-name").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      document.getElementById("create-project-btn").click();
    }
  });
}

// Global functions for project actions
window.openProject = async function(projectId) {
  try {
    // Navigate to the editor with the project
    const editorUrl = `/editor.html?project=${encodeURIComponent(projectId)}&mode=indexeddb`;
    window.location.href = editorUrl;
  } catch (error) {
    showError("Failed to open project: " + error.message);
  }
};

window.deleteProject = async function(projectId) {
  if (!confirm(`Are you sure you want to delete project "${projectId}"? This cannot be undone.`)) {
    return;
  }
  
  try {
    showLoader("Deleting project...");
    // TODO: Implement delete project in IndexedDB backend
    showError("Delete project not yet implemented");
    hideLoader();
  } catch (error) {
    hideLoader();
    showError("Failed to delete project: " + error.message);
  }
};

function showLoader(message = "Loading...") {
  loaderSpinner.showLoaderSpinner(message);
}

function hideLoader() {
  loaderSpinner.hideLoaderSpinner();
}

function showError(message) {
  const container = document.getElementById("error-container");
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = "float: right; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit;";
  closeBtn.onclick = () => errorDiv.remove();
  errorDiv.appendChild(closeBtn);
  
  container.appendChild(errorDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 10000);
}

function showSuccess(message) {
  const container = document.getElementById("error-container");
  const successDiv = document.createElement("div");
  successDiv.className = "error-message";
  successDiv.style.cssText = "color: var(--fontra-success-color); background: var(--fontra-success-bg-color); border-color: var(--fontra-success-color);";
  successDiv.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = "float: right; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit;";
  closeBtn.onclick = () => successDiv.remove();
  successDiv.appendChild(closeBtn);
  
  container.appendChild(successDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.remove();
    }
  }, 5000);
}

// Check for IndexedDB support
function checkBrowserSupport() {
  if (!window.indexedDB) {
    showError("Your browser doesn't support IndexedDB. Please use a modern browser like Chrome, Firefox, Safari, or Edge.");
    return false;
  }
  return true;
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  if (checkBrowserSupport()) {
    initWebApp();
  }
});