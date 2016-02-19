var currData = null;
var currOpt = null;
var showLines = true;
var displayActive = true;
var doCollisions = true;

function toggleLines() {
  showLines = !showLines;
  if (showLines) $('.nodeconn').show();
  else $('.nodeconn').hide();
}

function toggleDisplay() {
  displayActive = !displayActive;
}

function toggleCollisions() {
  doCollisions = !doCollisions;
}

function process(data, opt) {
  opt = opt || {};
  setOptionDefaults(opt);
  data.forEach(function(item, index) { item.id = index; });
  data.forEach(function(item, index) { return fixData(item, data, index); });
  data.forEach(function(item) {
    if (item.dead) {
      data.forEach(function(it) {
        it.connections = it.connections.filter(function(conn) { return conn.id != item.id }).map(function(conn) { return conn.id >= item.id ? { id: conn.id-1, strength: conn.strength } : conn });
        it.nonconnections = it.nonconnections.filter(function(conn) { return conn.id != item.id }).map(function(conn) { return conn.id >= item.id ? { id: conn.id-1, strength: conn.strength } : conn });
        if (it.id >= item.id) it.id--;
      });
    }
  });
  data = data.filter(function(item) { return !item.dead; });
  var dataSort = data.slice(0).sort(function(a,b) { return a.connections.length < b.connections.length; });

  var theta = 0;
  var radius = 0;
  var thetaInc = Math.PI*6/data.length;
  var radiusInc = Math.min(opt.width, opt.height)*0.9/2/data.length;

  var minSize = null;
  var maxSize = null;

  dataSort.forEach(function(item) {
    item.position.x = opt.width/2 + Math.cos(theta)*radius;
    item.position.y = opt.height/2 + Math.sin(theta)*radius;
    theta += thetaInc;
    radius += radiusInc;

    if (minSize == null) minSize = item.size;
    else minSize = Math.min(minSize, item.size);
    if (maxSize == null) maxSize = item.size;
    else maxSize = Math.max(maxSize, item.size);
  });

  data.forEach(function(item) {
    if (opt.bottomSizeScale) item.scaledSize = (item.size - minSize)/(maxSize - minSize);
    else item.scaledSize = item.size / maxSize;
  });
  return [data, opt];
}

function processPositions() {
  var data = currData;
  var opt = currOpt;
  var falloutLength = Math.pow(opt.across*3/4, 2);
  data.forEach(function(item) {
    var moveVector = { x: 0, y: 0 };
    item.connections.forEach(function(conn) {
      var deltaX = data[conn.id].position.x - item.position.x;
      var deltaY = data[conn.id].position.y - item.position.y;
      if (deltaX == 0 && deltaY == 0) return;
      var total = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
      deltaX /= total;
      deltaY /= total;
      var distanceScale = Math.min(1, (total - opt.attractFalloff)/opt.attractScalar);
      moveVector.x += conn.strength/item.connectionAll*deltaX*distanceScale*opt.speed;
      moveVector.y += conn.strength/item.connectionAll*deltaY*distanceScale*opt.speed;
    });
    item.nonconnections.forEach(function(conn) {
      var deltaX = data[conn.id].position.x - item.position.x;
      var deltaY = data[conn.id].position.y - item.position.y;
      if (deltaX == 0 && deltaY == 0) return;
      var total = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
      deltaX /= total;
      deltaY /= total;
      var distanceScale = Math.max(opt.minRepulsion, Math.max(0, falloutLength-Math.pow(total, 2))/falloutLength);
      moveVector.x -= conn.strength/item.nonconnectionAll*deltaX*opt.nonconnMove*distanceScale*opt.speed;
      moveVector.y -= conn.strength/item.nonconnectionAll*deltaY*opt.nonconnMove*distanceScale*opt.speed;
    });
    if (isNaN(moveVector.x) || isNaN(moveVector.y)) console.log('WE HAVE A NAN!',item);
    item.position.x += moveVector.x;
    item.position.y += moveVector.y;
    if (doCollisions) processCollisions(item);
  });
}

function processCollisions(item) {
  var data = currData;
  var opt = currOpt;
  var oldX = item.position.x;
  var oldY = item.position.y;
  data.forEach(function (item2) {
    if (item.id == item2.id) return;
    var neededDist = item.scaledSize*opt.maxRadius + item2.scaledSize*opt.maxRadius + opt.padding;
    var deltaX = item2.position.x - item.position.x;
    var deltaY = item2.position.y - item.position.y;
    if (Math.sqrt(deltaX*deltaX + deltaY*deltaY) <= neededDist) {
      var angle = Math.atan2(item2.position.y - item.position.y, item2.position.x - item.position.x);
      //console.log(deltaX,deltaY,'less than',neededDist);
      var dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY) - neededDist;

      item.position.x += Math.cos(angle)*dist;
      item.position.y += Math.sin(angle)*dist;
    }
  });
  item.position.x = Math.min(opt.width-item.scaledSize*opt.maxRadius-opt.padding, Math.max(item.scaledSize*opt.maxRadius+opt.padding, item.position.x));
  item.position.y = Math.min(opt.height-item.scaledSize*opt.maxRadius-opt.padding, Math.max(item.scaledSize*opt.maxRadius+opt.padding, item.position.y));
  if (oldX != item.position.x || oldY != item.position.y) return true;
  else return false
}

function processAllCollisions() {
  var count = 0;
  if (!currData) return;
  while (count < 100) {
    count++;
    var changed = false;
    currData.forEach(function(item) {
      if (processCollisions(item)) changed = true;
    });
    if (changed == false) break;
  }
}

function setOptionDefaults(opt) {
  var across = Math.sqrt(opt.width*opt.width + opt.height*opt.height)
  var maxRadius = 25;
  var defaults = {
    width: 1920,
    height: 1080,
    across: across,
    padding: Math.floor(across/200),
    wallPadding: Math.floor(across/200),
    sizePadding: 5,
    bottomSizeScale: false,
    moveAmount: Math.floor(across/100),
    nonconnMove: 1.0,
    minRepulsion: 0.25,
    maxRadius: maxRadius,
    attractFalloff: Math.floor(maxRadius*2),
    attractScalar: Math.floor(maxRadius/2),
    speed: maxRadius/20
  }
  for (var key in defaults) {
    if (opt[key] == undefined) opt[key] = defaults[key];
  }
}

function fixData(item, data) {
  item.name = item.name == undefined ? 'Node '+item.id : item.name;
  item.size = item.size || 0;
  item.dead = item.size <= 0;
  item.position = { x: 0, y: 0 };
  //item.connectionMin = null;
  //item.connectionMax = null;
  item.connectionAll = 0;
  //item.nonconnectionMin = null;
  //item.nonconnectionMax = null;
  item.nonconnectionAll = 0;
  //if (item.size <= 0) return false;
  item.connections = item.connections || [];
  var simpleConnections; // Without strengths, in form [3,7,4...]
  if (typeof item.connections[0] == 'number') {
    simpleConnections = item.connections;
    item.connections = item.connections.map(function(id) {
      return { id: id, strength: 1 };
    });
  } else {
    simpleConnections = item.connections.map(function(obj) { return obj.id; });
  }
  item.connections = item.connections.filter(function(it) { return it.id != item.id; });

  item.nonconnections = item.nonconnections || data.filter(function(it) {
    return simpleConnections.indexOf(it.id) == -1;
  }).map(function(item) { return item.id });
  if (typeof item.nonconnections[0] == 'number') {
    item.nonconnections = item.nonconnections.map(function(id) {
      return { id: id, strength: 1 };
    });
  }
  item.nonconnections = item.nonconnections.filter(function(it) { return it.id != item.id });

  if (!item.image && !item.color) item.color = '#'+[0,0,0,0,0,0].map(function() {
    return Math.floor(Math.random()*16).toString(16);
  });

  var minVars = ['connectionMin', 'nonconnectionMin'];
  var maxVars = ['connectionMax', 'nonconnectionMax'];
  var allVars = ['connectionAll', 'nonconnectionAll'];
  [item.connections, item.nonconnections].forEach(function(arr, ind) {
    arr.forEach(function(conn) {
      /*if (item[minVars[ind]] == null) item[minVars[ind]] = conn.strength;
      else item[minVars[ind]] = Math.min(item[minVars[ind]], conn.strength);
      if (item[maxVars[ind]] == null) item[maxVars[ind]] = conn.strength;
      else item[maxVars[ind]] = Math.max(item[maxVars[ind]], conn.strength);*/
      item[allVars[ind]] += conn.strength;
    });
  });
  

  return true;
}

function displayCanvas(newDisplay) {
  var data = currData;
  var opt = currOpt;
  if (!opt || !data) return;
  var $display = $('#display');
  if (newDisplay) {
    $display.empty();
    data.forEach(function(item) {
      var $div = $('<div class="node" id="node-'+item.id+'" data-id="'+item.id+'"><div class="name">'+(item.link?'<a href="'+item.link+'">':'')+item.name+(item.link?'</a>':'')+'</div></div>');
      var size = item.scaledSize*opt.maxRadius;
      $div.css('width', size*2+'px').css('height', size*2+'px').css('border-radius', size+'px');
      $div.css('top', item.position.y-item.scaledSize*opt.maxRadius+'px').css('left', item.position.x-item.scaledSize*opt.maxRadius+'px');
      if (item.image) $div.css('background-image', 'url("'+item.image+'")');

      $div.css('background-size', size*2+'px '+size*2+'px');
      $display.append($div);

      $div.mouseover(function() {
        if (!showLines) return;
        $('.nodeconn').hide();
        $('.conn-'+$(this).data('id')).show();
        $(this).css('z-index', 8);
      });

      $div.mouseout(function() {
        if (!showLines) return;
        $('.nodeconn').show();
        $(this).css('z-index', 3);
      });

      item.connections.forEach(function(conn) {
        if ($('#node-'+conn.id+'-'+item.id).get(0) || !$('#node-'+conn.id).get(0)) return;
        var $line = $('<div class="nodeconn conn-'+item.id+' conn-'+conn.id+'" id="node-'+item.id+'-'+conn.id+'" data-start="'+item.id+'" data-end="'+conn.id+'"></div>');
        if (!data[conn.id]) console.log(item.id + '-> '+conn.id);
        var deltaX = data[conn.id].position.x - item.position.x;
        var deltaY = data[conn.id].position.y - item.position.y;
        var rotate = Math.atan2(deltaX, -deltaY)-Math.PI/2;
        var width = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
        $line.css('width', width).css('opacity', Math.max(0.2, (opt.across/2-width)/(opt.across/2)))
             .css('top', item.position.y).css('left', item.position.x)
             .css({'-webkit-transform' : 'rotate('+ rotate +'rad)',
                 '-moz-transform' : 'rotate('+ rotate +'rad)',
                 '-ms-transform' : 'rotate('+ rotate +'rad)',
                 'transform' : 'rotate('+ rotate +'rad)'});
        $display.append($line);
      });
    });
    if (!showLines) $('.nodeconn').hide();
  } else if (displayActive) {
    data.forEach(function(item,index) {
      var $div = $('#node-'+item.id);
      $div.css('top', item.position.y-item.scaledSize*opt.maxRadius+'px').css('left', item.position.x-item.scaledSize*opt.maxRadius+'px');
    });
    if (showLines) {
      $('.nodeconn').each(function(index, nodeconn) {
        nodeconn = $(nodeconn);
        var connItem = data[nodeconn.data('end')];
        var item = data[nodeconn.data('start')];
        var deltaX = connItem.position.x - item.position.x;
        var deltaY = connItem.position.y - item.position.y;
        var rotate = Math.atan2(deltaX, -deltaY)-Math.PI/2;
        var width = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
        nodeconn.css('width', width).css('opacity', Math.max(0.2, (opt.across/2-width)/(opt.across/2)))
                .css('top', item.position.y).css('left', item.position.x)
                .css({'-webkit-transform' : 'rotate('+ rotate +'rad)',
                 '-moz-transform' : 'rotate('+ rotate +'rad)',
                 '-ms-transform' : 'rotate('+ rotate +'rad)',
                 'transform' : 'rotate('+ rotate +'rad)'});
      });
    }
  }
}

function submit() {
  var data;
  try {
    data = JSON.parse($('#json-input').val());
  } catch (err) {
    throw err;
  }
  var dataAndOpt = process(data, { width: 1000, height: 500, maxRadius: 60, speed: 10, nonconnMove: 0.8 });
  currData = dataAndOpt[0];
  currOpt = dataAndOpt[1];
  processAllCollisions();
  displayCanvas(true);
}

