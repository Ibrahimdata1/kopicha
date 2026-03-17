// Validate Thai PromptPay ID (phone or citizen/tax ID)

export function validatePromptPay(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  if (!digits) return 'กรุณากรอกหมายเลข PromptPay'

  if (digits.length === 10) {
    // Phone number: must start with 0
    if (!digits.startsWith('0')) {
      return 'เบอร์โทรต้องขึ้นต้นด้วย 0'
    }
    // Must start with valid Thai mobile prefixes (06, 08, 09) or landline (02-05)
    const prefix2 = digits.substring(0, 2)
    if (!['06', '08', '09', '02', '03', '04', '05'].includes(prefix2)) {
      return 'เบอร์โทรไม่ถูกต้อง (ต้องขึ้นต้นด้วย 06, 08, 09 สำหรับมือถือ หรือ 02-05 สำหรับบ้าน)'
    }
    return null // valid
  }

  if (digits.length === 13) {
    // Citizen ID / Tax ID: validate checksum (mod 11)
    if (digits === '0000000000000') {
      return 'เลขบัตรประชาชนไม่ถูกต้อง'
    }
    // Thai citizen ID checksum: multiply each of first 12 digits by (13-position), sum, mod 11
    // Check digit = (11 - (sum mod 11)) mod 10
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * (13 - i)
    }
    const checkDigit = (11 - (sum % 11)) % 10
    if (checkDigit !== parseInt(digits[12])) {
      return 'เลขบัตรประชาชน/นิติบุคคลไม่ถูกต้อง (checksum ผิด)'
    }
    return null // valid
  }

  return 'PromptPay ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน/นิติบุคคล 13 หลัก'
}
