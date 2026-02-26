#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# --- Logging ---

LOG_FILE="$REPO_ROOT/setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "--- setup.sh started at $(date) ---"

SLACK_CHANNEL="https://figma.enterprise.slack.com/archives/C0AA95N5JTD"

# --- Helper functions ---

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

pass()  { echo -e "${GREEN}✓${NC} $1"; }
info()  { echo -e "${BLUE}→${NC} $1"; }

fail() {
  echo -e "${RED}✗${NC} $1"
  echo -e "${RED}  $2${NC}"
  echo
  echo -e "${RED}Setup failed.${NC} Share the log file with \$feat-internal-ai-prototyping for help:"
  echo "  Log: $LOG_FILE"
  echo "  Slack: $SLACK_CHANNEL"
  exit 1
}

on_error() {
  echo
  echo -e "${RED}✗ An unexpected error occurred on line $1${NC}"
  echo
  echo -e "${RED}Setup failed.${NC} Share the log file with \$feat-internal-ai-prototyping for help:"
  echo "  Log: $LOG_FILE"
  echo "  Slack: $SLACK_CHANNEL"
  exit 1
}

trap 'on_error $LINENO' ERR

PLATFORM="$(uname)"

echo
echo "Setting up prototype-playground development environment..."
echo

if [[ "$PLATFORM" != "Darwin" && "$PLATFORM" != "Linux" ]]; then
  fail "Unsupported platform: $PLATFORM" "This setup script supports macOS and Linux."
fi

# --- Step 1: Homebrew (macOS only) ---

if [[ "$PLATFORM" == "Darwin" ]]; then
  if command -v brew &>/dev/null; then
    pass "Homebrew already installed"
  else
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add brew to PATH for Apple Silicon Macs
    if [[ -f /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    pass "Homebrew installed"
  fi
else
  info "Skipping Homebrew (Linux)"
fi

# --- Step 2: Node 22 ---

NODE_VERSION="$(node --version 2>/dev/null || echo "none")"
if [[ "$NODE_VERSION" == v22.* ]]; then
  pass "Node $NODE_VERSION already installed"
elif [[ "$PLATFORM" == "Darwin" ]]; then
  info "Installing Node 22 via Homebrew..."
  brew install node@22
  brew link --overwrite node@22
  pass "Node $(node --version) installed via Homebrew"
else
  # Linux — download official Node 22 binary
  info "Installing Node 22..."
  ARCH="$(uname -m)"
  case "$ARCH" in
    aarch64) NODE_ARCH="arm64" ;;
    *)       NODE_ARCH="x64" ;;
  esac
  NODE_LATEST="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/ | sed -n 's/.*node-v\([0-9.]*\)-.*/\1/p' | head -1)"
  if [[ -z "$NODE_LATEST" ]]; then
    fail "Could not determine latest Node 22 version" "Check https://nodejs.org/dist/latest-v22.x/"
  fi
  NODE_DIR="$HOME/.local/node"
  mkdir -p "$NODE_DIR"
  curl -fsSL "https://nodejs.org/dist/v${NODE_LATEST}/node-v${NODE_LATEST}-linux-${NODE_ARCH}.tar.xz" | tar -xJ -C "$NODE_DIR" --strip-components=1
  export PATH="$NODE_DIR/bin:$PATH"
  hash -r  # Clear bash's command cache so it finds the new node/npm
  pass "Node $(node --version) installed to $NODE_DIR"
fi

# --- Step 3: pnpm ---

PNPM_VERSION="$(pnpm --version 2>/dev/null || echo "0")"
PNPM_MAJOR="${PNPM_VERSION%%.*}"

if [[ "$PNPM_MAJOR" -ge 10 ]] 2>/dev/null; then
  pass "pnpm $PNPM_VERSION already installed"
elif [[ "$PLATFORM" == "Darwin" ]]; then
  info "Installing pnpm 10..."
  npm install -g pnpm@10
  hash -r
  pass "pnpm $(pnpm --version) installed"
else
  # Linux — use corepack (ships with Node 22) instead of npm install -g.
  info "Installing pnpm 10 via corepack..."
  corepack enable pnpm
  corepack prepare pnpm@latest --activate
  hash -r
  pass "pnpm $(pnpm --version) installed via corepack"
fi

# --- Step 4: gh (GitHub CLI) ---

if command -v gh &>/dev/null; then
  pass "GitHub CLI already installed"
elif [[ "$PLATFORM" == "Darwin" ]]; then
  info "Installing GitHub CLI via Homebrew..."
  brew install gh
  pass "GitHub CLI installed"
else
  info "GitHub CLI not found (install manually: https://github.com/cli/cli#installation)"
fi

if gh auth status &>/dev/null; then
  pass "GitHub CLI authenticated"
  # Ensure read:packages scope is present (needed for GitHub Packages)
  if ! gh auth status 2>&1 | grep -q "read:packages\|write:packages"; then
    info "Adding read:packages scope to GitHub CLI token..."
    gh auth refresh -h github.com -s read:packages
    pass "read:packages scope added"
  fi
elif [[ -n "${CI:-}" ]] || [[ ! -t 0 ]]; then
  info "Skipping GitHub auth (non-interactive environment)"
else
  echo
  info "GitHub CLI needs to authenticate with GitHub."
  info "A browser will open — enter the one-time code shown below to log in."
  echo
  if echo | gh auth login --web -h github.com -p https -s read:packages; then
    pass "GitHub CLI authenticated (with read:packages scope)"
  else
    fail "GitHub authentication failed" "Run 'gh auth login' in a terminal, then re-run this script."
  fi
fi

# --- Step 5: ~/.npmrc (GitHub Packages auth) ---

GLOBAL_NPMRC="$HOME/.npmrc"
GH_TOKEN="$(gh auth token 2>/dev/null || echo "")"

if [[ -z "$GH_TOKEN" ]]; then
  fail "No GitHub token available" "Run 'gh auth login' first, then re-run this script."
fi

NPMRC_LINE="//npm.pkg.github.com/:_authToken=$GH_TOKEN"

if [[ -f "$GLOBAL_NPMRC" ]] && grep -qF "npm.pkg.github.com/:_authToken=" "$GLOBAL_NPMRC"; then
  # Check if the token is already correct
  if grep -qF "$NPMRC_LINE" "$GLOBAL_NPMRC"; then
    pass "GitHub Packages token already set in ~/.npmrc"
  else
    sed -i.bak "s|//npm.pkg.github.com/:_authToken=.*|$NPMRC_LINE|" "$GLOBAL_NPMRC" && rm -f "$GLOBAL_NPMRC.bak"
    pass "Updated GitHub Packages token in ~/.npmrc"
  fi
else
  echo "$NPMRC_LINE" >> "$GLOBAL_NPMRC"
  pass "Added GitHub Packages token to ~/.npmrc"
fi

# --- Step 6: pnpm install ---

echo
info "Installing dependencies..."
pnpm install
pass "Dependencies installed"

# --- Step 7: Cursor CLI + VS Code extension ---

if [[ "$PLATFORM" == "Darwin" ]]; then
  CURSOR_APP_CLI="/Applications/Cursor.app/Contents/Resources/app/bin/code"

  if [[ ! -x "$CURSOR_APP_CLI" ]]; then
    fail "Cursor not found" "Install Cursor from https://cursor.com/download, then re-run this script."
  fi

  if command -v cursor &>/dev/null; then
    pass "Cursor CLI already in PATH"
  else
    info "Installing Cursor CLI into PATH..."
    if mkdir -p /usr/local/bin 2>/dev/null && ln -sf "$CURSOR_APP_CLI" /usr/local/bin/cursor 2>/dev/null; then
      pass "Cursor CLI linked to /usr/local/bin/cursor"
    else
      fail "Could not link Cursor CLI to /usr/local/bin" "Run: sudo ln -sf '$CURSOR_APP_CLI' /usr/local/bin/cursor"
    fi
  fi
else
  if command -v cursor &>/dev/null; then
    pass "Cursor CLI already in PATH"
  else
    info "Cursor CLI not found (skipping on Linux — install manually)"
  fi
fi

if command -v cursor &>/dev/null; then
  info "Installing VS Code extension from latest GitHub release..."
  VSIX_DIR=$(mktemp -d)
  if gh release download --repo figma/ai-prototype-scaffold --pattern '*.vsix' --dir "$VSIX_DIR" 2>/dev/null; then
    VSIX_FILE=$(ls "$VSIX_DIR"/*.vsix 2>/dev/null | head -1)
    if [[ -n "$VSIX_FILE" ]]; then
      cursor --install-extension "$VSIX_FILE" --force
      pass "VS Code extension installed into Cursor"
    else
      info "No .vsix found in GitHub release (skipping extension install)"
    fi
  else
    info "Could not download extension from GitHub release (skipping)"
  fi
  rm -rf "$VSIX_DIR"

  if [[ "$PLATFORM" == "Darwin" ]]; then
    info "Installing required Cursor extensions..."
    cursor --install-extension dbaeumer.vscode-eslint --force
    cursor --install-extension bradlc.vscode-tailwindcss --force
    pass "Required extensions installed"
  fi
else
  info "Skipping extension install (Cursor not available)"
fi

# --- Step 8: Verification ---

echo
echo "Running verification checks..."
echo

if [[ -d "node_modules" ]]; then
  pass "node_modules installed"
else
  fail "node_modules missing" "pnpm install did not complete successfully."
fi

# Verify a template builds correctly (confirms FPL imports work)
TEMPLATE_DIR="$(ls -d templates/*/ 2>/dev/null | head -1)"
if [[ -n "$TEMPLATE_DIR" ]]; then
  TEMPLATE_NAME="$(basename "$TEMPLATE_DIR")"
  echo -n "Building $TEMPLATE_NAME (verifies FPL imports)... "
  if pnpm --filter "./templates/$TEMPLATE_NAME" build > /dev/null 2>&1; then
    echo -e "\r${GREEN}✓${NC} $TEMPLATE_NAME builds successfully"
  else
    echo
    fail "$TEMPLATE_NAME build failed" "Run 'pnpm --filter \"./templates/$TEMPLATE_NAME\" build' to see errors."
  fi
else
  info "No templates found to verify"
fi

# --- Done ---

echo
echo -e "${GREEN}Setup complete!${NC} Your development environment is ready."
echo
echo "To get started, open the AI Prototyping sidebar in Cursor:"
echo "  Click the beaker icon in the left sidebar, or run:"
echo "  Cmd+Shift+P → \"Design Prototyping: Focus on View\""
echo
