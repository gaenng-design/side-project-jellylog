import { useEffect, useRef, useState } from 'react'

/**
 * 대시보드 그래프용 툴팁 활성화 훅.
 * - PC: hover (mouseenter/leave) 로 활성/해제
 * - 모바일: 클릭으로 토글, 외부 클릭 시 해제
 *
 * 사용:
 *   const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()
 *   <svg ref={svgRef} ...>
 *     <rect onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setClick(i)} ... />
 *     {activeIdx === i && <g>...tooltip...</g>}
 *   </svg>
 */
export function useChartTooltip() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  /** click 으로 고정된 활성 상태 — hover로 덮어쓰기 방지 */
  const stickyRef = useRef(false)

  useEffect(() => {
    if (activeIdx === null) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (svgRef.current && svgRef.current.contains(target)) return
      stickyRef.current = false
      setActiveIdx(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [activeIdx])

  const setHover = (i: number | null) => {
    // 클릭으로 고정된 경우 hover로 덮어쓰지 않음
    if (stickyRef.current) return
    setActiveIdx(i)
  }

  const setClick = (i: number) => {
    if (stickyRef.current && activeIdx === i) {
      // 같은 항목 다시 클릭 → 해제
      stickyRef.current = false
      setActiveIdx(null)
      return
    }
    stickyRef.current = true
    setActiveIdx(i)
  }

  return { activeIdx, svgRef, setHover, setClick }
}
