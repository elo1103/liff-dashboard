/* ==========================================================
   data.js — Supabase Data Access Layer (ESM Module)
   ----------------------------------------------------------
   所有資料存取封裝在此，app.js 透過 import 使用。
   未來擴充只需在這裡加 function 即可。
   ========================================================== */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- Supabase Client ----
const SUPABASE_URL = 'https://wotnfvxjzrbfqmnvjfsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdG5mdnhqenJiZnFtbnZqZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk5MzQsImV4cCI6MjA2NzU3NTkzNH0.xXVgTF2ULgqGsW19HvjRqzxN0budJPt8kDwTIC5ombQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Constants ----
const SEVERITY_WEIGHT = { red: 0, yellow: 1, green: 2 };


// ---- Data Access Functions ----

/**
 * 取得所有 open alerts，連帶 project 資訊
 * 排序：severity 權重 red > yellow > green，同級再用 created_at 新→舊
 */
export async function fetchOpenAlertsWithProjects() {
  const { data, error } = await supabase
    .from('b_alerts')
    .select('*, project:b_projects(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).sort((a, b) => {
    const sw = (SEVERITY_WEIGHT[a.severity] ?? 9) - (SEVERITY_WEIGHT[b.severity] ?? 9);
    if (sw !== 0) return sw;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/**
 * 依 id 取得單一專案
 */
export async function fetchProjectById(projectId) {
  const { data, error } = await supabase
    .from('b_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 取得某專案的所有 alerts（最新在前）
 */
export async function fetchAlertsByProjectId(projectId) {
  const { data, error } = await supabase
    .from('b_alerts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 指派 alert 給 PM（寫回 Supabase）
 */
export async function assignAlert(alertId, assignedTo, dueLabel, note) {
  const { data, error } = await supabase
    .from('b_alerts')
    .update({
      status: 'assigned',
      assigned_to: assignedTo,
      due_label: dueLabel,
      resolution_note: note || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
}


// ---- Helper Functions ----

/** 格式化金額（萬元） */
export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '—';
  if (amount >= 10000000) return (amount / 10000000).toFixed(1) + ' 千萬';
  if (amount >= 10000) return Math.round(amount / 10000) + ' 萬';
  return amount.toLocaleString();
}

/** 估算損失金額 */
export function estimateLoss(forecastPct, targetPct, contractAmount) {
  if (forecastPct == null || targetPct == null || contractAmount == null) return 0;
  const diff = targetPct - forecastPct;
  if (diff <= 0) return 0;
  return Math.round(contractAmount * (diff / 100));
}
