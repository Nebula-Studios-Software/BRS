import { useState, useCallback, useMemo } from 'react';
import { LogEntry } from '@/components/layout/LogViewer';

const MAX_LOG_ENTRIES = 2000;

interface UseLogBufferReturn {
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  addLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  getLogCount: () => number;
}

export const useLogBuffer = (initialLogs: LogEntry[] = []): UseLogBufferReturn => {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // Ensure we don't exceed the limit even with initial logs
    return initialLogs.slice(-MAX_LOG_ENTRIES);
  });

  const addLog = useCallback((log: LogEntry) => {
    setLogs(prev => {
      const newLogs = [...prev, log];
      // Keep only the most recent MAX_LOG_ENTRIES
      return newLogs.length > MAX_LOG_ENTRIES 
        ? newLogs.slice(-MAX_LOG_ENTRIES)
        : newLogs;
    });
  }, []);

  const addLogs = useCallback((newLogs: LogEntry[]) => {
    setLogs(prev => {
      const combined = [...prev, ...newLogs];
      // Keep only the most recent MAX_LOG_ENTRIES
      return combined.length > MAX_LOG_ENTRIES 
        ? combined.slice(-MAX_LOG_ENTRIES)
        : combined;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getLogCount = useCallback(() => logs.length, [logs.length]);

  return useMemo(() => ({
    logs,
    addLog,
    addLogs,
    clearLogs,
    getLogCount
  }), [logs, addLog, addLogs, clearLogs, getLogCount]);
};