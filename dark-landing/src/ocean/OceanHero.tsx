import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import DevGuides from './DevGuides'
import OceanScene from './OceanScene'
import SkillHub from './SkillHub'

const NAV_LINKS = [
  { label: 'Dev Guides', href: '#dev-guides' },
  { label: 'Skill Hub', href: '#skill-hub' },
]

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

export default function OceanHero() {
  const reducedMotion = useReducedMotion()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020a16] text-slate-100">
      {/* base underwater gradient, sits behind the canvas while it boots and as a safety net */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_30%,_#0a2c4d_0%,_#041226_55%,_#010710_100%)]" />

      <div className="fixed inset-0 -z-10">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0.4, 6], fov: 42 }}
        >
          <Suspense fallback={null}>
            <OceanScene reducedMotion={reducedMotion} />
          </Suspense>
        </Canvas>
      </div>

      {/* surface shimmer overlay for a "water distortion" feel over the whole viewport */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.15] mix-blend-screen"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, rgba(140,225,255,0.5) 0px, transparent 2px, transparent 60px)',
        }}
      />

      <header className="fixed inset-x-0 top-0 z-20 border-b border-cyan-400/10 bg-[#020a16]/40 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(94,230,255,0.9)]" />
            </span>
            Abyss<span className="text-cyan-300">.io</span>
          </a>

          <ul className="hidden items-center gap-9 sm:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="group relative text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-cyan-300 shadow-[0_0_8px_1px_rgba(94,230,255,0.8)] transition-all duration-300 group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#skill-hub"
            className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-5 py-2 text-sm font-medium text-cyan-100 shadow-[0_0_20px_-4px_rgba(94,230,255,0.6)] backdrop-blur-sm transition-all hover:border-cyan-300/70 hover:bg-cyan-400/20"
          >
            Get Started
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium tracking-wide text-cyan-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_2px_rgba(94,230,255,0.9)]" />
            Signal acquired from the deep
          </span>

          <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight text-white drop-shadow-[0_0_35px_rgba(56,189,248,0.35)] sm:text-7xl">
            Engineering, powered
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
              {' '}
              from the depths
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg text-slate-300">
            Dev Guides and a living Skill Hub, built around a core that never
            stops charging. Dive in and build something that moves.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#skill-hub"
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#031224] shadow-[0_0_30px_-4px_rgba(94,230,255,0.8)] transition-transform hover:-translate-y-0.5"
            >
              Explore Skill Hub
            </a>
            <a
              href="#dev-guides"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Read the Docs
            </a>
          </div>
        </section>

        <DevGuides />
        <SkillHub />
      </main>
    </div>
  )
}
