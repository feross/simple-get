# simple-get [![travis](https://img.shields.io/travis/feross/simple-get.svg)](https://travis-ci.org/feross/simple-get) [![npm](https://img.shields.io/npm/v/simple-get.svg)](https://npmjs.org/package/simple-get) [![downloads](https://img.shields.io/npm/dm/simple-get.svg)](https://npmjs.org/package/simple-get)

### Simplest way to make http get requests. Supports HTTPS, redirects, gzip/deflate, streams in < 100 lines.

## features

- follow redirects
- automatically handle gzip/deflate responses
- use streams
- supports HTTPS
- supports `url` key so there's no need to use `url.parse` on the url when specifying options

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
