# jsx-compiler
A super naive react-like JSX compiler, which takes as input a pure JSX string and generates pure JS code.

## usage:

```bash
git clone ...
yarn run example
```

## example:

```jsx
( 
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
)
```

#### JSX code is parsed to AST tree: 

```javascript
{
  "type": "#jsCode",
  "value": [{
    "type": "##jsCode",
    "value": "("
  }, {
    "type": "div",
    "props": {
      "id": {
        "type": "#jsCode",
        "value": [{
          "type": "##jsCode",
          "value": "() => ("
        }, {
          "type": "div",
          "props": {
            "id2": {
              "type": "#string",
              "value": "2"
            }
          },
          "children": []
        }, {
          "type": "##jsCode",
          "value": ")"
        }]
      }
    },
    "children": [{
      "type": "#jsxText",
      "value": "xx"
    }, {
      "type": "div",
      "props": {
        "id": {
          "type": "#string",
          "value": "a"
        }
      },
      "children": []
    }, {
      "type": "#jsCode",
      "value": [{
        "type": "##jsCode",
        "value": "[1,2,3,4].map(function(el){\n        el = ["
      }, {
        "type": "span",
        "props": {},
        "children": []
      }, {
        "type": "##jsCode",
        "value": ","
      }, {
        "type": "div",
        "props": {},
        "children": []
      }, {
        "type": "##jsCode",
        "value": "] \n        return ("
      }, {
        "type": "div",
        "props": {
          "ref": {
            "type": "#string",
            "value": "3"
          }
        },
        "children": [{
          "type": "#jsCode",
          "value": [{
            "type": "User",
            "props": {
              "idd": {
                "type": "#jsCode",
                "value": [{
                  "type": "##jsCode",
                  "value": "\"hah\""
                }]
              }
            },
            "children": []
          }]
        }]
      }, {
        "type": "##jsCode",
        "value": ")\n      })"
      }]
    }, {
      "type": "#jsxText",
      "value": "yy"
    }]
  }, {
    "type": "##jsCode",
    "value": ")"
  }]
}
```

#### generate pure JS code:

```javascript
(
  render(
    'div',
    {id:() => (render('div', {id2:'2',})),},
    'xx',
    render('div', {id:'a',}),
    [1,2,3,4].map(function(el){
      el = [render('span', null),render('div', null)]
      return (render(
        'div',
        {ref:'3',},
        render(User, {idd:"hah",})
      ))
    }),
    'yy'
  )
)
```
