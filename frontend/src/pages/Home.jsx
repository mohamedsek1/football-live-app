import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Radio, Star } from 'lucide-react'
import MatchCard from '../components/MatchCard'
import { getLive, getSchedule } from '../services/api'
import { useFavorites } from '../hooks/useFavorites'

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const flag = (cc) =>
  /^[A-Z]{2}$/.test(cc || '')
    ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🌍'

export default function Home() {
  const { fav, isLeagueFav, toggleLeague } = useFavorites()
  const [date, setDate] = useState(() => new Date())
  const [liveOnly, setLiveOnly] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = liveOnly ? await getLive() : await getSchedule(ymd(date))
      setLeagues(data.leagues)
      setError(null)
    } catch {
      setError('Could not load matches. Is the PHP API running?')
    } finally {
      setLoading(false)
    }
  }, [date, liveOnly])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s for today or live view.
  useEffect(() => {
    const isToday = ymd(date) === ymd(new Date())
    if (!liveOnly && !isToday) return
    const t = setInterval(() => load(true), 30000)
    return () => clearInterval(t)
  }, [date, liveOnly, load])

  const visible = useMemo(() => {
    let list = leagues
    if (favOnly)
      list = list
        .map((l) => ({
          ...l,
          matches: l.matches.filter(
            (m) => fav.leagues.includes(l.id) || fav.teams.includes(m.home.id) || fav.teams.includes(m.away.id),
          ),
        }))
        .filter((l) => l.matches.length)
    // Favorite leagues first, then country/name (already sorted by API).
    return [...list].sort((a, b) => Number(isLeagueFav(b.id)) - Number(isLeagueFav(a.id)))
  }, [leagues, favOnly, fav, isLeagueFav])

  const isToday = ymd(date) === ymd(new Date())

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
          <button className="rounded p-1.5 hover:bg-slate-800" onClick={() => { setLiveOnly(false); setDate(addDays(date, -1)) }}><ChevronLeft size={18} /></button>
          <button className="px-2 text-sm font-medium" onClick={() => { setLiveOnly(false); setDate(new Date()) }}>
            {isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
          <button className="rounded p-1.5 hover:bg-slate-800" onClick={() => { setLiveOnly(false); setDate(addDays(date, 1)) }}><ChevronRight size={18} /></button>
        </div>
        <button
          onClick={() => setLiveOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${liveOnly ? 'bg-red-600' : 'bg-slate-900 hover:bg-slate-800'}`}
        >
          <Radio size={16} /> Live
        </button>
        <button
          onClick={() => setFavOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${favOnly ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800'}`}
        >
          <Star size={16} /> Favorites
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-400" /></div>}
      {error && <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">{error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="py-10 text-center text-slate-400">No matches to show.</p>
      )}

      {visible.map((l) => (
        <section key={`${l.id}-${l.name}`} className="overflow-hidden rounded-xl bg-slate-900/60 ring-1 ring-slate-800">
          <header className="flex items-center gap-2 bg-slate-900 px-3 py-2">
            <span>{flag(l.country)}</span>
            <h2 className="flex-1 truncate text-sm font-semibold">{l.name}</h2>
            <button aria-label="Toggle favorite league" onClick={() => toggleLeague(l.id)}>
              <Star size={16} className={isLeagueFav(l.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-500'} />
            </button>
          </header>
          {l.matches.map((m) => <MatchCard key={m.id} match={m} />)}
        </section>
      ))}
    </div>
  )
}
