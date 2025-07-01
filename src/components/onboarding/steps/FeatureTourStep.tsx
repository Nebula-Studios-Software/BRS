'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Play, 
  Terminal, 
  List, 
  BookmarkPlus, 
  Zap,
  Monitor,
  FileText,
  Clock
} from 'lucide-react';

interface FeatureTourStepProps {
  title: string;
  description: string;
  feature: 'presets' | 'settings' | 'render' | 'command' | 'queue';
  stepNumber: number;
  totalSteps: number;
}

const FeatureTourStep: React.FC<FeatureTourStepProps> = ({
  title,
  description,
  feature,
  stepNumber,
  totalSteps,
}) => {
  const getFeatureContent = () => {
    switch (feature) {
      case 'presets':
        return {
          icon: <BookmarkPlus className="w-8 h-8 text-blue-500" />,
          color: 'blue',
          highlights: [
            'Save configurations as reusable presets',
            'Quickly load previous settings',
            'Import and export presets between projects',
            'Organize presets with descriptive names'
          ],
          tips: [
            'Create presets for different types of rendering (animation, still, test)',
            'Use descriptive names for your presets',
            'Share presets with your team by exporting them'
          ]
        };
      
      case 'settings':
        return {
          icon: <Settings className="w-8 h-8 text-green-500" />,
          color: 'green',
          highlights: [
            'Configure rendering engines (Cycles, Eevee, etc.)',
            'Set resolution and output quality',
            'Manage frame range and animations',
            'Customize samples and rendering threads'
          ],
          tips: [
            'Use collapsible sections to organize settings',
            'Save frequent configurations as presets',
            'Check the command preview to verify parameters'
          ]
        };
      
      case 'render':
        return {
          icon: <Play className="w-8 h-8 text-purple-500" />,
          color: 'purple',
          highlights: [
            'Start individual renders with one click',
            'Monitor progress in real-time',
            'View detailed process logs',
            'Stop rendering at any time'
          ],
          tips: [
            'Always test with few frames before long renders',
            'Monitor memory usage during rendering',
            'Use the log to diagnose any issues'
          ]
        };
      
      case 'command':
        return {
          icon: <Terminal className="w-8 h-8 text-orange-500" />,
          color: 'orange',
          highlights: [
            'View Blender command generated in real-time',
            'Copy command for external use',
            'Verify parameters before execution',
            'Understand CLI command structure'
          ],
          tips: [
            'Use the preview to learn Blender commands',
            'Always verify the command before starting long renders',
            'Copy useful commands for custom scripts'
          ]
        };
      
      case 'queue':
        return {
          icon: <List className="w-8 h-8 text-red-500" />,
          color: 'red',
          highlights: [
            'Queue multiple rendering configurations',
            'Manage priorities and execution order',
            'Monitor progress of entire queue',
            'Configure automatic overnight rendering'
          ],
          tips: [
            'Sort jobs by priority and estimated duration',
            'Use the queue for batch rendering during the night',
            'Configure notifications for queue completion'
          ]
        };
      
      default:
        return {
          icon: <Zap className="w-8 h-8 text-gray-500" />,
          color: 'gray',
          highlights: [],
          tips: []
        };
    }
  };

  const featureContent = getFeatureContent();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <Badge variant="outline" className="mb-2">
          Step {stepNumber} of {totalSteps}
        </Badge>
        
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          {featureContent.icon}
        </div>
        
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Main Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {featureContent.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Useful Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {featureContent.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-semibold">Location in Interface</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          {feature === 'presets' && 'You can find this feature in the top bar, next to the Blender selector.'}
          {feature === 'settings' && 'The settings panel is located on the left side of the main interface.'}
          {feature === 'render' && 'The render panel is positioned on the right side of the main interface.'}
          {feature === 'command' && 'The command preview is visible in the bottom bar and dedicated drawer.'}
          {feature === 'queue' && 'Access the queue via the button in the top bar of the interface.'}
        </p>
      </div>

      {stepNumber < totalSteps && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            <Clock className="w-4 h-4 inline mr-1" />
            Next: {stepNumber === 1 && 'Settings Panel'}
            {stepNumber === 2 && 'Render Panel'}
            {stepNumber === 3 && 'Command Preview'}
            {stepNumber === 4 && 'Queue Management'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FeatureTourStep;