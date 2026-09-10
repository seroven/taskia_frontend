import logo from '../assets/logo.png'

type BrandLockupProps = {
  size?: 'sm' | 'md'
}

export function BrandLockup({ size = 'sm' }: BrandLockupProps) {
  return (
    <p className={`brand brand-lockup brand-lockup-${size}`}>
      <img src={logo} alt="" width={size === 'md' ? 40 : 28} height={size === 'md' ? 40 : 28} />
      Taskia
    </p>
  )
}
