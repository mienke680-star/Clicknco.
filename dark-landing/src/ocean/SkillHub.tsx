const TRACKS = [
  {
    level: 'Foundational',
    title: 'Core fundamentals',
    body: 'Environments, deploys, and the CLI you’ll reach for every day.',
  },
  {
    level: 'Intermediate',
    title: 'Security practices',
    body: 'Secrets management, least-privilege access, and audit trails.',
  },
  {
    level: 'Advanced',
    title: 'Systems at scale',
    body: 'Sharding, caching layers, and traffic shaping under real load.',
  },
  {
    level: 'Advanced',
    title: 'Performance tuning',
    body: 'Profiling, cold starts, and shaving off the milliseconds that matter.',
  },
]

const LEVEL_STYLES: Record<string, string> = {
  Foundational: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  Intermediate: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  Advanced: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10',
}

export default function SkillHub() {
  return (
    <section
      id="skill-hub"
      className="relative z-10 scroll-mt-24 px-6 py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-xl">
          <span className="mb-4 inline-flex items-center gap-2 text-xs font-medium tracking-widest text-cyan-300/80 uppercase">
            Skill Hub
          </span>
          <h2 className="text-balance text-3xl font-semibold text-white sm:text-4xl">
            Learning tracks, built by the people who run the core
          </h2>
          <p className="mt-3 text-slate-400">
            Pick a track by where you actually are, not where the syllabus assumes you are.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TRACKS.map((track) => (
            <div
              key={track.title}
              className="rounded-2xl border border-cyan-400/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-cyan-300/25"
            >
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_STYLES[track.level]}`}
              >
                {track.level}
              </span>
              <h3 className="mt-3 text-base font-semibold text-white">
                {track.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {track.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
