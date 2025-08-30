#!/usr/bin/env python3
"""
Fontra WebAssembly Core - Essential font processing functionality
This module contains the core Fontra functions that will be compiled to WebAssembly
using py2wasm to provide font processing capabilities in the browser.
"""

import json
import sys
from typing import Any, Dict, List, Optional, Union

# Try to import required Fontra modules
try:
    from fontra.core.path import Path, Contour, Point, PackedPath
    from fontra.core.pathops import (
        skiaPathOperations, 
        unionPath, 
        subtractPath,
        fontraPathToSkiaPath,
        skiaPathToFontraPath
    )
    from fontra.core.classes import unstructure, structure
    import pathops
    FONTRA_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Fontra modules not available: {e}", file=sys.stderr)
    FONTRA_AVAILABLE = False
    
    # Define minimal fallback classes
    class Path:
        def __init__(self, contours=None):
            self.contours = contours or []
    
    class Point:
        def __init__(self, x=0, y=0, type=None, smooth=False):
            self.x = x
            self.y = y
            self.type = type
            self.smooth = smooth
    
    class Contour:
        def __init__(self, points=None, isClosed=False):
            self.points = points or []
            self.isClosed = isClosed


class FontraWASMProcessor:
    """
    WebAssembly-compatible font processor for Fontra
    Provides essential path operations and font manipulations
    """
    
    def __init__(self):
        self.version = "1.0.0"
        self.available = FONTRA_AVAILABLE
    
    def get_info(self) -> Dict[str, Any]:
        """Get processor information"""
        return {
            "version": self.version,
            "available": self.available,
            "capabilities": [
                "path_union",
                "path_subtract", 
                "path_intersect",
                "path_exclude",
                "path_simplify"
            ] if self.available else []
        }
    
    def path_union(self, path_data: Union[str, Dict]) -> Optional[Dict]:
        """
        Perform union operation on a path
        Args:
            path_data: Path data as JSON string or dict
        Returns:
            Simplified/united path data or None if error
        """
        if not self.available:
            return {"error": "Fontra modules not available"}
        
        try:
            # Parse input
            if isinstance(path_data, str):
                path_data = json.loads(path_data)
            
            # Convert to Fontra path
            path = self._dict_to_path(path_data)
            
            # Perform union
            result_path = unionPath(path)
            
            # Convert back to dict
            return self._path_to_dict(result_path)
            
        except Exception as e:
            return {"error": str(e)}
    
    def path_subtract(self, path_a_data: Union[str, Dict], path_b_data: Union[str, Dict]) -> Optional[Dict]:
        """
        Subtract path B from path A
        Args:
            path_a_data: First path data
            path_b_data: Second path data  
        Returns:
            Result path data or None if error
        """
        if not self.available:
            return {"error": "Fontra modules not available"}
        
        try:
            # Parse inputs
            if isinstance(path_a_data, str):
                path_a_data = json.loads(path_a_data)
            if isinstance(path_b_data, str):
                path_b_data = json.loads(path_b_data)
            
            # Convert to Fontra paths
            path_a = self._dict_to_path(path_a_data)
            path_b = self._dict_to_path(path_b_data)
            
            # Perform subtraction
            result_path = subtractPath(path_a, path_b)
            
            # Convert back to dict
            return self._path_to_dict(result_path)
            
        except Exception as e:
            return {"error": str(e)}
    
    def path_intersect(self, path_a_data: Union[str, Dict], path_b_data: Union[str, Dict]) -> Optional[Dict]:
        """
        Intersect two paths
        """
        if not self.available:
            return {"error": "Fontra modules not available"}
        
        try:
            # Parse inputs
            if isinstance(path_a_data, str):
                path_a_data = json.loads(path_a_data)
            if isinstance(path_b_data, str):
                path_b_data = json.loads(path_b_data)
            
            # Convert to Fontra paths
            path_a = self._dict_to_path(path_a_data)
            path_b = self._dict_to_path(path_b_data)
            
            # Perform intersection
            result_path = skiaPathOperations(path_a, path_b, pathops.PathOp.INTERSECTION)
            
            # Convert back to dict
            return self._path_to_dict(result_path)
            
        except Exception as e:
            return {"error": str(e)}
    
    def path_exclude(self, path_a_data: Union[str, Dict], path_b_data: Union[str, Dict]) -> Optional[Dict]:
        """
        Exclude path B from path A (XOR operation)
        """
        if not self.available:
            return {"error": "Fontra modules not available"}
        
        try:
            # Parse inputs
            if isinstance(path_a_data, str):
                path_a_data = json.loads(path_a_data)
            if isinstance(path_b_data, str):
                path_b_data = json.loads(path_b_data)
            
            # Convert to Fontra paths
            path_a = self._dict_to_path(path_a_data)
            path_b = self._dict_to_path(path_b_data)
            
            # Perform XOR
            result_path = skiaPathOperations(path_a, path_b, pathops.PathOp.XOR)
            
            # Convert back to dict
            return self._path_to_dict(result_path)
            
        except Exception as e:
            return {"error": str(e)}
    
    def _dict_to_path(self, path_data: Dict) -> Path:
        """Convert dictionary to Fontra Path object"""
        if not self.available:
            return Path()
        
        try:
            return structure(path_data, Path)
        except:
            # Fallback manual conversion
            contours = []
            for contour_data in path_data.get("contours", []):
                points = []
                for point_data in contour_data.get("points", []):
                    point = Point(
                        x=point_data.get("x", 0),
                        y=point_data.get("y", 0),
                        type=point_data.get("type"),
                        smooth=point_data.get("smooth", False)
                    )
                    points.append(point)
                
                contour = Contour(
                    points=points,
                    isClosed=contour_data.get("isClosed", False)
                )
                contours.append(contour)
            
            return Path(contours=contours)
    
    def _path_to_dict(self, path: Path) -> Dict:
        """Convert Fontra Path object to dictionary"""
        if not self.available:
            return {"contours": []}
        
        try:
            return unstructure(path)
        except:
            # Fallback manual conversion
            contours = []
            for contour in path.contours:
                points = []
                for point in contour.points:
                    point_dict = {"x": point.x, "y": point.y}
                    if hasattr(point, "type") and point.type:
                        point_dict["type"] = point.type
                    if hasattr(point, "smooth") and point.smooth:
                        point_dict["smooth"] = point.smooth
                    points.append(point_dict)
                
                contour_dict = {
                    "points": points,
                    "isClosed": contour.isClosed
                }
                contours.append(contour_dict)
            
            return {"contours": contours}


# Global processor instance
processor = FontraWASMProcessor()

# WebAssembly-compatible interface functions
def wasm_get_info() -> str:
    """Get processor info as JSON string"""
    return json.dumps(processor.get_info())

def wasm_path_union(path_json: str) -> str:
    """Perform path union operation"""
    result = processor.path_union(path_json)
    return json.dumps(result)

def wasm_path_subtract(path_a_json: str, path_b_json: str) -> str:
    """Perform path subtraction operation"""
    result = processor.path_subtract(path_a_json, path_b_json)
    return json.dumps(result)

def wasm_path_intersect(path_a_json: str, path_b_json: str) -> str:
    """Perform path intersection operation"""
    result = processor.path_intersect(path_a_json, path_b_json)
    return json.dumps(result)

def wasm_path_exclude(path_a_json: str, path_b_json: str) -> str:
    """Perform path exclude (XOR) operation"""
    result = processor.path_exclude(path_a_json, path_b_json)
    return json.dumps(result)


# CLI interface for testing
if __name__ == "__main__":
    if len(sys.argv) > 1:
        operation = sys.argv[1]
        
        if operation == "info":
            print(wasm_get_info())
        elif operation == "test":
            # Test with simple path
            test_path = {
                "contours": [
                    {
                        "points": [
                            {"x": 0, "y": 0, "type": "line"},
                            {"x": 100, "y": 0, "type": "line"},
                            {"x": 100, "y": 100, "type": "line"},
                            {"x": 0, "y": 100, "type": "line"}
                        ],
                        "isClosed": True
                    }
                ]
            }
            
            result = wasm_path_union(json.dumps(test_path))
            print("Union test result:", result)
        else:
            print(f"Unknown operation: {operation}")
            print("Available operations: info, test")
    else:
        print("Fontra WASM Core v" + processor.version)
        print("Usage: python fontra_wasm_core.py [info|test]")