import { createServer } from 'node:http'
import concat from 'simple-concat'
import selfSignedHttps from 'self-signed-https'
import test from 'tape'
import get from '../index.js'

const { head } = get

test('simple get', function (t) {
  t.plan(5)

  const server = createServer(function (req, res) {
    t.equal(req.url, '/path')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
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

test('https', function (t) {
  t.plan(5)

  const server = selfSignedHttps(function (req, res) {
    t.equal(req.url, '/path')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
    get({
      url: 'https://localhost:' + port + '/path',
      rejectUnauthorized: false
    }, function (err, res) {
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

test('simple get json', function (t) {
  t.plan(6)

  const server = createServer(function (req, res) {
    t.equal(req.url, '/path')
    t.equal(req.headers.accept, 'application/json')
    res.statusCode = 200
    res.end('{"message":"response"}')
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
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

test('HEAD request', function (t) {
  t.plan(3)

  const server = createServer(function (req, res) {
    t.equal(req.method, 'HEAD')
    // Taken from real-world response from HEAD request to GitHub.com
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('content-encoding', 'gzip')
    res.setHeader('connection', 'close')
    res.statusCode = 200
    req.pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      method: 'HEAD',
      url: 'http://localhost:' + port
    }
    head(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      server.close()
    })
  })
})

test('timeout option', function (t) {
  t.plan(2)

  const server = createServer(function (req, res) {
    t.equal(req.url, '/path')
    setTimeout(function () {
      // response should not be sent - should timeout before it's sent
      res.end('response')
    }, 2000)
  })

  server.listen(0, function () {
    const port = server.address().port
    get({
      url: 'http://localhost:' + port + '/path',
      timeout: 1000
    }, function (err, res) {
      t.ok(err instanceof Error)
      server.close()
    })
  })
})

test('rewrite POST redirects to GET', function (t) {
  t.plan(8)

  let redirected = false

  const server = createServer(function (req, res) {
    if (redirected) {
      t.equal(req.url, '/getthis')
      t.equal(req.method, 'GET')
      t.notOk(req.headers['content-length'])
      res.statusCode = 200
      req.pipe(res)
    } else {
      t.equal(req.method, 'POST')
      redirected = true
      res.statusCode = 301
      res.setHeader('Location', '/getthis')
      res.end()
    }
  })

  server.listen(0, function () {
    const port = server.address().port
    const opts = {
      method: 'POST',
      body: '123',
      url: 'http://localhost:' + port
    }
    get(opts, function (err, res) {
      t.error(err)
      t.equal(res.statusCode, 200)
      concat(res, function (err, data) {
        t.error(err)
        t.equal(data.toString(), '')
        server.close()
      })
    })
  })
})
