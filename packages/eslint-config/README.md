# @vitera/eslint-config

Shared ESLint configuration for the monorepo.

## Usage

### For Node.js packages (backend/utilities)

```js
module.exports = {
  extends: ['@vitera/eslint-config/base.js'],
}
```

### For React applications (frontend)

```js
module.exports = {
  extends: ['@vitera/eslint-config/react.js'],
}
```
