'use client';

import React, { useState, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import PresetPanel from './PresetPanel';
import SettingsPanel from './SettingsPanel';
import RenderPanel from './RenderPanel';
import CommandPreviewDrawer from './CommandPreviewDrawer';
import CommandPreviewBar from './CommandPreviewBar';
import { QueueSheet } from './QueueSheet';
import { Button } from '@/components/ui/button';
import { Terminal, User } from 'lucide-react';
import BlenderPathSelector from './BlenderPathSelector';
import { Preset } from '@/types/preset';
import { toast, Toaster } from 'sonner';
import LoadingScreen from '@/components/layout/loading-screen';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import QueuePanel from './QueuePanel';

const MainLayout: React.FC = () => {
	const [settings, setSettings] = useState<Record<string, any>>({});
	const [isCommandPreviewOpen, setIsCommandPreviewOpen] = useState(false);
	const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState(
		'Initializing application...'
	);
	const [command, setCommand] = useState('');
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const initializeApp = async () => {
			try {
				setLoadingMessage('Loading presets...');
				const presets = await window.electronAPI.getAllPresets();
				const lastPreset = presets.find((p) => p.isLast);

				if (lastPreset) {
					setSelectedPreset(lastPreset);
					setSettings(lastPreset.parameters);
					toast.success('Last preset loaded', {
						description: `Loaded preset: ${lastPreset.name}`,
					});
				}
				// Primo messaggio dopo 200ms
				setTimeout(() => {
					setProgress(50);
				}, 200);

				// Secondo messaggio dopo 500ms
				setTimeout(() => {
					setLoadingMessage('Detecting Blender...');
					setProgress(70);
				}, 500);

				// Terzo messaggio dopo 1000ms
				setTimeout(() => {
					setLoadingMessage('Loading Completed. Welcome to BRS');
					setProgress(100);
				}, 1000);

				// Aspetta un momento per mostrare il messaggio di loading finale
				await new Promise((resolve) => setTimeout(resolve, 1500));
			} catch (error) {
				console.error('Error initializing app:', error);
				toast.error('Error', {
					description: 'Failed to initialize application',
				});
			} finally {
				setTimeout(() => {
					setIsLoading(false);
					setProgress(0);
				}, 500);
			}
		};

		initializeApp();
	}, []);

	const generateCommand = (settings: Record<string, any>) => {
		if (!settings.blender_path) return '';

		let command = `"${settings.blender_path}" -b`;

		// Base Settings
		if (settings.blend_file) {
			command += ` "${settings.blend_file}"`;
		}

		// Render Settings
		if (settings.render_enabled) {
			// Engine
			if (settings.render_engine) {
				command += ` -E ${settings.render_engine}`;
			}

			// Scene
			if (settings.scene) {
				command += ` -S "${settings.scene}"`;
			}
		}

		// Output Settings
		if (settings.output_enabled) {
			// Output format (must be between -E and -o)
			if (settings.output_format) {
				command += ` -F ${settings.output_format.toUpperCase()}`;
			}

			// Output path and filename
			const outputPath = settings.output_path || '';
			const fileName = settings.output_filename || 'render';
			const fullOutputPath = `${outputPath}/${fileName}`;
			command += ` -o "${fullOutputPath}"`;
		}

		// Resolution Settings
		if (settings.resolution_enabled) {
			command += ` --render-output "${settings.resolution_x || 1920}x${
				settings.resolution_y || 1080
			}"`;
			if (settings.resolution_percentage) {
				command += ` --render-percentage ${settings.resolution_percentage}`;
			}
		}

		// Frame Settings
		if (settings.frames_enabled) {
			// Se è attiva l'animazione, usa -a e i parametri di frame
			if (settings.render_animation) {
				command += ` -s ${settings.frame_start || 1}`;
				command += ` -e ${settings.frame_end || 1}`;
				if (settings.frame_jump && settings.frame_jump > 1) {
					command += ` -j ${settings.frame_jump}`;
				}
				command += ` -a`; // -a deve essere sempre l'ultimo
			}
			// Altrimenti, se è attivo il frame singolo, usa -f
			else if (
				settings.single_frame !== undefined &&
				settings.single_frame !== null
			) {
				command += ` -f ${settings.single_frame}`;
			}
			// Se non è né animazione né frame singolo, usa i parametri di frame
			else {
				command += ` -s ${settings.frame_start || 1}`;
				command += ` -e ${settings.frame_end || 1}`;
				if (settings.frame_jump && settings.frame_jump > 1) {
					command += ` -j ${settings.frame_jump}`;
				}
			}
		}

		// Cycles Settings
		if (settings.cycles_enabled) {
			if (settings.cycles_samples) {
				command += ` --cycles-samples ${settings.cycles_samples}`;
			}
			if (settings.threads) {
				command += ` --threads ${settings.threads}`;
			}
		}

		return command;
	};

	useEffect(() => {
		setCommand(generateCommand(settings));
	}, [settings]);

	const handleSettingsChange = (newSettings: Record<string, any>) => {
		setSettings((prevSettings) => {
			const updatedSettings = {
				...prevSettings,
				...newSettings,
			};
			setCommand(generateCommand(updatedSettings));
			return updatedSettings;
		});
	};

	const handlePresetSelect = (preset: Preset | null) => {
		setSelectedPreset(preset);
		if (preset) {
			const newSettings = preset.parameters;
			setSettings(newSettings);
			setCommand(generateCommand(newSettings));
		} else {
			setSettings({});
			setCommand('');
		}
	};

	const handleResetCommand = () => {
		setSettings({});
		setSelectedPreset(null);
		setCommand('');
		toast.success('Command reset', {
			description: 'Settings have been reset to default values.',
		});
	};

	const handlePresetLoad = (preset: Preset) => {
		const newSettings = preset.parameters;
		setSettings(newSettings);
		setSelectedPreset(preset);
		setCommand(generateCommand(newSettings));
	};

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			{isLoading ? (
				<div className="flex h-screen flex-col overflow-hidden bg-background">
					<LoadingScreen message={loadingMessage} progress={progress} />
					{/* Top Bar Skeleton */}
					<div className="flex items-center justify-between border-b bg-card/95 backdrop-blur-sm px-4 py-2">
						<Skeleton className="h-8 w-48" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-10 w-[300px]" />
							<Skeleton className="h-10 w-10" />
							<Skeleton className="h-10 w-10" />
						</div>
					</div>

					{/* Main Content Skeleton */}
					<div className="flex-1 overflow-hidden p-2">
						<div className="flex h-full gap-2">
							<Skeleton className="flex-1" />
							<Skeleton className="w-2" />
							<Skeleton className="flex-1" />
						</div>
					</div>

					{/* Bottom Bar Skeleton */}
					<Skeleton className="h-10 w-full" />
				</div>
			) : (
				<>
					{/* Top Bar */}
					<div className="flex items-center justify-between border-b bg-card/95 backdrop-blur-sm px-4 py-2">
						<div className="flex items-center gap-2">
							<Avatar>
								<AvatarImage src="https://cdn.discordapp.com/attachments/1341431737808588868/1355391231336906863/icon.png?ex=67e8c1f3&is=67e77073&hm=f502d226bd5bb3b6a554f0580c787021123488e12d4760433136e43db4b23362&" />
								<AvatarFallback>
									<User className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<h2 className="text-lg font-semibold">BRS</h2>
							<p className="text-sm text-muted-foreground">By Nebula Studios</p>
						</div>
						<div className="flex items-center gap-2">
							<div className="flex flex-col gap-2 bg-neutral-950 p-2 rounded-md border border-neutral-800">
								<span className="text-xs text-muted-foreground">Blender Selector</span>
								<BlenderPathSelector
									value={settings.blender_path}
									onChange={(path) =>
										handleSettingsChange({ ...settings, blender_path: path })
									}
								/>
							</div>
							<div className="flex flex-col gap-2 bg-neutral-950 p-2 rounded-md border border-neutral-800">
								<span className="text-xs text-muted-foreground">Command Preview</span>
								<Button
									variant={'ghost'}
									onClick={() => setIsCommandPreviewOpen(true)}
									title="View Command Preview"
								>
									<Terminal className="h-4 w-4" />
									<span className="text-xs text-muted-foreground">Open Command Preview</span>
								</Button>
							</div>
							<div className="flex flex-col gap-2 bg-neutral-950 p-2 rounded-md border border-neutral-800">
								<span className="text-xs text-muted-foreground">Preset Selector</span>
								<PresetPanel
									currentSettings={settings}
									onSettingsChange={handleSettingsChange}
									selectedPreset={selectedPreset}
									onPresetSelect={handlePresetSelect}
								/>
							</div>
							<div className="flex flex-col gap-2 bg-neutral-950 p-2 rounded-md border border-neutral-800">
								<span className="text-xs text-muted-foreground">Queue</span>
								<QueueSheet />
							</div>
						</div>
					</div>

					{/* Main Content */}
					<div className="flex-1 overflow-hidden p-2">
						<PanelGroup direction="horizontal">
							<Panel defaultSize={50} minSize={30}>
								<div className="h-full">
									<SettingsPanel
										currentSettings={settings}
										onSettingsChange={handleSettingsChange}
									/>
								</div>
							</Panel>
							<PanelResizeHandle className="w-2 m-2 rounded bg-border hover:bg-primary transition-colors" />
							<Panel defaultSize={50} minSize={30}>
								<RenderPanel command={command} />
							</Panel>
						</PanelGroup>
					</div>

					{/* Command Preview Bar */}
					<div className="border-t bg-background/95 backdrop-blur-sm">
						<CommandPreviewBar
							command={command}
							onOpenDrawer={() => setIsCommandPreviewOpen(true)}
						/>
					</div>
				</>
			)}

			{/* Command Preview Drawer */}
			<CommandPreviewDrawer
				command={command}
				onReset={handleResetCommand}
				open={isCommandPreviewOpen}
				onOpenChange={setIsCommandPreviewOpen}
			/>

			{/* Sonner Toaster */}
			<Toaster theme="dark" richColors />
		</div>
	);
};

export default MainLayout;
