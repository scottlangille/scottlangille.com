import { gestures, compileRoutine } from './drawing-gestures.js';
import { phraseNames } from './drawing-phrases.js';

// Composition rules authored for this site. Runtime variation is local, not AI inference.
// To write a fixed routine, pass steps directly to compileRoutine:
// [{ gesture: 'loop', at: [24, 8], scale: 1.2, speed: .7 },
//  { gesture: 'sweep', at: [28, 10], angle: -.4, speed: 1.8, pause: 850 }]
const choose = values => values[Math.floor(Math.random() * values.length)];
const between = (a,b) => a + Math.random() * (b-a);
const clamp = (value,a,b) => Math.max(a, Math.min(b,value));
const names = Object.keys(gestures).filter(name => !name.startsWith('letter_') && !name.startsWith('phrase_') && name !== 'astra');
// Decorative doodles have one-third the selection weight of ordinary marks.
const gesturePool = names.flatMap(name => ['heart','star','flower'].includes(name) ? [name] : [name,name,name]);
// Spatial preferences influence placement without prescribing a gesture sequence.
function placeMark(preference) {
  if (Math.random() < .25) preference = 'anywhere';
  if (preference === 'outward') return [between(-16,16),between(-16,16)];
  if (preference === 'outer') {
    const side = choose([-1,1]);
    return [side*between(110,232),between(-120,120)];
  }
  if (preference === 'corners') return [choose([-1,1])*between(190,232),choose([-1,1])*between(85,120)];
  return [between(-232,232),between(-120,120)];
}

export function composeSteps() {
  const preference = choose(['anywhere','anywhere','outer','corners','outward']);
  const count = Math.random() < .25 ? Math.floor(between(1,4)) : Math.floor(between(4,13));
  const steps = [];
  for (let i = 0; i < count; i++) {
    // Every ordinary gesture is eligible at every position, including the beginning/end.
    const step = {
      gesture: choose(gesturePool),
      at: placeMark(preference),
      scale: [between(.35,2.1),between(.35,2.1)],
      angle: between(-Math.PI,Math.PI),
      speed: between(.65,2.4), hesitation: between(.75,1.8),
      pause: between(35,220), reverse: Math.random() < .25,
    };
    if (steps.length) {
      const earlier = choose(steps);
      const previous = steps[steps.length-1];
      const relation = Math.random();
      if (relation < .15) {
        // Optional echo. Repeated echoes and repeated interruptions are allowed.
        step.gesture = previous.gesture;
        step.at = [previous.at[0]+between(-18,18),previous.at[1]+between(-18,18)];
        step.scale = previous.scale.map(size => size*between(.65,1.3));
        step.angle = previous.angle+between(-.35,.35);
        step.speed = previous.speed*between(.8,1.35);
      } else if (relation < .3) {
        // Revisit any earlier mark with any gesture, not a prescribed detail shape.
        step.at = [earlier.at[0]+between(-25,25),earlier.at[1]+between(-25,25)];
        step.scale = [between(.3,.95),between(.3,.95)];
      } else if (relation < .45) {
        // Contrast in scale and direction, with the gesture choice left open.
        step.at = [earlier.at[0]+between(-20,20),earlier.at[1]+between(-20,20)];
        step.angle = earlier.angle+between(1,2.5);
        step.scale = [between(1.4,2.6),between(.6,1.7)];
        step.speed = between(1.4,2.5);
      }
      // The other 55% of marks follow their own placement, shape and timing.
    }
    step.at = [clamp(step.at[0],-235,235),clamp(step.at[1],-125,125)];
    step.scale = step.scale.map(size => clamp(size,.25,2.6));
    if (step.gesture === 'heart') {
      const size = Math.sqrt(step.scale[0]*step.scale[1]);
      step.scale = [size*between(.92,1.08),size];
    }
    step.speed = clamp(step.speed,.6,2.8);
    steps.push(step);
  }
  return steps;
}

const isWriting = step => step.gesture === 'astra' || step.gesture.startsWith('letter_') || step.gesture.startsWith('phrase_');

function writingBounds(steps) {
  return steps.filter(isWriting).flatMap(step => {
    const angle = step.angle || 0;
    const points = compileRoutine([step]).flatMap(([,points]) => points).map(([x,y]) =>
      [x*Math.cos(angle)+y*Math.sin(angle), -x*Math.sin(angle)+y*Math.cos(angle)]);
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    // Reserve the whole message, plus breathing room and the playback pen jitter.
    return Array.from({length:8}, (_,i) => ({
      angle: angle+i*Math.PI/4,
      left: Math.min(...xs)-8, right: Math.max(...xs)+8,
      top: Math.min(...ys)-8, bottom: Math.max(...ys)+8,
    }));
  });
}

function crossesWriting(paths, regions) {
  return regions.some(region => paths.some(([,points]) => {
    const local = points.map(([x,y]) => [
      x*Math.cos(region.angle)+y*Math.sin(region.angle),
      -x*Math.sin(region.angle)+y*Math.cos(region.angle),
    ]);
    // Segment/rectangle intersection also catches long strokes crossing between waypoints.
    return local.some((point,i) => {
      const from = local[Math.max(0,i-1)];
      let enter = 0, exit = 1;
      for (const [axis,min,max] of [[0,region.left,region.right],[1,region.top,region.bottom]]) {
        const delta = point[axis]-from[axis];
        if (Math.abs(delta)<1e-9) {
          if (from[axis]<min || from[axis]>max) return false;
        } else {
          const a = (min-from[axis])/delta, b = (max-from[axis])/delta;
          enter = Math.max(enter,Math.min(a,b));
          exit = Math.min(exit,Math.max(a,b));
          if (enter>exit) return false;
        }
      }
      return true;
    });
  }));
}

function regionOutline(region) {
  const {left,right,top,bottom,angle} = region;
  return [[left,top],[right,top],[right,bottom],[left,bottom],[left,top]].map(([x,y]) =>
    [x*Math.cos(angle)-y*Math.sin(angle), x*Math.sin(angle)+y*Math.cos(angle)]);
}

function writingFits(candidate, reserved) {
  const copies = writingBounds([candidate]);
  const base = copies[0];
  // Compare complete padded text boxes, including containment and rotated copies.
  const others = [...reserved,...copies.slice(1)];
  return !crossesWriting([[0,regionOutline(base)]],others) &&
    !others.some(region => crossesWriting([[0,regionOutline(region)]],[base]));
}

// A soft proximity field for ordinary ink. Sampling whole segments prevents a
// fast, long stroke from slipping through the space between authored waypoints.
function inkSamples(paths) {
  return paths.flatMap(([,points]) => points.flatMap(([x,y],i) => {
    const [px,py] = points[Math.max(0,i-1)];
    const count = Math.max(1,Math.ceil(Math.hypot(x-px,y-py)/5));
    return Array.from({length:count},(_,j) => {
      const t = (j+1)/count;
      return [px+(x-px)*t,py+(y-py)*t];
    });
  }));
}

function inkField() {
  const cells = new Map(), radius = 12;
  const key = (x,y) => `${x},${y}`;
  return {
    crowding(paths) {
      const samples = inkSamples(paths);
      let total = 0;
      for (const [x,y] of samples) {
        const cx = Math.floor(x/radius), cy = Math.floor(y/radius);
        let pressure = 0;
        for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) {
          for (const [px,py] of cells.get(key(cx+dx,cy+dy)) || []) {
            pressure = Math.max(pressure,Math.max(0,1-Math.hypot(x-px,y-py)/radius));
          }
        }
        total += pressure*pressure;
      }
      return total/Math.max(1,samples.length);
    },
    add(paths) {
      for (const [x,y] of inkSamples(paths)) for (let i=0;i<8;i++) {
        const angle=i*Math.PI/4;
        const px=x*Math.cos(angle)-y*Math.sin(angle), py=x*Math.sin(angle)+y*Math.cos(angle);
        const cell=key(Math.floor(px/radius),Math.floor(py/radius));
        if (!cells.has(cell)) cells.set(cell,[]);
        cells.get(cell).push([px,py]);
      }
    },
  };
}

export function composeScore() {
  const steps = composeSteps();
  // Independent 1-in-15 chance for the incidental Astra handwriting.
  if (Math.random() < 1/15) {
    const index = Math.floor(between(0, steps.length));
    const nearby = steps[index];
    steps.splice(index, 0, {
      gesture: 'astra',
      at: [clamp(nearby.at[0] + 6, -215, 215), clamp(nearby.at[1] + 5, -112, 112)],
      scale: [between(.45,.6), between(.45,.55)],
      angle: nearby.angle + between(-.25,.25),
      speed: between(2.3,3), hesitation: .8, pause: 40,
    });
  }
  // Each phrase has its own independent 1-in-15 chance per drawing.
  for (const phrase of phraseNames) {
    if (Math.random() >= 1/15) continue;
    const index = Math.floor(between(0,steps.length));
    const nearby = steps[index];
    steps.splice(index,0, {
      gesture: phrase,
      at: [clamp(nearby.at[0],-160,160),clamp(nearby.at[1],-75,75)],
      scale: [.48,.48], angle: between(-.5,.5),
      speed: between(2.3,2.8), hesitation: .85, pause: 50,
    });
  }
  // A fresh deformation for every occurrence, retained during placement retries.
  for (const step of steps) step.variant = Math.floor(Math.random()*4294967296);
  const reserved = [];
  const placedSteps = steps.flatMap(step => {
    if (!isWriting(step)) return [step];
    let candidate = step;
    for (let attempt=0; !writingFits(candidate,reserved); attempt++) {
      if (attempt===80) return []; // Never draw a message over another message.
      candidate = {...step, at: [between(-190,190),between(-95,95)],
        angle: between(-.5,.5)};
    }
    reserved.push(...writingBounds([candidate]));
    return [candidate];
  });
  const regions = reserved;
  const ink = inkField();
  const score = placedSteps.flatMap((step,index) => {
    const writing = isWriting(step);
    let candidate = step;
    let paths = compileRoutine([candidate]);
    // All eight writing copies are reserved before any artwork is placed. Since
    // that set is radial, checking the base stroke also protects its eight copies.
    for (let attempt=0; !writing && crossesWriting(paths,regions); attempt++) {
      if (attempt===32) return []; // Omit an unfittable gesture intact, never clip it.
      candidate = {...step, at: placeMark('anywhere'), angle: between(-Math.PI,Math.PI),
        scale: step.scale.map(size => size * (attempt<16 ? 1 : .6))};
      paths = compileRoutine([candidate]);
    }
    if (!writing) {
      let best = ink.crowding(paths);
      // Nudge the whole gesture, preserving its hand-drawn shape. A little
      // crowding is welcome; this is a preference, not another exclusion zone.
      for (let attempt=0; attempt<10 && best>.035; attempt++) {
        const reach = 18+attempt*7;
        const option = {...candidate,
          at: [clamp(candidate.at[0]+between(-reach,reach),-235,235),
               clamp(candidate.at[1]+between(-reach,reach),-125,125)],
          angle: candidate.angle+between(-.45,.45)};
        const proposed = compileRoutine([option]);
        if (crossesWriting(proposed,regions)) continue;
        const pressure = ink.crowding(proposed);
        if (pressure<best) { paths=proposed; best=pressure; }
      }
      ink.add(paths);
    }
    return paths.map(([pause,points]) => [pause,points,
      writing ? {id:index,angle:step.angle || 0} : null, index]);
  });
  // Radial copies rotate the handwriting; never reflect the actual letterforms.
  score.allowReflection = !steps.some(step => step.gesture === 'astra' || step.gesture.startsWith('letter_') || step.gesture.startsWith('phrase_'));
  return score;
}
