'use strict'

class Parser {
  constructor (str = '') {
    this.str = `{${str}}`
    this.tokens = []
    this.nodeStack = []
    this.ast = null
  }

  run () {
    this.jsCodeMode()

    if (this.str.length > 0) {
      throw `unexpected token: ${this.str}`
    }

    return this.ast
  }

  addToNode (node) {
    const pNode = this.getLastNode()
    const pType = pNode.type

    // add to jsx prop
    if (node.type === '#prop') {
      pNode.props[node.key] = node.value
    }
    // set prop value
    else if (pType === '#prop') {
      pNode.value = node
    }
    else if (pType === '#jsCode') {
      pNode.value.push(node)
    }
    // add to jsx children
    else {
      pNode.children.push(node)
    }

    return this
  }

  finishPNode () {
    const node = this.nodeStack.pop()
    const pNode = this.getLastNode()

    if (pNode) {
      this.addToNode(node)
    } else {
      this.ast = node
    }

    return this
  }

  createPNode (node) {
    this.nodeStack.push(node)
    return this
  }

  jsCodeMode () {
    const braceStack = []

    for (let i = 0; i < this.str.length; i++) {
      if (Parser.isQuote(this.str, i)) {
        const length = Parser.getStrLen(this.str, i)
        i += length - 1
      }
      else if (Parser.isRightBrace(this.str, i)) {
        if (!Parser.isLeftBrace(braceStack.pop())) {
          throw `cannot match with leftBrace '{': ${this.str}`
        }

        if (0 === braceStack.length) {
          const jsCode = this.subTrimStr(0, i)

          if (jsCode.length > 0) {
            const node = {type: '##jsCode', value: jsCode}
            this.tokens.push(node)
            this.addToNode(node)
          }

          this.tokens.push({type: 'jsCodeEnd', value: '}'})
          this.finishPNode()
          return this.subTrimStr(i + 1)
        }
      }
      else {
        let isCodeStart

        if (Parser.isLeftBrace(this.str, i)) {
          braceStack.push('{')

          if (i === 0) {
            isCodeStart = true
            this.tokens.push({type: 'jsCodeStart', value: '{'})
            this.createPNode({type: '#jsCode', value:[]})
          }
        }

        const matched = Parser.isJsx(this.str, i)

        if (matched) {
          const length = matched[1].length
          const jsCode = isCodeStart
            //if pure jsx, remove { <
            ? this.subTrimStr(1, i + length - 1)
            : this.subTrimStr(0, i + length)

          // case: {<div...}
          if (jsCode !== '') {
            const node = {type: '##jsCode', value: jsCode}
            this.tokens.push(node)
            this.addToNode(node)
          }

          this.subTrimStr(i + length).jsxMode()
          // new round set i => 0
          i = -1
        }
        else if (isCodeStart) {
          //not pure jsx
          this.subTrimStr(1)
          i -= 1
        }

      }
    }

    throw `cannot match jsCode end: ${this.str}`
  }

  jsxMode () {
    const jsxTagStack = []
    while (true) {
      if (Parser.isJsxTagStart(this.str)) {
        this.matchJsxTag(jsxTagStack)
      }
      else if (Parser.isLeftBrace(this.str)) {
        this.jsCodeMode()
      }
      else {
        this.matchJsxText()
      }

      // check stack
      if (jsxTagStack.length === 0) {
        return this
      }
    }
  }

  matchJsxTag (jsxTagStack) {
    this.matchJsxTagStart()

    if (Parser.isJsxTagSlash(this.str)) {
      //end tag </div>
      return this
        .matchJsxTagSlash()
        .tryJsxName(
          jsxTagName => { // check tag
            if (jsxTagStack.pop() !== jsxTagName) {
              throw `cannot match jsxTag with ${jsxTagName}: ${this.str}`
            }
            this.finishPNode()
          })
        .tryJsxTagEnd()
    }

    //start or self-close tag
    this
      .tryJsxName(jsxTagName => {
        jsxTagStack.push(jsxTagName)
        this.createPNode(
          {type: jsxTagName, props: {}, children: []}
        )
      })
      .matchJsxProps()

    if (Parser.isJsxTagSlash(this.str)) {
      //self-close tag <div/>
      jsxTagStack.pop()

      this
        .matchJsxTagSlash()
        .finishPNode()
    }

    //start tag <div>
    return this.tryJsxTagEnd()
  }

  matchJsxText () {
    for (let i = 0; i < this.str.length; i++) {
      if (Parser.isQuote(this.str, i)) {
        const length = Parser.getStrLen(this.str, i)
        i += length - 1
      }
      else if (Parser.isLeftBrace(this.str, i)
        || Parser.isJsxTagStart(this.str, i)) {

        const jsxText = this.subTrimStr(0, i)
        const node = {type: '#jsxText', value: jsxText}
        this.tokens.push(node)
        this.addToNode(node)
        return this.subTrimStr(i)
      }
    }

    throw `cannot match jsxText end: ${this.str}`
  }

  matchJsxTagStart () {
    this.tokens.push({type: 'jsxTagStart', value: '<'})
    return this.subTrimStr(1)
  }

  tryJsxName (checkStack) {
    const matched = Parser.isJsxName(this.str)

    if (matched) {
      const jsxName = matched[0]
      this.tokens.push({type: 'jsxName', value: jsxName})
      //check tagName
      checkStack && checkStack(jsxName)
      return this.subTrimStr(jsxName.length)
    }

    throw `cannot match jsxName: ${this.str}`
  }

  matchJsxProps () {
    while (true) {
      try {
        this.tryJsxName(propName => {
          this.createPNode(
            {type: '#prop', key: propName, value: null}
          )
        })
      } catch (e) {
        return this
      }

      this
        .tryEqual()
        .tryJsxPropValue()
        .finishPNode()
    }
  }

  tryJsxPropValue () {
    if (Parser.isQuote(this.str)) {
      return this.matchPropString()
    }

    if (Parser.isLeftBrace(this.str)) {
      return this.jsCodeMode()
    }

    throw `cannot match jsxPropValue: ${this.str}`
  }

  matchPropString () {
    const length = Parser.getStrLen(this.str)

    if (length > 2) {
      const node = {type: '#string', value: this.subTrimStr(1, length - 2)}
      this.tokens.push(node)
      this.addToNode(node)
      return this.subTrimStr(length) //remove including quotes
    }

    throw `prop value cannot be empty: ${this.str}`
  }

  tryEqual () {
    if (Parser.isEqual(this.str)) {
      this.tokens.push({type: 'equal', value: '='})
      return this.subTrimStr(1)
    }

    throw `cannot match equal '=': ${this.str}`
  }

  matchJsxTagSlash () {
    this.tokens.push({type: 'jsxTagSlash', value: '/'})
    return this.subTrimStr(1)
  }

  tryJsxTagEnd () {
    if (Parser.isJsxTagEnd(this.str)) {
      this.tokens.push({type: 'jsxTagEnd', value: '>'})
      return this.subTrimStr(1)
    }

    throw `cannot match jsxTagEnd: ${this.str}`
  }

  getLastNode () {
    return this.nodeStack[this.nodeStack.length - 1]
  }

  subTrimStr (i, length) {
    if (length !== undefined) {
      return this.str.substr(i, length).trim()
    }

    this.str = i === undefined
      ? this.str.trim() : this.str.substr(i).trim()

    return this
  }

  static getStrLen (str, i = 0) {
    const index = str.indexOf(str[i], i + 1)

    if (index === -1) {
      throw `cannot match string quote: ${this.str}`
    }

    // including quote, at least 2
    return index - i + 1
  }

  // = => return , && || ( [
  static isJsx (str, i = 0) {
    return /^(\s*(?:return|=|=>|,|&&|\|\||\(|\[|{)[(\[\s]*)</
      .exec(str.substr(i))
  }

  static isJsxName (str) {
    return /^[A-Za-z_$][\w_$]*/.exec(str)
  }

  static isEqual (str, i = 0) {
    return str[i] === '='
  }

  static isJsxTagStart (str, i = 0) {
    return str[i] === '<'
  }

  static isJsxTagEnd (str, i = 0) {
    return str[i] === '>'
  }

  static isJsxTagSlash (str, i = 0) {
    return str[i] === '/'
  }

  static isQuote (str, i = 0) {
    return str[i] === '"' || str[i] === '\''
  }

  static isLeftBrace (str, i = 0) {
    return str[i] === '{'
  }

  static isRightBrace (str, i = 0) {
    return str[i] === '}'
  }
}

module.exports = Parser
