import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Terminal, AlertTriangle, AlertCircle } from 'lucide-react';
import { LogEntry } from './LogViewer';
import { cn } from '@/lib/utils';

interface FloatingLogButtonProps {
  logs: LogEntry[];
  onClick: () => void;
  isLogPanelVisible: boolean;
  className?: string;
}

const FloatingLogButton: React.FC<FloatingLogButtonProps> = ({
  logs,
  onClick,
  isLogPanelVisible,
  className
}) => {
  const errorCount = logs.filter(log => log.level === 'error' || log.level === 'fatal').length;
  const warningCount = logs.filter(log => log.level === 'warning').length;
  const hasNewLogs = logs.length > 0;
  
  // Don't show if log panel is already visible
  if (isLogPanelVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-14 right-6 z-40",
      className
    )}>
      <Button
        onClick={onClick}
        variant={errorCount > 0 ? "destructive" : warningCount > 0 ? "secondary" : "default"}
        size="default"
        className={cn(
          "shadow-lg hover:shadow-xl transition-all duration-200",
          "flex items-center gap-2 px-4 py-2 min-w-[120px]",
          hasNewLogs && "animate-pulse"
        )}
      >
        <div className="flex items-center gap-2">
          {errorCount > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : warningCount > 0 ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Terminal className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {errorCount > 0 ? 'Errors' : warningCount > 0 ? 'Warnings' : 'Logs'}
          </span>
        </div>
        
        {logs.length > 0 && (
          <div className="flex items-center gap-1">
            {errorCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-red-500/20 text-red-400">
                {errorCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-yellow-500/20 text-yellow-400">
                {warningCount}
              </Badge>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {logs.length}
              </Badge>
            )}
          </div>
        )}
      </Button>
    </div>
  );
};

export default FloatingLogButton;