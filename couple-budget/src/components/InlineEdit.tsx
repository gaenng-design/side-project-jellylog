import { useEffect, useRef, useState } from 'react'
import { PRIMARY, PRIMARY_LIGHT } from '@/styles/formControls'

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
    if (draft !== value) onSave(draft)
  }

  if (disabled) {
    return (
      <span style={{ fontSize: 13, color: '#232d3c', textAlign: align, display: 'block' }}>
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
          border: `1px solid ${PRIMARY}`,
          borderRadius: 6,
          padding: '2px 6px',
          outline: 'none',
          textAlign: align,
          color: '#111827',
          background: PRIMARY_LIGHT,
          fontFamily: 'inherit',
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
        color: '#232d3c',
        cursor: 'text',
        textAlign: align,
        display: 'block',
        borderRadius: 4,
        padding: '2px 4px',
        minWidth: 20,
      }}
    >
      {formatter ? formatter(value) : value || <span style={{ color: '#b0bac8' }}>{placeholder}</span>}
    </span>
  )
}
