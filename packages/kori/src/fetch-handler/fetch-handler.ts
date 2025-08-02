export type KoriInitializedFetchHandler = {
  fetchHandler: (request: Request) => Promise<Response>;
  onClose: () => Promise<void>;
};

export type KoriFetchHandler = {
  onStart: () => Promise<KoriInitializedFetchHandler>;
};
