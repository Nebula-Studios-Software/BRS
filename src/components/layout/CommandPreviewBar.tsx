import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge, Terminal, Pin, PinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPreviewBarProps {
  command: string;
  onOpenDrawer: () => void;
}

const CommandPreviewBar: React.FC<CommandPreviewBarProps> = ({ command, onOpenDrawer }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Se il click è sul pin, non aprire il drawer
    if ((e.target as HTMLElement).closest('.pin-button')) {
      return;
    }
    onOpenDrawer();
  };

  return (
    <motion.div
      className={`cursor-pointer transition-all duration-200 ${isPinned ? 'h-auto min-h-[3rem]' : 'h-8 hover:h-auto hover:min-h-[3rem]'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="h-full flex flex-col py-2 px-4">
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </motion.div>
          <motion.span
            className="text-sm text-muted-foreground"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Command Preview
          </motion.span>
          <motion.span
            className='text-xs text-muted-foreground'
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            [ Click to open drawer ]
          </motion.span>
          <motion.button
            className="pin-button ml-auto p-1 hover:bg-muted rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              setIsPinned(!isPinned);
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isPinned ? (
              <PinOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Pin className="h-4 w-4 text-muted-foreground" />
            )}
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {(isHovered || isPinned) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <motion.code
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-sm font-mono break-all mt-2 block"
              >
                {command}
              </motion.code>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CommandPreviewBar;
