'use strict'

class Tokenizer {
  constructor (str = '') {
    this.str = `{${str}}`
    this.tokens = []
  }

  run () {
    this.jsCodeMode()

    if (this.str.length > 0) {
      throw `unexpected token: ${this.str}`
    }

    return this.tokens
  }

  jsCodeMode () {
    const braceStack = []

    for (let i = 0; i < this.str.length; i++) {
      if (Tokenizer.isQuote(this.str, i)) {
        const length = Tokenizer.getStrLen(this.str, i)
        i += length - 1
      }
      else if (Tokenizer.isRightBrace(this.str, i)) {
        if (!Tokenizer.isLeftBrace(braceStack.pop())) {
          throw `cannot match with leftBrace '{': ${this.str}`
        }

        if (0 === braceStack.length) {
          const jsCode = this.subTrimStr(0, i)

          if (jsCode.length > 0) {
            this.tokens.push({type: 'jsCode', value: jsCode})
          }

          this.tokens.push({type: 'jsCodeEnd', value: '}'})
          return this.subTrimStr(i + 1)
        }
      }
      else {
        let isCodeStart

        if (Tokenizer.isLeftBrace(this.str, i)) {
          braceStack.push('{')
          if (i === 0) {
            isCodeStart = true
            this.tokens.push({type: 'jsCodeStart', value: '{'})
          }
        }

        const matched = Tokenizer.isJsx(this.str, i)

        if (matched) {
          const length = matched[1].length
          const jsCode = isCodeStart
            //pure jsx, remove {
            ? this.subTrimStr(1, i + length)
            : this.subTrimStr(0, i + length)

          // case: {<div/>}
          if (jsCode !== '') {
            this.tokens.push({type: 'jsCode', value: jsCode})
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
      if (Tokenizer.isJsxTagStart(this.str)) {
        this.matchJsxTag(jsxTagStack)
      }
      else if (Tokenizer.isLeftBrace(this.str)) {
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

    if (Tokenizer.isJsxTagSlash(this.str)) {
      //end tag </div>
      return this
        .matchJsxTagSlash()
        .tryJsxName(
          jsxTagName => { // check tag
            if (jsxTagStack.pop() !== jsxTagName) {
              throw `cannot match jsxTag with ${jsxTagName}: ${this.str}`
            }
          })
        .tryJsxTagEnd()
    }

    //start or self-close tag
    this
      .tryJsxName(jsxTagName => {jsxTagStack.push(jsxTagName)})
      .matchJsxProps()

    if (Tokenizer.isJsxTagSlash(this.str)) {
      //self-close tag <div/>
      this.matchJsxTagSlash()
      jsxTagStack.pop()
    }

    //start tag <div>
    return this.tryJsxTagEnd()
  }

  matchJsxText () {
    for (let i = 0; i < this.str.length; i++) {
      if (Tokenizer.isQuote(this.str, i)) {
        const length = Tokenizer.getStrLen(this.str, i)
        i += length - 1
      }
      else if (Tokenizer.isLeftBrace(this.str, i)
        || Tokenizer.isJsxTagStart(this.str, i)) {
        const jsxText = this.subTrimStr(0, i)
        this.tokens.push({type: 'jsxText', value: jsxText})
        return this.subTrimStr(i)
      }
    }

    throw `cannot match jsxText end: ${this.str}`
  }

  matchString () {
    const length = Tokenizer.getStrLen(this.str)

    if (length > 2) {
      this.tokens.push({type: 'string', value: this.subTrimStr(1, length - 2)})
      //remove quotes
      return this.subTrimStr(length)
    }

    throw `prop value cannot be empty: ${this.str}`
  }

  matchJsxTagStart () {
    this.tokens.push({type: 'jsxTagStart', value: '<'})
    return this.subTrimStr(1)
  }

  tryJsxName (checkStack) {
    const matched = Tokenizer.isJsxName(this.str)

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
        this.tryJsxName()
      } catch (e) {
        return this
      }

      this
        .tryEqual()
        .tryJsxPropValue()
    }
  }

  tryEqual () {
    if (Tokenizer.isEqual(this.str)) {
      this.tokens.push({type: 'equal', value: '='})
      return this.subTrimStr(1)
    }

    throw `cannot match equal '=': ${this.str}`
  }

  tryJsxPropValue () {
    if (Tokenizer.isQuote(this.str)) {
      return this.matchString()
    }

    if (Tokenizer.isLeftBrace(this.str)) {
      return this.jsCodeMode()
    }

    throw `cannot match jsxPropValue: ${this.str}`
  }

  matchJsxTagSlash () {
    this.tokens.push({type: 'jsxTagSlash', value: '/'})
    return this.subTrimStr(1)
  }

  tryJsxTagEnd () {
    if (Tokenizer.isJsxTagEnd(this.str)) {
      this.tokens.push({type: 'jsxTagEnd', value: '>'})
      return this.subTrimStr(1)
    }

    throw `cannot match jsxTagEnd: ${this.str}`
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

module.exports = Tokenizer
