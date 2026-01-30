"""
Antigravity Tools
Provides CLI and utility functions for antigravity plugin management
"""

import argparse
import json
import sys
from typing import Dict, List, Optional

from app.core.config import settings
from app.plugins.antigravity.antigravity_connector import antigravity_connector
from app.utils.logger import setup_logging

logger = setup_logging(__name__)


class AntigravityCLI:
    """Command line interface for antigravity plugin management"""

    def __init__(self):
        self.parser = self._create_parser()

    def _create_parser(self) -> argparse.ArgumentParser:
        """Create argument parser for CLI"""
        parser = argparse.ArgumentParser(
            description="Antigravity Plugin CLI",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  Add a new account:
    python antigravity_tools.py add-account --account-id my-account --api-token abc123 --base-url https://api.antigravity.dev

  List all accounts:
    python antigravity_tools.py list-accounts

  Switch to an account:
    python antigravity_tools.py switch-account --account-id my-account

  Test connection:
    python antigravity_tools.py test-connection
            """,
        )

        subparsers = parser.add_subparsers(dest="command", help="Available commands")

        # Add account command
        add_parser = subparsers.add_parser("add-account", help="Add a new antigravity account")
        add_parser.add_argument(
            "--account-id", required=True, help="Unique identifier for the account"
        )
        add_parser.add_argument("--api-token", required=True, help="API token for authentication")
        add_parser.add_argument(
            "--base-url", default="https://api.antigravity.dev", help="Base URL for the API"
        )

        # Remove account command
        remove_parser = subparsers.add_parser(
            "remove-account", help="Remove an antigravity account"
        )
        remove_parser.add_argument("--account-id", required=True, help="Account ID to remove")

        # List accounts command
        list_parser = subparsers.add_parser("list-accounts", help="List all configured accounts")

        # Switch account command
        switch_parser = subparsers.add_parser(
            "switch-account", help="Switch to a different account"
        )
        switch_parser.add_argument("--account-id", required=True, help="Account ID to switch to")

        # Get current account command
        current_parser = subparsers.add_parser(
            "get-current", help="Get information about the current account"
        )

        # Test connection command
        test_parser = subparsers.add_parser(
            "test-connection", help="Test connection to antigravity service"
        )

        return parser

    def run(self, args: Optional[List[str]] = None):
        """Run the CLI with provided arguments"""
        parsed_args = self.parser.parse_args(args)

        if not parsed_args.command:
            self.parser.print_help()
            return

        try:
            if parsed_args.command == "add-account":
                self._add_account(parsed_args)
            elif parsed_args.command == "remove-account":
                self._remove_account(parsed_args)
            elif parsed_args.command == "list-accounts":
                self._list_accounts()
            elif parsed_args.command == "switch-account":
                self._switch_account(parsed_args)
            elif parsed_args.command == "get-current":
                self._get_current_account()
            elif parsed_args.command == "test-connection":
                self._test_connection()
            else:
                print(f"Unknown command: {parsed_args.command}")
                self.parser.print_help()

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

    def _add_account(self, args):
        """Add a new account"""
        success = antigravity_connector.add_account(args.account_id, args.api_token, args.base_url)

        if success:
            print(f"✅ Account '{args.account_id}' added successfully")
        else:
            print(f"❌ Failed to add account '{args.account_id}'")

    def _remove_account(self, args):
        """Remove an account"""
        success = antigravity_connector.remove_account(args.account_id)

        if success:
            print(f"✅ Account '{args.account_id}' removed successfully")
        else:
            print(f"❌ Account '{args.account_id}' not found")

    def _list_accounts(self):
        """List all accounts"""
        accounts = antigravity_connector.list_accounts()

        if not accounts:
            print("No accounts configured")
            return

        print(f"Found {len(accounts)} account(s):")
        print()

        for account in accounts:
            status = "✅ Active" if account["is_active"] else "❌ Inactive"
            current = " (Current)" if account["is_current"] else ""
            last_used = account["last_used"] or "Never"

            print(f"Account ID: {account['account_id']}")
            print(f"  Base URL: {account['base_url']}")
            print(f"  Status: {status}")
            print(f"  Last Used: {last_used}")
            print(f"  Requests: {account['request_count']}")
            print(f"  {current}")
            print()

    def _switch_account(self, args):
        """Switch to a different account"""
        success = antigravity_connector.switch_account(args.account_id)

        if success:
            print(f"✅ Switched to account '{args.account_id}'")
        else:
            print(f"❌ Account '{args.account_id}' not found")

    def _get_current_account(self):
        """Get current account information"""
        account_info = antigravity_connector.get_current_account_info()

        if account_info:
            print("Current Account Information:")
            print(f"  Account ID: {account_info['account_id']}")
            print(f"  Base URL: {account_info['base_url']}")
            print(f"  Status: {'✅ Active' if account_info['is_active'] else '❌ Inactive'}")
            print(f"  Last Used: {account_info['last_used'] or 'Never'}")
            print(f"  Request Count: {account_info['request_count']}")
        else:
            print("❌ No current account set")

    def _test_connection(self):
        """Test connection to antigravity service"""
        success, message = antigravity_connector.test_connection()

        if success:
            print(f"✅ Connection successful: {message}")
        else:
            print(f"❌ Connection failed: {message}")


def print_account_config_template():
    """Print a template for account configuration"""
    template = {
        "accounts": [
            {
                "account_id": "your-account-id",
                "api_token": "your-api-token",
                "base_url": "https://api.antigravity.dev",
                "is_active": True,
                "last_used": None,
                "request_count": 0,
            }
        ],
        "current_account": "your-account-id",
    }

    print("Antigravity Account Configuration Template:")
    print(json.dumps(template, indent=2))


def validate_account_config(config_path: str) -> bool:
    """Validate an account configuration file"""
    try:
        with open(config_path, "r") as f:
            config = json.load(f)

        required_fields = ["accounts", "current_account"]
        for field in required_fields:
            if field not in config:
                print(f"❌ Missing required field: {field}")
                return False

        if not isinstance(config["accounts"], list):
            print("❌ Accounts must be a list")
            return False

        account_ids = set()
        for account in config["accounts"]:
            if "account_id" not in account:
                print("❌ Each account must have an account_id")
                return False

            if account["account_id"] in account_ids:
                print(f"❌ Duplicate account ID: {account['account_id']}")
                return False

            account_ids.add(account["account_id"])

        if config["current_account"] not in account_ids:
            print(f"❌ Current account '{config['current_account']}' not found in accounts list")
            return False

        print("✅ Configuration file is valid")
        return True

    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in configuration file: {e}")
        return False
    except Exception as e:
        print(f"❌ Error validating configuration: {e}")
        return False


def main():
    """Main entry point for CLI"""
    if len(sys.argv) > 1 and sys.argv[1] == "template":
        print_account_config_template()
    elif len(sys.argv) > 1 and sys.argv[1] == "validate":
        if len(sys.argv) < 3:
            print("Usage: python antigravity_tools.py validate <config_file>")
            sys.exit(1)
        config_file = sys.argv[2]
        if not validate_account_config(config_file):
            sys.exit(1)
    else:
        cli = AntigravityCLI()
        cli.run()


if __name__ == "__main__":
    main()
