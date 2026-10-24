import type { CultureDef } from './home3d/homeScene';
import type { Book, BookListing } from './types';
import { drawCover } from './art/scenes';

const books = new Map<string, Promise<Book>>();
let listing: Promise<BookListing[]> | null = null;

export function loadListing(): Promise<BookListing[]> {
  listing ??= fetch('/books/index.json')
    .then((r) => {
      if (!r.ok) throw new Error('Kitap listesi yüklenemedi');
      return r.json();
    })
    .then((d: { books: BookListing[] }) => d.books);
  return listing;
}

export function loadBook(id: string): Promise<Book> {
  if (!books.has(id)) {
    books.set(
      id,
      fetch(`/books/${id}/book.json`).then((r) => {
        if (!r.ok) throw new Error('Kitap bulunamadı');
        return r.json();
      }),
    );
  }
  return books.get(id)!;
}

let culture: Promise<CultureDef[]> | null = null;
export function loadCulture(): Promise<CultureDef[]> {
  culture ??= fetch('/culture/items.json')
    .then((r) => {
      if (!r.ok) throw new Error('Kültür rafı yüklenemedi');
      return r.json();
    })
    .then((d: { items: CultureDef[] }) => d.items);
  return culture;
}

let fontsReady: Promise<unknown> | null = null;
export function fonts() {
  fontsReady ??= Promise.all([
    document.fonts.load('600 80px "DynaPuff"', 'Bayram Sabahı ğüşıöçİŞĞ'),
    document.fonts.load('20px "Andika"', 'ğüşıöç'),
  ]).catch(() => undefined);
  return fontsReady;
}

const covers = new Map<string, HTMLCanvasElement>();

/** A cover as a canvas. Uses the image in `cover.src` when a book has real cover art. */
export async function coverCanvas(b: BookListing, px = 700): Promise<HTMLCanvasElement> {
  const key = `${b.id}:${px}`;
  const hit = covers.get(key);
  if (hit) return hit;
  await fonts();
  let c: HTMLCanvasElement;
  if (b.cover.src) {
    const img = new Image();
    img.src = `/books/${b.id}/${b.cover.src}`;
    await img.decode();
    c = document.createElement('canvas');
    c.width = px;
    c.height = Math.round(px * 1.36);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  } else {
    c = drawCover(b.cover.art, b.title, { color: b.cover.color, motif: b.cover.motif }, px);
  }
  covers.set(key, c);
  return c;
}

/** Copy a cached canvas so it can be placed in the page more than once. */
export function cloneCanvas(src: HTMLCanvasElement, label: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', label);
  return c;
}
