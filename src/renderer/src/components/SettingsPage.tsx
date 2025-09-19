import { useId, type ReactNode } from 'react'

type SettingsPageProps = {
  isLoggingEnabled: boolean
  onLoggingChange: (value: boolean) => void
  onClose: () => void
  headerSlot?: ReactNode
}

const SettingsPage = ({ isLoggingEnabled, onLoggingChange, onClose, headerSlot }: SettingsPageProps) => {
  const loggingToggleId = useId()

  return (
    <div className="flex w-full flex-1 justify-center overflow-y-auto px-6 py-10">
      <div className="flex w-full max-w-xl flex-col gap-6 rounded-lg border border-slate-800 bg-slate-900/95 p-6 text-slate-200 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-slate-400">Tune Omni Electron without leaving the app.</p>
          </div>
          <div className="flex items-center gap-3">
            {headerSlot}
            <button
              type="button"
              className="rounded-md px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <section className="space-y-4 rounded-md border border-slate-800/80 bg-slate-900/80 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Diagnostics</h3>
          <div className="flex items-start gap-3 text-sm">
            <input
              id={loggingToggleId}
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              checked={isLoggingEnabled}
              onChange={(event) => onLoggingChange(event.target.checked)}
            />
            <label htmlFor={loggingToggleId} className="flex flex-col">
              <span>Enable debug logging</span>
              <span className="text-xs text-slate-400">When enabled, additional diagnostic messages are written to the developer console.</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
