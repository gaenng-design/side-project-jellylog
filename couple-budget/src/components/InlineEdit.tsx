import { useEffect, useRef, useState } from 'react'
import { PRIMARY_LIGHT } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'

interface InlineEditProps {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  formatter?: (v: string) => string
  align?: 'left' | 'right'
  inputWidth?: string | number
  disabled?: boolean
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  type = 'text',
  formatter,
  align = 'left',
  inputWidth,
  disabled,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (type === 'number' && (trimmed === '' || !Number.isFinite(Number(trimmed)))) {
      setDraft(value)
      return
    }
    if (draft !== value) onSave(draft)
  }

  if (disabled) {
    return (
      <span style={{ fontSize: 13, color: JELLY.text, textAlign: align, display: 'block' }}>
        {formatter ? formatter(value) : value || placeholder}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        type={type}
        style={{
          width: inputWidth ?? '100%',
          fontSize: 13,
          border: `1px solid rgba(255,255,255,0.55)`,
          borderRadius: JELLY.radiusControl,
          padding: '4px 10px',
          outline: 'none',
          textAlign: align,
          color: JELLY.text,
          background: PRIMARY_LIGHT,
          backdropFilter: JELLY.blur,
          WebkitBackdropFilter: JELLY.blur,
          fontFamily: 'inherit',
          boxShadow: 'inset 0 1px 6px rgba(255,255,255,0.35)',
        }}
      />
    )
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      title="더블클릭하여 수정"
      style={{
        fontSize: 13,
        color: JELLY.text,
        cursor: 'text',
        textAlign: align,
        display: 'block',
        borderRadius: JELLY.radiusControl,
        padding: '2px 4px',
        minWidth: 20,
      }}
    >
      {formatter ? formatter(value) : value || <span style={{ color: JELLY.textMuted }}>{placeholder}</span>}
    </span>
  )
}
