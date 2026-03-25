import { useEffect } from 'react'
import { useAppStore, YEAR_PICKER_MIN } from '@/store/useAppStore'
import { PRIMARY } from '@/styles/formControls'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

interface MonthPickerProps {
  onBeforeChange?: (ym: string) => boolean | void
}

export function MonthPicker({ onBeforeChange }: MonthPickerProps) {
  const { currentYearMonth, setYearMonth } = useAppStore()
  const [year, month] = currentYearMonth.split('-').map(Number)

  const trySetYearMonth = (ym: string) => {
    if (onBeforeChange && onBeforeChange(ym) === false) return
    setYearMonth(ym)
  }

  const setYear = (y: number) => trySetYearMonth(`${y}-${String(month).padStart(2, '0')}`)
  const setMonth = (m: number) => trySetYearMonth(`${year}-${String(m).padStart(2, '0')}`)

  useEffect(() => {
    if (year >= YEAR_PICKER_MIN) return
    const ym = `${YEAR_PICKER_MIN}-${String(month).padStart(2, '0')}`
    if (onBeforeChange && onBeforeChange(ym) === false) return
    setYearMonth(ym)
  }, [year, month, onBeforeChange, setYearMonth])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <YearSelectDropdown variant="dark" value={year} onChange={setYear} />
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: '#fff',
          borderRadius: 999,
          padding: '4px',
          border: '1px solid #e8ecf1',
        }}
      >
        {MONTHS.map((label, i) => {
          const m = i + 1
          const active = m === month
          return (
            <button
              key={m}
              onClick={() => setMonth(m)}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                border: 'none',
                background: active ? PRIMARY : 'transparent',
                color: active ? '#fff' : '#8a99ae',
                fontSize: 12,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
