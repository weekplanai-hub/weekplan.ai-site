// Weekplan.ai — planner logic (auth + drag/drop + save/load with Supabase)
// Requires: supabase.js (creates global `sb` + ensureProfile)

(() => {
  // ----- Elements
  const authSection   = document.getElementById('auth-section');
  const plannerSection= document.getElementById('planner-section');
  const authStatus    = document.getElementById('auth-status');
  const emailInput    = document.getElementById('email');
  const pwdInput      = document.getElementById('password');
  const loginBtn      = document.getElementById('login-btn');
  const logoutBtn     = document.getElementById('logout-btn');
  const gridEl        = document.getElementById('week-grid');
  const saveBtn       = document.getElementById('save-btn');
  const genBtn        = document.getElementById('generate-btn');

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // ----- Planner state in memory
  let planId = null;
  // items: array of { dow, title, image_url, color }
  let items = [];

  // ===== AUTH =====
  sb.auth.onAuthStateChange(async (_evt, session) => {
    const user = session?.user || null;
    toggleAuthUI(!!user, user?.email);
    if (user) {
      await ensureProfile(user);
      await loadOrCreatePlan();
    } else {
      planId = null;
      items = [];
      renderWeek();
    }
  });

  loginBtn?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = pwdInput.value;
    if (!email || !password) {
      setAuthStatus('Skriv inn e-post og passord.');
      return;
    }
    loginBtn.disabled = true;
    setAuthStatus('Logger inn …');
    // Try sign in, fallback to sign up
    let { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      const res = await sb.auth.signUp({ email, password });
      if (res.error) setAuthStatus(res.error.message);
      else setAuthStatus('Bruker opprettet – sjekk innboksen om e-postbekreftelse kreves.');
    } else {
      setAuthStatus('');
    }
    loginBtn.disabled = false;
  });

  logoutBtn?.addEventListener('click', async () => {
    await sb.auth.signOut();
  });

  function toggleAuthUI(isAuthed, email='') {
    if (isAuthed) {
      authSection.classList.add('hidden');
      plannerSection.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      logoutBtn.textContent = `Log out (${email})`;
    } else {
      authSection.classList.remove('hidden');
      plannerSection.classList.add('hidden');
      logoutBtn.classList.add('hidden');
    }
  }
  function setAuthStatus(msg) { authStatus.textContent = msg || ''; }

  // ===== RENDER =====
  function renderWeek() {
    // Normalize array: ensure we have 7 positions
    const byDow = new Map(items.map(it => [it.dow, it]));
    gridEl.innerHTML = DAYS.map((d, i) => {
      const it = byDow.get(i) || { dow:i, title:'(empty)', image_url:'/assets/placeholder.jpg', color:'#f9fafb' };
      return cardHTML(d, it);
    }).join('');
    attachDnD();
    attachEdit();
  }

  function cardHTML(label, it) {
    return `
      <div class="tile" data-dow="${it.dow}" style="background:${it.color || '#f9fafb'}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <strong>${label}</strong>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn small" data-edit="${it.dow}" style="background:transparent;color:var(--text);border:1px solid var(--border)">Edit</button>
            <span class="handle" title="Drag" style="cursor:move;opacity:.6">↕</span>
          </div>
        </div>
        <img src="${it.image_url || '/assets/placeholder.jpg'}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:10px;border:1px solid #eef2f7;background:#f3f4f6">
        <div style="min-height:40px">${escapeHtml(it.title || '')}</div>
      </div>
    `;
  }

  function attachDnD() {
    let dragEl = null;
    Array.from(gridEl.children).forEach(el => {
      el.draggable = true;
      el.addEventListener('dragstart', () => { dragEl = el; el.style.opacity = .5; });
      el.addEventListener('dragend',   () => { if (dragEl) dragEl.style.opacity = 1; dragEl = null; });
      el.addEventListener('dragover',  (e) => e.preventDefault());
      el.addEventListener('drop',      (e) => {
        e.preventDefault();
        if (!dragEl || dragEl === el) return;
        const a = +dragEl.dataset.dow, b = +el.dataset.dow;
        swapDow(a, b);
        renderWeek();
      });
    });
  }

  function attachEdit() {
    gridEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEdit(+btn.dataset.edit));
    });
  }

  function swapDow(a, b) {
    const ia = items.findIndex(x=>x.dow===a);
    const ib = items.findIndex(x=>x.dow===b);
    if (ia>=0) items[ia].dow = b;
    if (ib>=0) items[ib].dow = a;
  }

  function openEdit(dow) {
    const it = items.find(x=>x.dow===dow) || { dow, title:'(empty)', image_url:'/assets/placeholder.jpg', color:'#f9fafb' };
    const choice = prompt(
`Rediger dag ${DAYS[dow]}:
1) Endre tittel
2) Endre bilde (URL)
3) Endre farge (#hex)
4) Slett
5) Bytt oppskrift (skriv ny tittel)`, '1'
    );
    if (!choice) return;
    switch (choice.trim()) {
      case '1': {
        const t = prompt('Ny tittel:', it.title || '');
        if (t !== null) setItem(dow, { title: t });
        break;
      }
      case '2': {
        const u = prompt('Bilde-URL:', it.image_url || '');
        if (u !== null) setItem(dow, { image_url: u });
        break;
      }
      case '3': {
        const c = prompt('Kortfarge (hex):', it.color || '#f9fafb');
        if (c !== null) setItem(dow, { color: c });
        break;
      }
      case '4': {
        items = items.filter(x=>x.dow!==dow);
        break;
      }
      case '5': {
        const t = prompt('Ny rett (tittel):', it.title || '');
        if (t !== null) setItem(dow, { title: t, image_url: '/assets/placeholder.jpg' });
        break;
      }
      default: break;
    }
    renderWeek();
  }

  function setItem(dow, patch) {
    const i = items.findIndex(x=>x.dow===dow);
    if (i>=0) items[i] = { ...items[i], ...patch };
    else items.push({ dow, title:'(empty)', image_url:'/assets/placeholder.jpg', color:'#f9fafb', ...patch });
  }

  // ===== SAVE / LOAD =====
  async function loadOrCreatePlan() {
    // Get latest plan or create one
    const { data: plans, error } = await sb.from('plans').select('*').order('created_at', { ascending: false }).limit(1);
    if (error) { console.error(error); return; }
    if (plans && plans.length) {
      planId = plans[0].id;
    } else {
      const { data: me } = await sb.auth.getUser();
      const { data: ins, error: e2 } = await sb.from('plans').insert({ user_id: me.user.id, title: 'My Week Plan' }).select().single();
      if (e2) { console.error(e2); return; }
      planId = ins.id;
    }
    // load items
    const { data: its, error: e3 } = await sb.from('plan_items').select('*').eq('plan_id', planId);
    if (e3) { console.error(e3); return; }
    items = (its || []).map(r => ({ dow: r.dow, title: r.title, image_url: r.image_url, color: r.color }));
    renderWeek();
  }

  saveBtn?.addEventListener('click', async () => {
    if (!planId) return alert('Plan ikke klar enda.');
    const rows = items.map(it => ({
      plan_id: planId, dow: it.dow, title: it.title, image_url: it.image_url, color: it.color
    }));
    // Simple approach: clear + insert
    await sb.from('plan_items').delete().eq('plan_id', planId);
    const { error } = await sb.from('plan_items').insert(rows);
    if (error) alert(error.message); else alert('Lagret!');
  });

  // ===== GENERATE (demo) & AI hook =====
  genBtn?.addEventListener('click', () => {
    // Quick demo data (you can replace with AI flow)
    const demo = [
      'Coconut Lentil Curry','Chicken & Quinoa','Veggie Pasta (GF)','Salmon Traybake',
      'Chickpea Tabbouleh','Turkey Lettuce Wraps','Roasted Cauli Bowls'
    ];
    items = DAYS.map((_, i) => ({
      dow: i,
      title: demo[i % demo.length],
      image_url: `/assets/r${(i%6)+1}.jpg`,
      color: '#f9fafb'
    }));
    renderWeek();
    // Optional: open AI generator page in a new tab
    // window.open('/ai-recipe-planner.html','_blank');
  });

  // Listen for recipes coming from AI page (if used)
  window.addEventListener('recipe:selected', (e) => {
    const r = e.detail || {};
    // Choose target day: first empty or ask for index
    const empty = findFirstEmptyDow();
    const dow = empty ?? askDow();
    if (dow == null) return;
    setItem(dow, { title: r.title || 'Oppskrift', image_url: r.image || '/assets/placeholder.jpg' });
    renderWeek();
  });

  function findFirstEmptyDow() {
    for (let i=0;i<7;i++){
      if (!items.find(x=>x.dow===i)) return i;
    }
    return null;
  }
  function askDow() {
    const input = prompt('Hvilken dag? 0=Mon … 6=Sun', '0');
    if (input === null) return null;
    const n = +input;
    return (n>=0 && n<=6) ? n : null;
  }

  // ===== UTIL =====
  function escapeHtml(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Kickstart: show current session state
  (async () => {
    const { data:{ session } } = await sb.auth.getSession();
    toggleAuthUI(!!session?.user, session?.user?.email || '');
    if (session?.user) {
      await ensureProfile(session.user);
      await loadOrCreatePlan();
    } else {
      renderWeek(); // empty grid
    }
  })();
})();
