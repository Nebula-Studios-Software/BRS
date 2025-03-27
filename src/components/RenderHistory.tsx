import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { Accordion, AccordionItem } from "@heroui/react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2, History } from "lucide-react";
import { ParamDefinitions } from "@/lib/paramDefinitions";
import { Badge } from "./ui/badge";

interface RenderLog {
  id: string;
  engine: string;
  startDate: string;
  endDate: string;
  command: string;
  parameters: Record<string, any>;
  renderTime: number;
  status: 'completed' | 'stopped' | 'error';
}

interface RenderHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const RenderHistory: React.FC<RenderHistoryProps> = ({
  open,
  onOpenChange,
}) => {
  const [logs, setLogs] = useState<RenderLog[]>([]);

  // Carica i log all'apertura del drawer
  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  // Carica i log dal localStorage
  const loadLogs = () => {
    const savedLogs = localStorage.getItem("renderHistory");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  };

  // Salva i log nel localStorage
  const saveLogs = (newLogs: RenderLog[]) => {
    localStorage.setItem("renderHistory", JSON.stringify(newLogs));
    setLogs(newLogs);
  };

  // Elimina un singolo log
  const deleteLog = (id: string) => {
    const newLogs = logs.filter((log) => log.id !== id);
    saveLogs(newLogs);
  };

  // Elimina tutti i log
  const clearLogs = () => {
    saveLogs([]);
  };

  // Raggruppa i parametri per categoria
  const groupParametersByCategory = (parameters: Record<string, any>) => {
    const categories = ParamDefinitions.getCategories();
    const grouped: Record<string, Record<string, any>> = {};

    Object.entries(parameters).forEach(([key, value]) => {
      const category = Object.entries(categories).find(([_, params]) =>
        params.some((param) => param.param === key)
      )?.[0];

      if (category) {
        if (!grouped[category]) {
          grouped[category] = {};
        }
        grouped[category][key] = value;
      }
    });

    return grouped;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-text-primary">
              <History size={20} />
              Render History
            </span>
            {logs.length > 0 && (
              <Button
                variant="light"
                color="danger"
                startContent={<Trash2 size={16} />}
                onPress={clearLogs}
              >
                Clear All
              </Button>
            )}
          </DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4">
            {logs.length === 0 ? (
              <div className="text-center text-text-secondary py-8">
                No render history available
              </div>
            ) : (
              <Accordion>
                {logs.map((log) => (
                  <AccordionItem
                    key={log.id}
                    title={
                      <div className="flex items-center justify-between w-full text-text-primary">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {new Date(log.startDate).toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({formatDuration(log.renderTime)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.status === 'completed'
                              ? 'bg-green-500/20 text-green-500'
                              : log.status === 'stopped'
                              ? 'bg-yellow-500/20 text-yellow-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}>
                            {log.status === 'completed' ? 'Completato' : log.status === 'stopped' ? 'Fermato' : 'Errore'}
                          </span>
                          <span className="px-2 py-1 rounded text-xs border border-border">
                            {log.engine}
                          </span>
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-4 p-4 text-text-primary">
                      {/* Command */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium mb-2">Command</h4>
                        <div className="bg-background/40 rounded-lg p-3 font-mono text-sm">
                          {log.command}
                        </div>
                      </div>

                      {/* Parameters */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium mb-2">Parameters</h4>
                        <div className="bg-background/40 rounded-lg p-3">
                          <div className="space-y-3">
                            {Object.entries(log.parameters).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="text-sm font-medium">
                                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLog(log.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Log
                      </Button>
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

