import { z } from 'zod';

// Schema per la validazione dei parametri
const ParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'enum', 'file', 'path']),
  category: z.string(),
  priority: z.number(),
  defaultValue: z.any().optional(),
  options: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  dependencies: z.array(z.object({
    parameter: z.string(),
    condition: z.string()
  })).optional(),
  help: z.string().optional(),
  icon: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  validation: z.object({
    pattern: z.string().optional(),
    message: z.string().optional()
  }).optional()
});

// Definizione dei parametri
export const renderParameters = {
  categories: [
    {
      id: 'base',
      name: 'Base Settings',
      description: 'Basic configuration settings',
      priority: 1
    },
    {
      id: 'output',
      name: 'Output Settings',
      description: 'Output file and directory settings',
      priority: 2
    },
    {
      id: 'render',
      name: 'Render Settings',
      description: 'Core rendering parameters',
      priority: 3
    },
    {
      id: 'resolution',
      name: 'Resolution Settings',
      description: 'Image resolution and size settings',
      priority: 4
    },
    {
      id: 'frames',
      name: 'Frame Settings',
      description: 'Animation frame settings',
      priority: 5
    },
    {
      id: 'cycles',
      name: 'Cycles Settings',
      description: 'Cycles render engine specific settings',
      priority: 6
    }
  ],
  parameters: [
    // Base Settings
    {
      id: 'blend_file',
      name: 'Blend File',
      description: 'The .blend file to render',
      type: 'file',
      category: 'base',
      priority: 1,
      required: true,
      icon: 'FilePen',
      placeholder: 'Select a .blend file',
      help: 'Choose the Blender file you want to render'
    },

    // Output Settings
    {
      id: 'output_path',
      name: 'Output Directory',
      type: 'path',
      category: 'output',
      required: true,
      help: 'Directory where the rendered files will be saved'
    },
    {
      id: 'output_filename',
      name: 'File Name',
      type: 'string',
      category: 'output',
      required: true,
      defaultValue: 'render',
      help: 'Base name for the output files (without extension)'
    },
    {
      id: 'output_format',
      name: 'Output Format',
      type: 'enum',
      category: 'output',
      required: true,
      defaultValue: 'PNG',
      options: ['PNG', 'JPEG', 'EXR', 'WEBP', 'FFMPEG'],
      help: 'Format of the output files'
    },

    // Render Settings
    {
      id: 'render_engine',
      name: 'Engine',
      description: 'Render engine to use',
      type: 'enum',
      category: 'render',
      priority: 1,
      required: true,
      options: ['CYCLES', 'BLENDER_EEVEE_NEXT', 'BLENDER_WORKBENCH'],
      help: 'Choose the render engine'
    },
    {
      id: 'scene',
      name: 'Scene',
      description: 'Scene name to render',
      type: 'string',
      category: 'render',
      priority: 2,
      placeholder: 'Scene name',
      help: 'Enter the name of the scene to render'
    },
    {
      id: 'single_frame',
      name: 'Single Frame',
      description: 'Render a single frame',
      type: 'number',
      category: 'render',
      priority: 4,
      min: 0,
      defaultValue: 0,
      help: 'Set the frame number to render',
      dependencies: [
        {
          parameter: 'render_animation',
          condition: 'false'
        }
      ]
    },
    {
      id: 'render_animation',
      name: 'Render Animation',
      description: 'Render the complete animation',
      type: 'boolean',
      category: 'render',
      priority: 3,
      defaultValue: false,
      help: 'Enable to render all frames of the animation'
    },

    // Resolution Settings
    // {
    //   id: 'resolution_x',
    //   name: 'Width',
    //   description: 'Rendered image width in pixels',
    //   type: 'number',
    //   category: 'resolution',
    //   priority: 1,
    //   min: 1,
    //   max: 16384,
    //   step: 1,
    //   defaultValue: 1920,
    //   help: 'Set the output image width'
    // },
    // {
    //   id: 'resolution_y',
    //   name: 'Height',
    //   description: 'Rendered image height in pixels',
    //   type: 'number',
    //   category: 'resolution',
    //   priority: 2,
    //   min: 1,
    //   max: 16384,
    //   step: 1,
    //   defaultValue: 1080,
    //   help: 'Set the output image height'
    // },
    // {
    //   id: 'resolution_percentage',
    //   name: 'Resolution %',
    //   description: 'Resolution percentage (1-100)',
    //   type: 'number',
    //   category: 'resolution',
    //   priority: 3,
    //   min: 1,
    //   max: 100,
    //   step: 1,
    //   defaultValue: 100,
    //   help: 'Set the resolution percentage'
    // },

    // Frame Settings
    {
      id: 'frame_start',
      name: 'Start Frame',
      description: 'Start frame of animation',
      type: 'number',
      category: 'frames',
      priority: 1,
      min: 0,
      defaultValue: 0,
      help: 'Set the starting frame number',
      dependencies: [
        {
          parameter: 'render_animation',
          condition: 'true'
        }
      ]
    },
    {
      id: 'frame_end',
      name: 'End Frame',
      description: 'End frame of animation',
      type: 'number',
      category: 'frames',
      priority: 2,
      min: 0,
      defaultValue: 1,
      help: 'Set the ending frame number',
      dependencies: [
        {
          parameter: 'render_animation',
          condition: 'true'
        }
      ]
    },
    {
      id: 'frame_jump',
      name: 'Frame Jump',
      description: 'Number of frames to skip between renders',
      type: 'number',
      category: 'frames',
      priority: 3,
      min: 1,
      defaultValue: 1,
      help: 'Set the number of frames to skip between renders',
      dependencies: [
        {
          parameter: 'render_animation',
          condition: 'true'
        }
      ]
    },

    // Cycles Settings
    // {
    //   id: 'cycles_samples',
    //   name: 'Samples',
    //   description: 'Number of samples for rendering',
    //   type: 'number',
    //   category: 'cycles',
    //   priority: 1,
    //   min: 1,
    //   defaultValue: 128,
    //   help: 'Set the number of render samples',
    //   dependencies: [
    //     {
    //       parameter: 'render_engine',
    //       condition: 'CYCLES'
    //     }
    //   ]
    // },
    // {
    //   id: 'threads',
    //   name: 'Threads',
    //   description: 'Number of threads for rendering (0=auto)',
    //   type: 'number',
    //   category: 'cycles',
    //   priority: 2,
    //   min: 0,
    //   defaultValue: 0,
    //   help: 'Set the number of rendering threads (0 for automatic)'
    // }
  ]
};

// Funzioni di utilità
export const getParametersByCategory = (categoryId: string) => {
  return renderParameters.parameters
    .filter(param => param.category === categoryId)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
};

export const getCategoryById = (categoryId: string) => {
  return renderParameters.categories.find(cat => cat.id === categoryId);
};

export const getParameterById = (parameterId: string) => {
  return renderParameters.parameters.find(param => param.id === parameterId);
};

export const validateParameter = (parameter: any) => {
  return ParameterSchema.parse(parameter);
};

export const getDependentParameters = (parameterId: string) => {
  return renderParameters.parameters.filter(param =>
    param.dependencies?.some(dep => dep.parameter === parameterId)
  );
};
