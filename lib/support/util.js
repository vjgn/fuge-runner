/* jshint -W069 */
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

var fs = require('fs')
var split = require('split2')
var pump = require('pump')
var chalk = require('chalk')


module.exports = function () {
  var colourSelector = 0

  var isExecutableContainer = function (container) {
    var result = false

    result = (['node', 'process'].indexOf(container.type) !== -1) && container.run
    if (!result) {
      result = (['docker', 'container'].indexOf(container.type) !== -1) && container.image
    }
    return result
  }



  var selectColourWhite = function () {
    return chalk.white
  }



  var selectColour = function () {
    var colours = [chalk.hex('#FF8800'), // orange
      chalk.magentaBright,
      chalk.hex('#FF546A'), // hot pink
      chalk.green,
      chalk.yellow,
      chalk.blue,
      chalk.hex('#44FFB4'), // greeinsh
      chalk.hex('#FFB266'), // bright brown
      chalk.magenta,
      chalk.cyan,
      chalk.gray,
      chalk.hex('#DC7CFF'), // rose
      chalk.blueBright,
      chalk.white]

    var colour = colours[colourSelector]
    colourSelector++
    if (colourSelector === colours.length) {
      colourSelector = 0
    }
    return colour
  }



  var streamOutput = function (container, logPath, hidePid) {
    var colorizer = split(function (line) {
      if (container.tail) {
        if (line.charCodeAt(0) === 0x01 && line.length > 8) {
          line = line.substring(8)
        }
        if (hidePid) {
          return container.process.colour(line) + '\n'
        } else {
          return container.process.colour('[' + container.name + ' - ' + container.process.child.pid + ']: ' + line) + '\n'
        }
      }
    })

    var errorColorizer = split(function (line) {
      return chalk.hex('#FF4D47')('[' + container.name + ' - ' + container.process.child.pid + ']: ' + line) + '\n'
    })

    var logStream = fs.createWriteStream(logPath + '/' + container.name + '.log')

    pump(container.process.child.stdout, colorizer)
    colorizer.pipe(process.stdout, { end: false })
    pump(container.process.child.stdout, logStream)

    if (container.process.child.stderr) {
      pump(container.process.child.stderr, errorColorizer)
      errorColorizer.pipe(process.stdout, { end: false })
      pump(container.process.child.stderr, logStream)
    }
  }


  function tokenizeQuoted (str, quote) {
    var tokens = [].concat.apply([], str.split(quote).map(function (v, i) {
      return i % 2 ? quote + v + quote : v.split(' ')
    })).filter(Boolean)
    return tokens
  }



  function tokenizeCommand (str) {
    var toks

    if (str.indexOf('\'') !== -1) {
      toks = tokenizeQuoted(str, '\'')
    } else if (str.indexOf('"') !== -1) {
      toks = tokenizeQuoted(str, '"')
    } else {
      toks = str.split(' ')
    }

    if (toks.length === 3 && (toks[0] === 'bash' || toks[0] === 'cmd') && (toks[1] === '-c' || toks[1] === '/c')) {
      toks[2] = toks[2].replace(/["\\']/g, '')
    }
    return toks
  }



  return {
    isExecutableContainer: isExecutableContainer,
    selectColour: selectColour,
    streamOutput: streamOutput,
    tokenizeCommand: tokenizeCommand,
    selectColourWhite: selectColourWhite
  }
}

