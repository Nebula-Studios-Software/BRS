import { create } from 'zustand';

export type OnboardingStep =
  | 'welcome'
  | 'blenderPath'
  | 'featureTour_presets'
  | 'featureTour_settings'
  | 'featureTour_render'
  | 'featureTour_command'
  | 'featureTour_queue'
  | 'complete';

interface OnboardingState {
  isVisible: boolean;
  currentStep: OnboardingStep;
  blenderPathSelectedInOnboarding: boolean;
  tourSkipped: boolean;
  tourSteps: OnboardingStep[];
  currentTourIndex: number;
}

interface OnboardingActions {
  showWizard: (startStep?: OnboardingStep) => void;
  hideWizard: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  setBlenderPathSelected: (selected: boolean) => void;
  skipTour: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  checkOnboardingStatus: () => boolean;
}

type OnboardingStore = OnboardingState & OnboardingActions;

const TOUR_STEPS: OnboardingStep[] = [
  'featureTour_presets',
  'featureTour_settings', 
  'featureTour_render',
  'featureTour_command',
  'featureTour_queue'
];

const initialState: OnboardingState = {
  isVisible: false,
  currentStep: 'welcome',
  blenderPathSelectedInOnboarding: false,
  tourSkipped: false,
  tourSteps: TOUR_STEPS,
  currentTourIndex: 0,
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  ...initialState,

  showWizard: (startStep = 'welcome') => {
    set({
      isVisible: true,
      currentStep: startStep,
      blenderPathSelectedInOnboarding: false,
      tourSkipped: false,
      currentTourIndex: 0,
    });
  },

  hideWizard: () => {
    set({
      isVisible: false,
      currentStep: 'welcome',
      blenderPathSelectedInOnboarding: false,
      tourSkipped: false,
      currentTourIndex: 0,
    });
  },

  nextStep: () => {
    const state = get();
    const { currentStep, tourSteps, currentTourIndex } = state;

    switch (currentStep) {
      case 'welcome':
        set({ currentStep: 'blenderPath' });
        break;
      case 'blenderPath':
        // Dopo la selezione del path, vai al tour o completa
        set({ currentStep: 'featureTour_presets', currentTourIndex: 0 });
        break;
      default:
        // Tour steps
        if (currentStep.startsWith('featureTour_')) {
          const nextIndex = currentTourIndex + 1;
          if (nextIndex < tourSteps.length) {
            set({
              currentStep: tourSteps[nextIndex],
              currentTourIndex: nextIndex,
            });
          } else {
            // Tour completato
            get().completeOnboarding();
          }
        }
        break;
    }
  },

  prevStep: () => {
    const state = get();
    const { currentStep, tourSteps, currentTourIndex } = state;

    if (currentStep.startsWith('featureTour_')) {
      if (currentTourIndex > 0) {
        const prevIndex = currentTourIndex - 1;
        set({
          currentStep: tourSteps[prevIndex],
          currentTourIndex: prevIndex,
        });
      } else {
        // Torna al welcome se è il primo step del tour
        set({ currentStep: 'welcome' });
      }
    }
  },

  goToStep: (step) => {
    const { tourSteps } = get();
    const stepIndex = tourSteps.indexOf(step);
    
    set({
      currentStep: step,
      currentTourIndex: stepIndex >= 0 ? stepIndex : 0,
    });
  },

  setBlenderPathSelected: (selected) => {
    set({ blenderPathSelectedInOnboarding: selected });
  },

  skipTour: () => {
    set({ tourSkipped: true });
    get().completeOnboarding();
  },

  completeOnboarding: () => {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
      set({
        isVisible: false,
        currentStep: 'complete',
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  },

  checkOnboardingStatus: () => {
    try {
      return localStorage.getItem('onboardingCompleted') === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },

  resetOnboarding: () => {
    set(initialState);
  },
}));