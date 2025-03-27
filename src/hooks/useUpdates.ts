import { useState, useEffect } from 'react';

interface UpdateInfo {
	version: string;
	releaseNotes?: string;
}

declare global {
	interface Window {
		updates: {
			checkForUpdates: () => Promise<void>;
			downloadUpdate: () => Promise<void>;
			cancelDownload: () => Promise<void>;
			quitAndInstall: () => Promise<void>;
			onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
			onUpdateNotAvailable: (callback: () => void) => void;
			onDownloadProgress: (
				callback: (progress: { percent: number }) => void
			) => void;
			onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
			onUpdateError: (callback: (error: string) => void) => void;
			removeAllListeners: () => void;
		};
	}
}

export function useUpdates() {
	const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | undefined>();
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Registra i listener per gli eventi di aggiornamento
		window.updates.onUpdateAvailable((info) => {
			setIsUpdateAvailable(true);
			setUpdateInfo(info);
		});

		window.updates.onUpdateNotAvailable(() => {
			setIsUpdateAvailable(false);
			setUpdateInfo(undefined);
		});

		window.updates.onDownloadProgress((progress) => {
			setDownloadProgress(progress.percent);
		});

		window.updates.onUpdateDownloaded((info) => {
			setDownloadProgress(100);
			setIsDownloading(false);
		});

		window.updates.onUpdateError((error) => {
			setError(error);
			setIsDownloading(false);
		});

		// Controlla gli aggiornamenti all'avvio
		window.updates.checkForUpdates();

		// Cleanup
		return () => {
			window.updates.removeAllListeners();
		};
	}, []);

	const startDownload = async () => {
		setIsDownloading(true);
		setError(null);
		try {
			await window.updates.downloadUpdate();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
			setIsDownloading(false);
		}
	};

	const cancelDownload = async () => {
		await window.updates.cancelDownload();
		setIsDownloading(false);
		setDownloadProgress(0);
	};

	const restartApp = async () => {
		await window.updates.quitAndInstall();
	};

	return {
		isUpdateAvailable,
		updateInfo,
		downloadProgress,
		isDownloading,
		error,
		startDownload,
		cancelDownload,
		restartApp,
	};
}
