import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * 글자 크기는 DS.font.size 토큰(caption 12 · body 14 · subtitle 16 · title 20 · headline 24)만 쓴다.
 * 화면 코드에 fontSize 숫자를 직접 쓰면 이 테스트가 실패한다. (32px 이상은 이모지·아이콘 크기로 허용)
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) out.push(p)
  }
  return out
}

describe('타이포그래피 토큰', () => {
  it('fontSize 숫자를 직접 쓰지 않는다', () => {
    const root = path.resolve(__dirname, '..')
    const tokensFile = path.join(root, 'design-system', 'tokens.ts')
    const offenders: string[] = []
    for (const file of walk(root)) {
      if (file === tokensFile) continue
      const lines = fs.readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        const styleExpr = line.match(/fontSize: ([^,}]+)/)
        const literals: string[] = styleExpr ? (styleExpr[1].match(/(?<![\w.])\d+(?:\.\d+)?(?![\w.%])/g) ?? []) : []
        const attr = line.match(/fontSize=(?:"(\d+(?:\.\d+)?)"|\{(\d+(?:\.\d+)?)\})/)
        if (attr) literals.push(attr[1] ?? attr[2])
        if (literals.some((n) => Number(n) < 32)) offenders.push(`${path.relative(root, file)}:${i + 1}  ${line.trim().slice(0, 80)}`)
      })
    }
    expect(offenders).toEqual([])
  })
})
