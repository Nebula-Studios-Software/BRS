import React from "react";
import { useBlenderVersions } from "@/lib/hooks/useBlenderVersions";
import { Select, SelectItem } from "@heroui/react";
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

  // Aggiungi log per il debug
  console.log('Selected Version:', selectedVersion);

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
            defaultSelectedKeys={selectedVersion?.version ? [selectedVersion.version] : []}
            onChange={(e) => {
              const selected = versions.find((v) => v.version === e.target.value);
              if (selected) {
                selectVersion(selected);
                console.log('Version selected:', selected); // Log per il debug
              }
            }}
            popoverProps={{
              classNames: {
                base: 'before:bg-default-300',
                content: 'p-0 border-small border-divider bg-default-100 text-text-secondary',
              },
            }}
          >
            {versions.map((version) => (
              <SelectItem key={version.version} textValue={version.version}>
                Blender {version.version}
              </SelectItem>
            ))}
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
