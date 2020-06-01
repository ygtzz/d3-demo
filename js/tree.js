// var width = 500,
//     height = 500;
var width = 960,
    height = 700;
var gRoot;
var duration = 3000;
var arrowWidth = 20;

//定义对角线生成器diagonal
var diagonal = d3.svg.diagonal().projection(function(d) {
        return [d.y, d.x]
    });

//TODO 拖曳和缩放
var drag = initDrag();
var zoomListener = initZoom();

//定义svg
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(40,0)")
    //TODO zoom 不生效
    // .call(zoomListener);

var defs = svg.append("defs");
var arrowMarker = defs.append("marker")
                        .attr("id","arrow")
                        .attr("markerUnits","strokeWidth")
                        .attr("markerWidth","12")
                        .attr("markerHeight","12")
                        .attr("viewBox","0 0 12 12") 
                        .attr("refX","6")
                        .attr("refY","6")
                        .attr("orient","auto");
var arrow_path = "M2,2 L10,6 L2,10 L6,6 L2,2";      
arrowMarker.append("path").attr("d",arrow_path)

//定义数据转换函数
var tree = d3.layout.tree().size([height,width - 200])

renderTree();

function renderTree() {
    //读取json文件，进行绘图
    d3.json("city.json", function(erro, root) {
        // console.log(root);
        gRoot = root;
        update(root);
    })
}

function update(root) {
    var nodes = tree.nodes(root);
    var links = tree.links(nodes);

    //svg 按照绘制顺序决定上下层次，先绘制的在下层，所以先绘制线条，使得node盖住线条
    drawLinks(links);
    drawNodes(nodes);
}

function updateLine() {
    svg.selectAll(".link").attr('d', diagonal);
}

function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } 
    else {
        d.children = d._children;
        d._children = null;
    }

    update(gRoot); // 重新渲染
}

//TODO 树枝展开效果
function drawLinks(links) {
    //画线
    var line = svg.selectAll(".link")
        .data(links, d => d.target.name);

    var lineEnter = line.enter()
        .insert("path",'g')
        .attr("class", "link")
        .attr("d", diagonal)
        .style('stroke',function(d){
            console.log('d.name',d);
            return d.source && d.source.name.length > 2 ? '#a94442' : '#ccc'
        })
        .attr("marker-end","url(#arrow)");

    var linkUpdate = line.transition().duration(duration).attr('d', diagonal);

    var lineExit = line.exit().transition().duration(duration).attr("d", function(d) {
        let src = d3.select(d3.event.currentTarget).data()[0];

        return diagonal({
            source: src,
            target: src
        });
    }).remove();
}

function drawNodes(nodes) {
    console.log(nodes);
    //画点
    var node = svg.selectAll(".node")
        .data(nodes, function(d) {
            d.y += arrowWidth;
            return d.name
        })

    var nodeUpdate = node.transition().duration(duration).attr("transform", function(d) {
        return "translate(" + d.y + "," + d.x + ")"
    })

    //移除多余
    var nodeExit = node.exit();
    nodeExit.selectAll('text').remove();
    nodeExit.transition().duration(duration).attr("transform", function(d) {
        let data = d3.select(d3.event.currentTarget).data();

        return "translate(" + data[0].y + "," + data[0].x + ")"
    }).remove();

    var nodeEnter = node.enter()
        .append("g")
        .attr("class", "node")
        .on('click', click)
        .attr("transform", function(d) {
            let {parent:p} = d;
            let {x,y} = d;
            if(p){
                x = p.x;
                y = p.y;
            }
            return "translate(" + y + "," + x + ")"
        })
        
    nodeEnter.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")"
        })
        // .call(drag)

    //加圈圈
    nodeEnter.append("circle").attr("r", 10);

    //加文字
    nodeEnter.append("text")
        .attr("dx", function(d) {
            return d.children ? -8 : 8;
        })
        .attr("dy", 3)
        .style("text-anchor", function(d) {
            return d.children ? "end" : "start"
        })
        .text(function(d) {
            return d.name
        })
}

function initDrag(){
    var drag = d3.behavior.drag();
    var offsetX = 40;

    drag.origin((d, i) => {
        let { pageX, pageY } = d3.event;
        d.x = pageY;
        d.y = pageX;
        return {
            x: d.x - offsetX,
            y: d.y
        }
    })
    .on('drag', function(d) {
        let { dx, dy } = d3.event;
        d.x += dy;
        d.y += dx;

        //TODO 拖动时候，link不能与圆圈同步
        var node = d3.select(this).attr("transform", "translate(" + (d.y - offsetX) + "," + d.x + ")");

        updateLine();
    })
    .on('dragend', function(d) {
        //修正拖动后link与圆圈错位问题，临时解决方案
        d.y -= offsetX;
        updateLine();
    })

    return drag;
}

function initZoom(){
    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 10]).on("zoom", zoom);

    return zoomListener
}

function zoom() {
    // console.log(svg);
    svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
}