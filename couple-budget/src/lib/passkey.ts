/**
 * Face ID / 지문 등 기기 생체 인증(WebAuthn 패스키)으로 화면 잠금을 푸는 도우미.
 * 서버 없이 이 기기에서만 확인하는 방식이라, 비밀번호를 대신하는 "편한 열기" 용도다.
 * 등록한 자격 증명 id 는 이 기기(localStorage)에만 저장된다.
 */
const KEY = 'couple-budget:passkey-id'

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const challenge = () => crypto.getRandomValues(new Uint8Array(32))

export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials) return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function hasRegisteredBiometric(): boolean {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export function clearBiometric() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}

/** 이 기기에 Face ID 등록 — 성공하면 true */
export async function registerBiometric(): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge(),
        rp: { name: '부부 가계부' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'couple-budget', displayName: '부부 가계부' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null
    if (!cred) return false
    localStorage.setItem(KEY, toB64(cred.rawId))
    return true
  } catch {
    return false
  }
}

/** Face ID 로 확인 — 성공하면 true (취소·실패는 false) */
export async function verifyBiometric(): Promise<boolean> {
  try {
    const id = localStorage.getItem(KEY)
    if (!id) return false
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        allowCredentials: [{ type: 'public-key', id: fromB64(id) }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!res
  } catch {
    return false
  }
}
