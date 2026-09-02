import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect } from 'react'
import * as THREE from 'three'
import Bubbles from './Bubbles'
import CausticsBackdrop from './CausticsBackdrop'
import GlowObject from './GlowObject'
import LightRays from './LightRays'

export default function OceanScene({
  reducedMotion,
}: {
  reducedMotion: boolean
}) {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#031224', 0.055)
    return () => {
      scene.fog = null
    }
  }, [scene])

  return (
    <>
      <color attach="background" args={['#020a16']} />

      <ambientLight intensity={0.25} color="#3fa9ff" />
      <pointLight position={[3, 2, 4]} intensity={12} color="#4fd7ff" distance={12} />
      <pointLight position={[-4, -1, 2]} intensity={6} color="#2f6bff" distance={14} />
      <directionalLight position={[0, 8, -4]} intensity={0.6} color="#9fdcff" />

      {/* procedural environment (no external HDRI fetch) for glass/metal reflections */}
      <Environment resolution={256}>
        <Lightformer form="ring" color="#5fd8ff" intensity={4} position={[0, 2, -3]} scale={4} />
        <Lightformer form="rect" color="#1c6bff" intensity={2} position={[-4, -1, 2]} scale={[4, 6, 1]} rotation={[0, Math.PI / 3, 0]} />
        <Lightformer form="rect" color="#8fe9ff" intensity={2} position={[4, 1, 2]} scale={[4, 6, 1]} rotation={[0, -Math.PI / 3, 0]} />
      </Environment>

      <CausticsBackdrop />
      <LightRays />

      <GlowObject />

      <Sparkles
        count={140}
        scale={[9, 6, 6]}
        size={2.4}
        speed={reducedMotion ? 0 : 0.25}
        opacity={0.55}
        color="#8fe9ff"
        noise={0.4}
      />

      <Bubbles count={reducedMotion ? 0 : 70} />

      {!reducedMotion && (
        <EffectComposer>
          <Bloom
            intensity={1.15}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <ChromaticAberration offset={[0.0007, 0.0012]} />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
        </EffectComposer>
      )}
    </>
  )
}
