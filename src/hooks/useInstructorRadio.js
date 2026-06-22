import { useEffect, useState } from 'react';

export function useInstructorRadio() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;

    if (globalAudio.paused) {
      globalAudio.play().catch((err) => console.log('Audio play blocked', err));
    } else {
      globalAudio.pause();
    }
    setIsPlaying(!globalAudio.paused);
  };

  return { isPlaying, toggleRadioPlay };
}
