(() => {
  'use strict';

  /* ================= Константы и утилиты ================= */
  const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const PRESETS = ['Жим лёжа', 'Приседания', 'Становая тяга', 'Жим стоя', 'Подтягивания', 'Тяга штанги в наклоне', 'Отжимания', 'Выпады', 'Жим гантелей', 'Планка'];
  const KEY = 'liquid-workout-v1';
  const THEME_KEY = 'liquid-workout-theme';

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dow = (d) => (d.getDay() + 6) % 7; // Пн = 0
  const monday = (d) => addDays(d, -dow(d));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const nf = (n) => Math.round(n).toLocaleString('ru-RU');
  const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)).replace('.', ','));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

  const ICON = {
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m6 10 6 6 6-6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" class="ico"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  };
  const themeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>';

  /* ================= Состояние ================= */
  function emptyState() {
    const plan = {};
    for (let i = 0; i < 7; i++) plan[i] = [];
    return { plan, log: {} };
  }
  function normalize(s) {
    const base = emptyState();
    if (!s || typeof s !== 'object') return base;
    for (let i = 0; i < 7; i++) {
      const arr = s.plan && Array.isArray(s.plan[i]) ? s.plan[i] : [];
      base.plan[i] = arr.map((e) => ({
        id: String(e.id || uid()),
        name: String(e.name || 'Упражнение'),
        sets: Math.max(1, Number(e.sets) || 1),
        weight: Math.max(0, Number(e.weight) || 0),
        reps: Math.max(1, Number(e.reps) || 1),
      }));
    }
    if (s.log && typeof s.log === 'object') {
      for (const [k, v] of Object.entries(s.log)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v.items !== 'object') continue;
        base.log[k] = { total: Number(v.total) || 0, items: v.items };
      }
    }
    return base;
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return emptyState(); }
  }
  let state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full / disabled */ } };

  const ui = { view: 'dashboard', planDay: dow(today()), date: key(today()) };

  /* ================= Аналитика ================= */
  function dayInfo(k) {
    const d = parse(k), idx = dow(d), l = state.log[k];
    const done = l ? Object.keys(l.items).length : 0;
    const planned = Math.max(l ? l.total : state.plan[idx].length, done);
    let vol = 0, sets = 0, reps = 0;
    if (l) for (const e of Object.values(l.items)) { vol += e.sets * e.reps * e.weight; sets += e.sets; reps += e.sets * e.reps; }
    return { k, d, idx, done, planned, vol, sets, reps, ratio: planned ? Math.min(1, done / planned) : 0 };
  }
  function status(k) {
    const i = dayInfo(k), t = today(), diff = i.d - t;
    if (i.planned === 0) return 'rest';
    if (i.ratio >= 1) return 'done';
    if (diff > 0) return 'future';
    if (i.ratio > 0) return 'part';
    return diff < 0 ? 'miss' : 'todo';
  }
  function weekStats(start) {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(dayInfo(key(addDays(start, i))));
    const sum = (f) => days.reduce((a, d) => a + f(d), 0);
    return {
      days,
      planned: days.filter((d) => d.planned > 0).length,
      done: days.filter((d) => d.planned > 0 && d.ratio >= 1).length,
      vol: sum((d) => d.vol), sets: sum((d) => d.sets), reps: sum((d) => d.reps), exDone: sum((d) => d.done),
    };
  }
  function streak() {
    let n = 0, d = today();
    for (let i = 0; i < 400; i++, d = addDays(d, -1)) {
      const k = key(d), info = dayInfo(k);
      if (info.planned === 0) continue;
      if (info.ratio >= 1) n++;
      else if (i === 0) continue;
      else break;
    }
    return n;
  }
  function totals() {
    let workouts = 0, vol = 0, sets = 0;
    const byEx = {};
    for (const k of Object.keys(state.log)) {
      const i = dayInfo(k);
      if (i.planned > 0 && i.ratio >= 1) workouts++;
      vol += i.vol; sets += i.sets;
      for (const e of Object.values(state.log[k].items)) {
        const id = e.name.trim().toLowerCase();
        const o = byEx[id] || (byEx[id] = { name: e.name.trim(), vol: 0, reps: 0, times: 0 });
        o.vol += e.sets * e.reps * e.weight; o.reps += e.sets * e.reps; o.times++;
      }
    }
    const top = Object.values(byEx).sort((a, b) => b.vol - a.vol || b.reps - a.reps).slice(0, 5);
    return { workouts, vol, sets, top };
  }

  /* ================= Шаблоны ================= */
  function ring(ratio, size, stroke, color, inner) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = c * Math.max(0, Math.min(1, ratio));
    return `<div class="ring" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}"><circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${c}"/></svg>
      <b>${inner}</b></div>`;
  }
  function header(title, sub) {
    return `<header class="head"><div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
      <button class="icon-btn glass" data-a="theme" aria-label="Сменить тему">${themeIcon}</button></header>`;
  }
  const exMeta = (e) => `<span class="pill b">${e.sets} × ${e.reps}</span><span class="pill ${e.weight ? 'o' : ''}">${e.weight ? fmtNum(e.weight) + ' кг' : 'свой вес'}</span>`;

  /* ---------- Главная ---------- */
  function dashboard() {
    const t = today(), tk = key(t), info = dayInfo(tk);
    const ws = weekStats(monday(t)), pw = weekStats(addDays(monday(t), -7));
    const tt = totals(), st = streak();
    const todayPlan = state.plan[dow(t)];

    let hero;
    if (info.planned === 0) {
      hero = `<div class="hero"><div class="txt"><h3>Сегодня день отдыха 😴</h3><p>В плане на ${DAYS[dow(t)].toLowerCase()} нет упражнений. Восстановление — тоже часть прогресса.</p></div></div>
        <div class="btn-row"><button class="btn" data-a="planDay" data-d="${dow(t)}" data-go="plan">Добавить упражнения</button></div>`;
    } else {
      const names = todayPlan.slice(0, 3).map((e) => esc(e.name)).join(', ') + (todayPlan.length > 3 ? ` и ещё ${todayPlan.length - 3}` : '');
      hero = `<div class="hero">${ring(info.ratio, 112, 12, 'var(--green)', `${Math.round(info.ratio * 100)}<small>%</small>`)}
        <div class="txt"><h3>${info.ratio >= 1 ? 'Тренировка выполнена 🎉' : 'Сегодня в плане'}</h3>
        <p>${info.done} из ${info.planned} упражнений<br>${names}</p></div></div>
        <div class="btn-row"><button class="btn primary" data-a="goDate" data-k="${tk}">${info.ratio >= 1 ? 'Открыть чек-лист' : 'Начать тренировку'}</button></div>`;
    }

    const delta = pw.vol > 0 ? Math.round(((ws.vol - pw.vol) / pw.vol) * 100) : null;
    const deltaHtml = delta === null ? '' : `<div class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% к прошлой неделе</div>`;

    const tiles = [
      ['var(--blue)', '🏋️', `${ws.done}<small>/ ${ws.planned}</small>`, 'Тренировок на неделе', ''],
      ['var(--orange)', '🔥', `${st}<small>${st === 1 ? 'день' : 'дн.'}</small>`, 'Серия подряд', ''],
      ['var(--purple)', '⚖️', `${nf(ws.vol)}<small>кг</small>`, 'Тоннаж за неделю', deltaHtml],
      ['var(--pink)', '🔁', `${nf(ws.sets)}`, 'Подходов за неделю', `<div class="delta up" style="background:none;padding:0;color:var(--text2)">${nf(ws.reps)} повторений</div>`],
      ['var(--green)', '✅', `${tt.workouts}`, 'Всего тренировок', ''],
      ['var(--teal)', '🏆', `${nf(tt.vol / 1000 >= 10 ? tt.vol / 1000 : tt.vol)}<small>${tt.vol / 1000 >= 10 ? 'т' : 'кг'}</small>`, 'Поднято за всё время', ''],
    ].map((x, i) => `<div class="tile glass" style="animation-delay:${i * 50}ms"><div class="ic" style="background:${x[0]}">${x[1]}</div><div class="v">${x[2]}</div><div class="l">${x[3]}</div>${x[4]}</div>`).join('');

    // Неделя
    const weekHtml = ws.days.map((d) => {
      const s = status(d.k), isToday = d.k === tk;
      return `<button class="day ${s} ${isToday ? 'today' : ''}" data-a="goDate" data-k="${d.k}">
        ${SHORT[d.idx]}<span class="dot">${s === 'done' ? '✓' : d.d.getDate()}</span>
        ${d.planned ? `<span class="cnt">${d.done}/${d.planned}</span>` : ''}</button>`;
    }).join('');

    // Тоннаж по неделям
    const weeks = [];
    for (let i = 7; i >= 0; i--) weeks.push(weekStats(addDays(monday(t), -7 * i)));
    const max = Math.max(1, ...weeks.map((w) => w.vol));
    const barsHtml = weeks.map((w, i) => {
      const w0 = w.days[0].d;
      const lab = i === 7 ? 'Эта' : `${w0.getDate()} ${MONTHS[w0.getMonth()].slice(0, 3)}`;
      return `<div class="bar-col ${i === 7 ? 'cur' : ''}"><span class="val">${w.vol ? nf(w.vol) : ''}</span>
        <div class="bar" style="height:${Math.max(4, (w.vol / max) * 100)}%"></div><span class="lab">${lab}</span></div>`;
    }).join('');

    // Тепловая карта 12 недель
    const start = addDays(monday(t), -7 * 11);
    let heat = '';
    for (let i = 0; i < 84; i++) {
      const k = key(addDays(start, i));
      heat += `<i class="${status(k)}" title="${fmtDate(parse(k))}"></i>`;
    }

    // Топ упражнений
    const topMax = Math.max(1, ...tt.top.map((x) => (x.vol > 0 ? x.vol : x.reps)));
    const topHtml = tt.top.length
      ? tt.top.map((x) => `<div class="top-row"><span class="n">${esc(x.name)}</span><span class="m">${x.vol > 0 ? nf(x.vol) + ' кг' : nf(x.reps) + ' повт.'}</span>
          <div class="track"><b style="width:${((x.vol > 0 ? x.vol : x.reps) / topMax) * 100}%"></b></div></div>`).join('')
      : `<div class="empty"><div class="em">📊</div>Отмечайте упражнения в чек-листе — здесь появится рейтинг.</div>`;

    // Выполнение по дням недели за 4 недели
    return `${header('Главная', `${DAYS[dow(t)]}, ${fmtDate(t)}`)}
      <section class="card glass">${hero}</section>
      <section class="tiles">${tiles}</section>
      <section class="card glass"><h2>Эта неделя</h2><div class="week">${weekHtml}</div></section>
      <div class="grid g2">
        <section class="card glass"><h2>Тоннаж по неделям, кг</h2><div class="bars">${barsHtml}</div></section>
        <section class="card glass"><h2>Топ упражнений</h2>${topHtml}</section>
      </div>
      <section class="card glass"><h2>Активность · 12 недель</h2><div class="heat">${heat}</div>
        <div class="legend"><span style="--c:var(--green)">выполнено</span><span style="--c:var(--orange)">частично</span><span style="--c:color-mix(in srgb,var(--red) 40%,transparent)">пропущено</span><span style="--c:var(--fill-strong)">отдых</span></div></section>
      <section class="card glass"><h2>Данные</h2>
        <p style="margin:0;color:var(--text2);font-size:14px">Всё хранится только в вашем браузере. Делайте резервную копию, чтобы не потерять прогресс.</p>
        <div class="btn-row"><button class="btn sm" data-a="export">Экспорт</button><button class="btn sm" data-a="import">Импорт</button><button class="btn sm danger" data-a="reset">Сбросить всё</button></div></section>`;
  }

  /* ---------- План ---------- */
  function planView() {
    const idx = ui.planDay, list = state.plan[idx];
    const chips = DAYS.map((d, i) => `<button class="chip ${i === idx ? 'on' : ''}" data-a="planDay" data-d="${i}">${SHORT[i]}${state.plan[i].length ? `<em>${state.plan[i].length}</em>` : ''}</button>`).join('');
    const sets = list.reduce((a, e) => a + e.sets, 0);
    const vol = list.reduce((a, e) => a + e.sets * e.reps * e.weight, 0);
    const rows = list.map((e, i) => `<div class="ex"><div class="info"><div class="nm">${esc(e.name)}</div><div class="meta">${exMeta(e)}</div></div>
      <div class="row-acts">
        <button class="mini" data-a="move" data-id="${e.id}" data-dir="-1" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="Выше">${ICON.up}</button>
        <button class="mini" data-a="move" data-id="${e.id}" data-dir="1" ${i === list.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="Ниже">${ICON.down}</button>
        <button class="mini" data-a="edit" data-id="${e.id}" aria-label="Изменить">${ICON.edit}</button>
        <button class="mini" data-a="del" data-id="${e.id}" aria-label="Удалить" style="color:var(--red)">${ICON.trash}</button></div></div>`).join('');
    return `${header('План', 'Упражнения по дням недели')}
      <div class="chips">${chips}</div>
      <section class="card glass"><h2>${DAYS[idx]}</h2>
        ${list.length ? `<div class="sum"><span><b>${list.length}</b> упражн.</span><span><b>${sets}</b> подходов</span><span><b>${nf(vol)}</b> кг тоннаж</span></div>${rows}`
        : `<div class="empty"><div class="em">🗓️</div><b>День свободен</b>Добавьте упражнения или оставьте как день отдыха.</div>`}
        <div class="btn-row"><button class="btn primary" data-a="add">＋ Упражнение</button>
          ${list.length ? '<button class="btn" data-a="copy">Копировать в…</button><button class="btn danger" data-a="clearDay">Очистить</button>' : ''}</div>
      </section>`;
  }

  /* ---------- Чек-лист ---------- */
  function todayView() {
    const d = parse(ui.date), k = ui.date, idx = dow(d), list = state.plan[idx], l = state.log[k];
    const info = dayInfo(k), t = today(), start = monday(d);
    const strip = Array.from({ length: 7 }, (_, i) => {
      const dd = addDays(start, i), kk = key(dd), s = status(kk);
      return `<button class="day ${s} ${kk === ui.date ? 'sel' : ''} ${kk === key(t) ? 'today' : ''}" data-a="pickDate" data-k="${kk}">${SHORT[i]}<span class="dot">${s === 'done' ? '✓' : dd.getDate()}</span></button>`;
    }).join('');
    const rows = list.map((e) => {
      const on = l && l.items[e.id];
      return `<button class="ex ${on ? 'done' : ''}" data-a="toggle" data-id="${e.id}"><span class="check">${ICON.check}</span>
        <span class="info"><div class="nm">${esc(e.name)}</div><div class="meta">${exMeta(e)}</div></span></button>`;
    }).join('');
    const extra = l ? Object.entries(l.items).filter(([id]) => !list.some((e) => e.id === id)).map(([id, e]) =>
      `<button class="ex done" data-a="toggle" data-id="${id}"><span class="check">${ICON.check}</span><span class="info"><div class="nm">${esc(e.name)}</div><div class="meta">${exMeta(e)}<span class="pill">удалено из плана</span></div></span></button>`).join('') : '';
    const rel = ui.date === key(t) ? 'Сегодня' : ui.date === key(addDays(t, -1)) ? 'Вчера' : ui.date === key(addDays(t, 1)) ? 'Завтра' : DAYS[idx];
    return `${header('Чек-лист', `${rel} · ${DAYS[idx]}, ${fmtDate(d)}`)}
      <section class="card glass">
        <div class="nav-week"><button class="mini" data-a="shift" data-n="-7" aria-label="Предыдущая неделя">${ICON.left}</button>
          <span>${fmtDate(start)} – ${fmtDate(addDays(start, 6))}</span>
          <button class="mini" data-a="shift" data-n="7" aria-label="Следующая неделя">${ICON.right}</button></div>
        <div class="week">${strip}</div></section>
      <section class="card glass">
        ${info.planned ? `<div style="display:flex;justify-content:space-between;font-weight:700"><span>Выполнено ${info.done} из ${info.planned}</span><span>${Math.round(info.ratio * 100)}%</span></div>
          <div class="progress"><b style="width:${info.ratio * 100}%"></b></div>
          <div class="sum" style="margin:8px 0 14px"><span><b>${info.sets}</b> подходов</span><span><b>${nf(info.vol)}</b> кг</span></div>` : ''}
        ${list.length || extra ? rows + extra
          : `<div class="empty"><div class="em">😴</div><b>День отдыха</b>На ${DAYS[idx].toLowerCase()} ничего не запланировано.</div>`}
        <div class="btn-row">
          ${list.length ? `<button class="btn primary" data-a="checkAll">${info.ratio >= 1 ? 'Снять все отметки' : 'Отметить всё'}</button>` : ''}
          <button class="btn" data-a="planDay" data-d="${idx}" data-go="plan">Изменить план дня</button></div>
      </section>`;
  }

  /* ================= Рендер ================= */
  function render() {
    const v = ui.view;
    $('#app').innerHTML = v === 'dashboard' ? dashboard() : v === 'plan' ? planView() : todayView();
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.v === v));
  }

  /* ================= Модальные окна ================= */
  const modal = $('#modal'), sheet = $('#sheet');
  const openModal = (html) => { sheet.innerHTML = html; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };

  function exerciseModal(id) {
    const e = id ? state.plan[ui.planDay].find((x) => x.id === id) : null;
    const names = new Set(PRESETS);
    Object.values(state.plan).flat().forEach((x) => names.add(x.name));
    openModal(`<h3>${e ? 'Изменить упражнение' : 'Новое упражнение'} · ${SHORT[ui.planDay]}</h3>
      <form id="exForm" autocomplete="off" data-id="${e ? e.id : ''}">
        <label class="field"><span>Упражнение</span><input name="name" required maxlength="60" placeholder="Например, Жим лёжа" value="${e ? esc(e.name) : ''}" list="names"></label>
        <datalist id="names">${[...names].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        ${e ? '' : `<div class="presets">${PRESETS.slice(0, 8).map((n) => `<button type="button" data-a="preset" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>`}
        <div class="f3">
          <label class="field"><span>Подходов</span><input name="sets" type="number" inputmode="numeric" min="1" max="99" step="1" required value="${e ? e.sets : 3}"></label>
          <label class="field"><span>Повторов</span><input name="reps" type="number" inputmode="numeric" min="1" max="999" step="1" required value="${e ? e.reps : 10}"></label>
          <label class="field"><span>Вес, кг</span><input name="weight" type="number" inputmode="decimal" min="0" max="999" step="0.5" required value="${e ? e.weight : 0}"></label>
        </div>
        <div class="btn-row"><button type="button" class="btn" data-a="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div>
      </form>`);
    setTimeout(() => { const i = sheet.querySelector('input[name=name]'); if (i && !e) i.focus(); }, 60);
  }

  function copyModal() {
    const others = DAYS.map((d, i) => i).filter((i) => i !== ui.planDay);
    openModal(`<h3>Копировать «${DAYS[ui.planDay]}»</h3>
      <p style="margin:0 0 12px;color:var(--text2)">Упражнения будут добавлены в конец выбранных дней.</p>
      <form id="copyForm"><div class="checks">${others.map((i) => `<label><input type="checkbox" name="d" value="${i}">${DAYS[i]}</label>`).join('')}</div>
        <div class="btn-row"><button type="button" class="btn" data-a="close">Отмена</button><button class="btn primary" type="submit">Копировать</button></div></form>`);
  }

  /* ================= Действия ================= */
  function toggle(id) {
    const k = ui.date, idx = dow(parse(k)), ex = state.plan[idx].find((e) => e.id === id);
    const l = state.log[k] || (state.log[k] = { total: 0, items: {} });
    if (l.items[id]) delete l.items[id];
    else if (ex) l.items[id] = { name: ex.name, sets: ex.sets, weight: ex.weight, reps: ex.reps };
    l.total = state.plan[idx].length;
    if (!Object.keys(l.items).length) delete state.log[k];
    save(); render();
  }
  function checkAll() {
    const k = ui.date, idx = dow(parse(k)), list = state.plan[idx], info = dayInfo(k);
    if (info.ratio >= 1) delete state.log[k];
    else {
      const items = {};
      list.forEach((e) => { items[e.id] = { name: e.name, sets: e.sets, weight: e.weight, reps: e.reps }; });
      state.log[k] = { total: list.length, items };
    }
    save(); render();
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workout-backup-${key(today())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const actions = {
    view: (el) => { ui.view = el.dataset.v; if (ui.view === 'today') ui.date = ui.date || key(today()); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    planDay: (el) => { ui.planDay = +el.dataset.d; if (el.dataset.go) ui.view = el.dataset.go; render(); },
    goDate: (el) => { ui.date = el.dataset.k; ui.view = 'today'; render(); window.scrollTo({ top: 0 }); },
    pickDate: (el) => { ui.date = el.dataset.k; render(); },
    shift: (el) => { ui.date = key(addDays(parse(ui.date), +el.dataset.n)); render(); },
    toggle: (el) => toggle(el.dataset.id),
    checkAll,
    add: () => exerciseModal(null),
    edit: (el) => exerciseModal(el.dataset.id),
    del: (el) => {
      const e = state.plan[ui.planDay].find((x) => x.id === el.dataset.id);
      if (e && confirm(`Удалить «${e.name}»?`)) { state.plan[ui.planDay] = state.plan[ui.planDay].filter((x) => x.id !== e.id); save(); render(); }
    },
    move: (el) => {
      const arr = state.plan[ui.planDay], i = arr.findIndex((x) => x.id === el.dataset.id), j = i + +el.dataset.dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]]; save(); render();
    },
    copy: copyModal,
    clearDay: () => { if (confirm(`Очистить ${DAYS[ui.planDay].toLowerCase()}?`)) { state.plan[ui.planDay] = []; save(); render(); } },
    preset: (el) => { const i = sheet.querySelector('input[name=name]'); i.value = el.dataset.n; i.focus(); },
    close: closeModal,
    theme: () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      document.querySelector('meta[name=theme-color]').content = next === 'dark' ? '#07070d' : '#eef2fb';
    },
    export: exportData,
    import: () => $('#importFile').click(),
    reset: () => { if (confirm('Удалить весь план и историю? Это действие нельзя отменить.')) { state = emptyState(); save(); render(); } },
  };

  document.addEventListener('click', (ev) => {
    if (ev.target === modal) return closeModal();
    const el = ev.target.closest('[data-a]');
    if (el && !el.disabled && actions[el.dataset.a]) actions[el.dataset.a](el);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

  document.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (f.id === 'exForm') {
      ev.preventDefault();
      const fd = new FormData(f), name = String(fd.get('name')).trim();
      if (!name) return;
      const data = {
        name,
        sets: Math.max(1, Math.round(+fd.get('sets')) || 1),
        reps: Math.max(1, Math.round(+fd.get('reps')) || 1),
        weight: Math.max(0, +fd.get('weight') || 0),
      };
      const arr = state.plan[ui.planDay], id = f.dataset.id;
      if (id) Object.assign(arr.find((x) => x.id === id), data);
      else arr.push({ id: uid(), ...data });
      save(); closeModal(); render();
    } else if (f.id === 'copyForm') {
      ev.preventDefault();
      const targets = [...f.querySelectorAll('input:checked')].map((i) => +i.value);
      targets.forEach((t) => state.plan[t].push(...state.plan[ui.planDay].map((e) => ({ ...e, id: uid() }))));
      if (targets.length) save();
      closeModal(); render();
    }
  });

  $('#importFile').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || !data.plan) throw new Error('bad');
        if (confirm('Заменить текущие данные данными из файла?')) { state = normalize(data); save(); render(); }
      } catch (e) { alert('Не удалось прочитать файл резервной копии.'); }
    };
    r.readAsText(file);
    ev.target.value = '';
  });

  /* ================= Старт ================= */
  try {
    const th = localStorage.getItem(THEME_KEY);
    if (th === 'light' || th === 'dark') {
      document.documentElement.dataset.theme = th;
      document.querySelector('meta[name=theme-color]').content = th === 'dark' ? '#07070d' : '#eef2fb';
    }
  } catch (e) { /* ignore */ }
  render();
})();
