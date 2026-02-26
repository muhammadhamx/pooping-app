import { createContext, useContext, useRef, type ReactNode } from 'react';
import { ConfettiOverlay, type ConfettiRef } from '@/components/ui/ConfettiOverlay';

interface ConfettiContextValue {
  fire: () => void;
}

const ConfettiContext = createContext<ConfettiContextValue>({ fire: () => {} });

export function ConfettiProvider({ children }: { children: ReactNode }) {
  const confettiRef = useRef<ConfettiRef>(null);

  const fire = () => {
    confettiRef.current?.fire();
  };

  return (
    <ConfettiContext.Provider value={{ fire }}>
      {children}
      <ConfettiOverlay ref={confettiRef} />
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  return useContext(ConfettiContext);
}
