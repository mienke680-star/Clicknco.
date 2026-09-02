import { Line, MeshTransmissionMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const ELECTRIC = '#5ce8ff'
const DEEP_GLOW = '#1fb8ff'

/** A short jittered arc between two points on the core's surface — restyled every few frames for a flicker. */
function ElectricArc({ seed }: { seed: number }) {
  const points = useMemo(() => {
    const rng = mulberry32(seed)
    const a = randomOnSphere(rng, 1.08)
    const b = randomOnSphere(rng, 1.08)
    const mid = a.clone().lerp(b, 0.5).multiplyScalar(1.25 + rng() * 0.25)
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    return curve.getPoints(14)
  }, [seed])

  return (
    <Line
      points={points}
      color={ELECTRIC}
      lineWidth={1.6}
      transparent
      opacity={0.85}
      toneMapped={false}
    />
  )
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomOnSphere(rng: () => number, radius: number) {
  const u = rng()
  const v = rng()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  )
}

function EnergyRings() {
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const ring3 = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (ring1.current) ring1.current.rotation.x += delta * 0.35
    if (ring2.current) ring2.current.rotation.y += delta * 0.28
    if (ring3.current) ring3.current.rotation.z += delta * 0.22
  })

  const ringMaterialProps = {
    color: DEEP_GLOW,
    transparent: true,
    opacity: 0.55,
    toneMapped: false,
    side: THREE.DoubleSide,
  }

  return (
    <group>
      <mesh ref={ring1} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.55, 0.012, 16, 120]} />
        <meshBasicMaterial {...ringMaterialProps} />
      </mesh>
      <mesh ref={ring2} rotation={[0, Math.PI / 4, Math.PI / 5]}>
        <torusGeometry args={[1.75, 0.008, 16, 120]} />
        <meshBasicMaterial {...ringMaterialProps} opacity={0.4} />
      </mesh>
      <mesh ref={ring3} rotation={[Math.PI / 6, Math.PI / 3, 0]}>
        <torusGeometry args={[1.35, 0.01, 16, 120]} />
        <meshBasicMaterial {...ringMaterialProps} opacity={0.5} />
      </mesh>
    </group>
  )
}

export default function GlowObject() {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const lastTick = useRef(-1)
  const [arcSeeds, setArcSeeds] = useState(() => makeSeeds())

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.12
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.18
    }
    if (core.current) {
      const pulse = 0.92 + Math.sin(state.clock.elapsedTime * 2.2) * 0.06
      core.current.scale.setScalar(pulse)
    }

    // Reroll the electric arcs periodically for a flicker effect.
    const tick = Math.floor(state.clock.elapsedTime * 6)
    if (tick !== lastTick.current) {
      lastTick.current = tick
      setArcSeeds(makeSeeds())
    }
  })

  return (
    <group ref={group}>
      {/* outer glass-and-metal shell */}
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[1.3, 2]} />
        <MeshTransmissionMaterial
          thickness={0.6}
          roughness={0.06}
          transmission={0.96}
          ior={1.4}
          chromaticAberration={0.04}
          anisotropy={0.3}
          distortion={0.15}
          distortionScale={0.4}
          temporalDistortion={0.1}
          color="#bfe9ff"
          metalness={0.35}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      {/* inner glowing electric core */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshBasicMaterial
          color={ELECTRIC}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      <EnergyRings />

      {arcSeeds.map((seed) => (
        <ElectricArc key={seed} seed={seed} />
      ))}
    </group>
  )
}

function makeSeeds() {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 1e6))
}
