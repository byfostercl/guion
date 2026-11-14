
/*
 * VID-01 / FOSTER — TELEPRÓNTER AUTÓNOMO
 * GitHub Pages: https://byfostercl.github.io/guion/
 * JavaScript puro. Sin CDN, compilación, bibliotecas ni servidor adicional.
 * Todas las cifras de los gráficos se leen de las tablas HTML originales.
 * No se infieren datos ausentes. La fuente original siempre puede consultarse.
 */
(() => {
  'use strict';
  const $ = (q, scope = document) => scope.querySelector(q);
  const $$ = (q, scope = document) => [...scope.querySelectorAll(q)];
  const root = document.documentElement;
  const body = document.body;
  const script = $('#script');
  const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
  const ns = 'http://www.w3.org/2000/svg';
  const storePrefix = 'foster-vid01-v1:';
  const safeGet = (key, fallback = null) => {
    try { return localStorage.getItem(storePrefix + key) ?? fallback; }
    catch { return fallback; }
  };
  const safeSet = (key, value) => {
    try { localStorage.setItem(storePrefix + key, String(value)); } catch { /* Algunos televisores bloquean localStorage. */ }
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const parseValue = v => {
    const match = String(v).replace(/\s/g, '').match(/[-+]?\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(',', '.')) : NaN;
  };
  const rawRows = figure => $$('tr', figure).map(tr => $$('th, td', tr).map(cell => cell.textContent.replace(/\s+/g, ' ').trim()));
  const make = (tag, className = '', content = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== null && content !== undefined) el.textContent = content;
    return el;
  };
  const svgEl = (tag, attrs = {}, content = null) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    if (content !== null) el.textContent = content;
    return el;
  };
  function chartTitle(target, figure) {
    target.append(make('h3', 'chart-title', figure.dataset.chartTitle || 'Datos del guion'));
  }
  function chartNote(target, text) { target.append(make('p', 'chart-note', text)); }
  function card(title, value, detail = '') {
    const el = make('article', 'metric');
    el.append(make('div', 'metric-overline', title));
    el.append(make('div', 'metric-value', value));
    if (detail) el.append(make('div', 'metric-detail', detail));
    return el;
  }
  function metricGrid(target, entries, extraClass = '') {
    const grid = make('div', 'metric-grid ' + extraClass);
    for (const x of entries) grid.append(card(x.title, x.value, x.detail));
    target.append(grid);
  }
  function formatValue(n, suffix = '') { return number.format(n) + suffix; }

  // SVGs: original table rows provide all x, y and legends. No Chart.js dependency.
  function lineChart(target, labels, values, options = {}) {
    const clean = values.map(Number);
    if (clean.some(x => !Number.isFinite(x)) || !clean.length) return;
    const years = labels.map(parseValue);
    const yearAxis = years.every(Number.isFinite);
    const X = 1100, Y = 385;
    const margin = { t: 40, r: 58, b: 53, l: 75 };
    const w = X - margin.l - margin.r, h = Y - margin.t - margin.b;
    let min = options.min ?? 0;
    let max = options.max ?? (Math.ceil(Math.max(...clean) / 10) * 10 || 10);
    if (max <= min) max = min + 10;
    const first = Math.min(...years), last = Math.max(...years);
    const px = (i) => margin.l + (yearAxis && last > first ? (years[i] - first) / (last - first) : (labels.length === 1 ? .5 : i / (labels.length - 1))) * w;
    const py = val => margin.t + h - ((val - min) / (max - min)) * h;
    const svg = svgEl('svg', { viewBox: `0 0 ${X} ${Y}`, class: 'chart-svg', role: 'img', 'aria-label': `${options.label || 'Evolución'}: ${labels.map((l,i) => l + ': ' + formatValue(clean[i],options.suffix || '')).join(', ')}` });
    for (let i = 0; i <= 4; i++) {
      const y = margin.t + i * h / 4;
      svg.append(svgEl('line', { x1: margin.l, y1:y, x2:X-margin.r, y2:y, class:'gridline' }));
      svg.append(svgEl('text', {x:margin.l - 14,y:y+5,'text-anchor':'end'},formatValue(max-(max-min)*i/4,options.suffix||'')));
    }
    const points = clean.map((v,i) => [px(i),py(v)]);
    const linePath = points.map(([x,y],i) => `${i?'L':'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length-1][0].toFixed(2)} ${margin.t+h} L ${points[0][0].toFixed(2)} ${margin.t+h} Z`;
    svg.append(svgEl('path', {d:areaPath,class:'area-fill'}));
    svg.append(svgEl('path', {d:linePath,class:'series-line'}));
    const stride = Math.max(1, Math.ceil((labels.length-1)/6));
    labels.forEach((lab,i) => {
      if (i===0 || i===labels.length-1 || i%stride===0) svg.append(svgEl('text', {x:px(i), y:Y-20, class:'x-label','text-anchor':'middle'},lab));
      svg.append(svgEl('circle', {cx:px(i),cy:py(clean[i]),r:6,class:'series-dot'}));
      if (i===0 || i===labels.length-1) {
        const y=py(clean[i]);
        const ytext = Math.max(20, y-20);
        svg.append(svgEl('text', {x:px(i),y:ytext,'text-anchor':'middle',class:'line-label'},formatValue(clean[i],options.suffix||'')));
      }
    });
    target.append(svg);
    chartNote(target, `Escala vertical: ${formatValue(min, options.suffix || '')} a ${formatValue(max, options.suffix || '')}. Cada punto corresponde a un valor de la tabla.`);
  }

  function barChart(target, entries, opts = {}) {
    const max = opts.max || Math.max(...entries.map(e => parseValue(e.value)), 1);
    const rows = make('div', 'bar-rows');
    for (const e of entries) {
      const n = parseValue(e.value);
      const row = make('div', 'bar-row');
      row.append(make('span', 'bar-label', e.label));
      row.append(make('strong', 'bar-val', e.value));
      if (Number.isFinite(n)) {
        const rail = make('div','bar-rail');
        const bar = make('span');
        bar.style.setProperty('--bar-width', `${clamp(n/max*100,0,100)}%`);
        rail.append(bar);
        row.append(rail);
      }
      if (e.detail) row.append(make('p', 'bar-extra', e.detail));
      rows.append(row);
    }
    target.append(rows);
  }

  // Chart construction is intentionally based on the existing table, never on a second data copy.
  function drawVisual(figure) {
    const type = figure.dataset.chart;
    const rows = rawRows(figure);
    const host = $('.viz-host', figure);
    if (!type || !rows.length || !host) return false;
    chartTitle(host, figure);
    if (type === 'stages') {
      metricGrid(host, rows[0].map((lab,i) => ({title:lab,value:rows[1]?.[i],detail:rows[2]?.[i]})), 'stages');
      chartNote(host, 'Clasificación de Martin Trow (1973): umbrales convencionales de acceso, no de titulación.');
    } else if (type === 'world') {
      const data = rows.slice(1);
      const labels = data.map(r=>r[0]);
      const tabs = make('div','chart-tabs');
      const chart = make('div');
      const options = [
        {label:'Estudiantes matriculados · millones', col:1, suffix:' M', min:0, max:300},
        {label:'Tasa bruta de matrícula',col:2,suffix:'%',min:0,max:50}
      ];
      options.forEach((opt,idx)=>{
        const b=make('button','',opt.label); b.type='button';b.setAttribute('aria-pressed',idx===0?'true':'false');
        b.addEventListener('click',()=>{
          $$('button',tabs).forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
          chart.replaceChildren();
          lineChart(chart,labels,data.map(r=>parseValue(r[opt.col])),opt);
          scheduleMeasure();
        });
        tabs.append(b);
      });
      host.append(tabs,chart);
      lineChart(chart,labels,data.map(r=>parseValue(r[1])),options[0]);
      chartNote(host,'La columna «Confianza de uso» del Word es una evaluación editorial; no representa intervalos de confianza estadística.');
    } else if (type === 'two-years') {
      const entries=[];
      for (let i=0;i<rows[0].length;i++){
        entries.push({title:`${rows[0][i]} · Matrícula`,value:rows[1][i],detail:rows[2][i]});
        entries.push({title:`${rows[0][i]} · Graduación`,value:rows[3][i],detail:rows[4][i]});
      }
      metricGrid(host,entries);
      chartNote(host,'Son dos tasas brutas diferentes. La diferencia entre ellas no equivale a la proporción de estudiantes que abandona.');
    } else if (type === 'time-line') {
      const data=rows.slice(1);
      lineChart(host,data.map(r=>r[0]),data.map(r=>parseValue(r[1])),{label:'Ingreso inmediato',suffix:'%',min:40,max:75});
    } else if (type === 'bars') {
      const data = rows.length===2 ? rows[0].map((lab,i)=>({label:lab,value:rows[1][i]})) : rows.slice(1).map(r=>({label:r[0],value:r[1]}));
      barChart(host,data,{max:100});
      if (figure.dataset.tableIndex==='7') chartNote(host,'Cada porcentaje se calcula sobre la cohorte escolar original de 2020, no sobre quienes todavía no habían ingresado.');
    } else if (type === 'countries') {
      metricGrid(host,rows.slice(1).map(r=>({title:r[0],value:r[1]})));
      chartNote(host,'«Más de» y «menos de» son límites, no valores puntuales. No se representan como barras numéricas exactas.');
    } else if (type === 'ratio') {
      const vals=rows[1].map(parseValue);
      metricGrid(host,rows[1].map((v,i)=>({title:i===0?'No matriculados':'Matriculados en educación formal',value:v,detail:rows[2]?.[i] || ''})));
      const track=make('div','ratio-track');
      vals.forEach((v,i)=>{const seg=make('div');seg.style.width=`${clamp(v,0,100)}%`;seg.setAttribute('aria-label',`${i===0?'No matriculados':'Matriculados'}: ${v}%`);track.append(seg);});
      host.append(track);
      chartNote(host,'El 58% se obtiene como complemento del 42%; no indica exclusivamente ingreso a la universidad.');
    } else if (type === 'paired') {
      let entries;
      const id=Number(figure.dataset.tableIndex);
      if (id===11) {
        entries=rows.slice(2).map(r=>({title:r[0],value:r[1]}));
        metricGrid(host,entries);
        chartNote(host,'Los criterios no son excluyentes; «más de 40%» no es una cifra exacta.');
      } else if(id===18){
        entries=rows[0].map((val,i)=>({title:rows[1][i],value:val,detail:rows[2][i]}));
        metricGrid(host,entries);
        chartNote(host,'El +24% describe una asociación observada y «1 de cada 8» es una proporción aproximada.');
      } else {
        entries=rows[0].map((label,i)=>({title:label,value:rows[1]?.[i],detail:rows[2]?.[i]}));
        metricGrid(host,entries);
      }
    } else if (type === 'ranking') {
      barChart(host,rows.slice(1).map(r=>({label:r[0],value:r[1]})),{max:100});
      chartNote(host,'La escala es un índice de cambio de requisitos de habilidades, NO un porcentaje de competencias transformadas.');
    } else if(type === 'word-bars') {
      const id=Number(figure.dataset.tableIndex);
      let data=[];
      if(id===16) data=[0,3,6].map((x,i)=>({label:rows[x][0],value:rows[x][rows[x].length-1],detail:rows[x+2][0]}));
      else if(id===17) data=[0,2,4,6,8].map(x=>({label:rows[x][0],value:rows[x][rows[x].length-1]}));
      else if(id===19) data=[0,2].map(x=>({label:rows[x][0],value:rows[x][rows[x].length-1]}));
      else if(id===23) data=[0,2,4].map(x=>({label:rows[x][0],value:rows[x+1].find(v=>Number.isFinite(parseValue(v)))||'?'}));
      barChart(host,data,{max:id===23?6:100});
      if(id===23) chartNote(host,'Estos tramos de edad pueden compartir empleos que se prolongaron entre períodos. NO deben sumarse para obtener 9,4.');
      if(id===17) chartNote(host,'Expectativas declaradas por los empleadores para 2025–2030, no acciones ya realizadas.');
    } else if (type === 'comparison') {
      metricGrid(host,rows[0].map((title,i)=>({title,value:'3 años',detail:rows[1]?.[i]})));
      chartNote(host,'Ambas historias describen tres años trabajados, pero oportunidades distintas de aprendizaje.');
    } else if (type === 'kpi') {
      metricGrid(host,[{title:rows[0][0],value:rows[1]?.[0],detail:rows[2]?.[0]}]);
    } else return false;
    return true;
  }
  // Four prose-based studies also receive visual summaries.
  // Their figures are read from nearby source paragraphs, NOT maintained as duplicate hard-coded datasets.
  function initStoryVisuals() {
    const cues=$$('.cue',script);
    const findCue=prefix=>cues.find(el=>el.textContent.trim().startsWith(prefix))?.textContent.trim() || '';
    const percentages=text=>(text.match(/\d+(?:[,.]\d+)?%/g)||[]);
    $$('.story-block').forEach(fig=>{
      try {
        const host=$('.viz-host',fig);
        const type=fig.dataset.story;
        let entries=[];
        let note='';
        if(type==='fne') {
          const programs=percentages(findCue('35% de los aproximadamente 5.000 programas'))[0];
          const enrollment=percentages(findCue('Cerca del 40% de los estudiantes de ingreso de 2023'))[0];
          const subsystems=percentages(findCue('En el subsistema universitario, la proporción de estudiantes'));
          if(!programs || !enrollment || subsystems.length<2)return;
          entries=[
            {title:'Programas de pregrado con retorno negativo',value:programs,detail:'De aproximadamente 5.000 programas analizados'},
            {title:'Ingreso 2023 en ese segmento',value:enrollment,detail:'Porcentaje aproximado de nuevos estudiantes'},
            {title:'Subsistema universitario',value:subsystems[0],detail:'Ingresaron a programas con retorno negativo'},
            {title:'Subsistema técnico-profesional',value:subsystems[1],detail:'Ingresaron a programas con retorno negativo'}
          ];
          note='FNE, Chile, informe final enero de 2026. Los porcentajes tienen denominadores distintos; no deben sumarse ni compararse como si describieran la misma población.';
        } else if(type==='movilidad') {
          const before=findCue('Por ejemplo, en Estados Unidos, un estudio publicado en la revista Science');
          const after=findCue('La proporción cayó a aproximadamente 5 de cada 10.');
          const m1=before.match(/(\d+) de cada 10/);
          const m2=after.match(/(\d+) de cada 10/);
          if(!m1 || !m2)return;
          entries=[
            {title:'Personas nacidas en 1940',value:`≈${Number(m1[1])*10}%`,detail:'Superaron los ingresos reales de sus padres'},
            {title:'Personas nacidas en 1980',value:`≈${Number(m2[1])*10}%`,detail:'Superaron los ingresos reales de sus padres'}
          ];
          note='Estudio citado en el guion para Estados Unidos. Son resultados aproximados de cohortes históricas, no un pronóstico de generaciones actuales.';
        } else if(type==='vivienda') {
          const a=percentages(findCue('Entre los nacidos alrededor de 1980, aproximadamente el'))[0];
          const b=percentages(findCue('Entre los nacidos alrededor de 1990, esa proporción'))[0];
          if(!a || !b)return;
          entries=[
            {title:'Nacidos alrededor de 1980',value:a,detail:'Vivienda propia a los 29 años'},
            {title:'Nacidos alrededor de 1990',value:b,detail:'Vivienda propia a los 29 años'}
          ];
          note='Comparación generacional OCDE citada en el texto. Se mantiene la definición y cautela narrativa del Word.';
        } else if(type==='bls') {
          const vals=percentages(findCue('Más aún (mostrar gráficamente), el mismo estudio muestra que la proporción de mujeres'));
          if(vals.length<4)return;
          entries=[
            {title:'Mujeres · a los 27 años',value:vals[0],detail:'Licenciatura o nivel superior'},
            {title:'Mujeres · a los 39 años',value:vals[1],detail:'Licenciatura o nivel superior'},
            {title:'Hombres · a los 27 años',value:vals[2],detail:'Licenciatura o nivel superior'},
            {title:'Hombres · a los 39 años',value:vals[3],detail:'Licenciatura o nivel superior'}
          ];
          note='BLS, cohorte nacida entre 1980 y 1984 en EE. UU. La proporción con estudios completos aumenta en la adultez; no se asume una trayectoria única.';
        } else return;
        chartTitle(host,fig);
        metricGrid(host,entries);
        chartNote(host,note);
        fig.classList.add('has-chart','show-graphic');
      } catch(err) {console.warn('Síntesis visual omitida:',fig.id,err);}
    });
  }

  function initVisuals() {
    $$('.data-block[data-chart]').forEach(fig=>{
      try {
        if (!drawVisual(fig)) return;
        fig.classList.add('has-chart','show-graphic');
        const button=$('.switch-viz',fig);
        if(!button)return;
        button.hidden=false;
        button.addEventListener('click',()=>{
          const show=!fig.classList.toggle('show-graphic');
          button.textContent=show?'Volver al gráfico':'Ver tabla original';
          button.setAttribute('aria-pressed',String(show));
          scheduleMeasure();
        });
      } catch(err) {
        // An older TV browser can fall back to the original HTML table.
        console.warn('Gráfico omitido; permanece disponible la tabla original:',fig.id,err);
        $('.viz-host',fig)?.replaceChildren();
      }
    });
  }

  // Reading navigation and playback
  const menuToggle=$('#menuToggle');
  const sidepanel=$('#sidepanel');
  const panelClose=$('#panelClose');
  const backdrop=$('#backdrop');
  function toggleMenu(open = !body.classList.contains('nav-open')) {
    body.classList.toggle('nav-open',open);
    menuToggle?.setAttribute('aria-expanded',String(open));
    if(open)pauseScroll();
    if(open) sidepanel.scrollTop=Math.min(sidepanel.scrollTop,80);
  }
  menuToggle?.addEventListener('click',()=>toggleMenu());
  $('#introMenu')?.addEventListener('click',()=>toggleMenu(true));
  panelClose?.addEventListener('click',()=>toggleMenu(false));
  backdrop?.addEventListener('click',()=>toggleMenu(false));
  $$('.toc-link').forEach(a=>a.addEventListener('click',()=>toggleMenu(false)));

  const steps=$$('.reading-step',script);
  let visibleSteps=[];
  let stepPositions=[];
  let activeIndex=0;
  let lastSavedStep='';
  let measureScheduled=false;
  function measure() {
    measureScheduled=false;
    visibleSteps=steps.filter(el=>el.getClientRects().length!==0);
    stepPositions=visibleSteps.map(el=>el.getBoundingClientRect().top+window.scrollY);
    updatePosition();
  }
  function scheduleMeasure() {
    if(measureScheduled)return;
    measureScheduled=true;
    requestAnimationFrame(measure);
  }
  function stepAtScroll() {
    const point=window.scrollY+innerHeight*.41;
    let lo=0,hi=stepPositions.length-1,result=0;
    while(lo<=hi){
      const m=(lo+hi)>>1;
      if(stepPositions[m]<=point){result=m;lo=m+1;}else hi=m-1;
    }
    return result;
  }
  function updatePosition() {
    const maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const progress=clamp(Math.round(window.scrollY/maxScroll*100),0,100);
    $('#progressFill').style.width=progress+'%';
    $('.top-progress').setAttribute('aria-valuenow',String(progress));
    $('#readingCount').textContent=progress+'%';
    if(!visibleSteps.length)return;
    activeIndex=stepAtScroll();
    const now=visibleSteps[activeIndex];
    $('.reading-step.is-current')?.classList.remove('is-current');
    now.classList.add('is-current');
    let h=now.closest('.chapter-heading') || null;
    if(!h) {
      h=$$('.chapter-heading,.subchapter',script).filter(el=>el.getBoundingClientRect().top<innerHeight*.5).slice(-1)[0];
    }
    if(h) {
      $('#currentSection').textContent=h.textContent.trim().replace(/\s+/g,' ').slice(0,72);
      $$('.toc-link.is-active').forEach(a=>a.classList.remove('is-active'));
      const link=$(`.toc-link[data-target="${h.id}"]`);
      link?.classList.add('is-active');
    }
    if(now.id && now.id!==lastSavedStep) {
      lastSavedStep=now.id;
      safeSet('position',now.id);
    }
  }
  let scrollRaf=0;
  function handleScroll(){
    if(scrollRaf)return;
    scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;updatePosition();});
  }
  addEventListener('scroll',handleScroll,{passive:true});
  addEventListener('resize',scheduleMeasure,{passive:true});
  function jump(index) {
    if(!visibleSteps.length)return;
    activeIndex=clamp(index,0,visibleSteps.length-1);
    visibleSteps[activeIndex].scrollIntoView({behavior:'smooth',block:'center'});
    updatePosition();
  }
  function relativeJump(n){pauseScroll();jump(activeIndex+n);}
  $('#prevBtn').addEventListener('click',()=>relativeJump(-1));
  $('#nextBtn').addEventListener('click',()=>relativeJump(1));
  $('#startBtn')?.addEventListener('click',()=>{
    pauseScroll();
    $('#b-b1-pregunta-o-conflicto')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  script.addEventListener('click',e=>{
    if(e.target.closest('button,a,.table-shell,.viz-host'))return;
    const cue=e.target.closest('.reading-step');
    if(cue && visibleSteps.includes(cue)){pauseScroll();jump(visibleSteps.indexOf(cue));}
  });

  const play=$('#playBtn');
  const speedSlider=$('#speedSlider');
  let playing=false,animFrame=0,lastTime=0;
  function playback(t) {
    if(!playing)return;
    const dt=lastTime?clamp((t-lastTime)/1000,0,.10):0;
    lastTime=t;
    const max=document.documentElement.scrollHeight-innerHeight;
    if(window.scrollY>=max-2){pauseScroll();return;}
    window.scrollBy(0,Number(speedSlider.value)*dt);
    animFrame=requestAnimationFrame(playback);
  }
  function pauseScroll(){
    playing=false;cancelAnimationFrame(animFrame);animFrame=0;lastTime=0;
    play.classList.remove('is-playing');
    play.innerHTML='▶ <span>Auto</span>';
    play.setAttribute('aria-pressed','false');
    play.setAttribute('title','Iniciar desplazamiento automático (Espacio)');
  }
  function toggleScroll() {
    if(playing){pauseScroll();return;}
    toggleMenu(false);
    playing=true;lastTime=0;
    play.innerHTML='Ⅱ <span>Pausa</span>';
    play.classList.add('is-playing');
    play.setAttribute('aria-pressed','true');
    play.setAttribute('title','Pausar desplazamiento (Espacio)');
    animFrame=requestAnimationFrame(playback);
  }
  play.addEventListener('click',toggleScroll);
  speedSlider.value=String(clamp(Number(safeGet('speed','24')),8,90));
  $('#speedValue').textContent=speedSlider.value+' px/s';
  speedSlider.addEventListener('input',()=>{$('#speedValue').textContent=speedSlider.value+' px/s';safeSet('speed',speedSlider.value);});

  // Readability controls, including a darkening overlay that never blocks clicks.
  let zoom=clamp(Number(safeGet('zoom','1')),0.65,1.9);
  function setZoom(value) {
    zoom=clamp(Math.round(value*100)/100,.65,1.9);
    root.style.setProperty('--zoom',String(zoom));
    $('#fontSizeValue').textContent=Math.round(zoom*100)+'%';
    safeSet('zoom',zoom);scheduleMeasure();
  }
  setZoom(zoom);
  $('#fontDown').addEventListener('click',()=>setZoom(zoom-.10));
  $('#fontUp').addEventListener('click',()=>setZoom(zoom+.10));
  const dim=$('#dimSlider');
  dim.value=String(clamp(Number(safeGet('dim','20')),0,75));
  function setDim(){root.style.setProperty('--shade',String(Number(dim.value)/100));$('#dimValue').textContent=dim.value+'%';safeSet('dim',dim.value);}
  dim.addEventListener('input',setDim);setDim();
  const focus=$('#focusCheckbox');
  focus.checked=safeGet('focus','false')==='true';
  function setFocus(){body.dataset.focus=focus.checked?'on':'off';safeSet('focus',String(focus.checked));}
  focus.addEventListener('change',setFocus);setFocus();
  const sources=$('#sourcesToggle');
  function setSources(on){
    body.dataset.sources=on?'on':'off';
    sources.textContent=on?'Fuentes: visibles':'Fuentes: ocultas';
    sources.setAttribute('aria-pressed',String(on));
    safeSet('sources',on?'on':'off');
    scheduleMeasure();
  }
  sources.addEventListener('click',()=>setSources(body.dataset.sources==='off'));
  setSources(safeGet('sources','off')==='on');
  const cinema=$('#cinemaToggle');
  function toggleCinema(on=!body.classList.contains('cinema')){
    body.classList.toggle('cinema',on);
    $('#exitCinema').hidden=!on;
    cinema.textContent=on?'Salir de escena':'Modo escena';
    toggleMenu(false);scheduleMeasure();
  }
  cinema.addEventListener('click',()=>toggleCinema());
  $('#exitCinema').addEventListener('click',()=>toggleCinema(false));
  $('#fullscreenBtn').addEventListener('click',async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    }catch{ /* El navegador integrado podría no admitir pantalla completa. */ }
  });

  // A single persistent bookmark, plus automatic reading position recovery.
  const bookmarkBtn=$('#bookmarkBtn');
  const jumpBookmarkBtn=$('#jumpBookmarkBtn');
  let bookmark=safeGet('bookmark','');
  function refreshBookmark(){
    const current=visibleSteps[activeIndex]?.id;
    bookmarkBtn.textContent=current && current===bookmark?'★':'☆';
    bookmarkBtn.setAttribute('aria-label',current===bookmark?'Eliminar marcador':'Marcar este bloque');
    jumpBookmarkBtn.disabled=!bookmark || !document.getElementById(bookmark);
  }
  bookmarkBtn.addEventListener('click',()=>{
    const current=visibleSteps[activeIndex]?.id;
    if(!current)return;
    bookmark=bookmark===current?'':current;
    safeSet('bookmark',bookmark);refreshBookmark();
  });
  jumpBookmarkBtn.addEventListener('click',()=>{
    const target=document.getElementById(bookmark);
    if(!target)return;
    if(target.classList.contains('source-note'))setSources(true);
    target.scrollIntoView({behavior:'smooth',block:'center'});
  });
  $('#resumeBtn').addEventListener('click',()=>{
    const id=safeGet('position','');
    const target=id?document.getElementById(id):null;
    toggleMenu(false);
    if(target){
      if(target.classList.contains('source-note'))setSources(true);
      target.scrollIntoView({behavior:'smooth',block:'center'});
    }
  });

  // Word's own bold remains in HTML. Search lets you mark further words/phrases while recording.
  const search=$('#textSearch');
  let found=[],foundIndex=-1;
  const clearSearch=()=>{
    $$('.live-mark',script).forEach(mark=>{
      const parent=mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent));
      parent?.normalize();
    });
    found=[];foundIndex=-1;
  };
  function runSearch(query) {
    clearSearch();
    const needle=query.trim();
    if(!needle){$('#searchStatus').textContent='';return;}
    const lowerNeedle=needle.toLocaleLowerCase('es');
    const textContainers=$$('.cue,.chapter-heading,.subchapter,.data-caption,.source-note,.source-table',script);
    let count=0;
    for(const el of textContainers){
      if(el.classList.contains('source-note') && body.dataset.sources==='off')continue;
      if(el.classList.contains('source-table') && el.closest('.has-chart.show-graphic'))continue;
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      for(const node of nodes){
        const value=node.nodeValue||'';
        const lower=value.toLocaleLowerCase('es');
        if(!lower.includes(lowerNeedle))continue;
        const frag=document.createDocumentFragment();
        let start=0,at;
        while((at=lower.indexOf(lowerNeedle,start))!==-1){
          if(at>start)frag.append(document.createTextNode(value.slice(start,at)));
          const mark=make('mark','live-mark',value.slice(at,at+needle.length));
          frag.append(mark);found.push(mark);count++;
          start=at+needle.length;
          if(count>=350)break;
        }
        if(start<value.length)frag.append(document.createTextNode(value.slice(start)));
        node.replaceWith(frag);
        if(count>=350)break;
      }
      if(count>=350)break;
    }
    $('#searchStatus').textContent=count ? `${count}${count>=350?'+':''} coincidencia${count===1?'':'s'} · botón ↳ para avanzar`:'No se encontraron coincidencias';
  }
  function nextMatch(){
    if(!found.length)return;
    if(foundIndex>=0)found[foundIndex]?.classList.remove('active-match');
    foundIndex=(foundIndex+1)%found.length;
    const mark=found[foundIndex];
    mark.classList.add('active-match');
    mark.scrollIntoView({behavior:'smooth',block:'center'});
  }
  let searchDebounce=0;
  search.addEventListener('input',()=>{
    clearTimeout(searchDebounce);
    searchDebounce=setTimeout(()=>runSearch(search.value),180);
  });
  search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();nextMatch();}});
  $('#searchNext').addEventListener('click',nextMatch);

  // Browser keyboard + conventional directional commands used by TV remotes.
  addEventListener('keydown',e=>{
    const input=e.target.closest('input,textarea,select,[contenteditable="true"]');
    if(input){ if(e.key==='Escape'){input.blur();toggleMenu(false);} return; }
    const key=e.key;
    if(key==='Escape'){
      if(body.classList.contains('nav-open'))toggleMenu(false);
      else if(body.classList.contains('cinema'))toggleCinema(false);
      return;
    }
    if(key===' ' || key==='MediaPlayPause' || key.toLowerCase()==='a'){
      e.preventDefault();toggleScroll();
    } else if(key==='ArrowDown'){
      e.preventDefault();relativeJump(1);
    } else if(key==='ArrowUp'){
      e.preventDefault();relativeJump(-1);
    } else if(key==='ArrowRight'){
      e.preventDefault();relativeJump(1);
    } else if(key==='ArrowLeft'){
      e.preventDefault();relativeJump(-1);
    } else if(key.toLowerCase()==='m'){
      e.preventDefault();if(body.classList.contains('cinema'))toggleCinema(false);else toggleMenu();
    } else if(key.toLowerCase()==='c'){
      e.preventDefault();toggleCinema();
    } else if(key.toLowerCase()==='s'){
      e.preventDefault();setSources(body.dataset.sources==='off');
    } else if(key==='+' || key==='='){
      e.preventDefault();setZoom(zoom+.10);
    } else if(key==='-' || key==='_'){
      e.preventDefault();setZoom(zoom-.10);
    } else if(key.toLowerCase()==='b'){
      bookmarkBtn.click();
    }
  });

  // Init and fallback: no scripted visualization means the Word table stays visible.
  initVisuals();
  initStoryVisuals();
  function afterLayout(){measure();refreshBookmark();}
  requestAnimationFrame(()=>requestAnimationFrame(afterLayout));
  addEventListener('load',()=>{scheduleMeasure();});
  const refresh=$('#script');
  if('ResizeObserver' in window) {
    const ro=new ResizeObserver(()=>scheduleMeasure());
    ro.observe(refresh);
  }
  // Keep bookmark UI synchronized as the reading point advances.
  addEventListener('scroll',()=>requestAnimationFrame(refreshBookmark),{passive:true});
})();

/*
 * GUIONES VERTICALES — EXTENSIÓN DE NAVEGACIÓN
 * Compatible con el main.js original.
 * No modifica los controles existentes.
 */

(() => {
  'use strict';

  const toc = document.getElementById('toc');

  if (!toc || !document.getElementById('verticales')) {
    return;
  }

  const entries = [
    [
      'verticales',
      'GUION LANZAMIENTO STORIES',
      1
    ],
    [
      'vertical-ver-01',
      'VER-01 · Presentación y lanzamiento',
      2
    ],
    [
      'vertical-ver-02',
      'VER-02 · Qué hago como desarrollador',
      2
    ],
    [
      'vertical-ver-03',
      'VER-03 · El ejemplo de los 52 informes',
      2
    ],
    [
      'vertical-ver-04',
      'VER-04 · Presentación personal',
      2
    ]
  ];

  // Incorporar las nuevas secciones al índice lateral.

  for (const [id, title, depth] of entries) {

    if (toc.querySelector('[data-target="' + id + '"]')) {
      continue;
    }

    const link = document.createElement('a');

    link.href = '#' + id;
    link.className = 'toc-link depth-' + depth;
    link.dataset.target = id;

    link.innerHTML =
      '<span class="toc-dot"></span><span></span>';

    link.lastElementChild.textContent = title;

    link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');

      document
        .getElementById('menuToggle')
        ?.setAttribute('aria-expanded', 'false');
    });

    toc.appendChild(link);
  }

  // Actualizar la cantidad de puntos del índice.

  const tocCount = document.getElementById('tocCount');

  if (tocCount) {
    tocCount.textContent =
      toc.querySelectorAll('.toc-link').length + ' puntos';
  }

  // Agregar acceso directo desde la portada.

  const actions = document.querySelector('.intro-actions');

  if (
    actions &&
    !actions.querySelector('[href="#verticales"]')
  ) {

    const link = document.createElement('a');

    link.href = '#verticales';
    link.className = 'secondary-action vertical-jump';

    link.textContent = 'Ir a guiones verticales';

    link.style.cssText =
      'display:inline-flex;' +
      'align-items:center;' +
      'justify-content:center;';

    actions.appendChild(link);
  }

})();
