import React, { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Filter, Trash2 } from 'lucide-react';

export type LogLevel = 'verbose' | 'info' | 'warning' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  onClear?: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [visibleLevels, setVisibleLevels] = useState<LogLevel[]>([
    'verbose',
    'info',
    'warning',
    'error',
    'fatal'
  ]);

  const levelColors = {
    verbose: 'text-muted-foreground',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    fatal: 'text-red-700 font-bold'
  };

  const levelOrder = {
    verbose: 0,
    info: 1,
    warning: 2,
    error: 3,
    fatal: 4
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleLevel = (level: LogLevel) => {
    setVisibleLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level].sort((a, b) => levelOrder[a] - levelOrder[b])
    );
  };

  const filteredLogs = logs.filter(log => visibleLevels.includes(log.level));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Log Levels</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoScroll(!autoScroll)}
            className="h-8 w-8"
          >
            {autoScroll ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 p-2">
        {(['verbose', 'info', 'warning', 'error', 'fatal'] as LogLevel[]).map(level => (
          <div
            key={level}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => toggleLevel(level)}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                visibleLevels.includes(level)
                  ? levelColors[level]
                  : 'bg-muted'
              }`}
            />
            <span className="text-xs capitalize">{level}</span>
          </div>
        ))}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-2">
        <div className="space-y-1">
          {filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`text-sm ${levelColors[log.level]} font-mono`}
            >
              <span className="text-muted-foreground mr-2">[{log.timestamp}]</span>
              <span className="uppercase mr-2">[{log.level}]</span>
              {log.message}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LogViewer;
