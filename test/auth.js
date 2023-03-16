import { createServer } from 'node:http'
import concat from 'simple-concat'
import test from 'tape'
import get from '../index.js'

test('basic auth', function (t) {
  t.plan(5)

  const server = createServer(function (req, res) {
    t.equal(req.headers.authorization, 'Basic Zm9vOmJhcg==')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
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

test('basic auth + host', function (t) {
  t.plan(5)

  const server = http.createServer(function (req, res) {
    t.equal(req.headers.authorization, 'Basic Zm9vOmJhcg==')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
    get({ auth: 'foo:bar', host: 'localhost', port }, function (err, res) {
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

test('basic auth + hostname', function (t) {
  t.plan(5)

  const server = http.createServer(function (req, res) {
    t.equal(req.headers.authorization, 'Basic Zm9vOmJhcg==')
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
    get({ auth: 'foo:bar', hostname: 'localhost', port }, function (err, res) {
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
