import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-emerald-400">
          <Trophy size={22} /> Football Live
        </Link>
      </div>
    </header>
  )
}
