/* ============================================================
   Sauna Tracker — dashboard.js
   Dashboard page logic. Renders stat cards and Chart.js
   charts (weekly bar chart + monthly trend line).
   ============================================================ */

window.SaunaDashboard = {

  /** DOM containers */
  statsContainer: null,
  weeklyChartCanvas: null,
  monthlyChartCanvas: null,

  /** Chart.js instances (for cleanup/resize) */
  _weeklyChart: null,
  _monthlyChart: null,

  /** Color palette (amber/copper dark theme accent) */
  colors: {
    accent: '#d97706',         // amber-600
    accentLight: '#f59e0b',    // amber-500
    accentDark: '#b45309',     // amber-700
    grid: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.7)',
    barBg: 'rgba(217,119,6,0.25)',
    barBorder: '#d97706',
    fillGradient: {
      top: 'rgba(217,119,6,0.35)',
      bottom: 'rgba(217,119,6,0.02)'
    }
  },

  /** Initialize the dashboard.
   *  @param {string|HTMLElement} statsId - container for stat cards
   *  @param {string|HTMLElement} weeklyChartId - canvas for weekly chart
   *  @param {string|HTMLElement} monthlyChartId - canvas for monthly chart
   */
  init(statsId, weeklyChartId, monthlyChartId) {
    this.statsContainer = typeof statsId === 'string'
      ? document.getElementById(statsId)
      : statsId;
    this.weeklyChartCanvas = typeof weeklyChartId === 'string'
      ? document.getElementById(weeklyChartId)
      : weeklyChartId;
    this.monthlyChartCanvas = typeof monthlyChartId === 'string'
      ? document.getElementById(monthlyChartId)
      : monthlyChartId;

    this.render();
  },

  /** Full render: stats cards + both charts. */
  render() {
    const stats = window.SaunaData.getStats();
    const weeklyData = window.SaunaData.getWeeklyData();
    const monthlyData = window.SaunaData.getMonthlyData();

    this.renderStats(stats);
    this.initWeeklyChart(weeklyData);
    this.initMonthlyChart(monthlyData);
  },

  /** Update the stats cards with computed values. */
  renderStats(stats) {
    if (!this.statsContainer) return;

    const formatTime = (hours, minutes) => {
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    };

    const formatSeconds = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    };

    this.statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">🫖</div>
        <div class="stat-value">${stats.totalSessions}</div>
        <div class="stat-label">Total Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">${formatTime(stats.totalHours, stats.totalMinutes)}</div>
        <div class="stat-label">Total Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-value">${formatSeconds(stats.avgDuration)}</div>
        <div class="stat-label">Avg Duration</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-value">${formatSeconds(stats.longestSession)}</div>
        <div class="stat-label">Longest Session</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}</div>
        <div class="stat-label">Current Streak</div>
      </div>
    `;
  },

  /** Initialize the weekly bar chart (last 7 days duration).
   *  Destroys any previous chart instance first.
   */
  initWeeklyChart(data) {
    if (!this.weeklyChartCanvas) return;

    // Destroy previous chart
    if (this._weeklyChart) {
      this._weeklyChart.destroy();
      this._weeklyChart = null;
    }

    const ctx = this.weeklyChartCanvas.getContext('2d');

    // Create gradient fill for bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, this.colors.fillGradient.top);
    gradient.addColorStop(1, this.colors.fillGradient.bottom);

    // Format date labels: 'Mon 12', 'Tue 13', etc.
    const labels = data.map(d => {
      const date = new Date(d.date + 'T12:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    });

    const values = data.map(d => d.total_minutes);

    this._weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Minutes',
          data: values,
          backgroundColor: gradient,
          borderColor: this.colors.barBorder,
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.65
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f3f4f6',
            bodyColor: '#d1d5db',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} min`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.colors.grid },
            ticks: { color: this.colors.text, maxRotation: 0 }
          },
          y: {
            beginAtZero: true,
            grid: { color: this.colors.grid },
            ticks: {
              color: this.colors.text,
              callback: (val) => val + ' min'
            }
          }
        }
      }
    });
  },

  /** Initialize the monthly trend line chart (last 30 days).
   *  Destroys any previous chart instance first.
   */
  initMonthlyChart(data) {
    if (!this.monthlyChartCanvas) return;

    // Destroy previous chart
    if (this._monthlyChart) {
      this._monthlyChart.destroy();
      this._monthlyChart = null;
    }

    const ctx = this.monthlyChartCanvas.getContext('2d');

    // Build a gradient fill under the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, this.colors.fillGradient.top);
    gradient.addColorStop(1, this.colors.fillGradient.bottom);

    // Format labels: show every ~5th day to avoid clutter
    const labels = data.map((d, i) => {
      const date = new Date(d.date + 'T12:00:00');
      const day = date.getDate();
      // Show full 'Mon 12' for every 5th, or just day number for others
      if (i === 0 || i === data.length - 1 || day % 5 === 0 || day === 1) {
        return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      }
      return '';
    });

    const values = data.map(d => d.total_minutes);

    this._monthlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Minutes',
          data: values,
          borderColor: this.colors.accent,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: this.colors.accentLight,
          pointBorderColor: this.colors.accentDark,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f3f4f6',
            bodyColor: '#d1d5db',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} min`
            }
          }
        },
        scales: {
          x: {
            grid: { color: this.colors.grid, display: false },
            ticks: {
              color: this.colors.text,
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: this.colors.grid },
            ticks: {
              color: this.colors.text,
              callback: (val) => val + ' min'
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  },

  /** Clean up chart instances (call on page unload if needed). */
  destroy() {
    if (this._weeklyChart) {
      this._weeklyChart.destroy();
      this._weeklyChart = null;
    }
    if (this._monthlyChart) {
      this._monthlyChart.destroy();
      this._monthlyChart = null;
    }
  }
};
