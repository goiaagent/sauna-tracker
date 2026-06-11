/* ============================================================
   Sauna Tracker — log.js
   History page logic. Renders the session log table and
   handles filtering & deletion.
   ============================================================ */

window.SaunaLog = {

  /** The <tbody> element where rows are rendered. */
  tbodyEl: null,

  /** Optional <select> element for month filtering. */
  filterEl: null,

  /** Currently selected month filter value (e.g. '2025-06'), or '' for all. */
  currentFilter: '',

  /** Initialize with DOM references. */
  init(tbodyId, filterId) {
    this.tbodyEl = document.getElementById(tbodyId);
    if (filterId) {
      this.filterEl = document.getElementById(filterId);
    }
    // Populate month filter options from existing data
    this._populateMonthFilter();
    this.render();
  },

  /** Render the full session log table.
   *  Optionally pass a pre-filtered array; otherwise uses SaunaData. */
  render(sessions) {
    if (!this.tbodyEl) return;

    const allSessions = sessions || window.SaunaData.getAllSessions();

    // Apply month filter if active
    let filtered = allSessions;
    if (this.currentFilter) {
      filtered = allSessions.filter(s => s.date && s.date.startsWith(this.currentFilter));
    }

    if (filtered.length === 0) {
      this.tbodyEl.innerHTML = `
        <tr>
          <td colspan="5" class="empty-message">No sessions found. Start your first sauna!</td>
        </tr>`;
      return;
    }

    this.tbodyEl.innerHTML = filtered.map(s => this.renderRow(s)).join('');
  },

  /** Render a single table row for one session.
   *  @param {Object} session - { id, date, duration_seconds, temperature, notes }
   *  @returns {string} HTML string for the <tr> element.
   */
  renderRow(session) {
    const date = session.date || '—';
    const duration = this._formatDuration(session.duration_seconds);
    const temp = session.temperature != null ? session.temperature + '°C' : '—';
    const notes = session.notes ? this._escapeHtml(session.notes) : '—';
    const id = this._escapeHtml(session.id);

    return `
      <tr data-id="${id}">
        <td>${this._escapeHtml(date)}</td>
        <td>${duration}</td>
        <td>${temp}</td>
        <td class="notes-cell">${notes}</td>
        <td>
          <button class="btn-delete" data-id="${id}" onclick="SaunaLog.deleteSession('${id}')">
            ✕
          </button>
        </td>
      </tr>`;
  },

  /** Delete a session by id, then re-render. */
  deleteSession(id) {
    if (!confirm('Delete this sauna session?')) return;

    const deleted = window.SaunaData.deleteSession(id);
    if (deleted) {
      this.render();
    }
  },

  /** Set the month filter and re-render. */
  filterByMonth(month) {
    this.currentFilter = month || '';
    this.render();
  },

  /* ---------- internal helpers ---------- */

  /** Format seconds into human-readable duration string.
   *  e.g. 3661 -> '1h 1m 1s' */
  _formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '—';
    const s = Math.round(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const parts = [];
    if (hrs > 0) parts.push(hrs + 'h');
    if (mins > 0) parts.push(mins + 'm');
    parts.push(secs + 's');
    return parts.join(' ');
  },

  /** Escape HTML special characters in user-provided text. */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  },

  /** Populate the month filter <select> with options derived from session data. */
  _populateMonthFilter() {
    if (!this.filterEl) return;

    const sessions = window.SaunaData.getAllSessions();
    const months = new Set();
    sessions.forEach(s => {
      if (s.date && s.date.length >= 7) {
        months.add(s.date.slice(0, 7)); // 'YYYY-MM'
      }
    });

    const sorted = Array.from(months).sort().reverse();

    // Keep the current selection if any
    const currentVal = this.filterEl.value;

    this.filterEl.innerHTML = '<option value="">All months</option>';
    sorted.forEach(m => {
      const option = document.createElement('option');
      option.value = m;
      // Format display: 'June 2025'
      const [year, monthNum] = m.split('-');
      const dateObj = new Date(Number(year), Number(monthNum) - 1);
      const label = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      option.textContent = label;
      this.filterEl.appendChild(option);
    });

    // Restore selection
    if (currentVal) {
      this.filterEl.value = currentVal;
    }
  }
};
