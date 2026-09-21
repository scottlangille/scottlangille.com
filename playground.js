import { composeScore } from './drawing-scores.js';
import { pageInk } from './drawing-page-ink.js';
// An original drawing instrument, inspired by Mike van der Sanden's playable portfolio.
const host = document.querySelector('#drawing-tool');
const ns = 'http://www.w3.org/2000/svg';
if (host) {
  const palette = [
    ['ink','Ink'], ['blue','Blue'], ['turquoise','Turquoise'],
    ['gold','Gold'], ['coral','Coral'], ['violet','Violet'],
  ];
  let humanStrokes = 0;
  let selectedColor = 'ink';
  host.innerHTML = `
    <div class="drawing-surface">
      <div class="drawing-spacer" aria-hidden="true"></div>
      <button class="drawing-snapshot" type="button" data-action="snapshot" aria-label="Save drawing as an image">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.5 8.4 Q3.4 7.1 4.9 7 L8 6.9 L9.4 4.8 Q9.8 4.2 10.7 4.2 L14.2 4.3 Q15 4.3 15.4 5 L16.7 7 L19.3 7.1 Q20.7 7.1 20.6 8.5 L20.5 18.2 Q20.5 19.4 19.2 19.4 L4.8 19.3 Q3.5 19.3 3.5 18 Z"/>
          <path d="M8.3 13 Q8.3 9.5 11.8 9.4 Q15.6 9.4 15.7 13 Q15.7 16.7 12 16.8 Q8.5 16.7 8.3 13 Z M18 9.6 l.1 .1"/>
        </svg>
      </button>
      <svg viewBox="0 0 512 288" aria-label="Radial drawing canvas" role="img">
        <defs>
          <pattern id="drawing-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="16" cy="12" r=".7" fill="currentColor" opacity=".14"/></pattern>
        </defs>
        <rect class="drawing-grid-fill" width="512" height="288" fill="url(#drawing-grid)"/>
        <g class="drawing-marks" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></g>
      </svg>
    </div>
    <div class="drawing-actions" hidden>
      <div class="drawing-palette" role="group" aria-label="Drawing colors" hidden>
        ${palette.map(([id,label]) => `<button type="button" data-color="${id}" aria-label="${label} ink" aria-pressed="${id === 'ink'}" style="--swatch:var(--drawing-${id})"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 C18 3 21 8 20 13 C20 19 13 22 8 19 C2 17 3 9 6 6 Q8 4 12 4Z"/><path class="swatch-ring" d="M11 1.4 C18 .2 23 6 22.5 13 C22 20 16 23.7 9 22 C1 20 -.2 13 2.1 7 Q4.6 1.1 11.7 1.5"/></svg></button>`).join('')}
      </div>
      <button type="button" data-action="undo">Undo</button>
      <button type="button" data-action="clear">Clear</button>
      <span class="drawing-status" role="status" aria-live="polite"></span>
    </div>`;
  const svg = host.querySelector('.drawing-surface > svg');
  const surface = host.querySelector('.drawing-surface');
  let escaped = false;
  const marks = host.querySelector('.drawing-marks');
  const actions = host.querySelector('.drawing-actions');
  const paletteControl = host.querySelector('.drawing-palette');
  paletteControl.hidden = humanStrokes < 5;
  const status = host.querySelector('.drawing-status');
  let active = null, frame = 0;
  let strokes = [];
  let owned = false, demo = false, visible = false;
  let idleTimer = 0, demoFrame = 0, lastTime = 0, elapsed = 0;
  let paths = [];
  let escapedPathIndex = 0, escapedStrokeBase = 0;
  let idleDelay = 1000;
  const ASTRA_ESCAPE_AFTER = 100;
  const ESCAPED_STROKE_LIMIT = 100;
  let escapedStrokeCount = 0, astraFinished = false;
  let completedDrawings = 0;
  const ESCAPE_ATTEMPTS_REQUIRED = 3;
  let escapeAttempts = 0, beyondCanvas = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function makeDrawing() {
    let score = composeScore();
    const writingGroups = new Map();
    const handedness = score.allowReflection === false ? 1 : Math.random() < .5 ? -1 : 1;
    const placements = new Map();
    if (escaped) {
      syncEscapedViewport();
      const page = svg.viewBox.baseVal;
      const field = pageInk(strokes);
      const groups = new Map();
      for (const [,points,writing,id] of score) {
        if (!groups.has(id)) groups.set(id,{paths:[],writing:!!writing});
        groups.get(id).paths.push(points);
      }
      // Reserve complete messages first, then fit ordinary gestures around them.
      const ordered = [...groups].sort((a,b) => Number(b[1].writing)-Number(a[1].writing));
      for (const [id,group] of ordered) {
        const points = group.paths.flat();
        const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]*handedness);
        const minX=Math.min(...xs), maxX=Math.max(...xs);
        const minY=Math.min(...ys), maxY=Math.max(...ys);
        const padding=16;
        const scale=Math.max(.01,Math.min(1,(page.width-padding*2)/Math.max(1,maxX-minX),
          (page.height-padding*2)/Math.max(1,maxY-minY)));
        const width=(maxX-minX)*scale, height=(maxY-minY)*scale;
        let best = null, bestPaths = null, pressure = Infinity;
        for (let attempt=0; attempt<40; attempt++) {
          const candidate = {scale,
            x:page.x+padding+Math.random()*Math.max(0,page.width-padding*2-width)-minX*scale,
            y:page.y+padding+Math.random()*Math.max(0,page.height-padding*2-height)-minY*scale};
          const proposed = group.paths.map(path => path.map(([x,y]) =>
            [candidate.x+x*scale,candidate.y+y*handedness*scale]));
          if (!field.fits(proposed,group.writing)) continue;
          const crowding = field.crowding(proposed);
          if (crowding < pressure) { best=candidate; bestPaths=proposed; pressure=crowding; }
          if (pressure < .025) break;
        }
        if (best) {
          placements.set(id,best);
          field.add(bestPaths,group.writing);
        }
      }
      score = score.filter(([,points,writing,id]) => placements.has(id));
    }

    let clock = 0;
    const drawing = score.map(([pause, waypoints, writing, id]) => {
      clock += Math.min(250, pause * (.7 + Math.random() * .6));
      const points = [];
      const start = clock;
      const transformed = waypoints.map(([x,y,duration]) => {
        // Placement is composed for this rectangular canvas. A global rotation
        // would push corner details offscreen; each gesture already varies its angle.
        x += (Math.random() - .5) * 2;
        y = (y + (Math.random() - .5) * 2) * handedness;
        const placement = placements.get(id);
        return placement
          ? [placement.x+x*placement.scale, placement.y+y*placement.scale, duration]
          : [256+x,144+y,duration];
      });
      points.push([...transformed[0].slice(0,2), clock]);
      for (let i = 1; i < transformed.length; i++) {
        const [x,y,duration] = transformed[i];
        const [px,py] = transformed[i - 1];
        const travel = duration * (.75 + Math.random() * .65);
        const steps = Math.max(4, Math.ceil(Math.hypot(x-px,y-py) / 2));
        const acceleration = .55 + Math.random() * 1.2;
        for (let step = 1; step <= steps; step++) {
          const t = step / steps;
          const position = Math.pow(t, acceleration);
          const tremor = Math.sin(t * Math.PI) * (Math.random() - .5) * .65;
          points.push([px + (x-px)*position + tremor, py + (y-py)*position - tremor, clock + t*travel]);
        }
        clock += travel;
      }
      if (writing && !writingGroups.has(id)) writingGroups.set(id, writing);
      return {points, start, end: clock, writing: writing ? writingGroups.get(id) : null};
    });
    return drawing;
  }
  // Preserve the canvas coordinate system as its viewport expands to the page.
  // The expanded SVG lives in document space and scrolls with the page itself.
  function syncEscapedViewport() {
    if (!escaped) return;
    const rect = surface.getBoundingClientRect();
    const scale = surface.clientWidth / 512;
    const left = rect.left + scrollX + surface.clientLeft;
    const top = rect.top + scrollY + surface.clientTop;
    const width = document.documentElement.clientWidth;
    const height = Math.max(document.body.offsetHeight, document.documentElement.clientHeight);
    Object.assign(svg.style, {left: `${-left}px`, top: `${-top}px`, width: `${width}px`, height: `${height}px`});
    svg.setAttribute('viewBox', `${-left/scale} ${-top/scale} ${width/scale} ${height/scale}`);
  }
  function escapeCanvas() {
    const stroke = strokes[strokes.length - 1];
    if (stroke) stroke.escapedCanvas = true;
    escaped = true;
    escapedStrokeCount = 0;
    astraFinished = false;
    host.classList.add('drawing-escaped');
    document.documentElement.classList.add('page-drawable');
    syncEscapedViewport();
    status.textContent = 'The page is yours to draw on. Clear returns to the canvas.';
  }
  function restoreCanvas() {
    escaped = false;
    escapedStrokeCount = 0;
    astraFinished = false;
    escapeAttempts = 0;
    beyondCanvas = false;
    host.classList.remove('drawing-escaped');
    document.documentElement.classList.remove('page-drawable');
    for (const property of ['left','top','width','height']) svg.style.removeProperty(property);
    svg.setAttribute('viewBox', '0 0 512 288');
  }
  window.addEventListener('resize', syncEscapedViewport);
  const pageSizeObserver = new ResizeObserver(syncEscapedViewport);
  pageSizeObserver.observe(surface);
  pageSizeObserver.observe(document.body);

  function canPlay() { return !astraFinished && !owned && visible && !document.hidden && !reducedMotion.matches; }
  function pauseDemo() {
    clearTimeout(idleTimer);
    cancelAnimationFrame(demoFrame);
    demoFrame = 0;
    lastTime = 0;
  }
  function takeOver() {
    completedDrawings = 0;
    owned = true;
    actions.hidden = false;
    pauseDemo();
    if (demo) strokes = [];
    demo = false;
  }
  function animateDemo(time) {
    demoFrame = 0;
    if (!canPlay()) return;
    if (lastTime) elapsed += Math.min(time - lastTime, 50);
    lastTime = time;
    if (!paths.length) {
      astraFinished = true;
      return;
    }
    const drawingTime = paths[paths.length - 1].end;
    const erase = escaped ? 0 : Math.max(0, Math.min(1, (elapsed - drawingTime - 1000) / 1100));
    const easedErase = erase * erase * (3 - 2 * erase);
    const playhead = erase > 0 ? drawingTime * (1 - easedErase) : Math.min(elapsed, drawingTime);
    const samplePath = path => {
      // Capture the mode when a stroke starts, so the escaping stroke keeps its copies.
      if (path.single === undefined) path.single = escaped;
      const points = path.points.filter(point => point[2] <= playhead);
      const next = path.points[points.length];
      if (points.length && next) {
        const last = points[points.length - 1];
        const t = (playhead-last[2])/(next[2]-last[2]);
        points.push([last[0]+(next[0]-last[0])*t, last[1]+(next[1]-last[1])*t]);
      }
      points.writing = path.writing;
      points.single = path.single;
      if (!escaped && completedDrawings >= ASTRA_ESCAPE_AFTER && erase === 0 &&
          points.some(([x,y]) => x<0 || x>512 || y<0 || y>288)) {
        escapeCanvas();
        actions.hidden = false;
      }
      return points;
    };
    if (escaped) {
      // Completed strokes keep their arrays and SVG nodes; sample only the pen.
      while (escapedPathIndex < paths.length && playhead >= paths[escapedPathIndex].start) {
        const path = paths[escapedPathIndex];
        strokes[escapedStrokeBase + escapedPathIndex] = samplePath(path);
        if (playhead < path.end) break;
        escapedPathIndex++;
        escapedStrokeCount++;
        if (escapedStrokeCount >= ESCAPED_STROKE_LIMIT) {
          astraFinished = true;
          schedule();
          return;
        }
      }
    } else {
      strokes = paths.filter(path => playhead >= path.start).map(samplePath).filter(path => path.length);
      if (escaped) {
        // Finish the escaping pen stroke, then compose in page space immediately.
        paths = paths.slice(0, strokes.length);
        escapedStrokeBase = 0;
        escapedPathIndex = paths.findIndex(path => path.end > playhead);
        if (escapedPathIndex < 0) escapedPathIndex = paths.length;
      }
    }
    if (escaped && elapsed >= drawingTime + 150) {
      // Continue the same timeline and retain every earlier mark after escape.
      const offset = elapsed;
      const continuation = makeDrawing().map(path => ({
        ...path, single: true,
        start: path.start + offset, end: path.end + offset,
        points: path.points.map(([x,y,time]) => [x,y,time+offset]),
      }));
      escapedStrokeBase = strokes.length;
      escapedPathIndex = 0;
      paths = continuation;
    } else if (erase === 1) {
      completedDrawings++;
      paths = makeDrawing();
      elapsed = -150;
      strokes = [];
    }
    schedule();
    demoFrame = requestAnimationFrame(animateDemo);
  }
  function queueDemo() {
    pauseDemo();
    if (!canPlay()) return;
    idleTimer = setTimeout(() => {
      if (!canPlay()) return;
      if (!demo) {
        demo = true;
        actions.hidden = true;
        idleDelay = 1000;
        paths = makeDrawing();
        escapedPathIndex = 0;
        escapedStrokeBase = 0;
        elapsed = 0;
      }
      demoFrame = requestAnimationFrame(animateDemo);
    }, idleDelay);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    queueDemo();
  }, {threshold: .2});
  observer.observe(svg);
  document.addEventListener('visibilitychange', queueDemo);
  function restartClearCountdown() {
    if (!owned && !demo && idleDelay === 3000) queueDemo();
  }
  for (const event of ['pointerdown','pointerup','keydown','focusin']) {
    host.addEventListener(event, restartClearCountdown);
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && demo) {
      demo = false;
      strokes = [];
      schedule();
    }
    queueDemo();
  });

  // Keep layers and paths mounted, including the lettering-above-artwork order.
  const layers = [false, true].map(() => {
    const layer = document.createElementNS(ns, 'g');
    marks.append(layer);
    return Array.from({length: 8}, (_, copy) => {
      const group = document.createElementNS(ns, 'g');
      group.setAttribute('transform', `rotate(${copy * 45} 256 144)`);
      layer.append(group);
      return group;
    });
  });
  let rendered = [];
  const actionButtons = host.querySelectorAll('[data-action="undo"], [data-action="clear"]');
  function render() {
    frame = 0;
    for (let i = 0; i < Math.max(strokes.length, rendered.length); i++) {
      const points = strokes[i];
      let entry = rendered[i];
      if (!points) {
        entry?.nodes.forEach(node => node.remove());
        continue;
      }
      if (entry && entry.points === points && entry.length === points.length) continue;
      if (!entry || entry.single !== points.single || entry.writing !== points.writing) {
        entry?.nodes.forEach(node => node.remove());
        const groups = layers[points.writing ? 1 : 0];
        const nodes = groups.slice(0, points.single ? 1 : 8).map(group => {
          const node = document.createElementNS(ns, 'path');
          group.append(node);
          return node;
        });
        entry = rendered[i] = {nodes, single: points.single, writing: points.writing};
      }
      const d = points.map(([x,y], j) => `${j ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + (points.length === 1 ? ' l.1,.1' : '');
      for (const node of entry.nodes) {
        node.setAttribute('d', d);
        if (points.color) node.setAttribute('stroke', `var(--drawing-${points.color})`);
        else node.removeAttribute('stroke');
      }
      entry.points = points;
      entry.length = points.length;
    }
    rendered.length = strokes.length;
    actionButtons.forEach(button => button.disabled = !strokes.length);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function point(event) {
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    if (escaped || active !== null) return [position.x, position.y];
    return [Math.max(0, Math.min(512, position.x)), Math.max(0, Math.min(288, position.y))];
  }
  document.addEventListener('pointerdown', event => {
    if (active !== null || event.button !== 0) return;
    if (!escaped && !svg.contains(event.target)) return;
    // Links and accordion controls still work while the page is a drawing surface.
    if (escaped && event.target.closest('a, button, input, textarea, select, [contenteditable], [role="button"]')) return;
    event.preventDefault();
    host.classList.add('drawing-active');
    takeOver();
    active = event.pointerId;
    document.documentElement.setPointerCapture(active);
    escapeAttempts = 0;
    beyondCanvas = false;
    const stroke = [point(event)];
    stroke.single = escaped;
    stroke.color = selectedColor;
    strokes.push(stroke);
    if (strokes.length > 60) strokes.shift();
    status.textContent = '';
    schedule();
  });
  document.addEventListener('pointermove', event => {
    if (!owned && !demo && host.contains(event.target)) queueDemo();
    if (event.pointerId !== active) return;
    if (!escaped) {
      const [x,y] = point(event);
      const outsideCanvas = x < 0 || x > 512 || y < 0 || y > 288;
      // Only the actual pen position can unlock the page, never a radial copy.
      // Count entering outside space, not every move while the pen is held there.
      if (outsideCanvas && !beyondCanvas) {
        escapeAttempts++;
        if (escapeAttempts >= ESCAPE_ATTEMPTS_REQUIRED) escapeCanvas();
      }
      beyondCanvas = outsideCanvas;
    }
    const stroke = strokes[strokes.length - 1];
    if (!stroke) return;
    const next = point(event), last = stroke[stroke.length - 1];
    if (stroke.length < 1800 && Math.hypot(next[0] - last[0], next[1] - last[1]) > 1.4) {
      stroke.push(next); schedule();
    }
  });
  function finish(event) {
    if (event.pointerId !== active) return;
    const stroke = strokes[strokes.length-1];
    if (event.type === 'pointerup' && stroke?.length > 1 && humanStrokes < 5) {
      humanStrokes++;
      if (humanStrokes === 5) {
        paletteControl.hidden = false;
        status.textContent = 'Colors unlocked. Choose an ink color.';
      }
    }
    active = null;
    host.classList.remove('drawing-active');
    escapeAttempts = 0;
    beyondCanvas = false;
    if (document.documentElement.hasPointerCapture(event.pointerId)) document.documentElement.releasePointerCapture(event.pointerId);
  }
  document.addEventListener('pointerup', finish);
  document.addEventListener('pointercancel', finish);
  document.addEventListener('lostpointercapture', finish);

  function clearDrawing() {
    strokes = [];
    restoreCanvas();
    completedDrawings = 0;
    status.textContent = 'A fresh start.';
    owned = false;
    idleDelay = 3000;
    queueDemo();
  }

  function saveDrawing() {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', ns);
    clone.setAttribute('viewBox', '0 0 512 288');
    clone.setAttribute('width', '1024');
    clone.setAttribute('height', '576');
    clone.removeAttribute('aria-label');
    clone.removeAttribute('role');
    clone.removeAttribute('style');

    const sourceNodes = [svg, ...svg.querySelectorAll('*')];
    const cloneNodes = [clone, ...clone.querySelectorAll('*')];
    sourceNodes.forEach((source, index) => {
      const target = cloneNodes[index];
      const style = getComputedStyle(source);
      if (style.color) target.style.color = style.color;
      if (style.fill && style.fill !== 'none') target.style.fill = style.fill;
      if (style.stroke && style.stroke !== 'none') target.style.stroke = style.stroke;
      if (style.opacity !== '1') target.style.opacity = style.opacity;
    });

    const background = document.createElementNS(ns, 'rect');
    background.setAttribute('width', '512');
    background.setAttribute('height', '288');
    background.setAttribute('fill', getComputedStyle(surface).backgroundColor);
    clone.insertBefore(background, clone.firstChild);

    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 576;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(png => {
        if (!png) return;
        const downloadUrl = URL.createObjectURL(png);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `scottlangille-drawing-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
        status.textContent = 'Drawing saved as a PNG.';
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      status.textContent = 'The drawing could not be saved.';
    };
    image.src = url;
  }

  host.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.color && humanStrokes >= 5) {
      selectedColor = button.dataset.color;
      restartClearCountdown();
      paletteControl.querySelectorAll('button').forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch.dataset.color === selectedColor)));
      return;
    }
    if (button.dataset.action === 'snapshot') {
      saveDrawing();
      return;
    }
    takeOver();
    active = null;
    if (button.dataset.action === 'undo') {
      const removed = strokes.pop();
      const undoEscape = escaped && (removed?.escapedCanvas || strokes.length === 0);
      if (undoEscape) restoreCanvas();
      status.textContent = undoEscape ? 'Last mark removed. Canvas restored.' : 'Last mark removed.';
      if (strokes.length === 0) clearDrawing();
    } else if (button.dataset.action === 'clear') {
      clearDrawing();
    }
    render();
  });
  render();
}
