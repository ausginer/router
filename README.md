# @ausginer/router

A small (788 bytes) and easy-to-use middleware-style router for client and server-side development.
It is based on the new experimental [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern) API and draws inspiration from [universal-router](https://github.com/kriasoft/universal-router).

## Features
 
- The code is minimalistic and does not rely on any dependencies except for the `URLPattern` [polyfill](https://github.com/kenchris/urlpattern-polyfill), which is needed for browsers that do not support the `URLPattern` API yet.
- It is designed to be framework-agnostic, meaning you can use it with any framework such as [React](https://react.dev), [Vue](https://vuejs.org), [Angular](https://angular.io/), or even without any framework at all.
- It follows a middleware approach similar to [Express](http://expressjs.com/).

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
  
## 