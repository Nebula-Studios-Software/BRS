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

// Start Next.js dev server
const nextDev = runCommand('npm', ['run', 'next-dev'])

// Start Electron when Next.js is ready (wait-on handles this)
const electronDev = runCommand('npm', ['run', 'electron-dev'])

// Handle cleanup
function cleanup() {
  nextDev.kill()
  electronDev.kill()
  process.exit()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)