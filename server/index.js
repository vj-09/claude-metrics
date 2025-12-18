#!/usr/bin/env node

/**
 * Claude Metrics - Dashboard Server
 *
 * A GitHub-style metrics dashboard for Claude Code usage.
 * https://github.com/vj-09/claude-metrics
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.CLAUDE_METRICS_PORT || 3456;

// Claude data paths
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const STATS_FILE = path.join(CLAUDE_DIR, 'stats-cache.json');
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

// Pricing per 1M tokens (USD) - December 2024
const PRICING = {
  'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-opus-4-5-20251101': { input: 15, output: 75, cacheRead: 1.50, cacheWrite: 18.75 },
  'default': { input: 3, output: 15, cacheRead: 0.30, cacheWrite: 3.75 }
};

const PRO_SUBSCRIPTION_COST = 100; // USD per month (Max plan)

// Serve dashboard from the dashboard directory
const dashboardPath = path.join(__dirname, '..', 'dashboard');
app.use(express.static(dashboardPath, { index: 'index.html' }));
app.use(express.json());

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Helper: Parse JSONL file
function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').filter(line => line).map(line => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);
}

// Helper: Parse history.jsonl for complete data
function parseHistory() {
  const history = parseJsonl(HISTORY_FILE);
  const dailyData = {};
  const hourData = {};
  const dayOfWeekHour = {};
  const projects = {};
  const sessions = new Set();
  const promptLengths = [];

  for (const entry of history) {
    const ts = entry.timestamp;
    if (!ts) continue;

    const date = new Date(ts);
    const dateStr = date.toISOString().split('T')[0];
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const heatmapKey = `${dayOfWeek}-${hour}`;

    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { date: dateStr, prompts: 0, sessions: new Set() };
    }
    dailyData[dateStr].prompts++;
    if (entry.sessionId) {
      dailyData[dateStr].sessions.add(entry.sessionId);
      sessions.add(entry.sessionId);
    }

    hourData[hour] = (hourData[hour] || 0) + 1;
    dayOfWeekHour[heatmapKey] = (dayOfWeekHour[heatmapKey] || 0) + 1;

    const project = (entry.project || '').split('/').pop() || 'unknown';
    projects[project] = (projects[project] || 0) + 1;

    if (entry.display) {
      promptLengths.push(entry.display.length);
    }
  }

  for (const day of Object.values(dailyData)) {
    day.sessionCount = day.sessions.size;
    delete day.sessions;
  }

  return {
    dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
    hourData,
    dayOfWeekHour,
    projects,
    totalPrompts: history.length,
    totalSessions: sessions.size,
    promptLengths,
    firstDate: history[0]?.timestamp ? new Date(history[0].timestamp).toISOString() : null,
    lastDate: history[history.length - 1]?.timestamp ? new Date(history[history.length - 1].timestamp).toISOString() : null
  };
}

// Helper: Calculate cost
function calculateCost(model, tokens) {
  const pricing = PRICING[model] || PRICING.default;
  return (
    (tokens.inputTokens || 0) * pricing.input / 1000000 +
    (tokens.outputTokens || 0) * pricing.output / 1000000 +
    (tokens.cacheReadInputTokens || 0) * pricing.cacheRead / 1000000 +
    (tokens.cacheCreationInputTokens || 0) * pricing.cacheWrite / 1000000
  );
}

// Helper: Calculate streaks
function calculateStreaks(dailyData) {
  if (dailyData.length === 0) return { current: 0, longest: 0, bestDay: null };

  const dates = dailyData.map(d => d.date).sort();
  const today = new Date().toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const lastDate = dates[dates.length - 1];
  const daysSinceLast = (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24);

  if (daysSinceLast <= 1) {
    currentStreak = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const curr = new Date(dates[i + 1]);
      const prev = new Date(dates[i]);
      if ((curr - prev) / (1000 * 60 * 60 * 24) === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  const bestDay = dailyData.reduce((best, day) =>
    day.prompts > (best?.prompts || 0) ? day : best, null);

  return { current: currentStreak, longest: longestStreak, bestDay };
}

// API: Overview stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    const historyData = parseHistory();

    const modelCosts = {};
    let totalCost = 0;
    for (const [model, tokens] of Object.entries(stats.modelUsage || {})) {
      const cost = calculateCost(model, tokens);
      modelCosts[model] = Math.round(cost * 100) / 100;
      totalCost += cost;
    }

    let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0;
    for (const tokens of Object.values(stats.modelUsage || {})) {
      totalInput += tokens.inputTokens || 0;
      totalOutput += tokens.outputTokens || 0;
      totalCacheRead += tokens.cacheReadInputTokens || 0;
      totalCacheWrite += tokens.cacheCreationInputTokens || 0;
    }

    const savings = Math.max(0, totalCost - PRO_SUBSCRIPTION_COST);
    const roi = PRO_SUBSCRIPTION_COST > 0 ? ((totalCost / PRO_SUBSCRIPTION_COST) * 100).toFixed(0) : 0;

    res.json({
      totalSessions: historyData.totalSessions,
      totalMessages: stats.totalMessages,
      totalPrompts: historyData.totalPrompts,
      totalInput,
      totalOutput,
      totalCacheRead,
      totalCacheWrite,
      totalCost: Math.round(totalCost * 100) / 100,
      proSubscription: PRO_SUBSCRIPTION_COST,
      savings: Math.round(savings * 100) / 100,
      roi: parseInt(roi),
      modelCosts,
      modelUsage: stats.modelUsage,
      firstSession: historyData.firstDate,
      lastSession: historyData.lastDate,
      longestSession: stats.longestSession,
      activeDays: historyData.dailyData.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Daily activity
app.get('/api/daily', (req, res) => {
  try {
    res.json(parseHistory().dailyData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Heatmap data
app.get('/api/heatmap', (req, res) => {
  try {
    const historyData = parseHistory();
    const heatmap = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let day = 0; day < 7; day++) {
      const row = { day: dayNames[day], dayIndex: day, hours: [] };
      for (let hour = 0; hour < 24; hour++) {
        row.hours.push({
          hour,
          count: historyData.dayOfWeekHour[`${day}-${hour}`] || 0
        });
      }
      heatmap.push(row);
    }

    res.json({ heatmap, maxCount: Math.max(...Object.values(historyData.dayOfWeekHour), 1) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Insights
app.get('/api/insights', (req, res) => {
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    const historyData = parseHistory();
    const streaks = calculateStreaks(historyData.dailyData);

    let totalOutputTokens = 0;
    for (const tokens of Object.values(stats.modelUsage || {})) {
      totalOutputTokens += tokens.outputTokens || 0;
    }

    const wordsWritten = Math.round(totalOutputTokens * 0.75);
    const pagesWritten = Math.round(wordsWritten / 500);
    const booksEquivalent = (wordsWritten / 80000).toFixed(1);
    const minutesSaved = Math.round(wordsWritten / 40);
    const hoursSaved = (minutesSaved / 60).toFixed(1);

    const avgPromptLength = historyData.promptLengths.length > 0
      ? Math.round(historyData.promptLengths.reduce((a, b) => a + b, 0) / historyData.promptLengths.length)
      : 0;

    res.json({
      streaks: {
        current: streaks.current,
        longest: streaks.longest,
        bestDay: streaks.bestDay
      },
      productivity: {
        avgPromptsPerDay: historyData.dailyData.length > 0
          ? Math.round(historyData.totalPrompts / historyData.dailyData.length) : 0,
        avgPromptsPerSession: historyData.totalSessions > 0
          ? Math.round(historyData.totalPrompts / historyData.totalSessions) : 0,
        activeDays: historyData.dailyData.length,
        totalDaysSpan: historyData.firstDate && historyData.lastDate
          ? Math.ceil((new Date(historyData.lastDate) - new Date(historyData.firstDate)) / (1000 * 60 * 60 * 24)) + 1 : 0
      },
      prompts: {
        total: historyData.totalPrompts,
        avgLength: avgPromptLength,
        maxLength: Math.max(...historyData.promptLengths, 0)
      },
      funStats: {
        wordsWritten,
        pagesWritten,
        booksEquivalent: parseFloat(booksEquivalent),
        hoursSaved: parseFloat(hoursSaved),
        minutesSaved
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cache efficiency
app.get('/api/cache', (req, res) => {
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));

    let totalInput = 0, totalCacheRead = 0, totalCacheWrite = 0, cacheSavings = 0;

    for (const [model, tokens] of Object.entries(stats.modelUsage || {})) {
      const pricing = PRICING[model] || PRICING.default;
      totalInput += tokens.inputTokens || 0;
      totalCacheRead += tokens.cacheReadInputTokens || 0;
      totalCacheWrite += tokens.cacheCreationInputTokens || 0;

      const wouldHaveCost = (tokens.cacheReadInputTokens || 0) * pricing.input / 1000000;
      const actualCost = (tokens.cacheReadInputTokens || 0) * pricing.cacheRead / 1000000;
      cacheSavings += wouldHaveCost - actualCost;
    }

    const totalCacheTokens = totalCacheRead + totalCacheWrite;
    const hitRate = totalCacheTokens > 0 ? Math.round((totalCacheRead / totalCacheTokens) * 100) : 0;

    res.json({
      cacheRead: totalCacheRead,
      cacheWrite: totalCacheWrite,
      hitRate,
      savings: Math.round(cacheSavings * 100) / 100,
      efficiency: {
        freshTokens: totalInput,
        cachedTokens: totalCacheRead,
        ratio: totalInput > 0 ? (totalCacheRead / totalInput).toFixed(1) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Projects
app.get('/api/projects', (req, res) => {
  try {
    const historyData = parseHistory();
    res.json(Object.entries(historyData.projects)
      .map(([name, prompts]) => ({ name, prompts }))
      .sort((a, b) => b.prompts - a.prompts));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Tool usage
app.get('/api/tools', (req, res) => {
  try {
    const toolCounts = {};
    const readWriteRatio = { read: 0, write: 0 };

    if (fs.existsSync(PROJECTS_DIR)) {
      for (const dir of fs.readdirSync(PROJECTS_DIR)) {
        const dirPath = path.join(PROJECTS_DIR, dir);
        if (fs.statSync(dirPath).isDirectory()) {
          for (const file of fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'))) {
            for (const msg of parseJsonl(path.join(dirPath, file))) {
              if (msg.message?.content && Array.isArray(msg.message.content)) {
                for (const block of msg.message.content) {
                  if (block.type === 'tool_use') {
                    const name = block.name || 'unknown';
                    toolCounts[name] = (toolCounts[name] || 0) + 1;

                    if (['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch'].includes(name)) {
                      readWriteRatio.read++;
                    } else if (['Write', 'Edit', 'Bash', 'NotebookEdit'].includes(name)) {
                      readWriteRatio.write++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    res.json({
      tools: Object.entries(toolCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      readWriteRatio,
      exploringVsBuilding: readWriteRatio.read > readWriteRatio.write ? 'exploring' : 'building'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Models
app.get('/api/models', (req, res) => {
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    const models = [];
    let totalTokens = 0;

    for (const usage of Object.values(stats.modelUsage || {})) {
      totalTokens += usage.outputTokens || 0;
    }

    for (const [model, usage] of Object.entries(stats.modelUsage || {})) {
      const tokens = usage.outputTokens || 0;
      models.push({
        name: model.includes('opus') ? 'Opus 4.5' : 'Sonnet 4.5',
        fullName: model,
        outputTokens: tokens,
        percentage: totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0,
        cost: Math.round(calculateCost(model, usage) * 100) / 100,
        inputTokens: usage.inputTokens || 0,
        cacheRead: usage.cacheReadInputTokens || 0,
        cacheWrite: usage.cacheCreationInputTokens || 0
      });
    }

    res.json(models.sort((a, b) => b.outputTokens - a.outputTokens));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
function startServer() {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║           Claude Metrics Dashboard                   ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║   🌐  http://localhost:${PORT}                        ║
║                                                      ║
║   Press Ctrl+C to stop                               ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`);
  });
}

// Allow running directly or as module
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
