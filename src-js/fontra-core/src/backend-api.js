import { getRemoteProxy } from "@fontra/core/remote.js";
import { fetchJSON } from "./utils.js";
import { StaticGlyph } from "./var-glyph.js";
import { VarPackedPath } from "./var-path.js";
import { IndexedDBBackend } from "./indexeddb-backend.js";
/** @import { RemoteFont } from "remotefont" */

/**
 * @module fontra/client/core/backend-api
 * @description
 * This module provides a class that can be used to interact with the backend API.
 * The default Fontra backend is the Python-based web server. This class provides
 * an abstraction over the functionality of the web server, so that alternative
 * backends can be used.
 *
 */
class AbstractBackend {
  /**
   * Get a list of projects from the backend.
   * @returns {Promise<string[]>} An array of project names.
   */
  static async getProjects() {}

  /**
   * Parse clipboard data.
   *
   * Returns a glyph object parsed from either a SVG string or an UFO .glif.
   * @param {string} data - The clipboard data.
   * @returns {Promise<StaticGlyph>} - The glyph object, if parsable.
   */
  static async parseClipboard(data) {}

  /**
   * Remove overlaps in a path
   *
   * In this and all following functions, the paths are represented as
   * JSON VarPackedPath objects; i.e. they have `coordinates`, `pointTypes`,
   * `contourInfo`, and `pointAttrbutes` fields.
   *
   * @param {VarPackedPath} path - The first path.
   * @returns {Promise<VarPackedPath>} The union of the two paths.
   */
  static async unionPath(path) {}

  /**
   * Subtract one path from another.
   * @param {VarPackedPath} pathA - The first path.
   * @param {VarPackedPath} pathB - The second path.
   * @returns {Promise<VarPackedPath>} The difference of the two paths.
   */
  static async subtractPath(pathA, pathB) {}

  /**
   * Intersect two paths.
   * @param {VarPackedPath} pathA - The first path.
   * @param {VarPackedPath} pathB - The second path.
   * @returns {Promise<VarPackedPath>} The intersection of the two paths.
   */
  static async intersectPath(pathA, pathB) {}

  /**
   * Exclude one path from another.
   * @param {VarPackedPath} pathA - The first path.
   * @param {VarPackedPath} pathB - The second path.
   * @returns {Promise<VarPackedPath>} The exclusion of the two paths.
   */
  static async excludePath(pathA, pathB) {}
}

class PythonBackend extends AbstractBackend {
  static async getProjects() {
    return await fetchJSON("/projectlist");
  }

  static async _callServerAPI(functionName, kwargs) {
    const response = await fetch(`/api/${functionName}`, {
      method: "POST",
      body: JSON.stringify(kwargs),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.returnValue;
  }

  static async parseClipboard(data) {
    let result = await this._callServerAPI("parseClipboard", { data });
    return result ? StaticGlyph.fromObject(result) : undefined;
  }

  static async unionPath(path) {
    const newPath = await this._callServerAPI("unionPath", { path });
    return VarPackedPath.fromObject(newPath);
  }

  static async subtractPath(pathA, pathB) {
    const newPath = await this._callServerAPI("subtractPath", { pathA, pathB });
    return VarPackedPath.fromObject(newPath);
  }

  static async intersectPath(pathA, pathB) {
    const newPath = await this._callServerAPI("intersectPath", { pathA, pathB });
    return VarPackedPath.fromObject(newPath);
  }

  static async excludePath(pathA, pathB) {
    const newPath = await this._callServerAPI("excludePath", { pathA, pathB });
    return VarPackedPath.fromObject(newPath);
  }

  /**
   *
   * @param {string} projectIdentifier
   * @returns {Promise<RemoteFont>} Proxy object representing a font on the server.
   */
  static async remoteFont(projectIdentifier) {
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";
    const wsURL = `${protocol}://${
      window.location.host
    }/websocket?project=${encodeURIComponent(projectIdentifier)}`;
    return getRemoteProxy(wsURL);
  }
}

export const Backend = PythonBackend;

// Export AbstractBackend so it can be extended
export { AbstractBackend };

/**
 * Get the appropriate backend based on environment
 * @param {string} [mode] - Force a specific backend mode ("server" or "indexeddb")
 * @returns {typeof AbstractBackend} The backend class to use
 */
export function getBackend(mode = null) {
  // Auto-detect based on environment if no mode specified
  if (!mode) {
    // Check if we're in standalone web app mode (no server)
    if (typeof window !== 'undefined' && 
        (window.location.protocol === 'file:' || 
         !window.location.port || 
         window.FONTRA_STANDALONE_MODE)) {
      mode = "indexeddb";
    } else {
      mode = "server"; 
    }
  }
  
  switch (mode) {
    case "indexeddb":
      return IndexedDBBackend;
    case "server":
    default:
      return PythonBackend;
  }
}
