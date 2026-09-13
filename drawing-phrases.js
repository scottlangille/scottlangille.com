import { gestures } from './drawing-gestures.js';

// Extra pen-drawn letters for page phrases and Scott's approved variations.
// Kept out of the ordinary gesture pool; only complete phrases get registered.
const letters = {
  u: [[0, [[2,-23,0],[1,-10,120],[3,-2,100],[9,1,95],[16,-5,105],[19,-23,135],[18,-8,115],[21,1,100],[26,0,80]]]],
  w: [[0, [[0,-23,0],[4,-1,130],[10,-16,120],[16,0,120],[22,-24,140]]]],
  h: [[0, [[2,0,0],[3,-43,180],[3,-12,170],[9,-23,105],[16,-22,100],[19,-14,100],[20,1,115]]]],
  e: [[0, [[1,-12,0],[16,-14,110],[13,-23,105],[6,-24,90],[0,-17,100],[1,-7,105],[8,0,100],[18,-3,100]]]],
  c: [[0, [[18,-21,0],[10,-25,105],[3,-20,100],[0,-10,115],[5,-1,115],[15,0,95],[20,-4,95]]]],
  n: [[0, [[1,0,0],[2,-23,150],[3,-13,100],[9,-23,100],[16,-22,100],[20,-14,100],[20,1,115]]]],
  i: [[0, [[4,-23,0],[3,0,140],[8,1,80]]], [60, [[5,-33,0],[5.2,-33.2,60]]]],
  m: [[0, [[1,0,0],[1,-23,135],[3,-13,95],[8,-24,100],[13,-21,100],[14,0,140],[14,-13,110],[20,-23,105],[26,-20,100],[28,1,145]]]],
  g: [[0, [[18,-22,0],[10,-25,110],[3,-20,100],[1,-10,110],[6,-3,100],[14,-5,100],[19,-23,130],[18,3,150],[14,18,130],[5,22,105],[-2,16,100]]]],
  f: [[0, [[18,-40,0],[12,-45,115],[7,-39,120],[5,-21,145],[3,3,145],[0,13,110]]], [55, [[0,-22,0],[18,-23,115]]]],
  d: [[0, [[19,-22,0],[10,-25,110],[2,-18,110],[1,-7,110],[7,0,100],[16,-6,110],[20,-24,130],[22,-44,145],[21,-17,150],[21,0,115],[26,2,80]]]],
};

export const phraseNames = ['phrase_imagine', 'phrase_friend'];
const phrases = ['what can we imagine', 'hug a friend'];
phrases.forEach((phrase,index) => {
  let cursor = 0;
  const strokes = [];
  for (const character of phrase) {
    if (character === ' ') { cursor += 14; continue; }
    const glyph = letters[character] || gestures[`letter_${character}`];
    const width = Math.max(...glyph.flatMap(([,points]) => points.map(([x]) => x)));
    for (const [pause,points] of glyph) {
      strokes.push([pause || 55, points.map(([x,y,ms]) => [x+cursor,y,ms*.65])]);
    }
    cursor += width+6;
  }
  const scale = Math.min(.65, 235/cursor);
  gestures[phraseNames[index]] = strokes.map(([pause,points]) => [pause,
    points.map(([x,y,ms]) => [(x-cursor/2)*scale,(y+14)*scale,ms])]);
});
