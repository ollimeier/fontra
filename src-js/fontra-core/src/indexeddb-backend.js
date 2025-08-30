/**
 * IndexedDB-based backend for storing font data in the browser
 * This replaces the Python server backend for standalone web app usage
 */

import { AbstractBackend } from "./backend-api.js";
import { StaticGlyph } from "./var-glyph.js";
import { VarPackedPath } from "./var-path.js";
import { WebAssemblyFontProcessor } from "./webassembly-backend.js";

const DB_NAME = "fontra-fonts";
const DB_VERSION = 1;
const STORES = {
  projects: "projects",
  glyphs: "glyphs", 
  fontData: "fontData",
  kerning: "kerning",
  features: "features",
  customData: "customData",
  backgroundImages: "backgroundImages"
};

export class IndexedDBBackend extends AbstractBackend {
  constructor() {
    super();
    this.db = null;
  }

  static async getProjects() {
    const backend = new IndexedDBBackend();
    await backend._ensureDB();
    return await backend._getProjects();
  }

  async _ensureDB() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains(STORES.projects)) {
          db.createObjectStore(STORES.projects, { keyPath: "identifier" });
        }
        if (!db.objectStoreNames.contains(STORES.glyphs)) {
          const glyphStore = db.createObjectStore(STORES.glyphs, { keyPath: ["projectId", "glyphName"] });
          glyphStore.createIndex("projectId", "projectId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.fontData)) {
          db.createObjectStore(STORES.fontData, { keyPath: "projectId" });
        }
        if (!db.objectStoreNames.contains(STORES.kerning)) {
          db.createObjectStore(STORES.kerning, { keyPath: "projectId" });
        }
        if (!db.objectStoreNames.contains(STORES.features)) {
          db.createObjectStore(STORES.features, { keyPath: "projectId" });
        }
        if (!db.objectStoreNames.contains(STORES.customData)) {
          db.createObjectStore(STORES.customData, { keyPath: "projectId" });
        }
        if (!db.objectStoreNames.contains(STORES.backgroundImages)) {
          db.createObjectStore(STORES.backgroundImages, { keyPath: ["projectId", "imageId"] });
        }
      };
    });
  }

  async _getProjects() {
    const transaction = this.db.transaction([STORES.projects], "readonly");
    const store = transaction.objectStore(STORES.projects);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const projects = request.result.map(p => p.identifier);
        resolve(projects);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async createProject(projectIdentifier, fontData = null) {
    const backend = new IndexedDBBackend();
    await backend._ensureDB();
    return await backend._createProject(projectIdentifier, fontData);
  }

  async _createProject(projectIdentifier, fontData = null) {
    const transaction = this.db.transaction([STORES.projects, STORES.fontData], "readwrite");
    
    // Create project entry
    const projectStore = transaction.objectStore(STORES.projects);
    await this._promisifyRequest(projectStore.put({
      identifier: projectIdentifier,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }));

    // Create default font data if provided
    if (fontData) {
      const fontDataStore = transaction.objectStore(STORES.fontData);
      await this._promisifyRequest(fontDataStore.put({
        projectId: projectIdentifier,
        data: fontData
      }));
    }

    return projectIdentifier;
  }

  static async parseClipboard(data) {
    const processor = await WebAssemblyFontProcessor.getInstance();
    const result = await processor.parseClipboard(data);
    return result ? StaticGlyph.fromObject(result) : undefined;
  }

  static async unionPath(path) {
    const processor = await WebAssemblyFontProcessor.getInstance();
    const newPath = await processor.unionPath(path);
    return VarPackedPath.fromObject(newPath);
  }

  static async subtractPath(pathA, pathB) {
    const processor = await WebAssemblyFontProcessor.getInstance();
    const newPath = await processor.subtractPath(pathA, pathB);
    return VarPackedPath.fromObject(newPath);
  }

  static async intersectPath(pathA, pathB) {
    const processor = await WebAssemblyFontProcessor.getInstance();
    const newPath = await processor.intersectPath(pathA, pathB);
    return VarPackedPath.fromObject(newPath);
  }

  static async excludePath(pathA, pathB) {
    const processor = await WebAssemblyFontProcessor.getInstance();
    const newPath = await processor.excludePath(pathA, pathB);
    return VarPackedPath.fromObject(newPath);
  }

  static async remoteFont(projectIdentifier) {
    const backend = new IndexedDBBackend();
    await backend._ensureDB();
    return await backend._createRemoteFont(projectIdentifier);
  }

  async _createRemoteFont(projectIdentifier) {
    return new IndexedDBRemoteFont(this.db, projectIdentifier);
  }

  _promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * IndexedDB-based remote font implementation
 */
class IndexedDBRemoteFont {
  constructor(db, projectId) {
    this.db = db;
    this.projectId = projectId;
  }

  async getGlyph(glyphName) {
    const transaction = this.db.transaction([STORES.glyphs], "readonly");
    const store = transaction.objectStore(STORES.glyphs);
    const request = store.get([this.projectId, glyphName]);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async putGlyph(glyphName, glyph, codePoints) {
    const transaction = this.db.transaction([STORES.glyphs], "readwrite");
    const store = transaction.objectStore(STORES.glyphs);
    
    await this._promisifyRequest(store.put({
      projectId: this.projectId,
      glyphName: glyphName,
      data: glyph,
      codePoints: codePoints,
      modified: new Date().toISOString()
    }));
  }

  async getFontInfo() {
    const fontData = await this._getFontData();
    return fontData?.fontInfo || {};
  }

  async putFontInfo(fontInfo) {
    const fontData = await this._getFontData() || { data: {} };
    fontData.data.fontInfo = fontInfo;
    await this._putFontData(fontData.data);
  }

  async getAxes() {
    const fontData = await this._getFontData();
    return fontData?.axes || [];
  }

  async putAxes(axes) {
    const fontData = await this._getFontData() || { data: {} };
    fontData.data.axes = axes;
    await this._putFontData(fontData.data);
  }

  async getSources() {
    const fontData = await this._getFontData();
    return fontData?.sources || {};
  }

  async putSources(sources) {
    const fontData = await this._getFontData() || { data: {} };
    fontData.data.sources = sources;
    await this._putFontData(fontData.data);
  }

  async getGlyphMap() {
    const transaction = this.db.transaction([STORES.glyphs], "readonly");
    const store = transaction.objectStore(STORES.glyphs);
    const index = store.index("projectId");
    const request = index.getAll(this.projectId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const glyphMap = {};
        for (const glyph of request.result) {
          if (glyph.codePoints) {
            glyphMap[glyph.glyphName] = glyph.codePoints;
          }
        }
        resolve(glyphMap);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async _getFontData() {
    const transaction = this.db.transaction([STORES.fontData], "readonly");
    const store = transaction.objectStore(STORES.fontData);
    const request = store.get(this.projectId);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _putFontData(data) {
    const transaction = this.db.transaction([STORES.fontData], "readwrite");
    const store = transaction.objectStore(STORES.fontData);
    
    return this._promisifyRequest(store.put({
      projectId: this.projectId,
      data: data,
      modified: new Date().toISOString()
    }));
  }

  _promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}