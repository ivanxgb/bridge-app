interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-[#238636] hover:bg-[#2ea043] text-white',
    danger: 'bg-[#da3633]/10 border border-[#f85149]/30 text-[#f85149] hover:bg-[#da3633]/20',
    ghost: 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d]/50',
  }
  return (
    <button
      className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
