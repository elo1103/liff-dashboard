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
  // 專案類型：空調環控工程（除濕、風管、配管、配電）
  projects: [
    {
      id: 'P001',
      name: '溜冰場環控工程',
      client: '台灣防潮科技',
      contractAmount: 5835168,
      targetMarginPct: 20,
      forecastMarginPct: 9,
      riskReason: '除濕機設備漲價＋風管安裝工時超支',
      riskFactors: [
        { label: '除濕機設備漲價', value: '+14%' },
        { label: '螺旋風管安裝工時', value: '+11%' },
        { label: '排程延誤', value: '5 天' },
      ],
      aiInsight: '除濕機與風管成本超支，建議從議價與工序調整著手，必要時可與業主協商變更追加。',
      suggestions: ['與供應商重新議價', '外包風管安裝工序', '與業主談變更追加'],
      trend: [21, 19, 16, 14, 11, 9],
      estimatedHours: 320,
      actualHours: 385,
    },
    {
      id: 'P002',
      name: '華可貴環控工程',
      client: '華可貴股份有限公司',
      contractAmount: 3044265,
      targetMarginPct: 18,
      forecastMarginPct: 7,
      riskReason: '現場配管重工，動力配電追加',
      riskFactors: [
        { label: '排水配管重工', value: '+18%' },
        { label: '動力配電追加', value: '+9%' },
        { label: '防火填塞重做', value: '2 次' },
      ],
      aiInsight: '配管重工與配電追加導致毛利下滑，建議先與業主確認追加款，並優化施工順序與人力配置。',
      suggestions: ['與業主協商追加款', '調整配管施工順序', '增派配電師傅'],
      trend: [19, 17, 14, 11, 9, 7],
      estimatedHours: 240,
      actualHours: 295,
    },
    {
      id: 'P003',
      name: '南港廠房除濕工程',
      client: '台灣防潮科技',
      contractAmount: 1850000,
      targetMarginPct: 20,
      forecastMarginPct: 15,
      riskReason: '銅管材料交期延遲，工班等待',
      riskFactors: [
        { label: '銅管交期延遲', value: '4 天' },
        { label: '工班閒置成本', value: '+6%' },
        { label: '水管安裝微增', value: '+3%' },
      ],
      aiInsight: '銅管交期延遲造成工班閒置，建議建立備援供應商並調整工序，避免未來類似延誤。',
      suggestions: ['備用銅管供應商', '調整施工順序先做風管', '提前叫料'],
      trend: [21, 20, 19, 18, 16, 15],
      estimatedHours: 180,
      actualHours: 198,
    },
    {
      id: 'P004',
      name: '數位發展部環控工程',
      client: '台灣防潮科技',
      contractAmount: 53700,
      targetMarginPct: 22,
      forecastMarginPct: 16,
      riskReason: '小案場控制配電工時高於預估',
      riskFactors: [
        { label: '控制配電工時', value: '+8%' },
        { label: '設備安裝調整', value: '+4%' },
        { label: '來回車程成本', value: '+2%' },
      ],
      aiInsight: '小案場工時與車程成本偏高，建議與其他案場併單施工或簡化控制規格以壓低成本。',
      suggestions: ['併入其他案場施工', '簡化控制線路', '與業主確認規格'],
      trend: [23, 22, 20, 19, 17, 16],
      estimatedHours: 45,
      actualHours: 52,
    },
    {
      id: 'P005',
      name: '竹科無塵室恆濕工程',
      client: '聯華電子',
      contractAmount: 4200000,
      targetMarginPct: 18,
      forecastMarginPct: 21,
      riskReason: '進度超前，設備採購議價成功',
      riskFactors: [
        { label: '除濕機議價節省', value: '-5%' },
        { label: '風管安裝', value: '提前 2 天' },
        { label: '配電品質', value: '一次通過' },
      ],
      aiInsight: '目前進度與毛利表現良好，建議將議價與施工流程記錄為最佳實踐，並可提前安排驗收。',
      suggestions: ['維持現狀', '記錄最佳實踐', '提前申請驗收'],
      trend: [18, 18, 19, 20, 20, 21],
      estimatedHours: 280,
      actualHours: 252,
    },
    {
      id: 'P006',
      name: '桃園倉儲環控改善',
      client: '台灣防潮科技',
      contractAmount: 2380000,
      targetMarginPct: 20,
      forecastMarginPct: 22,
      riskReason: '材料用量低於預估，施工順利',
      riskFactors: [
        { label: '螺旋風管節省', value: '-4%' },
        { label: '排水配管', value: '正常' },
        { label: '排程', value: '提前 1 天' },
      ],
      aiInsight: '材料與施工效率優於預期，建議維持現狀並記錄此案效率指標，可考慮提前請款以改善現金流。',
      suggestions: ['維持現狀', '記錄施工效率', '提前請款'],
      trend: [20, 20, 21, 21, 22, 22],
      estimatedHours: 200,
      actualHours: 186,
    },
  ],

  // 3 alerts (tied to red/yellow projects)
  alerts: [
    {
      id: 'A001',
      projectId: 'P001',
      reason: '溜冰場案除濕機漲價＋風管工時爆量，毛利降至 9%',
      createdAt: '2026-02-14T09:30:00',
      status: 'pending',       // pending | assigned
      assignedTo: null,
      deadline: null,
      note: null,
    },
    {
      id: 'A002',
      projectId: 'P002',
      reason: '華可貴案現場配管重工，動力配電追加，毛利僅 7%',
      createdAt: '2026-02-13T14:00:00',
      status: 'pending',
      assignedTo: null,
      deadline: null,
      note: null,
    },
    {
      id: 'A003',
      projectId: 'P003',
      reason: '南港案銅管延遲導致工班閒置，毛利下滑至 15%',
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
