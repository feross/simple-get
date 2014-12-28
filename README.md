# simple-get [![travis](https://img.shields.io/travis/feross/simple-get.svg)](https://travis-ci.org/feross/simple-get) [![npm](https://img.shields.io/npm/v/simple-get.svg)](https://npmjs.org/package/simple-get) [![downloads](https://img.shields.io/npm/dm/simple-get.svg)](https://npmjs.org/package/simple-get)

### Simplest way to make http get requests

## features

This module is designed to be the lightest possible wrapper on top of node.js `http`, but supporting:

- follows redirects
- automatically handles gzip/deflate responses
- supports HTTPS
- supports convenience `url` key so there's no need to use `url.parse` on the url when specifying options

All this in < 100 lines of code.

## install

```
npm install simple-get
```

## usage

```js
var get = require('simple-get')

get('http://example.com', function (err, res) {
  if (err) throw err
  console.log(res.statusCode) // 200
  res.pipe(process.stdout) // `res` is a stream
})
```

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
