// EMV QR Code for PromptPay (Thailand)
// Reference: BOT Thai QR Payment Standard

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

function formatPhoneForPromptPay(phone: string): string {
  const stripped = phone.replace(/\D/g, '')
  if (stripped.startsWith('0')) {
    return '0066' + stripped.substring(1)
  }
  return '0066' + stripped
}

function formatTaxIdForPromptPay(taxId: string): string {
  return taxId.replace(/\D/g, '').padStart(13, '0')
}

function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function generatePromptPayPayload(
  promptPayId: string,
  amount: number
): string {
  if (!promptPayId || !promptPayId.trim()) throw new Error('PromptPay ID is required')

  const digits = promptPayId.replace(/\D/g, '')
  if (digits.length !== 10 && digits.length !== 13) {
    throw new Error('PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก หรือเลขประจำตัวผู้เสียภาษี 13 หลัก')
  }

  if (amount <= 0) throw new Error('Amount must be greater than 0')
  if (amount > 999999) throw new Error('Amount must not exceed 999,999')

  // Round to 2 decimal places to avoid floating-point precision issues
  const roundedAmount = Math.round(amount * 100) / 100

  const isPhone = digits.length <= 10

  const aid = tlv('00', 'A000000677010111')
  let accountInfo: string
  if (isPhone) {
    accountInfo = aid + tlv('01', formatPhoneForPromptPay(promptPayId))
  } else {
    accountInfo = aid + tlv('02', formatTaxIdForPromptPay(promptPayId))
  }

  let payload = ''
  payload += tlv('00', '01')
  payload += tlv('01', '12')
  payload += tlv('29', accountInfo)
  payload += tlv('53', '764')
  payload += tlv('54', roundedAmount.toFixed(2))
  payload += tlv('58', 'TH')
  payload += tlv('62', tlv('05', generateQRReference()))

  payload += '6304'
  const checksum = crc16(payload)
  payload += checksum

  return payload
}

export function generateQRReference(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `${timestamp}${random}`.toUpperCase()
}

export function buildOrderUrl(sessionId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim().replace(/\/$/, '')
  return `${base}/order?session=${encodeURIComponent(sessionId)}`
}
