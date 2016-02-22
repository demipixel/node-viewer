var currData = null;
var currOpt = setOptionDefaults({});
setWindowSize();
var running = false;
var activeWindowSize = true;


function inputJSON(fail, reason) {
  var str = 'Add your JSON to the textarea below. If you don\'t have any, <a target="_blank" href="http://pastebin.com/raw/Xrvy9zub">here\'s some sample JSON of my steam friends list.</a><br>';
  str += '<textarea class="form-control noresize" id="jsoninput" rows=15>'+(fail||'')+'</textarea>';
  BootstrapDialog.show({
    type: fail ? BootstrapDialog.TYPE_DANGER : BootstrapDialog.TYPE_SUCCESS,
    title: 'JSON Input'+(fail?' - '+reason:''),
    message: str,
    buttons: [{
      label: 'Enter',
      cssClass: 'btn-success',
      action: function(dialog) {
        dialog.close();
        var input = $('#jsoninput').val();
        if (!input) return;
        try {
          var data = JSON.parse(input);
          if (typeof data != 'object' || (!data[0] && !(data.opt && data.data))) { inputJSON(input, 'Invalid Format'); return; }

          if (!data[0]) {
            currOpt = data.opt;
            data = data.data;
            if (currOpt.width == 0 && currOpt.height == 0) {
              activeWindowSize = true;
              setWindowSize();
            } else activeWindowSize = false;
          }

          var dataAndOpt = process(data, currOpt || {});
          currData = dataAndOpt[0];
          currOpt = dataAndOpt[1];
          if (running) togglePlay();
          processAllCollisions(currData, currOpt);
          displayCanvas(currData, currOpt, true);
        } catch (err) {
          inputJSON(input, 'Invalid JSON');
        }
      }
    }, {
      label: 'Cancel',
      action: function(dialog) {
        dialog.close()
      }
    }],
    onshown: function(dialog) {
      var input = dialog.getModalBody().find('#jsoninput');
      input.select();
    }
  });
}

function changeOptions() {
  var sizes = [null, [500,500], [500, 1000], [1920, 1080]];
  var currentSize = sizes.map(function(item, i) { return i; }).filter(function(i) { return i != 0 && currOpt.width==sizes[i][0] && currOpt.height==sizes[i][1]; })[0];
  if (currentSize == undefined && !activeWindowSize) {
    currentSize = sizes.length;
    sizes.push([currOpt.width, currOpt.height]);
  } else if (currentSize == undefined) {
    currentSize = 0;
  }
  var optionItem = function(title, inside, smaller) {
    return '<div class="col-md-12"><div class="col-md-4"><h4>'+title+'</h4></div><div class="col-md-'+(smaller?6:8)+'">'+inside+'</div>'+(smaller?'<div class="col-md-2 sliderValue"></div>':'')+'</div>';
  }
  var str = '<br>';
  str += optionItem('Size', '<select class="form-control optionSize">'+sizes.map(function(item, i) { return '<option value='+i+' '+(i==currentSize?'selected="selected"':'')+'>'+(!item?'Expand To Window':item[0]+'x'+item[1])+'</option>' }).join('')+'</select>');
  str += optionItem('Padding', '<input class="option-slider optionPadding" data-slider-min=0 data-slider-max=50 data-slider-value='+currOpt.padding+'>', true);
  str += optionItem('Wall Padding', '<input class="option-slider optionWallPadding" data-slider-min=0 data-slider-max=100 data-slider-value='+currOpt.wallPadding+'>', true);
  str += optionItem('Scale From Zero', '<input type="checkbox" class="option-checkbox optionScaleFromZero" '+(currOpt.bottomSizeScale?'checked':'')+'>');
  str += optionItem('Non-Connection Strength', '<input class="option-slider optionNonConn" data-slider-min=0 data-slider-max=100 data-slider-value='+currOpt.nonconnMove*100+'>', true);
  str += optionItem('Min. Repulsion', '<input class="option-slider optionMinRepulsion" data-slider-min=0 data-slider-max=100 data-slider-value='+currOpt.minRepulsion*100+'>', true);
  str += optionItem('Max. Radius', '<input class="option-slider optionMaxRadius" data-slider-min=0 data-slider-max=200 data-slider-value='+currOpt.maxRadius+'>', true);
  str += optionItem('Speed', '<input class="option-slider optionSpeed" data-slider-min=1 data-slider-max=500 data-slider-scale=logarithmic data-slider-value='+currOpt.speed+'>', true);
  str += optionItem('Collisions', '<input type="checkbox" class="option-checkbox optionCollisions" '+(currOpt.doCollisions?'checked':'')+'>');
  str += Array(19).join('<br>');
  BootstrapDialog.show({
    type: BootstrapDialog.TYPE_WARNING,
    title: 'Change Options',
    message: str,
    buttons: [{
      label: 'Apply',
      cssClass: 'btn-success',
      action: function(dialog) {
        var size = $('.optionSize').val();
        if (size != 0) {
          currOpt.width = sizes[size][0];
          currOpt.height = sizes[size][1];
          activeWindowSize = false;
        } else {
          activeWindowSize = true;
          setWindowSize();
        }
        currOpt.padding = parseInt($('.optionPadding').val());
        currOpt.wallPadding = parseInt($('.optionWallPadding').val());
        currOpt.bottomSizeScale = $('.optionScaleFromZero').prop('checked');
        currOpt.nonconnMove = parseInt($('.optionNonConn').val())/100;
        currOpt.minRepulsion = parseInt($('.optionMinRepulsion').val())/100;
        currOpt.maxRadius = parseInt($('.optionMaxRadius').val());
        currOpt.speed = parseInt($('.optionSpeed').val());
        currOpt.doCollisions = $('.optionCollisions').prop('checked')

        processAllCollisions(currData, currOpt);
        displayCanvas(currData, currOpt, true);
        dialog.close();
      }
    }, {
      label: 'Cancel',
      action: function(dialog) {
        dialog.close()
      }
    }],
    onshow: function(dialog) {
      $(dialog.getModalBody().find('.option-slider')).slider({ tooltip: 'hide' });
      $(dialog.getModalBody().find('.option-slider')).on('change', function(e) {
        var value = e.value.newValue;
        $(this).parent().parent().find('.sliderValue').html('<h5>'+value+($(this).hasClass('optionNonConn') || $(this).hasClass('optionMinRepulsion')?'%':'')+'</h5>');
      });
      $(dialog.getModalBody().find('.option-slider')).each(function(index, item) {
        var $item = $(item);
        $item.parent().parent().find('.sliderValue').html('<h5>'+$item.val()+($item.hasClass('optionNonConn') || $item.hasClass('optionMinRepulsion')?'%':'')+'</h5>');
      });
    }
  });
}

function exportJSON() {
  BootstrapDialog.show({
    type: BootstrapDialog.TYPE_INFO,
    title: 'Export JSON',
    message: 'Export in order to save your options<br><br><textarea class="form-control noresize" id="jsonexport" rows="10" readonly>'+ (currData?generateJSONOutput():'') +'</textarea>',
    buttons: [{
      label: 'OK',
      action: function(dialog) {
        dialog.close()
      }
    }],
    onshown: function(dialog) {
      var sel = dialog.getModalBody().find('#jsonexport');
      sel.select();
    }
  });
}

function developers() {
  var s = '&nbsp&nbsp';
  var str = 'If you\'re a developer, you can generate your own JSON to use in the viewer! Export your data in an array with this format:<br>';
  str += '<code>';
  str += '[{<br>';
  str += s+'name: "", // Name, otherwise defaults to something like "Node 5"<br>';
  str += s+'size: 50, // Integer size, node won\'t display if this is <= 0<br>';
  str += s+'connections: [3,5,8...], // Connections to other nodes, each id points to value in array<br>';
  str += s+'connections: [{ strength: 0.5, id: 3}, ...], // Another format for connections where you can include strengths<br>';
  str += s+'nonconnnections: [4,8,3], // You can use both formats above. Default is all nodes not in "connections"<br>';
  str += s+'image: "http://...", // Image to display on node, if none if provided, color will be displayed<br>';
  str += s+'color: "#ff0033", // Color to be displayed if no image, assigned randomly if none provided<br>';
  str += s+'link: "http://www.google.com/" // Link added to name if provided<br>';
  str += '},...]<br>';
  str += '</code>'
  BootstrapDialog.show({
    size: BootstrapDialog.SIZE_WIDE,
    type: BootstrapDialog.TYPE_PRIMARY,
    title: 'Developers <3',
    message: str,
    buttons: [{
      label: 'Github',
      cssClass: 'btn-primary',
      action: function(dialog) {
        var win = window.open('https://github.com/demipixel/node-viewer', '_blank');
        win.focus();
      }
    }, {
      label: 'Sounds Good',
      action: function(dialog) {
        dialog.close()
      }
    }],
    onshown: function(dialog) {
      var input = dialog.getModalBody().find('#jsoninput');
      input.select();
    }
  });
}

function generateJSONOutput() {
  var opt = setOptionDefaults(currOpt);
  if (activeWindowSize) {
    opt.width = 0;
    opt.height = 0;
  }
  return JSON.stringify({
    opt: opt,
    data: currData.map(function(item) {
      var obj = {
        name: item.name,
        size: item.size,
        connections: item.connections,
        nonconnections: item.nonconnections
      };
      if (item.image) obj.image = item.image;
      else obj.color = item.color;
      if (item.link) obj.link = item.link;
      return obj;
    })
  }).replace(/\\n/g, '');
}

function interval() {
  if (!running) return;
  processPositions(currData, currOpt);
  displayCanvas(currData, currOpt);
}
setInterval(interval);

function togglePlay() {
  running = !running;
  $('#playButton .glyphicon').toggleClass('glyphicon-play').toggleClass('glyphicon-pause');
  $('#playButtonText').text(running ? 'Pause' : 'Play');
  $('#playButton').toggleClass('btn-success').toggleClass('btn-warning');
}

function toggleLines() {
  currOpt.showLines = !currOpt.showLines;
  if (!currOpt.showLines) $('.nodeconn').hide();
  else $('.nodeconn').show();
  $('#lineButton').text('Lines ' + (currOpt.showLines ? 'ON' : 'OFF'));
}

function setWindowSize() {
  currOpt.width = window.innerWidth - 60;
  currOpt.height = window.innerHeight - 70;
  currOpt.across = Math.sqrt(currOpt.width*currOpt.width + currOpt.height*currOpt.height);
}

$(window).resize(function() {
  if (activeWindowSize) setWindowSize();
});