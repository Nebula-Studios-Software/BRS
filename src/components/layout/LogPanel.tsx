import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Terminal,
  X,
  Maximize2,
  Minimize2,
  Copy,
  Download,
  Search,
  Settings
} from 'lucide-react';
import LogViewer, { LogEntry } from './LogViewer';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LogPanelProps {
  logs: LogEntry[];
  isVisible: boolean;
  onToggle: () => void;
  onClear: () => void;
  className?: string;
}

const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  isVisible,
  onToggle,
  onClear,
  className
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Memoize counts to avoid recalculation on every render
  const { errorCount, warningCount } = useMemo(() => ({
    errorCount: logs.filter(log => log.level === 'error' || log.level === 'fatal').length,
    warningCount: logs.filter(log => log.level === 'warning').length
  }), [logs]);

  // Memoize log text generation for performance
  const logText = useMemo(() =>
    logs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n'),
    [logs]
  );

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  const handleExportLogs = () => {
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `render-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Logs exported successfully');
  };

  // Memoize filtered logs to avoid recalculation on every render
  const filteredLogs = useMemo(() =>
    searchTerm
      ? logs.filter(log =>
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.level.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : logs,
    [logs, searchTerm]
  );

  if (!isVisible) return null;

  const panelContent = (
    <Card className={`${className} ${isMaximized ? 'fixed inset-4 z-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4" />
            Render Logs
            {logs.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {logs.length} total
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} errors
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-500">
                    {warningCount} warnings
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 mr-2">
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 w-32 text-xs"
              />
              <Search className="h-3 w-3 text-muted-foreground" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLogs}
              className="h-7 w-7"
              title="Copy all logs"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportLogs}
              className="h-7 w-7"
              title="Export logs"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-7 w-7"
              title="Log settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-7 w-7"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7"
              title="Close logs"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {showSettings && (
          <Collapsible open={showSettings}>
            <CollapsibleContent className="pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Settings panel can be expanded here for log preferences</span>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className={`${isMaximized ? 'h-[calc(100vh-200px)]' : 'h-48'}`}>
          <LogViewer logs={filteredLogs} onClear={onClear} />
        </div>
      </CardContent>
    </Card>
  );

  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        {panelContent}
      </div>
    );
  }

  return panelContent;
};

export default LogPanel;