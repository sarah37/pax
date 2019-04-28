function mouseoverCountry(that, d) {
	// console.log(d, that)
	var polygon = d3.select(that);

	polygon.classed("hover", true).moveToFront();

	// add tooltip with country name
	var tooltip = d3
		.select("#tooltipMap")
		.attr(
			"transform",
			"translate(" +
				d3.zoomTransform(svg.node()).apply(projection(d3.geoCentroid(d))) +
				")"
		);
	tooltip.select(".tooltipText").text(d.properties.name);

	// select all glyph containers
	var dots_con = d3.select("#dots" + d.id).selectAll(".glyphContainer");

	// grow circles and change colour
	dots_con
		.selectAll("circle")
		.transition()
		.duration(200)
		.attr("r", rCircle * 2)
		.style("fill", "#888");

	// grow flower petals
	dots_con
		.selectAll("path")
		.data(d => petalData(d))
		.enter()
		.append("path")
		.classed("petal", true)
		.attr("d", arc_mini)
		.style("fill", d => d.colour)
		.transition()
		.duration(200)
		.attr("d", arc);
}

function mouseoutCountry(that, d) {
	d3.select(that).classed("hover", false);

	// hide tooltip
	d3.select("#tooltipMap").attr("transform", "translate(-100, -100)");

	// shrink dots again
	d3.select("#dots" + d.id)
		.selectAll("circle")
		.transition()
		.duration(200)
		.attr("r", rCircle)
		.style("fill", null);

	// delete petals again
	d3.select("#dots" + d.id)
		.selectAll(".petal")
		.remove();
}

function clickCountry(con, data, world) {
	// white 70% opaque rectangle to cover entire map
	var bgRect = d3.select("#popG").append("g");
	bgRect
		.append("rect")
		.attr("height", h_map)
		.attr("width", w_map)
		.attr("id", "bgRect")
		.on("mouseover", function() {
			d3.select("#closeButton").classed("hover", true);
		})
		.on("mouseout", function() {
			d3.select("#closeButton").classed("hover", false);
		})
		.on("click", function() {
			d3.select("#popG")
				.selectAll("*")
				.remove();
		});
	// (X) button to close
	bgRect
		.append("circle")
		.attr("id", "closeButton")
		.attr("cx", w_map - 40)
		.attr("cy", 40)
		.attr("r", 30);

	bgRect
		.selectAll("line")
		.data([[[0, 30], [0, 30]], [[0, 30], [30, 0]]])
		.enter()
		.append("line")
		.classed("closeButtonLines", true)
		.attr("transform", "translate(" + (w_map - 55) + "," + 25 + ")")
		.attr("x1", d => d[0][0])
		.attr("x2", d => d[0][1])
		.attr("y1", d => d[1][0])
		.attr("y2", d => d[1][1]);

	// filter for selected country only, nest by process ID
	var con_data = data.filter(function(d) {
		return d.con.indexOf(con) != -1;
	});

	var splitByProcess = false;

	// split agreements into circles by peace process
	if (splitByProcess) {
		var con_data_process = d3
			.nest()
			.key(d => d.processid)
			.entries(con_data);

		// calculate circle pack for each peace process separately
		con_data_process.forEach(function(pr, i) {
			// list of all countries involved in the PP
			pr.cons = new Set(
				pr.values
					.map(d => d.con)
					.reduce(function(a, b) {
						return a.concat(b);
					})
			);

			// circle pack
			d3.packSiblings(
				pr.values.map(function(d) {
					d.r = glyphR;
					return d;
				})
			);
			pr.outercircle = d3.packEnclose(pr.values);
			pr.r = pr.outercircle.r * 1.2;
		});

		d3.packSiblings(con_data_process);
		// console.log(con_data)

		// scale
		// translate

		// draw circles
		// g for each big circle
		var g = d3
			.select("#popG")
			.selectAll("g")
			.data(con_data_process)
			.enter()
			.append("g")
			.attr("transform", function(d) {
				return (
					"translate(" + (0.5 * w_map + d.x) + "," + (0.5 * h_map + d.y) + ")"
				);
			});

		// draw big background circle
		g.append("circle")
			.attr("x", 0)
			.attr("y", 0)
			.attr("r", d => d.outercircle.r)
			.style("fill", "#3A3A3A");

		// g for each agreement, positioned correctly
		var glyph = g
			.selectAll(".glyph")
			.data(d => d.values)
			.enter()
			.append("g")
			.classed("glyph", true)
			.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
	}

	// do not split by process
	else {
		console.log(con_data);

		d3.packSiblings(
			con_data.map(function(d) {
				d.r = glyphR;
				return d;
			})
		);
		var outercircle = d3.packEnclose(con_data);

		// g for big circle
		var g = d3
			.select("#popG")
			.append("g")
			.attr("transform", function(d) {
				return "translate(" + 0.5 * w_map + "," + 0.5 * h_map + ")";
			});

		// draw big background circle
		g.append("circle")
			.attr("x", 0)
			.attr("y", 0)
			.attr("r", d => outercircle.r)
			.style("fill", "#3A3A3A");

		// g for each agreement, positioned correctly
		var glyph = g
			.selectAll(".glyph")
			.data(con_data)
			.enter()
			.append("g")
			.classed("glyph", true)
			.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
	}

	// draw centre circle for each agreement
	glyph
		.append("circle")
		.attr("r", glyphR * 0.3)
		.style("fill", "#EAE4E2");

	// add petals
	glyph
		.selectAll(".arc")
		.data(d => petalData(d))
		.enter()
		.append("path")
		.attr("d", arc)
		.style("fill", d => d.colour);
}

function petalData(d) {
	var activeCodes = [];
	for (var i = 0; i < codes.length; i++) {
		if (d[codes[i]]) {
			activeCodes.push(codes[i]);
		}
	}
	if (!activeCodes.length) {
		return [];
	} else {
		var incr = tau / codes.length;
		var obj = [];
		for (var i = 0; i < codes.length; i++) {
			if (activeCodes.includes(codes[i])) {
				obj.push({
					startAngle: i * incr,
					endAngle: (i + 1) * incr,
					colour: codeColour(codes[i])
				});
			}
		}
		return obj;
	}
}

var arc = d3
	.arc()
	.innerRadius(0)
	.outerRadius(glyphR * 0.8)
	.cornerRadius(5);

var arc_mini = d3
	.arc()
	.innerRadius(0)
	.outerRadius(1)
	.cornerRadius(5);
