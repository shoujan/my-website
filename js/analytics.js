/* ============================================
   ANALYTICS.JS — Dashboard, Charts & Scores
   ============================================ */

let analyticsCharts = {};

// ---- Initialize Analytics Dashboard ----
function initAnalytics() {
  renderSectionCompletion();
  renderMissingSections();
  renderStrengthGauge();
  renderScoreCards();
  renderRadarChart();
}

// ---- Update Dashboard ----
function updateAnalyticsDashboard() {
  const score = calculateResumeScore();

  // Update main score values
  animateDashValue('dashOverall', score.overall);
  animateDashValue('dashATS', score.ats);
  animateDashValue('dashKeywords', score.keyword);
  animateDashValue('dashReadability', calculateReadabilityScore());

  renderSectionCompletion();
  renderMissingSections();
  renderStrengthGauge();
  updateMiniCharts(score);
  renderRadarChart();
}

function animateDashValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  const step = (target - current) / 20;
  let val = current;
  const interval = setInterval(() => {
    val += step;
    el.textContent = Math.round(val);
    if (Math.abs(val - target) < 1) {
      el.textContent = target;
      clearInterval(interval);
    }
  }, 30);
  el.style.color = target >= 75 ? 'var(--accent-green)' :
                   target >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)';
}

// ---- Section Completion ----
function renderSectionCompletion() {
  const container = document.getElementById('sectionCompletionList');
  if (!container) return;

  const d = STATE.data;
  const sections = [
    { name: 'Personal Info', pct: calcPersonalPct(), icon: 'fa-user' },
    { name: 'Summary', pct: d.summary ? Math.min(100, Math.round(d.summary.length / 3)) : 0, icon: 'fa-align-left' },
    { name: 'Experience', pct: d.experience.length > 0 ? Math.min(100, d.experience.length * 33) : 0, icon: 'fa-briefcase' },
    { name: 'Education', pct: d.education.length > 0 ? 100 : 0, icon: 'fa-graduation-cap' },
    { name: 'Skills', pct: Math.min(100, d.skills.length * 8), icon: 'fa-code' },
    { name: 'Projects', pct: d.projects.length > 0 ? Math.min(100, d.projects.length * 33) : 0, icon: 'fa-diagram-project' },
    { name: 'Certifications', pct: d.certifications.length > 0 ? 100 : 0, icon: 'fa-certificate' },
    { name: 'Languages', pct: d.languages.length > 0 ? 100 : 0, icon: 'fa-language' }
  ];

  container.innerHTML = sections.map(s => `
    <div class="completion-item">
      <i class="fa-solid ${s.icon}" style="color:var(--accent);width:16px;font-size:12px;"></i>
      <span class="completion-item-label">${s.name}</span>
      <div class="completion-item-track">
        <div class="completion-item-fill" style="width:${s.pct}%;background:${s.pct >= 75 ? 'linear-gradient(90deg,var(--accent-green),#34d399)' : s.pct >= 40 ? 'linear-gradient(90deg,var(--accent-orange),#fcd34d)' : 'linear-gradient(90deg,var(--accent-red),#f87171)'}"></div>
      </div>
      <span class="completion-item-pct" style="color:${s.pct >= 75 ? 'var(--accent-green)' : s.pct >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)'}">${s.pct}%</span>
    </div>`).join('');
}

function calcPersonalPct() {
  const p = STATE.data.personal;
  const fields = [p.firstName, p.lastName, p.email, p.phone, p.location, p.website || p.linkedin];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

// ---- Missing Sections ----
function renderMissingSections() {
  const container = document.getElementById('missingSections');
  if (!container) return;

  const d = STATE.data;
  const checks = [
    { label: 'Professional Summary', present: !!d.summary, suggestion: 'Add a compelling 3-4 sentence summary' },
    { label: 'Work Experience', present: d.experience.length > 0, suggestion: 'Add at least 2-3 positions' },
    { label: 'Education', present: d.education.length > 0, suggestion: 'Add your highest degree' },
    { label: 'Skills (5+)', present: d.skills.length >= 5, suggestion: 'Add at least 5 relevant skills' },
    { label: 'Contact Email', present: !!d.personal.email, suggestion: 'Add your professional email' },
    { label: 'Phone Number', present: !!d.personal.phone, suggestion: 'Add your phone number' },
    { label: 'LinkedIn URL', present: !!d.personal.linkedin, suggestion: 'Add your LinkedIn profile' },
    { label: 'Projects', present: d.projects.length > 0, suggestion: 'Add 1-3 notable projects' }
  ];

  container.innerHTML = checks.map(c => `
    <div class="missing-item ${c.present ? 'present' : 'missing'}" title="${!c.present ? c.suggestion : 'Complete!'}">
      <i class="fa-solid ${c.present ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
      <span>${c.label}</span>
      ${!c.present ? `<span style="font-size:10px;color:var(--text-tertiary);margin-left:auto;">${c.suggestion}</span>` : ''}
    </div>`).join('');
}

// ---- Strength Gauge ----
function renderStrengthGauge() {
  const canvas = document.getElementById('gaugeChart');
  if (!canvas) return;

  const score = calculateResumeScore();
  const overall = score.overall;
  const ctx = canvas.getContext('2d');

  // Destroy existing
  if (analyticsCharts.gauge) {
    analyticsCharts.gauge.destroy();
  }

  const label = document.getElementById('gaugeLabel');
  const strength = overall >= 80 ? 'Excellent' : overall >= 60 ? 'Good' : overall >= 40 ? 'Fair' : 'Needs Work';
  const color = overall >= 80 ? '#10b981' : overall >= 60 ? '#f59e0b' : overall >= 40 ? '#f59e0b' : '#ef4444';

  if (label) {
    label.textContent = strength;
    label.style.color = color;
  }

  analyticsCharts.gauge = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [overall, 100 - overall],
        backgroundColor: [color, 'rgba(255,255,255,0.05)'],
        borderColor: ['transparent', 'transparent'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: false,
      cutout: '75%',
      rotation: -90,
      circumference: 180,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 1000, easing: 'easeInOutQuart' }
    }
  });

  // Strength Tips
  const tipsEl = document.getElementById('strengthTips');
  if (tipsEl) {
    const tips = [];
    if (!STATE.data.summary) tips.push({ type: 'error', text: 'Add a professional summary' });
    else if (STATE.data.summary.length < 100) tips.push({ type: 'warning', text: 'Expand your summary (aim for 150+ chars)' });
    else tips.push({ type: 'success', text: 'Summary looks great!' });

    if (STATE.data.experience.length === 0) tips.push({ type: 'error', text: 'Add work experience' });
    else if (!STATE.data.experience.some(e => e.description && e.description.length > 80)) tips.push({ type: 'warning', text: 'Add detailed descriptions with achievements' });
    else tips.push({ type: 'success', text: 'Experience section is strong' });

    if (STATE.data.skills.length < 5) tips.push({ type: 'warning', text: `Add more skills (${STATE.data.skills.length}/5 minimum)` });
    else tips.push({ type: 'success', text: `${STATE.data.skills.length} skills listed` });

    tipsEl.innerHTML = tips.map(t => `
      <div class="strength-tip ${t.type}">
        <i class="fa-solid ${t.type === 'success' ? 'fa-check' : t.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-xmark'}"></i>
        <span>${t.text}</span>
      </div>`).join('');
  }
}

// ---- Mini Charts (Score Cards) ----
function updateMiniCharts(score) {
  const chartConfigs = [
    { id: 'miniChartOverall', value: score.overall, color: '#8b5cf6' },
    { id: 'miniChartATS', value: score.ats, color: '#3b82f6' },
    { id: 'miniChartKW', value: score.keyword, color: '#10b981' },
    { id: 'miniChartRead', value: calculateReadabilityScore(), color: '#f59e0b' }
  ];

  chartConfigs.forEach(cfg => {
    const canvas = document.getElementById(cfg.id);
    if (!canvas) return;

    if (analyticsCharts[cfg.id]) analyticsCharts[cfg.id].destroy();

    analyticsCharts[cfg.id] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [cfg.value, 100 - cfg.value],
          backgroundColor: [cfg.color, 'rgba(255,255,255,0.05)'],
          borderColor: ['transparent', 'transparent'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 800 }
      }
    });
  });
}

// ---- Radar Chart ----
function renderRadarChart() {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;

  if (analyticsCharts.radar) analyticsCharts.radar.destroy();

  const score = calculateResumeScore();
  const readability = calculateReadabilityScore();

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  analyticsCharts.radar = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: {
      labels: ['Overall', 'ATS Score', 'Keywords', 'Readability', 'Completeness', 'Skills'],
      datasets: [{
        label: 'Resume Quality',
        data: [score.overall, score.ats, score.keyword, readability, score.completion, Math.min(100, STATE.data.skills.length * 8)],
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointRadius: 4
      }]
    },
    options: {
      responsive: false,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: {
            stepSize: 25,
            display: false
          },
          grid: { color: gridColor },
          pointLabels: {
            color: textColor,
            font: { size: 10, family: 'Inter' }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          bodyColor: '#fff',
          titleColor: '#fff',
          borderColor: '#6366f1',
          borderWidth: 1
        }
      },
      animation: { duration: 800 }
    }
  });
}

// ---- Score Cards for Dashboard ----
function renderScoreCards() {
  const score = calculateResumeScore();
  updateMiniCharts(score);
}

// ---- Readability Score ----
function calculateReadabilityScore() {
  const d = STATE.data;
  let score = 0;

  // Check summary readability
  if (d.summary) {
    const words = d.summary.split(/\s+/).length;
    const sentences = d.summary.split(/[.!?]+/).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;

    // Ideal: 15-20 words per sentence
    if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 22) score += 30;
    else if (avgWordsPerSentence > 0) score += 15;

    // Length check
    if (words >= 40 && words <= 120) score += 20;
    else if (words > 0) score += 10;
  }

  // Experience descriptions
  if (d.experience.length > 0) {
    const hasGoodDesc = d.experience.some(e => e.description && e.description.length > 100);
    const hasBullets = d.experience.some(e => e.description && e.description.includes('\n'));
    if (hasGoodDesc) score += 25;
    if (hasBullets) score += 15;
  }

  // Complete sections
  if (d.personal.professionalTitle) score += 10;

  return Math.min(100, score);
}

// ---- Toast Notifications ----
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} toast-icon"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);

  return toast;
}

// ---- Refresh Analytics when tab switches ----
function onAnalyticsTabOpen() {
  updateAnalyticsDashboard();
}
