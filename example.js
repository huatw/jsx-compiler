'use strict'

const testString = `(
  <div id = { () => (<div id2="2"/>) }>
    xx
    <div id="a"/>
    {
      [1,2,3,4].map(function(el){
        el = [<span/>, <div/>]
        return (
          <div ref="3" >
            { <User idd={"hah"} /> }
          </div>
        )
      })
    }
    yy
   </div>
)`

// /** tokenize ------------------- */
const Tokenizer = require('./tokenizer')

const tokens = new Tokenizer(testString).run()
console.log(tokens)

// /** parse AST ------------------- */
const Parser = require('./parser')

const ast = new Parser(testString).run()
console.log(JSON.stringify(ast))

// generate code --------------
const compile = require('./index')

const code = compile(testString, 'render')
console.log(code)
