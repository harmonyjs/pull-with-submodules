# pull-with-submodules

[![npm version](https://img.shields.io/npm/v/pull-with-submodules.svg)](https://www.npmjs.com/package/pull-with-submodules)
[![CI Status](https://github.com/harmonyjs/pull-with-submodules/workflows/CI/badge.svg)](https://github.com/harmonyjs/pull-with-submodules/actions)
[![Coverage Status](https://coveralls.io/repos/github/harmonyjs/pull-with-submodules/badge.svg)](https://coveralls.io/github/harmonyjs/pull-with-submodules)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/pull-with-submodules.svg)](https://nodejs.org)

> 🚀 **Opinionated Git pull utility for repositories with submodules** — smart, fast, and zero-config.

Automatically pulls your repository and intelligently updates all submodules, preferring local development copies when available. No configuration needed, just works.

## ✨ Features

- 🎯 **Zero Configuration** — Works out of the box with sensible defaults
- 🧠 **Smart Source Selection** — Automatically prefers local development repos over remote
- ⚡ **Parallel Processing** — Update multiple submodules simultaneously
- 🎨 **Beautiful CLI** — Interactive prompts and progress indicators
- 🔒 **Safe by Default** — Dry-run mode, automatic stashing, conflict detection
- 📦 **No Installation Required** — Run directly with `npx`

## 🚀 Quick Start

```bash
# Run in any Git repository with submodules
npx pull-with-submodules
```

That's it! No configuration files, no setup, just run and go.

## 📋 Installation

### Global Installation (Recommended)

```bash
npm install -g pull-with-submodules

# Then use anywhere
pull-with-submodules
```

## 🎮 Usage

### Basic Commands

```bash
# Standard pull with smart submodule updates
pull-with-submodules

# Preview what would happen without making changes
pull-with-submodules --dry-run

# Update without auto-committing gitlink changes
pull-with-submodules --no-commit

# Force using remote sources (useful for CI)
pull-with-submodules --force-remote

# Process submodules in parallel (faster for many submodules)
pull-with-submodules --parallel

# Show debug information
pull-with-submodules --verbose
```

### CLI Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--dry-run` | `-d` | Preview changes without applying them |
| `--no-commit` | `-n` | Skip auto-commit of gitlink updates |
| `--force-remote` | `-r` | Always prefer remote over local siblings |
| `--parallel` | `-p` | Process submodules in parallel (max 4) |
| `--verbose` | `-v` | Show detailed debug output |
| `--help` | `-h` | Show help message |
| `--version` | | Show version number |

## 🧠 How It Works

### Smart Source Selection

The tool intelligently selects the best source for each submodule update:

1. **Checks Remote** — Fetches latest from `origin/<branch>`
2. **Checks Local** — Looks for sibling repository at `../<repo-name>`
3. **Compares** — If local contains all remote commits, uses local
4. **Decides** — Falls back to remote if histories diverged

### Project Structure Assumptions

```
workspace/
├── main-project/          # Your main repository
│   ├── .gitmodules
│   └── libs/
│       └── shared/        # Submodule checkout
│
├── shared/                # Local development copy (automatically detected!)
└── another-service/       # Another local repository
```

### Update Process

1. **Pull Main Repository** — Always uses `--rebase` to keep history clean
2. **Process Each Submodule:**
   - Initialize and sync configuration
   - Fetch from remote origin
   - Discover local sibling repositories
   - Select best commit source
   - Update working tree
   - Auto-commit gitlink changes (unless `--no-commit`)
3. **Report Results** — Shows summary of updated/skipped submodules

## 🎯 Philosophy

This tool is **intentionally opinionated** to provide the best experience without configuration:

- **Always Rebase** — No merge commits in your main branch
- **Prefer Local** — Your local work takes precedence when it includes remote
- **Auto-Commit** — Gitlinks are always kept in sync (override with `--no-commit`)
- **Smart Defaults** — Works perfectly for 90% of use cases
- **No Config Files** — If you need configuration, this tool isn't for you

### Debug Mode

Run with `--verbose` to see detailed Git operations:

```bash
pull-with-submodules --verbose
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with [@clack/prompts](https://github.com/bombshell-dev/clack) for beautiful CLI interactions
- Uses [simple-git](https://github.com/steveukx/git-js) for Git operations
- Inspired by the complexity of managing Git submodules in large projects
