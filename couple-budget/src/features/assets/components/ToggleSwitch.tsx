import { Switch } from '@/design-system/components'

/** 자산 탭 토글 — 공용 Switch 에 켜짐/꺼짐 문구를 붙인 것 */
export const ToggleSwitch = ({
  checked,
  onChange,
  onLabel = '🔒 만기까지 묶인 자산',
  offLabel = '해제',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  onLabel?: string
  offLabel?: string
}) => <Switch checked={checked} onChange={onChange} label={checked ? onLabel : offLabel} />
