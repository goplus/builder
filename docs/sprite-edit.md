# sprite edit

## Competitive product function

![](static/ZGsTbtgrooicnSxwQg5cYcZnnpf.png)

## Functional Overview

When editing sprite, users are allowed to visualize the operation directly in the preview area.

|**Module**  |**Feature** |**Function Description**                                                                         |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| **Sprite Edit** | Sprite Edit           |  Rename Sprite<br> Control Sprite's size<br> Rotate Sprite <br> Copy Sprite<br> Sprite for default base graphics <br>Map SPX configuration files |



## Base Package

|            | **fabric.js**                 | **konva.js**                                           | **react-draggable （scratch）** |
| ---------- | ----------------------------- | ------------------------------------------------------ | ------------------------------- |
| Basic| Drag, zoom, rotate, xy axis limits | Drag, zoom, rotate, xy axis limits| Drag,xy axis limits|
| Event| object[moving，scaling，rotating，modified，selected,added,removed...] & mouse[down,move,up,over,out]|Similar to fabric.js| start,drap, stop|
| serialization     | json，svg|                                     json|×|
| graph       | Rect，Circle，Ellipse Wedge|similar to fabric.js ,**sprite**                                               |×|
| typescript |×|✔|✔|
| size      | 308KB| 150KB| 50KB|
|  concept  || `Stage` `layers` `groups` `shapes` |                                 |
| Draw cache|✔| ✔| ×|
| Share      | The blog and documentation are detailed|The official documentation is detailed, and blogs share less| official documentation is detailed|





## test
Pulls both out of the common method and renders a specified number of random color squares
 

[demo code](https://github.com/luoliwoshang/canvas-library-performance)


When loading a Sprite, you need to consider its rendering speed, dragging/rotating/scaling speed, rendering a specified number of squares, looking at its rendering time and its frames to test its operational performance

| package/test item   |100 squares/render/drag/scale/rotate|200 squares/render/drag/scale/rotate|        500 squares/render/drag/scale/rotate|
|----------------|--------------------------------------------------|--------------------------------------------------|----------------------------------------------|
| fabricjs 5.3.0 | render:3~5.8ms<br>drag:59.3~59.9fps<br>rotate58.7fps~59.9fps | render:5.8~13ms<br>drag:57.5~58.7fps<br>rotate:58.7～59.9fps | render:15.8~19ms<br>drag:37.2~48fps<br>rotate:48.0~52fps |
| konvajs  9.3.0 | render:4.7~16ms<br>drag:58.9~59.9fps<br>rotate:59.3~59.9fps  | render:19~31ms<br>drag:58.9~59.9fps<br>rotate:58.1~59.9fps   | render41～93ms<br>drag:55~59.9fps<br>rotate:55.3~59.9fps |


**Test logic**

```javascript
function render() {
  console.log(library.value)
  library.value.clear()
  const startTime = performance.now()

  for (let i = 0; i < blockNum.value; i++) {
    library.value.rect({
      top: Math.random() * 300,
      left: Math.random() * 300,
      width: 50,
      height: 50,
      fill: ` hsl(${Math.random() * 360}, 100%, 50%)` 
    }).forEach(_item_ => {
      library.value.add(_item_)
    })

  }
  library.value.draw();
  // Calculate render time after rendering
  const endTime = performance.now()
  renderTime.value = endTime - startTime
}
```

### fabric.js

```javascript
class FabricRenderer {
  fabricCanvas = null;
  constructor() {
    this.fabricCanvas = new fabric.Canvas("c")
  }
  clear() {
    this.fabricCanvas.clear()
  }
  add(..._args_) {
    this.fabricCanvas.add(..._args_)
  }
  rect({ _top_, _left_, _width_, _height_, _fill_ }) {
    return [new fabric.Rect({ top, left, width, height, fill })]
  }
  draw() {
  }
}
```

### Konvajs

1. Default options only render graphics, and configurable drag and drop function, does not include basic rotation drag and drop functions, a high degree of customization
2. For size, rotation basic functions are configured more, and Chinese documents are updated slowly，For example: 'stage.find' has been adjusted to return array but the Chinese documentation has not been updated [link](http://konvajs-doc.bluehymn.com/docs/select_and_transform/Basic_demo.html)

```javascript
class KonvaRenderer {
konvaStage = null;
konvaLayer = null;
constructor() {
const stage = new Konva.Stage({
container: "canvas",
width: 400,
height: 400
})
const layer = new Konva.Layer();
stage.add(layer);
console.log(stage)
this.konvaLayer = layer

// Bind the graph click event to configure the transform drag box logic
stage.on('click tap', function (_e_) {
  console.log(_e_.target)
  _// console.log(stage.find('Transformer'))_
  if (_e_.target === stage) {
    stage.find('Transformer').forEach(_item_=>{
      _item_.destroy()
    })
    layer.draw();
    return;
  }
  if (!_e_.target.hasName('rect')) {
    return;
  }
  var tr = new Konva.Transformer();
  layer.add(tr);
  tr.attachTo(_e_.target);
  layer.draw();
});
this.konvaStage = stage


}
clear() {
console.log(this.konvaStage)
this.konvaLayer.destroyChildren()
}
add(..._args_) {
console.log("add")
this.konvaLayer.add(..._args_)
}
rect({ _top_, _left_, _width_, _height_, _fill_ }) {
return [new Konva.Rect({ x:_top_, y:_left_, width, height, fill,name:'rect',draggable:true})]
}
draw() {
console.log("draw",this.konvaLayer, this.konvaStage)
this.konvaLayer.draw()
}
}

```



![](static/DVxkbGZJKowV6ax7y8HcSHL4nre.png)




