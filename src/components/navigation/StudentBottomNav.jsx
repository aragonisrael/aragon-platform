import { Home, ShoppingBag, ClipboardList, User, Bell } from 'lucide-react'

const tabs = [
  { id: 'home', label: 'בית', Icon: Home },
  { id: 'shop', label: 'חנות', Icon: ShoppingBag },
  { id: 'missions', label: 'משימות', Icon: ClipboardList },
  { id: 'profile', label: 'פרופיל', Icon: User },
  { id: 'updates', label: 'עדכונים', Icon: Bell },
]

export default function StudentBottomNav({ active, onChange }) {
  return (
    <nav className="student-bottom-nav relative z-50 shrink-0 border-t border-violet-500/50 bg-[rgba(10,3,28,0.97)] px-1 pb-4 pt-2.5">
      <div className="mx-auto flex max-w-md justify-around">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-2.5 py-1.5 transition ${
                isActive
                  ? 'border-violet-300/55 bg-gradient-to-b from-violet-600/25 to-indigo-600/15 shadow-[0_0_14px_rgba(124,58,237,0.3)]'
                  : 'border-transparent bg-transparent hover:bg-violet-600/15'
              }`}
            >
              <Icon
                className={`h-6 w-6 ${isActive ? 'text-violet-200' : 'text-gray-500'}`}
                strokeWidth={isActive ? 2.25 : 1.75}
                aria-hidden
              />
              <span
                className={`font-['Orbitron',sans-serif] text-[7.5px] uppercase tracking-wide ${
                  isActive ? 'text-violet-200' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
