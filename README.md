# Blender Render Suite

A modern interface for managing Blender render tasks, offering an intuitive and efficient way to handle multiple render projects.

## Installation

### Windows

1. Download the latest installer (.exe) from the [Releases page](https://github.com/Nebula-Studios-Software/BRS/releases)
2. Run the installer and follow the on-screen instructions
3. The app will be installed in `C:\Program Files\Blender Render Suite` by default

### macOS

1. Download the latest .dmg file from the [Releases page](https://github.com/Nebula-Studios-Software/BRS/releases)
2. Open the .dmg file and drag the app to your Applications folder
3. Right-click the app and select "Open" for the first launch

### Linux

1. Download the latest AppImage from the [Releases page](https://github.com/Nebula-Studios-Software/BRS/releases)
2. Make the AppImage executable: `chmod +x BlenderRenderSuite.AppImage`
3. Run the AppImage

## Application Data

The app stores its data in the following locations:

### Windows

- Settings and configurations: `%APPDATA%\blender-render-suite`
- Cache files: `%LOCALAPPDATA%\blender-render-suite`

### macOS

- User data: `~/Library/Application Support/blender-render-suite`
- Cache: `~/Library/Caches/blender-render-suite`

### Linux

- User data: `~/.config/blender-render-suite`
- Cache: `~/.cache/blender-render-suite`

## Updates

The app automatically checks for updates on startup. When a new version is available:

1. You'll receive a notification with the changelog
2. Choose to update now or later
3. The update will download and install automatically

## Uninstallation

### Windows

1. Open Windows Settings > Apps > Installed Apps
2. Find "Blender Render Suite" and click Uninstall
3. To remove all data:
   - Delete `%APPDATA%\blender-render-suite`
   - Delete `%LOCALAPPDATA%\blender-render-suite`

### macOS

1. Delete the app from the Applications folder
2. To remove all data:
   - Delete `~/Library/Application Support/blender-render-suite`
   - Delete `~/Library/Caches/blender-render-suite`

### Linux

1. Delete the AppImage file
2. To remove all data:
   - Delete `~/.config/blender-render-suite`
   - Delete `~/.cache/blender-render-suite`

## Manual Data Cleanup

If you need to reset the application to its default state:

1. Close the application completely
2. Delete the folders mentioned in the "Application Data" section for your OS
3. Restart the application

## Support

For bug reports and feature requests, please use our [GitHub Issues](https://github.com/Nebula-Studios-Software/BRS/issues) page.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
