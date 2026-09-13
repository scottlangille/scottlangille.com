// Editable gesture vocabulary. Local coordinates; each point is [x, y, travel ms].
// A gesture can contain several pen strokes, each with its own pen-up pause.
export const gestures = {
  letter_A: [
    [0, [[0,3,0],[2,-17,140],[7,-38,160],[11,-54,190],[14,-41,130],[21,-20,135],[28,1,140]]],
    [65, [[4,-17,0],[12,-18,85],[22,-17,105]]],
  ],
  letter_s: [[0, [[15,-21,0],[10,-24,100],[4,-22,85],[2,-17,90],[7,-13,80],[12,-10,70],[15,-5,85],[12,0,100],[6,1,90],[1,-2,85]]]],
  letter_t: [
    [0, [[9,-44,0],[8,-29,130],[9,-13,140],[12,-2,100],[16,2,85],[20,-4,100]]],
    [60, [[0,-21,0],[11,-22,90],[20,-22,85]]],
  ],
  letter_r: [[0, [[2,1,0],[2,-12,120],[3,-23,130],[3,-13,100],[7,-21,90],[13,-25,95],[19,-24,100]]]],
  letter_a: [[0, [[17,-21,0],[11,-24,105],[5,-21,90],[1,-13,90],[3,-4,100],[9,-1,85],[15,-8,100],[18,-23,140],[17,-10,130],[20,0,110],[26,4,80],[33,1,100]]]],
  // Small, deliberately uneven doodles with a slower turn and a quicker finish.
  heart: [[0, [[0,-7,0],[-5,-14,130],[-12,-16,90],[-18,-12,85],[-20,-5,105],[-17,3,95],[-10,11,75],[1,21,90],[9,13,75],[17,4,80],[21,-5,100],[19,-12,115],[13,-16,90],[7,-14,100],[1,-7,140]]]],
  // A lopsided pen doodle: tall leaning tip, cramped left arm, long right arm.
  star: [[0, [[5,-29,0],[-2,-12,85],[-10,5,55],[-19,17,65],[-5,10,45],[12,1,50],[29,-4,70],[13,-5,45],[-3,-7,50],[-14,-9,80],[-8,1,45],[2,14,50],[9,25,75],[10,10,50],[8,-9,60],[6,-27,105],[4,-32,40]]]],
  flower: [
    [0, [[0,-3,0],[-7,-12,120],[-6,-20,105],[0,-23,85],[6,-19,90],[5,-8,125],[3,-2,80],[12,-9,90],[20,-7,100],[23,-1,85],[18,5,105],[7,4,110],[3,2,80],[11,12,85],[10,20,105],[4,23,90],[-2,17,105],[-2,6,120],[-3,2,80],[-12,10,85],[-20,8,95],[-22,2,100],[-17,-4,90],[-7,-3,115],[0,-3,100]]],
    [65, [[-3,-1,0],[-1,-4,80],[3,-3,65],[5,1,75],[1,4,85],[-3,2,70],[-3,-1,90]]],
  ],
  scratch: [[0, [[0,0,0],[7,-3,90],[3,2,65],[13,-2,55],[8,4,70],[18,1,60]]]],
  loop: [[0, [[-13,2,0],[-12,-8,170],[-3,-14,110],[9,-11,95],[15,-1,100],[11,10,100],[0,15,115],[-11,10,120],[-14,1,145],[-10,-5,100]]]],
  zigzag: [[0, [[0,0,0],[15,-8,160],[17,-24,190],[37,-21,95],[44,-40,130],[64,-34,100],[73,-53,125]]]],
  sweep: [[0, [[0,0,0],[5,-2,200],[17,-9,140],[48,-18,90],[92,-34,120],[138,-41,105]]]],
  hook: [[0, [[0,0,0],[2,15,160],[8,30,145],[18,43,115],[31,52,95],[46,58,100],[62,60,125]]]],
  wander: [[0, [[0,0,0],[9,4,120],[20,5,85],[34,2,90],[45,-5,105],[53,-16,115],[58,-30,130],[64,-42,115],[74,-49,95],[87,-51,85],[100,-47,90],[112,-38,95],[121,-25,115],[128,-9,120],[135,8,125],[145,22,100],[159,29,90],[176,30,80],[194,28,85],[213,25,90],[232,24,90],[248,28,110]]]],
  scribble: [[0, [[0,0,0],[7,-7,95],[14,1,70],[4,9,65],[-5,1,65],[2,-10,75],[13,-5,65],[11,9,60],[-1,12,70],[-7,0,65],[4,-5,80],[8,4,90]]]],
  hatch: [
    [0, [[0,0,0],[19,12,105]]],
    [75, [[0,6,0],[18,18,90]]],
    [65, [[-1,12,0],[15,23,85]]],
    [80, [[0,19,0],[10,26,80]]],
  ],
};

// The whole name is one reusable gesture, assembled from editable letter strokes.
// Center and normalize it to roughly the same footprint as the other marks.
gestures.astra = [['A',0],['s',36],['t',60],['r',87],['a',113]].flatMap(([letter,offset]) =>
  gestures[`letter_${letter}`].map(([pause,points],i) => [
    i === 0 ? 90 : pause,
    points.map(([x,y,ms]) => [(x+offset-73)*.4,(y+26)*.4,ms]),
  ]));

// Keep one shape variation stable through placement retries and text-bound checks.
// A smooth spatial warp preserves shared endpoints and gives the whole doodle
// different proportions, rather than sprinkling noise on the finished line.
function varyGesture(source, seed, writing, heart) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state,1664525)+1013904223) >>> 0;
    return state/4294967296;
  };
  const signed = () => random()*2-1;
  const all = source.flatMap(([,points]) => points);
  const xs=all.map(p=>p[0]), ys=all.map(p=>p[1]);
  const left=Math.min(...xs), top=Math.min(...ys);
  const width=Math.max(8,Math.max(...xs)-left), height=Math.max(8,Math.max(...ys)-top);
  const amount=writing ? .025 : heart ? .025+random()*.035 : .12+random()*.16;
  const bendX=signed(), bendY=signed(), shear=signed();
  const phaseX=random()*Math.PI*2, phaseY=random()*Math.PI*2;
  const frequencyX=1.5+random()*3, frequencyY=1.5+random()*3;
  return source.map(([lift,points]) => {
    const pace=.75+random()*.6;
    return [lift*(.7+random()*.6),points.map(([x,y,ms]) => {
      const u=(x-left)/width-.5, v=(y-top)/height-.5;
      return [
        x+width*amount*(bendX*Math.sin(v*frequencyX+phaseX)+shear*v+.35*Math.sin(u*4+phaseY)),
        y+height*amount*(bendY*Math.sin(u*frequencyY+phaseY)+.4*Math.sin(v*4+phaseX)),
        ms*pace*(.85+random()*.3),
      ];
    })];
  });
}

// Reuse any gesture in any routine. Speed > 1 is faster; hesitation scales
// slow, deliberate segments separately. Mirroring uses negative scale values.
export function compileRoutine(steps) {
  return steps.flatMap(({
    gesture, at = [0,0], scale = [1,1], angle = 0,
    speed = 1, hesitation = 1, pause = 0, reverse = false, variant,
  }) => {
    let source = gestures[gesture];
    if (!source) throw new Error(`Unknown drawing gesture: ${gesture}`);
    if (variant !== undefined) source = varyGesture(source,variant,
      gesture === 'astra' || gesture.startsWith('letter_') || gesture.startsWith('phrase_'), gesture === 'heart');
    const [sx,sy] = Array.isArray(scale) ? scale : [scale,scale];
    return source.map(([lift, points], strokeIndex) => {
      // Reversed travel times belong to the segment traversed, not its old endpoint.
      const ordered = reverse ? points.slice().reverse().map((p,i) =>
        [p[0],p[1],i ? points[points.length-i][2] : 0]) : points;
      return [lift / speed + (strokeIndex === 0 ? pause : 0), ordered.map(([x,y,ms]) => {
        x *= sx; y *= sy;
        return [at[0] + x*Math.cos(angle)-y*Math.sin(angle),
          at[1] + x*Math.sin(angle)+y*Math.cos(angle),
          ms / speed * (ms >= 140 ? hesitation : 1)];
      })];
    });
  });
}
