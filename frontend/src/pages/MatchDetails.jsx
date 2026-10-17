import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import PlayerRatings from '../components/PlayerRatings'
import { getMatch } from '../services/api'

const eventIcon = (e) => {
  if (e.type === 'Goal') return '⚽'
  if (e.type === 'Card') return String(e.card).toLowerCase().includes('red') ? '🟥' : '🟨'
  if (e.type === 'Substitution') return '🔁'
  return '•'
}

function Events({ events }) {
  if (!events.length) return <p className="py-8 text-center text-slate-400">No events yet.</p>
  return (
    <ul className="space-y-1">
      {events.map((e, i) => (
        <li key={i} className={`flex items-center gap-2 text-sm ${e.isHome ? '' : 'flex-row-reverse text-right'}`}>
          <span className="w-10 text-xs text-slate-400">{e.time}'</span>
          <span>{eventIcon(e)}</span>
          <span>
            {e.player}
            {e.assist && <span className="text-xs text-slate-500"> ({e.assist})</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

const num = (v) => parseFloat(String(v).replace('%', '')) || 0

function Stats({ stats }) {
  if (!stats.length) return <p className="py-8 text-center text-slate-400">Stats not available.</p>
  return (
    <div className="space-y-3">
      {stats.map((s, i) => {
        const h = num(s.home), a = num(s.away), total = h + a || 1
        return (
          <div key={i}>
            <div className="flex justify-between text-sm"><b>{s.home}</b><span className="text-slate-400">{s.title}</span><b>{s.away}</b></div>
            <div className="mt-1 flex h-1.5 overflow-hidden rounded bg-slate-800">
              <div className="bg-emerald-500" style={{ width: `${(h / total) * 100}%` }} />
              <div className="bg-sky-500" style={{ width: `${(a / total) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function MatchDetails() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [tab, setTab] = useState('lineup')
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try { setMatch(await getMatch(id)); setError(null) }
    catch { setError('Could not load this match.') }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!match?.status.live) return
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [match?.status.live, load])

  if (error) return <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">{error}</p>
  if (!match) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-400" /></div>

  const tabs = [['lineup', 'Lineup'], ['events', 'Events'], ['stats', 'Stats']]

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back</Link>

      <div className="rounded-xl bg-slate-900 p-4 text-center ring-1 ring-slate-800">
        <div className="flex items-center justify-around gap-2">
          <span className="flex-1 font-semibold">{match.home.name}</span>
          <span className="text-3xl font-bold tabular-nums">{match.status.started ? (match.status.scoreStr || `${match.home.score ?? 0} - ${match.away.score ?? 0}`) : 'vs'}</span>
          <span className="flex-1 font-semibold">{match.away.name}</span>
        </div>
        <p className={`mt-2 text-xs ${match.status.live ? 'text-red-400' : 'text-slate-400'}`}>
          {match.status.live ? `LIVE ${match.status.minute ?? ''}` : match.status.finished ? 'Full time' : 'Not started'}
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-900 p-1">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded py-1.5 text-sm ${tab === k ? 'bg-emerald-600' : 'hover:bg-slate-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'lineup' && <PlayerRatings lineup={match.lineup} />}
      {tab === 'events' && <Events events={match.events} />}
      {tab === 'stats' && <Stats stats={match.stats} />}
    </div>
  )
}
