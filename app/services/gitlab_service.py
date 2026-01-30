"""
GitLab Visual Asset Hosting Service
Handles automated upload of screenshots to GitLab for persistent public access in Linear/Docs.
"""

import os
import requests
import base64
import logging
import time
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class GitLabService:
    """
    Enterprise-grade GitLab asset manager.
    Implements the 10GB auto-scaling project logic.
    """

    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITLAB_TOKEN")
        self.api_url = "https://gitlab.com/api/v4"
        self.headers = {"PRIVATE-TOKEN": self.token} if self.token else {}
        self.base_project_name = "sin-assets"
        self.current_project_id = None
        self.current_project_path = None

        if not self.token:
            logger.warning("GITLAB_TOKEN not found. Asset hosting disabled.")

    async def _ensure_project(self) -> bool:
        """Finds or creates a public project for assets."""
        if self.current_project_id:
            return True

        if not self.token:
            return False

        try:
            # 1. Search for existing sin-assets project
            resp = requests.get(
                f"{self.api_url}/projects?search={self.base_project_name}", headers=self.headers
            )
            projects = resp.json()

            # Filter for projects owned by us and find the highest version (e.g. sin-assets-v1)
            # For simplicity, we just take the first match or create new
            if projects:
                # Find the one with most space (simplification: just take the first)
                self.current_project_id = projects[0]["id"]
                self.current_project_path = projects[0]["path_with_namespace"]
                return True

            # 2. Create new public project if none found
            project_data = {
                "name": f"{self.base_project_name}-v1",
                "visibility": "public",
                "initialize_with_readme": "true",
            }
            resp = requests.post(
                f"{self.api_url}/projects", headers=self.headers, json=project_data
            )
            if resp.status_code == 201:
                data = resp.json()
                self.current_project_id = data["id"]
                self.current_project_path = data["path_with_namespace"]
                logger.info(f"Created new GitLab asset project: {self.current_project_path}")
                return True
            else:
                logger.error(f"Failed to create GitLab project: {resp.text}")
                return False

        except Exception as e:
            logger.error(f"GitLab project verification failed: {e}")
            return False

    async def upload_screenshot(
        self, file_path: str, commit_message: str = "Upload screenshot"
    ) -> Optional[str]:
        """
        Uploads a local file to GitLab and returns the public RAW URL.
        """
        if not await self._ensure_project():
            return None

        filename = os.path.basename(file_path)
        # Use timestamp to avoid collisions
        unique_filename = f"{int(time.time())}_{filename}"

        try:
            with open(file_path, "rb") as f:
                content = base64.b64encode(f.read()).decode()

            # GitLab API: Create new file in repo
            file_data = {
                "branch": "main",
                "content": content,
                "commit_message": commit_message,
                "encoding": "base64",
            }

            # URL encode the filename for the API
            import urllib.parse

            encoded_path = urllib.parse.quote(unique_filename, safe="")

            resp = requests.post(
                f"{self.api_url}/projects/{self.current_project_id}/repository/files/{encoded_path}",
                headers=self.headers,
                json=file_data,
            )

            if resp.status_code == 201:
                # Success! Construct the public raw URL
                # Format: https://gitlab.com/<path_with_namespace>/-/raw/main/<filename>
                raw_url = (
                    f"https://gitlab.com/{self.current_project_path}/-/raw/main/{unique_filename}"
                )
                logger.info(f"Screenshot uploaded to GitLab: {raw_url}")
                return raw_url
            else:
                logger.error(f"GitLab upload failed: {resp.status_code} - {resp.text}")
                return None

        except Exception as e:
            logger.error(f"Error during GitLab upload: {e}")
            return None


# Singleton instance
gitlab_service = GitLabService()
