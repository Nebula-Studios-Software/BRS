import React from "react";
import { useBlenderVersions } from "@/lib/hooks/useBlenderVersions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@heroui/react";
import { FolderSearch } from "lucide-react";

export function BlenderVersionSelector() {
  const {
    versions,
    selectedVersion,
    selectVersion,
    isLoading,
    addCustomVersion,
  } = useBlenderVersions();

  const handleManualSelect = async () => {
    if (typeof window === "undefined") return;

    try {
      const filePath = await window.electron.openFile({
        filters: [
          {
            name: "Blender Executable",
            extensions: window.electron.platform === "win32" ? ["exe"] : ["*"],
          },
        ],
      });

      if (filePath) {
        // Crea una nuova versione custom
        addCustomVersion(filePath);
      }
    } catch (error) {
      console.error("Error selecting Blender path:", error);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Blender Version</Label>
      <div className="flex gap-2">
        {isLoading ? (
          <div className="flex-1 text-sm text-muted-foreground animate-pulse">
            Searching for Blender installations...
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 text-sm text-yellow-500">
            No Blender installations found. Please select an executable
            manually.
          </div>
        ) : (
          <Select
            value={selectedVersion?.version}
            onValueChange={(version) => {
              const selected = versions.find((v) => v.version === version);
              if (selected) {
                selectVersion(selected);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Blender version">
                {selectedVersion
                  ? `Blender ${selectedVersion.version}`
                  : "Select Blender version"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.version} value={version.version}>
                  Blender {version.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant="ghost"
          isIconOnly
          onPress={handleManualSelect}
          title="Select Blender manually"
        >
          <FolderSearch size={16} />
        </Button>
      </div>
    </div>
  );
}
