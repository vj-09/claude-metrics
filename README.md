# Claude Metrics

**GitHub-style metrics dashboard for your Claude Code usage**

Track tokens, costs, streaks, and productivity with a beautiful dark-themed UI.

![Dashboard Preview](https://raw.githubusercontent.com/vj-09/claude-metrics/main/assets/preview.png)

## Features

- **GitHub-style Contribution Graph** - Visual heatmap of your daily activity
- **Cost Savings Calculator** - See your Pro subscription ROI vs API pricing
- **Productivity Insights** - Streaks, best days, averages
- **Model Comparison** - Sonnet vs Opus usage breakdown
- **Tool Analytics** - Which Claude tools you use most
- **Cache Efficiency** - Track prompt cache savings
- **Fun Stats** - Words written, pages, books equivalent

## Quick Start

### Option 1: Clone and Run

```bash
git clone https://github.com/vj-09/claude-metrics ~/.claude/plugins/claude-metrics
cd ~/.claude/plugins/claude-metrics
npm install
npm start
```

Open http://localhost:3456

### Option 2: As Claude Code Plugin

```bash
# Clone to plugins directory
git clone https://github.com/vj-09/claude-metrics ~/.claude/plugins/claude-metrics
cd ~/.claude/plugins/claude-metrics && npm install

# Use the /metrics command in Claude Code
```

## Requirements

- Node.js 16+
- Claude Code (generates the data files)

## Data Sources

This dashboard reads from your local Claude Code data:

- `~/.claude/stats-cache.json` - Aggregated statistics
- `~/.claude/history.jsonl` - Session-by-session history
- `~/.claude/projects/` - Project-specific data

**Your data never leaves your machine.**

## Configuration

### Custom Port

```bash
PORT=8080 npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | Overall statistics and savings |
| `GET /api/daily` | Daily activity data |
| `GET /api/heatmap` | 24x7 hour/day heatmap data |
| `GET /api/insights` | Productivity insights and fun stats |
| `GET /api/cache` | Cache efficiency metrics |
| `GET /api/tools` | Tool usage breakdown |
| `GET /api/models` | Model usage comparison |
| `GET /api/projects` | Project-specific stats |

## Project Structure

```
claude-metrics/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── server/
│   └── index.js             # Express server & APIs
├── dashboard/
│   ├── index.html           # Dashboard UI
│   ├── css/styles.css       # GitHub-style CSS
│   └── js/app.js            # Dashboard JavaScript
├── skills/
│   └── metrics/SKILL.md     # Auto-activating skill
├── commands/
│   └── metrics.md           # /metrics slash command
├── agents/
│   └── metrics-analyzer.md  # Deep analysis agent
├── scripts/
│   └── start-dashboard.sh   # Launch script
├── package.json
└── README.md
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by GitHub's contribution graph
- Built for the Claude Code community
- Uses [Chart.js](https://www.chartjs.org/) for visualizations

---

**Made with Claude Code**
