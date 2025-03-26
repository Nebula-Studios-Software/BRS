import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@heroui/react'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Preset } from '@/lib/settingsManager'
import toast from 'react-hot-toast'

interface SavePresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presets: { [key: string]: Preset }
  currentSettings: Omit<Preset, 'name'>
  onSave: (preset: Preset) => void
}

export const SavePresetDialog: React.FC<SavePresetDialogProps> = ({
  open,
  onOpenChange,
  presets,
  currentSettings,
  onSave,
}) => {
  const [name, setName] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a valid name')
      return
    }

    if (presets[name] && !confirm('A preset with this name already exists. Overwrite it?')) {
      return
    }

    onSave({
      name,
      ...currentSettings
    })
    setName('')
    onOpenChange(false)
    toast.success('Preset saved successfully')
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed text-text-primary left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface p-6 rounded-lg border border-border shadow-lg animate-enter">
          <Dialog.Title className="text-lg font-semibold mb-4 text-text-primary">
            Save Preset
          </Dialog.Title>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter preset name"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close asChild>
              <Button variant="ghost" color='danger'>Cancel</Button>
            </Dialog.Close>
            <Button variant='shadow'color='success' onPress={handleSave}>Save Preset</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}