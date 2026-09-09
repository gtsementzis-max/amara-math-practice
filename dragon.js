// Shared helpers for the dragon-themed lessons (Lesson 2, Lesson 3, ...).
// Load after common.js at the END of <body> (it appends the SVG egg artwork to the body).
//
// An "item" is either an egg colour name from EGG_TYPES ('ember', 'forest', ...) — drawn as a
// big speckled SVG dragon egg — or any emoji string ('💎', '🐲', ...) drawn at the same size.

const EGG_TYPES = {
  ember:  {c1:'#ffc08a', c2:'#c2410c', spot:'#7c2d12'},
  forest: {c1:'#b5f0b5', c2:'#15803d', spot:'#14532d'},
  storm:  {c1:'#b9e0ff', c2:'#1d4ed8', spot:'#1e3a8a'},
  shadow: {c1:'#e2c6ff', c2:'#6d28d9', spot:'#3b0764'},
  gold:   {c1:'#fff4b0', c2:'#d97706', spot:'#92400e'},
};
const EGG_ORDER = Object.keys(EGG_TYPES);

// Inject one gradient + one <symbol> per egg colour; every egg on the page is a <use> of these.
(function buildEggDefs(){
  let defs = '<defs>';
  for(const [name, c] of Object.entries(EGG_TYPES)){
    defs += `
      <radialGradient id="grad-${name}" cx="38%" cy="28%" r="78%">
        <stop offset="0" stop-color="${c.c1}"/>
        <stop offset="1" stop-color="${c.c2}"/>
      </radialGradient>
      <symbol id="egg-${name}" viewBox="0 0 64 80">
        <path d="M32 3C47 3 60 27 60 48c0 17-12.5 29-28 29S4 65 4 48C4 27 17 3 32 3z"
              fill="url(#grad-${name})" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>
        <g fill="${c.spot}" opacity=".55">
          <ellipse cx="22" cy="30" rx="4" ry="5"/>
          <ellipse cx="41" cy="21" rx="3" ry="4"/>
          <ellipse cx="45" cy="46" rx="5" ry="6"/>
          <ellipse cx="24" cy="55" rx="3.5" ry="4.5"/>
          <ellipse cx="35" cy="67" rx="3" ry="3.5"/>
          <ellipse cx="33" cy="40" rx="2.5" ry="3"/>
        </g>
        <ellipse cx="22" cy="18" rx="6" ry="9" fill="#fff" opacity=".35" transform="rotate(-20 22 18)"/>
      </symbol>`;
  }
  defs += '</defs>';
  document.body.insertAdjacentHTML('beforeend',
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" id="eggDefs"></svg>');
  document.getElementById('eggDefs').innerHTML = defs;
})();

function eggSVG(type){
  return `<svg class="egg" viewBox="0 0 64 80" aria-hidden="true"><use href="#egg-${type}"/></svg>`;
}
function itemHTML(item){
  return EGG_TYPES[item] ? eggSVG(item) : `<span class="nest-emoji">${item}</span>`;
}
// How many items per row inside a nest, so each group looks tidy.
function nestCols(n){
  return ({1:1,2:2,3:3,4:2,5:3,6:3,7:4,8:4,9:3,10:5})[n] || 4;
}
// One nest with `perNest` slots, the first `filled` of them holding the item (rest are dotted outlines).
function makeNest(perNest, filled, item, label){
  const nest = document.createElement('div');
  nest.className = 'nest';
  nest.style.gridTemplateColumns = `repeat(${nestCols(Math.max(perNest,1))}, auto)`;
  if(label) nest.innerHTML = `<span class="tag">${label}</span>`;
  for(let d=0; d<perNest; d++){
    nest.insertAdjacentHTML('beforeend', d < filled ? itemHTML(item) : '<span class="egg-slot"></span>');
  }
  return nest;
}
// numNests nests, each holding perNest items — the "equal groups" picture of division.
// labelPrefix (e.g. 'Nest', 'Cave') adds a "Nest 1", "Nest 2"... tag above each one.
function renderNests(el, numNests, perNest, item, labelPrefix){
  el.className = 'nests';
  el.innerHTML = '';
  for(let g=0; g<numNests; g++){
    el.appendChild(makeNest(perNest, perNest, item, labelPrefix ? `${labelPrefix} ${g+1}` : ''));
  }
}

// Hands-on "we do" step: a pool of `total` items the learner taps into `numNests` nests
// holding `perNest` each. A full nest shakes and refuses. When the pool is empty,
// opts.successText(total, numNests, perNest) is shown and opts.onComplete(successEl) fires.
function initNestActivity(container, opts){
  const { total, numNests, perNest, onComplete } = opts;
  const successText = opts.successText || ((t, n, p) => `🐲 ${n} nests × ${p} eggs = ${t}! That's ${n} × ${p} = ${t}.`);
  const item = opts.item || opts.type;
  const labelPrefix = opts.labelPrefix || 'Nest';
  let pool = total;
  const counts = new Array(numNests).fill(0);

  container.innerHTML = `
    <div class="build-wrap">
      <div class="build-status" data-role="pool-label"></div>
      <div class="egg-pool" data-role="pool"></div>
      <div class="nests" data-role="nests"></div>
      <div class="build-status" data-role="status"></div>
      <div class="build-success" data-role="success"></div>
    </div>`;
  const poolLabel = container.querySelector('[data-role="pool-label"]');
  const poolEl = container.querySelector('[data-role="pool"]');
  const nestsEl = container.querySelector('[data-role="nests"]');
  const statusEl = container.querySelector('[data-role="status"]');
  const successEl = container.querySelector('[data-role="success"]');

  function renderPool(){
    poolLabel.textContent = pool > 0
      ? `${pool} egg${pool===1?'':'s'} left. Tap a nest to place one:`
      : '';
    poolEl.innerHTML = itemHTML(item).repeat(pool);
  }
  function renderAll(){
    nestsEl.innerHTML = '';
    for(let b=0; b<numNests; b++){
      const nest = makeNest(perNest, counts[b], item, `${labelPrefix} ${b+1}`);
      nest.classList.add('tappable');
      if(counts[b] >= perNest) nest.classList.add('full');
      nest.onclick = () => tap(b, nest);
      nestsEl.appendChild(nest);
    }
  }
  function tap(b, nestEl){
    if(pool <= 0) return;
    if(counts[b] >= perNest){
      nestEl.classList.add('shake');
      statusEl.textContent = 'That nest is full — the dragon says no more eggs! Try another nest.';
      setTimeout(()=>nestEl.classList.remove('shake'), 400);
      return;
    }
    counts[b]++;
    pool--;
    statusEl.textContent = '';
    renderPool();
    renderAll();
    if(pool === 0){
      successEl.style.display = 'block';
      successEl.textContent = successText(total, numNests, perNest);
      if(onComplete) onComplete(successEl);
    }
  }
  renderPool();
  renderAll();
}
