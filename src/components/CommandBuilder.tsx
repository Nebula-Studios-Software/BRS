import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBlenderVersions } from '@/lib/hooks/useBlenderVersions';
import {
	Button,
	ButtonGroup,
	Input,
	Switch,
	Tabs,
	Tab,
	Select,
	SelectItem,
} from '@heroui/react';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { SavePresetDialog } from './SavePresetDialog';
import { PresetManager } from './PresetManager';
import { ParamDefinitions, Parameter } from '@/lib/paramDefinitions';
import { SettingsManager, Preset } from '@/lib/settingsManager';
import toast from 'react-hot-toast';
import {
	Check,
	FileSearch,
	FolderSearch,
	RefreshCcw,
	Save,
	Settings2,
	X,
} from 'lucide-react';
import path from 'path';

interface CommandBuilderProps {
	onCommandUpdate: (command: string[]) => void;
}

export const CommandBuilder: React.FC<CommandBuilderProps> = ({
	onCommandUpdate,
}) => {
	const { selectedVersion } = useBlenderVersions();
	const [settingsManager, setSettingsManager] = useState<SettingsManager | null>(
		null
	);
	const [blenderPath, setBlenderPath] = useState('');
	const [parameters, setParameters] = useState<{ [key: string]: any }>({});
	const [activePreset, setActivePreset] = useState('default');
	const [presets, setPresets] = useState<{ [key: string]: Preset }>({});
	const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
	const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [selectedTab, setSelectedTab] = useState('base');

	// Utility function for path quoting
	const quotePathIfNeeded = useCallback((value: string): string => {
		return value;
	}, []);

	// Memoize settings initialization
	const initSettings = useCallback(async () => {
		if (typeof window !== 'undefined') {
			const settings = new SettingsManager();
			await settings.init();
			setSettingsManager(settings);
		}
	}, []);

	useEffect(() => {
		initSettings();
	}, [initSettings]);

	// Gestisce l'aggiornamento del path quando cambia la versione selezionata
	useEffect(() => {
		if (selectedVersion) {
			const newPath = selectedVersion.executablePath;
			setBlenderPath(newPath);
			updateCommand(newPath, parameters);

			// Aggiorna anche le impostazioni se il SettingsManager è disponibile
			if (settingsManager) {
				settingsManager.setBlenderPath(newPath);
			}
		}
	}, [selectedVersion, parameters]);

	// Carica le impostazioni salvate quando il SettingsManager è disponibile
	useEffect(() => {
		if (settingsManager) {
			// Carica il path solo se non c'è una versione selezionata
			if (!selectedVersion) {
				const savedPath = settingsManager.getBlenderPath();
				setBlenderPath(savedPath || '');
				updateCommand(savedPath || '', parameters);
			}

			// Carica i parametri
			setParameters(settingsManager.getParameters() || {});

			// Carica i preset
			const presetData: { [key: string]: Preset } = {};
			settingsManager.getPresetNames().forEach((name) => {
				const preset = settingsManager.getPreset(name);
				if (preset) {
					presetData[name] = preset;
				}
			});
			setPresets(presetData);

			// Carica il preset attivo
			const uiState = settingsManager.getUIState();
			if (uiState.activePreset && presetData[uiState.activePreset]) {
				setActivePreset(uiState.activePreset);
				const preset = presetData[uiState.activePreset];
				if (!selectedVersion) {
					setBlenderPath(preset.blenderPath || '');
				}
				setParameters(preset.parameters || {});
			} else {
				// Imposta il preset predefinito se non c'è un preset attivo
				setActivePreset('default');
			}

			// Debugging
			console.log('Parameters:', settingsManager.getParameters());
			console.log('Active Preset:', uiState.activePreset);
		}
	}, [settingsManager, selectedVersion]);

	// Memoize command update function
	const updateCommand = useCallback(
		(currentPath: string, currentParams: typeof parameters) => {
			const commandParts: string[] = [];

			if (currentPath) {
				commandParts.push(quotePathIfNeeded(currentPath));
			} else {
				commandParts.push('blender');
			}

			if (currentParams[ParamDefinitions.BACKGROUND]) {
				commandParts.push('-b');
				if (currentParams[ParamDefinitions.FILE]) {
					commandParts.push(quotePathIfNeeded(currentParams[ParamDefinitions.FILE]));
				}
			} else if (currentParams[ParamDefinitions.FILE]) {
				commandParts.push(quotePathIfNeeded(currentParams[ParamDefinitions.FILE]));
			}

			const outputDir = currentParams[ParamDefinitions.OUTPUT_DIRECTORY];
			const outputFilename = currentParams[ParamDefinitions.OUTPUT_FILENAME];

			if (outputDir && outputFilename) {
				const combinedPath = path.join(outputDir, outputFilename);
				if (combinedPath) {
					currentParams[ParamDefinitions.RENDER_OUTPUT] = combinedPath;
				}
			}

			const orderedParams = Object.entries(currentParams)
				.filter(([param]) => {
					return (
						param !== ParamDefinitions.FILE &&
						param !== ParamDefinitions.BACKGROUND &&
						param !== ParamDefinitions.OUTPUT_DIRECTORY &&
						param !== ParamDefinitions.OUTPUT_FILENAME
					);
				})
				.sort(
					([a], [b]) =>
						ParamDefinitions.getParamOrder(a) - ParamDefinitions.getParamOrder(b)
				);

			for (const [param, value] of orderedParams) {
				if (value === undefined || value === null) continue;

				if (typeof value === 'boolean') {
					if (value) commandParts.push(param);
				} else if (value !== '') {
					commandParts.push(param, quotePathIfNeeded(value.toString()));
				}
			}

			onCommandUpdate(commandParts);
		},
		[onCommandUpdate, quotePathIfNeeded]
	);

	// Memoize parameter change handler
	const handleParameterChange = useCallback(
		async (param: string, value: any) => {
			const newParameters = { ...parameters, [param]: value };
			setParameters(newParameters);

			if (settingsManager) {
				await settingsManager.setParameters(newParameters);

				const activePresetData = presets[activePreset];
				if (activePresetData) {
					const hasParamChanges = Object.entries(newParameters).some(
						([key, val]) => activePresetData.parameters[key] !== val
					);
					const hasBlenderPathChanged = activePresetData.blenderPath !== blenderPath;
					setHasChanges(hasParamChanges || hasBlenderPathChanged);
				}
			}
		},
		[parameters, settingsManager, presets, activePreset, blenderPath]
	);

	const handleBlenderPathChange = async () => {
		if (!settingsManager || typeof window === 'undefined') {
			return;
		}

		try {
			const filePath = await window.electron.openFile({
				filters: [
					{
						name: 'Blender Executable',
						extensions: window.electron.platform === 'win32' ? ['exe'] : ['*'],
					},
				],
			});

			if (filePath) {
				setBlenderPath(filePath);
				await settingsManager.setBlenderPath(filePath);

				// Verifica se ci sono differenze con il preset attivo
				const activePresetData = presets[activePreset];
				if (activePresetData) {
					const hasParamChanges = Object.entries(parameters).some(
						([key, val]) => activePresetData.parameters[key] !== val
					);
					const hasBlenderPathChanged = activePresetData.blenderPath !== filePath;
					setHasChanges(hasParamChanges || hasBlenderPathChanged);
				}
			}
		} catch (error) {
			console.error('Error selecting Blender path:', error);
			toast.error('Failed to select Blender executable');
		}
	};

	// Memoize preset change handler
	const handlePresetChange = useCallback(
		async (presetName: string) => {
			if (!settingsManager || !presets[presetName]) return;

			const preset = presets[presetName];
			if (!selectedVersion) {
				setBlenderPath(preset.blenderPath || '');
			}
			setParameters(preset.parameters || {});
			setActivePreset(presetName);
			setHasChanges(false);

			await settingsManager.setUIState({
				...settingsManager.getUIState(),
				activePreset: presetName,
			});
		},
		[settingsManager, presets, selectedVersion]
	);

	const handleSavePreset = async (preset: Preset) => {
		if (!settingsManager) return;

		await settingsManager.saveAsPreset(preset.name, {
			...preset,
			blenderPath,
			parameters,
		});
		// Aggiorna l'elenco dei preset
		const presetData: { [key: string]: Preset } = {};
		settingsManager.getPresetNames().forEach((name) => {
			const preset = settingsManager.getPreset(name);
			if (preset) {
				presetData[name] = preset;
			}
		});
		setPresets(presetData);
		setActivePreset(preset.name);
	};

	const handleDeletePreset = async (name: string) => {
		if (!settingsManager) return;

		if (await settingsManager.deletePreset(name)) {
			// Aggiorna l'elenco dei preset
			const presetData: { [key: string]: Preset } = {};
			settingsManager.getPresetNames().forEach((name) => {
				const preset = settingsManager.getPreset(name);
				if (preset) {
					presetData[name] = preset;
				}
			});
			setPresets(presetData);
			if (activePreset === name) {
				setActivePreset('default');
			}
			toast.success('Preset eliminato con successo');
		}
	};

	const handleRenamePreset = async (oldName: string, newName: string) => {
		if (!settingsManager) return;

		if (await settingsManager.renamePreset(oldName, newName)) {
			// Aggiorna l'elenco dei preset
			const presetData: { [key: string]: Preset } = {};
			settingsManager.getPresetNames().forEach((name) => {
				const preset = settingsManager.getPreset(name);
				if (preset) {
					presetData[name] = preset;
				}
			});
			setPresets(presetData);
			if (activePreset === oldName) {
				setActivePreset(newName);
			}
			toast.success('Preset rinominato con successo');
		}
	};

	const handleUpdatePreset = async () => {
		if (!settingsManager || activePreset === 'default') {
			return;
		}

		try {
			await settingsManager.saveAsPreset(activePreset, {
				name: activePreset,
				blenderPath,
				parameters,
			});

			// Aggiorna l'elenco dei preset
			const presetData: { [key: string]: Preset } = {};
			settingsManager.getPresetNames().forEach((name) => {
				const preset = settingsManager.getPreset(name);
				if (preset) {
					presetData[name] = preset;
				}
			});
			setPresets(presetData);
			setHasChanges(false);
			toast.success('Preset updated successfully');
		} catch (error) {
			console.error('Error updating preset:', error);
			toast.error('Failed to update preset');
		}
	};

	// Memoize parameter rendering
	const renderParameter = useCallback(
		(param: Parameter) => {
			const value = parameters[param.param];
			const onChange = (newValue: any) =>
				handleParameterChange(param.param, newValue);

			switch (param.type) {
				case 'bool':
					return (
						<div key={param.param} className="flex items-center space-x-2">
							<Switch
								isSelected={!!value}
								thumbIcon={value ? <Check /> : <X />}
								onValueChange={onChange}
								color="default"
							/>
						</div>
					);
				case 'string':
					return (
						<div key={param.param} className="space-y-2">
							<Input
								value={value || ''}
								onChange={(e) => onChange(e.target.value)}
								placeholder={param.description}
								variant="underlined"
							/>
						</div>
					);
				case 'file':
					return (
						<div key={param.param} className="space-y-2">
							<div className="flex space-x-2">
								<Input
									value={value || ''}
									onChange={(e) => onChange(e.target.value)}
									placeholder={param.description}
									readOnly
									isDisabled
								/>
								<Button
									isIconOnly
									variant="flat"
									onPress={async () => {
										try {
											const filePath = await window.electron.openFile({});
											if (filePath) {
												onChange(filePath);
											}
										} catch (error) {
											console.error("Errore durante l'apertura del file:", error);
										}
									}}
								>
									<FileSearch size={16}/>
								</Button>
							</div>
						</div>
					);
				case 'path':
					return (
						<div key={param.param} className="space-y-2">
							<div className="flex space-x-2">
								<Input
									value={value || ''}
									onChange={(e) => onChange(e.target.value)}
									placeholder={param.description}
									readOnly
									isDisabled
								/>
								<Button
									isIconOnly
									variant="flat"
									onPress={async () => {
										try {
											const dirPath = await window.electron.openDirectory({});
											if (dirPath) {
												onChange(dirPath);
											}
										} catch (error) {
											console.error("Errore durante l'apertura della directory:", error);
										}
									}}
								>
									<FolderSearch />
								</Button>
							</div>
						</div>
					);
				case 'int':
					return (
						<div key={param.param} className="space-y-2">
							<Input
								type="number"
								value={value || ''}
								onChange={(e) => {
									const val = e.target.value === '' ? '' : parseInt(e.target.value);
									onChange(val);
								}}
								placeholder={param.description}
							/>
						</div>
					);
				case 'enum':
					return (
						<div key={param.param} className="space-y-2">
							<Select
								value={String(value || '')}
								onChange={(e) => onChange(e.target.value)}
								className="text-black"
								defaultSelectedKeys={value ? [value] : []}
								popoverProps={{
									classNames: {
										base: 'before:bg-default-300',
										content: 'p-0 border-small border-divider bg-default-100 text-text-secondary',
									},
								}}
							>
								{param.options && param.options.length > 0 ? (
									param.options.map((option) => (
										<SelectItem key={option} textValue={option}>
											{option}
										</SelectItem>
									))
								) : (
									<SelectItem textValue="No options available">
										No options available
									</SelectItem>
								)}
							</Select>
						</div>
					);
				default:
					return null;
			}
		},
		[parameters, handleParameterChange]
	);

	// Memoize the command parts
	const commandParts = useMemo(() => {
		const parts: string[] = [];
		if (blenderPath) {
			parts.push(quotePathIfNeeded(blenderPath));
		}
		// ... rest of the command building logic ...
		return parts;
	}, [blenderPath, parameters, quotePathIfNeeded]);

	// Disabilita il pulsante Browse per il Blender Path quando c'è una versione selezionata
	const renderBlenderPathSection = () => (
		<div className="space-y-2">
			<Label>Blender Path</Label>
			<div className="flex gap-2">
				<Input
					value={blenderPath}
					variant="faded"
					readOnly
					isDisabled
					placeholder={
						selectedVersion
							? 'Using selected Blender version'
							: 'Select Blender executable'
					}
				/>
				{!selectedVersion && (
					<Button onPress={handleBlenderPathChange}>Browse</Button>
				)}
			</div>
		</div>
	);

	// Add this function before the return statement
	const getCurrentSettings = () => ({
		blenderPath,
		parameters,
	});

	return (
		<div className="h-full flex flex-col">
			<div className="flex-1 overflow-auto">
				<div className="p-4 space-y-4">
					{/* General Settings */}
					<div className="space-y-2">
						<Label>Presets</Label>
						<div className="flex gap-2">
							<Select
								value={activePreset}
								onChange={(e) => handlePresetChange(e.target.value)}
								className="flex-1"
								defaultSelectedKeys={activePreset ? [activePreset] : []}
								popoverProps={{
									classNames: {
										base: 'before:bg-default-300',
										content: 'p-0 border-small border-divider bg-default-100 text-text-secondary',
									},
								}}
							>
								{Object.keys(presets).map((preset) => (
									<SelectItem key={preset} textValue={preset}>
										{preset}
									</SelectItem>
								))}
							</Select>
							{hasChanges && activePreset !== 'default' && (
								<Button
									onPress={handleUpdatePreset}
									variant="light"
									color="warning"
									startContent={<RefreshCcw />}
								>
									Update Preset
								</Button>
							)}
							<Button
								variant="light"
								color="primary"
								onPress={() => setIsPresetManagerOpen(true)}
								startContent={<Settings2 size={16} />}
							>
								Preset Manager
							</Button>
							<Button
								variant="flat"
								color="success"
								onPress={() => setIsSavePresetOpen(true)}
								startContent={<Save size={16} />}
							>
								Save As...
							</Button>
						</div>
					</div>

					{renderBlenderPathSection()}

					<Separator />
				</div>

				{/* Parameters */}
				<div className="px-4">
					<Tabs
						aria-label="Command builder tabs"
						defaultSelectedKey="base"
						onSelectionChange={(key) => setSelectedTab(key as string)}
						className="h-full"
						variant="underlined"
						classNames={{
							tabList: 'gap-4',
							cursor: 'w-full bg-primary',
							tab: 'px-4 h-10',
							tabContent: 'group-data-[selected=true]:text-primary',
						}}
					>
						{Object.entries(ParamDefinitions.getCategories()).map(
							([category, params]) => (
								<Tab
									key={category}
									id={category.toLowerCase()}
									title={category}
									className="h-full"
								>
									<ScrollArea className="h-[calc(100vh-400px)] pr-4">
										<div className="p-4 space-y-6">
											{params.map((param) => (
												<div key={param.name} className="space-y-2">
													<Label>
														{param.name}
														<span className="text-sm text-text-secondary ml-2">
															{param.description}
														</span>
													</Label>
													{renderParameter(param)}
												</div>
											))}
										</div>
									</ScrollArea>
								</Tab>
							)
						)}
					</Tabs>
				</div>
			</div>

			{/* Preset controls */}
			<div className="p-4 border-t border-border mt-auto">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button
							variant="flat"
							color="primary"
							onPress={() => setIsPresetManagerOpen(true)}
							startContent={<Settings2 size={16} />}
						>
							Preset Manager
						</Button>
						{hasChanges && (
							<Button
								variant="flat"
								color="warning"
								onPress={() => setIsSavePresetOpen(true)}
								startContent={<Save size={16} />}
							>
								Save Changes
							</Button>
						)}
					</div>
					<Button
						variant="flat"
						color="primary"
						onPress={() => setIsSavePresetOpen(true)}
						startContent={<RefreshCcw size={16} />}
					>
						Reset to Default
					</Button>
				</div>
			</div>

			{/* Dialogs */}
			{isPresetManagerOpen && (
				<PresetManager
					open={isPresetManagerOpen}
					onOpenChange={setIsPresetManagerOpen}
					presets={presets}
					onSave={handleSavePreset}
					onDelete={handleDeletePreset}
					onRename={handleRenamePreset}
				/>
			)}

			{isSavePresetOpen && (
				<SavePresetDialog
					open={isSavePresetOpen}
					onOpenChange={setIsSavePresetOpen}
					presets={presets}
					currentSettings={getCurrentSettings()}
					onSave={handleSavePreset}
				/>
			)}
		</div>
	);
};
