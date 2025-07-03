# BRS v1.0.0 - Blender Render Suite by Nebula Studios 🎨

![BRS](https://cdn.discordapp.com/attachments/1341431737808588868/1373338731247042711/BRS.png?ex=68675a9c&is=6866091c&hm=1e8ed111ade481b416dde5d432bb742c0264cd2241ebc10070758d0178802664&)

## Overview

BRS is a powerful desktop application built with Electron and Next.js that provides a modern interface for managing Blender render jobs. It offers a seamless experience for both development and production environments.

## Key Features 🚀

### Render Management

- Real-time render progress monitoring
- Frame-by-frame tracking
- Memory usage monitoring
- Process management with automatic cleanup
- Support for both Windows and Unix-based systems

### Preset System

- Save and load render presets
- Import/export preset configurations
- Automatic Blender detection
- Customizable render parameters

### User Interface

- Modern, responsive design with ShadCN/UI components
- Dark mode support
- Drag-and-drop file handling
- Real-time system monitoring
- Toast notifications for important events

### Mobile Companion App 📱

- **Monitor and control renders remotely** with our dedicated mobile app for Android.
- **Real-time status updates** via push notifications for render progress, completion, and errors.
- **Secure pairing** with the desktop application using a QR code.
- **iOS version coming soon!**

### File Management

- Native file system integration
- Directory picker support
- Automatic path handling
- History tracking for recent operations

## System Requirements 💻

- Windows 10/11
- Node.js 18 or higher
- Blender 4.0 or higher

## Installation 🚀

1. Download the latest release for your platform
2. Run the installer
3. Launch BRS from the start menu/desktop shortcut

## Development Setup 🔧

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build-all
```

## Known Limitations ⚠️

- Some features may be platform-specific
- EEVEE Engine option works ONLY with Blender >= 4.0 due to changes in the Render Engine codename

## Future Roadmap 🗺️

- **iOS Companion App**: Bringing all the mobile features to iPhone and iPad.
- **Advanced Render Queue**: More granular control over render jobs, including priority and dependency management.
- **Custom Render Engine Support**: Deeper integration with more third-party render engines.
- **Cloud Rendering Integration**: Connect to popular cloud rendering services directly from BRS.

## Credits 👏

- Built with Electron and Next.js
- UI components from ShadCN/UI
- Icons from Lucide React
- Styling with Tailwind CSS

---
