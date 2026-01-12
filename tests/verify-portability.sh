#!/bin/bash
set -e

# KAIZA-MCP Portability Verification Script

REPO_ROOT=$(pwd)
SERVER_BIN="$REPO_ROOT/bin/kaiza-mcp.js"

echo "=== KAIZA-MCP Portability Check ==="
echo "Repo Root: $REPO_ROOT"
echo "Server Bin: $SERVER_BIN"

# Ensure bin exists
if [ ! -f "$SERVER_BIN" ]; then
    echo "ERROR: Binary not found at $SERVER_BIN"
    exit 1
fi

chmod +x "$SERVER_BIN"

# Function to test server startup in a specific directory
test_context() {
    local context_dir="$1"
    local description="$2"
    
    echo "--- Testing Context: $description ---"
    echo "Dir: $context_dir"
    
    mkdir -p "$context_dir"
    cd "$context_dir"
    
    # Send a basic JSON-RPC initialization request
    # expect the server to *not* crash and ideally respond
    # We pipe input and capture stderr/stdout
    
    local output_file="$context_dir/mcp_output.txt"
    local error_file="$context_dir/mcp_error.txt"
    
    # Run server with a timeout to prevent hanging
    # We send a valid JSON-RPC initialize request
    # Input: {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
    
    echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
    timeout 2s "$SERVER_BIN" > "$output_file" 2> "$error_file" || true
    
    # Check if server crashed (non-zero exit not due to timeout)
    # timeout returns 124 on timeout. standard exit is 0. crash is other.
    # Actually, we want it to respond.
    
    if grep -q "jsonrpc" "$output_file"; then
        echo "PASS: Server responded with JSON-RPC"
    else
        echo "FAIL: Server did not respond with JSON-RPC"
        echo "Output:"
        cat "$output_file"
        echo "Errors:"
        cat "$error_file"
        return 1
    fi
    
    # Check if it detected a repo root (if expected)
    if [ "$description" == "Nested inside Repo" ]; then
        if grep -q "Auto-initialized with repo root" "$error_file"; then
             echo "PASS: Detected repo root"
        else
             echo "WARN: Did not log repo detection (might be silent or standard error)"
        fi
    fi
    
    # Clean up
    cd "$REPO_ROOT"
}

# Scenario 1: Empty Directory (No Repo)
# It should treat this as a repo root or fallback
TEST_DIR_1=$(mktemp -d)
test_context "$TEST_DIR_1" "Empty Directory"

# Scenario 2: Nested inside this repo
# It should detect THIS repo root
TEST_DIR_2="$REPO_ROOT/tests/temp/nested/deep"
mkdir -p "$TEST_DIR_2"
test_context "$TEST_DIR_2" "Nested inside Repo"

echo ""
echo "=== ALL TESTS PASSED ==="
rm -rf "$TEST_DIR_1"
rm -rf "$REPO_ROOT/tests/temp"
