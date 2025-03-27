const { spawn } = require('child_process')
const { join } = require('path')

function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    shell: true,
    stdio: 'inherit',
    ...options
  })

  child.on('error', (error) => {
    console.error(`Error running ${command}:`, error)
    process.exit(1)
  })

  return child
}

// Start Next.js dev server with proper HMR configuration
const nextDev = runCommand('npm', ['run', 'next-dev'], {
  env: {
    ...process.env,
    NEXT_WEBPACK_USEPOLLING: '1',
    CHOKIDAR_USEPOLLING: 'true'
  }
})

// Start Electron when Next.js is ready (wait-on handles this)
const electronDev = runCommand('npm', ['run', 'electron-dev'], {
  env: {
    ...process.env,
    NODE_ENV: 'development',
    ELECTRON_START_URL: 'http://localhost:3000'
  }
})

// Handle cleanup
function cleanup() {
  nextDev.kill()
  electronDev.kill()
  process.exit()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)