export type KoriOk<T> = { ok: true; value: T };
export type KoriErr<E> = { ok: false; error: E };
export type KoriResult<T, E> = KoriOk<T> | KoriErr<E>;

export function ok<T>(value: T): KoriOk<T> {
  return { ok: true, value };
}

export function err<E>(error: E): KoriErr<E> {
  return { ok: false, error };
}
