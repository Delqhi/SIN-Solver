#!/usr/bin/env python3
"""
Workflow Modal Service - Manages modal lifecycle and interactions.

This service handles the opening, closing, updating, and state management of
workflow modals in the dashboard UI. It provides async methods for all modal
operations with full error handling and logging.

Features:
  - Modal lifecycle management (open/close/update)
  - Form submission handling
  - Modal state tracking
  - Error handling with user-friendly messages
  - Service metrics and statistics
  - Singleton pattern for global access
"""

import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import asyncio

logger = logging.getLogger("WorkflowModalService")


@dataclass
class ModalState:
    """Represents the state of a modal."""

    modal_id: str
    workflow_id: str
    is_open: bool = False
    content: Dict[str, Any] = field(default_factory=dict)
    form_data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)


class WorkflowModalService:
    """
    Service for managing workflow modals in the dashboard.

    Handles all modal operations including opening, closing, updating content,
    and managing form submissions with proper state tracking.
    """

    def __init__(self):
        """Initialize the WorkflowModalService."""
        self.modals: Dict[str, ModalState] = {}
        self.operations_count = 0
        self.errors_count = 0
        logger.info("✓ WorkflowModalService initialized")

    async def open_modal(
        self, modal_id: str, workflow_id: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Open a workflow modal with initial parameters.

        Args:
            modal_id: Unique identifier for the modal
            workflow_id: ID of the workflow to execute
            params: Initial parameters to pass to the modal

        Returns:
            Dictionary with modal state and metadata, or error info
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Opening modal: {modal_id} for workflow: {workflow_id}")

            # Create or get existing modal
            if modal_id in self.modals:
                logger.warning(f"⏳ Modal {modal_id} already exists, updating state")
                modal = self.modals[modal_id]
            else:
                modal = ModalState(modal_id=modal_id, workflow_id=workflow_id, content=params or {})
                self.modals[modal_id] = modal

            # Update modal state
            modal.is_open = True
            modal.last_updated = datetime.now()
            if params:
                modal.content.update(params)

            logger.info(f"✓ Modal {modal_id} opened successfully")

            return {
                "success": True,
                "modal_id": modal_id,
                "workflow_id": workflow_id,
                "is_open": True,
                "content": modal.content,
                "opened_at": modal.last_updated.isoformat(),
            }

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error opening modal {modal_id}: {e}", exc_info=True)
            return {"success": False, "error": str(e), "modal_id": modal_id}

    async def close_modal(self, modal_id: str) -> bool:
        """
        Close a workflow modal.

        Args:
            modal_id: ID of the modal to close

        Returns:
            True if modal was closed successfully, False otherwise
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Closing modal: {modal_id}")

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found")
                return False

            modal = self.modals[modal_id]
            modal.is_open = False
            modal.last_updated = datetime.now()

            logger.info(f"✓ Modal {modal_id} closed successfully")
            return True

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error closing modal {modal_id}: {e}", exc_info=True)
            return False

    async def update_modal_content(self, modal_id: str, content: Dict[str, Any]) -> bool:
        """
        Update the content of an open modal.

        Args:
            modal_id: ID of the modal to update
            content: New content to set in the modal

        Returns:
            True if content was updated successfully, False otherwise
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Updating content for modal: {modal_id}")

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found")
                return False

            modal = self.modals[modal_id]
            modal.content.update(content)
            modal.last_updated = datetime.now()

            logger.info(f"✓ Modal {modal_id} content updated successfully")
            return True

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error updating modal {modal_id}: {e}", exc_info=True)
            return False

    async def get_modal_state(self, modal_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current state of a modal.

        Args:
            modal_id: ID of the modal to get

        Returns:
            Dictionary with modal state or None if not found
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Getting state for modal: {modal_id}")

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found")
                return None

            modal = self.modals[modal_id]
            return {
                "modal_id": modal_id,
                "workflow_id": modal.workflow_id,
                "is_open": modal.is_open,
                "content": modal.content,
                "form_data": modal.form_data,
                "error": modal.error,
                "created_at": modal.created_at.isoformat(),
                "last_updated": modal.last_updated.isoformat(),
            }

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error getting modal state {modal_id}: {e}", exc_info=True)
            return None

    async def submit_modal_form(self, modal_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit form data from a modal.

        Args:
            modal_id: ID of the modal submitting the form
            form_data: Form data to submit

        Returns:
            Dictionary with submission result and any errors
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Submitting form for modal: {modal_id}")

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found")
                return {"success": False, "error": f"Modal {modal_id} not found"}

            modal = self.modals[modal_id]

            # Validate form data
            if not form_data:
                error_msg = "Form data is empty"
                logger.warning(f"⏳ {error_msg}")
                return {"success": False, "error": error_msg}

            # Store form data
            modal.form_data = form_data
            modal.last_updated = datetime.now()

            logger.info(f"✓ Form submitted for modal {modal_id}")

            return {
                "success": True,
                "modal_id": modal_id,
                "workflow_id": modal.workflow_id,
                "form_data": form_data,
                "submitted_at": modal.last_updated.isoformat(),
            }

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error submitting form for modal {modal_id}: {e}", exc_info=True)
            return {"success": False, "error": str(e), "modal_id": modal_id}

    async def handle_modal_error(self, modal_id: str, error: Exception) -> bool:
        """
        Handle and log an error that occurred in a modal.

        Args:
            modal_id: ID of the modal where error occurred
            error: Exception object from the error

        Returns:
            True if error was handled successfully, False otherwise
        """
        try:
            self.operations_count += 1
            error_msg = str(error)
            logger.error(f"✗ Error in modal {modal_id}: {error_msg}", exc_info=True)

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found for error handling")
                return False

            modal = self.modals[modal_id]
            modal.error = error_msg
            modal.last_updated = datetime.now()

            logger.info(f"✓ Error handled for modal {modal_id}")
            return True

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error handling error in modal {modal_id}: {e}", exc_info=True)
            return False

    async def clear_modal_errors(self, modal_id: str) -> bool:
        """
        Clear error state from a modal.

        Args:
            modal_id: ID of the modal to clear errors from

        Returns:
            True if errors were cleared successfully, False otherwise
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Clearing errors for modal: {modal_id}")

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found")
                return False

            modal = self.modals[modal_id]
            modal.error = None
            modal.last_updated = datetime.now()

            logger.info(f"✓ Errors cleared for modal {modal_id}")
            return True

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error clearing errors for modal {modal_id}: {e}", exc_info=True)
            return False

    async def delete_modal(self, modal_id: str) -> bool:
        """
        Delete a modal and clean up its resources.

        Args:
            modal_id: ID of the modal to delete

        Returns:
            True if modal was deleted successfully, False otherwise
        """
        try:
            self.operations_count += 1
            logger.info(f"✓ Deleting modal: {modal_id}")

            if modal_id not in self.modals:
                logger.warning(f"⏳ Modal {modal_id} not found")
                return False

            del self.modals[modal_id]

            logger.info(f"✓ Modal {modal_id} deleted successfully")
            return True

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error deleting modal {modal_id}: {e}", exc_info=True)
            return False

    async def list_open_modals(self) -> Dict[str, Any]:
        """
        Get a list of all currently open modals.

        Returns:
            Dictionary with list of open modal IDs and their states
        """
        try:
            self.operations_count += 1
            open_modals = {
                modal_id: {
                    "workflow_id": modal.workflow_id,
                    "is_open": modal.is_open,
                    "created_at": modal.created_at.isoformat(),
                }
                for modal_id, modal in self.modals.items()
                if modal.is_open
            }

            logger.info(f"✓ Retrieved {len(open_modals)} open modals")

            return {"count": len(open_modals), "modals": open_modals}

        except Exception as e:
            self.errors_count += 1
            logger.error(f"✗ Error listing open modals: {e}", exc_info=True)
            return {"count": 0, "modals": {}}

    async def get_service_stats(self) -> Dict[str, Any]:
        """
        Get service statistics and metrics.

        Returns:
            Dictionary with service metrics
        """
        return {
            "status": "healthy",
            "operations_count": self.operations_count,
            "errors_count": self.errors_count,
            "total_modals": len(self.modals),
            "open_modals": len([m for m in self.modals.values() if m.is_open]),
            "closed_modals": len([m for m in self.modals.values() if not m.is_open]),
        }

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check of the service.

        Returns:
            Dictionary with health status
        """
        try:
            stats = await self.get_service_stats()
            return {"healthy": True, "service": "WorkflowModalService", "stats": stats}
        except Exception as e:
            logger.error(f"✗ Health check failed: {e}", exc_info=True)
            return {"healthy": False, "service": "WorkflowModalService", "error": str(e)}


# Singleton instance
_instance: Optional[WorkflowModalService] = None


async def get_workflow_modal_service() -> WorkflowModalService:
    """
    Get or create the singleton WorkflowModalService instance.

    Returns:
        Global WorkflowModalService instance
    """
    global _instance
    if _instance is None:
        _instance = WorkflowModalService()
    return _instance


async def reset_workflow_modal_service() -> None:
    """Reset the singleton instance (for testing purposes)."""
    global _instance
    _instance = None
