import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { FolderOpen, Download, Settings, CheckCircle2 } from 'lucide-react';

interface InstallerUIProps {
  onInstall: (options: InstallOptions) => void;
  onCancel: () => void;
}

interface InstallOptions {
  installPath: string;
  createDesktopShortcut: boolean;
  createStartMenuShortcut: boolean;
  launchOnStartup: boolean;
}

const InstallerUI: React.FC<InstallerUIProps> = ({ onInstall, onCancel }) => {
  const [installPath, setInstallPath] = useState('C:\\Program Files\\BRS');
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true);
  const [createStartMenuShortcut, setCreateStartMenuShortcut] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleInstall = () => {
    setIsInstalling(true);
    onInstall({
      installPath,
      createDesktopShortcut,
      createStartMenuShortcut,
      launchOnStartup
    });
  };

  const handleBrowse = async () => {
    const result = await window.electronAPI.showDirectoryPicker();
    if (result) {
      setInstallPath(result);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-6 w-6" />
            Install BRS - Blender Render Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="installPath">Installation Directory</Label>
              <div className="flex gap-2">
                <Input
                  id="installPath"
                  value={installPath}
                  onChange={(e) => setInstallPath(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleBrowse}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Installation Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="desktopShortcut"
                    checked={createDesktopShortcut}
                    onCheckedChange={(checked) => setCreateDesktopShortcut(checked as boolean)}
                  />
                  <Label htmlFor="desktopShortcut">Create Desktop Shortcut</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="startMenuShortcut"
                    checked={createStartMenuShortcut}
                    onCheckedChange={(checked) => setCreateStartMenuShortcut(checked as boolean)}
                  />
                  <Label htmlFor="startMenuShortcut">Create Start Menu Shortcut</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="launchOnStartup"
                    checked={launchOnStartup}
                    onCheckedChange={(checked) => setLaunchOnStartup(checked as boolean)}
                  />
                  <Label htmlFor="launchOnStartup">Launch on System Startup</Label>
                </div>
              </div>
            </div>
          </div>

          {isInstalling && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Installing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isInstalling}>
              Cancel
            </Button>
            <Button onClick={handleInstall} disabled={isInstalling}>
              {isInstalling ? (
                <>
                  <Settings className="h-4 w-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallerUI;
