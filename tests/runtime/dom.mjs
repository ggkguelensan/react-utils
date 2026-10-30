import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
export { act };
export function mount() {
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  return {
    element,
    async render(node) { await act(async () => root.render(node)); },
    async dispose() { await act(async () => root.unmount()); element.remove(); },
  };
}
