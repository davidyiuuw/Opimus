const base = require('../../.eslintrc.base.js')
module.exports = {
  ...base,
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}
