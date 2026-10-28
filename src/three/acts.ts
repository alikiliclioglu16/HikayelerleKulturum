import { PUT_DOWN, RELAXED, clonePose, type Key, type Pose, type RootState, type State } from './performer';

/**
 * Small, readable actions for the story characters. Each act starts from the character's state when it
 * begins and returns timed keys; nothing loops, so a character only moves when the story says so.
 * Angles are degrees about the model's own axes (see performer.ts).
 */

export interface Beat {
  /** Word stems (lower case) that start this beat when the narration reaches them, e.g. ["uyand", "günaydın"]. */
  cue?: string[];
  /** Skip the beat when none of its cue words is in the text of the chosen reading level. */
  optional?: boolean;
  who: string;
  do: string;
  /** What to look at while (and after) acting: another character's id, a named spot, "reader" or null. */
  look?: string | null;
  /** Spot or character the act is about (for lookAt, point, walkTo …). */
  target?: string;
  /** Root offsets to move to: [x, y, z] in page widths from the character's start place. */
  to?: [number, number, number];
  /** Turn (degrees) to end in. */
  face?: number;
  /** The camera leans towards this character. */
  focus?: boolean;
  /** Seconds the act lasts (for talk and hold). */
  len?: number;
  /** Seconds to wait after the cue before starting (e.g. sprouts coming up one after another). */
  wait?: number;
}

export interface ActResult {
  keys: Key[];
  dur: number;
}

type Act = (s: State, b: Beat, t: number) => ActResult;

const merge = (...p: Pose[]): Pose => Object.assign({}, ...p.map(clonePose));

/** Standing straight with the arms down: every bone an act may bend is set, so nothing stays bent afterwards. */
const NEUTRAL: Pose = {
  spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  hand_L: [0, 0, 0], hand_R: [0, 0, 0],
  thigh_L: [0, 0, 0], thigh_R: [0, 0, 0], shin_L: [0, 0, 0], shin_R: [0, 0, 0],
  ...RELAXED,
};
const key = (t: number, dur: number, k: Partial<Key>): Key => ({ t, dur, ...k });

/* ---------------- poses ---------------- */

export const POSES: Record<string, Pose> = {
  stand: RELAXED,
  lying: { upper_arm_L: [0, 0, -40], upper_arm_R: [0, 0, 40], forearm_L: [-8, 0, 0], forearm_R: [-8, 0, 0] },
  sitBed: {
    spine: [46, 0, 0], chest: [30, 0, 0], neck: [4, 0, 0], head: [-6, 0, 0],
    upper_arm_L: [-28, 0, -26], upper_arm_R: [-28, 0, 26], forearm_L: [-40, 0, 0], forearm_R: [-40, 0, 0],
  },
  stretchBed: {
    spine: [48, 0, 0], chest: [30, 0, 0], neck: [-4, 0, 0], head: [-14, 0, 0],
    upper_arm_L: [4, 0, 108], upper_arm_R: [4, 0, -108], forearm_L: [0, 0, 26], forearm_R: [0, 0, -26],
  },
  cheer: {
    spine: [0, 0, 0], chest: [-6, 0, 0], head: [-8, 0, 0],
    upper_arm_L: [-8, 0, 112], upper_arm_R: [-8, 0, -112], forearm_L: [0, 0, 18], forearm_R: [0, 0, -18],
  },
  handsTogether: { upper_arm_L: [-35, 0, -36], upper_arm_R: [-35, 0, 36], forearm_L: [-60, -30, 0], forearm_R: [-60, 30, 0] },
  offerHand: { upper_arm_R: [-34, 0, 20], forearm_R: [-30, 0, 0], hand_R: [0, 0, 0] },
  bow: { spine: [18, 0, 0], chest: [12, 0, 0], head: [12, 0, 0] },
  hold: { upper_arm_L: [-40, 0, -30], upper_arm_R: [-40, 0, 30], forearm_L: [-70, 0, 0], forearm_R: [-70, 0, 0] },
  hug: { upper_arm_L: [-60, 0, -10], upper_arm_R: [-60, 0, 10], forearm_L: [-30, -70, 0], forearm_R: [-30, 70, 0], spine: [8, 0, 0] },
};

/* ---------------- acts ---------------- */

const ACTS: Record<string, Act> = {
  /** Asleep in bed: eyes closed, lying on the back. */
  sleep: (_s, _b, t) => ({ keys: [key(t, 0.01, { pose: merge(POSES.lying), eyes: 0, root: { lie: 1 } })], dur: 0.01 }),

  /** Opens the eyes (with a sleepy blink), sits up in bed and stretches. */
  wake: (s, b, t) => {
    const keys: Key[] = [
      key(t, 0.5, { eyes: 0.55 }),
      key(t + 0.55, 0.18, { eyes: 0.15 }),
      key(t + 0.8, 0.4, { eyes: 1, look: b.look ?? 'up' }),
      key(t + 1.2, 1.3, { pose: merge(s.pose, POSES.sitBed) }),
      key(t + 2.6, 0.8, { pose: merge(POSES.sitBed, POSES.stretchBed) }),
      key(t + 3.8, 0.8, { pose: merge(POSES.stretchBed, POSES.sitBed) }),
    ];
    return { keys, dur: 4.6 };
  },

  /** Looks at something (a spot, another character or the reader) and stays looking. */
  lookAt: (_s, b, t) => ({ keys: [key(t, 0.6, { look: b.target ?? b.look ?? 'reader' })], dur: (b.len ?? 1.4) }),

  /** Looks around happily: towards the window (or a target), to the other side, then at the reader. */
  lookAround: (_s, b, t) => ({
    keys: [
      key(t, 0.6, { look: b.target ?? 'left' }),
      key(t + 1.0, 0.5, { look: 'right' }),
      key(t + 1.8, 0.5, { look: 'reader' }),
    ],
    dur: 2.4,
  }),

  /** A happy cheer: both arms up, a little bounce on the feet (or in bed), then arms down. */
  cheer: (s, b, t) => {
    const inBed = s.root.lie > 0.5;
    const up = inBed ? merge(s.pose, POSES.stretchBed, { head: [-10, 0, 0] }) : merge(s.pose, POSES.cheer);
    const keys: Key[] = [key(t, 0.45, { pose: up, look: b.look ?? 'reader' })];
    if (!inBed) {
      keys.push(key(t + 0.45, 0.22, { root: { y: s.root.y + 0.03 }, minor: true }), key(t + 0.67, 0.22, { root: { y: s.root.y }, minor: true }));
    }
    keys.push(key(t + 1.3, 0.6, { pose: merge(up, inBed ? POSES.sitBed : RELAXED) }));
    return { keys, dur: 1.9 };
  },

  /** Gets out of bed in one happy jump and lands standing beside it. */
  hopOut: (s, b, t) => {
    const to = b.to ?? [0, -0.1, 0.18];
    const mid: Partial<RootState> = { x: (s.root.x + to[0]) / 2, y: Math.max(s.root.y, to[1]) + 0.07, z: (s.root.z + to[2]) / 2, lie: 0.35 };
    const end: Partial<RootState> = { x: to[0], y: to[1], z: to[2], lie: 0, rotY: b.face ?? 0 };
    return {
      keys: [
        key(t, 0.35, { pose: merge(s.pose, { spine: [10, 0, 0], chest: [6, 0, 0] }) }),
        key(t + 0.3, 0.45, { minor: true, root: mid, pose: merge(NEUTRAL, { thigh_L: [-40, 0, 0], thigh_R: [-30, 0, 0], shin_L: [50, 0, 0], shin_R: [40, 0, 0] }) }),
        key(t + 0.75, 0.4, { root: end, pose: merge(POSES.cheer, { thigh_L: [-8, 0, 0], shin_L: [12, 0, 0] }), look: b.look ?? 'reader' }),
        key(t + 1.2, 0.25, { pose: merge(POSES.cheer, { thigh_L: [0, 0, 0], shin_L: [0, 0, 0], thigh_R: [0, 0, 0], shin_R: [0, 0, 0] }) }),
        key(t + 1.9, 0.6, { pose: merge(NEUTRAL, { thigh_L: [0, 0, 0], shin_L: [0, 0, 0], thigh_R: [0, 0, 0], shin_R: [0, 0, 0] }) }),
      ],
      dur: 2.5,
    };
  },

  /** Waves with the right hand (three times), looking at the target. */
  wave: (s, b, t) => {
    const up = merge(s.pose, { upper_arm_R: [-10, 0, -125], forearm_R: [0, 0, -20] });
    const keys: Key[] = [key(t, 0.4, { pose: up, look: b.look ?? b.target ?? 'reader' })];
    for (let i = 0; i < 3; i++) {
      keys.push(key(t + 0.4 + i * 0.5, 0.25, { pose: merge(up, { forearm_R: [0, 0, -45] }), minor: true }));
      keys.push(key(t + 0.65 + i * 0.5, 0.25, { pose: merge(up, { forearm_R: [0, 0, -5] }), minor: true }));
    }
    keys.push(key(t + 2.0, 0.5, { pose: merge(s.pose) }));
    return { keys, dur: 2.5 };
  },

  /** Nods twice ("evet", "tamam"). */
  nod: (s, b, t) => {
    const head = s.pose.head ?? [0, 0, 0];
    const k: Key[] = [];
    for (let i = 0; i < 2; i++) {
      k.push(key(t + i * 0.5, 0.22, { pose: { head: [head[0] + 14, head[1], head[2]] }, look: b.look, minor: i > 0 }));
      k.push(key(t + 0.22 + i * 0.5, 0.22, { pose: { head } }));
    }
    return { keys: k, dur: 1.0 };
  },

  /** Speaks: steps a little forward, opens a hand towards the listener, small nods, then steps back. */
  talk: (s, b, t) => {
    const len = Math.max(1.6, b.len ?? 2.6);
    const fwd = 0.035;
    const rad = (s.root.rotY * Math.PI) / 180;
    const step: Partial<RootState> = { x: s.root.x + Math.sin(rad) * fwd, z: s.root.z + Math.cos(rad) * fwd };
    const open = merge(s.pose, { upper_arm_R: [-38, 0, 26], forearm_R: [-45, 20, 0], hand_R: [0, 0, -20] });
    const head = s.pose.head ?? [0, 0, 0];
    return {
      keys: [
        key(t, 0.5, { root: step, look: b.look ?? b.target ?? 'reader' }),
        key(t + 0.3, 0.5, { pose: open }),
        key(t + 0.9, 0.3, { pose: { head: [head[0] + 8, head[1], head[2]] }, minor: true }),
        key(t + 1.2, 0.3, { pose: { head }, minor: true }),
        key(t + len - 0.6, 0.6, { pose: merge(s.pose), root: { x: s.root.x, z: s.root.z } }),
      ],
      dur: len,
    };
  },

  /** Points at the target with the right arm. */
  point: (s, b, t) => {
    const len = b.len ?? 1.8;
    return {
      keys: [
        key(t, 0.45, { pose: merge(s.pose, { upper_arm_R: [-70, 0, 20], forearm_R: [-5, 0, 0] }), look: b.target ?? b.look ?? 'reader' }),
        key(t + len - 0.5, 0.5, { pose: merge(s.pose) }),
      ],
      dur: len,
    };
  },

  /** Knocks on a door: the right hand up in front, two knocks, hand down again. */
  knock: (s, b, t) => {
    const up = merge(s.pose, { upper_arm_R: [-72, 0, 16], forearm_R: [-70, 0, 0] });
    return {
      keys: [
        key(t, 0.4, { pose: up, look: b.target ?? b.look }),
        key(t + 0.45, 0.14, { pose: merge(up, { forearm_R: [-40, 0, 0] }), minor: true }),
        key(t + 0.6, 0.14, { pose: up, minor: true }),
        key(t + 0.78, 0.14, { pose: merge(up, { forearm_R: [-40, 0, 0] }), minor: true }),
        key(t + 0.93, 0.14, { pose: up, minor: true }),
        key(t + 1.2, 0.5, { pose: merge(s.pose) }),
      ],
      dur: 1.7,
    };
  },

  /** Turns to face a direction (degrees). */
  turn: (s, b, t) => ({ keys: [key(t, 0.7, { root: { rotY: b.face ?? 0 }, look: b.look ?? s.look })], dur: 0.7 }),

  /** Walks to a place: alternate steps, arms swinging, then stands still facing `face`. */
  walkTo: (s, b, t) => {
    const to = b.to ?? [s.root.x, s.root.y, s.root.z];
    const dx = to[0] - s.root.x;
    const dz = to[2] - s.root.z;
    const dist = Math.hypot(dx, dz);
    const dir = (Math.atan2(dx, dz) * 180) / Math.PI;
    const steps = Math.max(2, Math.round(dist / 0.045));
    const stepT = 0.38;
    const keys: Key[] = [key(t, 0.35, { root: { rotY: dir } })];
    const t0 = t + 0.3;
    for (let i = 0; i < steps; i++) {
      const l = i % 2 === 0;
      const sw = 22;
      keys.push(
        key(t0 + i * stepT, stepT, {
          minor: true,
          root: { x: s.root.x + (dx * (i + 1)) / steps, z: s.root.z + (dz * (i + 1)) / steps },
          pose: merge(NEUTRAL, {
            thigh_L: [l ? -sw : sw * 0.6, 0, 0], thigh_R: [l ? sw * 0.6 : -sw, 0, 0],
            shin_L: [l ? 10 : 25, 0, 0], shin_R: [l ? 25 : 10, 0, 0],
            upper_arm_L: [l ? 14 : -14, 0, -30], upper_arm_R: [l ? -14 : 14, 0, 30],
          }),
        }),
      );
    }
    const end = t0 + steps * stepT;
    keys.push(key(end, 0.4, { pose: merge(NEUTRAL), root: { x: to[0], z: to[2], rotY: b.face ?? dir }, look: b.look ?? s.look }));
    return { keys, dur: end - t + 0.4 };
  },

  /** Holds a hand out to be kissed (an elder at Bayram). */
  offerHand: (s, b, t) => {
    const len = b.len ?? 3.6;
    return {
      keys: [
        key(t, 0.6, { pose: merge(s.pose, POSES.offerHand), look: b.look ?? b.target }),
        key(t + len - 0.6, 0.6, { pose: merge(s.pose) }),
      ],
      dur: len,
    };
  },

  /**
   * Kisses an elder's hand the Turkish way: bows, takes the hand, kisses it, touches it to the forehead,
   * then stands up again.
   */
  kissHand: (s, b, t) => {
    const take = merge(s.pose, { upper_arm_R: [-62, 0, 14], forearm_R: [-40, 0, 0], upper_arm_L: [-50, 0, -18], forearm_L: [-55, 0, 0] });
    const kiss = merge(take, { spine: [24, 0, 0], chest: [16, 0, 0], head: [18, 0, 0] });
    const brow = merge(take, { spine: [30, 0, 0], chest: [20, 0, 0], head: [30, 0, 0] });
    return {
      keys: [
        key(t, 0.5, { pose: take, look: b.target ?? b.look }),
        key(t + 0.6, 0.6, { pose: kiss }),
        key(t + 1.5, 0.5, { pose: brow }),
        key(t + 2.4, 0.7, { pose: merge(NEUTRAL), look: b.target ?? b.look }),
      ],
      dur: 3.1,
    };
  },

  /** Turns once round on the spot to show new clothes, arms a little out. */
  twirl: (s, b, t) => {
    const r0 = s.root.rotY;
    const out = merge(s.pose, { upper_arm_L: [0, 0, -8], upper_arm_R: [0, 0, 8] });
    return {
      keys: [
        key(t, 0.3, { pose: out, look: null }),
        key(t + 0.2, 0.7, { root: { rotY: r0 + 180 } }),
        key(t + 0.9, 0.7, { root: { rotY: r0 + 360 } }),
        key(t + 1.6, 0.5, { pose: merge(s.pose), look: b.look ?? 'reader' }),
      ],
      dur: 2.1,
    };
  },

  /** Fixes someone's bow tie or collar: both hands forward and up to the other's neck, small adjustments. */
  fixBow: (s, b, t) => {
    const reach = merge(s.pose, {
      spine: [10, 0, 0], head: [14, 0, 0],
      upper_arm_L: [-62, 0, -14], upper_arm_R: [-62, 0, 14], forearm_L: [-40, -25, 0], forearm_R: [-40, 25, 0],
    });
    return {
      keys: [
        key(t, 0.6, { pose: reach, look: b.target }),
        key(t + 0.7, 0.3, { pose: merge(reach, { hand_L: [0, 0, 20], hand_R: [0, 0, -20] }) }),
        key(t + 1.0, 0.3, { pose: merge(reach, { hand_L: [0, 0, -10], hand_R: [0, 0, 10] }) }),
        key(t + 1.5, 0.6, { pose: merge(NEUTRAL), look: b.look ?? b.target }),
      ],
      dur: 2.1,
    };
  },

  /** Holds both hands out, palms up, to receive something; takes it (`target` names the thing). */
  receive: (s, b, t) => {
    const cup = merge(s.pose, { upper_arm_R: [-48, 0, 14], forearm_R: [-40, 0, 0], upper_arm_L: [-40, 0, -16], forearm_L: [-45, 0, 0] });
    return {
      keys: [
        key(t, 0.5, { pose: cup, look: b.look }),
        key(t + 0.9, 0.2, { hold: b.target ?? null }),
        key(t + 1.4, 0.6, { pose: merge(NEUTRAL, { upper_arm_R: [-20, 0, 26], forearm_R: [-60, 0, 0] }) }),
      ],
      dur: 2.0,
    };
  },

  /** Hands something over with the right hand; it leaves the hand halfway. With `target` it is taken out first. */
  give: (s, b, t) => ({
    keys: [
      // `target`: the thing is taken out first (e.g. harçlık from a pocket)
      ...(b.target ? [key(t, 0.05, { hold: b.target })] : []),
      key(t, 0.6, { pose: merge(s.pose, { upper_arm_R: [-46, 0, 16], forearm_R: [-24, 0, 0], spine: [6, 0, 0] }), look: b.look ?? b.target }),
      key(t + 0.9, 0.1, { hold: null }),
      key(t + 1.3, 0.6, { pose: merge(NEUTRAL) }),
    ],
    dur: 1.9,
  }),

  /** Holds the thing in the hands out to someone (offering lokum, showing a tray). */
  offer: (s, b, t) => {
    const len = b.len ?? 2.4;
    const out = merge(s.pose, { upper_arm_L: [-58, 0, -18], upper_arm_R: [-58, 0, 18], forearm_L: [-28, 0, 0], forearm_R: [-28, 0, 0], spine: [8, 0, 0] });
    return {
      keys: [key(t, 0.6, { pose: out, look: b.look ?? b.target }), key(t + len - 0.6, 0.6, { pose: merge(s.pose) })],
      dur: len,
    };
  },

  /** Puts the held thing down in front (on the table) and lets go. */
  put: (s, b, t) => ({
    keys: [
      key(t, 0.6, { pose: merge(s.pose, { spine: [22, 0, 0], chest: [10, 0, 0], head: [10, 0, 0] }), look: b.look ?? 'down' }),
      key(t + 0.7, 0.1, { hold: PUT_DOWN }),
      key(t + 0.9, 0.6, { pose: merge(NEUTRAL), look: b.look ?? null }),
    ],
    dur: 1.5,
  }),

  /** Blows a kiss: right hand to the lips, then out towards the target. */
  blowKiss: (s, b, t) => {
    const lips = merge(s.pose, { upper_arm_R: [-55, 0, 30], forearm_R: [-115, 0, 0], head: [4, 0, 0] });
    return {
      keys: [
        key(t, 0.5, { pose: lips, look: b.look ?? b.target ?? 'reader' }),
        key(t + 0.7, 0.4, { pose: merge(s.pose, { upper_arm_R: [-80, 0, 30], forearm_R: [-10, 0, 0] }) }),
        key(t + 1.5, 0.6, { pose: merge(s.pose) }),
      ],
      dur: 2.1,
    };
  },

  /** Kisses the top of a child's head (a mother's kiss), arms around the shoulders. */
  kissForehead: (s, b, t) => ({
    keys: [
      key(t, 0.6, { pose: merge(s.pose, POSES.hug, { spine: [20, 0, 0], chest: [14, 0, 0], head: [22, 0, 0] }), look: b.target }),
      key(t + 1.8, 0.7, { pose: merge(NEUTRAL), look: b.look ?? b.target }),
    ],
    dur: 2.5,
  }),

  /** Arms back to the sides and stands still. */
  rest: (_s, b, t) => ({ keys: [key(t, 0.6, { pose: merge(NEUTRAL), look: b.look ?? null })], dur: 0.6 }),

  /** Holds a pose by name for a while (e.g. "hold" a tray, "handsTogether"). */
  pose: (s, b, t) => ({ keys: [key(t, 0.6, { pose: merge(s.pose, POSES[b.target ?? 'stand'] ?? {}), look: b.look })], dur: b.len ?? 1 }),

  /** A gentle bow of respect. */
  bow: (s, b, t) => ({
    keys: [key(t, 0.5, { pose: merge(s.pose, POSES.bow), look: b.look }), key(t + 1.1, 0.5, { pose: merge(s.pose) })],
    dur: 1.6,
  }),

  /** A hug towards the target (arms open and close). */
  hug: (s, b, t) => ({
    keys: [key(t, 0.5, { pose: merge(s.pose, { upper_arm_L: [-40, 0, 50], upper_arm_R: [-40, 0, -50] }), look: b.target }), key(t + 0.6, 0.6, { pose: merge(s.pose, POSES.hug) }), key(t + 2.2, 0.6, { pose: merge(NEUTRAL) })],
    dur: 2.8,
  }),
};

/* ---------------- acts for magic things (PropActor) ---------------- */

export const THING_ACTS: Record<string, Act> = {
  /** Pops into view: swells past its size, glows brightly, sparkles, settles and keeps a soft glow. */
  appear: (_s, b, t) => {
    const k = b.len ?? 1;
    return {
      keys: [
        key(t, 0.45, { root: { show: 1.3, glow: 1.4 }, burst: k }),
        key(t + 0.45, 0.35, { root: { show: 0.92 } }),
        key(t + 0.8, 0.3, { root: { show: 1 } }),
        key(t + 1.1, 1.2, { root: { glow: 0.45 } }),
      ],
      dur: 1.1,
    };
  },
  /** Fades away (shrinks out of sight) with a last sparkle. */
  vanish: (_s, _b, t) => ({ keys: [key(t, 0.25, { root: { show: 1.12, glow: 1.2 }, burst: 0.6 }), key(t + 0.25, 0.5, { root: { show: 0, glow: 0 } })], dur: 0.75 }),
  /** Rises (or comes down) into its place (`to`, default where it stands), glowing, with a sparkle trail. */
  rise: (_s, b, t) => {
    const to = b.to ?? [0, 0, 0];
    return {
      keys: [
        key(t, 0.3, { root: { show: 1, glow: 1.3 }, burst: 0.6 }),
        key(t, 1.8, { root: { x: to[0], y: to[1], z: to[2] } }),
        key(t + 1.8, 0.3, { root: { show: 1.15 }, burst: 0.9 }),
        key(t + 2.1, 0.3, { root: { show: 1 } }),
        key(t + 2.4, 1, { root: { glow: 0.45 } }),
      ],
      dur: 2.4,
    };
  },
  /** Sinks down by `to` (default a little), glowing, and disappears: the moon going to bed, seeds into the soil. */
  sink: (s, b, t) => {
    const to = b.to ?? [s.root.x, s.root.y - 0.07, s.root.z];
    return {
      keys: [key(t, 0.4, { root: { glow: 1.3 }, burst: 0.6 }), key(t + 0.2, 1.4, { root: { x: to[0], y: to[1], z: to[2], show: 0 } }), key(t + 1.6, 0.2, { root: { glow: 0 } })],
      dur: 1.6,
    };
  },
  /** Rings like an alarm clock: shakes from side to side with tiny hops. */
  ring: (s, b, t) => {
    const n = 12;
    const keys: Key[] = [key(t, 0.08, { root: { tilt: 10, glow: 1 }, burst: 0.7 })];
    for (let i = 1; i < n; i++) keys.push(key(t + i * 0.09, 0.09, { root: { tilt: i % 2 ? -10 : 10, y: s.root.y + (i % 2 ? 0.012 : 0) }, minor: true }));
    keys.push(key(t + n * 0.09, 0.25, { root: { tilt: 0, y: s.root.y } }), key(t + n * 0.09 + 0.2, 0.8, { root: { glow: s.root.glow ?? 0.45 } }));
    return { keys, dur: (b.len ?? 0) + n * 0.09 + 0.25 };
  },
  /** Shines: swells, flares up, sparkles, and settles. */
  shine: (s, b, t) => ({
    keys: [
      key(t, 0.35, { root: { show: 1.2, glow: 1.6 }, burst: b.len ?? 1 }),
      key(t + 0.45, 0.5, { root: { show: 1 } }),
      key(t + 0.9, 1, { root: { glow: s.root.glow ?? 0.45 } }),
    ],
    dur: 1.2,
  }),
  /** Grows up out of the ground (a sprout, a vegetable): from a speck to a little more than its size and back. */
  grow: (_s, b, t) => ({
    keys: [
      key(t, 0.2, { root: { show: 0.12, glow: 1.2 }, burst: b.len ?? 0.8 }),
      key(t + 0.2, 1.1, { root: { show: 1.18 } }),
      key(t + 1.3, 0.35, { root: { show: 1 }, burst: 0.5 }),
      key(t + 1.6, 1, { root: { glow: 0.4 } }),
    ],
    dur: 1.6,
  }),
  /** Rain from a cloud for `len` seconds (default 4): the cloud darkens a little, shakes and lets it pour. */
  rain: (s, b, t) => {
    const len = b.len ?? 4;
    const keys: Key[] = [key(t, 0.3, { root: { glow: 1.2, show: 1.08 }, rain: len, burst: 0.6 })];
    for (let i = 0; i < 6; i++) keys.push(key(t + 0.3 + i * 0.12, 0.12, { root: { tilt: i % 2 ? -4 : 4 }, minor: true }));
    keys.push(key(t + 1.1, 0.4, { root: { tilt: 0, show: 1 } }), key(t + len, 1, { root: { glow: s.root.glow ?? 0.45 } }));
    return { keys, dur: len };
  },
  /** Turns once round. */
  spin: (s, _b, t) => ({ keys: [key(t, 1.2, { root: { rotY: s.root.rotY + 360, glow: 1 }, burst: 0.6 }), key(t + 1.2, 0.8, { root: { glow: s.root.glow ?? 0.45 } })], dur: 1.2 }),
};

export function runAct(s: State, b: Beat, t: number): ActResult {
  const a = ACTS[b.do] ?? THING_ACTS[b.do];
  if (!a) {
    console.warn('Bilinmeyen hareket', b.do);
    return { keys: [], dur: 0 };
  }
  return a(s, b, t);
}
