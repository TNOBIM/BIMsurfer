/*
 * Keeps track of statistics 
 */
export default class Stats {
	constructor() {
		this.parameters = {};
		this.groups = {
			"Tiling": [
				"Renderable tiles"
			],
			"Timing": [
				"Loadtime total",
				"Loadtime geometry",
				"Fps"
			], "Models": [
				"Name",
				"Models to load",
				"Models loaded",
				"Objects",
				"Geometries",
				"Geometries reused",
			], "Primitives": [
				"Primitives to load",
				"Nr primitives loaded",
				"Nr primitives hidden"
			], "Data": [
				"GPU bytes",
				"GPU bytes reuse",
				"GPU bytes total"
			], "Drawing": [
				"Draw calls per frame",
				"Triangles to draw"
			], "Network": [
				"Bytes OTL"
			], "Buffers": [
				"Buffer groups",
				"Flushed buffers"
			], "Renderer settings": [
				"Object colors",
				"Small indices if possible",
				"Quantize normals",
				"Quantize vertices"
			], "Loader settings": [
				"Object colors",
				"Quantize normals",
				"Quantize vertices",
			]
		};
		
		for (var groupName in this.groups) {
			var group = this.groups[groupName];
			var groupObject = {};
			this.parameters[groupName] = groupObject;
			for (var key of group) {
				groupObject[key] = 0;
			}
		}
	}

	get(group, key) {
		return this.parameters[group][key];
	}

	setParameter(group, key, value) {
		var group = this.parameters[group];
		group[key] = value;
	}

	inc(groupName, key, value) {
		var group = this.parameters[groupName];
		if (group[key] == null) {
			group[key] = 0;
		}
		if (value == null) {
			group[key] = group[key] + 1;
		} else {
			group[key] = group[key] + value;
		}
	}

	numberWithCommas(x) {
		return Number(x).toLocaleString();
	}

	update() {
		for (var groupName in this.groups) {
			var group = this.groups[groupName];
			var groupElement = document.getElementById(groupName + "-group");
			if (groupElement == null) {
				groupElement = document.createElement("div");
				groupElement.id = groupName + "-group";
				document.getElementById("stats").appendChild(groupElement);

				var groupTitle = document.createElement("h3");
				groupTitle.innerHTML = groupName;
				groupElement.appendChild(groupTitle);
			}
			for (var key of group) {
				var fullKey = groupName + "_" + key;
				var value = this.parameters[groupName][key];
				var element = document.getElementById(fullKey);
				if (element == null) {
					element = document.createElement("div");
					element.id = fullKey;
					groupElement.appendChild(element);
				}
				if (value == null) {
					element.innerHTML = key + ": 0";
				} else {
					if (typeof value == "number") {
						element.innerHTML = key + ": " + this.numberWithCommas(value);
					} else {
						element.innerHTML = key + ": " + value;
					}
				}
			}
		}
	}
	
	cleanup() {
		var stats = document.getElementById("stats");
		while (stats.firstChild) {
			stats.removeChild(stats.firstChild);
		}
	}
}