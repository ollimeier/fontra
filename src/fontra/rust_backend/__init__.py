"""
Rust backend integration for Fontra.

This module provides Python wrappers around the Rust implementation
to maintain API compatibility with the existing Python backends.
"""

# For now, this is a placeholder. The actual Rust module will be built
# using maturin and imported here.

# Future import will look like:
# from fontra_backend_rust import FileSystemProjectManager as RustProjectManager
# from fontra_backend_rust import FontraBackend as RustFontraBackend

__all__ = [
    "FileSystemProjectManagerFactory",
    "FontraBackend",
]


class FileSystemProjectManagerFactory:
    """
    Factory for creating Rust-based FileSystemProjectManager instances.
    This is a placeholder for the future Rust integration.
    """

    @staticmethod
    def addArguments(parser):
        """Add command-line arguments for the project manager."""
        # Import the Python version for now
        from ..filesystem.projectmanager import (
            FileSystemProjectManagerFactory as PyFactory,
        )

        return PyFactory.addArguments(parser)

    @staticmethod
    def getProjectManager(arguments):
        """Get a project manager instance."""
        # Import the Python version for now
        from ..filesystem.projectmanager import (
            FileSystemProjectManagerFactory as PyFactory,
        )

        return PyFactory.getProjectManager(arguments)


class FontraBackend:
    """
    Rust-based Fontra backend.
    This is a placeholder for the future Rust integration.
    """

    @classmethod
    def fromPath(cls, path):
        """Create backend from a path."""
        # Import the Python version for now
        from ..backends.fontra import FontraBackend as PyBackend

        return PyBackend.fromPath(path)

    @classmethod
    def createFromPath(cls, path):
        """Create a new .fontra directory from a path."""
        # Import the Python version for now
        from ..backends.fontra import FontraBackend as PyBackend

        return PyBackend.createFromPath(path)
