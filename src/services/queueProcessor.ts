import { useQueueStore } from '@/store/queueStore';
import { QueueItem } from '@/types/queue';
import { ProgressEventData } from '@/types/electron';

class QueueProcessor {
	private static instance: QueueProcessor;
	private isProcessing: boolean = false;
	private currentProcesses: Map<string, string> = new Map();
	private maxConcurrent: number = 1;

	private constructor() {
		// Inizializza il processore
	}

	public static getInstance(): QueueProcessor {
		if (!QueueProcessor.instance) {
			QueueProcessor.instance = new QueueProcessor();
		}
		return QueueProcessor.instance;
	}

	public async startProcessing(): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;
		await this.processQueue();
	}

	public stopProcessing(): void {
		this.isProcessing = false;
		// Ferma tutti i processi in esecuzione
		Array.from(this.currentProcesses.entries()).forEach(([id]) => {
			this.stopProcess(id);
		});
		this.currentProcesses.clear();
	}

	private async processQueue(): Promise<void> {
		while (this.isProcessing) {
			const state = useQueueStore.getState();
			const { items } = state;

			// Se ci sono già processi in esecuzione, aspetta
			if (this.currentProcesses.size > 0) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				continue;
			}

			// Trova il prossimo elemento da processare
			const nextItem = this.findNextItem(items);

			if (!nextItem) {
				// Se non ci sono elementi da processare, aspetta
				await new Promise((resolve) => setTimeout(resolve, 1000));
				continue;
			}

			// Avvia il processo
			await this.startProcess(nextItem);
		}
	}

	private findNextItem(items: QueueItem[]): QueueItem | undefined {
		// Ordina gli elementi per priorità e data di creazione
		const sortedItems = [...items].sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		});

		return sortedItems.find((item) => {
			// Verifica che l'elemento sia in attesa
			if (item.status !== 'pending') return false;

			// Verifica che non sia già in esecuzione
			if (this.currentProcesses.has(item.id)) return false;

			// Verifica lo scheduling
			if (item.scheduledTime && new Date(item.scheduledTime) > new Date()) {
				return false;
			}

			// Verifica le dipendenze
			if (item.dependencies && item.dependencies.length > 0) {
				const state = useQueueStore.getState();
				return item.dependencies.every((depId) => {
					const depItem = state.items.find((i) => i.id === depId);
					return depItem?.status === 'completed';
				});
			}

			return true;
		});
	}

	private async startProcess(item: QueueItem): Promise<void> {
		try {
			// Aggiorna lo stato dell'elemento
			useQueueStore.getState().updateItem(item.id, { status: 'running' });

			// Esegui il comando
			const { id } = await window.electronAPI.executeCommand(item.command!);
			this.currentProcesses.set(item.id, id);

			// Ascolta gli eventi di progresso
			window.electronAPI.on<ProgressEventData>(`progress-${id}`, (data) => {
				// Aggiorna lo stato del render
				if (data.progress !== undefined) {
					useQueueStore.getState().updateItem(item.id, {
						progress: data.progress,
						currentFrame: data.currentFrame,
						totalFrames: data.totalFrames,
						currentSample: data.currentSample,
						totalSamples: data.totalSamples,
						inCompositing: data.inCompositing,
						compositingOperation: data.compositingOperation,
					});
				}
			});

			// Ascolta l'evento di completamento
			window.electronAPI.on<number>(`complete-${id}`, async (code) => {
				this.currentProcesses.delete(item.id);

				if (code === 0) {
					useQueueStore.getState().updateItem(item.id, { status: 'completed' });
				} else {
					useQueueStore.getState().updateItem(item.id, { status: 'failed' });
				}
			});

			// Ascolta gli eventi di errore
			window.electronAPI.on<string>(`error-${id}`, () => {
				this.currentProcesses.delete(item.id);
				useQueueStore.getState().updateItem(item.id, { status: 'failed' });
			});
		} catch (error) {
			console.error('Error starting process:', error);
			useQueueStore.getState().updateItem(item.id, { status: 'failed' });
		}
	}

	private async stopProcess(itemId: string): Promise<void> {
		const processId = this.currentProcesses.get(itemId);
		if (processId) {
			await window.electronAPI.stopProcess(processId);
			this.currentProcesses.delete(itemId);
			useQueueStore.getState().updateItem(itemId, { status: 'pending' });
		}
	}

	public setMaxConcurrent(value: number): void {
		this.maxConcurrent = value;
	}
}

export const queueProcessor = QueueProcessor.getInstance();
