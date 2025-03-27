export interface Parameter {
  name: string
  param: string
  type: 'bool' | 'file' | 'path' | 'string' | 'int' | 'enum'
  fileDescription?: string[]
  description: string
  options?: string[]
  isPath?: boolean // Added to mark parameters that need special path handling
}

export interface ParameterCategory {
  [key: string]: Parameter[]
}

export const PARAM_ORDER: { [key: string]: number } = {
  '-b': 0,            // --background (always first)
  '-E': 1,           // --engine (right after the .blend file)
  '-F': 3,           // --render-format
  '-o': 4,           // --render-output
  '-S': 5,           // --scene
  '-f': 6,           // --render-frame
  '-s': 6,           // --frame-start (same priority as -f)
  '-e': 7,           // --frame-end
  '-a': 8,           // --render-anim (after frame parameters)
  '-j': 9,           // --frame-jump
  '-x': 10,          // --use-extension
  '-y': 18,          // --enable-autoexec
  '-Y': 19,          // --disable-autoexec
  '--addons': 26,
  '--resolution-x': 28,
  '--resolution-y': 29,
  '-d': 30,           // --debug
  '--debug-memory': 31,
  '--debug-cycles': 32
}

export const ParamDefinitions = {
  // Basic parameters
  BACKGROUND: '-b',
  HELP: '--help',
  VERSION: '--version',

  // Rendering parameters
  RENDER: '-a',
  RENDER_FRAME: '-f',
  RENDER_OUTPUT: '-o',
  OUTPUT_DIRECTORY: 'output-directory', // Custom internal parameter
  OUTPUT_FILENAME: 'output-filename',   // Custom internal parameter
  SCENE: '-S',
  ENGINE: '-E',

  // File parameters
  FILE: '--',
  ADDONS: '--addons',

  // Format and resolution parameters
  FORMAT: '-F',
  USE_EXTENSION: '-x',
  RESOLUTION_X: '--resolution-x',
  RESOLUTION_Y: '--resolution-y',
  RESOLUTION_PERCENTAGE: '--resolution-percentage',

  // Frame parameters
  FRAME_START: '-s',
  FRAME_END: '-e',
  FRAME_JUMP: '-j',

  // Cycles parameters
  CYCLES_PRINT_STATS: '--cycles-print-stats',
  CYCLES_SAMPLES: '--cycles-samples',

  // Thread and performance parameters
  THREADS: '-t',

  // Startup parameters
  ENABLE_AUTOEXEC: '-y',
  DISABLE_AUTOEXEC: '-Y',

  // Debug parameters
  DEBUG: '-d',
  DEBUG_MEMORY: '--debug-memory',
  DEBUG_CYCLES: '--debug-cycles',

  getParamOrder: (param: string): number => {
    return PARAM_ORDER[param] ?? 999
  },

  getCategories: (): ParameterCategory => ({
    'Base': [
      {
        name: 'Background',
        param: ParamDefinitions.BACKGROUND,
        type: 'bool',
        description: 'Run Blender in headless mode (without GUI)'
      },
      {
        name: 'Blend File',
        param: ParamDefinitions.FILE,
        type: 'file',
        description: 'Blend file to open'
      },
    ],
    'Output': [
      {
        name: 'Output Directory',
        param: ParamDefinitions.OUTPUT_DIRECTORY,
        type: 'path',
        description: 'Directory for output files',
        isPath: true
      },
      {
        name: 'File Name',
        param: ParamDefinitions.OUTPUT_FILENAME,
        type: 'string',
        description: 'Base name for output files'
      },
    ],
    'Rendering': [
      {
        name: 'Render Animation',
        param: ParamDefinitions.RENDER,
        type: 'bool',
        description: 'Render the complete animation'
      },
      {
        name: 'Render Frame',
        param: ParamDefinitions.RENDER_FRAME,
        type: 'string',
        description: "Render specific frames (e.g. '1,3,5-10')"
      },
      {
        name: 'Scene',
        param: ParamDefinitions.SCENE,
        type: 'string',
        description: 'Scene name to render'
      },
      {
        name: 'Engine',
        param: ParamDefinitions.ENGINE,
        type: 'enum',
        description: 'Render engine to use',
        options: ['CYCLES', 'BLENDER_EEVEE_NEXT', 'BLENDER_WORKBENCH']
      }
    ],
    'Format': [
      {
        name: 'Format',
        param: ParamDefinitions.FORMAT,
        type: 'enum',
        description: 'Output file format',
        options: ['PNG', 'FFMPEG', 'JPEG', 'OPEN_EXR', 'TIFF', 'WEBP'],
        fileDescription: ['PNG Image', 'FFMPEG Video', 'JPEG Image', 'OpenEXR Image', 'TIFF Image', 'WebP Image']
      },
      {
        name: 'Resolution X',
        param: ParamDefinitions.RESOLUTION_X,
        type: 'int',
        description: 'Rendered image width in pixels'
      },
      {
        name: 'Resolution Y',
        param: ParamDefinitions.RESOLUTION_Y,
        type: 'int',
        description: 'Rendered image height in pixels'
      },
      {
        name: 'Resolution %',
        param: ParamDefinitions.RESOLUTION_PERCENTAGE,
        type: 'int',
        description: 'Resolution percentage (1-100)'
      }
    ],
    'Frames': [
      {
        name: 'Start Frame',
        param: ParamDefinitions.FRAME_START,
        type: 'int',
        description: 'Start frame of animation'
      },
      {
        name: 'End Frame',
        param: ParamDefinitions.FRAME_END,
        type: 'int',
        description: 'End frame of animation'
      },
      {
        name: 'Frame Jump',
        param: ParamDefinitions.FRAME_JUMP,
        type: 'int',
        description: 'Number of frames to skip between renders'
      }
    ],
    'Cycles': [
      {
        name: 'Samples',
        param: ParamDefinitions.CYCLES_SAMPLES,
        type: 'int',
        description: 'Number of samples for rendering'
      }
    ],
    'Performance': [
      {
        name: 'Threads',
        param: ParamDefinitions.THREADS,
        type: 'int',
        description: 'Number of threads for rendering (0=auto)'
      }
    ],
    // 'Debug': [
    //   {
    //     name: 'Debug',
    //     param: ParamDefinitions.DEBUG,
    //     type: 'bool',
    //     description: 'Enable debug mode'
    //   },
    //   {
    //     name: 'Debug Memory',
    //     param: ParamDefinitions.DEBUG_MEMORY,
    //     type: 'bool',
    //     description: 'Show memory usage information'
    //   },
    //   {
    //     name: 'Debug Cycles',
    //     param: ParamDefinitions.DEBUG_CYCLES,
    //     type: 'bool',
    //     description: 'Enable Cycles debug'
    //   }
    // ],
    // 'Advanced': [
    //   {
    //     name: 'Enable Autoexec',
    //     param: ParamDefinitions.ENABLE_AUTOEXEC,
    //     type: 'bool',
    //     description: 'Enable Python scripts auto-execution'
    //   },
    //   {
    //     name: 'Disable Autoexec',
    //     param: ParamDefinitions.DISABLE_AUTOEXEC,
    //     type: 'bool',
    //     description: 'Disable Python scripts auto-execution'
    //   }
    // ]
  })
}