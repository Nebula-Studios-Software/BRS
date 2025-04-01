import React from 'react';
import { Button } from '@/components/ui/button';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import QueuePanel from './QueuePanel';
import { List } from 'lucide-react';

export const QueueSheet: React.FC = () => {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="ghost" size="sm">
					<List className="h-4 w-4" />
					<span className="text-xs text-muted-foreground">Queue</span>
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>Render Queue</SheetTitle>
				</SheetHeader>
				<div className="mt-4">
					<QueuePanel />
				</div>
			</SheetContent>
		</Sheet>
	);
};
