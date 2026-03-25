/** 리포지토리 어댑터 저장(create/update/remove) 결과를 콘솔에 남김 (디버그용) */
export function logAdapterOnSave(
  tableOrRepoKey: string,
  op: 'create' | 'update' | 'remove',
  success: boolean,
  detail?: string
): void {
  const mark = success ? 'OK' : 'FAIL'
  const extra = detail != null && detail !== '' ? ` | ${detail}` : ''
  console.log(`[repo-save] ${tableOrRepoKey} | ${op} | ${mark}${extra}`)
}
