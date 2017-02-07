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



/*
 * replace this with direct api access rather than using cmd line 
 * this won't currently support windows so needs to be replaced 
 * then 100% coverage
 *
 */

'use strict'

var test = require('tap').test
var githubParser = require('parse-github-url')
var proxyquire = require('proxyquire')

var spawnProxy = {
  child_process: {
    spawn: function () {
    }
  }
}


test('invalid github url', function (t) {
  var url = 'invalidRepo'
  var gitPuller = require('../lib/support/clone.js')()

  gitPuller.generate(url, function (err, value) {
    t.notEqual(err, undefined)
    t.end()
  })
})


test('github user/repo transformed to https format', function (t) {
  var url = 'senecajs/seneca'

  spawnProxy.child_process.spawn = function (bash, params, options) {
    var paramsArray = params[1].split(' ')
    var githubUrl = paramsArray[paramsArray.length - 1]
    var github = githubParser(githubUrl)

    t.equal(url, github.repo)
    t.equal(githubUrl, 'https://github.com/' + url + '.git')


    var unref = function () {}
    var on = function () {}
    return {
      unref: unref,
      on: on
    }
  }

  var gitPuller = proxyquire('../lib/gitPuller.js', spawnProxy)()
  gitPuller.generate(url, function (err, value) {
    t.notOk(err)
    t.end()
  })
})

test('github full repo url - git protocol', function (t) {
  var url = 'git@github.com:apparatus/fuge.git'

  spawnProxy.child_process.spawn = function (bash, params, options) {
    var paramsArray = params[1].split(' ')
    var githubUrl = paramsArray[paramsArray.length - 1]

    t.equal(url, githubUrl)


    var unref = function () {}
    var on = function () {}
    return {
      unref: unref,
      on: on
    }
  }

  var gitPuller = proxyquire('../lib/gitPuller.js', spawnProxy)()
  gitPuller.generate(url, function (err, value) {
    t.notOk(err)
    t.end()
  })
})



test('github full repo url - https', function (t) {
  var url = 'https://github.com/apparatus/fuge.git'

  spawnProxy.child_process.spawn = function (bash, params, options) {
    var paramsArray = params[1].split(' ')
    var githubUrl = paramsArray[paramsArray.length - 1]

    t.equal(url, githubUrl)


    var unref = function () {}
    var on = function () {}
    return {
      unref: unref,
      on: on
    }
  }

  var gitPuller = proxyquire('../lib/gitPuller.js', spawnProxy)()
  gitPuller.generate(url, function (err, value) {
    t.notOk(err)
    t.end()
  })
})
