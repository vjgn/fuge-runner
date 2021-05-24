/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict'

var _ = require('lodash')
var Docker = require('dockerode')
var parseUrl = require('parse-url')
var util = require('./util')()


/**
 * docker container runner for fuge
 */
module.exports = function () {
  var docker = null

  function connectToEngine (url) {
    var docker = null

    if (url && url.length > 0) {
      var connect = parseUrl(url)

      if (connect.protocol === 'file') {
        docker = new Docker({socketPath: connect.pathname})
      } else if (connect.protocol === 'http') {
        docker = new Docker({protocol: connect.protocol, host: connect.resource, port: connect.port})
      }
    } else {
      docker = new Docker()
    }

    return docker
  }



  function start (system, mode, container, exitCb, cb) {
    var child = {}

    if (!system.global.run_containers) {
      console.log('containers disabled, skipping: ' + container.name)
      return cb(null)
    }

    if (docker === null) {
      docker = connectToEngine(system.global.container_engine_url)
    }

    var ep = {}
    var pb = {}
    Object.keys(container.ports).forEach(function (key) {
      ep[container.ports[key][1] + '/tcp'] = {}
      if (container.ports[key][1]) {
        // pb[container.ports[key][1] + '/tcp'] = [{HostIp: container.host, HostPort: container.ports[key][0]}]
        pb[container.ports[key][1] + '/tcp'] = [{HostPort: container.ports[key][0]}]
      } else {
        // pb[container.ports[key][0] + '/tcp'] = [{HostIp: container.host, HostPort: container.ports[key][0]}]
        pb[container.ports[key][0] + '/tcp'] = [{HostPort: container.ports[key][0]}]
      }
    })

    var createOpts = {Image: container.image,
      Tty: false,
      HostConfig: {
        PortBindings: pb
      },
      ExposedPorts: ep,
      Env: Object.entries(container.environment).map(([key, value]) => `${key}=${value}`)
    }

    if (container.log_driver) {
      createOpts.HostConfig.LogConfig = {
        Type: container.log_driver
      }

      if (container.log_config) {
        createOpts.HostConfig.LogConfig.Config = container.log_config
      }
    }

    if (container.dns) {
      createOpts.HostConfig.dns = container.dns
    }
    if (container.dns_search) {
      createOpts.HostConfig.DnsSearch = container.dns_search
    }
    if (container.dns_options) {
      createOpts.HostConfig.DnsOptions = container.dns_options
    }

    if (mode === 'preview') {
      child.detail = { cmd: JSON.stringify(createOpts, null, 2),
        environment: container.environment,
        cwd: '' }
      return cb(null, child)
    }

    docker.createContainer(createOpts, function (err, c) {
      if (err) { return cb(err) }

      c.attach({stream: true, stdout: true}, function (err, so) {
        if (err) { return cb(err) }

        c.attach({stream: true, stderr: true}, function (err, se) {
          if (err) { return cb(err) }

          c.start({}, function (err, data) {
            if (err) { return cb(err) }

            child.pid = c.id
            child.stdout = so
            child.stderr = se
            cb(null, child)

            c.wait(function () {
              exitCb(null, container, child, 0)
            })
          })
        })
      })
    })
  }



  function stop (container, pid, cb) {
    var c = docker.getContainer(pid)
    if (c) {
      c.stop({}, function (err) {
        cb(err)
      })
    } else {
      cb(null)
    }
  }



  function pull (system, container, cb) {
    var outputColour = util.selectColourWhite()
    var c
    var process

    if (container.local_image === true) {
      console.log(`skipping local container for ${container.name}`.blue)
      return cb(null)
    }

    c = _.cloneDeep(container)
    if (c.image.indexOf(':') === -1) {
      c.image = c.image + ':latest'
    }
    c.run = 'docker pull ' + c.image
    c.name = c.name + '_pull'
    if (docker === null) {
      docker = connectToEngine(system.global.container_engine_url)
    }

    var authConfig = {}
    if (c.registry_key) {
      authConfig = { authconfig: { key: c.registry_key } }
    }

    docker.pull(c.image, authConfig, function (err, stream) {
      if (err) {
        console.log('pull error', err)
        return cb(err)
      }

      docker.modem.followProgress(stream, function (err, output) {
        if (err) {
          console.log(c.name + ' error: ' + err)
        }
        cb(err)
      }, function () {})

      process = {identifier: c.name,
        running: true,
        exitCode: null,
        colour: outputColour,
        child: {pid: c.image,
          stdout: stream,
          stderr: null},
        startTime: Date.now(),
        monitor: false,
        tail: c.tail}

      util.streamOutput({process: process, name: c.name, tail: c.tail}, system.global.log_path)
    })
  }



  return {
    start: start,
    stop: stop,
    pull: pull
  }
}

