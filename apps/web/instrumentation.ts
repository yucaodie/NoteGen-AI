// SSR polyfills for browser-only APIs needed during build
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: string | number[]) {}
    multiply(_other?: any) { return this; }
    translate(_tx: number, _ty: number) { return this; }
  };
}
export {};
