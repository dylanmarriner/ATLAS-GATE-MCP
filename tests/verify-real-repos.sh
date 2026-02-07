#!/bin/bash
set -e

# ATLAS-GATE-MCP Portability Verification Script

REPO_ROOT=$(pwd)
SERVER_BIN="$REPO_ROOT/bin/atlas-gate-mcp.js"

echo "=== ATLAS-GATE-MCP Portability Check ==="
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
    echo "Dir: ${context_dir}"
    
    if [ ! -d "$context_dir" ]; then
        echo "WARN: Directory $context_dir does not exist. Skipping."
        return 0
    fi

    cd "$context_dir"
    
    local output_file="/tmp/mcp_output_$(basename "$context_dir").txt"
    local error_file="/tmp/mcp_error_$(basename "$context_dir").txt"
    
    # Run server with a timeout to prevent hanging
    # We send a valid JSON-RPC initialize request
    echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
    timeout 5s "$SERVER_BIN" > "$output_file" 2> "$error_file" || true
    
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
    
    # Check log for auto-init
    if grep -q "Auto-initialized with repo root" "$error_file" || grep -q "Initialized with repo root" "$error_file"; then
         echo "PASS: Detected repo root"
         grep "repo root" "$error_file"
    else
         echo "WARN: Did not log repo detection (might be silent or standard error)"
         cat "$error_file"
    fi
    
    cd "$REPO_ROOT"
}

# Test Real Targets
test_context "/media/ubuntux/DEVELOPMENT/empire-ai" "Empire AI Repo"
test_context "/media/ubuntux/DEVELOPMENT/gemini_universe" "Gemini Universe Repo"

echo ""
echo "=== ALL TESTS COMPLETED ==="
