/*
Created by Ralf Becher - ralf.becher@tiq-solutions.de - TIQ Solutions, Leipzig, Germany
Tested on QV 11.2 SR5

TIQ Solutions takes no responsibility for any code.
Use at your own risk. 
*/

// This checks if the console is present, and if not it 
// sets it to an object with a blank function called log to
// prevent any error. Remove logging for production.
if(!window.console){ window.console = {log: function(){} }; } 

(function($){
	var _extension = 'zWeatherFeed';
	var _path = 'Extensions/' + _extension + '/';
	var _pathLong = Qva.Remote + (Qva.Remote.indexOf('?') >= 0 ? '&' : '?') + 'public=only&name=' + _path;
	// detect WebView mode (QlikView Desktop)
	var _webview = window.location.host === 'qlikview';
	var _files = [];
	// create array with all need libraries
	_files.push(_path + 'js/jquery.tools.min.js');
	_files.push(_path + 'js/jquery.zweatherfeed.min.js');

	Qv.LoadExtensionScripts(_files, 
		function () {
			Qva.AddExtension(_extension, function(){
				//Load a CSS style sheet
				Qva.LoadCSS((_webview ? _path : _pathLong) + "css/" + _extension + ".css");

				var _this = this;
				var objId = this.Layout.ObjectId.replace("\\", "_");

				//get WOEIDs
				var woeids = [];
				if (this.Layout.Text0.text.toString().length > 0)
					woeids = this.Layout.Text0.text.toString().split(',');

				//get places
				var places = [];
				if (this.Layout.Text1.text.toString().length > 0)
					places = this.Layout.Text1.text.toString().split(',');

				//get unit Fahrenheit/Celsius
				var unit = this.Layout.Text2.text.toString();		

				var interval = this.Layout.Text3.text.toString() * 1;
				
				var jqXHR = [];

				//get WOEIDs for places
				if (places.length > 0) {
					woeids = [];
					$.each(places, function( index, place ) {
						// Cache results for an hour to prevent overuse
						var now = new Date();
						var query = 'select * from geo.places where text="'+ place +'"';
						var api = 'http://query.yahooapis.com/v1/public/yql?q='+ encodeURIComponent(query) +'&rnd='+ now.getFullYear() + now.getMonth() + now.getDay() + now.getHours() +'&format=json&callback=?';
																			
						//push multiple requests
						jqXHR.push($.ajax({
							type: 'GET',
							url: api,
							dataType: 'json'
						}));
					});
					
					$.when.apply($, jqXHR).always(function(){
						//nest single jqXHR
						var args=Array.prototype.slice.call(jqXHR.length === 1 ? [arguments] : arguments);
						//console.log(args);
						$.each(args, function(index, arg) {
							if (arg[1] === "success" && arg[0].query.count > 0) {
								if (arg[0].query.results.place instanceof Array) {
									woeids.push(arg[0].query.results.place[0].woeid.toString());
								} else {
									woeids.push(arg[0].query.results.place.woeid.toString());
								}
							}
						});
						renderIt(_this,objId,woeids,unit,interval);
						if (woeids.length > 0) {
							//set retrieved WOEIDs
							_this.Layout.SetProperty('Chart.Text.0.Content',woeids.toString());		
							_this.Layout.SetProperty('Chart.Text.1.Content','');		
						}
					});				
					
				} else {
					renderIt(_this,objId,woeids,unit,interval);
				}

			});
		});


	function renderIt(_this,_objId,_woeids,_unit,_interval) {
		if (_woeids.length > 0) {
			var circus = (_woeids.length > 1);
			console.log(_woeids);
			var outerDiv = $('<div />').addClass("scrollable vertical").appendTo($(_this.Element).empty());
			
			$('<div />').addClass("items").attr({
							id: _objId 
						}).appendTo(outerDiv);

			if (circus)
				$('<div />').addClass("navi").appendTo($(_this.Element));
			
			if (_interval > 0 && circus) {
				$('#'+_objId).weatherfeed(_woeids,{
						woeid: true,
						unit: _unit
					},function(e) {
					$("div.scrollable").scrollable({ 
							vertical: true,  
							size: 1,
						circular: circus
					}).navigator().autoscroll({interval: _interval});
				});
			} else {
				if (circus) {
					$('#'+_objId).weatherfeed(_woeids,{
							woeid: true,
							unit: _unit
						},function(e) {
						$("div.scrollable").scrollable({ 
								vertical: true,  
								size: 1,
							circular: circus
						}).navigator();
					});
				} else {
					$('#'+_objId).weatherfeed(_woeids,{
							woeid: true,
							unit: _unit
						});
				}
			}	
		} else {
			$(_this.Element).empty().html('<b>No WOEID or unknown place for weather request!</b>');
		}
	}
})(jQuery)
	
// helper code needed for html select element in config dialog
// remove if no select element needed
if (Qva.Mgr.mySelect == undefined) {
    Qva.Mgr.mySelect = function(owner, elem, name, prefix) {
        if (!Qva.MgrSplit(this, name, prefix)) return;
        owner.AddManager(this);
        this.Element = elem;
        this.ByValue = true;

        elem.binderid = owner.binderid;
        elem.Name = this.Name;

        elem.onchange = Qva.Mgr.mySelect.OnChange;
        elem.onclick = Qva.CancelBubble;
   }
   Qva.Mgr.mySelect.OnChange = function() {
    var binder = Qva.GetBinder(this.binderid);
    if (!binder.Enabled) return;
    if (this.selectedIndex < 0) return;
    var opt = this.options [this.selectedIndex];
    binder.Set (this.Name, 'text', opt.value, true);    
    }
    Qva.Mgr.mySelect.prototype.Paint = function(mode, node) {
        this.Touched = true;
        var element = this.Element;
        var currentValue = node.getAttribute("value");
        if (currentValue == null) currentValue = "";
        var optlen = element.options.length;
        element.disabled = mode != 'e';
        //element.value = currentValue;
        for (var ix = 0; ix < optlen; ++ix) {
             if(element.options[ix].value === currentValue){
                element.selectedIndex = ix;
             }
        }    
        element.style.display = Qva.MgrGetDisplayFromMode(this, mode);
        
   }
}