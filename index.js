'use strict'
const Parser = require('./parser')
const Codegen = require('./codegen')

function compile (str, fName) {
  const ast = new Parser(str).run()
  const code = new Codegen(ast, fName).run()

  return code
}

module.exports = compile
