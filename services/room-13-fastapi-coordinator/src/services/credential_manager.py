"""
Credential Manager Service
Handles encrypted credential storage, retrieval, and rotation
Integrates with Vault API (room-02-vault-api:8002)
"""

from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, JSON
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from datetime import datetime, timedelta
import os
import base64
from typing import Optional, List, Dict, Any
import logging
import httpx

logger = logging.getLogger(__name__)

# Vault API Configuration
VAULT_API_URL = os.getenv("VAULT_API_URL", "http://room-02-vault-api:8002")
VAULT_TIMEOUT = 30.0

class CredentialManager:
    """Manages encrypted credential storage and lifecycle with Vault API integration"""

    def __init__(self, db: Session, encryption_key: Optional[str] = None):
        self.db = db
        self.vault_url = VAULT_API_URL
        self.client = httpx.Client(base_url=self.vault_url, timeout=VAULT_TIMEOUT)
        
        key = encryption_key or os.getenv('ENCRYPTION_KEY', None)
        if not key:
            key = Fernet.generate_key().decode()
            logger.warning("ENCRYPTION_KEY not set, generated new key. Set env var for persistence!")
        self.cipher = Fernet(key.encode() if isinstance(key, str) else key)

    def encrypt_value(self, value: str) -> str:
        """Encrypt credential value using Fernet (AES-128)"""
        try:
            encrypted = self.cipher.encrypt(value.encode())
            return base64.b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise

    def decrypt_value(self, encrypted_value: str) -> str:
        """Decrypt credential value"""
        try:
            encrypted = base64.b64decode(encrypted_value.encode())
            decrypted = self.cipher.decrypt(encrypted)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise

    def create_credential(self, 
                         name: str,
                         credential_type: str,
                         service_name: str,
                         value: str,
                         description: Optional[str] = None,
                         metadata: Optional[Dict[str, Any]] = None,
                         expires_at: Optional[datetime] = None) -> Dict[str, Any]:
        """Create new credential with encryption"""
        
        encrypted_value = self.encrypt_value(value)
        
        credential = {
            'id': name,  # Use name as ID for simplicity
            'name': name,
            'credential_type': credential_type,
            'service_name': service_name,
            'encrypted_value': encrypted_value,
            'value': None,  # Don't return plaintext
            'description': description,
            'metadata': metadata or {},
            'expires_at': expires_at,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'last_used': None,
            'rotation_required': False,
            'rotation_count': 0
        }
        
        logger.info(f"Created credential: {name} for service: {service_name}")
        return credential

    def get_credential(self, credential_id: str, decrypt: bool = True) -> Optional[Dict[str, Any]]:
        """Retrieve credential from Vault API, optionally decrypted"""
        try:
            response = self.client.get(f"/api/secrets/{credential_id}")
            if response.status_code == 200:
                data = response.json()
                if decrypt and data.get("encrypted_value"):
                    data["value"] = self.decrypt_value(data["encrypted_value"])
                logger.info(f"Retrieved credential: {credential_id}")
                return data
            elif response.status_code == 404:
                logger.warning(f"Credential not found: {credential_id}")
                return None
            else:
                logger.error(f"Vault API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error getting credential {credential_id}: {e}")
            return None

    def get_service_credentials(self, service_name: str) -> List[Dict[str, Any]]:
        """Get all credentials for a specific service from Vault API"""
        try:
            response = self.client.get("/api/secrets", params={"service": service_name})
            if response.status_code == 200:
                credentials = response.json()
                logger.info(f"Retrieved {len(credentials)} credentials for service: {service_name}")
                return credentials
            else:
                logger.error(f"Vault API error: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error getting service credentials for {service_name}: {e}")
            return []

    def update_credential(self, credential_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update credential in Vault API"""
        try:
            payload = {}
            if "value" in kwargs:
                payload["value"] = kwargs["value"]
            if "metadata" in kwargs:
                payload["metadata"] = kwargs["metadata"]
            if "expires_at" in kwargs:
                payload["expires_at"] = kwargs["expires_at"]
            
            response = self.client.put(f"/api/secrets/{credential_id}", json=payload)
            if response.status_code == 200:
                logger.info(f"Updated credential: {credential_id}")
                return response.json()
            else:
                logger.error(f"Vault API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error updating credential {credential_id}: {e}")
            return None

    def delete_credential(self, credential_id: str) -> bool:
        """Delete credential from Vault API"""
        try:
            response = self.client.delete(f"/api/secrets/{credential_id}")
            if response.status_code == 200:
                logger.info(f"Deleted credential: {credential_id}")
                return True
            else:
                logger.error(f"Vault API error: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error deleting credential {credential_id}: {e}")
            return False

    def rotate_credential(self, credential_id: str, new_value: str) -> Optional[Dict[str, Any]]:
        """Rotate credential to new value in Vault API"""
        try:
            encrypted_value = self.encrypt_value(new_value)
            payload = {
                "value": new_value,
                "rotation_count": 1,
                "rotation_required": False
            }
            response = self.client.put(f"/api/secrets/{credential_id}", json=payload)
            if response.status_code == 200:
                logger.info(f"Rotated credential: {credential_id}")
                return response.json()
            else:
                logger.error(f"Vault API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error rotating credential {credential_id}: {e}")
            return None

    def check_expiration(self) -> List[str]:
        """Check for expired credentials in Vault API"""
        try:
            response = self.client.get("/api/secrets")
            if response.status_code == 200:
                credentials = response.json()
                expired = []
                now = datetime.utcnow()
                
                for cred in credentials:
                    if cred.get("expires_at"):
                        expires_at = datetime.fromisoformat(cred["expires_at"].replace('Z', '+00:00'))
                        if expires_at < now:
                            expired.append(cred.get("id", cred.get("name")))
                
                logger.info(f"Checked expiration: {len(expired)} expired credentials found")
                return expired
            else:
                logger.error(f"Vault API error: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error checking expiration: {e}")
            return []

    def audit_access(self, credential_id: str, service_name: str, action: str):
        """Log credential access for audit trail in Vault API"""
        try:
            log_entry = {
                'credential_id': credential_id,
                'service_name': service_name,
                'action': action,
                'timestamp': datetime.utcnow().isoformat()
            }
            response = self.client.post("/api/audit", json=log_entry)
            if response.status_code == 201:
                logger.info(f"Audit log recorded: {credential_id} - {action}")
                return response.json()
            else:
                logger.warning(f"Vault API audit endpoint not available: {response.status_code}")
                logger.info(f"Local audit log: {log_entry}")
                return log_entry
        except Exception as e:
            logger.error(f"Error recording audit log: {e}")
            return None
