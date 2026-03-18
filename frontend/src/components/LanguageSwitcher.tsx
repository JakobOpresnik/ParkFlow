import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', flag: '/united_kingdom.svg', label: 'English' },
  { code: 'sl', flag: '/slovenia.svg', label: 'Slovenščina' },
] as const

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map(({ code, flag, label }) => {
        const isActive = i18n.language === code
        return (
          <button
            key={code}
            onClick={() => void i18n.changeLanguage(code)}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={`flex size-7 cursor-pointer items-center justify-center rounded transition-all ${
              isActive ? 'opacity-100' : 'opacity-30 hover:opacity-60'
            }`}
          >
            <img src={flag} alt={label} className="size-4 rounded-[2px]" />
          </button>
        )
      })}
    </div>
  )
}
