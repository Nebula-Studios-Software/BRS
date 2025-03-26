import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'

interface LogEntry {
  timestamp: string
  message: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'FRAME'
}

interface LogViewerProps {
  entries: LogEntry[]
}

export const LogViewer: React.FC<LogViewerProps> = ({ entries }) => {
  const [showInfo, setShowInfo] = useState(true)
  const [showWarning, setShowWarning] = useState(true)
  const [showError, setShowError] = useState(true)
  const [detailLevel, setDetailLevel] = useState<string>('standard')
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState<string>("log-panel") // Default open

  useEffect(() => {
    if (scrollRef.current && autoScroll && isOpen === "log-panel") {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [entries, autoScroll, isOpen])

  const isTechnicalMessage = (message: string) => {
    const technicalPatterns = [
      'malloc', 'Memory:', 'AL lib:', 'pure-virtual:', 
      'OpenGL', 'libGL', '0x', 'libpng', 'libjpeg'
    ]
    return technicalPatterns.some(pattern => message.includes(pattern))
  }

  const isImportantMessage = (entry: LogEntry) => {
    if (entry.level === 'ERROR' || entry.level === 'WARNING') return true
    const importantPatterns = [
      'Rendering started', 'Rendering completed', 'Saved:', 
      'Blender quit', 'Fra:', 'Current Frame:'
    ]
    return importantPatterns.some(pattern => entry.message.includes(pattern))
  }

  const shouldShowMessage = (entry: LogEntry) => {
    // Level filter
    if (
      (entry.level === 'INFO' && !showInfo) ||
      (entry.level === 'WARNING' && !showWarning) ||
      (entry.level === 'ERROR' && !showError)
    ) {
      return false
    }

    // Detail level filter
    if (detailLevel === 'minimal') {
      return isImportantMessage(entry)
    } else if (detailLevel === 'standard') {
      return !isTechnicalMessage(entry.message) || entry.level === 'ERROR'
    }

    return true
  }

  const getMessageColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'INFO': return 'text-text-primary'
      case 'WARNING': return 'text-yellow-500'
      case 'ERROR': return 'text-red-500'
      case 'SUCCESS': return 'text-green-500'
      case 'FRAME': return 'text-primary'
      default: return 'text-text-primary'
    }
  }

  const filteredEntries = entries.filter(shouldShowMessage);
  const errorCount = entries.filter(entry => entry.level === 'ERROR').length;
  const warningCount = entries.filter(entry => entry.level === 'WARNING').length;

  return (
    <Card className="bg-surface border-border">
      <Accordion
        type="single" 
        collapsible 
        value={isOpen}
        onValueChange={setIsOpen}
        className="w-full"
      >
        <AccordionItem value="log-panel" className="border-b-0">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-text-primary">Log Output</CardTitle>
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <span className="bg-red-500/20 text-red-500 rounded-full px-2 py-0.5 text-xs">
                    {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="bg-yellow-500/20 text-yellow-500 rounded-full px-2 py-0.5 text-xs">
                    {warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}
                  </span>
                )}
                <span className="bg-blue-500/20 text-blue-500 rounded-full px-2 py-0.5 text-xs">
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'Entry' : 'Entries'}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-4 pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                {/* Filter controls */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Level filters */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="info" 
                        checked={showInfo} 
                        onCheckedChange={checked => setShowInfo(!!checked)} 
                      />
                      <Label htmlFor="info" className="text-text-primary">Info</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="warning" 
                        checked={showWarning} 
                        onCheckedChange={checked => setShowWarning(!!checked)} 
                      />
                      <Label htmlFor="warning" className="text-yellow-500">Warning</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="error" 
                        checked={showError} 
                        onCheckedChange={checked => setShowError(!!checked)} 
                      />
                      <Label htmlFor="error" className="text-red-500">Error</Label>
                    </div>
                  </div>

                  {/* Detail level selector */}
                  <Select value={detailLevel} onValueChange={setDetailLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Detail Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto-scroll switch */}
                <div className="flex items-center space-x-2">
                  <Label htmlFor="auto-scroll" className="text-text-primary">Auto-scroll</Label>
                  <Switch 
                    id="auto-scroll" 
                    checked={autoScroll} 
                    onCheckedChange={setAutoScroll} 
                  />
                </div>
              </div>

              {/* Log content */}
              <div 
                ref={scrollRef}
                className="border border-border rounded-md p-4 h-[200px] overflow-y-auto font-mono text-sm"
              >
                <div className="space-y-1">
                  {filteredEntries.map((entry, index) => (
                    <div key={index} className="whitespace-pre-wrap">
                      <span className="text-text-secondary">[{entry.timestamp}]</span>{' '}
                      <span className={getMessageColor(entry.level)}>
                        [{entry.level}] {entry.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}