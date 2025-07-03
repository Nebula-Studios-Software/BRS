import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Play,
  Square,
  RotateCcw,
  Timer,
  Frame,
  Layers,
  Cpu,
  History,
  Plus,
  Monitor,
  Thermometer,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useQueueStore } from "@/store/queueStore";
import { useHistoryStore } from "@/store/historyStore";
import { HistoryItem } from "@/types/history";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import HistoryPanel from "./HistoryPanel";
import { Badge } from "@/components/ui/badge";
import { LogEntry, LogLevel } from "./LogViewer";

interface RenderPanelProps {
  command: string;
  logs: LogEntry[];
  onAddLog: (message: string, level?: LogLevel) => void;
}

interface ProgressEventData {
  progress?: number;
  currentFrame?: number;
  totalFrames?: number;
  memoryUsage?: number;
  peakMemory?: number;
  currentSample?: number;
  totalSamples?: number;
  inCompositing?: boolean;
  compositingOperation?: string;
}

interface SystemStats {
  cpu: {
    usage: string;
    cores: string[];
  };
  memory: {
    used: string;
    total: string;
    percentage: string;
  };
  gpu: Array<{
    name: string;
    usage: string;
    memory: {
      used: string;
      total: string;
      percentage: string;
    };
    temperature: string;
    power: string;
    coreClock?: string;
    memoryClock?: string;
  }>;
}

const RenderPanel: React.FC<RenderPanelProps> = ({
  command,
  logs,
  onAddLog,
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentSample, setCurrentSample] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  const [inCompositing, setInCompositing] = useState(false);
  const [compositingOperation, setCompositingOperation] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [peakMemory, setPeakMemory] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [queueName, setQueueName] = useState("");
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const addItem = useQueueStore((state) => state.addItem);
  const addHistoryItem = useHistoryStore((state) => state.addItem);
  const [historyOpen, setHistoryOpen] = useState(false);
  const items = useHistoryStore((state) => state.items);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRendering && startTime) {
      timer = setInterval(() => {
        setElapsedTime(
          Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRendering, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const addLog = (message: string, level: LogLevel = "info") => {
    onAddLog(message, level);
  };

  // Add system monitoring effect
  useEffect(() => {
    // Start system monitoring when component mounts
    window.electronAPI.startSystemMonitor();

    // Listen for system stats
    window.electronAPI.onSystemStats((stats: SystemStats) => {
      setSystemStats(stats);
    });

    // Cleanup on unmount
    return () => {
      window.electronAPI.stopSystemMonitor();
    };
  }, []);

  const extractParametersFromCommand = (command: string) => {
    // Estrai il percorso di Blender
    const blenderPath = command.split(" ")[0];

    // Estrai la versione di Blender dal percorso
    let blenderVersion = "Unknown";
    if (blenderPath.includes("Blender Foundation")) {
      const versionMatch = blenderPath.match(
        /Blender Foundation\\Blender ([\d.]+)/
      );
      if (versionMatch) {
        blenderVersion = versionMatch[1];
      }
    } else if (blenderPath.includes("Programs\\Blender")) {
      const versionMatch = blenderPath.match(/Programs\\Blender\\([\d.]+)/);
      if (versionMatch) {
        blenderVersion = versionMatch[1];
      }
    }

    // Estrai il percorso di output
    const outputPath = command.match(/-o\s+"?([^"\s]+)"?/)?.[1] || "";

    // Estrai il motore di rendering
    let renderEngine = "Unknown";
    if (command.includes("-E CYCLES")) {
      renderEngine = "Cycles";
    } else if (command.includes("-E BLENDER_EEVEE")) {
      renderEngine = "Eevee";
    } else if (command.includes("-E BLENDER_WORKBENCH")) {
      renderEngine = "Workbench";
    }

    // Estrai i frame dal comando
    const frameMatch = command.match(/-f\s+(\d+)\s+(\d+)/);
    const totalFrames = frameMatch
      ? parseInt(frameMatch[2]) - parseInt(frameMatch[1]) + 1
      : 0;

    return {
      blenderVersion,
      renderEngine,
      outputPath,
      totalFrames,
      lastUsed: new Date().toISOString(),
    };
  };

  const handleStartRender = async () => {
    if (!command) {
      toast.error("Error", {
        description: "No command available to execute.",
      });
      return;
    }

    setIsRendering(true);
    setProgress(0);
    setCurrentFrame(0);
    setTotalFrames(0);
    setStartTime(new Date());
    setMemoryUsage(0);
    setPeakMemory(0);
    setCurrentSample(0);
    setTotalSamples(0);
    setInCompositing(false);
    setCompositingOperation("");

    try {
      const { id } = await window.electronAPI.executeCommand(command);
      setCurrentProcessId(id);
      addLog("Starting render process...", "info");

      // Rimuovi eventuali listener precedenti
      window.electronAPI.removeAllListeners(`progress-${id}`);
      window.electronAPI.removeAllListeners(`complete-${id}`);
      window.electronAPI.removeAllListeners(`error-${id}`);

      // Ascolta gli eventi di progresso
      window.electronAPI.on(
        `progress-${id}`,
        (data: string | ProgressEventData) => {
          if (typeof data === "string") {
            addLog(data);
          } else if (typeof data === "object" && data !== null) {
            const progressData = data as ProgressEventData;
            if (
              "progress" in progressData &&
              progressData.progress !== undefined
            ) {
              setProgress(progressData.progress);
            }
            if (
              "currentFrame" in progressData &&
              progressData.currentFrame !== undefined
            ) {
              setCurrentFrame(progressData.currentFrame);
            }
            if (
              "totalFrames" in progressData &&
              progressData.totalFrames !== undefined
            ) {
              setTotalFrames(progressData.totalFrames);
            }
            if (
              "memoryUsage" in progressData &&
              progressData.memoryUsage !== undefined
            ) {
              setMemoryUsage(progressData.memoryUsage);
            }
            if (
              "peakMemory" in progressData &&
              progressData.peakMemory !== undefined
            ) {
              setPeakMemory(progressData.peakMemory);
            }
            if (
              "currentSample" in progressData &&
              progressData.currentSample !== undefined
            ) {
              setCurrentSample(progressData.currentSample);
            }
            if (
              "totalSamples" in progressData &&
              progressData.totalSamples !== undefined
            ) {
              setTotalSamples(progressData.totalSamples);
            }
            if (
              "inCompositing" in progressData &&
              progressData.inCompositing !== undefined
            ) {
              setInCompositing(progressData.inCompositing);
            }
            if (
              "compositingOperation" in progressData &&
              progressData.compositingOperation !== undefined
            ) {
              setCompositingOperation(progressData.compositingOperation);
            }
          }
        }
      );

      // Ascolta l'evento di completamento
      window.electronAPI.on(`complete-${id}`, (code: number) => {
        if (code === 0) {
          setIsRendering(false);
          setStartTime(null);
          addLog("Render completed successfully", "info");
          toast.success("Render Complete", {
            description: "The render has completed successfully.",
          });

          // Aggiungi alla cronologia
          const historyItem: Omit<HistoryItem, "id"> = {
            name: command.split("/").pop() || "Render",
            command: command,
            status: "completed" as const,
            startTime: startTime?.toISOString() || new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: Math.floor(
              (new Date().getTime() -
                (startTime?.getTime() || new Date().getTime())) /
                1000
            ),
            progress: 100,
            currentFrame: totalFrames,
            totalFrames: totalFrames,
            currentSample: totalSamples,
            totalSamples: totalSamples,
            parameters: extractParametersFromCommand(command),
          };
          addHistoryItem(historyItem);
        } else {
          addLog(`Render failed with code ${code}`, "error");
          toast.error("Render Failed", {
            description: `The render failed with code ${code}.`,
          });

          // Aggiungi alla cronologia come fallito
          const historyItem: Omit<HistoryItem, "id"> = {
            name: command.split("/").pop() || "Render",
            command: command,
            status: "failed" as const,
            startTime: startTime?.toISOString() || new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: Math.floor(
              (new Date().getTime() -
                (startTime?.getTime() || new Date().getTime())) /
                1000
            ),
            progress: progress,
            currentFrame: currentFrame,
            totalFrames: totalFrames,
            currentSample: currentSample,
            totalSamples: totalSamples,
            error: `Render failed with code ${code}`,
            parameters: extractParametersFromCommand(command),
          };
          addHistoryItem(historyItem);
        }
      });

      // Ascolta gli eventi di errore
      window.electronAPI.on(`error-${id}`, (error: string) => {
        // Non fermare il rendering se l'errore non è critico
        if (error.includes("Failed to start the render process")) {
          setIsRendering(false);
          setStartTime(null);
          addLog(error, "error");
          toast.error("Render Error", {
            description: error,
          });
        } else {
          addLog(error, "warning");
        }
      });
    } catch (error) {
      console.error("Error starting render:", error);
      setIsRendering(false);
      setStartTime(null);
      addLog("Failed to start the render process", "fatal");
      toast.error("Error", {
        description: "Failed to start the render process.",
      });
    }
  };

  const handleStopRender = async () => {
    if (currentProcessId) {
      try {
        await window.electronAPI.stopProcess(currentProcessId);
        setIsRendering(false);
        setStartTime(null);
        addLog("Render stopped by user", "warning");
        toast.info("Render Stopped", {
          description: "The render has been stopped.",
        });

        // Aggiungi alla cronologia come interrotto
        const historyItem: Omit<HistoryItem, "id"> = {
          name: command.split("/").pop() || "Render",
          command: command,
          status: "stopped" as const,
          startTime: startTime?.toISOString() || new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: Math.floor(
            (new Date().getTime() -
              (startTime?.getTime() || new Date().getTime())) /
              1000
          ),
          progress: progress,
          currentFrame: currentFrame,
          totalFrames: totalFrames,
          currentSample: currentSample,
          totalSamples: totalSamples,
          parameters: extractParametersFromCommand(command),
        };
        addHistoryItem(historyItem);
      } catch (error) {
        console.error("Error stopping render:", error);
        addLog("Failed to stop the render process", "error");
        toast.error("Error", {
          description: "Failed to stop the render process.",
        });
      }
    }
  };

  const handleReset = () => {
    setIsRendering(false);
    setProgress(0);
    setCurrentFrame(0);
    setTotalFrames(0);
    setStartTime(null);
    setElapsedTime(0);
    setMemoryUsage(0);
    setPeakMemory(0);
    setCurrentSample(0);
    setTotalSamples(0);
    setInCompositing(false);
    setCompositingOperation("");
    setCurrentProcessId(null);
  };

  const handleAddToQueue = () => {
    if (!command) {
      toast.error("Error", {
        description: "No command available to add to queue.",
      });
      return;
    }

    if (!queueName.trim()) {
      toast.error("Error", {
        description: "Please enter a name for the queue item.",
      });
      return;
    }

    addItem({
      name: queueName,
      command,
      priority: 1,
      parameters: {
        blenderVersion: "3.0.0",
        renderEngine: "cycles",
        lastUsed: new Date().toISOString(),
      },
    });

    setQueueName("");
    toast.success("Added to Queue", {
      description: "The render has been added to the queue.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Frame className="h-5 w-5" />
              Render Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleStartRender}
                    disabled={isRendering || !command}
                    variant={"shadow"}
                    color={"success"}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    onClick={handleStopRender}
                    variant={"outline"}
                    color={"destructive"}
                    disabled={!isRendering}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                  <Button
                    onClick={handleReset}
                    disabled={isRendering}
                    variant="ghost"
                    color="warning"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" color="primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Queue
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add to Queue</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Queue Item Name</Label>
                          <Input
                            id="name"
                            value={queueName}
                            onChange={(e) => setQueueName(e.target.value)}
                            placeholder="Enter a name for this render"
                          />
                        </div>
                        <Button onClick={handleAddToQueue}>Add to Queue</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" className="relative">
                      <History className="h-4 w-4 mr-2" />
                      History
                      {items.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {items.length}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                      <SheetTitle>Render History</SheetTitle>
                    </SheetHeader>
                    <HistoryPanel />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex flex-col bg-neutral-950 p-2 rounded-md gap-2 w-full">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Elapsed Time
                    </span>
                    <span className="text-base font-medium">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>

                  <div className="flex flex-col bg-neutral-950 p-2 rounded-md gap-2 w-full">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Frame className="h-4 w-4" />
                      Frame Progress
                    </span>
                    <span className="text-base font-medium">
                      {currentFrame}/{totalFrames}
                    </span>
                  </div>

                  <div className="flex flex-col bg-neutral-950 p-2 rounded-md gap-2 w-full">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Progress
                    </span>
                    <span className="text-base font-medium">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {totalSamples > 0 ? (
                  <div className="flex flex-col bg-neutral-950 p-2 rounded-md gap-2 w-full">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Samples
                    </span>
                    <span className="text-base font-medium">
                      {currentSample}/{totalSamples}
                    </span>
                    <Progress
                      value={(currentSample / totalSamples) * 100}
                      className="h-2"
                      variant="success"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col bg-neutral-950 p-2 rounded-md gap-2 w-full">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Samples
                    </span>
                    <span className="text-base font-medium">
                      Waiting for samples...
                    </span>
                    <Progress value={0} className="h-1" variant="default" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Frame className="h-4 w-4" />
                    Progress
                  </span>
                  <span className="text-sm font-medium">
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {inCompositing && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Compositing
                    </span>
                    <span className="text-sm font-medium">
                      {compositingOperation}
                    </span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              System Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background rounded-md p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Current Memory Usage
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current: {Math.round(memoryUsage)} MB</span>
                      <span>{systemStats?.memory.percentage || "0%"}</span>
                    </div>
                    <Progress
                      value={
                        systemStats
                          ? parseFloat(systemStats.memory.percentage)
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="bg-background rounded-md p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Peak Memory Usage
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Peak: {Math.round(peakMemory)} MB</span>
                      <span>
                        {systemStats?.memory.used || "0 GB"} /{" "}
                        {systemStats?.memory.total || "0 GB"}
                      </span>
                    </div>
                    <Progress
                      value={
                        peakMemory > 0
                          ? Math.min((peakMemory / 8192) * 100, 100)
                          : 0
                      }
                      className="h-2"
                      variant="secondary"
                    />
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-background rounded-md p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    CPU Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage:</span>
                      <span>{systemStats?.cpu.usage || "0%"}</span>
                    </div>
                    <Progress
                      value={
                        systemStats ? parseFloat(systemStats.cpu.usage) : 0
                      }
                      className="h-2"
                      variant="success"
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      {systemStats?.cpu.cores.length || 0} cores available
                    </div>
                  </div>
                </div>

                <div className="bg-background rounded-md p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System Memory
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used:</span>
                      <span>
                        {systemStats?.memory.used || "0 GB"} /{" "}
                        {systemStats?.memory.total || "0 GB"}
                      </span>
                    </div>
                    <Progress
                      value={
                        systemStats
                          ? parseFloat(systemStats.memory.percentage)
                          : 0
                      }
                      className="h-2"
                      variant="warning"
                    />
                    <div className="text-xs text-muted-foreground">
                      {systemStats?.memory.percentage || "0%"} utilization
                    </div>
                  </div>
                </div>
              </div>

              {/* GPU Information */}
              {systemStats?.gpu && systemStats.gpu.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    GPU Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemStats.gpu.map((gpu, index) => (
                      <div
                        key={index}
                        className="bg-background rounded-md p-4 space-y-3"
                      >
                        <div
                          className="font-medium text-sm truncate"
                          title={gpu.name}
                        >
                          {gpu.name}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>GPU Usage:</span>
                            <span>{gpu.usage}</span>
                          </div>
                          <Progress
                            value={parseFloat(gpu.usage)}
                            className="h-1.5"
                            variant="success"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>VRAM:</span>
                            <span>
                              {gpu.memory.used} / {gpu.memory.total}
                            </span>
                          </div>
                          <Progress
                            value={parseFloat(gpu.memory.percentage)}
                            className="h-1.5"
                            variant="warning"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3" />
                            <span>{gpu.temperature}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            <span>{gpu.power}</span>
                          </div>
                          {gpu.coreClock && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span title="Core Clock">{gpu.coreClock}</span>
                            </div>
                          )}
                          {gpu.memoryClock && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-blue-400" />
                              <span title="Memory Clock">
                                {gpu.memoryClock}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RenderPanel;
