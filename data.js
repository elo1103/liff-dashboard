/* ==========================================================
   data.js — Mock Database & Data Access Layer
   ----------------------------------------------------------
   未來只要把這些 functions 改成 Supabase fetch 就能接上資料庫。
   每個 function 回傳 plain object / array（不是 Promise），
   轉 Supabase 時改成 async + await 即可。
   ========================================================== */

// ---- Mock Database ----

const DB = {

  // 6 projects: 2 red, 2 yellow, 2 green
  projects: [
    {
      id: 'P001',
      name: '信義區商辦大樓',
      contractAmount: 28000000,
      targetMarginPct: 20,
      forecastMarginPct: 8,
      riskReason: '工時超支，鋼構材料漲價',
      riskFactors: [
        { label: '工時超支', value: '+18%' },
        { label: '材料超支', value: '+12%' },
        { label: '排程延誤', value: '6 天' },
      ],
      suggestions: ['外包部分工序', '調整排程順序', '與客戶談變更'],
      trend: [21, 19, 16, 13, 10, 8],
    },
    {
      id: 'P002',
      name: '內湖科技園區改建',
      contractAmount: 15000000,
      targetMarginPct: 18,
      forecastMarginPct: 6,
      riskReason: '設計變更導致重工',
      riskFactors: [
        { label: '重工成本', value: '+22%' },
        { label: '設計延誤', value: '5 天' },
        { label: '人力調度', value: '+10%' },
      ],
      suggestions: ['與客戶協商追加款', '外包部分工序', '加班趕工'],
      trend: [19, 17, 14, 10, 8, 6],
    },
    {
      id: 'P003',
      name: '桃園物流中心',
      contractAmount: 12000000,
      targetMarginPct: 18,
      forecastMarginPct: 14,
      riskReason: '部分材料交期延遲',
      riskFactors: [
        { label: '材料延遲', value: '3 天' },
        { label: '工時微增', value: '+5%' },
        { label: '品質重驗', value: '1 次' },
      ],
      suggestions: ['備用供應商', '調整排程順序', '提前備料'],
      trend: [19, 18, 17, 16, 15, 14],
    },
    {
      id: 'P004',
      name: '竹北住宅社區',
      contractAmount: 20000000,
      targetMarginPct: 20,
      forecastMarginPct: 15,
      riskReason: '人力調度瓶頸',
      riskFactors: [
        { label: '人力不足', value: '+8%' },
        { label: '排程延誤', value: '2 天' },
        { label: '加班費用', value: '+4%' },
      ],
      suggestions: ['增派人力', '調整排程順序', '外包部分工序'],
      trend: [21, 20, 19, 17, 16, 15],
    },
    {
      id: 'P005',
      name: '台中百貨專櫃裝修',
      contractAmount: 5000000,
      targetMarginPct: 22,
      forecastMarginPct: 24,
      riskReason: '進度正常，成本控制良好',
      riskFactors: [
        { label: '工時節省', value: '-3%' },
        { label: '材料控制', value: '正常' },
        { label: '排程', value: '提前 1 天' },
      ],
      suggestions: ['維持現狀', '記錄最佳實踐', '分享經驗'],
      trend: [22, 22, 23, 23, 24, 24],
    },
    {
      id: 'P006',
      name: '高雄港區倉儲',
      contractAmount: 9000000,
      targetMarginPct: 18,
      forecastMarginPct: 20,
      riskReason: '材料採購順利，進度超前',
      riskFactors: [
        { label: '材料節省', value: '-5%' },
        { label: '排程', value: '提前 2 天' },
        { label: '品質', value: '通過' },
      ],
      suggestions: ['維持現狀', '記錄最佳實踐', '提前收款'],
      trend: [18, 18, 19, 19, 20, 20],
    },
  ],

  // 3 alerts (tied to red/yellow projects)
  alerts: [
    {
      id: 'A001',
      projectId: 'P001',
      reason: '預測毛利已降至 8%，低於目標 12% 以上',
      createdAt: '2026-02-14T09:30:00',
      status: 'pending',       // pending | assigned
      assignedTo: null,
      deadline: null,
      note: null,
    },
    {
      id: 'A002',
      projectId: 'P002',
      reason: '設計變更導致重工，毛利預估 6%',
      createdAt: '2026-02-13T14:00:00',
      status: 'pending',
      assignedTo: null,
      deadline: null,
      note: null,
    },
    {
      id: 'A003',
      projectId: 'P003',
      reason: '材料延遲影響排程，毛利下滑至 14%',
      createdAt: '2026-02-12T11:15:00',
      status: 'pending',
      assignedTo: null,
      deadline: null,
      note: null,
    },
  ],
};


// ---- Helper: 風險等級 ----

function getRiskLevel(forecastMarginPct) {
  if (forecastMarginPct < 12) return 'red';
  if (forecastMarginPct < 18) return 'yellow';
  return 'green';
}


// ---- Data Access Functions ----
// 未來改成 Supabase fetch，只需改這些 function body。

/** 取得所有專案（依風險排序：red → yellow → green） */
function getProjects() {
  const order = { red: 0, yellow: 1, green: 2 };
  return [...DB.projects].sort((a, b) => {
    return order[getRiskLevel(a.forecastMarginPct)] - order[getRiskLevel(b.forecastMarginPct)];
  });
}

/** 取得 Top N 風險專案 */
function getTopRiskProjects(n = 5) {
  return getProjects().slice(0, n);
}

/** 依 id 取得單一專案 */
function getProjectById(id) {
  return DB.projects.find(p => p.id === id) || null;
}

/** 取得所有 alerts（依時間新→舊） */
function getAlerts() {
  return [...DB.alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** 取得最新一個未處理的 alert */
function getLatestPendingAlert() {
  return getAlerts().find(a => a.status === 'pending') || null;
}

/** 取得某 alert 對應的專案 */
function getAlertProject(alert) {
  return getProjectById(alert.projectId);
}

/** 指派 alert 給 PM */
function assignAlert(alertId, pm, deadline, note) {
  const alert = DB.alerts.find(a => a.id === alertId);
  if (!alert) return false;
  alert.status = 'assigned';
  alert.assignedTo = pm;
  alert.deadline = deadline;
  alert.note = note || '';
  return true;
}

/** 檢查某專案是否已被指派 */
function isProjectAssigned(projectId) {
  return DB.alerts.some(a => a.projectId === projectId && a.status === 'assigned');
}

/** 取得 alert by projectId */
function getAlertByProjectId(projectId) {
  return DB.alerts.find(a => a.projectId === projectId) || null;
}

/** 本月 KPI：平均預測毛利 */
function getAvgForecastMargin() {
  const projects = DB.projects;
  const sum = projects.reduce((s, p) => s + p.forecastMarginPct, 0);
  return Math.round((sum / projects.length) * 10) / 10;
}

/** 本月 KPI：平均目標毛利 */
function getAvgTargetMargin() {
  const projects = DB.projects;
  const sum = projects.reduce((s, p) => s + p.targetMarginPct, 0);
  return Math.round((sum / projects.length) * 10) / 10;
}

/** 本月 KPI：高風險專案數 */
function getHighRiskCount() {
  return DB.projects.filter(p => getRiskLevel(p.forecastMarginPct) === 'red').length;
}

/** 估算損失金額：(目標毛利 - 預測毛利) * 合約金額 */
function estimateLoss(project) {
  const diff = project.targetMarginPct - project.forecastMarginPct;
  if (diff <= 0) return 0;
  return Math.round(project.contractAmount * (diff / 100));
}

/** 格式化金額（萬元） */
function formatMoney(amount) {
  if (amount >= 10000000) {
    return (amount / 10000000).toFixed(1) + ' 千萬';
  }
  if (amount >= 10000) {
    return Math.round(amount / 10000) + ' 萬';
  }
  return amount.toLocaleString();
}
