/*
 * FOSTER — VID-01 / VER-01…04
 * Versión horizontal del 26-11-2026 · Guion - Horizontal(2).docx.
 * Sin bibliotecas externas. Compatible con GitHub Pages.
 * La tabla original, el diálogo y sus instrucciones no desaparecen al dibujar gráficos.
 */
(() => {
  'use strict';
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const body = document.body, root = document.documentElement, script = $('#script');
  if (!script) return;
  const prefix = 'foster-vid01-v2:';
  const read = (k, fallback = '') => { try { return localStorage.getItem(prefix + k) ?? fallback; } catch { return fallback; } };
  const save = (k, v) => { try { localStorage.setItem(prefix + k, String(v)); } catch {} };
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const num = v => {
    const m = String(v ?? '').replace(/\s/g, '').match(/[-+]?\d+(?:[,.]\d+)?/);
    return m ? Number(m[0].replace(',', '.')) : NaN;
  };
  const fmt = v => Number(v).toLocaleString('es-CL', { maximumFractionDigits: 1 });
  const el = (tag, cls = '', text = '') => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== null) node.textContent = text;
    return node;
  };
  let measurePending = false;
  function scheduleMeasure() {
    if (measurePending) return;
    measurePending = true;
    requestAnimationFrame(() => { measurePending = false; measure(); });
  }
  function note(parent, content) { parent.append(el('p', 'chart-note', content)); }
  function grid(host, entries) {
    const wrap = el('div', 'metric-grid');
    entries.forEach(item => {
      const box = el('div', 'metric');
      box.append(el('div', 'metric-overline', item.label || 'Indicador'));
      box.append(el('div', 'metric-value', item.value || '—'));
      if (item.detail) box.append(el('div', 'metric-detail', item.detail));
      wrap.append(box);
    });
    host.append(wrap);
  }
  function bars(host, items, maximum = 100) {
    const wrap = el('div', 'bar-rows');
    items.forEach(item => {
      const n = num(item.value);
      const row = el('div', 'bar-row');
      row.append(el('span', 'bar-label', item.label));
      row.append(el('strong', 'bar-val', item.value));
      if (Number.isFinite(n)) {
        const rail = el('div', 'bar-rail');
        const fill = el('span');
        fill.style.setProperty('--bar-width', `${clamp(100 * n / maximum, 0, 100)}%`);
        rail.append(fill);
        row.append(rail);
      }
      if (item.detail) row.append(el('p', 'bar-extra', item.detail));
      wrap.append(row);
    });
    host.append(wrap);
  }
  function graphLine(host, labels, data, { max = null, min = 0, suffix = '', label = '' } = {}) {
    const values = data.map(num);
    if (values.length < 2 || values.some(x => !Number.isFinite(x))) return;
    const hi = max ?? Math.ceil(Math.max(...values) / 10) * 10;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs, content) => {
      const n = document.createElementNS(svgNS, tag);
      Object.entries(attrs || {}).forEach(([key, val]) => n.setAttribute(key, val));
      if (content !== undefined) n.textContent = content;
      return n;
    };
    const W = 1100, H = 380, left = 82, top = 44, width = 948, height = 270;
    const years = labels.map(num);
    const linearYears = years.every(Number.isFinite) && Math.max(...years) !== Math.min(...years);
    const x = i => left + width * (linearYears ? (years[i] - years[0]) / (years[years.length - 1] - years[0]) : i / (values.length - 1));
    const y = v => top + height * (1 - (v - min) / (hi - min));
    const svg = svgEl('svg', { class: 'chart-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label || 'Gráfico de evolución' });
    for (let i = 0; i <= 4; i++) {
      const yy = top + height * i / 4;
      svg.append(svgEl('line', { x1: left, x2: left + width, y1: yy, y2: yy, class: 'gridline' }));
      svg.append(svgEl('text', { x: left - 13, y: yy + 5, 'text-anchor': 'end' }, fmt(hi - (hi - min) * i / 4) + suffix));
    }
    const pts = values.map((v, i) => [x(i), y(v)]);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
    svg.append(svgEl('path', { d: `${path} L ${pts[pts.length - 1][0]} ${top + height} L ${pts[0][0]} ${top + height} Z`, class: 'area-fill' }));
    svg.append(svgEl('path', { d: path, class: 'series-line' }));
    const stride = Math.max(1, Math.ceil(labels.length / 7));
    values.forEach((value, i) => {
      svg.append(svgEl('circle', { cx: x(i), cy: y(value), r: '6', class: 'series-dot' }));
      if (i % stride === 0 || i === values.length - 1)
        svg.append(svgEl('text', { x: x(i), y: H - 21, 'text-anchor': 'middle', class: 'x-label' }, labels[i]));
      if (i === 0 || i === values.length - 1)
        svg.append(svgEl('text', { x: x(i) + (i === 0 ? 45 : -13), y: Math.max(24, y(value) - 20), 'text-anchor': 'middle', class: 'line-label' }, fmt(value) + suffix));
    });
    host.append(svg);
  }
  // Charts follow semantic kinds, not positions: changing the script never shifts chart types.
  function visualFor(figure) {
    const config = JSON.parse(figure.dataset.config);
    const { kind, rows, note: sourceNote } = config;
    const host = $('.viz-host', figure);
    if (!host || !rows.length) return;
    if (kind === 'stages') {
      grid(host, rows[0].map((label, i) => ({ label, value: rows[1][i], detail: rows[2][i] })));
    } else if (kind === 'line-multi') {
      const tabbar = el('div', 'chart-tabs');
      const graph = el('div');
      const series = [
        ['Estudiantes matriculados (millones)', 1, ' M', 300],
        ['Tasa bruta de matrícula', 2, '%', 50]
      ];
      const source = rows.slice(1);
      series.forEach(([title, col, suffix, maximum], n) => {
        const button = el('button', '', title);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(n === 0));
        button.addEventListener('click', () => {
          $$('button', tabbar).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
          graph.replaceChildren();
          graphLine(graph, source.map(r => r[0]), source.map(r => r[col]), { max: maximum, suffix, label: title });
          scheduleMeasure();
        });
        tabbar.append(button);
      });
      host.append(tabbar, graph);
      graphLine(graph, source.map(r => r[0]), source.map(r => r[1]), { max: 300, suffix: ' M', label: series[0][0] });
    } else if (kind === 'world-grad') {
      const indicators=[];
      rows[0].forEach((year,i) => {
        indicators.push({label: year+' · matrícula superior', value:rows[1][i], detail:rows[2][i]});
        indicators.push({label: year+' · graduación', value:rows[3][i], detail:rows[4][i]});
      });
      grid(host, indicators);
    } else if (kind === 'line') {
      const points = rows.slice(1);
      const values=points.map(r=>num(r[1]));
      graphLine(host, points.map(r=>r[0]), points.map(r=>r[1]), {
        max: Math.max(10,Math.ceil(Math.max(...values)/10)*10),
        min: Math.max(0,Math.floor(Math.min(...values)/10)*10), suffix:'%', label:'Ingreso inmediato a educación superior'
      });
    } else if (kind === 'cohort') {
      bars(host, rows[0].map((year,i)=>({label:year, value:rows[1][i]})),100);
      grid(host,[{label:'Ingreso acumulado al quinto año',value:'74,1%'},{label:'No había ingresado',value:'25,9%'}]);
    } else if (kind === 'ratio') {
      grid(host, rows[1].map((value,i)=>({label:i?'Seguían matriculados':'No estudiaban', value, detail:rows[2][i]})));
      const segments=el('div','ratio-track');
      rows[1].forEach((value,i)=>{const seg=el('div');seg.style.width=clamp(num(value),0,100)+'%';segments.append(seg);});
      host.append(segments);
    } else if (kind === 'comparison') {
      grid(host,rows.slice(1).map(row=>({label:row[0],value:'Noruega: '+row[1]+' · Suecia: '+row[2]})));
    } else if (kind === 'bars') {
      bars(host,rows.map(row=>({label:row[0],value:row[1]})),100);
    } else if (kind === 'time-bars') {
      bars(host,rows[0].map((label,i)=>({label,value:rows[1][i]})),100);
    } else if (kind === 'years-premium') {
      grid(host,rows[0].map((label,i)=>({label,value:rows[1][i],detail:rows[2][i]})));
    } else if (kind === 'first-job') {
      grid(host,rows[0].map((value,i)=>({label:rows[1][i],value,detail:rows[2][i]})));
    } else if (kind === 'jobs-age') {
      bars(host,rows.map(row=>({label:row[0],value:row[1]})),6);
      grid(host,[{label:'Empleos diferentes en total · 18–38 años',value:'9,4',detail:'Promedio longitudinal, no suma de los tramos'}]);
    } else if (kind === 'two-point') {
      grid(host,rows[1].map((value,i)=>({label:i?'Año 2022':'Año 2013',value,detail:rows[2][i]})));
    } else if (kind === 'two-point-alt') {
      grid(host,rows[0].map((value,i)=>({label:rows[1][i],value,detail:rows[2][i]})));
    } else return;
    if (sourceNote) note(host,sourceNote);
    figure.classList.add('has-chart','show-graphic');
    const button=$('.switch-viz',figure);
    button?.addEventListener('click',()=>{
      const open=figure.classList.toggle('show-original');
      button.textContent=open?'Ocultar tabla original':'Mostrar tabla original';
      button.setAttribute('aria-expanded',String(open));
      scheduleMeasure();
    });
  }
  $$('.data-block[data-config]',script).forEach(figure => {
    try { visualFor(figure); }
    catch (error) {
      console.warn('La gráfica no pudo renderizarse; la tabla original sigue visible.',figure.id,error);
      figure.classList.remove('has-chart','show-graphic');
    }
  });

  const menu = $('#menuToggle'), panel = $('#sidepanel');
  function openMenu(open) {
    body.classList.toggle('nav-open', open);
    menu?.setAttribute('aria-expanded', String(open));
    if (open) pause();
  }
  menu?.addEventListener('click', () => openMenu(!body.classList.contains('nav-open')));
  $('#introMenu')?.addEventListener('click', () => openMenu(true));
  $('#panelClose')?.addEventListener('click', () => openMenu(false));
  $('#backdrop')?.addEventListener('click', () => openMenu(false));
  $$('.toc-link').forEach(link => link.addEventListener('click', () => openMenu(false)));

  let steps = [], positions = [], current = 0;
  function measure() {
    steps = $$('.reading-step', script).filter(e => e.getClientRects().length > 0);
    positions = steps.map(e => e.getBoundingClientRect().top + window.scrollY);
    updateProgress();
  }
  function activeAtScroll() {
    if (!positions.length) return 0;
    const pos = window.scrollY + window.innerHeight * .42;
    let lo = 0, hi = positions.length - 1, answer = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (positions[mid] <= pos) { answer = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return answer;
  }
  function updateProgress() {
    const denom = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.round(clamp(window.scrollY / denom * 100, 0, 100));
    if ($('#progressFill')) $('#progressFill').style.width = progress + '%';
    $('.top-progress')?.setAttribute('aria-valuenow', String(progress));
    if ($('#readingCount')) $('#readingCount').textContent = progress + '%';
    if (!steps.length) return;
    current = activeAtScroll();
    $('.reading-step.is-current')?.classList.remove('is-current');
    const active = steps[current];
    active.classList.add('is-current');
    const headings = $$('.chapter-heading', script);
    const activeHeading = headings.filter(h => h.getBoundingClientRect().top <= innerHeight * .49).slice(-1)[0];
    if (activeHeading) {
      if ($('#currentSection')) $('#currentSection').textContent = activeHeading.textContent.trim().slice(0, 75);
      $$('.toc-link.is-active').forEach(a => a.classList.remove('is-active'));
      $$('.toc-link').find(a => a.dataset.target === activeHeading.id)?.classList.add('is-active');
    }
    if (active.id) save('position', active.id);
    refreshBookmark();
  }
  let tick = 0;
  window.addEventListener('scroll', () => {
    if (tick) return;
    tick = requestAnimationFrame(() => { tick = 0; updateProgress(); });
  }, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  function jump(relative) {
    if (!steps.length) return;
    pause();
    const n = clamp(current + relative, 0, steps.length - 1);
    steps[n].scrollIntoView({ behavior: 'smooth', block: 'center' });
    current = n;
    updateProgress();
  }
  $('#prevBtn')?.addEventListener('click', () => jump(-1));
  $('#nextBtn')?.addEventListener('click', () => jump(1));
  $('#startBtn')?.addEventListener('click', () => $('#b-b1-pregunta-o-conflicto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  const play = $('#playBtn'), speed = $('#speedSlider');
  let playing = false, frame = 0, previous = 0;
  function pause() {
    playing = false; cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (play) { play.innerHTML = '▶ <span>Auto</span>'; play.classList.remove('is-playing'); play.setAttribute('aria-pressed', 'false'); }
  }
  function animate(now) {
    if (!playing) return;
    const seconds = previous ? clamp((now - previous) / 1000, 0, .12) : 0;
    previous = now;
    if (scrollY >= document.documentElement.scrollHeight - innerHeight - 2) { pause(); return; }
    window.scrollBy(0, num(speed?.value || '24') * seconds);
    frame = requestAnimationFrame(animate);
  }
  function togglePlay() {
    if (playing) { pause(); return; }
    openMenu(false); playing = true; previous = 0;
    if (play) { play.innerHTML = 'Ⅱ <span>Pausa</span>'; play.classList.add('is-playing'); play.setAttribute('aria-pressed', 'true'); }
    frame = requestAnimationFrame(animate);
  }
  play?.addEventListener('click', togglePlay);
  if (speed) {
    speed.value = clamp(Number(read('speed', '24')), 8, 90);
    if ($('#speedValue')) $('#speedValue').textContent = speed.value + ' px/s';
    speed.addEventListener('input', () => { $('#speedValue').textContent = speed.value + ' px/s'; save('speed', speed.value); });
  }
  let zoom = clamp(Number(read('zoom', '1')), .65, 1.9);
  function setZoom(value) {
    zoom = clamp(Math.round(value * 100) / 100, .65, 1.9);
    root.style.setProperty('--zoom', String(zoom));
    if ($('#fontSizeValue')) $('#fontSizeValue').textContent = Math.round(zoom * 100) + '%';
    save('zoom', zoom); scheduleMeasure();
  }
  setZoom(zoom);
  $('#fontDown')?.addEventListener('click', () => setZoom(zoom - .1));
  $('#fontUp')?.addEventListener('click', () => setZoom(zoom + .1));
  const dim = $('#dimSlider');
  function updateDim() {
    root.style.setProperty('--shade', String(Number(dim.value) / 100));
    $('#dimValue').textContent = dim.value + '%'; save('dim', dim.value);
  }
  if (dim) { dim.value = clamp(Number(read('dim', '20')), 0, 75); dim.addEventListener('input', updateDim); updateDim(); }
  const focus = $('#focusCheckbox');
  if (focus) {
    focus.checked = read('focus', 'false') === 'true';
    body.dataset.focus = focus.checked ? 'on' : 'off';
    focus.addEventListener('change', () => { body.dataset.focus = focus.checked ? 'on' : 'off'; save('focus', focus.checked); });
  }
  function setSources(on) {
    body.dataset.sources = on ? 'on' : 'off';
    const button = $('#sourcesToggle');
    if (button) { button.textContent = on ? 'Fuentes: visibles' : 'Fuentes: ocultas'; button.setAttribute('aria-pressed', String(on)); }
    save('sources', body.dataset.sources); scheduleMeasure();
  }
  $('#sourcesToggle')?.addEventListener('click', () => setSources(body.dataset.sources === 'off'));
  setSources(read('sources', 'off') === 'on');
  function cinema(on = !body.classList.contains('cinema')) {
    body.classList.toggle('cinema', on);
    const b = $('#cinemaToggle'); if (b) b.textContent = on ? 'Salir de escena' : 'Modo escena';
    if ($('#exitCinema')) $('#exitCinema').hidden = !on;
    openMenu(false); scheduleMeasure();
  }
  $('#cinemaToggle')?.addEventListener('click', () => cinema());
  $('#exitCinema')?.addEventListener('click', () => cinema(false));
  $('#fullscreenBtn')?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch { /* Puede que el navegador del TV no permita pantalla completa. */ }
  });

  let bookmark = read('bookmark', '');
  function refreshBookmark() {
    const active = steps[current]?.id || '';
    const mark = $('#bookmarkBtn'), jumpBtn = $('#jumpBookmarkBtn');
    if (mark) { mark.textContent = active && active === bookmark ? '★' : '☆'; mark.title = active === bookmark ? 'Quitar marcador' : 'Marcar punto'; }
    if (jumpBtn) jumpBtn.disabled = !bookmark || !document.getElementById(bookmark);
  }
  $('#bookmarkBtn')?.addEventListener('click', () => {
    const active = steps[current]?.id;
    if (!active) return;
    bookmark = bookmark === active ? '' : active; save('bookmark', bookmark); refreshBookmark();
  });
  $('#jumpBookmarkBtn')?.addEventListener('click', () => document.getElementById(bookmark)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  $('#resumeBtn')?.addEventListener('click', () => {
    openMenu(false);
    document.getElementById(read('position'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  const search = $('#textSearch'); let matches = [], matchIndex = -1, debounce;
  function clearMarks() {
    $$('.live-mark', script).forEach(mark => {
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent)); parent?.normalize();
    });
    matches = []; matchIndex = -1;
  }
  function markText(query) {
    clearMarks();
    const term = query.trim().toLocaleLowerCase('es');
    if (!term) { if ($('#searchStatus')) $('#searchStatus').textContent = ''; return; }
    const targets = $$('.cue,.chapter-heading,.source-note,.director-cue,.story-visual,.source-table', script);
    for (const target of targets) {
      if (target.classList.contains('source-note') && body.dataset.sources === 'off') continue;
      if (target.classList.contains('source-table') && !target.closest('.show-original')) continue;
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const value = node.nodeValue || '', lower = value.toLocaleLowerCase('es');
        let pos = 0, at, frag = document.createDocumentFragment();
        if (!lower.includes(term) || node.parentElement?.closest('mark')) continue;
        while ((at = lower.indexOf(term, pos)) !== -1 && matches.length < 350) {
          frag.append(document.createTextNode(value.slice(pos, at)));
          const mark = el('mark', 'live-mark', value.slice(at, at + term.length));
          matches.push(mark); frag.append(mark); pos = at + term.length;
        }
        frag.append(document.createTextNode(value.slice(pos))); node.replaceWith(frag);
        if (matches.length >= 350) break;
      }
      if (matches.length >= 350) break;
    }
    if ($('#searchStatus')) $('#searchStatus').textContent = matches.length ? `${matches.length} coincidencia(s). Avanza con ↳.` : 'No se encontraron coincidencias';
  }
  function nextMatch() {
    if (!matches.length) return;
    if (matchIndex >= 0) matches[matchIndex].classList.remove('active-match');
    matchIndex = (matchIndex + 1) % matches.length;
    matches[matchIndex].classList.add('active-match');
    matches[matchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  search?.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => markText(search.value), 200); });
  search?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); nextMatch(); } });
  $('#searchNext')?.addEventListener('click', nextMatch);

  // Teclado o control remoto del TV. 'V' salta a los guiones verticales.
  window.addEventListener('keydown', event => {
    if (event.target.closest('input,textarea,select,[contenteditable="true"]')) {
      if (event.key === 'Escape') { event.target.blur(); openMenu(false); }
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      if (body.classList.contains('nav-open')) openMenu(false);
      else if (body.classList.contains('cinema')) cinema(false);
      return;
    }
    if (key === ' ' || key === 'mediaplaypause' || key === 'a') { event.preventDefault(); togglePlay(); }
    else if (['arrowdown','arrowright'].includes(key)) { event.preventDefault(); jump(1); }
    else if (['arrowup','arrowleft'].includes(key)) { event.preventDefault(); jump(-1); }
    else if (key === 'm') { event.preventDefault(); cinema(false); openMenu(!body.classList.contains('nav-open')); }
    else if (key === 'c') { event.preventDefault(); cinema(); }
    else if (key === 's') { event.preventDefault(); setSources(body.dataset.sources === 'off'); }
    else if (key === 'v') { event.preventDefault(); pause(); $('#verticales')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (key === 'h') { event.preventDefault(); pause(); $('#b-b1-pregunta-o-conflicto')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (key === '+' || key === '=') { event.preventDefault(); setZoom(zoom + .1); }
    else if (key === '-' || key === '_') { event.preventDefault(); setZoom(zoom - .1); }
    else if (key === 'b') { event.preventDefault(); $('#bookmarkBtn')?.click(); }
  });

  requestAnimationFrame(() => requestAnimationFrame(measure));
  window.addEventListener('load', scheduleMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMeasure).observe(script);
})();
