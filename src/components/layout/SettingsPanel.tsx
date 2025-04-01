import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { renderParameters, getParametersByCategory } from '@/config/renderParameters';
import { ScrollArea } from '../ui/scroll-area';
import { FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsPanelProps {
  currentSettings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ currentSettings, onSettingsChange }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setValues(currentSettings);
    // Espandi automaticamente le categorie che sono abilitate
    const enabledCategories = new Set(
      renderParameters.categories
        .filter(cat => cat.id === 'base' || currentSettings[`${cat.id}_enabled`])
        .map(cat => cat.id)
    );
    setExpandedCategories(enabledCategories);
  }, [currentSettings]);

  const handleValueChange = (parameterId: string, value: any) => {
    const newValues = { ...values, [parameterId]: value };
    setValues(newValues);
    onSettingsChange(newValues);
  };

  const handleFileSelect = async (parameterId: string, type: 'file' | 'path') => {
    try {
      let result;
      if (type === 'file') {
        result = await window.electronAPI.openFileDialog({
          filters: [{ name: 'Blend Files', extensions: ['blend'] }]
        });
        if (result && result.length > 0) {
          handleValueChange(parameterId, result[0]);
          toast.success("File selected", {
            description: `Selected file: ${result[0]}`,
          });
        }
      } else {
        result = await window.electronAPI.openFileDialog({
          properties: ['openDirectory'],
          filters: [{ name: 'All Files', extensions: ['*'] }]
        });
        if (result && result.length > 0) {
          handleValueChange(parameterId, result[0]);
          toast.success("Directory selected", {
            description: `Selected directory: ${result[0]}`,
          });
        }
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to select file/directory",
      });
    }
  };

  const handleSectionToggle = (categoryId: string, enabled: boolean) => {
    // Non permettere di disabilitare la categoria base
    if (categoryId === 'base') return;

    const newSettings = { ...currentSettings, [`${categoryId}_enabled`]: enabled };
    onSettingsChange(newSettings);
    // Aggiorna lo stato di espansione
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (enabled) {
        newSet.add(categoryId);
      } else {
        newSet.delete(categoryId);
      }
      return newSet;
    });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    // Non permettere di chiudere la categoria base
    if (categoryId === 'base') return;

    if (currentSettings[`${categoryId}_enabled`]) {
      toggleCategory(categoryId);
    }
  };

  const renderParameterField = (parameter: any) => {
    const value = values[parameter.id] ?? parameter.defaultValue ?? '';
    const isRequired = parameter.required;

    switch (parameter.type) {
      case 'string':
        return (
          <Input
            value={value}
            onChange={(e) => handleValueChange(parameter.id, e.target.value)}
            placeholder={parameter.placeholder || ''}
            required={isRequired}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleValueChange(parameter.id, e.target.value === '' ? undefined : parseInt(e.target.value))}
            placeholder={parameter.placeholder || ''}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            required={isRequired}
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleValueChange(parameter.id, checked)}
          />
        );

      case 'enum':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleValueChange(parameter.id, val)}
            required={isRequired}
          >
            <SelectTrigger>
              <SelectValue placeholder={parameter.placeholder || 'Select option'} />
            </SelectTrigger>
            <SelectContent>
              {parameter.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'file':
        return (
          <div className="flex gap-2">
            <Input
              value={value}
              readOnly
              placeholder={parameter.placeholder || 'Select file'}
              required={isRequired}
            />
            <Button onClick={() => handleFileSelect(parameter.id, 'file')}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'path':
        return (
          <div className="flex gap-2">
            <Input
              value={value}
              readOnly
              placeholder={parameter.placeholder || 'Select directory'}
              required={isRequired}
            />
            <Button onClick={() => handleFileSelect(parameter.id, 'path')}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="p-4 h-full">
      <h2 className="text-xl font-bold">Render Settings</h2>
      <Separator className="my-2" />

      <ScrollArea className='h-full pe-4'>
        {renderParameters.categories.map((category) => {
          const parameters = getParametersByCategory(category.id);
          if (parameters.length === 0) return null;

          const isEnabled = category.id === 'base' || currentSettings[`${category.id}_enabled`];
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id}>
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                </Button>
                <Switch
                  checked={isEnabled}
                  disabled={category.id === 'base'}
                  onCheckedChange={(checked) => handleSectionToggle(category.id, checked)}
                />
              </div>
              <AnimatePresence>
                {isEnabled && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pl-8">
                      {parameters.map((parameter) => (
                        <motion.div
                          key={parameter.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Label className="mb-4">
                            {parameter.name}
                            {parameter.required && <span className="text-red-500">*</span>}
                          </Label>
                          {renderParameterField(parameter)}
                          {parameter.help && (
                            <p className="text-sm text-muted-foreground mt-1">{parameter.help}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Separator className="my-6" />
            </div>
          );
        })}
        <div className='h-10'></div>
      </ScrollArea>
    </Card>
  );
};

export default SettingsPanel;
