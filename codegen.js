'use strict'

class Codegen {
  constructor (ast, fName = 'render') {
    this.ast = ast
    this.fName = fName
    this.code = ''
  }

  run () {
    const nType = this.ast.type

    if (nType === '#jsCode') {
      this.genJs(this.ast)
      return this.code
    }

    throw `cannot match with #jsCode: ${nType}`
  }

  genJs ({value: nodes}) {
    nodes.forEach(node => {
      const nType = node.type

      if (nType === '##jsCode') {
        this.addCode(node.value)
      }
      else {
        this.genJsx(node)
      }
    })

    return this
  }

  genJsx ({type, props, children}) {
    const isUserComp = str => /^[A-Z]/.test(str)
    type = isUserComp(type) ? type : JSON.stringify(type)

    this
      .addCode(`${this.fName}(${type}`)
      .genProps(props)

    if (children.length > 0) {
      children.forEach(node => {
        const nType = node.type

        if (nType === '#jsCode') {
          this.addCode(`, `).genJs(node)
        }
        else if (nType === '#jsxText') {
          this.addCode(`, '${node.value}'`)
        }
        else {
          this.addCode(`, `).genJsx(node)
        }
      })
    }

    this.addCode(')')
    return this
  }

  genProps (props) {
    const propNames = Object.keys(props)

    if (propNames.length > 0) {
      this.addCode(', {')

      propNames.forEach(propName => {
        this.addCode(`${propName}:`)
        const propNode = props[propName]

        if (propNode.type === '#string') {
          this.addCode(`'${propNode.value}',`)
        }
        else if (propNode.type === '#jsCode') {
          this.genJs(propNode).addCode(',')
        }
      })

      this.addCode('}')
    }
    else {
      this.addCode(', null')
    }

    return this
  }

  addCode (code) {
    this.code += code
    return this
  }
}

module.exports = Codegen
