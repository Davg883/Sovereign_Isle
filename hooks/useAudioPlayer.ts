import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = (onPlaybackEnd: () => void) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const playAudio = useCallback((audioBlob: Blob) => {
        if (audioRef.current) {
            audioRef.current.pause();
            const oldUrl = audioRef.current.src;
            if (oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
            }
        }

        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.play()
            .then(() => setIsPlaying(true))
            .catch(e => {
                console.error("Audio playback failed:", e);
                setIsPlaying(false);
            });

        audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
            onPlaybackEnd();
        };

        audio.onerror = () => {
             console.error("Error playing audio file.");
             setIsPlaying(false);
             URL.revokeObjectURL(url);
             onPlaybackEnd();
        }
    }, [onPlaybackEnd]);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            const url = audioRef.current.src;
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
            audioRef.current = null;
            setIsPlaying(false);
        }
    }, []);

    return { playAudio, stopAudio };
};