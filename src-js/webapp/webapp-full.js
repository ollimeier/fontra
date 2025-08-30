/**
 * Fontra Web App with full IndexedDB functionality
 * Stores font projects in browser's IndexedDB for offline editing
 */

console.log("Fontra Web App starting...");

// IndexedDB configuration
const DB_NAME = "fontra-fonts";
const DB_VERSION = 1;
const STORES = {
  projects: "projects",
  glyphs: "glyphs", 
  fontData: "fontData"
};

let db = null;

// Initialize the web app
async function initWebApp() {
  try {
    console.log("Initializing web app...");
    
    // Check browser support
    if (!window.indexedDB) {
      showError("Your browser doesn't support IndexedDB. Please use a modern browser like Chrome, Firefox, Safari, or Edge.");
      return;
    }

    // Initialize IndexedDB
    await initIndexedDB();
    
    // Load and display projects
    await loadProjects();
    
    // Setup event handlers
    setupEventHandlers();
    
    console.log("Web app initialized successfully");
  } catch (error) {
    console.error("Failed to initialize web app:", error);
    showError("Failed to initialize web app: " + error.message);
  }
}

// Initialize IndexedDB
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log("IndexedDB opened successfully");
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      console.log("IndexedDB upgrade needed");
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains(STORES.projects)) {
        const projectStore = db.createObjectStore(STORES.projects, { keyPath: "identifier" });
        console.log("Created projects store");
      }
      
      if (!db.objectStoreNames.contains(STORES.glyphs)) {
        const glyphStore = db.createObjectStore(STORES.glyphs, { keyPath: ["projectId", "glyphName"] });
        glyphStore.createIndex("projectId", "projectId", { unique: false });
        console.log("Created glyphs store");
      }
      
      if (!db.objectStoreNames.contains(STORES.fontData)) {
        const fontDataStore = db.createObjectStore(STORES.fontData, { keyPath: "projectId" });
        console.log("Created fontData store");
      }
    };
  });
}

// Load projects from IndexedDB
async function loadProjects() {
  try {
    console.log("Loading projects...");
    const projects = await getProjects();
    renderProjects(projects);
    console.log(`Loaded ${projects.length} projects`);
  } catch (error) {
    console.error("Failed to load projects:", error);
    showError("Failed to load projects: " + error.message);
  }
}

// Get all projects from IndexedDB
async function getProjects() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.projects], "readonly");
    const store = transaction.objectStore(STORES.projects);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const projects = request.result || [];
      resolve(projects);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Create a new project
async function createProject(projectName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.projects, STORES.fontData], "readwrite");
    
    const project = {
      identifier: projectName,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      description: `Font project: ${projectName}`
    };
    
    // Create project entry
    const projectStore = transaction.objectStore(STORES.projects);
    const projectRequest = projectStore.add(project);
    
    projectRequest.onsuccess = () => {
      console.log(`Project "${projectName}" created successfully`);
      
      // Create default font data
      const fontDataStore = transaction.objectStore(STORES.fontData);
      const defaultFontData = {
        projectId: projectName,
        data: {
          fontInfo: {
            familyName: projectName,
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200
          },
          axes: [],
          sources: {},
          glyphMap: {},
          kerning: {},
          features: "",
          customData: {}
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      const fontDataRequest = fontDataStore.add(defaultFontData);
      
      fontDataRequest.onsuccess = () => {
        console.log(`Font data for "${projectName}" created successfully`);
        resolve(projectName);
      };
      
      fontDataRequest.onerror = () => {
        console.error("Failed to create font data:", fontDataRequest.error);
        reject(fontDataRequest.error);
      };
    };
    
    projectRequest.onerror = () => {
      if (projectRequest.error.name === 'ConstraintError') {
        reject(new Error(`Project "${projectName}" already exists`));
      } else {
        console.error("Failed to create project:", projectRequest.error);
        reject(projectRequest.error);
      }
    };
  });
}

// Delete a project
async function deleteProject(projectName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.projects, STORES.fontData, STORES.glyphs], "readwrite");
    
    // Delete project
    const projectStore = transaction.objectStore(STORES.projects);
    projectStore.delete(projectName);
    
    // Delete font data
    const fontDataStore = transaction.objectStore(STORES.fontData);
    fontDataStore.delete(projectName);
    
    // Delete all glyphs for this project
    const glyphStore = transaction.objectStore(STORES.glyphs);
    const glyphIndex = glyphStore.index("projectId");
    const glyphRequest = glyphIndex.openCursor(IDBKeyRange.only(projectName));
    
    glyphRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => {
      console.log(`Project "${projectName}" deleted successfully`);
      resolve();
    };
    
    transaction.onerror = () => {
      console.error("Failed to delete project:", transaction.error);
      reject(transaction.error);
    };
  });
}

// Render projects list
function renderProjects(projects) {
  const container = document.getElementById("projects-container");
  
  if (projects.length === 0) {
    container.innerHTML = "<p>No projects yet. Create your first project above!</p>";
    return;
  }

  container.innerHTML = "";
  
  for (const project of projects) {
    const projectDiv = document.createElement("div");
    projectDiv.className = "project-item";
    
    const createdDate = new Date(project.created).toLocaleDateString();
    const modifiedDate = new Date(project.modified).toLocaleDateString();
    
    projectDiv.innerHTML = `
      <div>
        <strong>${project.identifier}</strong>
        <br>
        <small>Created: ${createdDate} | Modified: ${modifiedDate}</small>
      </div>
      <div>
        <button class="btn" onclick="openProject('${project.identifier}')">Open</button>
        <button class="btn" onclick="confirmDeleteProject('${project.identifier}')" style="background: #dc3545;">Delete</button>
      </div>
    `;
    
    container.appendChild(projectDiv);
  }
}

// Setup event handlers
function setupEventHandlers() {
  // Create project button
  const createBtn = document.getElementById("create-project-btn");
  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      const projectName = document.getElementById("project-name").value.trim();
      if (!projectName) {
        showError("Please enter a project name");
        return;
      }
      
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(projectName)) {
        showError("Project name can only contain letters, numbers, spaces, hyphens, and underscores");
        return;
      }
      
      try {
        showLoader("Creating project...");
        await createProject(projectName);
        document.getElementById("project-name").value = "";
        await loadProjects();
        hideLoader();
        showSuccess(`Project "${projectName}" created successfully!`);
      } catch (error) {
        hideLoader();
        showError("Failed to create project: " + error.message);
      }
    });
  }

  // Import font button
  const importBtn = document.getElementById("import-font-btn");
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      document.getElementById("font-file-input").click();
    });
  }

  // Font file input
  const fileInput = document.getElementById("font-file-input");
  if (fileInput) {
    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        showLoader("Importing font...");
        const projectName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        // For now, just create an empty project with the font name
        // TODO: Parse the font file and extract actual font data
        await createProject(projectName);
        await loadProjects();
        hideLoader();
        showSuccess(`Font imported as project "${projectName}"`);
      } catch (error) {
        hideLoader();
        showError("Failed to import font: " + error.message);
      }
      
      // Clear the input
      event.target.value = "";
    });
  }

  // Enter key in project name input
  const projectNameInput = document.getElementById("project-name");
  if (projectNameInput) {
    projectNameInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        createBtn.click();
      }
    });
  }
}

// Global functions for project actions
window.openProject = async function(projectId) {
  try {
    // For now, just show a message about opening the project
    // TODO: Navigate to the editor with the project
    showSuccess(`Opening project "${projectId}" - editor integration coming soon!`);
    console.log(`Would open project: ${projectId}`);
  } catch (error) {
    showError("Failed to open project: " + error.message);
  }
};

window.confirmDeleteProject = async function(projectId) {
  if (!confirm(`Are you sure you want to delete project "${projectId}"? This cannot be undone.`)) {
    return;
  }
  
  try {
    showLoader("Deleting project...");
    await deleteProject(projectId);
    await loadProjects();
    hideLoader();
    showSuccess(`Project "${projectId}" deleted successfully`);
  } catch (error) {
    hideLoader();
    showError("Failed to delete project: " + error.message);
  }
};

// UI helper functions
function showLoader(message = "Loading...") {
  const spinner = document.getElementById("global-loader-spinner");
  if (spinner) {
    spinner.style.display = "inherit";
  }
  console.log(message);
}

function hideLoader() {
  const spinner = document.getElementById("global-loader-spinner");
  if (spinner) {
    spinner.style.display = "none";
  }
}

function showError(message) {
  console.error(message);
  showMessage(message, "error");
}

function showSuccess(message) {
  console.log(message);
  showMessage(message, "success");
}

function showMessage(message, type = "error") {
  const container = document.getElementById("error-container");
  if (!container) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "error-message";
  
  if (type === "success") {
    messageDiv.style.cssText = "color: #155724; background: #d4edda; border-color: #c3e6cb;";
  }
  
  messageDiv.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = "float: right; background: none; border: none; font-size: 18px; cursor: pointer; color: inherit;";
  closeBtn.onclick = () => messageDiv.remove();
  messageDiv.appendChild(closeBtn);
  
  container.appendChild(messageDiv);
  
  // Auto-remove after timeout
  const timeout = type === "success" ? 5000 : 10000;
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, timeout);
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  initWebApp();
});

console.log("Fontra Web App script loaded");