import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import MatchDetails from './pages/MatchDetails'
import { FavoritesProvider } from './hooks/useFavorites'

export default function App() {
  return (
    <FavoritesProvider>
      <Navbar />
      <main className="mx-auto max-w-4xl px-3 pb-16 pt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/match/:id" element={<MatchDetails />} />
        </Routes>
      </main>
    </FavoritesProvider>
  )
}
