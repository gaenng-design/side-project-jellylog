import { useState } from 'react'
import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import { Modal } from '@/components/Modal'
import { jellyInputSurface } from '@/styles/jellyGlass'
import { PRIMARY, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import { CATEGORY_COLORS, resolveCategoryColor } from '@/lib/categoryColors'

interface CategoryManagerModalProps {
  open: boolean
  onClose: () => void
}

export function CategoryManagerModal({ open, onClose }: CategoryManagerModalProps) {
  const categories = useSharedExpenseStore((s) => s.categories)
  const categoryColors = useSharedExpenseStore((s) => s.categoryColors)
  const addCategory = useSharedExpenseStore((s) => s.addCategory)
  const removeCategory = useSharedExpenseStore((s) => s.removeCategory)
  const renameCategory = useSharedExpenseStore((s) => s.renameCategory)
  const reorderCategory = useSharedExpenseStore((s) => s.reorderCategory)
  const setCategoryColor = useSharedExpenseStore((s) => s.setCategoryColor)

  const [newName, setNewName] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null)

  // 드래그앤드롭 상태
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    const ok = addCategory(name)
    if (!ok) {
      setError(`'${name}' 카테고리가 이미 존재합니다`)
      return
    }
    setError(null)
    setNewName('')
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(categories[idx])
    setError(null)
    setColorPickerIdx(null)
  }

  const commitEdit = () => {
    if (editingIdx == null) return
    const oldName = categories[editingIdx]
    const newVal = editValue.trim()
    if (!newVal || oldName === newVal) {
      setEditingIdx(null)
      return
    }
    const ok = renameCategory(oldName, newVal)
    if (!ok) {
      setError(`'${newVal}' 카테고리가 이미 존재합니다`)
      return
    }
    setError(null)
    setEditingIdx(null)
  }

  const handleDelete = (name: string) => {
    if (!window.confirm(`'${name}' 카테고리를 삭제하시겠습니까?`)) return
    removeCategory(name)
  }

  // 드래그앤드롭 핸들러
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggingIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingIdx == null || draggingIdx === idx) return
    setDragOverIdx(idx)
  }

  const handleDragLeave = () => {
    setDragOverIdx(null)
  }

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (draggingIdx == null || draggingIdx === idx) {
      setDraggingIdx(null)
      setDragOverIdx(null)
      return
    }
    reorderCategory(draggingIdx, idx)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <Modal open={open} title="카테고리 관리" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 카테고리 리스트 (카드 형태) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 400,
            overflowY: 'auto',
            padding: '2px',
          }}
        >
          {categories.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: 12,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
              }}
            >
              카테고리가 없습니다. 아래에서 추가해주세요.
            </div>
          ) : (
            categories.map((cat, idx) => {
              const isEditing = editingIdx === idx
              const isDragging = draggingIdx === idx
              const isDragOver = dragOverIdx === idx
              const isPickerOpen = colorPickerIdx === idx
              const currentColor = resolveCategoryColor(cat, categoryColors)
              return (
                <div key={`${cat}-${idx}`}>
                  <div
                    draggable={!isEditing}
                    onDragStart={handleDragStart(idx)}
                    onDragOver={handleDragOver(idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      background: isEditing
                        ? 'rgba(79, 140, 255, 0.04)'
                        : isDragOver
                          ? 'rgba(79, 140, 255, 0.08)'
                          : '#fff',
                      opacity: isDragging ? 0.4 : 1,
                      cursor: isEditing ? 'auto' : 'grab',
                      transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                      borderRadius: isPickerOpen ? '12px 12px 0 0' : 12,
                      border: `1px solid ${isDragOver ? PRIMARY : '#e5e7eb'}`,
                      borderBottom: isPickerOpen ? '1px solid #f3f4f6' : undefined,
                      boxShadow: isDragging
                        ? '0 4px 12px rgba(79, 140, 255, 0.15)'
                        : '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* 드래그 핸들 */}
                    <div
                      role="button"
                      aria-roledescription="sortable"
                      title="드래그하여 순서 변경"
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        padding: '4px 2px',
                        cursor: isEditing ? 'auto' : 'grab',
                        color: '#d1d5db',
                        fontSize: 16,
                        lineHeight: 1,
                        userSelect: 'none',
                        fontWeight: 700,
                      }}
                    >
                      ⋮
                    </div>

                    {/* 카테고리 칩 (실제 사용 모습 - 클릭 → 색상 팔레트 토글) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setColorPickerIdx(isPickerOpen ? null : idx)
                      }}
                      title="클릭하여 색상 변경"
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: currentColor.fg,
                        background: currentColor.bg,
                        padding: '4px 12px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        border: isPickerOpen ? `1.5px solid ${currentColor.fg}` : '1.5px solid transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'border-color 0.15s ease',
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cat}
                    </button>

                    {/* 이름 편집 input (편집 중일 때만) */}
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingIdx(null)
                        }}
                        style={{
                          flex: 1,
                          height: 32,
                          padding: '0 10px',
                          borderRadius: 6,
                          border: `1.5px solid ${PRIMARY}`,
                          fontSize: 13,
                          outline: 'none',
                          background: '#fff',
                          fontFamily: 'inherit',
                        }}
                      />
                    ) : (
                      <>
                        {/* 이름 수정 버튼 (칩 바로 옆) */}
                        <button
                          type="button"
                          onClick={() => startEdit(idx)}
                          title="이름 수정"
                          style={{
                            flexShrink: 0,
                            width: 28,
                            height: 28,
                            border: 'none',
                            background: 'transparent',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          ✏️
                        </button>
                        <div style={{ flex: 1 }} />
                      </>
                    )}

                    {/* 삭제 버튼 (항상 우측 끝) */}
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #fca5a5',
                        background: '#fff',
                        color: '#ef4444',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  {/* 색상 팔레트 (실제 카테고리 칩 미리보기) */}
                  {isPickerOpen && (
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderTop: 'none',
                        borderRadius: '0 0 12px 12px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      {CATEGORY_COLORS.map((color, colorIdx) => {
                        // 사용자가 명시적으로 선택했거나, fallback이 우연히 일치하는 색상
                        const selected =
                          categoryColors[cat] === colorIdx ||
                          (categoryColors[cat] == null && currentColor.fg === color.fg)
                        return (
                          <button
                            key={colorIdx}
                            type="button"
                            onClick={() => {
                              setCategoryColor(cat, colorIdx)
                              setColorPickerIdx(null)
                            }}
                            title={`색상 ${colorIdx + 1}`}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: color.fg,
                              background: color.bg,
                              padding: '5px 14px',
                              borderRadius: 999,
                              whiteSpace: 'nowrap',
                              border: selected
                                ? `1.5px solid ${color.fg}`
                                : '1.5px solid transparent',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'transform 0.1s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 새 카테고리 추가 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 카테고리 이름 (예: 여가비)"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{
              flex: 1,
              height: 40,
              padding: '0 12px',
              borderRadius: INPUT_BORDER_RADIUS,
              fontSize: INPUT_FONT_SIZE,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              ...jellyInputSurface,
              color: '#232d3c',
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: INPUT_BORDER_RADIUS,
              border: 'none',
              background: newName.trim() ? PRIMARY : '#e5e7eb',
              color: newName.trim() ? '#fff' : '#9ca3af',
              fontSize: 13,
              fontWeight: 600,
              cursor: newName.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            + 추가
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 12,
              border: '1px solid #fca5a5',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: PRIMARY,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          완료
        </button>
      </div>
    </Modal>
  )
}
