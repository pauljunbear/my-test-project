/**
 * Patch file for styleSingleton function
 * 
 * This file is imported directly by Next.js's webpack configuration
 * to replace the problematic styleSingleton function from react-style-singleton
 */

// Simple implementation that works on both client and server
module.exports = function createSingleton() {
  // Cache for style content
  const cache = new Set();

  // For server rendering
  if (typeof window === 'undefined') {
    return {
      add: function(style) { return null; },
      remove: function() {},
      flush: function() {}
    };
  }

  // For client rendering
  return {
    add: function(style) {
      if (cache.has(style)) {
        return null;
      }
      
      cache.add(style);
      
      const styleTag = document.createElement('style');
      styleTag.textContent = style;
      document.head.appendChild(styleTag);
      
      return styleTag;
    },
    
    remove: function(style) {
      if (cache.has(style)) {
        cache.delete(style);
        
        const tags = document.querySelectorAll('style');
        for (let i = 0; i < tags.length; i++) {
          const tag = tags[i];
          if (tag.textContent === style) {
            tag.parentNode.removeChild(tag);
            break;
          }
        }
      }
    },
    
    flush: function() {
      cache.clear();
    }
  };
}; 