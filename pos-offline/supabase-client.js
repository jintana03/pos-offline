(function () {
  const SUPABASE_URL = 'https://tuonbfpcqogewkxlpcdn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_wpu91g3OU7etrSaD45ZwQg_v9dIkIKH';
  const SESSION_KEY = 'pos_supabase_session_v1';

  function readSession() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const saved = JSON.parse(storage.getItem(SESSION_KEY) || 'null');
        if (saved?.access_token) return saved;
      } catch (_) {}
    }
    return null;
  }

  function saveSession(session) {
    if (session?.access_token) {
      const saved = { ...session };
      if (!saved.expires_at && saved.expires_in) {
        saved.expires_at = Math.floor(Date.now() / 1000) + Number(saved.expires_in);
      }
      const serialized = JSON.stringify(saved);
      try { localStorage.setItem(SESSION_KEY, serialized); } catch (_) {}
      try { sessionStorage.setItem(SESSION_KEY, serialized); } catch (_) {}
    } else {
      try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
      try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    }
  }

  async function restoreSession() {
    const session = readSession();
    if (!session?.access_token) return false;
    const expiresAt = Number(session.expires_at || 0);
    if (!expiresAt || Math.floor(Date.now() / 1000) < expiresAt - 60) return true;
    if (!session.refresh_token) return false;
    try {
      const data = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      saveSession(data);
      return Boolean(data?.access_token);
    } catch (_) {
      saveSession(null);
      return false;
    }
  }

  function emailFor(username) {
    const value = String(username || '').trim().toLowerCase();
    if (value.includes('@')) return value;
    return `${value.replace(/[^a-z0-9._-]/g, '-')}@pos-offline.com`;
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
    restoreSession,
    userId: () => readSession()?.user?.id || '',
    signIn,
    signUp,
    signOut,
    clearSession,
    query: request
  };
})();
