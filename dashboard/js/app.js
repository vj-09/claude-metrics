// Utility functions
const fmt = (n) => {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
};

const tooltip = document.getElementById('tooltip');

function showTooltip(e, text) {
  tooltip.innerHTML = text;
  tooltip.style.left = (e.pageX + 10) + 'px';
  tooltip.style.top = (e.pageY - 30) + 'px';
  tooltip.style.display = 'block';
}

function hideTooltip() {
  tooltip.style.display = 'none';
}

// Build GitHub-style contribution graph
function buildContributionGraph(dailyData) {
  // Create a map of date -> prompts
  const dataMap = {};
  let maxPrompts = 1;
  dailyData.forEach(d => {
    dataMap[d.date] = d.prompts;
    if (d.prompts > maxPrompts) maxPrompts = d.prompts;
  });

  // Generate last 365 days (or available data range)
  const today = new Date();
  const weeks = [];
  const months = [];
  let currentMonth = -1;

  // Start from a Sunday, going back ~52 weeks
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364 - startDate.getDay());

  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);

      if (date > today) {
        week.push(null);
        continue;
      }

      const dateStr = date.toISOString().split('T')[0];
      const prompts = dataMap[dateStr] || 0;

      // Determine level (0-4) based on prompts
      let level = 0;
      if (prompts > 0) {
        const ratio = prompts / maxPrompts;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      }

      // Track months for labels
      if (date.getMonth() !== currentMonth && d === 0) {
        currentMonth = date.getMonth();
        months.push({ week: w, name: date.toLocaleDateString('en-US', { month: 'short' }) });
      }

      week.push({
        date: dateStr,
        prompts,
        level,
        display: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      });
    }
    weeks.push(week);
  }

  // Build HTML
  let html = '<div class="graph-months">';
  let lastMonthWeek = -10;
  months.forEach(m => {
    if (m.week - lastMonthWeek >= 4) {
      html += `<div class="graph-month" style="margin-left: ${(m.week - lastMonthWeek - 4) * 14}px">${m.name}</div>`;
      lastMonthWeek = m.week;
    }
  });
  html += '</div>';

  html += '<div class="graph-container">';
  html += '<div class="graph-days">';
  ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(day => {
    html += `<div class="graph-day-label">${day}</div>`;
  });
  html += '</div>';

  html += '<div class="graph-weeks">';
  weeks.forEach(week => {
    html += '<div class="graph-week">';
    week.forEach(day => {
      if (day === null) {
        html += '<div class="graph-cell" style="visibility: hidden;"></div>';
      } else {
        html += `<div class="graph-cell level-${day.level}"
          onmouseover="showTooltip(event, '<strong>${day.prompts} prompt${day.prompts !== 1 ? 's' : ''}</strong><br><span>${day.display}</span>')"
          onmouseout="hideTooltip()"></div>`;
      }
    });
    html += '</div>';
  });
  html += '</div></div>';

  // Legend
  html += `
    <div class="graph-legend">
      <span>Less</span>
      <div class="graph-legend-cell" style="background: #161b22;"></div>
      <div class="graph-legend-cell" style="background: #0e4429;"></div>
      <div class="graph-legend-cell" style="background: #006d32;"></div>
      <div class="graph-legend-cell" style="background: #26a641;"></div>
      <div class="graph-legend-cell" style="background: #39d353;"></div>
      <span>More</span>
    </div>
  `;

  return html;
}

let cacheChart = null;

async function loadDashboard() {
  if (cacheChart) {
    cacheChart.destroy();
    cacheChart = null;
  }

  try {
    const [stats, daily, insights, cache, tools, models] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/daily').then(r => r.json()),
      fetch('/api/insights').then(r => r.json()),
      fetch('/api/cache').then(r => r.json()),
      fetch('/api/tools').then(r => r.json()),
      fetch('/api/models').then(r => r.json())
    ]);

    // Contribution Graph
    document.getElementById('contributionGraph').innerHTML = buildContributionGraph(daily);
    document.getElementById('totalPromptsLabel').innerHTML = `<span>${fmt(stats.totalPrompts)}</span> prompts in the last year`;

    // Stats Grid
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-box">
        <div class="stat-value">${stats.activeDays}</div>
        <div class="stat-label">Active Days</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.totalSessions}</div>
        <div class="stat-label">Sessions</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${fmt(stats.totalPrompts)}</div>
        <div class="stat-label">Total Prompts</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${fmt(stats.totalOutput)}</div>
        <div class="stat-label">Output Tokens</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${fmt(stats.totalCacheRead)}</div>
        <div class="stat-label">Cached Tokens</div>
      </div>
    `;

    // Savings
    document.getElementById('savingsCard').innerHTML = `
      <div class="savings-amount">$${stats.savings.toLocaleString()}</div>
      <div class="savings-label">saved compared to API pricing</div>
      <div class="cost-comparison">
        <div class="cost-item pro">
          <div class="value">$${stats.proSubscription}</div>
          <div class="label">Pro Subscription</div>
        </div>
        <div class="cost-item api">
          <div class="value">$${stats.totalCost.toLocaleString()}</div>
          <div class="label">Equivalent API Cost</div>
        </div>
      </div>
      <div class="roi-badge">${stats.roi}% Return on Investment</div>
    `;

    // Productivity
    const bestDayStr = insights.streaks.bestDay
      ? new Date(insights.streaks.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '-';
    document.getElementById('productivityCard').innerHTML = `
      <h2>Productivity</h2>
      <div class="streak-section">
        <div class="streak-fire">🔥</div>
        <div class="streak-info">
          <h3>${insights.streaks.current} day${insights.streaks.current !== 1 ? 's' : ''}</h3>
          <p>Current streak</p>
        </div>
      </div>
      <div class="mini-stats">
        <div class="mini-stat">
          <div class="mini-stat-value">${insights.streaks.longest}</div>
          <div class="mini-stat-label">Longest Streak</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${insights.productivity.avgPromptsPerDay}</div>
          <div class="mini-stat-label">Avg/Day</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${insights.streaks.bestDay?.prompts || 0}</div>
          <div class="mini-stat-label">Best Day</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-value">${insights.productivity.avgPromptsPerSession}</div>
          <div class="mini-stat-label">Avg/Session</div>
        </div>
      </div>
    `;

    // Models
    const totalTokens = models.reduce((sum, m) => sum + m.outputTokens, 0);
    document.getElementById('modelsCard').innerHTML = `
      <h2>Models</h2>
      ${models.map(m => {
        const pct = totalTokens > 0 ? (m.outputTokens / totalTokens * 100) : 0;
        const cls = m.name.toLowerCase().includes('opus') ? 'opus' : 'sonnet';
        return `
          <div class="model-bar">
            <div class="model-name">${m.name}</div>
            <div class="model-bar-bg">
              <div class="model-bar-fill ${cls}" style="width: ${pct}%"></div>
              <div class="model-bar-text">${fmt(m.outputTokens)} (${pct.toFixed(0)}%)</div>
            </div>
          </div>
        `;
      }).join('')}
      <div style="margin-top: 16px; padding: 8px 12px; background: var(--bg-card); border-radius: 4px; font-size: 0.8rem;">
        Style: ${tools.exploringVsBuilding === 'exploring' ? '🔍 Exploring codebase' : '🔨 Building features'}
      </div>
    `;

    // Tools
    const maxTool = Math.max(...tools.tools.map(t => t.count), 1);
    document.getElementById('toolsCard').innerHTML = `
      <h2>Top Tools</h2>
      ${tools.tools.slice(0, 6).map(t => `
        <div class="tool-item">
          <div class="tool-name">${t.name}</div>
          <div class="tool-bar">
            <div class="tool-fill" style="width: ${(t.count / maxTool * 100)}%"></div>
          </div>
          <div class="tool-count">${fmt(t.count)}</div>
        </div>
      `).join('')}
    `;

    // Cache
    document.getElementById('cacheCard').innerHTML = `
      <h2>Cache Efficiency</h2>
      <div class="cache-section">
        <div class="cache-donut">
          <canvas id="cacheChart"></canvas>
        </div>
        <div>
          <div class="cache-stat">
            <div class="cache-stat-value">${cache.hitRate}%</div>
            <div class="cache-stat-label">Cache Hit Rate</div>
          </div>
          <div class="cache-stat">
            <div class="cache-stat-value">$${cache.savings}</div>
            <div class="cache-stat-label">Saved via Caching</div>
          </div>
          <div class="cache-stat">
            <div class="cache-stat-value">${cache.efficiency.ratio}x</div>
            <div class="cache-stat-label">Cache Efficiency</div>
          </div>
        </div>
      </div>
    `;

    cacheChart = new Chart(document.getElementById('cacheChart'), {
      type: 'doughnut',
      data: {
        labels: ['Read', 'Write'],
        datasets: [{
          data: [cache.cacheRead, cache.cacheWrite],
          backgroundColor: ['#39d353', '#58a6ff'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        cutout: '70%'
      }
    });

    // Fun Stats
    document.getElementById('funGrid').innerHTML = `
      <div class="fun-item">
        <div class="fun-icon">📚</div>
        <div class="fun-content">
          <h4>${fmt(insights.funStats.wordsWritten)}</h4>
          <p>Words written for you</p>
        </div>
      </div>
      <div class="fun-item">
        <div class="fun-icon">📄</div>
        <div class="fun-content">
          <h4>${insights.funStats.pagesWritten} pages</h4>
          <p>Of documentation</p>
        </div>
      </div>
      <div class="fun-item">
        <div class="fun-icon">📖</div>
        <div class="fun-content">
          <h4>${insights.funStats.booksEquivalent} books</h4>
          <p>Equivalent content</p>
        </div>
      </div>
      <div class="fun-item">
        <div class="fun-icon">⏱️</div>
        <div class="fun-content">
          <h4>${insights.funStats.hoursSaved} hours</h4>
          <p>Of typing saved</p>
        </div>
      </div>
    `;

  } catch (err) {
    console.error('Failed to load:', err);
  }
}

// Initialize
loadDashboard();
setInterval(loadDashboard, 30000);
