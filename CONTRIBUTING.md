# Contributing to Claude Metrics

Thank you for your interest in contributing to Claude Metrics!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/claude-metrics.git`
3. Install dependencies: `npm install`
4. Start the dev server: `npm start`

## Development Setup

```bash
# Clone and install
git clone https://github.com/vj-09/claude-metrics.git
cd claude-metrics
npm install

# Start development server
npm start

# Server runs at http://localhost:3456
```

## Project Structure

```
claude-metrics/
├── server/index.js      # Express server and API endpoints
├── dashboard/           # Frontend files
│   ├── index.html       # Main HTML
│   ├── css/styles.css   # Styles
│   └── js/app.js        # JavaScript
├── skills/              # Claude Code skills
├── commands/            # Slash commands
└── agents/              # Analysis agents
```

## Making Changes

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages

Follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

Example: `feat: add weekly trend chart`

## Pull Request Process

1. Update README.md if adding features
2. Test your changes locally
3. Ensure no console errors
4. Create a PR with a clear description

## Feature Ideas

Looking for something to work on?

- [ ] Export metrics to CSV/JSON
- [ ] Dark/light theme toggle
- [ ] Weekly/monthly trend charts
- [ ] Project comparison view
- [ ] Cost predictions
- [ ] Browser extension

## Reporting Bugs

Open an issue with:

1. Description of the bug
2. Steps to reproduce
3. Expected behavior
4. Screenshots if applicable
5. Your environment (OS, Node version)

## Questions?

Open an issue or reach out to [@vj-09](https://github.com/vj-09).

---

Thank you for contributing!
