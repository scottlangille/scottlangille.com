// Page-space placement: index the actual ink, including any radial copies.
const padding = 9;
function bounds(paths) {
  const points = paths.flat();
  return {
    left: Math.min(...points.map(p => p[0])) - padding,
    right: Math.max(...points.map(p => p[0])) + padding,
    top: Math.min(...points.map(p => p[1])) - padding,
    bottom: Math.max(...points.map(p => p[1])) + padding,
  };
}
function crosses(points, box) {
  return points.some((point, i) => {
    const from = points[Math.max(0, i - 1)];
    let enter = 0, exit = 1;
    for (const [axis, min, max] of [[0, box.left, box.right], [1, box.top, box.bottom]]) {
      const delta = point[axis] - from[axis];
      if (Math.abs(delta) < 1e-9) {
        if (from[axis] < min || from[axis] > max) return false;
      } else {
        const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
        if (enter > exit) return false;
      }
    }
    return true;
  });
}
function samples(paths) {
  return paths.flatMap(points => points.flatMap(([x,y], i) => {
    const [px,py] = points[Math.max(0, i-1)];
    const count = Math.max(1, Math.ceil(Math.hypot(x-px,y-py)/5));
    return Array.from({length:count}, (_,j) => {
      const t = (j+1)/count;
      return [px+(x-px)*t, py+(y-py)*t];
    });
  }));
}
export function pageInk(strokes) {
  const ink = [], regions = [], cells = new Map(), radius = 12;
  const key = (x,y) => `${x},${y}`;
  function add(paths, writing = false) {
    ink.push(...paths);
    for (const [x,y] of samples(paths)) {
      const cell = key(Math.floor(x/radius), Math.floor(y/radius));
      if (!cells.has(cell)) cells.set(cell, []);
      cells.get(cell).push([x,y]);
    }
    if (writing) regions.push(bounds(paths));
  }
  const words = new Map();
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    for (let copy=0; copy<(stroke.single ? 1 : 8); copy++) {
      const angle = copy*Math.PI/4, c = Math.cos(angle), s = Math.sin(angle);
      const points = stroke.map(([x,y]) => [256+(x-256)*c-(y-144)*s,144+(x-256)*s+(y-144)*c]);
      add([points]);
      if (stroke.writing) {
        if (!words.has(stroke.writing)) words.set(stroke.writing, new Map());
        const copies = words.get(stroke.writing);
        if (!copies.has(copy)) copies.set(copy, []);
        copies.get(copy).push(points);
      }
    }
  }
  for (const copies of words.values()) for (const paths of copies.values()) regions.push(bounds(paths));
  return {
    add,
    fits(paths, writing) {
      if (regions.some(box => paths.some(points => crosses(points, box)))) return false;
      if (!writing) return true;
      const box = bounds(paths);
      // A new message cannot enclose ink or another message either.
      return !ink.some(points => crosses(points, box)) && !regions.some(other =>
        box.left <= other.right && box.right >= other.left && box.top <= other.bottom && box.bottom >= other.top);
    },
    crowding(paths) {
      const points = samples(paths);
      let total = 0;
      for (const [x,y] of points) {
        const cx = Math.floor(x/radius), cy = Math.floor(y/radius);
        let pressure = 0;
        for (let dx=-1; dx<=1; dx++) for (let dy=-1; dy<=1; dy++) {
          for (const [px,py] of cells.get(key(cx+dx,cy+dy)) || []) {
            pressure = Math.max(pressure, 1-Math.hypot(x-px,y-py)/radius);
          }
        }
        total += pressure*pressure;
      }
      return total/Math.max(1,points.length);
    },
  };
}
