// A tiny "event emitter": the engine calls emit() when something happens, and any
// number of listeners (the board, the editor, the 3D scene) get told. The engine
// never knows who is listening, which is why one action can update every zone.
export type Listener<E> = (event: E) => void

export class Emitter<E> {
  private listeners = new Set<Listener<E>>()

  // Returns a function that stops listening again.
  on(listener: Listener<E>): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(event: E): void {
    // Copy first so a listener can unsubscribe while we are looping.
    for (const listener of [...this.listeners]) listener(event)
  }
}
