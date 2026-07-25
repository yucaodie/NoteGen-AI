// SSR polyfills for browser-only APIs needed during build
export function register() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(_init?: any) {}
      multiply(_other?: any) { return this; }
      translate(_tx?: number, _ty?: number) { return this; }
      scale(_sx?: number, _sy?: number) { return this; }
      rotate(_angle?: number) { return this; }
    };
  }
  if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
    (globalThis as any).DOMMatrixReadOnly = class DOMMatrixReadOnly {};
  }
}
