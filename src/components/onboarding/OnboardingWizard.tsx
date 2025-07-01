'use client';

import React, { useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { WelcomeStep, BlenderPathStep, FeatureTourStep } from './steps';

interface OnboardingWizardProps {
  blenderPath?: string;
  onBlenderPathChange?: (path: string) => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  blenderPath,
  onBlenderPathChange,
}) => {
  const {
    isVisible,
    currentStep,
    tourSteps,
    currentTourIndex,
    hideWizard,
    nextStep,
    prevStep,
    skipTour,
    completeOnboarding,
  } = useOnboardingStore();

  // Calculate onboarding progress
  const getProgress = () => {
    const stepOrder = ['welcome', 'blenderPath', ...tourSteps];
    const currentIndex = stepOrder.indexOf(currentStep);
    return currentIndex >= 0 ? ((currentIndex + 1) / stepOrder.length) * 100 : 0;
  };

  // Determine if the current step can be skipped
  const canSkipCurrentStep = () => {
    return currentStep.startsWith('featureTour_') || currentStep === 'welcome';
  };

  // Determine if we can go to the previous step
  const canGoBack = () => {
    return currentStep !== 'blenderPath' && currentStep !== 'welcome';
  };

  // Determine if we can go to the next step
  const canGoNext = () => {
    if (currentStep === 'blenderPath') {
      return !!blenderPath; // Requires that the path is selected
    }
    return true;
  };

  // Handle wizard closing
  const handleClose = () => {
    if (currentStep === 'blenderPath' && !blenderPath) {
      // Don't allow closing if Blender path is not configured
      return;
    }
    // Mark onboarding as completed when closing the wizard
    completeOnboarding();
  };

  // Handle tour skipping
  const handleSkipTour = () => {
    if (currentStep.startsWith('featureTour_') || currentStep === 'welcome') {
      skipTour();
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep />;
      case 'blenderPath':
        return (
          <BlenderPathStep
            currentPath={blenderPath}
            onPathChange={onBlenderPathChange}
          />
        );
      case 'featureTour_presets':
        return (
          <FeatureTourStep
            title="Preset Management"
            description="Save and reuse your favorite rendering configurations."
            feature="presets"
            stepNumber={1}
            totalSteps={tourSteps.length}
          />
        );
      case 'featureTour_settings':
        return (
          <FeatureTourStep
            title="Settings Panel"
            description="Configure all Blender rendering parameters from a single interface."
            feature="settings"
            stepNumber={2}
            totalSteps={tourSteps.length}
          />
        );
      case 'featureTour_render':
        return (
          <FeatureTourStep
            title="Render Panel"
            description="Start individual renders and monitor progress in real-time."
            feature="render"
            stepNumber={3}
            totalSteps={tourSteps.length}
          />
        );
      case 'featureTour_command':
        return (
          <FeatureTourStep
            title="Command Preview"
            description="View and verify the Blender command that will be executed."
            feature="command"
            stepNumber={4}
            totalSteps={tourSteps.length}
          />
        );
      case 'featureTour_queue':
        return (
          <FeatureTourStep
            title="Render Queue"
            description="Manage multiple queued rendering jobs with priorities and dependencies."
            feature="queue"
            stepNumber={5}
            totalSteps={tourSteps.length}
          />
        );
      default:
        return null;
    }
  };

  // Get current step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 'welcome':
        return 'Welcome to BRS';
      case 'blenderPath':
        return 'Blender Configuration';
      case 'featureTour_presets':
        return 'Feature Tour - Presets';
      case 'featureTour_settings':
        return 'Feature Tour - Settings';
      case 'featureTour_render':
        return 'Feature Tour - Rendering';
      case 'featureTour_command':
        return 'Feature Tour - Command Preview';
      case 'featureTour_queue':
        return 'Feature Tour - Queue';
      default:
        return 'Onboarding';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{getStepTitle()}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Let's set up BRS for your first use
            </p>
          </div>
          {currentStep !== 'blenderPath' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Progress value={getProgress()} className="mt-4" />
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="border-t p-6 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {canGoBack() && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {canSkipCurrentStep() && (
              <Button variant="ghost" onClick={handleSkipTour}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Tour
              </Button>
            )}
            
            {currentStep === 'welcome' && (
              <Button onClick={completeOnboarding} variant="outline">
                Skip All
              </Button>
            )}

            <Button
              onClick={nextStep}
              disabled={!canGoNext()}
              className="min-w-[100px]"
            >
              {currentStep.startsWith('featureTour_') &&
               currentTourIndex === tourSteps.length - 1 ? (
                'Complete'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;