// Copyright (c) 2017 Gherardo Varando (gherardo.varando@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


const {
  Task
} = require('electrongui')
const path = require('path')
const {
  spawn
} = require('child_process')

class ConvertTask extends Task {
  constructor(inp, out) {
    super('Bio-Formats converter', `${path.basename(inp)} --> ${path.basename(out)}`)
    this.input = inp
    this.output = out
  }

  run(path) {
    let ch = spawn('java', ['-cp', 'bioformats_package.jar', 'loci.formats.tools.ImageConverter', this.input, this.output, '-overwrite'], {
      cwd: path
    })
    this.childProcess = ch
    ch.stdout.setEncoding('utf8')
    ch.on('error', (error) => {
      this.fail(error)
    })

    ch.stderr.on('data', (data) => {
      //this.gui.alerts.add('Bio-Formats stderr: \n ' + data, 'error')
      this.emit('error', {
        error: 'Error',
        data: data
      })
    })

    ch.stdout.on('data', (data) => {
      this.emit('message', {
        data: data
      })
    })

    ch.on('close', (code) => {
      if (code === 0) {
        this.success()
      } else if (code === 1) {
        this.fail('Bio-Formats converter failed, possible problem with Bio-Formats configuration')
      } else {
        this.cancel()
      }
    })
    super.run()
  }

  cancel() {
    if (super.cancel()) {
      if (this.childProcess instanceof ChildProcess) {
        this.childProcess.kill()
      }
      return true
    }
    return false
  }


}

module.exports = ConvertTask
