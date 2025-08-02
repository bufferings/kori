const KoriResponseAbortBrand = Symbol('kori-response-abort');

export const KoriResponseAbortObject = { [KoriResponseAbortBrand]: true } as const;

export type KoriResponseAbort = typeof KoriResponseAbortObject;

export function isKoriResponseAbort(value: unknown): value is KoriResponseAbort {
  return typeof value === 'object' && value !== null && KoriResponseAbortBrand in value;
}
