import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 cursor-pointer
          hover:border-gray-300 transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500
          dark:bg-white/5 dark:border-white/10 dark:text-gray-100 dark:hover:border-white/20 dark:focus:ring-green-400/30 dark:focus:border-green-400
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
