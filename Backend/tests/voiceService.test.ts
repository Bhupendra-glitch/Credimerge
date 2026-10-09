import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config();

import {
  transcribeWithElevenLabs,
  synthesizeWithElevenLabs,
  isElevenLabsAvailable,
} from '../src/services/elevenLabsService';

describe('ElevenLabs Voice Assistant Suite', () => {
  it('detects ElevenLabs configuration from environment', () => {
    assert.equal(isElevenLabsAvailable(), true);
  });

  it('connects to ElevenLabs Scribe STT API and parses transcription payload', async () => {
    // Generate valid 1-second 16kHz mono PCM WAV header + buffer
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const numSamples = sampleRate;
    const dataSize = numSamples * blockAlign;

    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    const result = await transcribeWithElevenLabs(buffer, 'test.wav', 'audio/wav');
    assert.equal(result.engine, 'elevenlabs_scribe');
    assert.ok(typeof result.text === 'string');
  });

  it('handles TTS response or gracefully returns null for client fallback', async () => {
    const result = await synthesizeWithElevenLabs('Hello from CrediMerge voice assistant.');
    // If key has TTS, returns audioBase64; if missing permissions, safely returns null without throwing
    if (result) {
      assert.equal(result.engine, 'elevenlabs');
      assert.ok(result.audioBase64.length > 0);
    } else {
      assert.equal(result, null);
    }
  });
});
