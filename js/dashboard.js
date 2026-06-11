/* ============================================================
   Sauna Tracker — dashboard.js
   Dashboard page logic. Renders stat cards, Chart.js charts
   (weekly bar + monthly line), and biometrics integration
   (weight / body fat / muscle mass trends with sauna overlay).
   ============================================================ */

(function () {
  'use strict';

  /* ---- Colour palette (dark theme) ---- */
  const COLORS = {
    accent: '#d97706',              // amber-600
    accentLight: '#f59e0b',         // amber-500
    accentDark: '#b45309',          // amber-700
    grid: 'rgba(255,255,255,0.1)',
    text: 'rgba(255,255,255,0.8)',
    barBg: 'rgba(217,119,6,0.25)',
    barBorder: '#d97706',
    bioGreen: '#059669',            // emerald-600
    bioTeal: '#0d9488',             // teal-600
    saunaMarker: 'rgba(217,119,6,0.5)',
    fillGradient: {
      top: 'rgba(217,119,6,0.35)',
      bottom: 'rgba(217,119,6,0.02)'
    }
  };

  /* ---- Helpers ---- */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatHours(hours, minutes) {
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  function dateLabel(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  }

  /** Convert an array of {date, value} to Chart.js-friendly data. */
  function toChartData(points) {
    const labels = points.map(p => dateLabel(p.date));
    const values = points.map(p => p.value);
    return { labels, values };
  }

  /** Get unique sauna session dates from SaunaData as an array of date strings. */
  function getSaunaDates() {
    const sessions = window.SaunaData ? window.SaunaData.getAllSessions() : [];
    const dateSet = new Set(sessions.map(s => s.date));
    return Array.from(dateSet).sort();
  }

  /* ---- Biometrics processing ---- */
  function processBiometrics(data) {
    if (!data || !data.length) {
      document.getElementById('bioStatsContent').textContent = 'No biometrics data found.';
      return;
    }

    // Extract key metrics
    const extractMetric = (name) => {
      return data
        .filter(d => d.name === name)
        .map(d => ({ date: d.measuredOn.slice(0, 10), value: parseFloat(d.value) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const weightData = extractMetric('Weight');
    const bodyFatData = extractMetric('Fat mass Perc');
    // Use Skeletal Muscle Mass Perc (percentage) as closest match
    const musclePercData = extractMetric('Skeletal Muscle Mass Perc');
    const phaseAngleData = extractMetric('Phase Angle');
    const bmiData = extractMetric('BMI');
    const bmrData = extractMetric('Basal Metabolic Rate');

    // Build charts
    initWeightChart(weightData);
    initBodyFatChart(bodyFatData);
    initMuscleChart(musclePercData);

    // Build bio stats card
    renderBioStats(weightData, bodyFatData, musclePercData);
  }

  /* ================================================================
     1. renderStats — 6 stat cards from SaunaData
     ================================================================ */
  function renderStats() {
    const container = document.getElementById('statsGrid');
    if (!container) return;

    const stats = window.SaunaData ? window.SaunaData.getStats() : {
      totalSessions: 0, totalHours: 0, totalMinutes: 0,
      avgDuration: 0, longestSession: 0, currentStreak: 0
    };

    // Total Rounds — approximate as total sessions (each session = 1 round)
    const totalRounds = stats.totalSessions;
    // Contrast Sessions — look for sessions with 'contrast' in notes
    const sessions = window.SaunaData ? window.SaunaData.getAllSessions() : [];
    const contrastSessions = sessions.filter(s =>
      s.notes && s.notes.toLowerCase().includes('contrast')
    ).length;

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.currentStreak}</div>
        <div class="stat-label">Day Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalSessions}</div>
        <div class="stat-label">Total Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatHours(stats.totalHours, stats.totalMinutes)}</div>
        <div class="stat-label">Total Hours</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatTime(stats.avgDuration)}</div>
        <div class="stat-label">Avg Session</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalRounds}</div>
        <div class="stat-label">Total Rounds</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${contrastSessions}</div>
        <div class="stat-label">Contrast Sessions</div>
      </div>
    `;
  }

  /* ================================================================
     2. Weekly bar chart (7 days)
     ================================================================ */
  function initWeeklyChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;

    const data = window.SaunaData ? window.SaunaData.getWeeklyData() : [];
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, COLORS.fillGradient.top);
    gradient.addColorStop(1, COLORS.fillGradient.bottom);

    const labels = data.map(d => dateLabel(d.date));
    const values = data.map(d => d.total_minutes);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Minutes',
          data: values,
          backgroundColor: gradient,
          borderColor: COLORS.barBorder,
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
            grid: { color: COLORS.grid },
            ticks: { color: COLORS.text, maxRotation: 0 }
          },
          y: {
            beginAtZero: true,
            grid: { color: COLORS.grid },
            ticks: {
              color: COLORS.text,
              callback: (val) => val + ' min'
            }
          }
        }
      }
    });
  }

  /* ================================================================
     3. Monthly line chart (30 days)
     ================================================================ */
  function initMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;

    const data = window.SaunaData ? window.SaunaData.getMonthlyData() : [];
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, COLORS.fillGradient.top);
    gradient.addColorStop(1, COLORS.fillGradient.bottom);

    // Show labels sparingly — every ~5th day
    const labels = data.map((d, i) => {
      const day = new Date(d.date + 'T12:00:00').getDate();
      if (i === 0 || i === data.length - 1 || day % 5 === 0 || day === 1) {
        return dateLabel(d.date);
      }
      return '';
    });

    const values = data.map(d => d.total_minutes);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Minutes',
          data: values,
          borderColor: COLORS.accent,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: COLORS.accentLight,
          pointBorderColor: COLORS.accentDark,
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
            grid: { color: COLORS.grid, display: false },
            ticks: {
              color: COLORS.text,
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: COLORS.grid },
            ticks: {
              color: COLORS.text,
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
  }

  /* ================================================================
     4. Weight Chart (line) with sauna session overlay dots
     ================================================================ */
  function initWeightChart(points) {
    const canvas = document.getElementById('weightChart');
    if (!canvas || !points.length) return;

    const ctx = canvas.getContext('2d');
    const { labels, values } = toChartData(points);

    // Build gradient under the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(5,150,105,0.25)');
    gradient.addColorStop(1, 'rgba(5,150,105,0.02)');

    // Sauna session dates for overlay
    const saunaDates = getSaunaDates();
    // Map sauna dates to indices in the chart data
    const saunaSessionMarkers = points.map((p, i) => {
      return saunaDates.includes(p.date) ? values[i] : null;
    });

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          // Main weight line
          {
            label: 'Weight (kg)',
            data: values,
            borderColor: COLORS.bioGreen,
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: COLORS.bioGreen,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            order: 2
          },
          // Sauna session overlay markers (dots on the baseline)
          {
            label: 'Sauna session',
            data: saunaSessionMarkers,
            type: 'bar',
            backgroundColor: COLORS.saunaMarker,
            borderColor: COLORS.accent,
            borderWidth: 0,
            barPercentage: 0.3,
            categoryPercentage: 0.5,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: COLORS.text,
              font: { size: 11 },
              usePointStyle: true,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f3f4f6',
            bodyColor: '#d1d5db',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 10
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.grid },
            ticks: { color: COLORS.text }
          },
          y: {
            beginAtZero: false,
            grid: { color: COLORS.grid },
            ticks: {
              color: COLORS.text,
              callback: (val) => val + ' kg'
            }
          }
        }
      }
    });
  }

  /* ================================================================
     5. Body Fat % Chart (line)
     ================================================================ */
  function initBodyFatChart(points) {
    const canvas = document.getElementById('bodyFatChart');
    if (!canvas || !points.length) return;

    const ctx = canvas.getContext('2d');
    const { labels, values } = toChartData(points);

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(13,148,136,0.25)');
    gradient.addColorStop(1, 'rgba(13,148,136,0.02)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Body Fat %',
          data: values,
          borderColor: COLORS.bioTeal,
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: COLORS.bioTeal,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: COLORS.text,
              font: { size: 11 },
              usePointStyle: true,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f3f4f6',
            bodyColor: '#d1d5db',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.grid },
            ticks: { color: COLORS.text }
          },
          y: {
            beginAtZero: false,
            grid: { color: COLORS.grid },
            ticks: {
              color: COLORS.text,
              callback: (val) => val + '%'
            }
          }
        }
      }
    });
  }

  /* ================================================================
     6. Skeletal Muscle Mass Chart (line)
     ================================================================ */
  function initMuscleChart(points) {
    const canvas = document.getElementById('muscleChart');
    if (!canvas || !points.length) return;

    const ctx = canvas.getContext('2d');
    const { labels, values } = toChartData(points);

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(5,150,105,0.25)');
    gradient.addColorStop(1, 'rgba(5,150,105,0.02)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Skeletal Muscle Mass %',
          data: values,
          borderColor: COLORS.bioGreen,
          backgroundColor: gradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: COLORS.bioGreen,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: COLORS.text,
              font: { size: 11 },
              usePointStyle: true,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#f3f4f6',
            bodyColor: '#d1d5db',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.grid },
            ticks: { color: COLORS.text }
          },
          y: {
            beginAtZero: false,
            grid: { color: COLORS.grid },
            ticks: {
              color: COLORS.text,
              callback: (val) => val + '%'
            }
          }
        }
      }
    });
  }

  /* ================================================================
     7. Bio Stats Card — correlation summary
     ================================================================ */
  function renderBioStats(weightData, bodyFatData, muscleData) {
    const container = document.getElementById('bioStatsContent');
    if (!container) return;

    // Collect all unique biometric reading dates
    const allBioDates = new Set();
    weightData.forEach(d => allBioDates.add(d.date));
    bodyFatData.forEach(d => allBioDates.add(d.date));
    muscleData.forEach(d => allBioDates.add(d.date));
    const sortedBioDates = Array.from(allBioDates).sort();

    // Current sauna streak
    const stats = window.SaunaData ? window.SaunaData.getStats() : {};
    const streak = stats.currentStreak || 0;

    // Format dates nicely
    const formatDateNice = (ds) => {
      const d = new Date(ds + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const bioDateStr = sortedBioDates.length
      ? sortedBioDates.map(formatDateNice).join(' → ')
      : 'No readings';

    container.innerHTML = `
      <div class="bio-stat-row">
        <span class="bio-stat-label">Baseline readings (pre-sauna):</span>
        <span class="bio-stat-value">${bioDateStr}</span>
      </div>
      <div class="bio-stat-row">
        <span class="bio-stat-label">Current sauna streak:</span>
        <span class="bio-stat-value bio-stat-value--accent">${streak} day${streak !== 1 ? 's' : ''}</span>
      </div>
      <div class="bio-stat-row">
        <span class="bio-stat-label">Next reading:</span>
        <span class="bio-stat-value">Step on the scale to compare!</span>
      </div>
    `;
  }

  /* ================================================================
     Bootstrap
     ================================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    // Render existing sauna stats and charts
    renderStats();
    initWeeklyChart();
    initMonthlyChart();

    // Fetch and process biometrics data
    fetch('data/biometrics.json')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load biometrics.json');
        return r.json();
      })
      .then(data => {
        processBiometrics(data);
      })
      .catch(err => {
        console.warn('Dashboard: biometrics fetch failed', err);
        const el = document.getElementById('bioStatsContent');
        if (el) el.textContent = 'Biometrics data unavailable.';
      });
  });

})();
