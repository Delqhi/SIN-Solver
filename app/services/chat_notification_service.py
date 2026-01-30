#!/usr/bin/env python3
"""
💬 CHAT NOTIFICATION SERVICE - Enterprise Messaging System
============================================================
Handles real-time notifications, error messages, and success updates
sent to users through the chat sidebar and notification channels.

Features:
- Message formatting with severity levels
- User context awareness
- Delivery tracking and status monitoring
- Integration with chat sidebar components
- Support for multiple notification types
"""

import logging
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import asyncio

logger = logging.getLogger("ChatNotificationService")


class NotificationType(str, Enum):
    """Notification type enumerations."""

    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"


class NotificationStatus(str, Enum):
    """Delivery status tracking."""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


class ChatNotification:
    """Internal notification object."""

    def __init__(
        self,
        message: str,
        notification_type: NotificationType,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        priority: int = 0,
    ):
        self.id = f"notif-{datetime.now().timestamp()}"
        self.message = message
        self.notification_type = notification_type
        self.user_id = user_id
        self.context = context or {}
        self.priority = priority
        self.status = NotificationStatus.PENDING
        self.created_at = datetime.now()
        self.sent_at: Optional[datetime] = None
        self.delivered_at: Optional[datetime] = None
        self.delivery_attempts = 0
        self.max_retries = 3

    def to_dict(self) -> Dict[str, Any]:
        """Convert notification to dictionary."""
        return {
            "id": self.id,
            "message": self.message,
            "type": self.notification_type.value,
            "user_id": self.user_id,
            "status": self.status.value,
            "context": self.context,
            "priority": self.priority,
            "created_at": self.created_at.isoformat(),
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
        }


class ChatNotificationService:
    """
    Enterprise chat notification service for real-time user messaging.
    """

    def __init__(self):
        """Initialize the notification service."""
        self.notifications: Dict[str, ChatNotification] = {}
        self.user_notifications: Dict[str, List[ChatNotification]] = {}
        self.delivery_queue: List[ChatNotification] = []
        logger.info("✓ Chat Notification Service initialized")

    async def send_notification(
        self,
        message: str,
        notification_type: NotificationType,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        priority: int = 0,
    ) -> Optional[str]:
        """
        Send a notification to a user.

        Args:
            message: Notification message text
            notification_type: Type of notification (info/success/warning/error/debug)
            user_id: Target user ID
            context: Additional context data
            priority: Priority level (higher = more urgent)

        Returns:
            Notification ID if successful, None on failure
        """
        try:
            notification = ChatNotification(
                message=message,
                notification_type=notification_type,
                user_id=user_id,
                context=context or {},
                priority=priority,
            )

            # Store notification
            self.notifications[notification.id] = notification

            # Add to user's notification list
            if user_id not in self.user_notifications:
                self.user_notifications[user_id] = []
            self.user_notifications[user_id].append(notification)

            # Add to delivery queue
            self.delivery_queue.append(notification)

            logger.info(
                f"✓ Notification created: {notification.id} "
                f"(type={notification_type.value}, user={user_id})"
            )

            # Attempt to send immediately
            await self._send_to_chat_sidebar(notification)

            return notification.id

        except Exception as e:
            logger.error(f"✗ Failed to create notification: {e}")
            return None

    async def send_error_notification(
        self,
        error: Exception,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        action: str = "operation",
    ) -> Optional[str]:
        """
        Send a formatted error notification.

        Args:
            error: The exception that occurred
            user_id: Target user ID
            context: Additional error context
            action: Action that was being performed

        Returns:
            Notification ID if successful
        """
        try:
            error_context = context or {}
            error_context.update(
                {"error_type": type(error).__name__, "error_message": str(error), "action": action}
            )

            message = f"❌ Error during {action}: {str(error)}"

            return await self.send_notification(
                message=message,
                notification_type=NotificationType.ERROR,
                user_id=user_id,
                context=error_context,
                priority=2,
            )

        except Exception as e:
            logger.error(f"✗ Failed to send error notification: {e}")
            return None

    async def send_success_notification(
        self,
        result: Any,
        user_id: str,
        action: str = "operation",
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Send a formatted success notification.

        Args:
            result: The successful result
            user_id: Target user ID
            action: Action that was completed
            context: Additional context

        Returns:
            Notification ID if successful
        """
        try:
            success_context = context or {}
            success_context.update({"result_type": type(result).__name__, "action": action})

            message = f"✅ {action.capitalize()} completed successfully"

            return await self.send_notification(
                message=message,
                notification_type=NotificationType.SUCCESS,
                user_id=user_id,
                context=success_context,
                priority=0,
            )

        except Exception as e:
            logger.error(f"✗ Failed to send success notification: {e}")
            return None

    async def send_captcha_solving_update(
        self,
        user_id: str,
        status: str,
        captcha_type: str,
        progress: int = 0,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Send CAPTCHA solving progress update.

        Args:
            user_id: Target user ID
            status: Current status (detecting/solving/verifying/completed)
            captcha_type: Type of CAPTCHA being solved
            progress: Progress percentage (0-100)
            context: Additional context

        Returns:
            Notification ID if successful
        """
        try:
            notif_context = context or {}
            notif_context.update(
                {"captcha_type": captcha_type, "progress": progress, "status": status}
            )

            status_emoji = {
                "detecting": "🔍",
                "solving": "🧩",
                "verifying": "✔️",
                "completed": "✅",
            }.get(status, "⏳")

            message = (
                f"{status_emoji} {captcha_type.upper()}: {status.replace('_', ' ')} ({progress}%)"
            )

            return await self.send_notification(
                message=message,
                notification_type=NotificationType.INFO,
                user_id=user_id,
                context=notif_context,
                priority=1,
            )

        except Exception as e:
            logger.error(f"✗ Failed to send CAPTCHA update: {e}")
            return None

    async def _send_to_chat_sidebar(self, notification: ChatNotification) -> bool:
        """
        Send notification to chat sidebar component.

        Args:
            notification: The notification to send

        Returns:
            True if sent successfully
        """
        try:
            # Simulate sending to chat sidebar
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.now()
            notification.delivery_attempts += 1

            # Simulate delivery with small delay
            await asyncio.sleep(0.01)

            notification.status = NotificationStatus.DELIVERED
            notification.delivered_at = datetime.now()

            logger.info(
                f"✓ Notification sent to chat sidebar: {notification.id} "
                f"(user={notification.user_id}, type={notification.notification_type.value})"
            )

            return True

        except Exception as e:
            logger.error(f"✗ Failed to send to chat sidebar: {e}")
            notification.status = NotificationStatus.FAILED
            return False

    async def track_delivery_status(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """
        Get delivery status of a notification.

        Args:
            notification_id: ID of notification to track

        Returns:
            Delivery status information
        """
        try:
            if notification_id not in self.notifications:
                logger.warning(f"⚠️ Notification not found: {notification_id}")
                return None

            notification = self.notifications[notification_id]

            return {
                "notification_id": notification_id,
                "status": notification.status.value,
                "user_id": notification.user_id,
                "message": notification.message,
                "type": notification.notification_type.value,
                "created_at": notification.created_at.isoformat(),
                "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
                "delivered_at": notification.delivered_at.isoformat()
                if notification.delivered_at
                else None,
                "delivery_attempts": notification.delivery_attempts,
                "max_retries": notification.max_retries,
            }

        except Exception as e:
            logger.error(f"✗ Failed to track delivery: {e}")
            return None

    async def get_user_notifications(
        self, user_id: str, limit: int = 50, notification_type: Optional[NotificationType] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all notifications for a user.

        Args:
            user_id: Target user ID
            limit: Maximum number of notifications to return
            notification_type: Filter by notification type (optional)

        Returns:
            List of user's notifications
        """
        try:
            if user_id not in self.user_notifications:
                return []

            notifications = self.user_notifications[user_id]

            # Filter by type if specified
            if notification_type:
                notifications = [
                    n for n in notifications if n.notification_type == notification_type
                ]

            # Return most recent notifications first, up to limit
            notifications = notifications[-limit:][::-1]

            return [n.to_dict() for n in notifications]

        except Exception as e:
            logger.error(f"✗ Failed to get user notifications: {e}")
            return []

    async def clear_user_notifications(
        self, user_id: str, notification_type: Optional[NotificationType] = None
    ) -> int:
        """
        Clear user's notifications.

        Args:
            user_id: Target user ID
            notification_type: Clear only specific type (optional)

        Returns:
            Number of notifications cleared
        """
        try:
            if user_id not in self.user_notifications:
                return 0

            if notification_type:
                cleared = [
                    n
                    for n in self.user_notifications[user_id]
                    if n.notification_type == notification_type
                ]
            else:
                cleared = self.user_notifications[user_id][:]
                self.user_notifications[user_id] = []

            cleared_count = len(cleared)

            logger.info(f"✓ Cleared {cleared_count} notifications for user {user_id}")

            return cleared_count

        except Exception as e:
            logger.error(f"✗ Failed to clear notifications: {e}")
            return 0

    async def get_service_stats(self) -> Dict[str, Any]:
        """
        Get service statistics.

        Returns:
            Service metrics and statistics
        """
        try:
            total_notifications = len(self.notifications)
            sent_notifications = sum(
                1 for n in self.notifications.values() if n.status == NotificationStatus.SENT
            )
            delivered_notifications = sum(
                1 for n in self.notifications.values() if n.status == NotificationStatus.DELIVERED
            )
            failed_notifications = sum(
                1 for n in self.notifications.values() if n.status == NotificationStatus.FAILED
            )

            return {
                "total_notifications": total_notifications,
                "sent": sent_notifications,
                "delivered": delivered_notifications,
                "failed": failed_notifications,
                "total_users": len(self.user_notifications),
                "pending_in_queue": len(self.delivery_queue),
                "status": "healthy" if failed_notifications == 0 else "degraded",
            }

        except Exception as e:
            logger.error(f"✗ Failed to get service stats: {e}")
            return {"status": "error", "error": str(e)}


# Singleton instance
_instance: Optional[ChatNotificationService] = None


async def get_chat_notification_service() -> ChatNotificationService:
    """
    Get or create singleton instance of the service.

    Returns:
        ChatNotificationService instance
    """
    global _instance
    if _instance is None:
        _instance = ChatNotificationService()
    return _instance
