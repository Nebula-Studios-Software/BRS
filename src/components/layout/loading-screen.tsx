import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...', progress = 0 }) => {
  return (
			<div className="fixed inset-0 bg-background/60 z-50 flex flex-col items-center justify-center">
				<div className="w-full max-w-md space-y-4 p-6">
					<div className="flex items-center justify-center space-x-2">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
						<span className="text-lg font-medium">{message}</span>
					</div>
					<Progress value={progress} className="h-2" />
				</div>
			</div>
		);
};

export default LoadingScreen;
