import { createServer } from 'node:http'
import test from 'tape'
import get from '../index.js'

test('access `req` object', function (t) {
  t.plan(2)

  const server = createServer(function (req, res) {
    res.statusCode = 200
    res.end('response')
  })

  server.listen(0, function () {
    const port = server.address().port
    const req = get('http://localhost:' + port, function (err, res) {
      t.error(err)
      res.resume() // discard data
      server.close()
    })

    req.on('socket', function () {
      t.pass('got `socket` event')
    })
  })
})
