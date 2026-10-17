import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'football-favorites-v1'
const empty = { leagues: [], teams: [] }
const Ctx = createContext(null)

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return { leagues: v?.leagues ?? [], teams: v?.teams ?? [] }
  } catch {
    return empty
  }
}

export function FavoritesProvider({ children }) {
  const [fav, setFav] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(fav)) } catch { /* storage unavailable */ }
  }, [fav])

  const toggle = useCallback((kind, id) =>
    setFav((f) => ({
      ...f,
      [kind]: f[kind].includes(id) ? f[kind].filter((x) => x !== id) : [...f[kind], id],
    })), [])

  const value = useMemo(() => ({
    fav,
    toggleLeague: (id) => toggle('leagues', id),
    toggleTeam: (id) => toggle('teams', id),
    isLeagueFav: (id) => fav.leagues.includes(id),
    isTeamFav: (id) => fav.teams.includes(id),
  }), [fav, toggle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useFavorites = () => useContext(Ctx)
