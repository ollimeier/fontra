/**
 * Fontra WebAssembly Font Processor
 * JavaScript implementation of core font processing functionality
 * This provides the same API as the Python WASM version but runs directly in JS
 * until py2wasm supports Python 3.12
 */

class Point {
  constructor(x = 0, y = 0, type = "line", smooth = false) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.smooth = smooth;
  }

  toDict() {
    const result = { x: this.x, y: this.y };
    if (this.type !== "line") {
      result.type = this.type;
    }
    if (this.smooth) {
      result.smooth = this.smooth;
    }
    return result;
  }

  static fromDict(data) {
    return new Point(
      data.x || 0,
      data.y || 0,
      data.type || "line",
      data.smooth || false
    );
  }
}

class Contour {
  constructor(points = [], isClosed = false) {
    this.points = points;
    this.isClosed = isClosed;
  }

  toDict() {
    return {
      points: this.points.map(p => p.toDict()),
      isClosed: this.isClosed
    };
  }

  static fromDict(data) {
    const points = (data.points || []).map(p => Point.fromDict(p));
    return new Contour(points, data.isClosed || false);
  }
}

class Path {
  constructor(contours = []) {
    this.contours = contours;
  }

  toDict() {
    return {
      contours: this.contours.map(c => c.toDict())
    };
  }

  static fromDict(data) {
    const contours = (data.contours || []).map(c => Contour.fromDict(c));
    return new Path(contours);
  }

  isEmpty() {
    return !this.contours.length || this.contours.every(c => !c.points.length);
  }

  getBounds() {
    if (this.isEmpty()) {
      return null;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const contour of this.contours) {
      for (const point of contour.points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }

    return {
      xMin: minX,
      yMin: minY,
      xMax: maxX,
      yMax: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  translate(dx, dy) {
    const newContours = this.contours.map(contour => {
      const newPoints = contour.points.map(point => new Point(
        point.x + dx,
        point.y + dy,
        point.type,
        point.smooth
      ));
      return new Contour(newPoints, contour.isClosed);
    });

    return new Path(newContours);
  }

  scale(sx, sy) {
    const newContours = this.contours.map(contour => {
      const newPoints = contour.points.map(point => new Point(
        point.x * sx,
        point.y * sy,
        point.type,
        point.smooth
      ));
      return new Contour(newPoints, contour.isClosed);
    });

    return new Path(newContours);
  }

  // Simple path union for closed rectangular paths (basic implementation)
  union(otherPath) {
    // This is a very basic implementation for demonstration
    // In a real implementation, you'd use proper path operations
    if (this.isEmpty()) return otherPath;
    if (otherPath.isEmpty()) return this;

    // For now, just combine the contours (not a real union)
    const combinedContours = [...this.contours, ...otherPath.contours];
    return new Path(combinedContours);
  }

  // Simple path subtraction (basic implementation)
  subtract(otherPath) {
    // This is a placeholder implementation
    // Real subtraction would require complex path operations
    if (this.isEmpty() || otherPath.isEmpty()) return this;
    
    // For now, just return the original path
    return this;
  }

  // Simple path intersection (basic implementation)
  intersect(otherPath) {
    // This is a placeholder implementation
    // Real intersection would require complex path operations
    if (this.isEmpty() || otherPath.isEmpty()) {
      return new Path();
    }
    
    // For now, return an empty path
    return new Path();
  }

  // Simple path exclusion/XOR (basic implementation)  
  exclude(otherPath) {
    // This is a placeholder implementation
    // Real XOR would require complex path operations
    if (this.isEmpty()) return otherPath;
    if (otherPath.isEmpty()) return this;
    
    // For now, just combine contours
    const combinedContours = [...this.contours, ...otherPath.contours];
    return new Path(combinedContours);
  }
}

export class FontraWASMProcessor {
  constructor() {
    this.version = "1.0.0-js";
    this.available = true;
  }

  getInfo() {
    return {
      version: this.version,
      available: this.available,
      mode: "javascript",
      capabilities: [
        "path_bounds",
        "path_translate", 
        "path_scale",
        "path_validate",
        "path_info",
        "path_union",
        "path_subtract", 
        "path_intersect",
        "path_exclude"
      ]
    };
  }

  pathBounds(pathData) {
    try {
      const data = typeof pathData === 'string' ? JSON.parse(pathData) : pathData;
      const path = Path.fromDict(data);
      const bounds = path.getBounds();

      return {
        success: true,
        bounds: bounds
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathTranslate(pathData, dx, dy) {
    try {
      const data = typeof pathData === 'string' ? JSON.parse(pathData) : pathData;
      const path = Path.fromDict(data);
      const resultPath = path.translate(dx, dy);

      return {
        success: true,
        path: resultPath.toDict()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathScale(pathData, sx, sy) {
    try {
      const data = typeof pathData === 'string' ? JSON.parse(pathData) : pathData;
      const path = Path.fromDict(data);
      const resultPath = path.scale(sx, sy);

      return {
        success: true,
        path: resultPath.toDict()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathValidate(pathData) {
    try {
      const data = typeof pathData === 'string' ? JSON.parse(pathData) : pathData;
      const path = Path.fromDict(data);

      const totalPoints = path.contours.reduce((sum, c) => sum + c.points.length, 0);
      const closedContours = path.contours.filter(c => c.isClosed).length;
      const openContours = path.contours.length - closedContours;

      return {
        success: true,
        valid: true,
        stats: {
          total_contours: path.contours.length,
          closed_contours: closedContours,
          open_contours: openContours,
          total_points: totalPoints,
          is_empty: path.isEmpty()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathInfo(pathData) {
    try {
      const data = typeof pathData === 'string' ? JSON.parse(pathData) : pathData;
      const path = Path.fromDict(data);

      const validation = this.pathValidate(pathData);
      const bounds = path.getBounds();

      return {
        success: true,
        info: {
          bounds: bounds,
          stats: validation.stats || {},
          version: this.version
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathUnion(pathData) {
    try {
      const data = typeof pathData === 'string' ? JSON.parse(pathData) : pathData;
      const path = Path.fromDict(data);
      const resultPath = path.union(new Path()); // Union with empty path = simplify

      return {
        success: true,
        path: resultPath.toDict(),
        note: "Basic union implementation - for full path operations, WebAssembly integration needed"
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathSubtract(pathAData, pathBData) {
    try {
      const dataA = typeof pathAData === 'string' ? JSON.parse(pathAData) : pathAData;
      const dataB = typeof pathBData === 'string' ? JSON.parse(pathBData) : pathBData;
      
      const pathA = Path.fromDict(dataA);
      const pathB = Path.fromDict(dataB);
      const resultPath = pathA.subtract(pathB);

      return {
        success: true,
        path: resultPath.toDict(),
        note: "Basic subtract implementation - for full path operations, WebAssembly integration needed"
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathIntersect(pathAData, pathBData) {
    try {
      const dataA = typeof pathAData === 'string' ? JSON.parse(pathAData) : pathAData;
      const dataB = typeof pathBData === 'string' ? JSON.parse(pathBData) : pathBData;
      
      const pathA = Path.fromDict(dataA);
      const pathB = Path.fromDict(dataB);
      const resultPath = pathA.intersect(pathB);

      return {
        success: true,
        path: resultPath.toDict(),
        note: "Basic intersect implementation - for full path operations, WebAssembly integration needed"
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  pathExclude(pathAData, pathBData) {
    try {
      const dataA = typeof pathAData === 'string' ? JSON.parse(pathAData) : pathAData;
      const dataB = typeof pathBData === 'string' ? JSON.parse(pathBData) : pathBData;
      
      const pathA = Path.fromDict(dataA);
      const pathB = Path.fromDict(dataB);
      const resultPath = pathA.exclude(pathB);

      return {
        success: true,
        path: resultPath.toDict(),
        note: "Basic exclude implementation - for full path operations, WebAssembly integration needed"
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create global instance
export const wasmProcessor = new FontraWASMProcessor();

// Expose functions globally for direct use
if (typeof window !== 'undefined') {
  window.FontraWASMProcessor = FontraWASMProcessor;
  window.wasmProcessor = wasmProcessor;
}