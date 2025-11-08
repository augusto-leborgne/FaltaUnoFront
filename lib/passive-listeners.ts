/**
 * Make touch event listeners passive to improve scroll performance
 * This fixes Chrome warnings about non-passive touch listeners
 */
export function enablePassiveListeners() {
  if (typeof window === 'undefined') return;

  // Override addEventListener to make touch events passive by default
  const supportsPassive = (() => {
    let support = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() {
          support = true;
          return true;
        }
      });
      window.addEventListener('test' as any, null as any, opts);
      window.removeEventListener('test' as any, null as any);
    } catch (e) {
      support = false;
    }
    return support;
  })();

  if (supportsPassive) {
    const addEvent = EventTarget.prototype.addEventListener;
    const touchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
    
    EventTarget.prototype.addEventListener = function(
      type: string,
      listener: any,
      options?: any
    ) {
      // Make touch events passive by default if not explicitly set
      if (touchEvents.includes(type) && typeof options === 'boolean') {
        options = { passive: true, capture: options };
      } else if (touchEvents.includes(type) && (!options || options.passive === undefined)) {
        options = { ...options, passive: true };
      }
      
      return addEvent.call(this, type, listener, options);
    };
  }
}
