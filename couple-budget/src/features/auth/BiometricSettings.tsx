import { useEffect, useState } from 'react'
import { DS } from '@/design-system/tokens'
import { Switch } from '@/design-system/components/Switch'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { settingsSectionCardWithBleedTitleStyle, settingsSectionTitleWrapForViewport } from '@/styles/formControls'
import { clearBiometric, hasRegisteredBiometric, isBiometricSupported, registerBiometric } from '@/lib/passkey'

/** 설정 화면: 이 기기에서 Face ID(생체 인증)로 열기 켜기/끄기 */
export function BiometricSettings() {
  const narrow = useNarrowLayout()
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(hasRegisteredBiometric)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void isBiometricSupported().then(setSupported)
  }, [])

  const toggle = async (next: boolean) => {
    setMsg('')
    if (!next) {
      clearBiometric()
      setOn(false)
      return
    }
    const ok = await registerBiometric()
    setOn(ok)
    setMsg(ok ? '등록됐어요. 다음부터 Face ID로 열 수 있어요.' : '등록하지 못했어요. 다시 시도해 주세요.')
  }

  return (
    <div style={settingsSectionCardWithBleedTitleStyle}>
      <div style={settingsSectionTitleWrapForViewport(narrow)}>
        <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary }}>Face ID로 열기</div>
      </div>
      {supported ? (
        <>
          <Switch checked={on} onChange={toggle} label={<span style={{ fontSize: DS.font.size.body }}>이 기기에서 Face ID(생체 인증)로 열기</span>} />
          <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginTop: 8, lineHeight: 1.5 }}>
            기기마다 따로 등록해요. 인증이 안 되면 비밀번호로 열 수 있어요.
          </div>
          {msg && <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.body, marginTop: 6 }}>{msg}</div>}
        </>
      ) : (
        <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted }}>이 기기·브라우저에서는 생체 인증을 쓸 수 없어요.</div>
      )}
    </div>
  )
}
