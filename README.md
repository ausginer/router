<div align="center">
<h1>@ausginer/router</h1>

[API Documentation](https://ausginer.github.io/router/) | [Example](https://codesandbox.io/p/github/ausginer/router-examples/main)

[![Latest Stable Version](https://img.shields.io/npm/v/@ausginer/router.svg)](https://www.npmjs.com/package/@ausginer/router)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![codecov](https://codecov.io/gh/ausginer/router/branch/main/graph/badge.svg?token=HcOvtJdBcB)](https://codecov.io/gh/ausginer/router)
![BundleJS](https://deno.bundlejs.com/?q=@ausginer/router&config={"esbuild":{"external":["urlpattern-polyfill"]}}&badge=)
[![Verification](https://github.com/ausginer/router/actions/workflows/verification.yml/badge.svg)](https://github.com/ausginer/router/actions/workflows/verification.yml)

</div>

A tiny and easy-to-use middleware-style router for client and server-side development.
It is based on the new experimental [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) API and draws inspiration from [universal-router](https://github.com/kriasoft/universal-router).

## Features

- The code is minimalistic and does not rely on any dependencies except for the `URLPattern` [polyfill](https://github.com/kenchris/urlpattern-polyfill), which is needed for browsers that do not support the `URLPattern` API yet.
- It is designed to be framework-agnostic, meaning you can use it with any framework such as [React](https://react.dev), [Vue](https://vuejs.org), [Angular](https://angular.io/), or even without any framework at all.
- It follows a middleware approach similar to [Express](http://expressjs.com/).

## Requirements

- ECMA version: ES2022. The package utilizes [private class members](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) and the [Array.prototype.at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at) method. These features are supported by all modern browsers by default.
- As `URLPattern` is an experimental technology, a polyfill is required. The package includes the polyfill as a dependency for convenience but the polyfill is loaded conditionally, only for browsers that do not have native support for `URLPattern`. With polyfill, the router's size is:&nbsp;&nbsp;![BundleJS](https://deno.bundlejs.com/?q=@ausginer/router&badge=)

## Installation

- [npm](https://www.npmjs.com/package/@ausginer/router):
  ```bash
  $ npm i @ausginer/router
  ```
- [yarn](https://yarn.pm/@ausginer/router):
  ```bash
  $ yarn add @ausginer/router
  ```
- pnpm:
  ```bash
  $ pnpm add @ausginer/router
  ```

## Usage

```ts
import { addNavigationListener, navigate, Router } from '@ausginer/router';

const router = new Router<string>([
  {
    path: '',
    async action({ next }) {
      return `<h1>My app</h1><div>${await next()}</div>`;
    },
    children: [
      {
        path: '/users/:id(\\d+)',
        async action({
          result: {
            pathname: {
              groups: { id },
            },
          },
        }) {
          return `User #${id} data`;
        },
      },
    ],
  },
  {
    path: '*',
    action({ url }) {
      return `404: Page ${url.toString()} is not found.`;
    },
  },
]);

addNavigationListener((path) => {
  router
    .resolve(path)
    .then((html) => {
      document.body.innterHTML = html;
    })
    .catch((e: unknown) => {
      throw e;
    });
});

navigate('/user/100'); // Will render `<h1>My app</h1><div>User #100 data</div>`
navigate('/not-existing-page'); // Will render `404: Page https://example.com/not-existing-page is not found.`
```
