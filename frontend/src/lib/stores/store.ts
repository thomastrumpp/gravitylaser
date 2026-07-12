type Subscriber<T> = (value: T) => void;
type Unsubscriber = () => void;

export class Store<T> {
  private value: T;
  private subscribers = new Set<Subscriber<T>>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  public get(): T {
    return this.value;
  }

  public set(newValue: T): void {
    this.value = newValue;
    this.subscribers.forEach((sub) => sub(newValue));
  }

  public update(updater: (value: T) => T): void {
    this.set(updater(this.value));
  }

  public subscribe(subscriber: Subscriber<T>): Unsubscriber {
    this.subscribers.add(subscriber);
    subscriber(this.value); // Initialen Wert sofort übermitteln
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
}

/**
 * Ein React-Hook zur einfachen Verwendung unseres Stores in React-Komponenten
 */
import { useState, useEffect } from 'react';

export function useStore<T>(store: Store<T>): T {
  const [value, setValue] = useState<T>(store.get());

  useEffect(() => {
    return store.subscribe((newValue) => {
      setValue(newValue);
    });
  }, [store]);

  return value;
}
