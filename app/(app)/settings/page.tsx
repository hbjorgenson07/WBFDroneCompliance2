import SettingsForm from '@/components/SettingsForm'

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Set your default operator and aircraft info. These values auto-fill when you create a new spray log.
      </p>
      <SettingsForm />
    </div>
  )
}
