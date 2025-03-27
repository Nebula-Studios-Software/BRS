import React from 'react';
import { motion } from 'framer-motion';
import { Image, Progress } from '@heroui/react';

interface LoadingScreenProps {
	isLoading: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
	if (!isLoading) return null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center"
		>
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col items-center space-y-6"
			>
				<div className="w-64">
					<Progress
						size="sm"
						color="default"
						isIndeterminate
						aria-label="Loading..."
						className="max-w-md"
					/>
				</div>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="text-lg text-foreground/80"
				>
					Loading...
				</motion.p>
			</motion.div>
		</motion.div>
	);
};
