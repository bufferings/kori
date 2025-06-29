const KoriEnvironmentBrand = Symbol('kori-environment');

export type KoriEnvironment = {
  [KoriEnvironmentBrand]: typeof KoriEnvironmentBrand;
};

export function createKoriEnvironment(): KoriEnvironment {
  return {
    [KoriEnvironmentBrand]: KoriEnvironmentBrand,
  };
}
