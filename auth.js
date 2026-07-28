// 全局鉴权与后端 API 封装（门户 / 卷子页共用）
const QB = (function () {
  const TOKEN_KEY = 'qb_token';
  const USER_KEY = 'qb_user';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setAuth = (t, u) => { localStorage.setItem(TOKEN_KEY, t); localStorage.setItem(USER_KEY, u); };
  const clear = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); };
  const isLogin = () => !!getToken();
  const user = () => localStorage.getItem(USER_KEY);

  async function api(path, method, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = getToken();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = {};
    try { data = await res.json(); } catch (e) { /* 空响应 */ }
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }
  const apiGet = (p) => api(p, 'GET');
  const apiPost = (p, b) => api(p, 'POST', b);

  // 登录 / 注册弹窗
  function showLogin(onDone) {
    let m = document.getElementById('qb-auth-modal');
    if (m) { m.style.display = 'flex'; return; }
    m = document.createElement('div');
    m.id = 'qb-auth-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;';
    m.innerHTML = `
      <div style="background:#fff;border-radius:12px;width:340px;max-width:92vw;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.2);">
        <div style="font-size:18px;font-weight:700;margin-bottom:4px;">全栈刷题 · 登录 / 注册</div>
        <div style="font-size:12px;color:#8a9099;margin-bottom:16px;">登录后答题记录按用户保存到后台数据库，换设备登录同一账号即可同步</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button id="qb-tab-login" style="flex:1;padding:8px;border:none;border-radius:8px;background:#1664ff;color:#fff;font-weight:600;cursor:pointer;">登录</button>
          <button id="qb-tab-reg" style="flex:1;padding:8px;border:none;border-radius:8px;background:#f2f3f5;color:#41464b;font-weight:600;cursor:pointer;">注册</button>
        </div>
        <input id="qb-user" placeholder="用户名（≥3 位）" style="width:100%;padding:10px;border:1px solid #d0d3d9;border-radius:8px;margin-bottom:10px;font-size:14px;box-sizing:border-box;">
        <input id="qb-pass" type="password" placeholder="密码（≥6 位）" style="width:100%;padding:10px;border:1px solid #d0d3d9;border-radius:8px;margin-bottom:12px;font-size:14px;box-sizing:border-box;">
        <div id="qb-msg" style="font-size:13px;color:#ff4d4f;min-height:18px;margin-bottom:8px;"></div>
        <button id="qb-submit" style="width:100%;padding:11px;border:none;border-radius:8px;background:#1664ff;color:#fff;font-weight:700;cursor:pointer;font-size:15px;">登录</button>
        <button id="qb-cancel" style="width:100%;padding:9px;border:none;background:transparent;color:#8a9099;cursor:pointer;margin-top:10px;font-size:13px;">取消</button>
      </div>`;
    document.body.appendChild(m);
    let mode = 'login';
    const tabLogin = m.querySelector('#qb-tab-login');
    const tabReg = m.querySelector('#qb-tab-reg');
    const submit = m.querySelector('#qb-submit');
    const msg = m.querySelector('#qb-msg');
    const setMode = (md) => {
      mode = md;
      tabLogin.style.background = md === 'login' ? '#1664ff' : '#f2f3f5';
      tabLogin.style.color = md === 'login' ? '#fff' : '#41464b';
      tabReg.style.background = md === 'reg' ? '#1664ff' : '#f2f3f5';
      tabReg.style.color = md === 'reg' ? '#fff' : '#41464b';
      submit.textContent = md === 'login' ? '登录' : '注册';
    };
    tabLogin.onclick = () => setMode('login');
    tabReg.onclick = () => setMode('reg');
    m.querySelector('#qb-cancel').onclick = () => { m.style.display = 'none'; };
    submit.onclick = async () => {
      msg.textContent = '';
      const username = m.querySelector('#qb-user').value.trim();
      const password = m.querySelector('#qb-pass').value;
      try {
        const data = mode === 'login'
          ? await apiPost('/api/auth/login', { username, password })
          : await apiPost('/api/auth/register', { username, password });
        setAuth(data.token, data.username);
        m.style.display = 'none';
        if (onDone) onDone(data.username);
      } catch (e) { msg.textContent = e.message; }
    };
  }

  return { getToken, setAuth, clear, isLogin, user, apiGet, apiPost, showLogin };
})();
