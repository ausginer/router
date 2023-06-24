# @ausginer/router

A tiny (787 bytes) and easy-to-use middleware-style router for client and server-side development.
It is based on the new experimental [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) API and draws inspiration from [universal-router](https://github.com/kriasoft/universal-router).

## Features
 
- The code is minimalistic and does not rely on any dependencies except for the `URLPattern` [polyfill](https://github.com/kenchris/urlpattern-polyfill), which is needed for browsers that do not support the `URLPattern` API yet.
- It is designed to be framework-agnostic, meaning you can use it with any framework such as [React](https://react.dev), [Vue](https://vuejs.org), [Angular](https://angular.io/), or even without any framework at all.
- It follows a middleware approach similar to [Express](http://expressjs.com/).

## Requirements

- ECMA version: `ES2022`. The package uses [private class members](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields) and [Array.prototype.at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at) method. All evergreen browsers support it by default.
- Since `URLPattern` is an experimental technology, the polyfill is required. For convenience, the polyfill is already included as a dependency of the package. However, loading is performed conditionally: the polyfill is loaded only for browsers that does not have `URLPattern` natively. With the polyfill, the size of the router is **6.03** Kb.

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
  