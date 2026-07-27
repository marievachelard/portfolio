/**
 * Raymarched liquid pillar, rendered as a single fullscreen pass.
 *
 * The surface is an SDF rounded box sized to fill the hovered column, swayed and
 * perturbed by fbm noise so it reads as a standing body of liquid. Clicking
 * crystallises it: the extents contract to a cube, the roundness and the noise
 * go to zero, and the whole thing tilts into an isometric view so three faces
 * are visible at once.
 *
 * Shading is a soap-bubble model — march once to the surface, refract, then
 * march again from the inside to measure how thick the body is at that pixel,
 * and turn that thickness into a thin-film interference colour. On the liquid
 * the thickness ripples with the skin; on the cube each flat face returns a
 * near-constant thickness, so each face lands on its own hue.
 */

export const VERT = /* glsl */ `#version 300 es
// Fullscreen triangle — no attributes, positions come from gl_VertexID.
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2.0 - 1.0;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2  uRes;      // canvas size, device px
uniform vec2  uCenter;   // column centre, device px (gl origin: bottom-left)
uniform float uUnit;     // device px per world unit (half a column = 1.0)
uniform vec2  uClip;     // left / right clip edges, device px — always on a column boundary
uniform vec3  uHalf;     // half extents of the liquid pillar, world units
uniform float uCubeHalf; // half edge of the crystallised cube, world units
uniform float uFill;     // waterline, device px on gl_FragCoord.y — the body exists below it only
uniform float uWave;     // ripple amplitude on that line, as a fraction of a world unit
uniform float uTilt;     // and its tilt, device px per device px — the surface rocking
uniform float uFade;     // 0..1 opacity only — softens the cut between columns without resizing
uniform float uCube;     // 0 = liquid pillar, 1 = crystallised cube
uniform float uFlow;     // continuous animation phase (never time * speed)
uniform float uSlosh;    // 0..1 energy from pointer velocity
uniform vec2  uAim;      // pointer offset from the centre, world units

out vec4 fragColor;

const float PI2 = 6.28318530718;

/* ---------- simplex noise (Ashima / Gustavson, standard port) ---------- */
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Weighted heavily toward the first octave: a strong second octave turns the
// surface into stucco instead of liquid.
float fbm(vec3 p){ return snoise(p) * 0.80 + snoise(p * 2.1) * 0.20; }

/* ---------------------------- the surface ---------------------------- */

float sdRoundBox(vec3 p, vec3 b, float r){
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1,0,0, 0,c,s, 0,-s,c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }

// Noise amplitude is the one thing that breaks the Lipschitz bound (one step of
// d can overshoot the perturbed surface), so STEP stays well under 1.
const float SKIN = 0.21;
const float STEP = 0.40;

float shape(vec3 p){
  float t = uFlow;

  // Three staged weights. The body contracts to cube proportions FIRST, then
  // tilts, then hardens — if it tilted while still a tall pillar it would swing
  // straight through the grey rules on either side.
  float form = smoothstep(0.00, 0.70, uCube);
  float turn = smoothstep(0.30, 1.00, uCube);
  float hard = smoothstep(0.20, 0.95, uCube);

  // The cube stays liquid: it keeps the same rippling skin and sway, just scaled
  // down so a body barely a third of the pillar's width still reads as a cube
  // rather than as a lump. Edges stay softly rounded for the same reason.
  float fluid = mix(1.0, 0.40, hard);

  // A slow serpentine sway: the pillar leans and winds up its own height, which
  // is most of what makes a tall body of liquid look like it is standing rather
  // than extruded.
  vec3 q = p;
  q.x += sin(q.y * 1.45 - t * 0.85) * 0.075 * fluid;
  q.z += cos(q.y * 1.15 - t * 0.65) * 0.060 * fluid;

  q = rotX(-0.52 * turn) * rotY((0.66 + t * 0.13) * turn) * q;

  vec3 half_ = mix(uHalf, vec3(uCubeHalf), form);
  float rad = mix(min(uHalf.x, uHalf.z) * 0.9, 0.035, hard);
  float d = sdRoundBox(q, half_, min(rad, min(half_.x, min(half_.y, half_.z))));

  // Liquid skin. Low frequency and drifting downward, so the surface reads as
  // a mass flowing under gravity rather than as a textured solid. The noise
  // frequency rises as the body contracts, keeping the ripples the same apparent
  // size on screen instead of stretching into slabs on the smaller cube.
  float amp = SKIN * fluid;
  float freq = mix(1.05, 1.7, form);

  // Hold the corners. Damp the ripples wherever two box faces meet — measured by
  // how far the dominant axis leads the second one — so the cube keeps readable
  // edges while its faces go on flowing. Without this, the amplitude that reads
  // as liquid on a tall pillar just rounds the cube off into a pebble. Weighted
  // by the form weight, so the pillar is untouched.
  vec3 e = abs(q) - half_;
  float m1 = max(e.x, max(e.y, e.z));
  float m3 = min(e.x, min(e.y, e.z));
  float m2 = e.x + e.y + e.z - m1 - m3;
  float faceness = smoothstep(0.0, 0.24, m1 - m2);
  amp *= mix(1.0, mix(0.22, 1.0, faceness), form);

  d += fbm(q * freq + vec3(0.0, -t * 0.40, t * 0.13)) * (amp + uSlosh * 0.07 * fluid);

  // The body reaches toward the cursor.
  vec3 aim = normalize(vec3(uAim, -0.85));
  d -= pow(max(dot(normalize(q + 1e-5), aim), 0.0), 3.0)
       * (0.10 + uSlosh * 0.07) * fluid;

  return d;
}

// The body is always at full size. Hover in and out are a rising and falling
// waterline (see uFill), not a scale — a column fills and empties, it does not
// grow and shrink.
float sdf(vec3 p){
  return shape(p);
}

// Tetrahedron gradient: 4 SDF taps instead of the 6 a central difference costs.
vec3 normalAt(vec3 p, float e){
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * sdf(p + k.xyy*e) + k.yyx * sdf(p + k.yyx*e) +
    k.yxy * sdf(p + k.yxy*e) + k.xxx * sdf(p + k.xxx*e)
  );
}

// Ray/AABB slab test. Nearly free, and it means the march only ever runs inside
// the body's own bounding box — which for a near-orthographic camera is a very
// short span in z.
bool boxSpan(vec3 ro, vec3 rd, vec3 b, out float t0, out float t1){
  vec3 inv = 1.0 / rd;
  vec3 n = inv * ro;
  vec3 k = abs(inv) * b;
  vec3 lo = -n - k, hi = -n + k;
  t0 = max(max(lo.x, lo.y), lo.z);
  t1 = min(min(hi.x, hi.y), hi.z);
  return t1 > max(t0, 0.0);
}

/* ---------------------------- the look ---------------------------- */

// Thin-film interference. Light reflected off the front and back of a thin film
// travels different distances; where that gap lands on a whole number of
// wavelengths the colour reinforces, elsewhere it cancels. Doing that per RGB
// wavelength gives the oil-slick spectrum, and because the gap depends on the
// measured thickness the bands follow the body's actual shape.
vec3 thinFilm(float thickness, float ndv){
  // Weighted toward thickness: the slab is thin, so the depth the ray travels
  // through it swings widely with the rippling skin, and that swing is what
  // walks the interference colour across the surface.
  // Damped once crystallised: across a flat face the depth ramps linearly and
  // fast, which at the liquid's weighting packs the fringes tight enough to
  // moiré. The cube wants a broad hue per face instead.
  float band = thickness * mix(1.75, 0.7, uCube) + (1.0 - ndv) * 1.7;
  vec3 invLambda = vec3(1.0/0.63, 1.0/0.52, 1.0/0.45);
  vec3 c = 0.5 + 0.5 * cos(PI2 * band * invLambda + vec3(0.0, 0.55, 1.15));
  // Lift toward pastel: full-swing interference reads as garish on white.
  return mix(vec3(0.80, 0.84, 0.92), c, 0.86);
}

// Near-orthographic: a tall pillar under a real perspective would splay out in
// depth and burst through the column. A sliver of convergence is kept so the
// body still turns, rather than looking like a flat cut-out.
const float PERSP = 0.055;
const float CAMZ  = 3.0;

void main(){
  // Work in a space centred on the column, in units where half a column is 1.0.
  vec2 uv = (gl_FragCoord.xy - uCenter) / uUnit;

  // Hard clip, feathered over exactly one pixel so it reads as a cut rather than
  // as aliasing. The body is deliberately WIDER than its column: the wobbling
  // silhouette gets sliced off, leaving dead-straight edges against the grey
  // rules while the liquid goes on deforming behind them. Both edges always sit
  // on a column boundary, so a body in transit is cut by the grid itself.
  float gate = smoothstep(uClip.x, uClip.x + 1.0, gl_FragCoord.x)
             * (1.0 - smoothstep(uClip.y - 1.0, uClip.y, gl_FragCoord.x));

  // Waterline. The column fills from the bottom and empties from the top, so the
  // body only exists below it. It is not a straight edge: it tilts while the level
  // rocks and ripples on the shared flow phase. A level that moves like a ruler
  // reads as a wipe over the liquid rather than as the top of it. Three octaves,
  // weights summing to 1, so uWave is the actual peak in world units.
  float sx = gl_FragCoord.x - uCenter.x;
  float ripple = sin(sx * 0.017 + uFlow * 2.3) * 0.60
               + sin(sx * 0.041 - uFlow * 1.5) * 0.28
               + sin(sx * 0.007 + uFlow * 0.9) * 0.12;
  float line = uFill + uTilt * sx + uWave * uUnit * ripple;
  gate *= 1.0 - smoothstep(line - 1.0, line, gl_FragCoord.y);

  if (uFade < 0.004 || gate < 0.002) discard;

  vec2 o = uv / (1.0 + PERSP * CAMZ);
  vec3 ro = vec3(o, -CAMZ);
  vec3 rd = normalize(vec3(o * PERSP, 1.0));

  // Bound the shape it currently IS, not the union of both: once crystallised the
  // pillar's extent is irrelevant, and keeping it would leave the ray marching the
  // full column height for a body a fraction of its size. The 1.55 covers how far
  // a tilted cube's corners project past its half edge.
  vec3 hmix = mix(uHalf, vec3(uCubeHalf), smoothstep(0.0, 0.70, uCube));
  vec3 bound = max(hmix, vec3(uCubeHalf * 1.55)) + SKIN * 1.6;
  float tNear, tFar;
  if (!boxSpan(ro, rd, bound, tNear, tFar)) discard;

  // The body now covers the whole column, so this loop runs for every pixel of
  // it. The slab entry above puts the ray just in front of the surface for most
  // of them, which is what keeps the step count affordable.
  float t = max(tNear, 0.0);
  bool hit = false;
  for (int i = 0; i < 64; i++){
    float d = sdf(ro + rd * t);
    if (d < 0.0015 * t){ hit = true; break; }
    t += d * STEP;
    if (t > tFar) break;
  }
  if (!hit) discard;

  vec3 pos = ro + rd * t;
  vec3 n = normalAt(pos, 0.0035);
  float ndv = max(dot(n, -rd), 0.0);

  // Second march, from just inside the surface along the refracted ray, to get
  // the thickness of body this pixel is looking through.
  vec3 rdIn = refract(rd, n, 1.0 / 1.34);
  float t2 = 0.02;
  for (int i = 0; i < 28; i++){
    float d = -sdf(pos + rdIn * t2);   // inside the surface sdf() is negative
    if (d < 0.004) break;
    t2 += max(d * 0.7, 0.02);
    if (t2 > 5.0) break;
  }
  float thickness = t2;

  float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  float rim  = pow(1.0 - ndv, 2.2);

  vec3 irid = thinFilm(thickness, ndv);

  // Two speculars. Both lights sit only ~25-35 degrees off the view axis: the
  // flat face of the slab then returns nothing, while the flanks of every ripple
  // catch a highlight — which is what makes the deformation legible at all now
  // that the body is seen face-on rather than in silhouette.
  vec3 L1 = normalize(vec3(-0.32, 0.46, -0.83));
  vec3 L2 = normalize(vec3(0.55, 0.30, -0.78));
  vec3 r = reflect(rd, n);
  float spec = pow(max(dot(r, L1), 0.0), 70.0)
             + pow(max(dot(r, L2), 0.0), 16.0) * 0.45;

  // Soft diffuse wrap. Physically a liberty on glass, but without it a face-on
  // slab has no shading gradient and the ripples read as a flat stain.
  float diff = 0.5 + 0.5 * dot(n, L1);

  vec3 col = irid;
  col *= mix(0.84, 1.06, diff);              // relief modelling
  col *= 0.90 + 0.20 * ndv;                  // slight core darkening
  col += rim * irid * 0.55;                  // coloured rim glow
  col = mix(col, vec3(1.0), fres * 0.32);    // glancing angles go white
  col += spec * mix(1.0, 1.35, uCube);       // crystal takes a harder highlight

  // Translucency: nearly clear looking straight through, denser at grazing
  // angles and on the rim. Thickness adds a little body so the interference
  // bands stay legible against the white column.
  float alpha = 0.28
              + 0.34 * rim
              + 0.26 * fres
              + 0.07 * clamp(thickness, 0.0, 2.0);
  alpha += spec * 0.55;
  alpha *= mix(1.0, 1.12, uCube);            // the cube sits a touch more solid

  // The surface is denser than the body beneath it. Without that band the level
  // reads as a cut through the liquid; with it, it reads as its top.
  alpha += (1.0 - smoothstep(0.0, uUnit * 0.055, line - gl_FragCoord.y)) * 0.13;

  fragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0) * uFade * gate);
}
`;
