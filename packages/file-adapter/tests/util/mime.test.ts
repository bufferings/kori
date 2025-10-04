import { describe, test, expect } from 'vitest';

import { detectMimeType } from '../../src/util/mime.js';

describe('MIME type detection', () => {
  test('detects common text files', () => {
    expect(detectMimeType('index.html')).toBe('text/html');
    expect(detectMimeType('style.css')).toBe('text/css');
    expect(detectMimeType('script.js')).toBe('text/javascript');
    expect(detectMimeType('data.json')).toBe('application/json');
    expect(detectMimeType('readme.txt')).toBe('text/plain');
    expect(detectMimeType('doc.md')).toBe('text/markdown');
  });

  test('detects image files', () => {
    expect(detectMimeType('photo.jpg')).toBe('image/jpeg');
    expect(detectMimeType('image.png')).toBe('image/png');
    expect(detectMimeType('icon.svg')).toBe('image/svg+xml');
    expect(detectMimeType('favicon.ico')).toBe('image/x-icon');
    expect(detectMimeType('animation.gif')).toBe('image/gif');
  });

  test('detects audio and video files', () => {
    expect(detectMimeType('song.mp3')).toBe('audio/mpeg');
    expect(detectMimeType('sound.wav')).toBe('audio/wav');
    expect(detectMimeType('video.mp4')).toBe('video/mp4');
    expect(detectMimeType('clip.webm')).toBe('video/webm');
  });

  test('detects font files', () => {
    expect(detectMimeType('font.woff')).toBe('font/woff');
    expect(detectMimeType('font.woff2')).toBe('font/woff2');
    expect(detectMimeType('font.ttf')).toBe('font/ttf');
  });

  test('handles case insensitive extensions', () => {
    expect(detectMimeType('FILE.HTML')).toBe('text/html');
    expect(detectMimeType('Image.PNG')).toBe('image/png');
    expect(detectMimeType('Script.JS')).toBe('text/javascript');
  });

  test('handles paths with directories', () => {
    expect(detectMimeType('/var/www/index.html')).toBe('text/html');
    expect(detectMimeType('public/assets/style.css')).toBe('text/css');
    expect(detectMimeType('C:\\\\Users\\\\file.txt')).toBe('text/plain');
  });

  test('returns default for unknown extensions', () => {
    expect(detectMimeType('file.unknown')).toBe('application/octet-stream');
    expect(detectMimeType('file.xyz')).toBe('application/octet-stream');
    expect(detectMimeType('test.weird-extension')).toBe('application/octet-stream');
  });

  test('returns default for files without extension', () => {
    expect(detectMimeType('README')).toBe('application/octet-stream');
    expect(detectMimeType('Dockerfile')).toBe('application/octet-stream');
    expect(detectMimeType('filename')).toBe('application/octet-stream');
  });

  test('handles edge cases', () => {
    expect(detectMimeType('')).toBe('application/octet-stream');
    expect(detectMimeType('.')).toBe('application/octet-stream');
    expect(detectMimeType('.hidden')).toBe('application/octet-stream');
  });
});