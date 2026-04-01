import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const BREAKPOINT_MAX = 600
const MQ = `(max-width: ${BREAKPOINT_MAX}px)`

function readNarrow(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MQ).matches
}

const NarrowLayoutContext = createContext(false)

export function NarrowLayoutProvider({ children }: { children: ReactNode }) {
  const [narrow, setNarrow] = useState(readNarrow)

  useEffect(() => {
    const mq = window.matchMedia(MQ)
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return <NarrowLayoutContext.Provider value={narrow}>{children}</NarrowLayoutContext.Provider>
}

/** 뷰포트 너비 600px 이하 */
export function useNarrowLayout(): boolean {
  return useContext(NarrowLayoutContext)
}

export const NARROW_LAYOUT_MAX_WIDTH = BREAKPOINT_MAX
