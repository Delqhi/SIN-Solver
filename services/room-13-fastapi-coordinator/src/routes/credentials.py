"""
Credentials Management Routes
Endpoints for creating, retrieving, updating, and rotating encrypted credentials
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
import logging

from src.models import CredentialCreate, CredentialResponse, CredentialUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


async def get_credential_manager():
    """Dependency injection for credential manager"""
    from src.main import credential_mgr
    if not credential_mgr:
        raise HTTPException(status_code=503, detail="Credential manager not available")
    return credential_mgr


@router.post("", response_model=CredentialResponse, status_code=status.HTTP_201_CREATED)
async def create_credential(
    credential: CredentialCreate,
    credential_mgr=Depends(get_credential_manager)
):
    """Create a new encrypted credential"""
    try:
        # Validate credential type
        valid_types = ["api_key", "password", "token", "connection_string", "oauth2", "custom"]
        if credential.credential_type not in valid_types:
            raise ValueError(f"Invalid credential type. Must be one of: {', '.join(valid_types)}")
        
        # Create credential with encryption
        cred = credential_mgr.create_credential(
            name=credential.name,
            credential_type=credential.credential_type,
            service_name=credential.service_name,
            value=credential.value,
            description=credential.description,
            metadata=credential.metadata,
            expires_at=credential.expires_at
        )
        
        logger.info(f"Created credential '{credential.name}' for service '{credential.service_name}'")
        return CredentialResponse(**cred)
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to create credential")


@router.get("/{credential_id}", response_model=CredentialResponse)
async def get_credential(
    credential_id: str,
    credential_mgr=Depends(get_credential_manager)
):
    """Get a specific credential by ID (decrypted on-the-fly)"""
    try:
        cred = credential_mgr.get_credential(credential_id)
        if not cred:
            raise HTTPException(status_code=404, detail=f"Credential not found: {credential_id}")
        
        logger.info(f"Retrieved credential {credential_id}")
        return CredentialResponse(**cred)
    except Exception as e:
        logger.error(f"Error retrieving credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve credential")


@router.get("/service/{service_name}", response_model=List[dict])
async def get_service_credentials(
    service_name: str,
    credential_mgr=Depends(get_credential_manager)
):
    """Get all credentials for a specific service"""
    try:
        creds = credential_mgr.get_service_credentials(service_name)
        
        # Return metadata only (not decrypted values) unless explicitly requested
        safe_creds = [
            {
                "id": cred.get("id"),
                "name": cred.get("name"),
                "credential_type": cred.get("credential_type"),
                "service_name": cred.get("service_name"),
                "description": cred.get("description"),
                "expires_at": cred.get("expires_at"),
                "created_at": cred.get("created_at")
            }
            for cred in creds
        ]
        
        logger.info(f"Retrieved {len(safe_creds)} credentials for service '{service_name}'")
        return safe_creds
    except Exception as e:
        logger.error(f"Error listing service credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to list credentials")


@router.patch("/{credential_id}", response_model=CredentialResponse)
async def update_credential(
    credential_id: str,
    update_data: CredentialUpdate,
    credential_mgr=Depends(get_credential_manager)
):
    """Update a credential (name, description, or metadata)"""
    try:
        cred = credential_mgr.get_credential(credential_id)
        if not cred:
            raise HTTPException(status_code=404, detail=f"Credential not found: {credential_id}")
        
        # Update allowed fields only
        update_dict = {}
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.description is not None:
            update_dict["description"] = update_data.description
        if update_data.metadata is not None:
            update_dict["metadata"] = update_data.metadata
        
        if not update_dict:
            return CredentialResponse(**cred)
        
        # Apply updates
        for key, value in update_dict.items():
            cred[key] = value
        cred["updated_at"] = datetime.utcnow()
        
        logger.info(f"Updated credential {credential_id}")
        return CredentialResponse(**cred)
    except Exception as e:
        logger.error(f"Error updating credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to update credential")


@router.post("/{credential_id}/rotate", response_model=CredentialResponse)
async def rotate_credential(
    credential_id: str,
    new_value: str,
    credential_mgr=Depends(get_credential_manager)
):
    """Rotate a credential value (create new encrypted version)"""
    try:
        cred = credential_mgr.get_credential(credential_id)
        if not cred:
            raise HTTPException(status_code=404, detail=f"Credential not found: {credential_id}")
        
        # Validate new value is not empty
        if not new_value or not new_value.strip():
            raise ValueError("New credential value cannot be empty")
        
        # Update with new encrypted value
        cred["value"] = credential_mgr.encrypt_value(new_value)
        cred["rotated_at"] = datetime.utcnow()
        cred["updated_at"] = datetime.utcnow()
        
        logger.info(f"Rotated credential {credential_id}")
        return CredentialResponse(**cred)
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error rotating credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to rotate credential")


@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    credential_id: str,
    credential_mgr=Depends(get_credential_manager)
):
    """Delete a credential"""
    try:
        cred = credential_mgr.get_credential(credential_id)
        if not cred:
            raise HTTPException(status_code=404, detail=f"Credential not found: {credential_id}")
        
        # Mark as deleted or remove
        credential_mgr.delete_credential(credential_id)
        
        logger.info(f"Deleted credential {credential_id}")
        return None
    except Exception as e:
        logger.error(f"Error deleting credential: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete credential")


@router.get("/{credential_id}/audit", response_model=List[dict])
async def get_credential_audit_log(
    credential_id: str,
    credential_mgr=Depends(get_credential_manager)
):
    """Get audit log for a credential"""
    try:
        cred = credential_mgr.get_credential(credential_id)
        if not cred:
            raise HTTPException(status_code=404, detail=f"Credential not found: {credential_id}")
        
        audit_log = credential_mgr.get_audit_log(credential_id)
        
        logger.info(f"Retrieved audit log for credential {credential_id}")
        return audit_log or []
    except Exception as e:
        logger.error(f"Error retrieving audit log: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit log")
