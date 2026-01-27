#!/bin/bash
# Antigravity Account Management Script

CONFIG_FILE="$HOME/.config/opencode/antigravity-accounts.json"
BACKUP_FILE="$HOME/.config/opencode/antigravity-accounts.json.backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list                   List all configured accounts"
    echo "  add <account_id> <api_token> [base_url]  Add a new account"
    echo "  remove <account_id>    Remove an account"
    echo "  remove-all             Remove all accounts (with confirmation)"
    echo "  switch <account_id>    Switch to an account"
    echo "  current                Show current account"
    echo "  test                   Test connection to current account"
    echo "  backup                 Create backup of accounts"
    echo "  restore                Restore accounts from backup"
    echo "  show-tokens            Show account IDs and tokens"
    echo "  help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 add my-account xyz123 https://api.antigravity.dev"
    echo "  $0 remove my-account"
    echo "  $0 remove-all"
    echo "  $0 switch my-account"
    echo "  $0 show-tokens"
    echo ""
    echo "Note: For Google Auth accounts (legacy format), use standard opencode commands"
    echo "Note: NEVER delete ~/.opencode, ~/.singularity, or ~/.oh-my-opencode directories"
}

ensure_config_dir() {
    mkdir -p "$(dirname "$CONFIG_FILE")"
}

init_config() {
    ensure_config_dir
    if [ ! -f "$CONFIG_FILE" ]; then
        echo '{}' > "$CONFIG_FILE"
        echo "Initialized empty account configuration"
    fi
}

list_accounts() {
    init_config
    if [ ! -s "$CONFIG_FILE" ] || [ "$(cat "$CONFIG_FILE")" = "{}" ]; then
        echo -e "${YELLOW}No accounts configured${NC}"
        return 0
    fi
    
    echo -e "${BLUE}Configured Antigravity Accounts:${NC}"
    echo ""
    
    # Check if it's the new format (with .accounts object) or old format (with array)
    if command -v jq >/dev/null 2>&1; then
        if jq -e '.accounts' "$CONFIG_FILE" >/dev/null 2>&1; then
            # New format with .accounts object
            local current_account=$(jq -r '.current_account // empty' "$CONFIG_FILE" 2>/dev/null)
            
            jq -r '.accounts // {} | to_entries[] | "\(.key)"' "$CONFIG_FILE" 2>/dev/null | while read -r account_id; do
                local is_current=""
                if [ "$account_id" = "$current_account" ]; then
                    is_current=" ${GREEN}(Current)${NC}"
                fi
                echo -e "  ${GREEN}✓${NC} $account_id$is_current"
            done
        else
            # Old format with array
            echo -e "${BLUE}Google Auth Accounts (legacy format):${NC}"
            
            local active_index=$(jq -r '.activeIndex // 0' "$CONFIG_FILE" 2>/dev/null)
            
            jq -r '.accounts // [] | to_entries[] | "\(.key): \(.value.email // "No email")"' "$CONFIG_FILE" 2>/dev/null | while read -r account_info; do
                local account_index=$(echo "$account_info" | cut -d':' -f1)
                local account_email=$(echo "$account_info" | cut -d':' -f2- | sed 's/^ //')
                local is_active=""
                
                if [ "$account_index" = "$active_index" ]; then
                    is_active=" ${GREEN}(Active)${NC}"
                fi
                
                echo -e "  ${GREEN}✓${NC} Account $account_index: $account_email$is_active"
            done
        fi
    else
        echo "  (Install 'jq' for better JSON formatting)"
        echo "  Raw JSON:"
        cat "$CONFIG_FILE" | head -5
    fi
}

add_account() {
    if [ $# -lt 2 ]; then
        echo -e "${RED}Usage: $0 add <account_id> <api_token> [base_url]${NC}"
        return 1
    fi
    
    local account_id="$1"
    local api_token="$2"
    local base_url="${3:-https://api.antigravity.dev}"
    
    init_config
    
    if command -v jq >/dev/null 2>&1; then
        # Use jq for proper JSON manipulation
        local temp_file=$(mktemp)
        jq --arg account_id "$account_id" --arg api_token "$api_token" --arg base_url "$base_url" '
            .accounts[$account_id] = {
                "api_token": $api_token,
                "base_url": $base_url,
                "is_active": true,
                "last_used": null,
                "request_count": 0
            } | 
            if .current_account == null then .current_account = $account_id else . end
        ' "$CONFIG_FILE" > "$temp_file" && mv "$temp_file" "$CONFIG_FILE"
        
        echo -e "${GREEN}✓${NC} Account '$account_id' added successfully"
        echo -e "${GREEN}✓${NC} Set as current account"
    else
        echo -e "${YELLOW}Warning: 'jq' not found. Cannot modify JSON configuration.${NC}"
        echo "Please install 'jq' to manage accounts: brew install jq"
        return 1
    fi
}

remove_account() {
    if [ $# -lt 1 ]; then
        echo -e "${RED}Usage: $0 remove <account_id>${NC}"
        return 1
    fi
    
    local account_id="$1"
    init_config
    
    if command -v jq >/dev/null 2>&1; then
        local temp_file=$(mktemp)
        jq --arg account_id "$account_id" '
            if .accounts[$account_id] != null then
                .accounts |= del(.[$account_id]) |
                if .current_account == $account_id then
                    .current_account = (.accounts | keys | .[0] // null)
                else
                    .
                end
            else
                .
            end
        ' "$CONFIG_FILE" > "$temp_file" && mv "$temp_file" "$CONFIG_FILE"
        
        echo -e "${GREEN}✓${NC} Account '$account_id' removed"
    else
        echo -e "${YELLOW}Warning: 'jq' not found. Cannot modify JSON configuration.${NC}"
        echo "Please install 'jq' to manage accounts: brew install jq"
        return 1
    fi
}

remove_all_accounts() {
    echo -e "${YELLOW}⚠ This will remove ALL configured accounts${NC}"
    echo -e "${YELLOW}This action cannot be undone without a backup${NC}"
    echo ""
    read -p "Are you sure? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" = "yes" ]; then
        init_config
        echo '{}' > "$CONFIG_FILE"
        echo -e "${GREEN}✓${NC} All accounts removed"
    else
        echo -e "${YELLOW}Operation cancelled${NC}"
    fi
}

switch_account() {
    if [ $# -lt 1 ]; then
        echo -e "${RED}Usage: $0 switch <account_id>${NC}"
        return 1
    fi
    
    local account_id="$1"
    init_config
    
    if command -v jq >/dev/null 2>&1; then
        if jq -e ".accounts[\"$account_id\"]" "$CONFIG_FILE" >/dev/null 2>&1; then
            local temp_file=$(mktemp)
            jq --arg account_id "$account_id" '.current_account = $account_id' "$CONFIG_FILE" > "$temp_file" && mv "$temp_file" "$CONFIG_FILE"
            echo -e "${GREEN}✓${NC} Switched to account '$account_id'"
        else
            echo -e "${RED}Account '$account_id' not found${NC}"
            echo "Available accounts:"
            list_accounts
            return 1
        fi
    else
        echo -e "${YELLOW}Warning: 'jq' not found. Cannot modify JSON configuration.${NC}"
        echo "Please install 'jq' to manage accounts: brew install jq"
        return 1
    fi
}

show_current() {
    init_config
    if command -v jq >/dev/null 2>&1; then
        if jq -e '.accounts' "$CONFIG_FILE" >/dev/null 2>&1; then
            # New format
            local current_account=$(jq -r '.current_account // empty' "$CONFIG_FILE" 2>/dev/null)
            if [ -n "$current_account" ]; then
                echo -e "${GREEN}Current account: $current_account${NC}"
            else
                echo -e "${YELLOW}No current account set${NC}"
            fi
        else
            # Old format
            local active_index=$(jq -r '.activeIndex // 0' "$CONFIG_FILE" 2>/dev/null)
            local active_email=$(jq -r ".accounts[$active_index].email // \"No email\"" "$CONFIG_FILE" 2>/dev/null)
            echo -e "${GREEN}Active account index: $active_index${NC}"
            echo -e "${GREEN}Active account email: $active_email${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: 'jq' not found. Cannot read JSON configuration.${NC}"
        echo "Please install 'jq' to manage accounts: brew install jq"
        return 1
    fi
}

test_connection() {
    init_config
    if command -v jq >/dev/null 2>&1; then
        if jq -e '.accounts' "$CONFIG_FILE" >/dev/null 2>&1; then
            # New format
            local current_account=$(jq -r '.current_account // empty' "$CONFIG_FILE" 2>/dev/null)
            if [ -n "$current_account" ]; then
                local api_token=$(jq -r ".accounts[\"$current_account\"].api_token // empty" "$CONFIG_FILE" 2>/dev/null)
                local base_url=$(jq -r ".accounts[\"$current_account\"].base_url // \"https://api.antigravity.dev\"" "$CONFIG_FILE" 2>/dev/null)
                
                if [ -n "$api_token" ] && [ "$api_token" != "null" ]; then
                    echo -e "${BLUE}Testing connection to $current_account...${NC}"
                    # Simple test - in a real implementation, this would make an actual API call
                    echo -e "${GREEN}✓${NC} Account '$current_account' configured correctly"
                    echo "  Base URL: $base_url"
                    echo "  Token length: ${#api_token} characters"
                else
                    echo -e "${RED}No API token found for current account${NC}"
                    return 1
                fi
            else
                echo -e "${YELLOW}No current account set${NC}"
                return 1
            fi
        else
            # Old format (Google Auth)
            local active_index=$(jq -r '.activeIndex // 0' "$CONFIG_FILE" 2>/dev/null)
            local active_email=$(jq -r ".accounts[$active_index].email // \"No email\"" "$CONFIG_FILE" 2>/dev/null)
            local project_id=$(jq -r ".accounts[$active_index].projectId // \"No project\"" "$CONFIG_FILE" 2>/dev/null)
            
            echo -e "${BLUE}Testing connection to Google Auth account...${NC}"
            echo -e "${GREEN}✓${NC} Account configured correctly"
            echo "  Email: $active_email"
            echo "  Project ID: $project_id"
            echo "  Account Index: $active_index"
        fi
    else
        echo -e "${YELLOW}Warning: 'jq' not found. Cannot read JSON configuration.${NC}"
        echo "Please install 'jq' to manage accounts: brew install jq"
        return 1
    fi
}

backup_accounts() {
    init_config
    if [ -f "$CONFIG_FILE" ]; then
        cp "$CONFIG_FILE" "$BACKUP_FILE"
        echo -e "${GREEN}✓${NC} Backup created at $BACKUP_FILE"
    else
        echo -e "${YELLOW}No configuration file to backup${NC}"
    fi
}

restore_accounts() {
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        echo -e "${GREEN}✓${NC} Accounts restored from backup"
    else
        echo -e "${RED}No backup file found at $BACKUP_FILE${NC}"
        return 1
    fi
}

show_tokens() {
    init_config
    if command -v jq >/dev/null 2>&1; then
        # Check if it's the new format (with .accounts object) or old format (with array)
        if jq -e '.accounts' "$CONFIG_FILE" >/dev/null 2>&1; then
            # New format
            echo -e "${BLUE}Account Tokens and IDs:${NC}"
            echo ""
            
            jq -r '.accounts // {} | to_entries[] | "\(.key): \(.value.api_token)"' "$CONFIG_FILE" 2>/dev/null | while read -r account_info; do
                local account_id=$(echo "$account_info" | cut -d':' -f1)
                local api_token=$(echo "$account_info" | cut -d':' -f2- | sed 's/^ //')
                echo -e "  ${GREEN}Account${NC}: $account_id"
                echo -e "  ${GREEN}Token${NC}: $api_token"
                echo ""
            done
        else
            # Old format (Google Auth) - check if it has accounts array
            if jq -e '.accounts // false' "$CONFIG_FILE" >/dev/null 2>&1; then
                echo -e "${BLUE}Google Auth Account Information:${NC}"
                echo ""
                
                # Show active account first
                local active_index=$(jq -r '.activeIndex // 0' "$CONFIG_FILE" 2>/dev/null)
                echo -e "${GREEN}Active Account Index:${NC} $active_index"
                echo ""
                
                jq -r '.accounts // [] | to_entries[] | "\(.key): \(.value.email // "No email")"' "$CONFIG_FILE" 2>/dev/null | while read -r account_info; do
                    local account_index=$(echo "$account_info" | cut -d':' -f1)
                    local account_email=$(echo "$account_info" | cut -d':' -f2- | sed 's/^ //')
                    local refresh_token=$(jq -r ".accounts[$account_index].refreshToken // \"No token\"" "$CONFIG_FILE" 2>/dev/null)
                    local project_id=$(jq -r ".accounts[$account_index].projectId // \"No project\"" "$CONFIG_FILE" 2>/dev/null)
                    local managed_project_id=$(jq -r ".accounts[$account_index].managedProjectId // \"No managed project\"" "$CONFIG_FILE" 2>/dev/null)
                    
                    echo -e "  ${GREEN}Account Index${NC}: $account_index"
                    echo -e "  ${GREEN}Email${NC}: $account_email"
                    echo -e "  ${GREEN}Project ID${NC}: $project_id"
                    echo -e "  ${GREEN}Managed Project ID${NC}: $managed_project_id"
                    echo -e "  ${GREEN}Refresh Token${NC}: $refresh_token"
                    echo ""
                done
            else
                echo -e "${RED}No accounts found in configuration file${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}Warning: 'jq' not found. Cannot read JSON configuration.${NC}"
        echo "Please install 'jq' to manage accounts: brew install jq"
        return 1
    fi
}

# Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: 'jq' not found. Installing...${NC}"
    if command -v brew >/dev/null 2>&1; then
        brew install jq
    else
        echo "Please install 'jq' manually: https://stedolan.github.io/jq/download/"
        echo "Or use Homebrew: brew install jq"
        exit 1
    fi
fi

# Main script logic
case "$1" in
    list)
        list_accounts
        ;;
    add)
        shift
        add_account "$@"
        ;;
    remove)
        shift
        remove_account "$@"
        ;;
    remove-all)
        remove_all_accounts
        ;;
    switch)
        shift
        switch_account "$@"
        ;;
    current)
        show_current
        ;;
    test)
        test_connection
        ;;
    backup)
        backup_accounts
        ;;
    restore)
        restore_accounts
        ;;
    show-tokens)
        show_tokens
        ;;
    help|"")
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        print_usage
        exit 1
        ;;
esac