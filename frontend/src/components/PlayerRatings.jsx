import { useState } from 'react'
import { Shield } from 'lucide-react'

// Color-code a rating; prefer FotMob's own bgcolor when provided.
export function ratingColor(rating) {
  if (rating?.bgcolor) return rating.bgcolor
  const n = parseFloat(rating?.num)
  if (isNaN(n)) return '#475569'
  if (n >= 8) return '#10b981'
  if (n >= 7) return '#84cc16'
  if (n >= 6.5) return '#f59e0b'
  if (n >= 6) return '#f97316'
  return '#ef4444'
}

const fullName = (p) => `${p.name?.firstName ?? ''} ${p.name?.lastName ?? ''}`.trim()

function Dot({ p }) {
  const [open, setOpen] = useState(false)
  const c = p.pitchCoordinates
  if (!c) return null
  const goals = p.stats?.find((s) => s.key === 'goals')?.value
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center focus:outline-none"
      style={{ left: `${c.x}%`, top: `${c.y}%`, zIndex: open ? 10 : 1 }}
    >
      <div className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-slate-900/80 text-xs font-bold shadow">
        {p.shirtNumber}
        {p.rating && (
          <span
            className="absolute -right-3 -top-2 rounded px-1 text-[10px] font-bold text-slate-950"
            style={{ backgroundColor: ratingColor(p.rating) }}
          >
            {p.rating.num}
          </span>
        )}
        {p.isCaptain && <span className="absolute -bottom-1 -left-1 rounded-full bg-amber-400 px-1 text-[8px] text-slate-950">C</span>}
        {goals > 0 && <span className="absolute -bottom-1 -right-2 text-[10px]">⚽{goals > 1 ? goals : ''}</span>}
      </div>
      <div className="mt-0.5 max-w-[70px] truncate text-[10px] font-medium text-white drop-shadow">{p.name?.lastName}</div>
      {open && (
        <div className="absolute left-1/2 top-full z-20 mt-1 w-40 -translate-x-1/2 rounded-md bg-slate-950 p-2 text-left text-[11px] shadow-lg ring-1 ring-slate-700">
          <div className="font-semibold">{fullName(p)}</div>
          <div className="text-slate-400">{p.position}</div>
          {p.stats?.map((s) => (
            <div key={s.key} className="flex justify-between"><span>{s.title}</span><b>{s.value}</b></div>
          ))}
        </div>
      )}
    </button>
  )
}

function Pitch({ starters }) {
  return (
    <div className="relative mx-auto aspect-[2/3] w-full max-w-md overflow-hidden rounded-xl bg-emerald-700 ring-2 ring-emerald-900">
      {/* pitch markings */}
      <div className="absolute inset-2 rounded border-2 border-white/40" />
      <div className="absolute left-2 right-2 top-1/2 border-t-2 border-white/40" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
      <div className="absolute left-1/4 right-1/4 top-2 h-16 border-2 border-t-0 border-white/40" />
      <div className="absolute bottom-2 left-1/4 right-1/4 h-16 border-2 border-b-0 border-white/40" />
      {starters.map((p) => <Dot key={p.id} p={p} />)}
    </div>
  )
}

export default function PlayerRatings({ lineup }) {
  const [side, setSide] = useState(0)
  if (!lineup?.starters?.length) {
    return <p className="py-8 text-center text-slate-400">Lineups not available yet.</p>
  }
  const team = lineup.lineups?.[side]
  const starters = lineup.starters[side] ?? []
  const subs = lineup.subs?.[side] ?? []
  const coach = lineup.coaches?.[side]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {lineup.lineups.map((t, i) => (
          <button
            key={t.teamId}
            onClick={() => setSide(i)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${side === i ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {t.teamName}
          </button>
        ))}
      </div>

      <Pitch starters={starters} />
      <p className="text-center text-xs text-slate-500">Tap a player for match stats. Coloured badges show ratings.</p>

      {coach && (
        <p className="flex items-center gap-2 text-sm text-slate-300">
          <Shield size={16} /> Coach: {fullName(coach)}
        </p>
      )}

      {subs.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Substitutes · {team?.teamName}</h3>
          <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900/60 ring-1 ring-slate-800">
            {subs.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-6 text-center font-bold text-slate-400">{p.shirtNumber}</span>
                <span className="flex-1">{fullName(p)} <span className="text-xs text-slate-500">{p.position}</span></span>
                {p.timeSubbedOn != null && <span className="text-xs text-emerald-400">↑ {p.timeSubbedOn}'</span>}
                {p.rating && (
                  <span className="rounded px-1.5 text-xs font-bold text-slate-950" style={{ backgroundColor: ratingColor(p.rating) }}>
                    {p.rating.num}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
