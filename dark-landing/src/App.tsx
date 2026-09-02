import ThreeBackground from './components/ThreeBackground'

const NAV_LINKS = ['Product', 'Features', 'Pricing', 'Docs']

const FEATURES = [
  {
    title: 'Real-time rendering',
    body: 'A WebGL scene driven straight by Three.js, animating at a steady 60fps behind every section.',
  },
  {
    title: 'Built on Vite',
    body: 'Instant dev-server startup and hot module reload, with a production build tuned for speed.',
  },
  {
    title: 'Typed end to end',
    body: 'React, Three.js and the component tree are all fully typed with TypeScript.',
  },
]

function App() {
  return (
    <div className="relative min-h-screen text-zinc-100">
      <ThreeBackground />

      {/* vignette so text stays legible over the animated scene */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(20,20,35,0.2),_rgba(5,5,10,0.9)_70%)]" />

      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="text-sm font-semibold tracking-wide text-white">
            Nova<span className="text-indigo-400">.</span>
          </a>
          <ul className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((link) => (
              <li key={link}>
                <a
                  href={`#${link.toLowerCase()}`}
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#get-started"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Get started
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Now in public beta
          </span>

          <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            Build interfaces that
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {' '}
              move
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg text-zinc-400">
            A starting point for dark, animated landing pages — React, Tailwind
            and a live Three.js scene, wired together and ready to build on.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#get-started"
              className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:-translate-y-0.5"
            >
              Get started
            </a>
            <a
              href="#features"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Explore features
            </a>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-28">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Everything wired up
            </h2>
            <p className="mt-3 text-zinc-400">
              Vite, React, TypeScript, Tailwind CSS and Three.js — installed and talking to each other.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-white/20"
              >
                <h3 className="text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="get-started"
          className="mx-auto max-w-3xl px-6 pb-32 text-center"
        >
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Start editing
          </h2>
          <p className="mt-3 text-zinc-400">
            Open{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-indigo-300">
              src/App.tsx
            </code>{' '}
            and{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-indigo-300">
              src/components/ThreeBackground.tsx
            </code>{' '}
            to make it your own.
          </p>
        </section>
      </main>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-500">
        Built with Vite, React, TypeScript, Tailwind CSS and Three.js.
      </footer>
    </div>
  )
}

export default App
