const concat = require('simple-concat')
const get = require('../')
const http = require('http')
const selfSignedHttps = require('self-signed-https')
const test = require('tape')

test('follow redirects (up to 10)', function (t) {
  t.plan(15)

  let num = 0
  const server = http.createServer(function (req, res) {
    t.equal(req.url, '/' + num, 'visited /' + num)

    if (num < 10) {
      num += 1
      res.statusCode = 301
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      res.statusCode = 200
      res.end('response')
    }
  })

  server.listen(0, function () {
    const port = server.address().port
    get('http://localhost:' + port + '/0', function (err, res) {
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

test('do not follow redirects', function (t) {
  t.plan(2)

  const server = http.createServer(function (req, res) {
    t.equal(req.url, '/0', 'visited /0')

    res.statusCode = 301
    res.setHeader('Location', '/1')
    res.end()
  })

  server.listen(0, function () {
    const port = server.address().port
    get({
      url: 'http://localhost:' + port + '/0',
      maxRedirects: 0
    }, function (err) {
      t.ok(err instanceof Error, 'got error')
      server.close()
    })
  })
})

test('do not follow redirects and do not error', function (t) {
  t.plan(4)

  const server = http.createServer(function (req, res) {
    t.equal(req.url, '/0', 'visited /0')

    res.statusCode = 301
    res.setHeader('Location', '/1')
    res.end()
  })

  server.listen(0, function () {
    const port = server.address().port
    get({
      url: 'http://localhost:' + port + '/0',
      followRedirects: false
    }, function (err, res) {
      t.ok(!err, 'got no error')
      t.equal(res.statusCode, 301, 'status code 301')
      t.equal(res.headers.location, '/1', 'redirect location')
      server.close()
    })
  })
})

test('follow redirects (11 is too many)', function (t) {
  t.plan(12)

  let num = 0
  const server = http.createServer(function (req, res) {
    t.equal(req.url, '/' + num, 'visited /' + num)

    if (num < 11) {
      num += 1
      res.statusCode = 301
      res.setHeader('Location', '/' + num)
      res.end()
    } else {
      t.fail('no request to /11 should be made, should error first')
    }
  })

  server.listen(0, function () {
    const port = server.address().port
    get('http://localhost:' + port + '/0', function (err) {
      t.ok(err instanceof Error, 'got error')
      server.close()
    })
  })
})

test('redirect https to http', function (t) {
  t.plan(6)

  let httpPort = null
  let httpsPort = null

  const httpsServer = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    res.setHeader('Location', 'http://localhost:' + httpPort + '/path2')
    res.end()
  })

  const httpServer = http.createServer(function (req, res) {
    t.equal(req.url, '/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpsServer.listen(0, function () {
    httpsPort = httpsServer.address().port
    httpServer.listen(0, function () {
      httpPort = httpServer.address().port
      get({
        url: 'https://localhost:' + httpsPort + '/path1',
        rejectUnauthorized: false
      }, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
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
  t.plan(6)

  let httpsPort = null
  let httpPort = null

  const httpServer = http.createServer(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    res.setHeader('Location', 'https://localhost:' + httpsPort + '/path2')
    res.end()
  })

  const httpsServer = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path2')
    res.statusCode = 200
    res.end('response')
  })

  httpServer.listen(0, function () {
    httpPort = httpServer.address().port
    httpsServer.listen(0, function () {
      httpsPort = httpsServer.address().port
      get({
        url: 'http://localhost:' + httpPort + '/path1',
        rejectUnauthorized: false
      }, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
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

test('redirect to different host/port', function (t) {
  t.plan(7)

  let port1 = null
  let port2 = null

  const server1 = http.createServer(function (req, res) {
    t.equal(req.url, '/path1')
    res.statusCode = 301
    // Redirect from localhost:port1 to 127.0.0.1:port2 (different host and port!)
    res.setHeader('Location', 'http://127.0.0.1:' + port2 + '/path2')
    res.end()
  })

  const server2 = http.createServer(function (req, res) {
    t.equal(req.url, '/path2')
    // Confirm that request was made with new host and port (127.0.0.1:port2)
    t.equal(req.headers.host, `127.0.0.1:${port2}`)
    res.statusCode = 200
    res.end('response')
  })

  server1.listen(0, function () {
    port1 = server1.address().port
    server2.listen(0, function () {
      port2 = server2.address().port
      get('http://localhost:' + port1 + '/path1', function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          server1.close()
          server2.close()
        })
      })
    })
  })
})

// See https://github.com/feross/simple-get/issues/32
test('redirect should clear explicitly specified `host` header', function (t) {
  t.plan(8)

  let port1 = null
  let port2 = null

  const server1 = http.createServer(function (req, res) {
    t.equal(req.url, '/path1')
    t.equal(req.headers.host, `localhost:${port1}`)
    res.statusCode = 301
    // Redirect from localhost:port1 to 127.0.0.1:port2 (different host and port!)
    res.setHeader('Location', 'http://127.0.0.1:' + port2 + '/path2')
    res.end()
  })

  const server2 = http.createServer(function (req, res) {
    t.equal(req.url, '/path2')
    // Confirm that request was made with new host and port (127.0.0.1:port2), i.e.
    // that the explicitly specified `Host` header was cleared upon redirect.
    t.equal(req.headers.host, `127.0.0.1:${port2}`)
    res.statusCode = 200
    res.end('response')
  })

  server1.listen(0, function () {
    port1 = server1.address().port
    server2.listen(0, function () {
      port2 = server2.address().port
      get({
        url: `http://localhost:${port1}/path1`,
        // Explicitly specify a `Host` header, so it won't be set automatically
        headers: {
          host: `localhost:${port1}`
        }
      }, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          server1.close()
          server2.close()
        })
      })
    })
  })
})

test('redirect should clear explicitly specified `Host` (note uppercase) header', function (t) {
  t.plan(8)

  let port1 = null
  let port2 = null

  const server1 = http.createServer(function (req, res) {
    t.equal(req.url, '/path1')
    t.equal(req.headers.host, `localhost:${port1}`)
    res.statusCode = 301
    // Redirect from localhost:port1 to 127.0.0.1:port2 (different host and port!)
    res.setHeader('Location', 'http://127.0.0.1:' + port2 + '/path2')
    res.end()
  })

  const server2 = http.createServer(function (req, res) {
    t.equal(req.url, '/path2')
    // Confirm that request was made with new host and port (127.0.0.1:port2), i.e.
    // that the explicitly specified `Host` header was cleared upon redirect.
    t.equal(req.headers.host, `127.0.0.1:${port2}`)
    res.statusCode = 200
    res.end('response')
  })

  server1.listen(0, function () {
    port1 = server1.address().port
    server2.listen(0, function () {
      port2 = server2.address().port
      get({
        url: `http://localhost:${port1}/path1`,
        // Explicitly specify a `Host` header, so it won't be set automatically
        headers: {
          Host: `localhost:${port1}`
        }
      }, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        concat(res, function (err, data) {
          t.error(err)
          t.equal(data.toString(), 'response')
          server1.close()
          server2.close()
        })
      })
    })
  })
})
