import * as XLSX from 'xlsx'
import { GIFT_RELATION_LIST } from '@/lib/weddingGiftImport'

/** 축의금 입력 양식(xlsx) 내려받기 — 데이터 시트 + 작성 안내 시트 */
export function downloadGiftTemplate(names: { A: string; B: string }) {
  const head = ['받은 쪽', '이름', '관계', '금액', '참석', '답례', '메모']
  const data = [
    head,
    [`(예시) ${names.A}`, '(예시) 홍길동', '친구', 100000, 'O', 'X', '예시 줄은 가져올 때 자동으로 제외돼요'],
    [`(예시) ${names.B}`, '(예시) 김영희', '가족·친척', 300000, 'O', 'O', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 36 }]

  const guide = [
    ['작성 안내'],
    [''],
    ['열', '입력 방법'],
    ['받은 쪽', `${names.A} / ${names.B} (뒤에 "측"을 붙여도 돼요). 신랑·신부, A·B로 써도 인식해요`],
    ['이름', '보낸 분 이름 (필수)'],
    ['관계', `${GIFT_RELATION_LIST.join(' / ')} — 자유롭게 적어도 "동창→친구", "팀장→직장"처럼 자동으로 분류해요`],
    ['금액', '100000 / 100,000원 / 10만 / 10만원 모두 가능'],
    ['참석', 'O 또는 X (비우면 참석)'],
    ['답례', 'O 또는 X (비우면 답례 전)'],
    ['메모', '자유롭게 (선택)'],
    [''],
    ['※ 이름이 "(예시)"로 시작하는 줄은 가져올 때 제외돼요. 데이터는 "축의금" 시트에 입력하세요.'],
  ]
  const wsGuide = XLSX.utils.aoa_to_sheet(guide)
  wsGuide['!cols'] = [{ wch: 12 }, { wch: 80 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '축의금')
  XLSX.utils.book_append_sheet(wb, wsGuide, '안내')
  XLSX.writeFile(wb, '축의금_입력양식.xlsx')
}

/** 업로드한 파일의 첫 번째 시트(또는 "축의금" 시트)를 2차원 배열로 읽기 */
export async function readGiftFile(file: File): Promise<unknown[][]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames.includes('축의금') ? '축의금' : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: true })
}
