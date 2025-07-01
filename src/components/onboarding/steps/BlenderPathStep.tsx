'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface BlenderVersion {
  path: string;
  version: string;
}

interface BlenderPathStepProps {
  currentPath?: string;
  onPathChange?: (path: string) => void;
}

const BlenderPathStep: React.FC<BlenderPathStepProps> = ({
  currentPath,
  onPathChange,
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [availableVersions, setAvailableVersions] = useState<BlenderVersion[]>([]);
  const [selectedPath, setSelectedPath] = useState(currentPath || '');
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'found' | 'not-found'>('idle');

  useEffect(() => {
    // Auto-detect on component startup only if there's no path already
    if (!currentPath) {
      detectBlender();
    } else {
      setDetectionStatus('found');
    }
  }, [currentPath]);

  // Effect to synchronize selected path when it changes from selection/detection
  useEffect(() => {
    if (selectedPath && onPathChange && selectedPath !== currentPath) {
      onPathChange(selectedPath);
    }
  }, [selectedPath, onPathChange, currentPath]);

  // Effect to update selectedPath when currentPath changes from outside
  useEffect(() => {
    if (currentPath && currentPath !== selectedPath) {
      setSelectedPath(currentPath);
    }
  }, [currentPath]);

  const detectBlender = async () => {
    setIsDetecting(true);
    setDetectionStatus('detecting');
    
    try {
      const result = await window.electronAPI.detectBlender();
      if (result && Array.isArray(result) && result.length > 0) {
        setAvailableVersions(result);
        setDetectionStatus('found');
        
        // If there's no path selected already, use the first available
        if (!selectedPath) {
          setSelectedPath(result[0].path);
        }
        
        toast.success("Blender versions detected", {
          description: `Found ${result.length} Blender installation(s)`,
        });
      } else {
        setDetectionStatus('not-found');
        setAvailableVersions([]);
        toast.error("Blender not found", {
          description: "No Blender installation was found. Please select the path manually.",
        });
      }
    } catch (error) {
      setDetectionStatus('not-found');
      setAvailableVersions([]);
      toast.error("Error", {
        description: "Error during Blender detection.",
      });
      console.error('Error detecting Blender:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleManualSelect = async () => {
    try {
      const result = await window.electronAPI.openFileDialog({
        filters: [{ name: 'Blender Executable', extensions: ['exe', 'app', 'blender'] }]
      });
      if (result && result.length > 0) {
        const newPath = result[0];
        setSelectedPath(newPath);
        
        // Add the new version to the list if it's not already present
        if (!availableVersions.some(v => v.path === newPath)) {
          setAvailableVersions(prev => [...prev, { path: newPath, version: 'Custom' }]);
          setDetectionStatus('found');
        }
        
        toast.success("Blender path set", {
          description: `Selected Blender: ${newPath}`,
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Error during Blender executable file selection.",
      });
    }
  };

  const handleVersionSelect = (path: string) => {
    setSelectedPath(path);
  };

  const getStatusIcon = () => {
    switch (detectionStatus) {
      case 'detecting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'found':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'not-found':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (detectionStatus) {
      case 'detecting':
        return 'Searching for Blender...';
      case 'found':
        return `${availableVersions.length} Blender version(s) found`;
      case 'not-found':
        return 'No Blender installation detected automatically';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold">Configure Blender Path</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          To use BRS, you need to specify where Blender is located on your system.
          Let's try to detect it automatically or you can select it manually.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Automatic Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={detectBlender}
              disabled={isDetecting}
              className="flex items-center gap-2"
            >
              {isDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isDetecting ? 'Searching...' : 'Detect Automatically'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {getStatusMessage()}
            </span>
          </div>

          {availableVersions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Found versions:</label>
              <Select value={selectedPath} onValueChange={handleVersionSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Blender version" />
                </SelectTrigger>
                <SelectContent>
                  {availableVersions.map((version) => (
                    <SelectItem key={version.path} value={version.path}>
                      Blender {version.version} - {version.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If automatic detection didn't work, you can manually select
            the Blender executable file.
          </p>
          
          <div className="flex gap-2">
            <Input
              value={selectedPath}
              readOnly
              placeholder="Path to Blender executable file"
              className="flex-1"
            />
            <Button variant="outline" onClick={handleManualSelect}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedPath && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Perfect! Blender is configured correctly: <code className="font-mono text-sm">{selectedPath}</code>
          </AlertDescription>
        </Alert>
      )}

      {!selectedPath && detectionStatus === 'not-found' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to select the Blender path to continue.
            Try automatic detection or manually select the executable file.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BlenderPathStep;