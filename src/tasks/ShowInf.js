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

class ShowInfTask extends Task {
    constructor(inp) {
        super('Bio-Formats ImageInfo', `${path.basename(inp)}`)
        this.input = inp
        this.info = {}
    }

    run(path) {
        let ch = spawn('java', ['-cp', 'bioformats_package.jar', 'loci.formats.tools.ImageInfo', '-nopix', '-novalid', '-no-upgrade', this.input], {
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
            if (/Series #\d+/.test(data)) {
                let si = parseInt(/\d+/.exec(data)[0])
                this.info = {}
                this.info.width = parseInt(/\d+/.exec(/Width = \d+/.exec(data)))
                this.info.height = parseInt(/\d+/.exec(/Height = \d+/.exec(data)))
                this.info.sizeZ = parseInt(/\d+/.exec(/SizeZ = \d+/.exec(data)))
                this.info.sizeT = parseInt(/\d+/.exec(/SizeT = \d+/.exec(data)))
                this.info.sizeC = parseInt(/\d+/.exec(/SizeC = \d+/.exec(data)))
                this.info.dim = [this.info.width, this.info.height, this.info.sizeZ, this.info.sizeT, this.info.sizeC]

            }
        })

        ch.on('close', (code) => {
            if (code === 0) {
                this.success()
            } else if (code === 1) {
                this.fail('Bio-Formats ImageInfo failed, possible problem with Bio-Formats configuration')
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

module.exports = ShowInfTask
