import { createGzip, createDeflate } from 'node:zlib'
import { createServer } from 'node:http'
import concat from 'simple-concat'
import str from 'string-to-stream'
import test from 'tape'
import get from '../index.js'

test('custom headers', function (t) {
  t.plan(2)

  const server = createServer(function (req, res) {
    t.equal(req.headers['custom-header'], 'custom-value')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
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

  const server = createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-encoding', 'gzip')
    str('response').pipe(createGzip()).pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
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

  const server = createServer(function (req, res) {
    res.statusCode = 200
    res.setHeader('content-encoding', 'deflate')
    str('response').pipe(createDeflate()).pipe(res)
  })

  server.listen(0, function () {
    const port = server.address().port
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
