/**
 * Browser Utilities
 * 
 * This module provides utilities for detecting browser environments
 * and safely using browser-only APIs in a way that's compatible with
 * Next.js and other SSR frameworks.
 */

// Check if we're in a browser environment
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

// Safely create an image element
export const createImage = (): HTMLImageElement => {
  if (!isBrowser()) {
    throw new Error('Cannot create image element server-side');
  }
  return document.createElement('img');
};

// Safely access the window object
export const getWindow = (): Window | null => {
  return isBrowser() ? window : null;
};

// Safely access the document object
export const getDocument = (): Document | null => {
  return isBrowser() ? document : null;
};

// Safely import a browser-only module
export const safelyImportBrowserModule = async <T>(
  importFn: () => Promise<T>,
  fallback: T | null = null
): Promise<T | null> => {
  if (!isBrowser()) {
    return fallback;
  }
  
  try {
    return await importFn();
  } catch (error) {
    console.error('Failed to import browser module:', error);
    return fallback;
  }
};

// Create a canvas element safely
export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  if (!isBrowser()) {
    throw new Error('Cannot create canvas element server-side');
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

// Check if WebGL is supported
export const isWebGLSupported = (): boolean => {
  if (!isBrowser()) {
    return false;
  }
  
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
};

// Create a download link for a blob or data URL
export const createDownloadLink = (
  data: Blob | string,
  filename: string
): HTMLAnchorElement => {
  if (!isBrowser()) {
    throw new Error('Cannot create download link server-side');
  }
  
  const url = data instanceof Blob ? URL.createObjectURL(data) : data;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  return link;
};

// Trigger a download
export const downloadFile = (
  data: Blob | string,
  filename: string
): void => {
  if (!isBrowser()) {
    return;
  }
  
  const link = createDownloadLink(data, filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  if (data instanceof Blob) {
    // Clean up the object URL after the download starts
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  }
}; 