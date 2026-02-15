/* ==========================================================
   app.js — UI Rendering & Interaction Logic
   ----------------------------------------------------------
   所有 UI 都從 data.js 的 functions render，
   不在 HTML 寫死任何資料。
   ========================================================== */

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

// Current state
let currentAlertId = null;  // which alert is being assigned


// ===== RENDER: Home =====

function renderHome() {
  $home.classList.remove('hidden');
  $detail.classList.add('hidden');
  $navBack.classList.add('hidden');
  $navTitle.textContent = '專案利潤預警系統';

  renderLatestAlert();
  renderKPI();
  renderProjectList();
}

// ---- A1: Latest Alert ----

function renderLatestAlert() {
  const alert = getLatestPendingAlert();

  if (!alert) {
    $latestAlert.className = 'card card-alert no-alert';
    $latestAlert.innerHTML = `
      <span class="alert-badge safe">All Clear</span>
      <p class="alert-project-name">目前沒有紅色警訊</p>
      <p class="alert-reason">所有專案利潤在安全範圍內。</p>
    `;
    return;
  }

  const project = getAlertProject(alert);
  if (!project) return;

  const loss = estimateLoss(project);

  $latestAlert.className = 'card card-alert';
  $latestAlert.innerHTML = `
    <span class="alert-badge">Latest Alert</span>
    <p class="alert-project-name">${project.name}</p>
    <div class="alert-metrics">
      <div>
        <div class="alert-metric-label">預測毛利</div>
        <div class="alert-metric-value text-red">${project.forecastMarginPct}%</div>
      </div>
      <div>
        <div class="alert-metric-label">目標毛利</div>
        <div class="alert-metric-value">${project.targetMarginPct}%</div>
      </div>
      <div>
        <div class="alert-metric-label">預估損失</div>
        <div class="alert-metric-value text-red">${formatMoney(loss)}</div>
      </div>
      <div>
        <div class="alert-metric-label">主要原因</div>
        <div class="alert-metric-value" style="font-size:13px">${alert.reason.substring(0, 20)}…</div>
      </div>
    </div>
    <p class="alert-reason">${alert.reason}</p>
    <div class="alert-actions">
      <button class="btn btn-secondary btn-sm" onclick="showDetail('${project.id}')">查看</button>
      <button class="btn btn-primary btn-sm" onclick="openAssignModal('${alert.id}', '${project.name}')">指派 PM</button>
    </div>
  `;
}

// ---- A2: KPI Cards ----

function renderKPI() {
  const avgForecast = getAvgForecastMargin();
  const avgTarget   = getAvgTargetMargin();
  const highRisk    = getHighRiskCount();

  const forecastColor = avgForecast < 12 ? 'red' : avgForecast < 18 ? 'yellow' : 'green';

  $kpi.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-value ${forecastColor}">${avgForecast}%</div>
      <div class="kpi-label">本月預測毛利</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value">${avgTarget}%</div>
      <div class="kpi-label">目標毛利</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value red">${highRisk}</div>
      <div class="kpi-label">高風險專案</div>
    </div>
  `;
}

// ---- A3: Project List ----

function renderProjectList() {
  const projects = getTopRiskProjects(5);
  $projectList.innerHTML = projects.map(p => renderProjectCard(p)).join('');
}

function renderProjectCard(project) {
  const level = getRiskLevel(project.forecastMarginPct);
  const assigned = isProjectAssigned(project.id);
  const alert = getAlertByProjectId(project.id);

  const assignedHtml = assigned
    ? `<div class="assigned-tag">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
         已指派
       </div>`
    : '';

  const assignBtnHtml = (!assigned && alert)
    ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openAssignModal('${alert.id}', '${project.name}')">指派 PM</button>`
    : '';

  return `
    <div class="project-card" onclick="showDetail('${project.id}')">
      ${assignedHtml}
      <div class="project-header">
        <div>
          <div class="project-name">${project.name}</div>
          <div class="project-contract">合約 ${formatMoney(project.contractAmount)}</div>
        </div>
        <span class="risk-badge ${level}">
          <span class="dot"></span>
          ${project.forecastMarginPct}%
        </span>
      </div>
      <p class="project-reason">${project.riskReason}</p>
      <div class="project-actions">
        ${assignBtnHtml}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); showDetail('${project.id}')">查看細節</button>
      </div>
    </div>
  `;
}


// ===== RENDER: Project Detail =====

function showDetail(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  $home.classList.add('hidden');
  $detail.classList.remove('hidden');
  $navBack.classList.remove('hidden');
  $navTitle.textContent = '專案詳情';

  const level = getRiskLevel(project.forecastMarginPct);
  const assigned = isProjectAssigned(project.id);
  const alert = getAlertByProjectId(project.id);
  const loss = estimateLoss(project);

  $detail.innerHTML = `
    <!-- Hero -->
    <div class="detail-hero">
      <div class="detail-project-name">${project.name}</div>
      <div class="detail-contract">合約金額 ${formatMoney(project.contractAmount)}</div>
    </div>

    <!-- KPI row -->
    <div class="detail-kpi-row">
      <div class="detail-kpi">
        <div class="detail-kpi-value ${level}">${project.forecastMarginPct}%</div>
        <div class="detail-kpi-label">預測毛利</div>
      </div>
      <div class="detail-kpi">
        <div class="detail-kpi-value">${project.targetMarginPct}%</div>
        <div class="detail-kpi-label">目標毛利</div>
      </div>
      <div class="detail-kpi">
        <div class="detail-kpi-value text-red">${loss > 0 ? formatMoney(loss) : '—'}</div>
        <div class="detail-kpi-label">預估損失</div>
      </div>
    </div>

    <!-- Trend Chart -->
    <div class="chart-container">
      <div class="chart-title">毛利趨勢</div>
      <div id="chart-area"></div>
    </div>

    <!-- Risk Breakdown -->
    <div class="risk-breakdown">
      <div class="risk-breakdown-title">風險來源拆解</div>
      ${project.riskFactors.map(f => `
        <div class="risk-item">
          <span class="risk-item-label">${f.label}</span>
          <span class="risk-item-value ${f.value.startsWith('+') ? 'negative' : ''}">${f.value}</span>
        </div>
      `).join('')}
    </div>

    <!-- Suggested Actions -->
    <div class="actions-section">
      <div class="actions-title">建議動作</div>
      <div class="action-chips">
        ${project.suggestions.map(s => `<button class="chip" onclick="this.classList.toggle('selected')">${s}</button>`).join('')}
      </div>
    </div>

    <!-- CTA -->
    <div class="mb-20">
      ${assigned
        ? `<div class="assigned-tag" style="justify-content:center; padding:12px 20px; font-size:14px;">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
             此專案已指派 PM
           </div>`
        : (alert
          ? `<button class="btn btn-primary btn-full" onclick="openAssignModal('${alert.id}', '${project.name}')">指派 PM</button>`
          : `<button class="btn btn-secondary btn-full" disabled>無需指派</button>`)
      }
    </div>
  `;

  // Draw chart after DOM is ready
  requestAnimationFrame(() => drawTrendChart(project));
}


// ===== CHART: Pure SVG Line Chart =====

function drawTrendChart(project) {
  const container = document.getElementById('chart-area');
  if (!container) return;

  const data = project.trend;
  const target = project.targetMarginPct;
  const weeks = data.length;

  // Dimensions
  const W = container.clientWidth || 320;
  const H = 180;
  const padL = 36, padR = 16, padT = 16, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Scale: y-axis range
  const allValues = [...data, target];
  const yMin = Math.floor(Math.min(...allValues) / 5) * 5 - 5;
  const yMax = Math.ceil(Math.max(...allValues) / 5) * 5 + 5;

  function xPos(i) { return padL + (i / (weeks - 1)) * chartW; }
  function yPos(v) { return padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH; }

  // Build points
  const points = data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ');

  // Gradient area
  const areaPoints = `${xPos(0)},${yPos(data[0])} ${points} ${xPos(weeks-1)},${padT + chartH} ${xPos(0)},${padT + chartH}`;

  // Y-axis labels (every 5%)
  let yLabels = '';
  for (let v = yMin; v <= yMax; v += 5) {
    const y = yPos(v);
    yLabels += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e8e8ed" stroke-width="0.5"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="#86868b" font-size="11">${v}%</text>
    `;
  }

  // X-axis labels
  let xLabels = '';
  for (let i = 0; i < weeks; i++) {
    xLabels += `<text x="${xPos(i)}" y="${H - 4}" text-anchor="middle" fill="#86868b" font-size="11">W${i + 1}</text>`;
  }

  // Dots
  const level = getRiskLevel(project.forecastMarginPct);
  const lineColor = level === 'red' ? '#ff3b30' : level === 'yellow' ? '#ff9500' : '#34c759';

  let dots = '';
  data.forEach((v, i) => {
    dots += `<circle cx="${xPos(i)}" cy="${yPos(v)}" r="4" fill="${lineColor}" stroke="#fff" stroke-width="2"/>`;
  });

  // Last value label
  const lastVal = data[data.length - 1];
  const lastLabelHtml = `<text x="${xPos(weeks-1) + 2}" y="${yPos(lastVal) - 8}" fill="${lineColor}" font-size="12" font-weight="600">${lastVal}%</text>`;

  const svg = `
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>

      ${yLabels}
      ${xLabels}

      <!-- Target line (dashed) -->
      <line x1="${padL}" y1="${yPos(target)}" x2="${W - padR}" y2="${yPos(target)}"
            stroke="#86868b" stroke-width="1" stroke-dasharray="6 4"/>
      <text x="${W - padR + 2}" y="${yPos(target) + 4}" fill="#86868b" font-size="10" text-anchor="start">目標</text>

      <!-- Area fill -->
      <polygon points="${areaPoints}" fill="url(#areaGrad)"/>

      <!-- Line -->
      <polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      ${dots}
      ${lastLabelHtml}
    </svg>
  `;

  container.innerHTML = svg;
}


// ===== MODAL: Assign PM =====

function openAssignModal(alertId, projectName) {
  currentAlertId = alertId;
  $modalProjectName.textContent = projectName;
  $selectPm.value = '';
  $selectDeadline.value = '';
  $inputNote.value = '';
  $modalOverlay.classList.remove('hidden');
}

function closeModal() {
  $modalOverlay.classList.add('hidden');
  currentAlertId = null;
}

function handleAssignSubmit() {
  const pm = $selectPm.value;
  const deadline = $selectDeadline.value;
  const note = $inputNote.value.trim();

  if (!pm) { showToast('請選擇 PM'); return; }
  if (!deadline) { showToast('請選擇期限'); return; }

  const success = assignAlert(currentAlertId, pm, deadline, note);

  if (success) {
    closeModal();
    showToast(`已指派給 ${pm}`);
    // Re-render affected views
    renderHome();
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
  // Smooth scroll to top
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


// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
});
