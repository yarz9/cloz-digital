#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Cloz Digital — Railway Deployment Script
# ─────────────────────────────────────────────
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}━━━ Cloz Digital Deploy ━━━${NC}"
echo ""

# 1. Pre-flight checks
echo -e "${YELLOW}[1/6]${NC} Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo -e "${RED}Error: npm is not installed.${NC}"
  exit 1
fi

if ! command -v railway &>/dev/null; then
  echo -e "${RED}Error: Railway CLI is not installed.${NC}"
  echo "Install it: npm install -g @railway/cli"
  echo "Then login:  railway login"
  exit 1
fi

if ! command -v git &>/dev/null; then
  echo -e "${RED}Error: git is not installed.${NC}"
  exit 1
fi

echo "  Node $(node -v) | npm $(npm -v)"
echo "  Railway CLI: $(railway version 2>/dev/null || echo 'installed')"
echo ""

# 2. Check .env
echo -e "${YELLOW}[2/6]${NC} Verifying environment..."
if [ ! -f .env ]; then
  echo -e "${RED}Warning: No .env file found.${NC}"
  echo "  Make sure CEREBRAS_API_KEY and ADMIN_PASSWORD are set as Railway variables."
else
  if grep -q "CEREBRAS_API_KEY" .env; then
    echo "  CEREBRAS_API_KEY: found"
  else
    echo -e "${RED}  Warning: CEREBRAS_API_KEY not found in .env${NC}"
  fi
  if grep -q "ADMIN_PASSWORD" .env; then
    echo "  ADMIN_PASSWORD: found"
  else
    echo -e "${RED}  Warning: ADMIN_PASSWORD not found in .env${NC}"
  fi
fi
echo ""

# 3. Install dependencies
echo -e "${YELLOW}[3/6]${NC} Installing dependencies..."
npm install --production=false
echo ""

# 4. Build React frontend
echo -e "${YELLOW}[4/6]${NC} Building React frontend..."
npm run build
echo ""

# 5. Git commit (if needed)
echo -e "${YELLOW}[5/6]${NC} Checking git status..."
if [ ! -d .git ]; then
  echo "  Initializing git repository..."
  git init
  git add -A
  git commit -m "Initial commit — Cloz Digital"
else
  if [ -n "$(git status --porcelain)" ]; then
    echo "  Committing changes..."
    git add -A
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')"
  else
    echo "  No changes to commit."
  fi
fi
echo ""

# 6. Deploy to Railway
echo -e "${YELLOW}[6/6]${NC} Deploying to Railway..."
echo ""

# Check if linked to a Railway project
if ! railway status &>/dev/null 2>&1; then
  echo "  No Railway project linked. Setting up..."
  echo ""
  echo "  You have two options:"
  echo "    1. Link to existing project: railway link"
  echo "    2. Create new project:       railway init"
  echo ""
  echo "  After linking, set your environment variables:"
  echo "    railway variables set CEREBRAS_API_KEY=your_key_here"
  echo "    railway variables set ADMIN_PASSWORD=your_password"
  echo "    railway variables set NODE_ENV=production"
  echo ""
  echo "  Then run this script again, or just:"
  echo "    railway up"
  echo ""
  exit 0
fi

# Deploy
railway up --detach

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deployment started!${NC}"
echo ""
echo "  View logs:     railway logs"
echo "  Open app:      railway open"
echo "  View status:   railway status"
echo ""
echo "  Environment variables (set via Railway dashboard or CLI):"
echo "    CEREBRAS_API_KEY   — Your Cerebras API key"
echo "    ADMIN_PASSWORD   — Admin panel password"
echo "    NODE_ENV         — production"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
