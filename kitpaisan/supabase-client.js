(function () {
  const SUPABASE_URL = 'https://tuonbfpcqogewkxlpcdn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_wpu91g3OU7etrSaD45ZwQg_v9dIkIKH';
  const SESSION_KEY = 'pos_supabase_session_v1';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  }

  function saveSession(session) {
    if (session?.access_token) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function emailFor(username) {
    return `${String(username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')}@pos-offline.com`;
  }

  async function request(path, options = {}) {
    const session = readSession();
    const headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Supabase ${response.status}`);
    return data;
  }

  async function signIn(username, password) {
    const data = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: emailFor(username), password })
    });
    saveSession(data);
    return data;
  }

  async function signUp(username, password) {
    const data = await request('/auth/v1/signup', {
      method: 'POST', body: JSON.stringify({ email: emailFor(username), password, data: { username } })
    });
    if (!data?.access_token) throw new Error('สร้างบัญชีแล้ว แต่ต้องปิดการยืนยันอีเมลใน Supabase Auth ก่อนจึงจะเข้าสู่ระบบได้');
    saveSession(data);
    return data;
  }

  async function signOut() {
    try { if (readSession()?.access_token) await request('/auth/v1/logout', { method: 'POST' }); } catch (_) {}
    saveSession(null);
  }

  function clearSession() {
    saveSession(null);
  }

  window.posSupabase = {
    configured: true,
    hasSession: () => Boolean(readSession()?.access_token),
    userId: () => readSession()?.user?.id || '',
    signIn,
    signUp,
    signOut,
    clearSession,
    query: request
  };
})();
