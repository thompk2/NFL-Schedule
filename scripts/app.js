var teamR = 20,
    _scheduleData,
    _stadiumsObject = {},
    weekSchedule,
    week = 0,
    highlightTeam;

var margin = {top: 80, right: 180, bottom: 80, left: 180},
    width = 1400 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

var force = d3.layout.force()
    .gravity(0.018)
    .charge(-250)
    .friction(.6)
    .size([width, height])
    .on("tick", tick);

var projection = d3.geo.albers()
    .translate([width / 2, height / 2])
    .scale(1080);

var path = d3.geo.path()
    .projection(projection);

var voronoi = d3.geom.voronoi()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .clipExtent([[0, 0], [width, height]]);

var svg = d3.select(".svg").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("mousedown", function(d) {
        d3.selectAll(".team").classed("diminish", false);
        highlightTeam = null;
    })

var teams = svg.selectAll(".team");

queue()
    .defer(d3.json, "scripts/us.json")
    .defer(d3.json, "scripts/sched.json")
    .defer(d3.json, "scripts/stadiums.json")
    .await(ready);

function ready(error, us, scheduleData, stadiumsData) {
    stadiumsData.forEach(function(d) {
        d[0] = +d.longitude;
        d[1] = +d.latitude;
        var pos = projection(d);
        d.x = pos[0];
        d.y = pos[1];
    });
    
    for (var i=0; i<stadiumsData.length; i++){
        _stadiumsObject[stadiumsData[i].team] = stadiumsData[i];
    }

    svg.append("path")
        .datum(topojson.feature(us, us.objects.land))
        .attr("class", "states")
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "state-borders")
        .attr("d", path);

    
    var stadiums = svg.selectAll(".stadium")
        .data(stadiumsData)
        .enter().append("circle")
        .attr("class", "stadium")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("r", 5)
        .style("fill-opacity", 0.5);
    _scheduleData = scheduleData;
    
    update(0);
};

function update(week) {
    weekSchedule = _scheduleData[week].teams;
    weekSchedule.forEach(function(d) {
        var teamDot = d3.select("." + d.team)
        if(teamDot.empty()) {
            d.x = _stadiumsObject[d.team].x;
            d.y = _stadiumsObject[d.team].y;
        } else {
            var matcher = teamDot.attr("transform").match(/translate\((-?\d+?\.\d+?),(-?\d+?\.\d+?)\)/);
            if(matcher.length === 3) {
                d.x = d.px = +matcher[1];
                d.y = d.py = +matcher[2];
            }
        }
    });
    
    teams = teams.data(weekSchedule, function(d) {
        return d.team;
    });
    
    force.nodes(weekSchedule);

    var teamEnter = teams.enter().append("g")
        .attr("class", function(d) {
            return d.team;
        })
        .classed("team", true)
        .on("mousedown", function(d) {
            highlightTeam = d;
            teams.classed("diminish", function(d1) {
                if(d1 == d || d1.team == d.opponent){
                    return false;   
                }
                return true;
            });
            d3.event.stopPropagation();
        })
        .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });


    teamEnter.append("svg:image")
        .attr("xlink:href", function(d) { return 'styles/img/' + d.team + '.png'})
        .attr("width", 45)
        .attr("height", 35)

        
    teams.each(function(d) {
        if(!highlightTeam) return;
        if(d.team === highlightTeam.team){
            highlightTeam = d;
        }
    });
    
    teams.classed("bye", function(d) {
        return d.opponent === "BYE";
    }).classed("diminish", function(d) {
        if(!highlightTeam) return false;
        if(d == highlightTeam || d.team == highlightTeam.opponent){
            return false;
        }
        return true;
    })
    
    teams.exit().remove();
    force.start();
};

$(".next-week").click(function(e) {
    if($(this).hasClass("disabled")) {
        return;
    }
    if(week >= 14){
        $(this).addClass("disabled");
    }
    $(".previous-week").removeClass("disabled");
    week = week+1;
    $(".week-header").text("Week " + parseFloat(week+1));
    update(week);
});

$(".previous-week").click(function(e) {
    if($(this).hasClass("disabled")) {
        return;
    }
    if(week <= 1){
        $(this).addClass("disabled");
    }
    $(".next-week").removeClass("disabled");
    week = week-1;
    $(".week-header").text("Week " + parseFloat(week+1));
    update(week);
});

function tick(e) {
    var k = .25 * e.alpha;

    // Push teams toward their stadium.
    weekSchedule.forEach(function(d, i) {
        d.x += (_stadiumsObject[d.stadium].x - d.x) * k;
        d.y += (_stadiumsObject[d.stadium].y - d.y) * k;
    });

    teams.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
};

