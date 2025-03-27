import { useState, useEffect, useCallback } from 'react'
import { useSettingsManager } from './useSettingsManager'
import { BlenderVersion, detectBlenderVersions } from '../blenderDetector'
import path from 'path'

export function useBlenderVersions() {
  const [versions, setVersions] = useState<BlenderVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<BlenderVersion | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { settings, updateSettings } = useSettingsManager()

  // Carica le versioni solo all'avvio
  useEffect(() => {
    let mounted = true

    async function loadVersions() {
      if (!mounted) return
      setIsLoading(true)
      
      try {
        const detectedVersions = await detectBlenderVersions()
        if (!mounted) return
        
        // Se c'è un path salvato nelle impostazioni, aggiungerlo come versione custom
        if (settings.blenderPath && settings.blenderPath !== selectedVersion?.executablePath) {
          const customVersion: BlenderVersion = {
            version: 'Custom',
            path: path.dirname(settings.blenderPath),
            executablePath: settings.blenderPath
          }
          detectedVersions.push(customVersion)
        }
        
        setVersions(detectedVersions)
        
        // Se c'è una versione salvata nelle impostazioni, selezionala
        if (settings.lastBlenderVersion && detectedVersions.length > 0) {
          const saved = detectedVersions.find(v => v.version === settings.lastBlenderVersion)
          if (saved) {
            setSelectedVersion(saved)
            updateSettings({ blenderPath: saved.executablePath })
          } else {
            // Se la versione salvata non esiste più, usa la più recente
            setSelectedVersion(detectedVersions[0])
            updateSettings({ 
              lastBlenderVersion: detectedVersions[0].version,
              blenderPath: detectedVersions[0].executablePath 
            })
          }
        } else if (detectedVersions.length > 0) {
          // Se non c'è una versione salvata, usa la più recente
          setSelectedVersion(detectedVersions[0])
          updateSettings({ 
            lastBlenderVersion: detectedVersions[0].version,
            blenderPath: detectedVersions[0].executablePath 
          })
        }
      } catch (error) {
        console.error('Error loading Blender versions:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadVersions()
    return () => {
      mounted = false
    }
  }, []) // Rimuovo le dipendenze per eseguire solo all'mount

  const selectVersion = useCallback((version: BlenderVersion) => {
    setSelectedVersion(version)
    updateSettings({ 
      lastBlenderVersion: version.version,
      blenderPath: version.executablePath 
    })
  }, [updateSettings])

  const addCustomVersion = useCallback((filePath: string) => {
    const customVersion: BlenderVersion = {
      version: 'Custom',
      path: path.dirname(filePath),
      executablePath: filePath
    }
    
    setVersions(prev => {
      // Rimuovi eventuali versioni custom precedenti
      const filtered = prev.filter(v => v.version !== 'Custom')
      return [...filtered, customVersion]
    })
    
    selectVersion(customVersion)
  }, [selectVersion])

  return {
    versions,
    selectedVersion,
    selectVersion,
    addCustomVersion,
    isLoading
  }
}