import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Progress as ProgressNext } from "@heroui/react";
import { RenderProgress } from "@/lib/blenderExecutor";
import { Separator } from "./ui/separator";
import {
  Clock,
  MemoryStick,
  Cpu,
  MonitorUp,
  ChevronDown,
  ChevronUp,
  Cpu as ChipIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

interface ProgressState {
  percentage: number;
  currentFrame: string;
  totalFrames: string;
}

interface SystemMemory {
  total: string;
  used: string;
  free: string;
}

interface SystemUsage {
  cpu: number;
  cpuModel: string;
  cpuCount: number;
  cpuPerCore: number[];
  gpu: number | null;
  gpuModel: string | null;
  gpuDetails: {
    memoryUtilization: number;
    memoryUsed: number;
    memoryTotal: number;
    temperature: number;
  } | null;
}

interface ProgressMonitorProps {
  isRendering: boolean;
  renderProgress: RenderProgress | null;
  elapsedTime: number;
}

export const ProgressMonitor: React.FC<ProgressMonitorProps> = ({
  isRendering,
  renderProgress,
  elapsedTime,
}) => {
  const [displayProgress, setDisplayProgress] = useState<RenderProgress | null>(
    null
  );
  const [systemMemory, setSystemMemory] = useState<SystemMemory | null>(null);
  const [systemUsage, setSystemUsage] = useState<SystemUsage | null>(null);

  // Aggiorno le statistiche di sistema ogni secondo
  useEffect(() => {
    if (typeof window === "undefined" || !window.electron) return;

    const updateSystemStats = async () => {
      const memory = window.electron.getSystemMemory();
      const usage = await window.electron.getSystemUsage();
      setSystemMemory(memory);
      setSystemUsage(usage);
    };

    // Aggiorna subito
    updateSystemStats();

    // Poi aggiorna ogni secondo
    const interval = setInterval(updateSystemStats, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset progress when rendering stops
  useEffect(() => {
    if (isRendering) {
      setDisplayProgress(renderProgress);
    } else {
      const resetTimer = setTimeout(() => {
        setDisplayProgress(null);
      }, 3000);

      return () => clearTimeout(resetTimer);
    }
  }, [isRendering, renderProgress]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calcola il progresso
  const calculateProgress = (): ProgressState => {
    if (!displayProgress)
      return {
        percentage: 0,
        currentFrame: "0",
        totalFrames: "0",
      };

    const { frame, startFrame, totalFrames } = displayProgress;
    const framesCompleted = frame - startFrame;
    const percentage = (framesCompleted / totalFrames) * 10000;

    return {
      percentage: Math.min(100, Math.max(0, percentage)),
      currentFrame: frame.toString(),
      totalFrames: (startFrame + totalFrames - 1).toString(),
    };
  };

  return (
    <div className="space-y-4">
      {/* Render Progress Card */}
      <Card
        className={`bg-surface ${
          isRendering ? "border-success" : "border-border"
        } transition-all duration-300`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-text-primary flex items-center justify-between">
            <span className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRendering ? "bg-success" : "bg-border"
                }`}
              />
              <span
                className={`ml-2 text-sm ${
                  isRendering ? "text-text-primary" : "text-text-secondary"
                }`}
              >
                {isRendering ? "Rendering..." : "Render Stopped"}
              </span>
            </span>
            {isRendering && displayProgress && (
              <span className="text-sm font-normal bg-primary/20 text-primary px-3 py-1 rounded-full">
                {Math.round(displayProgress.frameProgress || 0)}% Complete
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {/* Time and Frames */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1 bg-background/40 rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1">
                  Elapsed Time
                </div>
                <div className="text-lg font-medium">
                  {formatTime(elapsedTime)}
                </div>
              </div>
              <div className="col-span-1 bg-background/40 rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1">Frames</div>
                <div className="text-lg font-medium">
                  {calculateProgress().currentFrame}/
                  {displayProgress?.totalFrames || 0}
                </div>
              </div>
            </div>

            {/* Current Frame Progress */}
            {displayProgress?.frameProgress !== undefined ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">Overall Progress</span>
                  <span className="text-text-primary font-medium">
                    {displayProgress.frame} •{" "}
                    {Math.round(displayProgress.frameProgress)}% Complete
                  </span>
                </div>
                <ProgressNext
                  value={displayProgress.frameProgress}
                  size="md"
                  color="primary"
                  aria-label="Frame rendering progress"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">Overall Progress</span>
                  <span className="text-text-primary font-medium">
                    Waiting...
                  </span>
                </div>
                <ProgressNext
                  isStriped
                  value={100}
                  size="md"
                  color="default"
                  aria-label="Waiting for render to start"
                />
              </div>
            )}

            {/* Sample Progress */}
            {displayProgress?.totalSamples && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">Sample Progress</span>
                  <span className="text-text-primary font-medium">
                    {displayProgress.currentSample || 0}/
                    {displayProgress.totalSamples}
                  </span>
                </div>
                <ProgressNext
                  value={
                    displayProgress.currentSample &&
                    displayProgress.totalSamples
                      ? (displayProgress.currentSample /
                          displayProgress.totalSamples) *
                        100
                      : 0
                  }
                  className="h-2.5"
                  aria-label="Sample rendering progress"
                />
              </div>
            )}

            {/* Process Memory */}
            <div className="space-y-2">
              <div className="text-xs text-text-secondary flex items-center gap-2">
                <MemoryStick size={16} />
                Process Memory
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-text-primary bg-background/40 rounded-lg p-3">
                  <span className="font-medium">
                    {displayProgress?.memory || "0MB"}
                  </span>
                  <span className="text-text-secondary text-xs ml-1">
                    Current
                  </span>
                </div>
                <div className="text-text-primary bg-background/40 rounded-lg p-3">
                  <span className="font-medium">
                    {displayProgress?.peakMemory || "0MB"}
                  </span>
                  <span className="text-text-secondary text-xs ml-1">Peak</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Monitor Card */}
      <Card className="bg-surface border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-text-primary">System Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* System Memory */}
            {systemMemory && (
              <div className="space-y-2">
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  <MemoryStick size={16} />
                  System Memory
                </div>
                <div className="bg-background/40 rounded-lg p-3 relative overflow-hidden">
                  <Progress
                    value={
                      (parseFloat(systemMemory.used.replace("GB", "")) /
                        parseFloat(systemMemory.total.replace("GB", ""))) *
                      100
                    }
                    className="absolute inset-0"
                    variant={
                      (parseFloat(systemMemory.used.replace("GB", "")) /
                        parseFloat(systemMemory.total.replace("GB", ""))) *
                        100 >
                      90
                        ? "danger"
                        : "default"
                    }
                    aria-label="System memory usage"
                  />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="text-text-primary">
                        <span className="font-medium">{systemMemory.used}</span>
                        <span className="text-text-secondary text-xs ml-1">
                          Used
                        </span>
                      </div>
                      <div className="text-text-primary">
                        <span className="font-medium">
                          {systemMemory.total}
                        </span>
                        <span className="text-text-secondary text-xs ml-1">
                          Total
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CPU Usage */}
            {systemUsage && (
              <div className="space-y-2">
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  <Cpu size={16} />
                  CPU Usage
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-text-primary">
                    {systemUsage.cpuModel}
                    <span className="text-text-secondary text-xs ml-2">
                      ({systemUsage.cpuCount} cores)
                    </span>
                  </div>

                  {/* Overall CPU Usage */}
                  <div className="bg-background/40 rounded-lg p-3 relative overflow-hidden">
                    <Progress
                      value={systemUsage.cpu}
                      className="absolute inset-0"
                      variant={
                        (systemUsage.gpu || 0) > 90
                          ? "danger"
                          : (systemUsage.gpu || 0) > 80
                          ? "warning"
                          : "default"
                      }
                      aria-label="CPU usage"
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="text-text-primary">
                          <span className="font-medium">
                            {Math.round(systemUsage.cpu)}%
                          </span>
                          <span className="text-text-secondary text-xs ml-1">
                            Average
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-Core Usage in Accordion */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="per-core-usage">
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <ChipIcon className="w-4 h-4" />
                          <span className="text-sm">Per-Core Usage</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {systemUsage.cpuPerCore.map((usage, index) => (
                            <div
                              key={index}
                              className="bg-background/40 rounded-lg p-2 relative overflow-hidden"
                            >
                              <Progress
                                value={usage}
                                className="absolute inset-0"
                                variant={
                                  usage > 90
                                    ? "danger"
                                    : usage > 80
                                    ? "warning"
                                    : "default"
                                }
                                aria-label={`CPU core ${index + 1} usage`}
                              />
                              <div className="relative z-10">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-text-secondary">
                                    Core {index + 1}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {Math.round(usage)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            )}

            {/* GPU Usage */}
            {systemUsage?.gpuModel && (
              <div className="space-y-2">
                <div className="text-xs text-text-secondary flex items-center gap-2">
                  <MonitorUp size={16} />
                  GPU Usage
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-text-primary">
                    {systemUsage.gpuModel}
                  </div>

                  {/* GPU Compute Usage */}
                  <div className="bg-background/40 rounded-lg p-3 relative overflow-hidden">
                    <Progress
                      value={systemUsage.gpu || 0}
                      className="absolute inset-0"
                      variant={
                        (systemUsage.gpu || 0) > 90
                          ? "danger"
                          : (systemUsage.gpu || 0) > 80
                          ? "warning"
                          : "default"
                      }
                      aria-label="GPU compute usage"
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="text-text-primary">
                          <span className="font-medium">
                            {Math.round(systemUsage.gpu || 0)}%
                          </span>
                          <span className="text-text-secondary text-xs ml-1">
                            Compute
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GPU Memory Usage */}
                  {systemUsage.gpuDetails && (
                    <>
                      <div className="bg-background/40 rounded-lg p-3 relative overflow-hidden">
                        <Progress
                          value={
                            (systemUsage.gpuDetails.memoryUsed /
                              systemUsage.gpuDetails.memoryTotal) *
                            100
                          }
                          className="absolute inset-0"
                          variant={
                            (systemUsage.gpuDetails.memoryUsed /
                              systemUsage.gpuDetails.memoryTotal) *
                              100 >
                            90
                              ? "danger"
                              : (systemUsage.gpuDetails.memoryUsed /
                                  systemUsage.gpuDetails.memoryTotal) *
                                  100 >
                                80
                              ? "warning"
                              : "default"
                          }
                          aria-label="GPU memory usage"
                        />
                        <div className="relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="text-text-primary">
                              <span className="font-medium">
                                {Math.round(
                                  (systemUsage.gpuDetails.memoryUsed /
                                    systemUsage.gpuDetails.memoryTotal) *
                                    100
                                )}
                                %
                              </span>
                              <span className="text-text-secondary text-xs ml-1">
                                Memory
                              </span>
                            </div>
                            <div className="text-text-secondary text-xs">
                              {Math.round(systemUsage.gpuDetails.memoryUsed)}MB
                              / {Math.round(systemUsage.gpuDetails.memoryTotal)}
                              MB
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* GPU Temperature */}
                      <div className="bg-background/40 rounded-lg p-3 relative overflow-hidden">
                        <Progress
                          value={
                            (systemUsage.gpuDetails.temperature / 100) * 100
                          }
                          className="absolute inset-0"
                          variant={
                            systemUsage.gpuDetails.temperature > 80
                              ? "danger"
                              : systemUsage.gpuDetails.temperature > 60
                              ? "warning"
                              : "default"
                          }
                          aria-label="GPU temperature"
                        />
                        <div className="relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="text-text-primary">
                              <span className="font-medium">
                                {Math.round(systemUsage.gpuDetails.temperature)}
                                °C
                              </span>
                              <span className="text-text-secondary text-xs ml-1">
                                Temperature
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
