import type { Schema } from './schema';
import type { SchemaShape, InferShape, Prettify } from './types';
import { equals } from './utils';

export type Listener<T> = (state: T, prev: T) => void;
export type Selector<T, R> = (state: T) => R;
export type Unsubscribe = () => void;

/**
 * A reactive store backed by a schema for validation.
 * Created via `dp.store(schema, initialData)`.
 */
export class Store<S extends SchemaShape> {
  private _state: Prettify<InferShape<S>>;
  private _initial: Prettify<InferShape<S>>;
  private _schema: Schema<S>;
  private _listeners = new Set<Listener<Prettify<InferShape<S>>>>();

  constructor(schema: Schema<S>, initial: unknown) {
    this._schema = schema;
    this._initial = schema.parse(initial);
    this._state = structuredClone(this._initial);
  }

  /** Get the current state */
  get(): Prettify<InferShape<S>> {
    return this._state;
  }

  /** Replace the entire state (validates through schema) */
  set(next: unknown): void {
    const prev = this._state;
    this._state = this._schema.parse(next);
    this._notify(prev);
  }

  /** Partially update the state (merges with current, then validates) */
  update(partial: Partial<Prettify<InferShape<S>>>): void {
    const prev = this._state;
    const merged = { ...this._state, ...partial };
    this._state = this._schema.parse(merged);
    this._notify(prev);
  }

  /** Reset to initial state */
  reset(): void {
    const prev = this._state;
    this._state = structuredClone(this._initial);
    this._notify(prev);
  }

  /** Subscribe to all state changes. Returns an unsubscribe function. */
  subscribe(listener: Listener<Prettify<InferShape<S>>>): Unsubscribe {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Subscribe to changes in a derived value.
   * The listener only fires when the selected value changes.
   */
  select<R>(
    selector: Selector<Prettify<InferShape<S>>, R>,
    listener: (value: R, prev: R) => void,
  ): Unsubscribe {
    let prevValue = selector(this._state);
    return this.subscribe((state, _prevState) => {
      const nextValue = selector(state);
      if (!equals(prevValue, nextValue)) {
        const oldValue = prevValue;
        prevValue = nextValue;
        listener(nextValue, oldValue);
      }
    });
  }

  /** Get a snapshot (deep clone) of current state */
  snapshot(): Prettify<InferShape<S>> {
    return structuredClone(this._state);
  }

  /** Remove all listeners */
  destroy(): void {
    this._listeners.clear();
  }

  private _notify(prev: Prettify<InferShape<S>>): void {
    for (const listener of this._listeners) {
      listener(this._state, prev);
    }
  }
}
