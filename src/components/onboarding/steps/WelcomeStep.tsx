'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Zap, Settings, List } from 'lucide-react';

const WelcomeStep: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-semibold">Welcome to BRS!</h3>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Blender Render System is your complete suite for managing and automating
          Blender renders. We'll guide you through the main features
          to get you started using the application right away.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-500" />
            </div>
            <h4 className="font-semibold">Simplified Configuration</h4>
            <p className="text-sm text-muted-foreground">
              Intuitive interface to configure all Blender rendering parameters
              without having to remember CLI commands.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-500" />
            </div>
            <h4 className="font-semibold">Presets and Automation</h4>
            <p className="text-sm text-muted-foreground">
              Save your favorite configurations as presets and reuse them
              to speed up your rendering workflow.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <List className="w-5 h-5 text-purple-500" />
            </div>
            <h4 className="font-semibold">Queue Management</h4>
            <p className="text-sm text-muted-foreground">
              Advanced queue system to manage multiple simultaneous renders
              with priorities and dependencies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-500" />
            </div>
            <h4 className="font-semibold">Real-time Monitoring</h4>
            <p className="text-sm text-muted-foreground">
              Monitor your render progress in real-time with
              detailed statistics and complete logs.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
        <h4 className="font-semibold text-lg">Let's get started!</h4>
        <p className="text-muted-foreground">
          The first step is to configure the Blender path on your system.
          Then, we'll show you a brief tour of the main features.
        </p>
        <p className="text-sm text-muted-foreground">
          💡 You can skip the tour at any time if you prefer to explore on your own.
        </p>
      </div>
    </div>
  );
};

export default WelcomeStep;