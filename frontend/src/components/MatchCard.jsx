import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

function kickoff(m) {
  const t = m.time
  if (!t) return '--:--'
  const d = new Date(t)
  return isNaN(d) ? String(t) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ m }) {
  const s = m.status
  if (s.cancelled) return <span className="text-xs text-slate-400">Cancelled</span>
  if (s.live)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
        <span className="live-dot h-2 w-2 rounded-full bg-red-500" />
        {s.minute || 'LIVE'}
      </span>
    )
  if (s.finished) return <span className="text-xs text-slate-400">{s.reason || 'FT'}</span>
  return <span className="text-xs text-slate-400">{kickoff(m)}</span>
}

export default function MatchCard({ match }) {
  const { isTeamFav, toggleTeam } = useFavorites()
  const showScore = match.status.started

  const TeamRow = ({ team }) => (
    <div className="flex items-center gap-2">
      <button
        aria-label="Toggle favorite team"
        onClick={(e) => { e.preventDefault(); toggleTeam(team.id) }}
        className="text-slate-600 hover:text-amber-400"
      >
        <Star size={14} className={isTeamFav(team.id) ? 'fill-amber-400 text-amber-400' : ''} />
      </button>
      <span className="flex-1 truncate">{team.name}</span>
      {showScore && <span className="w-5 text-right font-bold">{team.score ?? 0}</span>}
    </div>
  )

  return (
    <Link
      to={`/match/${match.id}`}
      className="flex items-center gap-3 border-t border-slate-800 px-3 py-2.5 text-sm hover:bg-slate-900"
    >
      <div className="w-14 shrink-0 text-center"><StatusBadge m={match} /></div>
      <div className="flex-1 space-y-1 min-w-0">
        <TeamRow team={match.home} />
        <TeamRow team={match.away} />
      </div>
    </Link>
  )
}
