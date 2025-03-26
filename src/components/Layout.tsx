import React, { useState, useEffect } from "react";
import { CommandBuilder } from "./CommandBuilder";
import { ProgressMonitor } from "./ProgressMonitor";
import { LogViewer } from "./LogViewer";
import { PresetManager } from "./PresetManager";
import { SavePresetDialog } from "./SavePresetDialog";
import { Button } from "@heroui/react";
import { Input } from "./ui/input";
import { BlenderExecutor, RenderProgress } from "@/lib/blenderExecutor";
import { SettingsManager, Preset } from "@/lib/settingsManager";
import toast from "react-hot-toast";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Combine, FolderSearch, Square } from "lucide-react";

interface LogEntry {
  timestamp: string;
  message: string;
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" | "FRAME";
}

// Utility function to check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined";

export const Layout: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [command, setCommand] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [blenderExecutor, setBlenderExecutor] =
    useState<BlenderExecutor | null>(null);
  const [settingsManager, setSettingsManager] =
    useState<SettingsManager | null>(null);
  const [presets, setPresets] = useState<{ [key: string]: Preset }>({});
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);

  // Verifica se siamo nel browser
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Inizializzazione delle classi dopo la verifica del browser
  useEffect(() => {
    const initializeClasses = async () => {
      if (!isClient) return;

      const executor = new BlenderExecutor();
      const settings = new SettingsManager();
      await settings.init();

      setBlenderExecutor(executor);
      setSettingsManager(settings);

      // Carica i preset dopo l'inizializzazione del SettingsManager
      const presetData: { [key: string]: Preset } = {};
      settings.getPresetNames().forEach((name) => {
        const preset = settings.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);
    };

    initializeClasses();
  }, [isClient]);

  useEffect(() => {
    if (!blenderExecutor) return;

    let timer: NodeJS.Timeout | null = null;

    blenderExecutor.on("renderStarted", () => {
      setIsRendering(true);
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    });

    blenderExecutor.on(
      "renderCompleted",
      (success: boolean, message: string) => {
        setIsRendering(false);
        if (timer) clearInterval(timer);
        addLog(message, success ? "SUCCESS" : "ERROR");
      }
    );

    blenderExecutor.on("renderProgress", (progress: RenderProgress) => {
      setProgress(progress);
    });

    blenderExecutor.on("output", (message: string) => {
      // Determine log level based on message content
      let level: LogEntry["level"] = "INFO";
      if (message.includes("Error:") || message.includes("ERROR")) {
        level = "ERROR";
      } else if (message.includes("Warning:") || message.includes("WARNING")) {
        level = "WARNING";
      } else if (message.includes("Saved:")) {
        level = "SUCCESS";
      } else if (message.includes("Fra:")) {
        level = "FRAME";
      }
      addLog(message, level);
    });

    return () => {
      if (timer) clearInterval(timer);
      // Remove event listeners
      blenderExecutor.removeAllListeners();
    };
  }, [blenderExecutor]);

  const addLog = (message: string, level: LogEntry["level"]) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, level }]);
  };

  const handleCommandUpdate = (newCommand: string[]) => {
    setCommand(newCommand);
  };

  const handleRender = async () => {
    if (!blenderExecutor || !command.length) {
      addLog("No command to execute or blender executor not ready", "ERROR");
      return;
    }

    try {
      // Extract frame range from command
      let startFrame = 1;
      let endFrame = 1;
      const isAnimation = command.includes("-a");

      if (isAnimation) {
        const startIndex = command.indexOf("-s");
        const endIndex = command.indexOf("-e");
        if (startIndex !== -1 && startIndex + 1 < command.length) {
          startFrame = parseInt(command[startIndex + 1]);
        }
        if (endIndex !== -1 && endIndex + 1 < command.length) {
          endFrame = parseInt(command[endIndex + 1]);
        }
      } else {
        const frameIndex = command.indexOf("-f");
        if (frameIndex !== -1 && frameIndex + 1 < command.length) {
          const frameValue = command[frameIndex + 1];
          if (frameValue.includes("-")) {
            const [start, end] = frameValue.split("-").map(Number);
            startFrame = start;
            endFrame = end;
          } else {
            startFrame = parseInt(frameValue);
            endFrame = startFrame;
          }
        }
      }

      await blenderExecutor.execute(command, startFrame, endFrame);
    } catch (error) {
      addLog(`Error starting render: ${error}`, "ERROR");
    }
  };

  const handleStop = async () => {
    if (!blenderExecutor) {
      console.log("handleStop: blenderExecutor non disponibile");
      return;
    }

    console.log(
      "handleStop: tasto Stop premuto, sto per chiamare blenderExecutor.stop()"
    );
    addLog("Stopping render...", "INFO");
    try {
      await blenderExecutor.stop();
      console.log("handleStop: chiamata a stop completata");
    } catch (error) {
      console.error("handleStop: errore durante l'arresto:", error);
      addLog(`Error stopping render: ${error}`, "ERROR");
    }
  };

  const handleOpenOutput = async () => {
    if (!isBrowser()) return;

    // First, check for the combined output path from command
    const outputIndex = command.indexOf("-o");
    if (outputIndex !== -1 && outputIndex + 1 < command.length) {
      // Extract the directory part from the quoted output path
      let outputPath = command[outputIndex + 1].replace(/^"(.*)"$/, "$1"); // Remove enclosing quotes
      const dirPath =
        outputPath.split("/").slice(0, -1).join("/") ||
        outputPath.split("\\").slice(0, -1).join("\\");

      if (dirPath) {
        // Use shell.openPath to directly open the folder
        try {
          await window.electron.openPath(dirPath);
          return;
        } catch (error) {
          console.error("Error opening output folder:", error);
          toast.error("Failed to open output folder");
        }
      }
    }

    // Fallback: If we couldn't find directory or if there was an error
    toast.error("No output folder found or specified");
  };

  const handleSavePreset = async (preset: Preset) => {
    if (!settingsManager) return;

    await settingsManager.saveAsPreset(preset.name, preset);
    const presetData: { [key: string]: Preset } = {};
    settingsManager.getPresetNames().forEach((name) => {
      const preset = settingsManager.getPreset(name);
      if (preset) {
        presetData[name] = preset;
      }
    });
    setPresets(presetData);
  };

  const handleDeletePreset = async (name: string) => {
    if (!settingsManager) return;

    const deleted = await settingsManager.deletePreset(name);
    if (deleted) {
      const presetData: { [key: string]: Preset } = {};
      settingsManager.getPresetNames().forEach((name) => {
        const preset = settingsManager.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);
    }
  };

  const handleRenamePreset = async (oldName: string, newName: string) => {
    if (!settingsManager) return;

    const renamed = await settingsManager.renamePreset(oldName, newName);
    if (renamed) {
      const presetData: { [key: string]: Preset } = {};
      settingsManager.getPresetNames().forEach((name) => {
        const preset = settingsManager.getPreset(name);
        if (preset) {
          presetData[name] = preset;
        }
      });
      setPresets(presetData);
    }
  };

  const getCurrentSettings = (): Omit<Preset, "name"> => ({
    blenderPath: command[0],
    parameters: {}, // You'll need to get the current parameters from CommandBuilder
  });

  // Nel render, aggiungi una verifica per il client
  if (!isClient) {
    return <div className="w-screen h-screen bg-background" />; // Loading state
  }

  return (
    <div className="bg-background text-text-primary w-full h-full">
      <div className="p-4 h-full">
        <PanelGroup direction="horizontal" className="flex h-screen w-full">
          {/* Left panel - Command Builder */}
          <Panel defaultSize={60} minSize={30}>
            <div className="h-full bg-surface rounded-lg border border-border overflow-hidden mr-2">
              <CommandBuilder onCommandUpdate={handleCommandUpdate} />
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 bg-surface hover:bg-muted rounded-sm transition-colors cursor-col-resize flex items-center justify-center mx-1">
            <div className="w-1 h-8 bg-border rounded-full"></div>
          </PanelResizeHandle>

          {/* Right panel - Preview, Progress, and Logs */}
          <Panel defaultSize={40} minSize={30}>
            <div className="h-full flex flex-col gap-4 ml-2">
              {/* Command Preview and Controls - Fixed at top */}
              <div className="bg-surface rounded-lg border border-border p-4 space-y-4 flex-shrink-0">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Command Preview</label>
                  <Input
                    value={command.join(" ")}
                    readOnly
                    className="font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onPress={handleRender}
                    startContent={<Combine />}
                    variant="shadow"
                    color="success"
                    isDisabled={
                      isRendering || !command.length || !blenderExecutor
                    }
                  >
                    Start Render
                  </Button>
                  <Button
                    onPress={handleStop}
                    startContent={<Square />}
                    isDisabled={!isRendering || !blenderExecutor}
                    variant="bordered"
                    color="danger"
                  >
                    Stop
                  </Button>
                  <Button
                    onPress={handleOpenOutput}
                    startContent={<FolderSearch />}
                    variant="bordered"
                    isDisabled={!command.includes("-o") || !isBrowser()}
                    color="default"
                  >
                    Open Output Folder
                  </Button>
                </div>
              </div>

              {/* Scrollable container for Progress Monitor and Logs */}
              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-4">
                  <ProgressMonitor
                    isRendering={isRendering}
                    renderProgress={progress}
                    elapsedTime={elapsedTime}
                  />

                  {/* <LogViewer entries={logs} /> */}
                </div>
              </ScrollArea>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
