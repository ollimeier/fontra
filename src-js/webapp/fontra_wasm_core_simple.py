#!/usr/bin/env python3
"""
Simplified Fontra WebAssembly Core - Basic font processing functionality
This is a standalone version that doesn't require external dependencies
and can be compiled to WebAssembly using py2wasm.
"""

import json
import math
import sys
from typing import Any, Dict, List, Optional, Union


class Point:
    """Basic point class"""
    def __init__(self, x: float = 0, y: float = 0, type: str = "line", smooth: bool = False):
        self.x = x
        self.y = y
        self.type = type
        self.smooth = smooth
    
    def to_dict(self) -> Dict[str, Any]:
        result = {"x": self.x, "y": self.y}
        if self.type != "line":
            result["type"] = self.type
        if self.smooth:
            result["smooth"] = self.smooth
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Point':
        return cls(
            x=data.get("x", 0),
            y=data.get("y", 0),
            type=data.get("type", "line"),
            smooth=data.get("smooth", False)
        )


class Contour:
    """Basic contour class"""
    def __init__(self, points: Optional[List[Point]] = None, is_closed: bool = False):
        self.points = points or []
        self.is_closed = is_closed
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "points": [point.to_dict() for point in self.points],
            "isClosed": self.is_closed
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Contour':
        points = [Point.from_dict(p) for p in data.get("points", [])]
        return cls(points=points, is_closed=data.get("isClosed", False))


class Path:
    """Basic path class"""
    def __init__(self, contours: Optional[List[Contour]] = None):
        self.contours = contours or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "contours": [contour.to_dict() for contour in self.contours]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Path':
        contours = [Contour.from_dict(c) for c in data.get("contours", [])]
        return cls(contours=contours)
    
    def is_empty(self) -> bool:
        return not self.contours or all(not c.points for c in self.contours)
    
    def get_bounds(self) -> Optional[Dict[str, float]]:
        """Get bounding box of the path"""
        if self.is_empty():
            return None
        
        min_x = min_y = float('inf')
        max_x = max_y = float('-inf')
        
        for contour in self.contours:
            for point in contour.points:
                min_x = min(min_x, point.x)
                max_x = max(max_x, point.x)
                min_y = min(min_y, point.y)
                max_y = max(max_y, point.y)
        
        return {
            "xMin": min_x,
            "yMin": min_y,
            "xMax": max_x,
            "yMax": max_y,
            "width": max_x - min_x,
            "height": max_y - min_y
        }
    
    def translate(self, dx: float, dy: float) -> 'Path':
        """Translate the path by dx, dy"""
        new_contours = []
        for contour in self.contours:
            new_points = []
            for point in contour.points:
                new_point = Point(
                    x=point.x + dx,
                    y=point.y + dy,
                    type=point.type,
                    smooth=point.smooth
                )
                new_points.append(new_point)
            new_contours.append(Contour(new_points, contour.is_closed))
        
        return Path(new_contours)
    
    def scale(self, sx: float, sy: float) -> 'Path':
        """Scale the path by sx, sy"""
        new_contours = []
        for contour in self.contours:
            new_points = []
            for point in contour.points:
                new_point = Point(
                    x=point.x * sx,
                    y=point.y * sy,
                    type=point.type,
                    smooth=point.smooth
                )
                new_points.append(new_point)
            new_contours.append(Contour(new_points, contour.is_closed))
        
        return Path(new_contours)


class SimpleFontraWASMProcessor:
    """
    Simplified WebAssembly-compatible font processor
    Provides basic path operations without external dependencies
    """
    
    def __init__(self):
        self.version = "1.0.0-simple"
    
    def get_info(self) -> Dict[str, Any]:
        """Get processor information"""
        return {
            "version": self.version,
            "available": True,
            "mode": "simple",
            "capabilities": [
                "path_bounds",
                "path_translate",
                "path_scale",
                "path_validate",
                "path_info"
            ]
        }
    
    def path_bounds(self, path_data: Union[str, Dict]) -> Dict[str, Any]:
        """
        Get bounding box of a path
        Args:
            path_data: Path data as JSON string or dict
        Returns:
            Bounding box data or error
        """
        try:
            # Parse input
            if isinstance(path_data, str):
                path_data = json.loads(path_data)
            
            # Convert to path
            path = Path.from_dict(path_data)
            
            # Get bounds
            bounds = path.get_bounds()
            
            return {
                "success": True,
                "bounds": bounds
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def path_translate(self, path_data: Union[str, Dict], dx: float, dy: float) -> Dict[str, Any]:
        """
        Translate a path by dx, dy
        Args:
            path_data: Path data as JSON string or dict
            dx: X offset
            dy: Y offset
        Returns:
            Translated path data or error
        """
        try:
            # Parse input
            if isinstance(path_data, str):
                path_data = json.loads(path_data)
            
            # Convert to path
            path = Path.from_dict(path_data)
            
            # Translate
            result_path = path.translate(dx, dy)
            
            # Convert back to dict
            return {
                "success": True,
                "path": result_path.to_dict()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def path_scale(self, path_data: Union[str, Dict], sx: float, sy: float) -> Dict[str, Any]:
        """
        Scale a path by sx, sy
        Args:
            path_data: Path data as JSON string or dict
            sx: X scale factor
            sy: Y scale factor
        Returns:
            Scaled path data or error
        """
        try:
            # Parse input
            if isinstance(path_data, str):
                path_data = json.loads(path_data)
            
            # Convert to path
            path = Path.from_dict(path_data)
            
            # Scale
            result_path = path.scale(sx, sy)
            
            # Convert back to dict
            return {
                "success": True,
                "path": result_path.to_dict()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def path_validate(self, path_data: Union[str, Dict]) -> Dict[str, Any]:
        """
        Validate a path and return statistics
        Args:
            path_data: Path data as JSON string or dict
        Returns:
            Validation results
        """
        try:
            # Parse input
            if isinstance(path_data, str):
                path_data = json.loads(path_data)
            
            # Convert to path
            path = Path.from_dict(path_data)
            
            # Analyze path
            total_points = sum(len(c.points) for c in path.contours)
            closed_contours = sum(1 for c in path.contours if c.is_closed)
            open_contours = len(path.contours) - closed_contours
            
            return {
                "success": True,
                "valid": True,
                "stats": {
                    "total_contours": len(path.contours),
                    "closed_contours": closed_contours,
                    "open_contours": open_contours,
                    "total_points": total_points,
                    "is_empty": path.is_empty()
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def path_info(self, path_data: Union[str, Dict]) -> Dict[str, Any]:
        """
        Get comprehensive path information
        Args:
            path_data: Path data as JSON string or dict
        Returns:
            Path information
        """
        try:
            # Parse input
            if isinstance(path_data, str):
                path_data = json.loads(path_data)
            
            # Convert to path
            path = Path.from_dict(path_data)
            
            # Get validation stats
            validation = self.path_validate(path_data)
            
            # Get bounds
            bounds = path.get_bounds()
            
            return {
                "success": True,
                "info": {
                    "bounds": bounds,
                    "stats": validation.get("stats", {}),
                    "version": self.version
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global processor instance
processor = SimpleFontraWASMProcessor()

# WebAssembly-compatible interface functions
def wasm_get_info() -> str:
    """Get processor info as JSON string"""
    return json.dumps(processor.get_info())

def wasm_path_bounds(path_json: str) -> str:
    """Get path bounds"""
    result = processor.path_bounds(path_json)
    return json.dumps(result)

def wasm_path_translate(path_json: str, dx: float, dy: float) -> str:
    """Translate path"""
    result = processor.path_translate(path_json, dx, dy)
    return json.dumps(result)

def wasm_path_scale(path_json: str, sx: float, sy: float) -> str:
    """Scale path"""
    result = processor.path_scale(path_json, sx, sy)
    return json.dumps(result)

def wasm_path_validate(path_json: str) -> str:
    """Validate path"""
    result = processor.path_validate(path_json)
    return json.dumps(result)

def wasm_path_info(path_json: str) -> str:
    """Get path info"""
    result = processor.path_info(path_json)
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
            
            print("Path info test:", wasm_path_info(json.dumps(test_path)))
            print("Bounds test:", wasm_path_bounds(json.dumps(test_path)))
            print("Translate test:", wasm_path_translate(json.dumps(test_path), 50, 25))
            print("Scale test:", wasm_path_scale(json.dumps(test_path), 2.0, 1.5))
        else:
            print(f"Unknown operation: {operation}")
            print("Available operations: info, test")
    else:
        print("Simple Fontra WASM Core v" + processor.version)
        print("Usage: python fontra_wasm_core_simple.py [info|test]")