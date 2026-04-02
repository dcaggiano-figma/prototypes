import { useSyncExternalStore, type ComponentType } from 'react';

export interface ToastOptions {
  icon?: ComponentType;
  message: string;
  link?: { label: string; href: string };
  button?: { label: string; onClick: () => void };
  dismissable?: boolean;
  timeout?: number;
  variant?: 'default' | 'danger';
  theme?: 'light' | 'dark';
}

export interface ToastData extends ToastOptions {
  id: number;
}

let nextId = 1;
let currentToast: ToastData | null = null;

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Show a toast notification. Returns the toast ID. */
export function showToast(options: ToastOptions): number {
  const id = nextId++;
  currentToast = { ...options, id };
  notify();
  return id;
}

/** Dismiss a specific toast by ID. */
export function dismissToast(id: number): void {
  if (currentToast?.id === id) {
    currentToast = null;
    notify();
  }
}

/** Dismiss the current toast (used internally by ToastContainer). */
export function dismissCurrentToast(): void {
  if (currentToast) {
    currentToast = null;
    notify();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastData | null {
  return currentToast;
}

/** Subscribe to the current toast state. Returns the active toast or null. */
export function useToast(): ToastData | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
