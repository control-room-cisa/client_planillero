// Setup test environment for DOM and custom matchers
import '@testing-library/jest-dom';

// Polyfill matchMedia for MUI's useMediaQuery in jsdom
if (!('matchMedia' in window)) {
  // @ts-expect-error augmenting window for tests
  window.matchMedia = (query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
}

// Optional: stabilize timezone-sensitive code if needed
// process.env.TZ = 'America/Tegucigalpa';
