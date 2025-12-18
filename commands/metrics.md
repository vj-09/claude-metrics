---
name: metrics
description: Launch the Claude Code metrics dashboard to visualize your usage patterns
---

# Claude Metrics Dashboard

I'll help you launch the metrics dashboard to visualize your Claude Code usage.

## Starting the Dashboard

To start the dashboard, run:

```bash
cd ~/.claude/plugins/claude-metrics && npm start
```

Then open **http://localhost:3456** in your browser.

## What You'll See

The dashboard displays:

1. **Contribution Graph** - GitHub-style heatmap of your daily activity
2. **Key Stats** - Active days, sessions, prompts, tokens
3. **Cost Savings** - How much you're saving with Pro vs API pricing
4. **Productivity** - Current streak, longest streak, daily averages
5. **Model Usage** - Sonnet vs Opus breakdown
6. **Top Tools** - Most frequently used Claude tools
7. **Cache Efficiency** - Prompt cache hit rate and savings
8. **Fun Stats** - Words written, pages, books equivalent

## Troubleshooting

If the dashboard doesn't load:

1. Make sure Node.js is installed
2. Run `npm install` in the plugin directory
3. Check if port 3456 is available (or set a different PORT)
4. Ensure `~/.claude/stats-cache.json` exists (it's created after your first Claude session)

## Custom Port

To use a different port:

```bash
PORT=8080 npm start
```
