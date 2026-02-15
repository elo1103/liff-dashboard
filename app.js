/* ==========================================================
   app.js — UI Rendering & Interaction Logic (ESM Module)
   ----------------------------------------------------------
   從 Supabase 讀取資料並 render，整合 LINE LIFF。
   ========================================================== */

import {
  fetchOpenAlertsWithProjects,
  fetchProjectById,
  fetchAlertsByProjectId,
  assignAlert,
  formatMoney,
  estimateLoss,
} from './data.js';

// ---- Config ----
const LIFF_ID = '2008507273-1a40F8cB';

// ---- DOM References ----
const $home        = document.getElementById('view-home');
const $detail      = document.getElementById('view-detail');
const $latestAlert = document.getElementById('latest-alert');
const $kpi         = document.getElementById('kpi-section');
const $projectList = document.getElementById('project-list');
const $navTitle    = document.getElementById('nav-title');
const $navBack     = document.getElementById('nav-back');
const $modalOverlay= document.getElementById('modal-overlay');
const $modalProjectName = document.getElementById('modal-project-name');
const $selectPm    = document.getElementById('select-pm');
const $selectDeadline = document.getElementById('select-deadline');
const $inputNote   = document.getElementById('input-note');
const $btnSubmit   = document.getElementById('btn-assign-submit');
const $modalClose  = document.getElementById('modal-close');
const $toast       = document.getElementById('toast');

// ---- State ----
let currentAlertId = null;
let cachedAlerts = [];


// ---- LIFF Init ----
async function initLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    console.log('LIFF initialized. isInClient:', liff.isInClient());
  } catch (err) {
    console.warn('LIFF init failed (outside LINE is OK):', err.message);
  }
}


// ---- Loading / Error Helpers ----
function showLoading(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}
function showError(el, msg) {
  el.innerHTML = `<div class="error-msg">${msg}</div>`;
}


// ===== RENDER: Home =====

async function renderHome() {
  $home.classList.remove('hidden');
  $detail.classList.add('hidden');
  $navBack.classList.add('hidden');
  $navTitle.textContent = '專案利潤預警系統';

  showLoading($latestAlert);
  $kpi.innerHTML = '';
  showLoading($projectList);

  try {
    cachedAlerts = await fetchOpenAlertsWithProjects();
    renderLatestAlert();
    renderKPI();
    renderProjectList();
  } catch (err) {
    console.error('renderHome error:', err);
    showError($latestAlert, '載入失敗：' + err.message);
    showError($projectList, '載入失敗：' + err.message);
  }
}


// ---- A1: Latest Alert ----

function renderLatestAlert() {
  const alert = cachedAlerts[0];

  if (!alert) {
    $latestAlert.className = 'card card-alert no-alert';
    $latestAlert.innerHTML = `
      <span class="alert-badge safe">All Clear</span>
      <p class="alert-project-name">目前沒有未處理警訊</p>
      <p class="alert-reason">所有專案利潤在安全範圍內。</p>
    `;
    return;
  }

  const project = alert.project;
  if (!project) return;

  const loss = alert.est_impact_amount || estimateLoss(alert.forecast_margin_pct, alert.target_margin_pct, project.contract_amount);
  const sev = alert.severity || 'red';

  // Card style by severity
  if (sev === 'yellow') {
    $latestAlert.className = 'card card-alert alert-yellow';
  } else if (sev === 'green') {
    $latestAlert.className = 'card card-alert no-alert';
  } else {
    $latestAlert.className = 'card card-alert';
  }

  const sevBadge = sev === 'red' ? '' : ' severity-' + sev;
  const valColor = sev === 'red' ? 'text-red' : sev === 'yellow' ? 'text-yellow' : 'text-green';
  const esc = escName(project.project_name);

  $latestAlert.innerHTML = `
    <span class="alert-badge${sevBadge}">Latest Alert</span>
    <p class="alert-project-name">${project.project_name}</p>
    <div class="alert-metrics">
      <div>
        <div class="alert-metric-label">預測毛利</div>
        <div class="alert-metric-value ${valColor}">${alert.forecast_margin_pct}%</div>
      </div>
      <div>
        <div class="alert-metric-label">目標毛利</div>
        <div class="alert-metric-value">${alert.target_margin_pct}%</div>
      </div>
      <div>
        <div class="alert-metric-label">預估影響</div>
        <div class="alert-metric-value text-red">${formatMoney(loss)}</div>
      </div>
      <div>
        <div class="alert-metric-label">週次</div>
        <div class="alert-metric-value">${alert.week_no ? 'W' + alert.week_no : '—'}</div>
      </div>
    </div>
    <p class="alert-reason">${alert.message || alert.title}</p>
    <div class="alert-actions">
      <button class="btn btn-secondary btn-sm" onclick="window._showDetail('${project.id}')">查看</button>
      <button class="btn btn-primary btn-sm" onclick="window._openAssignModal('${alert.id}', '${esc}')">指派 PM</button>
    </div>
  `;
}


// ---- A2: KPI Cards ----

function renderKPI() {
  if (cachedAlerts.length === 0) {
    $kpi.innerHTML = `
      <div class="kpi-card"><div class="kpi-value green">—</div><div class="kpi-label">預測毛利</div></div>
      <div class="kpi-card"><div class="kpi-value">—</div><div class="kpi-label">目標毛利</div></div>
      <div class="kpi-card"><div class="kpi-value green">0</div><div class="kpi-label">未處理警訊</div></div>
    `;
    return;
  }

  const forecasts = cachedAlerts.map(a => a.forecast_margin_pct).filter(v => v != null);
  const targets   = cachedAlerts.map(a => a.target_margin_pct).filter(v => v != null);

  const avgForecast = forecasts.length
    ? Math.round((forecasts.reduce((s, v) => s + v, 0) / forecasts.length) * 10) / 10
    : 0;
  const avgTarget = targets.length
    ? Math.round((targets.reduce((s, v) => s + v, 0) / targets.length) * 10) / 10
    : 0;
  const redCount = cachedAlerts.filter(a => a.severity === 'red').length;
  const forecastColor = avgForecast < 12 ? 'red' : avgForecast < 18 ? 'yellow' : 'green';

  $kpi.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value ${forecastColor}">${avgForecast}%</div>
      <div class="kpi-label">平均預測毛利</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${avgTarget}%</div>
      <div class="kpi-label">平均目標毛利</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value red">${redCount}</div>
      <div class="kpi-label">高風險警訊</div>
    </div>
  `;
}


// ---- A3: Project List ----

function renderProjectList() {
  const top5 = cachedAlerts.slice(0, 5);

  if (top5.length === 0) {
    $projectList.innerHTML = '<p class="empty-msg">目前沒有未處理的風險警訊。</p>';
    return;
  }

  $projectList.innerHTML = top5.map(renderAlertCard).join('');
}

function renderAlertCard(alert) {
  const project = alert.project;
  if (!project) return '';

  const sev = alert.severity || 'yellow';
  const isAssigned = alert.status === 'assigned';
  const esc = escName(project.project_name);
  const reason = alert.message || alert.title || '';
  const shortReason = reason.length > 30 ? reason.substring(0, 30) + '...' : reason;

  const assignedHtml = isAssigned
    ? `<div class="assigned-tag">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
         已指派 ${alert.assigned_to || ''}
       </div>`
    : '';

  const assignBtnHtml = !isAssigned
    ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window._openAssignModal('${alert.id}', '${esc}')">指派 PM</button>`
    : '';

  return `
    <div class="project-card" onclick="window._showDetail('${project.id}')">
      ${assignedHtml}
      <div class="project-header">
        <div>
          <div class="project-name">${project.project_name}</div>
          <div class="project-contract">合約 ${formatMoney(project.contract_amount)}</div>
        </div>
        <span class="risk-badge ${sev}">
          <span class="dot"></span>
          ${alert.forecast_margin_pct != null ? alert.forecast_margin_pct + '%' : sev}
        </span>
      </div>
      <p class="project-reason">${shortReason}</p>
      <div class="project-actions">
        ${assignBtnHtml}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window._showDetail('${project.id}')">查看細節</button>
      </div>
    </div>
  `;
}


// ===== RENDER: Project Detail =====

async function showDetail(projectId) {
  $home.classList.add('hidden');
  $detail.classList.remove('hidden');
  $navBack.classList.remove('hidden');
  $navTitle.textContent = '專案詳情';

  showLoading($detail);

  try {
    const [project, alerts] = await Promise.all([
      fetchProjectById(projectId),
      fetchAlertsByProjectId(projectId),
    ]);

    const latestAlert = alerts[0] || null;
    const sev = latestAlert?.severity || 'green';
    const forecastPct = latestAlert?.forecast_margin_pct;
    const loss = latestAlert
      ? (latestAlert.est_impact_amount || estimateLoss(forecastPct, project.target_margin_pct, project.contract_amount))
      : 0;
    const isAssigned = latestAlert?.status === 'assigned';
    const esc = escName(project.project_name);

    // Hours progress
    const estH = project.estimated_hours || 0;
    const actH = project.actual_hours || 0;
    const hoursPct = estH > 0 ? Math.round((actH / estH) * 100) : 0;
    const overrun = actH > estH;

    $detail.innerHTML = `
      <!-- Hero -->
      <div class="detail-hero">
        <div class="detail-project-name">${project.project_name}</div>
        <div class="detail-contract">合約金額 ${formatMoney(project.contract_amount)}</div>
        ${project.project_code ? `<div class="detail-contract">專案編號 ${project.project_code}</div>` : ''}
      </div>

      <!-- KPI row -->
      <div class="detail-kpi-row">
        <div class="detail-kpi">
          <div class="detail-kpi-value ${sev}">${forecastPct != null ? forecastPct + '%' : '—'}</div>
          <div class="detail-kpi-label">預測毛利</div>
        </div>
        <div class="detail-kpi">
          <div class="detail-kpi-value">${project.target_margin_pct}%</div>
          <div class="detail-kpi-label">目標毛利</div>
        </div>
        <div class="detail-kpi">
          <div class="detail-kpi-value text-red">${loss > 0 ? formatMoney(loss) : '—'}</div>
          <div class="detail-kpi-label">預估影響</div>
        </div>
      </div>

      <!-- Hours Progress -->
      <div class="hours-section">
        <div class="hours-title">工時進度</div>
        <div class="hours-bar-wrap">
          <div class="hours-bar ${overrun ? 'overrun' : ''}" style="width: ${Math.min(hoursPct, 100)}%;"></div>
        </div>
        <div class="hours-labels">
          <span>實際 ${actH}h</span>
          <span>預估 ${estH}h</span>
          <span class="${overrun ? 'text-red' : ''}">${hoursPct}%</span>
        </div>
      </div>

      <!-- Trend Chart (mock) -->
      <div class="chart-container">
        <div class="chart-title">毛利趨勢（模擬）</div>
        <div id="chart-area"></div>
      </div>

      <!-- Alert History -->
      ${alerts.length > 0 ? `
        <div class="risk-breakdown">
          <div class="risk-breakdown-title">警訊紀錄</div>
          ${alerts.map(a => `
            <div class="risk-item">
              <span class="risk-item-label">
                <span class="dot-inline ${a.severity}"></span>
                ${a.title || a.message || ''}
              </span>
              <span class="risk-item-value ${a.status === 'open' ? 'negative' : ''}">${a.status === 'open' ? '未處理' : '已指派'}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- CTA -->
      <div class="mb-20">
        ${isAssigned
          ? `<div class="assigned-tag" style="justify-content:center; padding:12px 20px; font-size:14px;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
               已指派給 ${latestAlert.assigned_to || 'PM'}
             </div>`
          : (latestAlert
            ? `<button class="btn btn-primary btn-full" onclick="window._openAssignModal('${latestAlert.id}', '${esc}')">指派 PM</button>`
            : `<button class="btn btn-secondary btn-full" disabled>無需指派</button>`)
        }
      </div>
    `;

    // Draw mock trend chart
    requestAnimationFrame(() => {
      drawMockTrendChart(project.target_margin_pct, forecastPct, sev);
    });

  } catch (err) {
    console.error('showDetail error:', err);
    showError($detail, '載入失敗：' + err.message);
  }
}


// ===== CHART: Mock Trend (placeholder until profit_snapshots table exists) =====

function drawMockTrendChart(targetPct, forecastPct, severity) {
  const container = document.getElementById('chart-area');
  if (!container) return;

  const target = targetPct || 20;
  const forecast = forecastPct != null ? forecastPct : target;
  const weeks = 6;

  // Generate smooth mock trend: start near target, drift toward forecast
  const data = [];
  for (let i = 0; i < weeks; i++) {
    const t = i / (weeks - 1);
    data.push(Math.round(target + (forecast - target) * t + (Math.random() - 0.5) * 1.5));
  }
  data[weeks - 1] = forecast; // Ensure last point = current forecast

  // Dimensions
  const W = container.clientWidth || 320;
  const H = 180;
  const padL = 36, padR = 16, padT = 16, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const allValues = [...data, target];
  const yMin = Math.floor(Math.min(...allValues) / 5) * 5 - 5;
  const yMax = Math.ceil(Math.max(...allValues) / 5) * 5 + 5;

  function xPos(i) { return padL + (i / (weeks - 1)) * chartW; }
  function yPos(v) { return padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH; }

  const points = data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ');
  const areaPoints = `${xPos(0)},${yPos(data[0])} ${points} ${xPos(weeks-1)},${padT + chartH} ${xPos(0)},${padT + chartH}`;

  const lineColor = severity === 'red' ? '#ff3b30' : severity === 'yellow' ? '#ff9500' : '#34c759';

  let yLabels = '';
  for (let v = yMin; v <= yMax; v += 5) {
    const y = yPos(v);
    yLabels += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e8e8ed" stroke-width="0.5"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="#86868b" font-size="11">${v}%</text>
    `;
  }

  let xLabels = '';
  for (let i = 0; i < weeks; i++) {
    xLabels += `<text x="${xPos(i)}" y="${H - 4}" text-anchor="middle" fill="#86868b" font-size="11">W${i + 1}</text>`;
  }

  let dots = '';
  data.forEach((v, i) => {
    dots += `<circle cx="${xPos(i)}" cy="${yPos(v)}" r="4" fill="${lineColor}" stroke="#fff" stroke-width="2"/>`;
  });

  const lastVal = data[data.length - 1];

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${yLabels}
      ${xLabels}
      <line x1="${padL}" y1="${yPos(target)}" x2="${W - padR}" y2="${yPos(target)}"
            stroke="#86868b" stroke-width="1" stroke-dasharray="6 4"/>
      <text x="${W - padR + 2}" y="${yPos(target) + 4}" fill="#86868b" font-size="10" text-anchor="start">目標</text>
      <polygon points="${areaPoints}" fill="url(#areaGrad)"/>
      <polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      <text x="${xPos(weeks-1) + 2}" y="${yPos(lastVal) - 8}" fill="${lineColor}" font-size="12" font-weight="600">${lastVal}%</text>
    </svg>
  `;
}


// ===== MODAL: Assign PM =====

function openAssignModal(alertId, projectName) {
  currentAlertId = alertId;
  $modalProjectName.textContent = projectName;
  $selectPm.value = '';
  $selectDeadline.value = '';
  $inputNote.value = '';
  $btnSubmit.disabled = false;
  $btnSubmit.textContent = '送出指派';
  $modalOverlay.classList.remove('hidden');
}

function closeModal() {
  $modalOverlay.classList.add('hidden');
  currentAlertId = null;
}

async function handleAssignSubmit() {
  const pm = $selectPm.value;
  const deadline = $selectDeadline.value;
  const note = $inputNote.value.trim();

  if (!pm) { showToast('請選擇 PM'); return; }
  if (!deadline) { showToast('請選擇期限'); return; }

  $btnSubmit.disabled = true;
  $btnSubmit.textContent = '送出中…';

  try {
    await assignAlert(currentAlertId, pm, deadline, note);
    closeModal();
    showToast(`已指派給 ${pm}`);
    await renderHome();
  } catch (err) {
    console.error('assignAlert error:', err);
    showToast('指派失敗：' + err.message);
    $btnSubmit.disabled = false;
    $btnSubmit.textContent = '送出指派';
  }
}

// ---- Modal events ----
$modalClose.addEventListener('click', closeModal);
$modalOverlay.addEventListener('click', (e) => {
  if (e.target === $modalOverlay) closeModal();
});
$btnSubmit.addEventListener('click', handleAssignSubmit);


// ===== NAVIGATION =====

$navBack.addEventListener('click', () => {
  renderHome();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


// ===== TOAST =====

function showToast(message) {
  $toast.textContent = message;
  $toast.classList.remove('hidden');
  clearTimeout($toast._timer);
  $toast._timer = setTimeout(() => {
    $toast.classList.add('hidden');
  }, 2200);
}


// ===== UTILS =====

/** Escape single quotes for inline onclick handlers */
function escName(name) {
  return (name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}


// ===== Expose to window (needed for inline onclick in HTML templates) =====

window._showDetail = showDetail;
window._openAssignModal = openAssignModal;


// ===== INIT =====

(async () => {
  await initLiff();
  await renderHome();
})();
