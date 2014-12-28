var concat = require('concat-stream')
var http = require('http')
var portfinder = require('portfinder')
var get = require('../')
var str = require('string-to-stream')
var test = require('tape')
var zlib = require('zlib')

test('simple get', function (t) {
  t.plan(4)

  var server = http.createServer(function (req, res) {
    t.equal(req.url, '/path')
    res.statusCode = 200
    res.end('response')
  })

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      get('http://localhost:' + port + '/path', function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        res.pipe(concat(function (data) {
          t.equal(data.toString(), 'response')
          server.close()
        }))
      })
    })
  })
})

test('follow redirects (up to 10)', function (t) {
  t.plan(13)

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

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      get('http://localhost:' + port + '/1', function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200)
        res.pipe(concat(function (data) {
          t.equal(data.toString(), 'response')
          server.close()
        }))
      })
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

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      get('http://localhost:' + port + '/1', function (err) {
        t.ok(err instanceof Error, 'got error')
        server.close()
      })
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

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
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
})

test('gzip response', function (t) {
  t.plan(3)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-encoding', 'gzip')
    str('response').pipe(zlib.createGzip()).pipe(res)
  })

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      get('http://localhost:' + port, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200) // statusCode still works on gunzip stream
        res.pipe(concat(function (data) {
          t.equal(data.toString(), 'response')
          server.close()
        }))
      })
    })
  })
})

test('deflate response', function (t) {
  t.plan(3)

  var server = http.createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-encoding', 'deflate')
    str('response').pipe(zlib.createDeflate()).pipe(res)
  })

  portfinder.getPort(function (err, port) {
    if (err) throw err
    server.listen(port, function () {
      get('http://localhost:' + port, function (err, res) {
        t.error(err)
        t.equal(res.statusCode, 200) // statusCode still works on inflate stream
        res.pipe(concat(function (data) {
          t.equal(data.toString(), 'response')
          server.close()
        }))
      })
    })
  })
})
