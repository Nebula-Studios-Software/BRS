import React, { useEffect, useState } from 'react';
import { Progress } from '@heroui/react';
import { Button } from '@heroui/react';
import { X, Download, RotateCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UpdateInfo {
	version: string;
	releaseNotes?: string;
}

interface UpdateStatusBarProps {
	isUpdateAvailable: boolean;
	updateInfo?: UpdateInfo;
	downloadProgress: number;
	isDownloading: boolean;
	onStartDownload: () => void;
	onCancelDownload: () => void;
	onRestartApp: () => void;
}

export function UpdateStatusBar({
	isUpdateAvailable,
	updateInfo,
	downloadProgress,
	isDownloading,
	onStartDownload,
	onCancelDownload,
	onRestartApp,
}: UpdateStatusBarProps) {
	if (!isUpdateAvailable && !isDownloading) return null;

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
			<div className="container mx-auto flex items-center justify-between">
				<div className="flex items-center space-x-4">
					{isDownloading ? (
						<>
							<span>Downloading update...</span>
							<Progress value={downloadProgress} className="w-64" />
							<Button variant="ghost" size="sm" onPress={onCancelDownload}>
								<X className="h-4 w-4 mr-2" />
								Cancel
							</Button>
						</>
					) : (
						<>
							<span>New version {updateInfo?.version} available!</span>
							<Button
								variant="light"
								size="sm"
								onPress={() => {
									if (updateInfo?.releaseNotes) {
										toast(
											(t) => (
												<div>
													<h3 className="font-bold mb-2">Release Notes:</h3>
													<div className="max-h-48 overflow-y-auto">
														<pre className="whitespace-pre-wrap">
															{updateInfo.releaseNotes}
														</pre>
													</div>
												</div>
											),
											{
												duration: 10000,
											}
										);
									}
								}}
							>
								View Release Notes
							</Button>
							<Button
								variant="shadow"
								size="sm"
								onPress={onStartDownload}
								color="success"
							>
								<Download className="h-4 w-4 mr-2" />
								Update Now
							</Button>
						</>
					)}
				</div>
				{downloadProgress === 100 && (
					<Button variant="light" size="sm" onPress={onRestartApp} color="warning">
						<RotateCw className="h-4 w-4 mr-2" />
						Restart to Install
					</Button>
				)}
			</div>
		</div>
	);
}
