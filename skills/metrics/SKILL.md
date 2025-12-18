---
name: claude-metrics
description: Analyze and visualize your Claude Code usage patterns, token consumption, costs, and productivity metrics
triggers:
  - metrics
  - usage
  - tokens
  - dashboard
  - statistics
  - analytics
  - cost
  - savings
---

# Claude Metrics Skill

This skill helps you understand your Claude Code usage by launching a beautiful GitHub-style metrics dashboard.

## What It Does

When triggered, this skill will:

1. **Launch the Dashboard** - Start a local server at http://localhost:3456
2. **Parse Your Data** - Read from `~/.claude/stats-cache.json` and `~/.claude/history.jsonl`
3. **Visualize Insights** - Display comprehensive metrics in a dark-themed UI

## Features

- **GitHub-style Contribution Graph** - See your daily activity over the past year
- **Cost Savings Calculator** - Compare Pro subscription vs equivalent API costs
- **Productivity Metrics** - Streaks, averages, best days
- **Model Usage** - Breakdown of Sonnet vs Opus usage
- **Tool Analytics** - Which Claude tools you use most
- **Cache Efficiency** - How much you're saving via prompt caching
- **Fun Stats** - Words written, pages, books equivalent, hours saved

## Usage

Simply mention metrics, usage, or dashboard and this skill will help you launch and understand your analytics.

## Quick Start

```bash
cd ~/.claude/plugins/claude-metrics
npm install
npm start
```

Then open http://localhost:3456 in your browser.
