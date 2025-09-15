// This is the ID for the voice 'Amelie' from ElevenLabs, chosen for its sovereign and engaging tone.
const VOICE_ID = 'STlyUyKyDwpU8g52uzux';

export const textToSpeech = async (text: string): Promise<Blob | null> => {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
        console.error("ElevenLabs API key is not configured. Please set the ELEVENLABS_API_KEY environment variable.");
        // To avoid breaking the app, we just won't play audio.
        return null;
    }
    
    // Remove characters that can interfere with TTS, like asterisks used for emphasis.
    const cleanText = text.replace(/\*/g, '');

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    const headers = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
    };
    const body = JSON.stringify({
        text: cleanText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.1,
            use_speaker_boost: true
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body,
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("ElevenLabs API Error:", errorBody);
            throw new Error(`ElevenLabs API request failed with status ${response.status}`);
        }

        return await response.blob();
    } catch (error) {
        console.error("Error calling ElevenLabs API:", error);
        return null;
    }
};