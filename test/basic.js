var concat = require('simple-concat')
var get = require('../')
var http = require('http')
var querystring = require('querystring')
var selfSignedHttps = require('self-signed-https')
var str = require('string-to-stream')
var test = require('tape')
var zlib = require('zlib')

// Allow self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

test('simple get', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/path')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/path', function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('basic auth', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.headers.authorization, 'Basic Zm9vOmJhcg==')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://foo:bar@localhost:' + port, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('follow redirects (up to 10)', function (t) {
  t.plan(15)

  var num = 1
  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/' + num, 'visited /' + num)
    num += 1

    if (num <= 10) {
      res.statusCode = 301
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      res.statusCode = 200
      res.end('response')
    }
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/1', function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.equal(res.redirectHistory.length, 9)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('do not follow redirects', function (t) {
  t.plan(2)

  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/1', 'visited /1')

    res.statusCode = 301
    res.setHeader('Location', '/2')
    res.end()
  })

  server.listen(0, function () {
    var port = server.address().port
    get({
      url: 'http://localhost:' + port + '/1',
      maxRedirects: 0
    }, function (err) {
      t.ok(err instanceof Error, 'got error')
      server.close()
    })
  })
})

test('follow redirects (11 is too many)', function (t) {
  t.plan(11)

  var num = 1
  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/' + num, 'visited /' + num)
    num += 1

    res.statusCode = 301
    res.setHeader('Location', '/' + num)
    res.end()
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port + '/1', function (err) {
      t.ok(err instanceof Error, 'got error')
      server.close()
    })
  })
})

test('custom headers', function (t) {
  t.plan(2)

  var server = http.createServer(function (req, res) {
    t.equal(req.headers['custom-header'], 'custom-value')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get({
      url: 'http://localhost:' + port,
      headers: {
        'custom-header': 'custom-value'
      }
    }, function (err, res) {
      t.error(err)
      res.resume()
      server.close()
    })
  })
})

test('gzip response', function (t) {
  t.plan(4)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-encoding', 'gzip')
    str('response').pipe(zlib.createGzip()).pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200) // statusCode still works on gunzip stream
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('deflate response', function (t) {
  t.plan(4)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-encoding', 'deflate')
    str('response').pipe(zlib.createDeflate()).pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    get('http://localhost:' + port, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200) // statusCode still works on inflate stream
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('https', function (t) {
  t.plan(5)

  var server = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    get('https://localhost:' + port + '/path', function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'response')
        server.close()
      })
    })
  })
})

test('redirect https to http', function (t) {
  t.plan(7)

  var httpPort = null
  var httpsPort = null

  var httpsServer = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    res.setHeader('Location', 'http://localhost:' + httpPort + '/path2')
    res.end()
  })

  var httpServer = http.createServer(function (req, res) {
    t.equal(req.url, '/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpsServer.listen(0, function () {
    httpsPort = httpsServer.address().port
    httpServer.listen(0, function () {
      httpPort = httpServer.address().port
      get('https://localhost:' + httpsPort + '/path1', function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        t.equal(res.redirectHistory.length, 1)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          httpsServer.close()
          httpServer.close()
        })
      })
    })
  })
})

test('redirect http to https', function (t) {
  t.plan(7)

  var httpsPort = null
  var httpPort = null

  var httpServer = http.createServer(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    res.setHeader('Location', 'https://localhost:' + httpsPort + '/path2')
    res.end()
  })

  var httpsServer = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpServer.listen(0, function () {
    httpPort = httpServer.address().port
    httpsServer.listen(0, function () {
      httpsPort = httpsServer.address().port
      get('http://localhost:' + httpPort + '/path1', function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        t.equal(res.redirectHistory.length, 1)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          httpsServer.close()
          httpServer.close()
        })
      })
    })
  })
})

test('post (text body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: 'this is the body'
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'this is the body')
        server.close()
      })
    })
  })
})

test('post (utf-8 text body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: 'jedan dva tri četiri'
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'jedan dva tri četiri')
        server.close()
      })
    })
  })
})

test('post (buffer body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port,
      body: new Buffer('this is the body')
    }
    get.post(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), 'this is the body')
        server.close()
      })
    })
  })
})

test('get.concat', function (t) {
  t.plan(4)
  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('blah blah blah')
  })

  server.listen(0, function () {
    var port = server.address().port
    get.concat('http://localhost:' + port, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.ok(Buffer.isBuffer(data), '`data` is type buffer')
      t.equal(data.toString(), 'blah blah blah')
      server.close()
    })
  })
})

test('access `req` object', function (t) {
  t.plan(2)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    var port = server.address().port
    var req = get('http://localhost:' + port, function (err, res) {
      t.error(err)
      res.resume() // discard data
      server.close()
    })

    req.on('socket', function () {
      t.pass('got `socket` event')
    })
  })
})

test('simple get json', function (t) {
  t.plan(6)

  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/path')
    t.equal(req.headers['accept'], 'application/json')
    res.statusCode = 200
    res.end('{"message":"response"}')
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port + '/path',
      json: true
    }
    get(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), '{"message":"response"}')
        server.close()
      })
    })
  })
})

test('get.concat json', function (t) {
  t.plan(3)
  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.end('{"message":"response"}')
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port + '/path',
      json: true
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.equal(data.message, 'response')
      server.close()
    })
  })
})

test('get.concat json error', function (t) {
  t.plan(1)
  var server = http.createServer(function (req, res) {
    res.statusCode = 500
    res.end('not json')
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      url: 'http://localhost:' + port + '/path',
      json: true
    }
    get.concat(opts, function (err, res, data) {
      t.ok(err instanceof Error)
      server.close()
    })
  })
})

test('post (json body)', function (t) {
  t.plan(5)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/json')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      body: {
        message: 'this is the body'
      },
      json: true
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.equal(data.message, 'this is the body')
      server.close()
    })
  })
})

test('post (form, object)', function (t) {
  t.plan(5)

  var formData = {
    foo: 'bar'
  }

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      form: formData
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.deepEqual(querystring.parse(data.toString()), formData)
      server.close()
    })
  })
})

test('post (form, querystring)', function (t) {
  t.plan(5)

  var formData = 'foo=bar'

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'POST')
    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'POST',
      url: 'http://localhost:' + port,
      form: formData
    }
    get.concat(opts, function (err, res, data) {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.equal(data.toString(), formData)
      server.close()
    })
  })
})

test('HEAD request', function (t) {
  t.plan(3)

  var server = http.createServer(function (req, res) {
    t.equal(req.method, 'HEAD')
    // Taken from real-world response from HEAD request to GitHub.com
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('content-encoding', 'gzip')
    res.setHeader('connection', 'close')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    var port = server.address().port
    var opts = {
      method: 'HEAD',
      url: 'http://localhost:' + port
    }
    get.head(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      server.close()
    })
  })
})
