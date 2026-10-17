import { useMemo, useRef, useState } from 'react'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components/Button'
import { Modal } from '@/components/Modal'
import { CustomSelect } from '@/components/CustomSelect'
import { useWeddingStore } from '@/store/useWeddingStore'
import { giftKey, parseGiftRows, type ParsedGift } from '@/lib/weddingGiftImport'
import type { Side } from '@/lib/weddingSettlement'
import { downloadGiftTemplate, readGiftFile } from './weddingGiftExcel'
import { Chip, numStyle, won } from './weddingUi'

/** 엑셀로 축의금 한꺼번에 가져오기: 양식 다운로드 → 파일 선택 → 자동 분류 결과 확인 → 추가 */
export function GiftImportModal({ open, onClose, names }: { open: boolean; onClose: () => void; names: { A: string; B: string } }) {
  const gifts = useWeddingStore((s) => s.gifts)
  const addGift = useWeddingStore((s) => s.addGift)
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedGift[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [defaultSide, setDefaultSide] = useState<Side>('A')
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const existing = useMemo(() => new Set(gifts.map((g) => giftKey(g.side, g.name, g.amount))), [gifts])

  const reset = () => { setRows(null); setFileName(''); setError(''); setExcluded(new Set()) }
  const close = () => { reset(); onClose() }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const parsed = parseGiftRows(await readGiftFile(file), names)
      if (parsed.length === 0) { setError('읽을 수 있는 줄이 없어요. 양식의 "축의금" 시트에 입력했는지 확인해 주세요.'); return }
      // 이미 등록된 것과 같거나(받은 쪽·이름·금액) 파일 안에서 중복이면 기본 제외
      const seen = new Set<string>()
      const dup = new Set<number>()
      for (const g of parsed) {
        const k = giftKey(g.side ?? defaultSide, g.name, g.amount)
        if (existing.has(k) || seen.has(k)) dup.add(g.row)
        seen.add(k)
      }
      const bad = parsed.filter((g) => !g.name || g.amount <= 0).map((g) => g.row)
      setRows(parsed)
      setFileName(file.name)
      setExcluded(new Set([...dup, ...bad]))
    } catch {
      setError('파일을 읽지 못했어요. 엑셀(.xlsx, .xls) 또는 CSV 파일인지 확인해 주세요.')
    }
  }

  const sideOf = (g: ParsedGift): Side => g.side ?? defaultSide
  const importable = (rows ?? []).filter((g) => !excluded.has(g.row) && g.name && g.amount > 0)
  const unknownSide = (rows ?? []).filter((g) => g.side === null && !excluded.has(g.row)).length
  const total = importable.reduce((s, g) => s + g.amount, 0)
  const isDup = (g: ParsedGift) => existing.has(giftKey(sideOf(g), g.name, g.amount))

  const run = () => {
    for (const g of importable) {
      addGift({ side: sideOf(g), name: g.name, relation: g.relation, amount: g.amount, attended: g.attended, returned: g.returned, memo: g.memo })
    }
    close()
  }

  return (
    <Modal open={open} title="엑셀로 축의금 가져오기" onClose={close}>
      {!rows ? (
        <>
          <ol style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: DS.font.size.body, color: DS.color.text.body, lineHeight: 1.8 }}>
            <li>입력 양식을 내려받아요</li>
            <li>"축의금" 시트에 이름·금액 등을 채워요 (관계는 자유롭게 적어도 자동 분류)</li>
            <li>완성한 파일을 올리면 결과를 보여드려요</li>
          </ol>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={() => downloadGiftTemplate(names)}>① 양식 다운로드</Button>
            <Button variant="primary" onClick={() => fileRef.current?.click()}>② 파일 올리기</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          {error && <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: DS.radius.control, background: DS.color.negative.soft, color: DS.color.negative.main, fontSize: DS.font.size.caption }}>{error}</div>}
        </>
      ) : (
        <>
          <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginBottom: 8 }}>{fileName} · {rows.length}줄 읽음</div>
          {unknownSide > 0 && (
            <div style={{ padding: '10px 12px', borderRadius: DS.radius.control, background: DS.color.warning.soft, marginBottom: 12 }}>
              <div style={{ fontSize: DS.font.size.caption, color: DS.color.warning.text, marginBottom: 6 }}>받은 쪽을 알 수 없는 {unknownSide}건은 아래 쪽으로 넣어요</div>
              <CustomSelect options={[names.A, names.B]} value={defaultSide === 'A' ? names.A : names.B} onChange={(v) => setDefaultSide(v === names.A ? 'A' : 'B')} compact compactFill compactHeight={36} />
            </div>
          )}
          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${DS.color.border.subtle}`, borderRadius: DS.radius.control }}>
            {rows.map((g) => {
              const off = excluded.has(g.row)
              const dup = isDup(g)
              return (
                <label key={g.row} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderTop: `1px solid ${DS.color.border.subtle}`, opacity: off ? 0.5 : 1, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!off}
                    onChange={() => setExcluded((prev) => { const n = new Set(prev); if (n.has(g.row)) n.delete(g.row); else n.add(g.row); return n })}
                    style={{ marginTop: 3 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: DS.font.size.body, fontWeight: 600, ...numStyle }}>
                      <span>{g.name || '(이름 없음)'}</span><span>{won(g.amount)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      <Chip tone="primary">{sideOf(g) === 'A' ? names.A : names.B}측</Chip>
                      <Chip>{g.relation}</Chip>
                      {!g.attended && <Chip tone="warning">불참</Chip>}
                      {g.returned && <Chip tone="positive">답례 완료</Chip>}
                      {dup && <Chip tone="warning">이미 있는 항목?</Chip>}
                      {g.warnings.filter((w) => !w.startsWith('받은 쪽')).map((w) => <Chip key={w} tone="warning">{w}</Chip>)}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: DS.font.size.body, fontWeight: 600, ...numStyle }}>{importable.length}건 · {won(total)} 추가</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
            <Button onClick={reset}>다른 파일</Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={close}>취소</Button>
              <Button variant="primary" onClick={run} disabled={importable.length === 0}>{importable.length}건 추가</Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
