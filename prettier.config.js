/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  printWidth: 120,
  singleQuote: true,

  overrides: [
    {
      files: 'docs/**/*.md',
      options: {
        printWidth: 80,
      },
    },
  ],
};

export default config;
