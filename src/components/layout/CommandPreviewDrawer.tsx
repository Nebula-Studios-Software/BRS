import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface CommandPreviewDrawerProps {
  command: string;
  onReset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPreviewDrawer: React.FC<CommandPreviewDrawerProps> = ({
  command,
  onReset,
  open,
  onOpenChange,
}) => {
  const [displayedCommand, setDisplayedCommand] = useState(command);
  const [parsedCommand, setParsedCommand] = useState<{ baseCommand: string; parameters: { [key: string]: string[] } }>({ baseCommand: '', parameters: {} });

  useEffect(() => {
    setDisplayedCommand(command);
    setParsedCommand(parseCommand(command));
  }, [command]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(displayedCommand);
      toast.success("Command copied", {
        description: "The command has been copied to clipboard.",
      });
    } catch (err) {
      toast.error("Error", {
        description: "Failed to copy the command.",
      });
    }
  };

  const parseCommand = (cmd: string) => {
    const parts = cmd.split(' ');
    const baseCommand = parts[0];
    const parameters: { [key: string]: string[] } = {
      'Base': [],
      'File': [],
      'Engine': [],
      'Output': [],
      'Resolution': [],
      'Frames': [],
      'Cycles': []
    };

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      // Base command
      if (part === '-b') {
        parameters['Base'].push(part);
        continue;
      }

      // File parameters
      if (part.endsWith('.blend')) {
        parameters['File'].push(part);
        continue;
      }

      // Engine parameters
      if (part === '-E') {
        parameters['Engine'].push(part, parts[++i]);
        continue;
      }

      // Output parameters
      if (part === '-o' || part === '-F') {
        parameters['Output'].push(part, parts[++i]);
        continue;
      }

      // Resolution parameters
      if (part.startsWith('--resolution')) {
        parameters['Resolution'].push(part, parts[++i]);
        continue;
      }

      // Frame parameters
      if (part === '-a' || part === '-s' || part === '-e' || part === '-j') {
        parameters['Frames'].push(part);
        if (part !== '-a') {
          parameters['Frames'].push(parts[++i]);
        }
        continue;
      }

      // Cycles parameters
      if (part.startsWith('--cycles')) {
        parameters['Cycles'].push(part, parts[++i]);
        continue;
      }
    }

    return { baseCommand, parameters };
  };

  const { baseCommand, parameters } = parsedCommand;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Command Preview</DrawerTitle>
          <DrawerDescription>Review and copy the generated Blender command</DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="icon" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {/* Base Command */}
            <div className="flex items-center gap-2">
              <Badge variant="default" className="min-w-[80px]">Base</Badge>
              <code className="text-sm">{baseCommand}</code>
              {parameters['Base']?.map((part, i) => (
                <code key={i} className="text-sm">{part}</code>
              ))}
            </div>

            {/* File Parameters */}
            {parameters['File']?.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[80px]">File</Badge>
                {parameters['File'].map((part, i) => (
                  <code key={i} className="text-sm">{part}</code>
                ))}
              </div>
            )}

            {/* Engine Parameters */}
            {parameters['Engine']?.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[80px]">Engine</Badge>
                {parameters['Engine'].map((part, i) => (
                  <code key={i} className="text-sm">{part}</code>
                ))}
              </div>
            )}

            {/* Output Parameters */}
            {parameters['Output']?.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[80px]">Output</Badge>
                {parameters['Output'].map((part, i) => (
                  <code key={i} className="text-sm">{part}</code>
                ))}
              </div>
            )}

            {/* Resolution Parameters */}
            {parameters['Resolution']?.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[80px]">Resolution</Badge>
                {parameters['Resolution'].map((part, i) => (
                  <code key={i} className="text-sm">{part}</code>
                ))}
              </div>
            )}

            {/* Frame Parameters */}
            {parameters['Frames']?.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[80px]">Frames</Badge>
                {parameters['Frames'].map((part, i) => (
                  <code key={i} className="text-sm">{part}</code>
                ))}
              </div>
            )}

            {/* Cycles Parameters */}
            {parameters['Cycles']?.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="min-w-[80px]">Cycles</Badge>
                {parameters['Cycles'].map((part, i) => (
                  <code key={i} className="text-sm">{part}</code>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 p-2 bg-muted rounded-md">
            <code className="text-sm whitespace-pre-wrap break-all">{displayedCommand}</code>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CommandPreviewDrawer;
