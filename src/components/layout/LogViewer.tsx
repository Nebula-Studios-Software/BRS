import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
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

interface LogItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    logs: LogEntry[];
    levelColors: Record<LogLevel, string>;
  };
}

const LogItem: React.FC<LogItemProps> = ({ index, style, data }) => {
  const { logs, levelColors } = data;
  const log = logs[index];

  if (!log) return null;

  return (
    <div style={style} className="px-2">
      <div
        className={`text-sm font-mono p-2 rounded border-l-2 hover:bg-muted/20 transition-colors ${
          log.level === 'error' || log.level === 'fatal'
            ? 'bg-red-500/5 border-l-red-500'
            : log.level === 'warning'
            ? 'bg-yellow-500/5 border-l-yellow-500'
            : 'bg-transparent border-l-border'
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground text-xs min-w-[60px]">
            {log.timestamp}
          </span>
          <span className={`text-xs uppercase font-semibold min-w-[50px] ${levelColors[log.level]}`}>
            {log.level}
          </span>
          <span className="flex-1 break-words">{log.message}</span>
        </div>
      </div>
    </div>
  );
};

const LogViewer: React.FC<LogViewerProps> = ({ logs, onClear }) => {
  const listRef = useRef<List>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [visibleLevels, setVisibleLevels] = useState<LogLevel[]>([
    'verbose',
    'info',
    'warning',
    'error',
    'fatal'
  ]);

  const levelColors = useMemo(() => ({
    verbose: 'text-muted-foreground',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    fatal: 'text-red-700 font-bold'
  }), []);

  const levelOrder = useMemo(() => ({
    verbose: 0,
    info: 1,
    warning: 2,
    error: 3,
    fatal: 4
  }), []);

  // Memoize filtered logs to avoid recalculation on every render
  const filteredLogs = useMemo(() => 
    logs.filter(log => visibleLevels.includes(log.level)),
    [logs, visibleLevels]
  );

  // Memoize data for react-window to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    logs: filteredLogs,
    levelColors
  }), [filteredLogs, levelColors]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && listRef.current && filteredLogs.length > 0) {
      listRef.current.scrollToItem(filteredLogs.length - 1, 'end');
    }
  }, [filteredLogs.length, autoScroll]);

  const toggleLevel = useCallback((level: LogLevel) => {
    setVisibleLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level].sort((a, b) => levelOrder[a] - levelOrder[b])
    );
  }, [levelOrder]);

  const handleScrollToBottom = useCallback(() => {
    if (listRef.current && filteredLogs.length > 0) {
      listRef.current.scrollToItem(filteredLogs.length - 1, 'end');
    }
  }, [filteredLogs.length]);

  // Calculate item height based on content (we'll use a fixed height for performance)
  const ITEM_HEIGHT = 60; // Approximate height for each log entry

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter Levels</span>
          <span className="text-xs text-muted-foreground">
            ({filteredLogs.length} of {logs.length} logs)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`h-7 w-7 ${autoScroll ? 'text-green-500' : 'text-muted-foreground'}`}
            title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
          >
            {autoScroll ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          {!autoScroll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleScrollToBottom}
              className="h-7 px-2 text-xs"
              title="Scroll to bottom"
            >
              Bottom
            </Button>
          )}
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Clear all logs"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-3 border-b bg-muted/10">
        {(['verbose', 'info', 'warning', 'error', 'fatal'] as LogLevel[]).map(level => (
          <button
            key={level}
            className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-all hover:bg-muted/50 ${
              visibleLevels.includes(level)
                ? 'bg-muted border border-border'
                : 'bg-transparent border border-transparent opacity-50'
            }`}
            onClick={() => toggleLevel(level)}
            title={`Toggle ${level} logs`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                visibleLevels.includes(level)
                  ? levelColors[level]
                  : 'bg-muted-foreground/30'
              }`}
            />
            <span className="capitalize font-medium">{level}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 relative">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-sm">No logs to display</div>
              <div className="text-xs mt-1">
                {logs.length > 0 
                  ? "Try adjusting the filter levels above"
                  : "Logs will appear here when rendering starts"
                }
              </div>
            </div>
          </div>
        ) : (
          <List
            ref={listRef}
            height={400} // This will be overridden by parent container
            width="100%"
            itemCount={filteredLogs.length}
            itemSize={ITEM_HEIGHT}
            itemData={itemData}
            className="w-full h-full"
            overscanCount={5} // Render 5 extra items outside visible area for smooth scrolling
          >
            {LogItem}
          </List>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
