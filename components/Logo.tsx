interface LogoProps {
  size?: number
  className?: string
}

export default function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded square */}
      <rect width="32" height="32" rx="8" fill="#0d9488" />

      {/* QR finder pattern - top left */}
      <rect x="5" y="5" width="9" height="9" rx="2" fill="white" />
      <rect x="7" y="7" width="5" height="5" rx="1" fill="#0d9488" />
      <rect x="8.5" y="8.5" width="2" height="2" rx="0.5" fill="white" />

      {/* QR finder pattern - top right */}
      <rect x="18" y="5" width="9" height="9" rx="2" fill="white" />
      <rect x="20" y="7" width="5" height="5" rx="1" fill="#0d9488" />
      <rect x="21.5" y="8.5" width="2" height="2" rx="0.5" fill="white" />

      {/* QR finder pattern - bottom left */}
      <rect x="5" y="18" width="9" height="9" rx="2" fill="white" />
      <rect x="7" y="20" width="5" height="5" rx="1" fill="#0d9488" />
      <rect x="8.5" y="21.5" width="2" height="2" rx="0.5" fill="white" />

      {/* Bottom right - arrow/scan indicator */}
      <path d="M19 22.5L24.5 22.5M24.5 22.5L22 20M24.5 22.5L22 25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Small data dots */}
      <rect x="15" y="6.5" width="1.5" height="1.5" rx="0.5" fill="white" opacity="0.6" />
      <rect x="15" y="11" width="1.5" height="1.5" rx="0.5" fill="white" opacity="0.6" />
      <rect x="6.5" y="15" width="1.5" height="1.5" rx="0.5" fill="white" opacity="0.6" />
      <rect x="11" y="15" width="1.5" height="1.5" rx="0.5" fill="white" opacity="0.6" />
    </svg>
  )
}
