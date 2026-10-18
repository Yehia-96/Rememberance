import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

type Props = {
  title: ReactNode
  /** Show a back button (goes back in history, or to `backTo` if given). */
  back?: boolean | string
  left?: ReactNode
  right?: ReactNode
}

export default function TopBar({ title, back, left, right }: Props) {
  const navigate = useNavigate()
  return (
    <header className="topbar">
      <div className="topbar-side">
        {left ??
          (back ? (
            <button className="link" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}>
              ‹ Back
            </button>
          ) : null)}
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-side right">{right}</div>
    </header>
  )
}
