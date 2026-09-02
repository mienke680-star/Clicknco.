const GUIDES = [
  {
    title: 'Getting started',
    body: 'Provision your first node and ship a build in under five minutes.',
  },
  {
    title: 'Authentication',
    body: 'Scope tokens per environment and rotate keys without downtime.',
  },
  {
    title: 'Deployment pipelines',
    body: 'Push straight from a branch to a live preview URL, every commit.',
  },
  {
    title: 'API reference',
    body: 'Every endpoint, typed, versioned, and documented with real examples.',
  },
  {
    title: 'Webhooks & events',
    body: 'Subscribe to build, deploy, and error events as they happen.',
  },
  {
    title: 'Migrating from v1',
    body: 'A field guide for teams moving off the legacy stack.',
  },
]

export default function DevGuides() {
  return (
    <section
      id="dev-guides"
      className="relative z-10 scroll-mt-24 px-6 py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-xl">
          <span className="mb-4 inline-flex items-center gap-2 text-xs font-medium tracking-widest text-cyan-300/80 uppercase">
            Dev Guides
          </span>
          <h2 className="text-balance text-3xl font-semibold text-white sm:text-4xl">
            Everything you need to build against the core
          </h2>
          <p className="mt-3 text-slate-400">
            Short, direct guides — no fluff, no fifty-tab reference hunts.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <div
              key={guide.title}
              className="rounded-2xl border border-cyan-400/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-colors hover:border-cyan-300/25"
            >
              <h3 className="text-base font-semibold text-white">
                {guide.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {guide.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
