import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Button,
  ButtonGroup,
  ScrollShadow,
  Input,
  Switch,
} from "@heroui/react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { SavePresetDialog } from "./SavePresetDialog";
import { PresetManager } from "./PresetManager";
import { ParamDefinitions, Parameter } from "@/lib/paramDefinitions";
import { SettingsManager, Preset } from "@/lib/settingsManager";
import toast from "react-hot-toast";
import {
  Check,
  FileSearch,
  FolderSearch,
  RefreshCcw,
  Save,
  Settings2,
  X,
} from "lucide-react";
import path from "path";

interface CommandBuilderProps {
  onCommandUpdate: (command: string[]) => void;
}

export const CommandBuilder: React.FC<CommandBuilderProps> = ({
  onCommandUpdate,
}) => {
  const [settingsManager, setSettingsManager] =
    useState<SettingsManager | null>(null);

  useEffect(() => {
    // Inizializza il SettingsManager solo lato client
    const initSettings = async () => {
      if (typeof window !== "undefined") {
        const settings = new SettingsManager();
        await settings.init();
        setSettingsManager(settings);
      }
    };

    initSettings();
  }, []);

  const [blenderPath, setBlenderPath] = useState("");
  const [parameters, setParameters] = useState<{ [key: string]: any }>({});
  const [activePreset, setActivePreset] = useState("default");
  const [presets, setPresets] = useState<{ [key: string]: Preset }>({});
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load saved settings solo quando settingsManager è disponibile
    if (settingsManager) {
      setBlenderPath(settingsManager.getBlenderPath() || "");
      setParameters(settingsManager.getParameters() || {});

      // Carica tutti i preset disponibili
      const presetData: { [key: string]: Preset } = {};
      settingsManager.getPresetNames().forEach((name) => {
        const preset = settingsManager.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);

      // Carica il preset attivo dalle impostazioni
      const uiState = settingsManager.getUIState();
      if (uiState.activePreset && presetData[uiState.activePreset]) {
        setActivePreset(uiState.activePreset);
        const preset = presetData[uiState.activePreset];
        setBlenderPath(preset.blenderPath || "");
        setParameters(preset.parameters || {});
      }
    }
  }, [settingsManager]);

  useEffect(() => {
    updateCommand();
  }, [blenderPath, parameters]);

  const updateCommand = () => {
    const commandParts: string[] = [];

    // Add Blender path
    if (blenderPath) {
      commandParts.push(quotePathIfNeeded(blenderPath));
    } else {
      commandParts.push("blender");
    }

    // Handle background mode and blend file first
    if (parameters[ParamDefinitions.BACKGROUND]) {
      commandParts.push("-b");
      if (parameters[ParamDefinitions.FILE]) {
        commandParts.push(quotePathIfNeeded(parameters[ParamDefinitions.FILE]));
      }
    } else if (parameters[ParamDefinitions.FILE]) {
      commandParts.push(quotePathIfNeeded(parameters[ParamDefinitions.FILE]));
    }

    // Handle special case for output directory and filename combined into output path
    const outputDir = parameters[ParamDefinitions.OUTPUT_DIRECTORY];
    const outputFilename = parameters[ParamDefinitions.OUTPUT_FILENAME];

    if (outputDir && outputFilename) {
      const combinedPath = path.join(outputDir, outputFilename);
      if (combinedPath) {
        parameters[ParamDefinitions.RENDER_OUTPUT] = combinedPath;
      }
    }

    // Add other parameters in order
    const orderedParams = Object.entries(parameters)
      .filter(([param]) => {
        // Exclude special handled parameters
        return (
          param !== ParamDefinitions.FILE &&
          param !== ParamDefinitions.BACKGROUND &&
          param !== ParamDefinitions.OUTPUT_DIRECTORY &&
          param !== ParamDefinitions.OUTPUT_FILENAME
        );
      })
      .sort(
        ([a], [b]) =>
          ParamDefinitions.getParamOrder(a) - ParamDefinitions.getParamOrder(b)
      );

    for (const [param, value] of orderedParams) {
      if (value === undefined || value === null) continue;

      if (typeof value === "boolean") {
        if (value) commandParts.push(param);
      } else if (value !== "") {
        commandParts.push(param, quotePathIfNeeded(value.toString()));
      }
    }

    onCommandUpdate(commandParts);
  };

  // Function to add quotes around paths or values with spaces
  const quotePathIfNeeded = (value: string): string => {
    // Non aggiungere virgolette poiché verranno gestite dal preload.js
    return value;
  };

  const handleParameterChange = async (param: string, value: any) => {
    const newParameters = { ...parameters, [param]: value };
    setParameters(newParameters);
    if (settingsManager) {
      await settingsManager.setParameters(newParameters);

      // Verifica se ci sono differenze con il preset attivo
      const activePresetData = presets[activePreset];
      if (activePresetData) {
        const hasParamChanges = Object.entries(newParameters).some(
          ([key, val]) => activePresetData.parameters[key] !== val
        );
        const hasBlenderPathChanged =
          activePresetData.blenderPath !== blenderPath;
        setHasChanges(hasParamChanges || hasBlenderPathChanged);
      }
    }
  };

  const handleBlenderPathChange = async () => {
    if (!settingsManager || typeof window === "undefined") {
      return;
    }

    try {
      const filePath = await window.electron.openFile({
        filters: [
          {
            name: "Blender Executable",
            extensions: window.electron.platform === "win32" ? ["exe"] : ["*"],
          },
        ],
      });

      if (filePath) {
        setBlenderPath(filePath);
        await settingsManager.setBlenderPath(filePath);

        // Verifica se ci sono differenze con il preset attivo
        const activePresetData = presets[activePreset];
        if (activePresetData) {
          const hasParamChanges = Object.entries(parameters).some(
            ([key, val]) => activePresetData.parameters[key] !== val
          );
          const hasBlenderPathChanged =
            activePresetData.blenderPath !== filePath;
          setHasChanges(hasParamChanges || hasBlenderPathChanged);
        }
      }
    } catch (error) {
      console.error("Error selecting Blender path:", error);
      toast.error("Failed to select Blender executable");
    }
  };

  const handlePresetChange = async (presetName: string) => {
    if (!settingsManager) return;

    const preset = settingsManager.getPreset(presetName);
    if (preset) {
      setBlenderPath(preset.blenderPath || "");
      setParameters(preset.parameters || {});
      setActivePreset(presetName);
      setHasChanges(false);

      // Salva il preset attivo nelle impostazioni
      const uiState = settingsManager.getUIState();
      await settingsManager.setUIState({
        ...uiState,
        activePreset: presetName,
      });
    }
  };

  const handleSavePreset = async (preset: Preset) => {
    if (!settingsManager) return;

    await settingsManager.saveAsPreset(preset.name, {
      ...preset,
      blenderPath,
      parameters,
    });
    // Aggiorna l'elenco dei preset
    const presetData: { [key: string]: Preset } = {};
    settingsManager.getPresetNames().forEach((name) => {
      const preset = settingsManager.getPreset(name);
      if (preset) {
        presetData[name] = preset;
      }
    });
    setPresets(presetData);
    setActivePreset(preset.name);
    toast.success("Preset salvato con successo");
  };

  const handleDeletePreset = async (name: string) => {
    if (!settingsManager) return;

    if (await settingsManager.deletePreset(name)) {
      // Aggiorna l'elenco dei preset
      const presetData: { [key: string]: Preset } = {};
      settingsManager.getPresetNames().forEach((name) => {
        const preset = settingsManager.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);
      if (activePreset === name) {
        setActivePreset("default");
      }
      toast.success("Preset eliminato con successo");
    }
  };

  const handleRenamePreset = async (oldName: string, newName: string) => {
    if (!settingsManager) return;

    if (await settingsManager.renamePreset(oldName, newName)) {
      // Aggiorna l'elenco dei preset
      const presetData: { [key: string]: Preset } = {};
      settingsManager.getPresetNames().forEach((name) => {
        const preset = settingsManager.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);
      if (activePreset === oldName) {
        setActivePreset(newName);
      }
      toast.success("Preset rinominato con successo");
    }
  };

  const handleUpdatePreset = async () => {
    if (!settingsManager || activePreset === "default") {
      return;
    }

    try {
      await settingsManager.saveAsPreset(activePreset, {
        name: activePreset,
        blenderPath,
        parameters,
      });

      // Aggiorna l'elenco dei preset
      const presetData: { [key: string]: Preset } = {};
      settingsManager.getPresetNames().forEach((name) => {
        const preset = settingsManager.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);
      setHasChanges(false);
      toast.success("Preset aggiornato con successo");
    } catch (error) {
      console.error("Error updating preset:", error);
      toast.error("Errore durante l'aggiornamento del preset");
    }
  };

  const renderParameter = (param: Parameter) => {
    const value = parameters[param.param];

    switch (param.type) {
      case "bool":
        return (
          <Switch
            isSelected={!!value}
            thumbIcon={value ? <Check /> : <X />}
            onValueChange={(checked) =>
              handleParameterChange(param.param, checked)
            }
          />
        );

      case "file":
        return (
          <div className="flex gap-2">
            <Input
              value={value || ""}
              onChange={(e) =>
                handleParameterChange(param.param, e.target.value)
              }
              placeholder={param.description}
            />
            <Button
              startContent={<FileSearch />}
              onPress={async () => {
                if (typeof window === "undefined" || !window.electron) {
                  return;
                }
                try {
                  const filePath = await window.electron.openFile({});
                  if (filePath) {
                    handleParameterChange(param.param, filePath);
                  }
                } catch (error) {
                  console.error("Error selecting file:", error);
                  toast.error("Failed to select file");
                }
              }}
            >
              Browse
            </Button>
          </div>
        );

      case "path":
        return (
          <div className="flex gap-2">
            <Input
              value={value || ""}
              onChange={(e) =>
                handleParameterChange(param.param, e.target.value)
              }
              placeholder={param.description}
            />
            <Button
              startContent={<FolderSearch />}
              onPress={async () => {
                if (typeof window === "undefined" || !window.electron) {
                  return;
                }
                try {
                  const dirPath = await window.electron.openDirectory({});
                  if (dirPath) {
                    handleParameterChange(param.param, dirPath);
                  }
                } catch (error) {
                  console.error("Error selecting directory:", error);
                  toast.error("Failed to select directory");
                }
              }}
            >
              Browse
            </Button>
          </div>
        );

      case "int":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : parseInt(e.target.value);
              handleParameterChange(param.param, val);
            }}
            placeholder={param.description}
          />
        );

      case "enum":
        return (
          <Select
            value={String(value || "")}
            onValueChange={(val) => handleParameterChange(param.param, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={param.description} />
            </SelectTrigger>
            <SelectContent>
              {param.options &&
                param.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleParameterChange(param.param, e.target.value)}
            placeholder={param.description}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* General Settings */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Presets</Label>
          <div className="flex gap-2">
            <Select value={activePreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(presets).map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasChanges && activePreset !== "default" && (
              <Button
                onPress={handleUpdatePreset}
                variant="light"
                color="warning"
                startContent={<RefreshCcw />}
              >
                Update Preset
              </Button>
            )}
            <Button
              color="success"
              variant="ghost"
              onPress={() => setIsSavePresetOpen(true)}
              startContent={<Save size={16} />}
            >
              Save As...
            </Button>
            <Button
              variant="bordered"
              startContent={<Settings2 size={16} />}
              onPress={() => setIsPresetManagerOpen(true)}
            >
              Manage
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Blender Path</Label>
          <div className="flex gap-2">
            <Input
              value={blenderPath}
              readOnly
              placeholder="Select Blender executable"
            />
            <Button onPress={handleBlenderPathChange}>Browse</Button>
          </div>
        </div>

        <Separator />
      </div>

      {/* Parameters */}
      <Tabs defaultValue="Base" className="flex-1">
        <TabsList className="justify-between w-full">
          {Object.keys(ParamDefinitions.getCategories()).map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(ParamDefinitions.getCategories()).map(
          ([category, params]) => (
            <TabsContent
              key={category}
              value={category}
              className="flex-1 h-full"
            >
              <ScrollShadow className="h-5/6">
                <div className="p-4 space-y-6">
                  {params.map((param) => (
                    <div key={param.param} className="space-y-2 flex flex-col">
                      <Label>
                        {param.name}
                        <span className="text-sm text-text-secondary ml-2">
                          {param.description}
                        </span>
                      </Label>
                      {renderParameter(param)}
                    </div>
                  ))}
                </div>
              </ScrollShadow>
            </TabsContent>
          )
        )}
      </Tabs>

      {/* Preset Management Dialogs */}
      <SavePresetDialog
        open={isSavePresetOpen}
        onOpenChange={setIsSavePresetOpen}
        presets={presets}
        currentSettings={{
          blenderPath,
          parameters,
        }}
        onSave={handleSavePreset}
      />

      <PresetManager
        open={isPresetManagerOpen}
        onOpenChange={setIsPresetManagerOpen}
        presets={presets}
        onSave={handleSavePreset}
        onDelete={handleDeletePreset}
        onRename={handleRenamePreset}
      />
    </div>
  );
};
