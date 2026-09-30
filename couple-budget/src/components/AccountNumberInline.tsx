import { useEffect, useState } from 'react'
import { JELLY } from '@/styles/jellyGlass'
import { DS } from '@/design-system/tokens'

interface AccountNumberInlineProps {
  value: string | undefined
  onCommit: (next: string | undefined) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * 행 컨테이너 하단(footerSlot)에 렌더되는 계좌번호 인라인 입력.
 * - 체크박스 토글로 인풋 표시 여부 제어
 * - 값이 있으면 자동으로 펼친 상태로 시작
 * - blur · Enter 시 커밋, 빈 값 → undefined 로 제거
 */
export function AccountNumberInline({
  value,
  onCommit,
  disabled,
  placeholder = '예: 우리 1002-123-456789',
}: AccountNumberInlineProps) {
  const [draft, setDraft] = useState(value ?? '')
  const [expanded, setExpanded] = useState<boolean>(!!(value && value.trim()))

  useEffect(() => {
    setDraft(value ?? '')
    if (value && value.trim()) setExpanded(true)
  }, [value])

  const commit = (override?: string) => {
    if (disabled) return
    const raw = override ?? draft
    const next = raw.trim()
    const cur = (value ?? '').trim()
    if (next === cur) return
    onCommit(next || undefined)
  }

  const toggleExpanded = () => {
    if (disabled) return
    const turningOff = expanded
    if (turningOff) {
      // 체크 해제 시: 저장된 계좌번호가 있으면 비움
      setDraft('')
      commit('')
      setExpanded(false)
    } else {
      setExpanded(true)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 6,
        marginTop: 4,
        borderTop: '1px dashed rgba(0,0,0,0.06)',
        fontSize: DS.font.size.caption,
      }}
    >
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: disabled ? 'default' : 'pointer',
          color: DS.color.text.secondary,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={expanded}
          onChange={toggleExpanded}
          disabled={disabled}
          style={{ width: 14, height: 14, cursor: disabled ? 'default' : 'pointer', margin: 0 }}
        />
        계좌번호 <span style={{ color: DS.color.text.muted }}>(선택)</span>
      </label>
      {expanded && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          disabled={disabled}
          autoFocus={!value}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 140,
            height: 28,
            padding: '0 10px',
            borderRadius: JELLY.radiusControl,
            border: `1px solid ${DS.color.border.subtle}`,
            background: DS.color.bg.secondary,
            fontSize: DS.font.size.caption,
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            opacity: disabled ? 0.6 : 1,
          }}
        />
      )}
    </div>
  )
}
