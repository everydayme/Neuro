function generateKeyFigs(data,override){
	$('.appeal_name').html(data['#crisis+name']);
	$('#beneficiaries').append('<p class="keyfigure">'+niceFormatNumber(data['#targeted'])+'</p>');
	if(!override){
		if(data['#meta+coverage']==""){
			$('#funding').remove();
			$('#coverage').remove();
			$('#appeal_amount').append('<p class="keyfigure">'+niceFormatNumber(data['#meta+value'])+' (CHF)</p>');
		} else {
			var coverage = parseInt(data['#meta+coverage'].substring(-1))*0.01;
			createPie('#coverage',220,40,coverage,0);
			$('#funding').append('<p class="keyfigure">'+niceFormatNumber(data['#meta+funding'])+' (CHF)</p>');
			$('#appeal_amount').append('<p class="keyfigure">'+niceFormatNumber(data['#meta+value'])+' (CHF)</p>');
		}
	} else {
		var soft = 1;
		var hard = 1;

		override.forEach(function(d){
			if(d['#meta+key']=='soft plus hard funding'){soft = d['#meta+value']}
			if(d['#meta+key']=='hard funding'){hard = d['#meta+value']}
		});
		var hardcoverage = parseInt(hard)/parseInt(data['#meta+value']);
		var softcoverage = parseInt(soft)/parseInt(data['#meta+value']);
		createPie('#coverage',220,40,hardcoverage,softcoverage);
		$('#funding').append('<p class="keyfigure">'+niceFormatNumber(hard)+' (CHF)</p>');
		$('#appeal_amount').append('<p class="keyfigure">'+niceFormatNumber(data['#meta+value'])+' (CHF)</p>');	
	}
}

function generateMap(geom,ISO3){

    var baselayer = L.tileLayer('https://data.hdx.rwlabs.org/mapbox-base-tiles/{z}/{x}/{y}.png', {});
    var baselayer2 = L.tileLayer('https://data.hdx.rwlabs.org/mapbox-layer-tiles/{z}/{x}/{y}.png', {minZoom:4});

	map = L.map('map',{
				center: [0,0],
		        zoom: 2,
		        layers: [baselayer,baselayer2]
			});

	map.overlay = L.geoJson(geom,{
		onEachFeature:onEachFeature,
		style:style
    }).addTo(map);

	function style(feature) {
		var color = '#aaaaaa';
		var fillOpacity = 0;
		var weight =0
		var cls = 'country'
		if(feature.properties['ISO_A3']==ISO3){
			color = '#B71C1C';
			fillOpacity = 0.7;
			weight = 1
		};

        return {
                'color': color,
                'fillcolor': color,
                'weight': weight,
                'opacity': 0.7,
                'fillOpacity':fillOpacity,
                'className':cls
            };
    }


    function onEachFeature(feature, layer){
		if(feature.properties['ISO_A3']==ISO3){
			map.fitBounds(layer.getBounds());
			map.setZoom(map.getZoom()-2);
		}
	}   
}

function processHash(){
	var appealid = decodeURIComponent(window.location.hash).substring(1);
	var appealsurl = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&filter03=merge&clean-date-tags01=%23date&filter02=select&merge-keys03=%23meta%2Bid&filter04=replace-map&force=on&filter05=merge&merge-tags03=%23meta%2Bcoverage%2C%23meta%2Bfunding&select-query02-01=%23meta%2Bid%3D'+appealid+'&merge-keys05=%23country%2Bname&merge-tags05=%23country%2Bcode&filter01=clean&replace-map-url04=https%3A//docs.google.com/spreadsheets/d/1hTE0U3V8x18homc5KxfA7IIrv1Y9F1oulhJt0Z4z3zo/edit%3Fusp%3Dsharing&merge-url03=https%3A//docs.google.com/spreadsheets/d/1rVAE8b3uC_XIqU-eapUGLU7orIzYSUmvlPm9tI0bCbU/edit%23gid%3D0&merge-url05=https%3A//docs.google.com/spreadsheets/d/1GugpfyzridvfezFcDsl6dNlpZDqI8TQJw-Jx52obny8/edit%3Fusp%3Dsharing&url=https%3A//docs.google.com/spreadsheets/d/19pBx2NpbgcLFeWoJGdCqECT2kw9O9_WmcZ3O41Sj4hU/edit%23gid%3D0';
	var dataCall = $.ajax({ 
	    type: 'GET', 
	    url: appealsurl, 
	    dataType: 'json',
	});

	var geomCall = $.ajax({ 
	    type: 'GET', 
	    url: '/data/worldmap.json', 
	    dataType: 'json'
	});
	var url = 'https://proxy.hxlstandard.org/data.json?filter01=select&select-query01-01=%23meta%2Bid%3D'+appealid+'&url=https%3A//docs.google.com/spreadsheets/d/1rJ5gt-JaburVcfzTeNmLglEWfhTlEuoaOedTH5T7Qek/edit%3Fusp%3Dsharing&strip-headers=on';

	var plusCall = $.ajax({
		type: 'GET', 
    	url: url,
    	dataType: 'json',
	});

	getAppealDocs(appealid);

	$.when(plusCall).then(function(plusArgs){
		appealsplus(plusArgs);
	});

	$.when(plusCall,dataCall).then(function(plusArgs, dataArgs){
		var data = hxlProxyToJSON(dataArgs[0]);
		var plusdata = hxlProxyToJSON(plusArgs[0]);
		var override = false;
		var hxlurl = '';
		plusdata.forEach(function(d){
			if(d['#meta+feature']=='override'){
				hxlurl = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url='+encodeURIComponent(d['#meta+url']);
				override = true;
			}
		});
		if(override){
			$.ajax({
			    type: 'GET', 
	    		url: hxlurl,
	    		dataType: 'json',
				success: function(result){
					var overridedata = hxlProxyToJSON(result);
					generateKeyFigs(data[0],overridedata);
	    		}
    		});
		} else {
			generateKeyFigs(data[0]);
		}
		
	});

	$.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
	    var data = hxlProxyToJSON(dataArgs[0]);
	    var geom = topojson.feature(geomArgs[0],geomArgs[0].objects.geom);
	    generateMap(geom,data[0]['#country+code']);
	});
}

function appealsplus(data){
	var data = hxlProxyToJSON(data);
	data.forEach(function(d){
		if(d['#meta+feature']=='keyfigures'){
			loadKeyFigures(encodeURIComponent(d['#meta+url']));
		}
		if(d['#meta+feature']=='contacts'){
			loadContacts(encodeURIComponent(d['#meta+url']));
		}
		if(d['#meta+feature']=='links'){
			loadLinks(encodeURIComponent(d['#meta+url']));
		}
		if(d['#meta+feature']=='freetext'){
			loadFreeText(encodeURIComponent(d['#meta+url']));
		}
	});
}

function loadKeyFigures(url){
	var hxlurl = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url='+url;
	$.ajax({
		    type: 'GET', 
    		url: hxlurl,
    		dataType: 'json',
			success: function(result){
				var data = hxlProxyToJSON(result);
				var html = '<div class="col-md-12"><h3>Key Figures</h3></div>';
				data.forEach(function(d){
					html+='<div class="col-md-3"><h4 class="keyfiguretitle minheight">'+d['#meta+title']+'</h4><p class="keyfigure">'+niceFormatNumber(d['#indicator'])+'</p><p>Source: <a href="'+d['#meta+url']+'" target="_blank">'+d['#meta+source']+'</a></p></div>';
				});
				$('#keyfigures').html(html);
    		}
    });
}

function loadFreeText(url){
	var hxlurl = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url='+url;
	$.ajax({
		    type: 'GET', 
    		url: hxlurl,
    		dataType: 'json',
			success: function(result){
				var data = hxlProxyToJSON(result);
				console.log(data);
				var html = '<div class="col-md-12"><h3>Text Updates</h3></div><div class="col-md-12"><ul class="nav nav-tabs">';
				data.forEach(function(d,i){
					if(i==0){
						html+='<li class="nav active"><a id="tab'+i+'" href="" data-toggle="tab">'+d['#meta+title']+'</a></li>';
					} else {
						html+='<li class="nav"><a id="tab'+i+'" href="" data-toggle="tab">'+d['#meta+title']+'</a></li>';
					}
					
				});
				html+='</ul></div>';
				data.forEach(function(d,i){
					if(i==0){
						html+='<div id="info'+i+'" class="col-md-12 info">'+d['#meta+contents']+'</div>';
					} else {
						html+='<div id="info'+i+'" class="col-md-12 info">'+d['#meta+contents']+'</div>';
					}
				});
				$('#freetext').html(html);
				data.forEach(function(d,i){
					if(i>0){
						$('#info'+i).hide();
					}
					$('#tab'+i).on('click',function(){
						$('.info').hide();
						$('#info'+i).show();
					});
				});
    		}
    });	
}

function loadContacts(url){
	var hxlurl = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url='+url;
	$.ajax({
		    type: 'GET', 
    		url: hxlurl,
    		dataType: 'json',
			success: function(result){
				console.log(result);
				var data = hxlProxyToJSON(result);
				var html = '<div class="col-md-12"><h3>Contacts</h3></div>';
				data.forEach(function(d){
					html+='<div class="col-md-3"><h4 class="keyfiguretitle">' + d['#contact+title'] + '</h4></p>' + d['#contact+name'] + ' - <a href="mailto:'+d['#contact+email']+'">'+d['#contact+email']+'</a></p></div>';
				});
				$('#contacts').html(html);
    		}
    });
}

function loadLinks(url){
	var hxlurl = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&url='+url;
	$.ajax({
		    type: 'GET', 
    		url: hxlurl,
    		dataType: 'json',
			success: function(result){
				console.log(result);
				var data = hxlProxyToJSON(result);
				var html = '<div class="col-md-12"><h3>Links</h3></div>';
				data.forEach(function(d){
					html+='<div class="col-md-6"><a href="'+d['#meta+url']+'" target="_blank">'+d['#meta+title']+'</a><p>'+d['#meta+description']+'</p></div>';
				});
				$('#links').html(html);
    		}
    });
}

function getAppealDocs(id){
	var url = 'https://proxy.hxlstandard.org/data.json?strip-headers=on&select-query01-01=%23meta%2Bid%3D' + id + '&filter02=cut&filter01=select&cut-include-tags02=%23meta%2Bdocumentname%2C%23date%2C%23meta%2Burl&force=on&url=https%3A//docs.google.com/spreadsheets/d/1gJ4N_PYBqtwVuJ10d8zXWxQle_i84vDx5dHNBomYWdU/edit%3Fusp%3Dsharing';

	$.ajax({
		    type: 'GET', 
    		url: url,
    		dataType: 'json',
			success: function(result){
				var html = ''
				result.forEach(function(row,i){
					if(i>0 && i<9){
						if(row[0].substring(0,1)=='/'){
							row[0] = 'http://www.ifrc.org'+row[0];
						}
						html+='<div class="col-md-6 doc"><a href="'+row[0]+'" target="_blank">'+row[1]+'</a> ('+row[2]+')</div>'
					}
				});
				html = html + '<div class="col-md-6"><a href="http://www.ifrc.org/en/publications-and-reports/appeals/?ac='+id+'&at=0&c=&co=&dt=1&f=&re=&t=&ti=&zo=" target="_blank">View all docs</a></div>'
        		$("#latestdocs").append(html);
    		}
    	});
}


function createPie(id,width,inner,percent,percentsoft){
	
	var svg = d3.select(id).append("svg")
		.attr("width", width)
		.attr("height", width);

	var radius = width/2;

	var softArc = d3.svg.arc()
		.innerRadius(radius-inner)
		.outerRadius(radius)
		.startAngle(0)
		.endAngle(Math.PI*2*percentsoft);	

	var fundingArc = d3.svg.arc()
		.innerRadius(radius-inner)
		.outerRadius(radius)
		.startAngle(0)
		.endAngle(Math.PI*2*percent);

	var budgetArc = d3.svg.arc()
		.innerRadius(radius-inner)
		.outerRadius(radius)
		.startAngle(0)
		.endAngle(Math.PI*2);

	svg.append("path")
		.style("fill", "#dfdfdf")
		.attr("d", budgetArc)
		.attr("transform", "translate("+(width/2)+","+(width/2)+")");

	svg.append("path")
		.style("fill", "#E57373")
		.attr("d", softArc)
		.attr("transform", "translate("+(width/2)+","+(width/2)+")");		

	svg.append("path")
		.style("fill", "#b71c1c")
		.attr("d", fundingArc)
		.attr("transform", "translate("+(width/2)+","+(width/2)+")");
	if(percentsoft>0){
		svg.append("text")
			.attr("x",width/2)
			.attr("y",width/2-25)
			.text('Hard: '+d3.format(".0%")(percent))
			.style("text-anchor", "middle")
			.attr("class","keyfiguresmall");

		svg.append("text")
			.attr("x",width/2)
			.attr("y",width/2+5)
			.text('Soft: '+d3.format(".0%")(percentsoft-percent))
			.style("text-anchor", "middle")
			.attr("class","keyfiguresmall");

		svg.append("text")
			.attr("x",width/2)
			.attr("y",width/2+35)
			.text('Total: '+d3.format(".0%")(percentsoft))
			.style("text-anchor", "middle")
			.attr("class","keyfiguresmall");				
	} else {
		svg.append("text")
			.attr("x",width/2)
			.attr("y",width/2+10)
			.text(d3.format(".0%")(percent))
			.style("text-anchor", "middle")
			.attr("class","keyfigure");		
	}

}

function niceFormatNumber(num,round){
	if(isNaN(parseFloat(num))){
		return num;
	} else {
		if(!round){
			var format = d3.format("0,000");
			return format(parseFloat(num));
		} else {
			var output = d3.format(".4s")(parseFloat(num));
	        if(output.slice(-1)=='k'){
	            output = Math.round(output.slice(0, -1) * 1000);
	            output = d3.format("0,000")(output);
	        } else if(output.slice(-1)=='M'){
	            output = d3.format(".1f")(output.slice(0, -1))+' million';
	        } else if (output.slice(-1) == 'G') {
	            output = output.slice(0, -1) + ' billion';
	        } else {
	            output = ''+d3.format(".3s")(parseFloat(num));
	        }            
	        return output;
		}
	}
}

function hxlProxyToJSON(input,headers){
    var output = [];
    var keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                var parts = e2.split('+');
                var key = parts[0]
                if(parts.length>1){
                    var atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}


//global vars

var map = '';
processHash();
