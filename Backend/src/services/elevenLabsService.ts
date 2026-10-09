export interface STTResult {
  text: string;
  language?: string;
  engine: 'elevenlabs_scribe';
}

export interface TTSResult {
  audioBase64: string;
  contentType: string;
  voiceId: string;
  engine: 'elevenlabs';
}

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

/**
 * Speech to Text using ElevenLabs Scribe API
 */
export async function transcribeWithElevenLabs(
  audioBuffer: Buffer,
  filename: string = 'audio.webm',
  mimetype: string = 'audio/webm'
): Promise<STTResult> {
  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('ElevenLabs API key is not configured in backend.');
  }

  // Node 18+ global FormData and Blob
  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mimetype });
  form.append('file', blob, filename);
  form.append('model_id', 'scribe_v1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ElevenLabs STT Error:', response.status, errorText);
    throw new Error(`ElevenLabs STT failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as any;
  const transcriptText = (data.text || '').trim();

  return {
    text: transcriptText,
    language: data.language_code || 'en',
    engine: 'elevenlabs_scribe',
  };
}

/**
 * Text to Speech using ElevenLabs TTS API
 * Returns null if the API key lacks TTS permission or fails, enabling zero-disruption fallback
 */
export async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<TTSResult | null> {
  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 1000), // Limit character length for real-time responsiveness
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('ElevenLabs TTS unavailable, delegating to client-side voice synthesizer:', response.status, errText);
      return null;
    }

    const arrayBuf = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);

    return {
      audioBase64: audioBuffer.toString('base64'),
      contentType: 'audio/mpeg',
      voiceId,
      engine: 'elevenlabs',
    };
  } catch (err) {
    console.warn('ElevenLabs TTS error:', err);
    return null;
  }
}

export function isElevenLabsAvailable(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim().length > 0);
}
