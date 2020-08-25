# svelte-web-component-builder

A base for building shareable Svelte components as **[Web Components](https://www.webcomponents.org/introduction)**. Clone it with [degit](https://github.com/Rich-Harris/degit):

```bash
npx degit LunaTK/svelte-web-component-builder
cd svelte-web-component-builder
npm install # or yarn
```

Your component's source code lives in `/src`.


## Setting up

* Run `npm install` (or `yarn install`)


## Building your own components

1. Make your own Svelte components
2. Include your components in `src/index.js`. Otherwise, it will not be included in build output
3. Run `npm run build` on your terminal
4. Build outputs are in `build/`

## Sample

- `test-module.html` : Use Svelte component as **ESM module**
- `test-web-component.html`: Use Svelte component as **Web Component**

## Original repository

This repository is forked from [sveltejs/component-template](https://github.com/sveltejs/component-template)

For more basic information, please visit the original repository.