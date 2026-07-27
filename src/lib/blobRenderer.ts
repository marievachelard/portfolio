import { FRAG, VERT } from "./blobShader";

/**
 * Everything the page wants to say to the blob, mutated in place. The renderer
 * reads it once per frame and eases toward it, so the DOM side never has to
 * think about animation timing — it just states where the blob should be and
 * whether it is crystallised.
 */
export type BlobTarget = {
  /** is a column hovered right now */
  active: boolean;
  /** has the hovered column been clicked (liquid pillar → cube) */
  crystal: boolean;
  /**
   * Once the column has opened, the cube leaves the grid and parks itself small
   * in the top-right corner of the window. Position and size are derived from the
   * viewport, so the page only has to flip this.
   */
  docked: boolean;
  /** hovered column rect, CSS px */
  colCenterX: number;
  colCenterY: number;
  colWidth: number;
  colHeight: number;
  /** pointer position, CSS px */
  pointerX: number;
  pointerY: number;
};

export type BlobRenderer = {
  target: BlobTarget;
  /** restart the loop after it idled itself out */
  wake: () => void;
  destroy: () => void;
};

/**
 * World units: half a column is exactly 1.0, so the pillar's half extents are
 * read straight off the column's aspect ratio.
 */
/**
 * The pillar overflows its column on purpose and is clipped to it in the shader:
 * that is what gives it dead-straight edges against the grey rules while the
 * surface keeps deforming. 1.16 minus the 0.13 noise skin still leaves the
 * narrowest point of the silhouette outside the column, so the edge never
 * develops a notch.
 */
const HALF_X = 1.16;
/**
 * Deliberately shallow — a standing sheet of liquid, not a block. The thinner
 * the body, the more the light's path through it varies with the rippling skin,
 * and the stronger the thin-film colour reads.
 */
const HALF_Z = 0.34;
/** Same idea vertically — it runs off the top and bottom of the viewport. */
const OVERFLOW_Y = 1.14;
/**
 * Tilted into iso view a cube's corners project out to ~1.40x its half edge, so
 * 0.58 + the noise skin lands at ~0.90 of the half column — it stays clear of the
 * rules under its own steam, never relying on the clip. Sized generously on
 * purpose: it carries the same absolute ripple amplitude as the pillar, and a
 * smaller cube would be swallowed by it.
 */
const CUBE_HALF = 0.58;

/**
 * Docked size and inset, CSS px. DOCK_UNIT converts world units to pixels, so the
 * cube's visible half edge parks at DOCK_UNIT * CUBE_HALF ≈ 43px.
 */
const DOCK_UNIT = 74;
const DOCK_INSET = 104;

/**
 * Capped low on purpose: the pillar covers a whole column, so every extra device
 * pixel is a full two-pass raymarch. The surface has no fine detail that a
 * higher ratio would resolve anyway.
 */
const MAX_DPR = 1.4;

/**
 * Seconds the change of column is softened over. Short on purpose: the change is
 * still meant to read as a cut, this only takes the hard edge off both sides of
 * it — long enough not to sting, too short to be a transition of its own.
 */
const HANDOFF = 0.1;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`blob shader: ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

export function createBlobRenderer(canvas: HTMLCanvasElement): BlobRenderer | null {
  const ctx = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!ctx) return null;
  // Rebound as non-nullable: TypeScript does not carry the narrowing above into
  // the hoisted frame()/resize() declarations below.
  const gl = ctx;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`blob program: ${gl.getProgramInfoLog(program)}`);
  }
  gl.useProgram(program);

  const u = {
    res: gl.getUniformLocation(program, "uRes"),
    center: gl.getUniformLocation(program, "uCenter"),
    unit: gl.getUniformLocation(program, "uUnit"),
    clip: gl.getUniformLocation(program, "uClip"),
    half: gl.getUniformLocation(program, "uHalf"),
    cubeHalf: gl.getUniformLocation(program, "uCubeHalf"),
    amount: gl.getUniformLocation(program, "uAmount"),
    fade: gl.getUniformLocation(program, "uFade"),
    cube: gl.getUniformLocation(program, "uCube"),
    flow: gl.getUniformLocation(program, "uFlow"),
    slosh: gl.getUniformLocation(program, "uSlosh"),
    aim: gl.getUniformLocation(program, "uAim"),
  };

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const target: BlobTarget = {
    active: false,
    crystal: false,
    docked: false,
    colCenterX: 0,
    colCenterY: 0,
    colWidth: 0,
    colHeight: 0,
    pointerX: 0,
    pointerY: 0,
  };

  // Eased state. `x`/`y` are CSS px. There is one body and it changes column in a
  // single frame — it never travels. `amount` is its presence in the grid (hover in
  // and out) and is left untouched by a change of column.
  const eased = { x: 0, y: 0, width: 0, height: 0, amount: 0, cube: 0, unit: 0 };
  // Clip window, CSS px. Both edges are only ever set to a column boundary — never
  // interpolated — so the cut never lands mid-column, and the body is always
  // contained by exactly the column it lives in.
  const clip = { left: 0, right: 0 };
  /**
   * How much of the newly arrived body is still held back, 1 → 0 over HANDOFF. It
   * goes to the shader as `uFade`, which touches opacity only: routing it through
   * `amount` would scale the body as well, and a shape popping up to size is the
   * opposite of taking the edge off.
   */
  let handoff = 0;
  /**
   * Snapshots of columns just left, frozen where they stood and drawn as extra
   * passes while their own `fade` runs out. Each carries its own progress because a
   * flick can leave a column before the one before it has finished, and sharing one
   * would snap that one off at whatever opacity it had reached.
   */
  const leaving: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: number;
    cube: number;
    amount: number;
    clipL: number;
    clipR: number;
    fade: number;
  }[] = [];
  /** Only reachable by flicking across columns; the oldest is also the faintest. */
  const MAX_LEAVING = 3;
  let flow = 0;
  let slosh = 0;
  let prev = { x: 0, y: 0 };
  let dpr = 1;
  let cssH = 0;
  let cssW = 0;
  let seeded = false;
  let raf = 0;
  let last = 0;
  let idle = 0;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const pw = Math.round(cssW * dpr);
    const ph = Math.round(cssH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      gl.viewport(0, 0, pw, ph);
    }
  }

  // Exponential easing that is correct at any frame rate: the fraction of the
  // remaining distance covered per second is fixed, not the fraction per frame.
  const ease = (from: number, to: number, base: number, dt: number) =>
    from + (to - from) * (1 - Math.pow(base, dt));

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - (last || now)) / 1000, 1 / 20);
    last = now;

    resize();

    const wantW = target.colWidth || cssW / 4;
    const wantH = target.colHeight || cssH;

    // Docked: park in the top-left corner. The cube shrinks with the viewport, and
    // the inset is floored by how far its tilted corners actually project — that is
    // what stops it hanging off the left edge on a phone.
    const dockUnit = Math.min(DOCK_UNIT, cssW * 0.13);
    const dockReach = dockUnit * CUBE_HALF * 1.45;
    const inset = Math.max(dockReach + 14, Math.min(DOCK_INSET, cssW * 0.16, cssH * 0.16));
    const dockX = inset;
    const dockY = inset;
    const wantUnit = target.docked ? dockUnit : wantW / 2;

    if (!seeded && target.active) {
      eased.x = target.colCenterX;
      eased.y = target.colCenterY;
      eased.width = wantW;
      eased.height = wantH;
      eased.unit = wantUnit;
      clip.left = target.colCenterX - wantW / 2;
      clip.right = target.colCenterX + wantW / 2;
      seeded = true;
    }

    if (target.docked) {
      // Leaving the grid: fly to the corner while shrinking. The clip opens to the
      // whole viewport, since there is no column left to be contained by.
      eased.x = ease(eased.x, dockX, 0.0009, dt);
      eased.y = ease(eased.y, dockY, 0.0009, dt);
      clip.left = 0;
      clip.right = cssW;
    } else if (target.active) {
      // Half a column is the widest the geometry can drift under a resize and the
      // narrowest a real column change can be, so it separates the two cleanly.
      if (Math.abs(eased.x - target.colCenterX) > wantW * 0.5) {
        // The change of column is a cut, not a move: everything positional is
        // rewritten in this one frame. The only thing that is not instant is the
        // brief fade on either side of it — the column being left keeps its own
        // copy to go out on, and the new one is held back by `handoff`.
        if (eased.amount > 0.004) {
          leaving.push({
            x: eased.x,
            y: eased.y,
            width: eased.width,
            height: eased.height,
            unit: eased.unit,
            cube: eased.cube,
            amount: eased.amount,
            clipL: clip.left,
            clipR: clip.right,
            fade: 1,
          });
          if (leaving.length > MAX_LEAVING) leaving.shift();
        }
        handoff = 1;
        eased.x = target.colCenterX;
        eased.y = target.colCenterY;
        eased.width = wantW;
        eased.height = wantH;
        clip.left = target.colCenterX - wantW / 2;
        clip.right = target.colCenterX + wantW / 2;
      } else {
        // Same column — this only ever absorbs layout drift from a resize.
        eased.x = ease(eased.x, target.colCenterX, 0.0006, dt);
        eased.y = ease(eased.y, target.colCenterY, 0.004, dt);
        eased.width = ease(eased.width, wantW, 0.0005, dt);
        eased.height = ease(eased.height, wantH, 0.0005, dt);
        clip.left = target.colCenterX - wantW / 2;
        clip.right = target.colCenterX + wantW / 2;
      }
    }
    eased.unit = ease(eased.unit, wantUnit, 0.0009, dt);
    eased.amount = ease(eased.amount, target.active ? 1 : 0, 0.0009, dt);
    eased.cube = ease(eased.cube, target.crystal ? 1 : 0, 0.0022, dt);

    // Linear, so both halves of the hand-off actually finish — an easing asymptote
    // would leave a permanent sliver of the old column on screen.
    const step = dt / HANDOFF;
    handoff = Math.max(0, handoff - step);
    for (let i = leaving.length - 1; i >= 0; i--) {
      leaving[i].fade -= step;
      if (leaving[i].fade <= 0.004) leaving.splice(i, 1);
    }

    // Pointer velocity feeds the slosh: fast attack, slow settle.
    const dx = target.pointerX - prev.x;
    const dy = target.pointerY - prev.y;
    prev = { x: target.pointerX, y: target.pointerY };
    const vel = Math.min(Math.hypot(dx, dy) / Math.max(dt, 0.001) / 900, 1);
    slosh = ease(slosh, vel, vel > slosh ? 0.02 : 0.35, dt);

    // Advance a continuous phase — modulating time * speed would jump the noise.
    flow += dt * (reduced ? 0 : 0.55 + slosh * 1.6);

    if (eased.amount < 0.005 && leaving.length === 0 && !target.active) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      // Nothing to draw and nothing incoming: park the loop until wake().
      if ((idle += dt) > 0.75) {
        cancelAnimationFrame(raf);
        raf = 0;
        seeded = false;
      }
      return;
    }
    idle = 0;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.cubeHalf, CUBE_HALF);
    gl.uniform1f(u.flow, flow);
    gl.uniform1f(u.slosh, slosh);

    // No two bodies share a column, so the clip windows never overlap and straight
    // alpha blending is enough to draw them one after the other.
    for (const body of leaving) {
      // Aim is dropped: the pointer is a column away by now, and letting the body
      // on its way out lean after it is the sideways pull this is meant to be
      // rid of.
      drawBody(body, body.amount, body.fade, body.cube, body.clipL, body.clipR, 0, 0);
    }

    const unit = eased.unit || eased.width / 2;
    drawBody(
      eased,
      eased.amount,
      1 - handoff,
      eased.cube,
      clip.left,
      clip.right,
      // Docked, the pointer is somewhere else entirely on the page — letting it aim
      // the bulge from that far away just makes the cube lurch.
      target.docked ? 0 : (target.pointerX - eased.x) / unit,
      target.docked ? 0 : -(target.pointerY - eased.y) / unit,
    );
  }

  /**
   * One raymarch pass for one body. Everything that differs between the column
   * being left and the current one is a parameter; the frame-wide uniforms
   * (resolution, flow, slosh) are already set by the caller.
   */
  function drawBody(
    body: { x: number; y: number; width: number; height: number; unit: number },
    amount: number,
    fade: number,
    cube: number,
    clipL: number,
    clipR: number,
    aimX: number,
    aimY: number,
  ) {
    if (amount < 0.004 || fade < 0.004) return;

    // In the grid one world unit is half a column, so the pillar's height in world
    // units is just the column's aspect ratio. Docked, the unit shrinks instead and
    // the pillar extent no longer matters — the body is a cube by then.
    const unit = body.unit || body.width / 2;
    const halfY = Math.max(
      ((body.height / 2) / (body.width / 2)) * OVERFLOW_Y,
      CUBE_HALF,
    );

    // gl_FragCoord has its origin bottom-left, CSS coordinates top-left.
    gl.uniform2f(u.center, body.x * dpr, (cssH - body.y) * dpr);
    gl.uniform1f(u.unit, unit * dpr);
    gl.uniform2f(u.clip, clipL * dpr, clipR * dpr);
    gl.uniform3f(u.half, HALF_X, halfY, HALF_Z);
    gl.uniform1f(u.amount, amount);
    gl.uniform1f(u.fade, fade);
    gl.uniform1f(u.cube, cube);
    gl.uniform2f(u.aim, aimX, aimY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function wake() {
    if (!raf) {
      last = 0;
      idle = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  resize();
  wake();

  return {
    target,
    wake,
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
