/**
 * UI Library Patches
 * 
 * This file contains patches and fixes for various UI libraries,
 * particularly focusing on SSR-related issues.
 */

// Safely access global in a way that works with TypeScript
const getGlobal = (): any => {
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  return {};
};

// Patch for Radix UI and react-style-singleton issues
// Use this to fix SSR issues with styleSingleton
export const patchRadixUI = () => {
  if (typeof window === 'undefined') {
    // Server-side fix
    const globalObj = getGlobal();
    if (!globalObj.styleSingletonInstances) {
      globalObj.styleSingletonInstances = new Map();
      
      // Mock implementation for the server
      globalObj.styleSingleton = () => {
        return {
          add: () => {},
          remove: () => {},
          flush: () => {},
        };
      };
    }
  } else {
    // Client-side fix
    if (window && !('styleSingleton' in window)) {
      // Create a simple styleSingleton implementation if it doesn't exist
      // This is a simplified version of what react-style-singleton does
      (window as any).styleSingleton = () => {
        const styles = new Set<string>();
        
        return {
          add: (style: string) => {
            if (!styles.has(style)) {
              styles.add(style);
              const styleEl = document.createElement('style');
              styleEl.textContent = style;
              document.head.appendChild(styleEl);
              return styleEl;
            }
            return null;
          },
          remove: (style: string) => {
            if (styles.has(style)) {
              styles.delete(style);
              // Find and remove style element with this content
              Array.from(document.querySelectorAll('style'))
                .filter(el => el.textContent === style)
                .forEach(el => el.remove());
            }
          },
          flush: () => {
            styles.clear();
          }
        };
      };
    }
  }
};

// Run the patch automatically
patchRadixUI(); 