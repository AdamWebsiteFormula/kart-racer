// Tiny DOM helpers. The only rule: never write a value the node already shows.

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls = '', parent?: HTMLElement | null, text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

/** A text node that remembers what it shows. */
export class TextField {
  private last: string | null = null;
  readonly el: HTMLElement;
  constructor(el: HTMLElement) { this.el = el; }
  set(v: string): void {
    if (v === this.last) return;
    this.last = v;
    this.el.textContent = v;
  }
}

/** A class toggle that remembers its state. */
export class Flag {
  private last: boolean | null = null;
  readonly el: HTMLElement;
  readonly cls: string;
  constructor(el: HTMLElement, cls: string) { this.el = el; this.cls = cls; }
  set(on: boolean): void {
    if (on === this.last) return;
    this.last = on;
    this.el.classList.toggle(this.cls, on);
  }
}

/** A data-* attribute that remembers its value. */
export class Attr {
  private last: string | null = null;
  readonly el: HTMLElement;
  readonly name: string;
  constructor(el: HTMLElement, name: string) { this.el = el; this.name = name; }
  set(v: string): void {
    if (v === this.last) return;
    this.last = v;
    this.el.setAttribute(this.name, v);
  }
}

/**
 * innerHTML that remembers its source (icons are trusted, generated markup only). A picture in it
 * that fails to load removes itself, so the shape under it shows (ui.css hides the shape while an
 * .art image is there). That is a listener, never an inline onerror: the page's Content-Security-
 * Policy refuses inline handlers (index.html, red-team 24 Sept 2026).
 */
export class Markup {
  private last: string | null = null;
  readonly el: HTMLElement;
  constructor(el: HTMLElement) { this.el = el; }
  set(v: string): void {
    if (v === this.last) return;
    this.last = v;
    this.el.innerHTML = v;
    // the error event is a task queued after this, so the listener is always in time
    for (const img of this.el.querySelectorAll('img')) img.addEventListener('error', () => img.remove(), { once: true });
  }
}

export function button(parent: HTMLElement, id: string, cls = 'btn'): HTMLButtonElement {
  const b = h('button', cls, parent);
  b.type = 'button';
  b.dataset.id = id;
  b.tabIndex = -1;
  return b;
}

export function clear(e: HTMLElement): void {
  while (e.firstChild) e.removeChild(e.firstChild);
}

/** Restart a CSS animation on an element (for banners and flourishes). */
export function replay(e: HTMLElement, cls: string): void {
  e.classList.remove(cls);
  void e.offsetWidth; // one forced reflow, only on the frame an event fires
  e.classList.add(cls);
}
