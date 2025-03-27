import { useState, useEffect } from 'react'
import { SettingsManager, Settings } from '../settingsManager'

export function useSettingsManager() {
  const [settingsManager] = useState(() => new SettingsManager())
  const [settings, setSettings] = useState<Settings>({
    blenderPath: '',
    parameters: {},
    uiState: {
      logFilters: {
        showInfo: true,
        showWarning: true,
        showError: true,
        detailLevel: 1,
      },
      activePreset: 'default',
    }
  })

  useEffect(() => {
    const initSettings = async () => {
      await settingsManager.init()
      setSettings({
        blenderPath: settingsManager.getBlenderPath(),
        parameters: settingsManager.getParameters(),
        uiState: settingsManager.getUIState(),
        lastBlenderVersion: settingsManager.getSetting('lastBlenderVersion')
      })
    }

    initSettings()
  }, [])

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    
    // Aggiorna le singole impostazioni nel SettingsManager
    if (newSettings.blenderPath !== undefined) {
      await settingsManager.setBlenderPath(newSettings.blenderPath)
    }
    if (newSettings.parameters !== undefined) {
      await settingsManager.setParameters(newSettings.parameters)
    }
    if (newSettings.uiState !== undefined) {
      await settingsManager.setUIState(newSettings.uiState)
    }
    if (newSettings.lastBlenderVersion !== undefined) {
      await settingsManager.setSetting('lastBlenderVersion', newSettings.lastBlenderVersion)
    }
  }

  return { settings, updateSettings }
}