import { shaderMaterial } from '@react-three/drei'
import { extend, type ThreeElement } from '@react-three/fiber'
import * as THREE from 'three'

// Moving simplex-noise field, thresholded into a caustic-light pattern.
// Doubles as the "water distortion" backdrop — the noise itself reads as
// refracted light moving through a shifting water surface.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;

  // Ashima Arts 2D simplex noise
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv * 3.4;
    float t = uTime * 0.12;

    float n1 = snoise(uv + vec2(t, -t * 0.6));
    float n2 = snoise(uv * 1.7 - vec2(t * 0.7, t * 0.35));
    float n3 = snoise(uv * 0.6 + vec2(-t * 0.2, t * 0.15));

    float caustic = max(n1 * 0.5 + n2 * 0.5 + 0.5, 0.0);
    caustic = pow(caustic, 3.2) * (0.7 + 0.3 * (n3 * 0.5 + 0.5));

    float vignette = smoothstep(1.15, 0.15, length(vUv - vec2(0.5, 0.42)));

    vec3 color = uColor * caustic * uIntensity;
    gl_FragColor = vec4(color * vignette, caustic * vignette);
  }
`

export const CausticsMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color('#3fd0ff'), uIntensity: 1 },
  vertexShader,
  fragmentShader,
)

extend({ CausticsMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    causticsMaterial: ThreeElement<typeof CausticsMaterial> & {
      uTime?: number
      uColor?: THREE.Color | string
      uIntensity?: number
    }
  }
}
