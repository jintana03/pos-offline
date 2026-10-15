(function () {
  const AUTH_KEY = 'pos_auth_v1';
  const ADMINS_KEY = 'pos_admins_v1';
  const SESSION_KEY = 'pos_session_v1';
  const SESSION_USER_KEY = 'pos_session_user_v1';
  const PERSISTENT_SESSION_KEY = 'pos_persistent_session_v1';
  const PERSISTENT_SESSION_USER_KEY = 'pos_persistent_session_user_v1';
  const form = document.querySelector('#authForm');
  const gate = document.querySelector('#authGate');
  if (!form || !gate) return;

  const usernameInput = document.querySelector('#authUsername');
  const passwordInput = document.querySelector('#authPassword');
  const confirmInput = document.querySelector('#authConfirmPassword');
  const confirmField = document.querySelector('#authConfirmField');
  const eyebrow = document.querySelector('#authEyebrow');
  const title = document.querySelector('#authTitle');
  const description = document.querySelector('#authDescription');
  const submit = document.querySelector('#authSubmit');
  const message = document.querySelector('#authMessage');
  const adminForm = document.querySelector('#adminForm');
  const adminList = document.querySelector('#adminList');
  const adminMessage = document.querySelector('#adminMessage');
  const cloud = window.posSupabase;

  function readAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (_) { return null; }
  }

  function readAdmins() {
    try {
      const saved = JSON.parse(localStorage.getItem(ADMINS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved.filter(item => item?.username && item?.passwordHash);
    } catch (_) {}
    const legacy = readAuth();
    if (legacy?.username && legacy?.passwordHash) {
      const migrated = [legacy];
      localStorage.setItem(ADMINS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return [];
  }

  function saveAdmins(admins) {
    localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
    localStorage.setItem(AUTH_KEY, JSON.stringify(admins[0] || null));
  }

  function simpleHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  async function hashPassword(value) {
    if (!window.crypto?.subtle) return simpleHash(value);
    const data = new TextEncoder().encode(value);
    const buffer = await window.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function setAuthenticated(username) {
    document.body.classList.add('pos-authenticated');
    gate.setAttribute('aria-hidden', 'true');
    sessionStorage.setItem(SESSION_KEY, '1');
    sessionStorage.setItem(SESSION_USER_KEY, username);
    localStorage.setItem(PERSISTENT_SESSION_KEY, '1');
    localStorage.setItem(PERSISTENT_SESSION_USER_KEY, username);
    renderAdminList();
  }

  function setMessage(text, type = 'error') {
    message.textContent = text;
    message.className = `auth-message ${type}`;
  }

  function setAdminMessage(text, type = 'error') {
    if (!adminMessage) return;
    adminMessage.textContent = text;
    adminMessage.className = `admin-message ${type}`;
  }

  function loginErrorMessage(error) {
    const detail = String(error?.message || '').toLowerCase();
    if (detail.includes('email not confirmed')) {
      return 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล ให้ยืนยันอีเมลใน Supabase หรือปิด Confirm email แล้วลองใหม่';
    }
    if (detail.includes('email rate limit') || detail.includes('rate limit')) {
      return 'ลองเข้าสู่ระบบใหม่อีกครั้งภายหลัง ระบบจำกัดจำนวนการลองชั่วคราว';
    }
    if (detail.includes('invalid login credentials')) {
      return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ตรวจสอบว่าบัญชีนี้มีอยู่ใน Supabase Auth แล้ว';
    }
    return 'ไม่พบบัญชีนี้ในระบบ หรือชื่อผู้ใช้และรหัสผ่านไม่ถูกต้อง';
  }

  function configureMode() {
    confirmField.hidden = true;
    confirmInput.required = false;
    eyebrow.textContent = 'เข้าสู่ระบบ';
    title.textContent = 'เข้าสู่ระบบ POS';
    description.textContent = cloud?.configured
      ? 'กรุณาเข้าสู่ระบบด้วยบัญชีที่ผู้ดูแลเพิ่มไว้ในระบบ'
      : 'กรุณาเข้าสู่ระบบเพื่อใช้งานระบบขายสินค้า';
    submit.textContent = 'เข้าสู่ระบบ';
    usernameInput.autocomplete = 'username';
    passwordInput.autocomplete = 'current-password';
  }

  function renderAdminList() {
    if (!adminList) return;
    const current = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(PERSISTENT_SESSION_USER_KEY) || '';
    adminList.innerHTML = readAdmins().map(admin => `<div class="admin-list-row"><span><strong>${admin.username}</strong>${admin.username === current ? '<small>กำลังใช้งาน</small>' : ''}</span><button class="small-button delete" type="button" data-remove-admin="${admin.username}">ลบ</button></div>`).join('');
    adminList.querySelectorAll('[data-remove-admin]').forEach(button => button.addEventListener('click', () => removeAdmin(button.dataset.removeAdmin)));
  }

  async function addAdmin(event) {
    event.preventDefault();
    if (cloud?.configured) {
      return setAdminMessage('ระบบออนไลน์เปิดใช้งานอยู่ บัญชีใหม่ต้องเพิ่มใน Supabase Dashboard > Authentication > Users ก่อนจึงจะเข้าสู่ระบบได้', 'error');
    }
    const data = Object.fromEntries(new FormData(event.target));
    const username = data.username.trim();
    const admins = readAdmins();
    if (username.length < 3 || data.password.length < 6) return setAdminMessage('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร และรหัสผ่านอย่างน้อย 6 ตัวอักษร');
    if (data.password !== data.confirmPassword) return setAdminMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
    if (admins.some(admin => admin.username.toLowerCase() === username.toLowerCase())) return setAdminMessage('มีชื่อผู้ใช้นี้แล้ว');
    admins.push({ username, passwordHash: await hashPassword(data.password) });
    saveAdmins(admins);
    event.target.reset();
    setAdminMessage('เพิ่มแอดมินเรียบร้อยแล้ว', 'success');
    renderAdminList();
  }

  function removeAdmin(username) {
    const admins = readAdmins();
    const current = sessionStorage.getItem(SESSION_USER_KEY) || '';
    if (admins.length <= 1) return setAdminMessage('ต้องมีแอดมินอย่างน้อย 1 บัญชี');
    if (username === current) return setAdminMessage('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่');
    if (!confirm(`ต้องการลบแอดมิน ${username} ใช่หรือไม่?`)) return;
    saveAdmins(admins.filter(admin => admin.username !== username));
    setAdminMessage('ลบแอดมินเรียบร้อยแล้ว', 'success');
    renderAdminList();
  }

  function logout() {
    cloud?.signOut();
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(PERSISTENT_SESSION_KEY);
    localStorage.removeItem(PERSISTENT_SESSION_USER_KEY);
    document.body.classList.remove('pos-authenticated');
    gate.setAttribute('aria-hidden', 'false');
    form.reset();
    setMessage('');
    configureMode();
    window.scrollTo(0, 0);
  }

  configureMode();
  renderAdminList();

  // Keep the active login when the user reloads the POS page.
  // A new browser tab still shows the login screen unless this tab has an active session.
  const savedUser = sessionStorage.getItem(SESSION_USER_KEY) || localStorage.getItem(PERSISTENT_SESSION_USER_KEY) || '';
  async function restoreLogin() {
    const cloudSession = cloud?.configured
      ? (cloud.restoreSession ? await cloud.restoreSession() : cloud.hasSession?.())
      : false;
    const hasLocalLogin = Boolean(savedUser) && (
      sessionStorage.getItem(SESSION_KEY) === '1' || localStorage.getItem(PERSISTENT_SESSION_KEY) === '1'
    );
    // Keep the POS open after refresh when Supabase is temporarily unavailable.
    // Cloud sync will resume automatically as soon as a valid session is available.
    const hasSavedLogin = cloud?.configured ? (cloudSession || hasLocalLogin) : hasLocalLogin;
    if (hasSavedLogin) {
      setAuthenticated(savedUser || usernameInput.value.trim() || 'admin');
      window.setTimeout(() => window.posCloudSync?.start(), 0);
      return;
    }
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(PERSISTENT_SESSION_KEY);
    localStorage.removeItem(PERSISTENT_SESSION_USER_KEY);
  }
  restoreLogin();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const adminsNow = readAdmins();
    if (username.length < 3 || password.length < 6) {
      setMessage('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร และรหัสผ่านอย่างน้อย 6 ตัวอักษร');
      return;
    }
    submit.disabled = true;
    try {
      const passwordHash = await hashPassword(password);
      const account = adminsNow.find(admin => admin.username.toLowerCase() === username.toLowerCase() && admin.passwordHash === passwordHash);
      if (!cloud?.configured && adminsNow.length && !account) {
        setMessage('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      if (cloud?.configured) {
        try {
          await cloud.signIn(username, password);
        } catch (cloudError) {
          console.warn('POS login failed:', cloudError);
          setMessage(loginErrorMessage(cloudError));
          return;
        }
      }
      if (!account) saveAdmins([...adminsNow, { username, passwordHash }]);
      setAuthenticated(account?.username || username);
      window.posCloudSync?.start();
      form.reset();
    } finally {
      submit.disabled = false;
    }
  });

  adminForm?.addEventListener('submit', addAdmin);
  window.posLogout = logout;
  document.querySelector('#logoutBtn')?.addEventListener('click', logout);
})();
