#!/bin/bash

# ATLAS-GATE MCP - Antigravity Setup Script
# This script automates the setup process for writing plans with Antigravity

set -e

echo "=========================================="
echo "ATLAS-GATE MCP Antigravity Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if script is run from repo root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: script must be run from repository root${NC}"
    echo "Run: cd /path/to/ATLAS-GATE-MCP-server && bash setup-antigravity.sh"
    exit 1
fi

echo "Step 1: Check Node.js installation"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Install from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"
echo ""

echo "Step 2: Install dependencies"
if [ -d "node_modules" ]; then
    echo "Node modules already installed"
else
    echo "Installing npm packages..."
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi
echo ""

echo "Step 3: Generate bootstrap secret"
echo ""
if [ -z "$ATLAS-GATE_BOOTSTRAP_SECRET" ]; then
    echo "Generating a cryptographically random 32-byte secret..."
    BOOTSTRAP_SECRET=$(openssl rand -base64 32)
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to generate secret. Is OpenSSL installed?${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Bootstrap secret already set in environment${NC}"
    BOOTSTRAP_SECRET=$ATLAS-GATE_BOOTSTRAP_SECRET
fi

echo -e "${GREEN}Bootstrap Secret (first 8 chars): ${BOOTSTRAP_SECRET:0:8}...${NC}"
echo ""

echo "Step 4: Create .env file"
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
        # Use existing secret from .env if available
        if [ -z "$ATLAS-GATE_BOOTSTRAP_SECRET" ]; then
            BOOTSTRAP_SECRET=$(grep "ATLAS-GATE_BOOTSTRAP_SECRET=" .env | cut -d= -f2 | tr -d ' ')
        fi
    else
        cp .env.example .env
        # Update the secret
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^ATLAS-GATE_BOOTSTRAP_SECRET=.*/ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET/" .env
        else
            sed -i "s/^ATLAS-GATE_BOOTSTRAP_SECRET=.*/ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET/" .env
        fi
        echo -e "${GREEN}✓ .env file created${NC}"
        chmod 600 .env
        echo -e "${GREEN}✓ .env permissions restricted${NC}"
    fi
else
    cp .env.example .env
    # Update the secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^ATLAS-GATE_BOOTSTRAP_SECRET=.*/ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET/" .env
    else
        sed -i "s/^ATLAS-GATE_BOOTSTRAP_SECRET=.*/ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET/" .env
    fi
    echo -e "${GREEN}✓ .env file created${NC}"
    chmod 600 .env
    echo -e "${GREEN}✓ .env permissions restricted (mode 600)${NC}"
fi
echo ""

echo "Step 5: Load environment"
export ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET
echo -e "${GREEN}✓ Bootstrap secret loaded into environment${NC}"
echo ""

echo "Step 6: Run verification suite"
echo "Running npm run verify..."
npm run verify > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All verification tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some verification tests failed${NC}"
    echo "Run 'npm run verify' to see details"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""

echo "Next steps:"
echo ""
echo "1. Load the environment in your shell:"
echo "   source .env"
echo ""
echo "2. Verify Antigravity can access ATLAS-GATE:"
echo "   node bin/atlas-gate-mcp-antigravity.js"
echo ""
echo "3. Configure Antigravity client with MCP server:"
echo "   Add to ~/.config/antigravity/mcp_config.json (or your client's config):"
echo "   {"
echo "     \"mcpServers\": {"
echo "       \"atlas-gate\": {"
echo "         \"command\": \"node\","
echo "         \"args\": [\"$(pwd)/bin/atlas-gate-mcp-antigravity.js\"],"
echo "         \"type\": \"stdio\""
echo "       }"
echo "     }"
echo "   }"
echo ""
echo "4. Start writing plans! Use the MCP tools in Antigravity:"
echo "   - bootstrap_create_foundation_plan (first plan only)"
echo "   - create_plan (subsequent plans)"
echo "   - list_plans"
echo "   - validate_plan"
echo ""
echo "For more information:"
echo "   - ANTIGRAVITY_SETUP.md (setup guide)"
echo "   - docs/BOOTSTRAP_SECRET_GUIDE.md (bootstrap details)"
echo "   - docs/MCP_QUICK_REFERENCE.md (MCP tools reference)"
echo ""
