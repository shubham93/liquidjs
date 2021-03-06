const Liquid = require('..')
const Promise = require('any-promise')
const lexical = Liquid.lexical
const assert = require('../src/util/assert.js')

/*
 * blockMode:
 * * "store": store rendered html into blocks
 * * "output": output rendered html
 */

module.exports = function (liquid) {
  liquid.registerTag('layout', {
    parse: function (token, remainTokens) {
      var match = lexical.value.exec(token.args)
      assert(match, `illegal token ${token.raw}`)

      this.layout = match[0]
      this.tpls = liquid.parser.parse(remainTokens)
    },
    render: function (scope, hash) {
      var layout = scope.opts.dynamicPartials ? Liquid.evalValue(this.layout, scope) : this.layout

      // render the remaining tokens immediately
      scope.opts.blockMode = 'store'
      return liquid.renderer.renderTemplates(this.tpls, scope)
        .then(html => {
          if (scope.opts.blocks[''] === undefined) {
            scope.opts.blocks[''] = html
          }
          return liquid.getTemplate(layout, scope.opts.root)
        })
        .then(templates => {
          // push the hash
          scope.push(hash)
          scope.opts.blockMode = 'output'
          return liquid.renderer.renderTemplates(templates, scope)
        })
        // pop the hash
        .then(partial => {
          scope.pop()
          return partial
        })
    }
  })

  liquid.registerTag('block', {
    parse: function (token, remainTokens) {
      var match = /\w+/.exec(token.args)
      this.block = match ? match[0] : ''

      this.tpls = []
      var stream = liquid.parser.parseStream(remainTokens)
        .on('tag:endblock', () => stream.stop())
        .on('template', tpl => this.tpls.push(tpl))
        .on('end', () => {
          throw new Error(`tag ${token.raw} not closed`)
        })
      stream.start()
    },
    render: function (scope) {
      return Promise.resolve(scope.opts.blocks[this.block])
        .then(html => html === undefined
          // render default block
          ? liquid.renderer.renderTemplates(this.tpls, scope)
          // use child-defined block
          : html)
        .then(html => {
          if (scope.opts.blockMode === 'store') {
            scope.opts.blocks[this.block] = html
            return ''
          }
          return html
        })
    }
  })
}
