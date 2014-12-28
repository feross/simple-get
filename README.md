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

A more complex example:

```js
var get = require('simple-get')
var concat = require('concat-stream')

get({
  url: 'http://example.com',
  maxRedirects: 3, // default value is 10 
  
  // simple-get accepts all options that node.js `http` accepts
  // See: http://nodejs.org/api/http.html#http_http_request_options_callback
  headers: {
    'user-agent': 'my cool app'
  }
}, function (err, res) {
  if (err) throw err
  
  // All properties/methods from http.IncomingResponse are available,
  // even if a gunzip/inflate transform stream was returned.
  // See: http://nodejs.org/api/http.html#http_http_incomingmessage
  res.setTimeout(10000)
  console.log(res.headers)
  
  res.pipe(concat(function (data) {
    // `data` is the decoded response, after it's been gunzipped or inflated
    // (if applicable)
    console.log('got the response: ' + data)
  }))
  
})
```

## license

MIT. Copyright (c) [Feross Aboukhadijeh](http://feross.org).
