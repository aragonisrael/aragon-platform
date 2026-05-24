import {
  Home,
  Calendar,
  Users,
  Trophy,
  Bell,
  ListChecks,
  UserCircle,
} from 'lucide-react'

const tabs = [
  { id: 'home', label: 'בית', Icon: Home },
  { id: 'schedule', label: 'לו"ז', Icon: Calendar },
  { id: 'groups', label: 'קבוצות', Icon: Users },
  { id: 'benefits', label: 'הטבות', Icon: Trophy },
  { id: 'updates', label: 'עדכונים', Icon: Bell },
  { id: 'task', label: 'משימות', Icon: ListChecks },
  { id: 'profile', label: 'פרופיל', Icon: UserCircle },
]

export default function InstructorBottomNav({ active, onChange }) {
  return (
    <nav className="instructor-bottom-nav relative z-50 shrink-0 border-t border-[#14142a] bg-[#060610] px-0.5 pb-5 pt-2">
      <div className="mx-auto flex max-w-md justify-around">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex min-w-[40px] flex-col items-center gap-0.5 rounded-lg px-1 py-1 transition ${
                isActive ? 'bg-violet-600/12' : 'hover:bg-violet-600/8'
              }`}
            >
              <Icon
                className={`h-[19px] w-[19px] ${isActive ? 'text-violet-400' : 'text-[#2e2e4e]'}`}
                strokeWidth={isActive ? 2.25 : 1.75}
                aria-hidden
              />
              <span
                className={`text-[9px] tracking-wide ${isActive ? 'text-violet-400' : 'text-[#2e2e4e]'}`}
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
