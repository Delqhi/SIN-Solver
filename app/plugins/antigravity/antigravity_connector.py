"""
Antigravity Connector - Account Management
Handles authentication and API communication with antigravity services
"""
import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

import httpx
from cryptography.fernet import Fernet

from app.core.config import settings

logger = logging.getLogger(__name__)


class AntigravityAccount:
    """Individual antigravity account configuration"""
    
    def __init__(self, account_id: str, api_token: str, base_url: str = "https://api.antigravity.dev"):
        self.account_id = account_id
        self.api_token = api_token
        self.base_url = base_url.rstrip('/')
        self.is_active = True
        self.last_used = None
        self.request_count = 0
        
    def to_dict(self) -> Dict:
        """Convert account to dictionary for serialization"""
        return {
            'account_id': self.account_id,
            'api_token': self.api_token,
            'base_url': self.base_url,
            'is_active': self.is_active,
            'last_used': self.last_used,
            'request_count': self.request_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AntigravityAccount':
        """Create account from dictionary"""
        account = cls(
            account_id=data['account_id'],
            api_token=data['api_token'],
            base_url=data.get('base_url', 'https://api.antigravity.dev')
        )
        account.is_active = data.get('is_active', True)
        account.last_used = data.get('last_used')
        account.request_count = data.get('request_count', 0)
        return account


class AntigravityConnector:
    """Main connector for antigravity services with account management"""
    
    def __init__(self):
        self.accounts: Dict[str, AntigravityAccount] = {}
        self.current_account: Optional[str] = None
        self.encryption_key: Optional[bytes] = None
        self.config_file = os.path.join(settings.config_dir, 'antigravity_accounts.json')
        self._load_encryption_key()
        self._load_accounts()
    
    def _load_encryption_key(self):
        """Load or generate encryption key for account tokens"""
        key_file = os.path.join(settings.config_dir, 'antigravity.key')
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                self.encryption_key = f.read()
        else:
            self.encryption_key = Fernet.generate_key()
            os.makedirs(settings.config_dir, exist_ok=True)
            with open(key_file, 'wb') as f:
                f.write(self.encryption_key)
            os.chmod(key_file, 0o600)  # Secure file permissions
    
    def _encrypt_token(self, token: str) -> str:
        """Encrypt API token"""
        if self.encryption_key is None:
            raise RuntimeError("Encryption key not initialized")
        cipher = Fernet(self.encryption_key)
        return cipher.encrypt(token.encode()).decode()
    
    def _decrypt_token(self, encrypted_token: str) -> str:
        """Decrypt API token"""
        if self.encryption_key is None:
            raise RuntimeError("Encryption key not initialized")
        cipher = Fernet(self.encryption_key)
        return cipher.decrypt(encrypted_token.encode()).decode()
    
    def add_account(self, account_id: str, api_token: str, base_url: str = "https://api.antigravity.dev") -> bool:
        """Add a new antigravity account"""
        try:
            # Validate account by making a test request
            test_connector = AntigravityAccount(account_id, api_token, base_url)
            test_response = self._make_api_request('GET', '/health', test_connector)
            
            if test_response and test_response.status_code == 200:
                encrypted_token = self._encrypt_token(api_token)
                account = AntigravityAccount(account_id, encrypted_token, base_url)
                self.accounts[account_id] = account
                
                # Set as current account if this is the first account
                if not self.current_account:
                    self.current_account = account_id
                
                self._save_accounts()
                logger.info(f"Added new antigravity account: {account_id}")
                return True
            else:
                logger.error(f"Failed to validate antigravity account: {account_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding antigravity account {account_id}: {e}")
            return False
    
    def remove_account(self, account_id: str) -> bool:
        """Remove an antigravity account"""
        if account_id in self.accounts:
            del self.accounts[account_id]
            if self.current_account == account_id:
                self.current_account = next(iter(self.accounts)) if self.accounts else None
            self._save_accounts()
            logger.info(f"Removed antigravity account: {account_id}")
            return True
        return False
    
    def list_accounts(self) -> List[Dict]:
        """List all configured accounts"""
        accounts_info = []
        for account_id, account in self.accounts.items():
            accounts_info.append({
                'account_id': account_id,
                'base_url': account.base_url,
                'is_active': account.is_active,
                'last_used': account.last_used,
                'request_count': account.request_count,
                'is_current': account_id == self.current_account
            })
        return accounts_info
    
    def switch_account(self, account_id: str) -> bool:
        """Switch to a different account"""
        if account_id in self.accounts:
            self.current_account = account_id
            self._save_accounts()
            logger.info(f"Switched to antigravity account: {account_id}")
            return True
        return False
    
    def get_current_account_info(self) -> Optional[Dict]:
        """Get current account information"""
        if self.current_account and self.current_account in self.accounts:
            account = self.accounts[self.current_account]
            return {
                'account_id': account.account_id,
                'base_url': account.base_url,
                'is_active': account.is_active,
                'last_used': account.last_used,
                'request_count': account.request_count
            }
        return None
    
    def _load_accounts(self):
        """Load accounts from configuration file"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    data = json.load(f)
                
                for account_data in data.get('accounts', []):
                    # Decrypt the token
                    encrypted_token = account_data['api_token']
                    decrypted_token = self._decrypt_token(encrypted_token)
                    account_data['api_token'] = decrypted_token
                    
                    account = AntigravityAccount.from_dict(account_data)
                    self.accounts[account.account_id] = account
                
                self.current_account = data.get('current_account')
                logger.info(f"Loaded {len(self.accounts)} antigravity accounts")
                
            except Exception as e:
                logger.error(f"Error loading antigravity accounts: {e}")
    
    def _save_accounts(self):
        """Save accounts to configuration file"""
        try:
            accounts_data = {
                'accounts': [account.to_dict() for account in self.accounts.values()],
                'current_account': self.current_account
            }
            
            os.makedirs(settings.config_dir, exist_ok=True)
            with open(self.config_file, 'w') as f:
                json.dump(accounts_data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving antigravity accounts: {e}")
    
    def _get_current_account(self) -> Optional[AntigravityAccount]:
        """Get the current active account with decrypted token"""
        if not self.current_account or self.current_account not in self.accounts:
            return None
        
        account = self.accounts[self.current_account]
        # Decrypt the token for use
        account.api_token = self._decrypt_token(account.api_token)
        return account
    
    def _make_api_request(self, method: str, endpoint: str, account: Optional[AntigravityAccount] = None) -> Optional[httpx.Response]:
        """Make API request to antigravity service"""
        if not account:
            account = self._get_current_account()
        
        if not account or not account.is_active:
            logger.error("No active antigravity account available")
            return None
        
        url = urljoin(account.base_url, endpoint)
        headers = {
            'Authorization': f'Bearer {account.api_token}',
            'User-Agent': 'SIN-Solver/1.0',
            'Content-Type': 'application/json'
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.request(method, url, headers=headers)
                account.last_used = datetime.now(timezone.utc).isoformat()
                account.request_count += 1
                self._save_accounts()
                return response
                
        except Exception as e:
            logger.error(f"API request failed for account {account.account_id}: {e}")
            return None
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Test connection to antigravity service"""
        try:
            response = self._make_api_request('GET', '/health')
            if response and response.status_code == 200:
                return True, "Connection successful"
            else:
                return False, f"Connection failed with status: {response.status_code if response else 'No response'}"
        except Exception as e:
            return False, f"Connection error: {str(e)}"


# Global connector instance
antigravity_connector = AntigravityConnector()