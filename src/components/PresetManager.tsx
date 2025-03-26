import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@heroui/react'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Preset } from '@/lib/settingsManager'
import toast from 'react-hot-toast'

interface PresetManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presets: { [key: string]: Preset }
  onSave: (preset: Preset) => void
  onDelete: (name: string) => void
  onRename: (oldName: string, newName: string) => void
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  open,
  onOpenChange,
  presets,
  onSave,
  onDelete,
  onRename,
}) => {
  const [editingPreset, setEditingPreset] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const handleRename = (oldName: string) => {
    if (!newName.trim()) {
      toast.error('Please enter a valid name')
      return
    }

    if (presets[newName] && newName !== oldName) {
      toast.error('A preset with this name already exists')
      return
    }

    onRename(oldName, newName)
    setEditingPreset(null)
    setNewName('')
    toast.success('Preset renamed successfully')
  }

  const handleDelete = (name: string) => {
    if (name === 'default') {
      toast.error('Cannot delete default preset')
      return
    }

    if (confirm('Are you sure you want to delete this preset?')) {
      onDelete(name)
      toast.success('Preset deleted successfully')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface p-6 rounded-lg border border-border shadow-lg animate-enter">
          <Dialog.Title className="text-lg font-semibold mb-4 text-text-primary">
            Manage Presets
          </Dialog.Title>

          <div className="space-y-4">
            {Object.entries(presets).map(([name, preset]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-border">
                {editingPreset === name ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="New name"
                      className="flex-1 text-text-primary"
                    />
                    <Button 
                      size="sm" 
                      variant='shadow'
                      onPress={() => handleRename(name)}
                      className="px-2"
                      color='success'
                    >
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onPress={() => {
                        setEditingPreset(null)
                        setNewName('')
                      }}
                      className="px-2"
                      color='danger'
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Label className="text-text-primary">{name}</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={() => {
                          setEditingPreset(name)
                          setNewName(name)
                        }}
                        isDisabled={name === 'default'}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => handleDelete(name)}
                        isDisabled={name === 'default'}
                        color='danger'
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <Dialog.Close asChild>
            <Button
              variant="bordered"
              className="mt-6"
            >
              Close
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}