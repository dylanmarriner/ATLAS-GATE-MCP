#!/bin/bash
# Setup Bootstrap Secret for ATLAS-GATE MCP
# This script generates and configures the bootstrap secret for your workspace

set -e

echo "=========================================="
echo "ATLAS-GATE MCP Bootstrap Secret Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if script is run from repo root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: script must be run from repository root${NC}"
    echo "Run: cd /path/to/ATLAS-GATE-MCP-server && bash scripts/setup-bootstrap.sh"
    exit 1
fi

echo "Step 1: Check current bootstrap secret status"
echo ""

if [ -z "$ATLAS-GATE_BOOTSTRAP_SECRET" ]; then
    echo -e "${YELLOW}⚠️  No ATLAS-GATE_BOOTSTRAP_SECRET in current environment${NC}"
else
    echo -e "${GREEN}✓ ATLAS-GATE_BOOTSTRAP_SECRET is already set${NC}"
    read -p "Do you want to regenerate it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing secret."
        BOOTSTRAP_SECRET=$ATLAS-GATE_BOOTSTRAP_SECRET
    else
        echo "Generating new secret..."
        BOOTSTRAP_SECRET=$(openssl rand -base64 32)
    fi
fi

if [ -z "$BOOTSTRAP_SECRET" ]; then
    echo ""
    echo "Step 2: Generating bootstrap secret"
    echo ""
    echo "Generating a cryptographically random 32-byte secret..."
    BOOTSTRAP_SECRET=$(openssl rand -base64 32)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to generate secret. Is OpenSSL installed?${NC}"
        exit 1
    fi
fi

echo ""
echo "Generated Bootstrap Secret:"
echo -e "${GREEN}$BOOTSTRAP_SECRET${NC}"
echo ""

# Ask how to store it
echo "Step 3: How would you like to store the secret?"
echo ""
echo "1) Environment variable (.bashrc / .zshrc)"
echo "2) .env file (for this project)"
echo "3) .atlas-gate/bootstrap_secret.json file (fallback)"
echo "4) Copy to clipboard only (manual setup)"
echo ""
read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Adding to shell configuration..."
        SHELL_RC=""
        
        if [ -f ~/.bashrc ]; then
            SHELL_RC=~/.bashrc
        elif [ -f ~/.zshrc ]; then
            SHELL_RC=~/.zshrc
        else
            echo -e "${YELLOW}⚠️  Could not find .bashrc or .zshrc${NC}"
            echo "Manually add this line to your shell config:"
            echo "export ATLAS-GATE_BOOTSTRAP_SECRET='$BOOTSTRAP_SECRET'"
            exit 0
        fi
        
        # Check if already set
        if grep -q "ATLAS-GATE_BOOTSTRAP_SECRET" "$SHELL_RC"; then
            echo "Updating existing ATLAS-GATE_BOOTSTRAP_SECRET in $SHELL_RC"
            # Use sed to replace (works on macOS and Linux)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/export ATLAS-GATE_BOOTSTRAP_SECRET=.*/export ATLAS-GATE_BOOTSTRAP_SECRET='$BOOTSTRAP_SECRET'/" "$SHELL_RC"
            else
                sed -i "s/export ATLAS-GATE_BOOTSTRAP_SECRET=.*/export ATLAS-GATE_BOOTSTRAP_SECRET='$BOOTSTRAP_SECRET'/" "$SHELL_RC"
            fi
        else
            echo "Adding ATLAS-GATE_BOOTSTRAP_SECRET to $SHELL_RC"
            echo "export ATLAS-GATE_BOOTSTRAP_SECRET='$BOOTSTRAP_SECRET'" >> "$SHELL_RC"
        fi
        
        echo -e "${GREEN}✓ Secret added to $SHELL_RC${NC}"
        echo ""
        echo "Reload your shell to apply changes:"
        echo "  source $SHELL_RC"
        echo "  # or open a new terminal"
        echo ""
        ;;
    2)
        echo ""
        echo "Creating .env file..."
        
        if [ -f .env ]; then
            echo -e "${YELLOW}⚠️  .env file already exists${NC}"
            read -p "Overwrite? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Skipping .env file creation"
                exit 0
            fi
        fi
        
        # Copy from .env.example and set secret
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            # Create minimal .env
            cat > .env << EOF
# ATLAS-GATE MCP Environment Configuration
ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET
EOF
        fi
        
        # Update the secret in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^ATLAS-GATE_BOOTSTRAP_SECRET=.*/ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET/" .env
        else
            sed -i "s/^ATLAS-GATE_BOOTSTRAP_SECRET=.*/ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET/" .env
        fi
        
        echo -e "${GREEN}✓ .env file created${NC}"
        echo ""
        echo "Load the .env file before running ATLAS-GATE:"
        echo "  source .env"
        echo "  npm run server"
        echo ""
        chmod 600 .env
        echo -e "${GREEN}✓ .env file permissions restricted (600)${NC}"
        echo ""
        ;;
    3)
        echo ""
        echo "Creating .atlas-gate/bootstrap_secret.json..."
        
        mkdir -p .atlas-gate
        
        if [ -f .atlas-gate/bootstrap_secret.json ]; then
            echo -e "${YELLOW}⚠️  File already exists${NC}"
            read -p "Overwrite? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Skipping file creation"
                exit 0
            fi
        fi
        
        # Write JSON file
        cat > .atlas-gate/bootstrap_secret.json << EOF
{
  "bootstrap_secret": "$BOOTSTRAP_SECRET"
}
EOF
        
        echo -e "${GREEN}✓ .atlas-gate/bootstrap_secret.json created${NC}"
        echo ""
        
        # Restrict permissions
        chmod 600 .atlas-gate/bootstrap_secret.json
        echo -e "${GREEN}✓ File permissions restricted (600)${NC}"
        echo ""
        
        # Add to .gitignore
        if ! grep -q "bootstrap_secret.json" .gitignore 2>/dev/null; then
            echo ".atlas-gate/bootstrap_secret.json" >> .gitignore
            echo -e "${GREEN}✓ Added to .gitignore${NC}"
        fi
        echo ""
        ;;
    4)
        echo ""
        echo "Copy this secret and paste where needed:"
        echo ""
        echo "$BOOTSTRAP_SECRET"
        echo ""
        echo "To use it, set the environment variable:"
        echo "  export ATLAS-GATE_BOOTSTRAP_SECRET='$BOOTSTRAP_SECRET'"
        echo ""
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo "Step 4: Verify setup"
echo ""

# Try to load and verify
export ATLAS-GATE_BOOTSTRAP_SECRET=$BOOTSTRAP_SECRET

if [ -z "$ATLAS-GATE_BOOTSTRAP_SECRET" ]; then
    echo -e "${RED}✗ Bootstrap secret not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Bootstrap secret is set${NC}"
echo "  Length: ${#ATLAS-GATE_BOOTSTRAP_SECRET} characters"
echo "  First 8 chars: ${ATLAS-GATE_BOOTSTRAP_SECRET:0:8}..."
echo ""

echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify the secret is loaded in your environment"
echo "2. Run: npm run verify"
echo "3. Create your first plan with bootstrap_create_foundation_plan"
echo ""
echo "For more information, see:"
echo "  - docs/BOOTSTRAP_SECRET_GUIDE.md"
echo "  - docs/guides/ABSOLUTE_BEGINNER_GUIDE.md"
echo ""
