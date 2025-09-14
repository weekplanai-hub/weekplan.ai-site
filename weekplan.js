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

  // FULLT DAGSNAVN (en)
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  // ----- Planner state in memory
  let planId = null;
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
    const byDow = new Map(items.map(it => [it.dow, it]));
    gridEl.innerHTML = DAYS.map((d, i) => {
      const it = byDow.get(i) || {
        dow:i,
        title:'(empty)',
        image_url:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
        color:''
      };
      return cardHTML(d, it);
    }).join('');
    attachDnD();
    attachEdit();
  }

  // Planner card markup — styled like Library recipe cards
  function cardHTML(label, it) {
    const style = it.color ? `style="background:${it.color}"` : '';
    return `
      <div class="tile recipe-card planner-card" data-dow="${it.dow}" ${style}>
        <div class="planner-top">
          <strong>${label}</strong>
          <button class="btn small alt no-drag" data-edit="${it.dow}">Edit</button>
        </div>
        <img src="${it.image_url}" alt="">
        <div class="rc-body">
          <h3>${escapeHtml(it.title || '(empty)')}</h3>
        </div>
      </div>
    `;
  }

  // ===== DRAG & DROP =====
  function attachDnD() {
    const tiles = Array.from(gridEl.querySelectorAll('.tile'));

    let dragEl = null;

    tiles.forEach(el => {
      // allow dragging the WHOLE card except interactive controls
      const setDraggableFromEvent = (target) => {
        const isControl = target.closest('button, a, input, textarea, select, label, .no-drag');
        el.draggable = !isControl;
      };

      el.addEventListener('mousedown', (e) => setDraggableFromEvent(e.target));
      el.addEventListener('touchstart', (e) => setDraggableFromEvent(e.target), { passive: true });

      el.addEventListener('dragstart', (e) => {
        if (!el.draggable) { e.preventDefault(); return; }
        dragEl = el;
        el.style.opacity = .5;
        // transfer needed for Firefox
        try { e.dataTransfer.setData('text/plain', el.dataset.dow); } catch {}
      });

      el.addEventListener('dragend', () => {
        if (dragEl) dragEl.style.opacity = 1;
        dragEl = null;
        el.draggable = false; // reset for next interaction
      });

      el.addEventListener('dragover', (e) => e.preventDefault());

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragEl || dragEl === el) return;
        const a = +dragEl.dataset.dow;
        const b = +el.dataset.dow;
        swapDow(a, b);
        renderWeek();
      });
    });
  }

  function swapDow(a, b) {
    const ia = items.findIndex(x=>x.dow===a);
    const ib = items.findIndex(x=>x.dow===b);
    if (ia>=0) items[ia].dow = b;
    if (ib>=0) items[ib].dow = a;
  }

  // ====== MODAL EDITOR ======
  const modal = document.getElementById('edit-modal');
  const fTitle = document.getElementById('edit-title');
  const fImage = document.getElementById('edit-image');
  const fColor = document.getElementById('edit-color');
  const btnDelete = document.getElementById('edit-delete');
  const btnCancel = document.getElementById('edit-cancel');
  let editingDow = null;

  function showModal(){ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
  function hideModal(){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); editingDow=null; }

  btnCancel?.addEventListener('click', hideModal);
  modal?.addEventListener('click', (e)=>{ if(e.target===modal || e.target.classList.contains('modal-backdrop')) hideModal(); });

  document.getElementById('edit-form')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    if (editingDow==null) return;
    setItem(editingDow, {
      title: fTitle.value.trim(),
      image_url: fImage.value.trim(),
      color: fColor.value
    });
    hideModal(); renderWeek();
  });

  btnDelete?.addEventListener('click', ()=>{
    if (editingDow==null) return;
    items = items.filter(x=>x.dow!==editingDow);
    hideModal(); renderWeek();
  });

  function openEdit(dow) {
    editingDow = dow;
    const it = items.find(x=>x.dow===dow) || { title:'', image_url:'', color:'' };
    fTitle.value = it.title || '';
    fImage.value = it.image_url || '';
    fColor.value = (it.color && /^#([0-9a-f]{3}){1,2}$/i.test(it.color)) ? it.color : '#f9fafb';
    showModal();
  }

  function attachEdit() {
    gridEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEdit(+btn.dataset.edit);
      });
    });
  }

  function setItem(dow, patch) {
    const i = items.findIndex(x=>x.dow===dow);
    if (i>=0) items[i] = { ...items[i], ...patch };
    else items.push({
      dow,
      title:'',
      image_url:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop',
      color:'#f9fafb',
      ...patch
    });
  }

  // ===== SAVE / LOAD =====
  async function loadOrCreatePlan() {
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
    await sb.from('plan_items').delete().eq('plan_id', planId);
    const { error } = await sb.from('plan_items').insert(rows);
    if (error) alert(error.message); else alert('Lagret!');
  });

  // ===== GENERATE (Demo with Unsplash) =====
  genBtn?.addEventListener('click', () => {
    const demoTitles = [
      'Coconut Lentil Curry',
      'Chicken & Quinoa',
      'Veggie Pasta (GF)',
      'Salmon Traybake',
      'Chickpea Tabbouleh',
      'Turkey Lettuce Wraps',
      'Roasted Cauli Bowls'
    ];
    const demoImages = [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1617196037304-9a851b1cfa2c?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506086679525-9d3a8e4d1f04?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1543352634-11a8e2d3d6c4?q=80&w=800&auto=format&fit=crop"
    ];
    items = DAYS.map((_, i) => ({
      dow: i,
      title: demoTitles[i % demoTitles.length],
      image_url: demoImages[i % demoImages.length],
      color: ''
    }));
    renderWeek();
  });

  // ===== Recipe event from AI page =====
  window.addEventListener('recipe:selected', (e) => {
    const r = e.detail || {};
    const empty = findFirstEmptyDow();
    const dow = empty ?? askDow();
    if (dow == null) return;
    setItem(dow, {
      title: r.title || 'Oppskrift',
      image_url: r.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop'
    });
    renderWeek();
  });

  function findFirstEmptyDow() {
    for (let i=0;i<7;i++){ if (!items.find(x=>x.dow===i)) return i; }
    return null;
  }
  function askDow() {
    const input = prompt('Hvilken dag? 0=Monday … 6=Sunday', '0');
    if (input === null) return null;
    const n = +input;
    return (n>=0 && n<=6) ? n : null;
  }

  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  (async () => {
    const { data:{ session } } = await sb.auth.getSession();
    toggleAuthUI(!!session?.user, session?.user?.email || '');
    if (session?.user) {
      await ensureProfile(session.user);
      await loadOrCreatePlan();
    } else {
      renderWeek();
    }
  })();
})();
