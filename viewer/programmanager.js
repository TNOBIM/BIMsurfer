/*
 * Keeps track of all the programs and positions
 * 
 * In the future, an obvious next step would be to auto-generate at least the vertex shaders 
 * based on some templates, at the moment the shaders are all written manually, using a naming scheme file the file names
 * 
 * TODO:
 * 	- There is only one fragment shaders ATM, but it's loaded 16 times
 */

export default class ProgramManager {
	constructor(gl, viewerBasePath) {
		this.gl = gl;
		this.viewerBasePath = viewerBasePath;
		this.loadedFiles = new Map();
		this.programs = {};
		this.promises = [];
	}

	generateSetup(inputSettings) {
		var settings = {
			attributes: [],
			uniforms: []
		};
		if (inputSettings.instancing) {
			settings.attributes.push("instances");
		}
		if (inputSettings.useObjectColors) {
			settings.uniforms.push("objectColor");
		} else {
			settings.attributes.push("vertexColor");
		}
		settings.attributes.push("vertexPickColor");
		if (inputSettings.quantizeNormals) {
			// Has no effect on locations
		}
		if (inputSettings.quantizeVertices) {
			settings.uniforms.push("vertexQuantizationMatrix");
		}
		return settings;
	}

	load() {
		var defaultSetup = {
			attributes: [
				"vertexPosition",
				"vertexNormal"
				],
			uniforms: [
				"projectionMatrix",
				"viewNormalMatrix",
				"viewMatrix"
			],
			uniformBlocks: [
			//	"LightData"
			]
		};

		// These 4 loops basically generate all 16 drawing combinations
		{
			let picking = false;
			for (var instancing of [true, false]) {
				for (var useObjectColors of [true, false]) {
					for (var quantizeNormals of [true, false]) {
						for (var quantizeVertices of [true, false]) {
							if (useObjectColors) {
								this.generateShaders(defaultSetup, settings, picking, instancing, useObjectColors, quantizeNormals, quantizeVertices, false);
							} else {
								for (var quantizeColors of [true, false]) {
									this.generateShaders(defaultSetup, settings, picking, instancing, useObjectColors, quantizeNormals, quantizeVertices, quantizeColors);
								}
							}
						}
					}
				}
			}
		}

		var settings = {
			specialType: "line"
		};
		this.setupProgram(this.viewerBasePath + "shaders/vertex_line.glsl", this.viewerBasePath + "shaders/fragment_line.glsl", {
			attributes: ["vertexPosition"],
			uniforms: [
				"matrix",
				"inputColor",
				"projectionMatrix",
				"viewMatrix"
			]
		}, this.generateSetup(settings), settings);

        //  Picking shaders - 8 combinations
		{
			let picking = true;
			let quantizeColors = false;
			let quantizeNormals = false;
			for (var instancing of [true, false]) {
				for (var useObjectColors of [true, false]) {
					for (var quantizeVertices of [true, false]) {
						if (useObjectColors) {
							this.generateShaders(defaultSetup, settings, picking, instancing, useObjectColors, quantizeNormals, quantizeVertices, quantizeColors);
						} else {
							this.generateShaders(defaultSetup, settings, picking, instancing, useObjectColors, quantizeNormals, quantizeVertices, quantizeColors);
						}
					}
				}
			}
		}

        return Promise.all(this.promises);
	}
	
	generateShaders(defaultSetup, settings, picking, instancing, useObjectColors, quantizeNormals, quantizeVertices, quantizeColors) {
		var vertexShaderName = "shaders/vertex";
		if (picking) {
			vertexShaderName += "_pk";
		}
		if (instancing) {
			vertexShaderName += "_ins";
		}
		if (useObjectColors) {
			vertexShaderName += "_oc";
		}
		if (quantizeNormals) {
			vertexShaderName += "_in";
		}
		if (quantizeVertices) {
			vertexShaderName += "_iv";
		}
		if (quantizeColors) {
			vertexShaderName += "_qc";
		}
		vertexShaderName += ".glsl";

		var settings = {
			picking: picking,
			instancing: instancing,
			useObjectColors: useObjectColors,
			quantizeNormals: quantizeNormals,
			quantizeVertices: quantizeVertices,
			quantizeColors: quantizeColors
		};

		var fragShaderName = picking ? "shaders/fragment_pk.glsl" : "shaders/fragment.glsl";
		this.setupProgram(this.viewerBasePath + vertexShaderName, this.viewerBasePath + fragShaderName, defaultSetup, this.generateSetup(settings), settings);
	}

	getProgram(settings) {
		//console.log("getProgram('" + JSON.stringify(settings) + "', program");
		var program = this.programs[JSON.stringify(settings)];
		if (program == null) {
			console.error("Program not found", settings);
		}
		return program;
	}

	setProgram(settings, program) {
		//console.log("setProgram('" + JSON.stringify(settings) + "', program");
		this.programs[JSON.stringify(settings)] = program;
	}

	setupProgram(vertexShader, fragmentShader, defaultSetup, specificSetup, settings) {
		var p = new Promise((resolve, reject) => {
			this.loadShaderFile(vertexShader).then((vsSource) => {
				this.loadShaderFile(fragmentShader).then((fsSource) => {
					var shaderProgram = this.initShaderProgram(this.gl, vsSource, fsSource);

					var programInfo = {
						program: shaderProgram,
						attribLocations: {},
						uniformLocations: {},
						uniformBlocks: {}
					};

					//console.log("----------------------------------------");
					//console.log("setupProgram (" + vertexShader + ", " + fragmentShader + ")");

					for (var setup of [defaultSetup, specificSetup]) {
						if (setup.attributes != null) {
							//console.log("attributes:");
							for (var attribute of setup.attributes) {
								programInfo.attribLocations[attribute] = this.gl.getAttribLocation(shaderProgram, attribute);
								if (programInfo.attribLocations[attribute] == -1) {
									console.error("Missing attribute location", attribute, vertexShader);
								}
								//console.log("attribute  '" + attribute + "' = " + programInfo.attribLocations[attribute]);
							}
						}
						if (setup.uniforms != null) {
							//console.log("uniforms:");
							for (var uniform of setup.uniforms) {
								programInfo.uniformLocations[uniform] = this.gl.getUniformLocation(shaderProgram, uniform);
								//console.log("uniform '" + uniform + "' = " + programInfo.uniformLocations[uniform]);
							}
						}
						if (setup.uniformBlocks != null) {
							//console.log("uniformBlocks:");
							if (setup.uniformBlocks != null) {
								for (var uniformBlock of setup.uniformBlocks) {
									programInfo.uniformBlocks[uniformBlock] = this.gl.getUniformBlockIndex(shaderProgram, uniformBlock);
									this.gl.uniformBlockBinding(shaderProgram, programInfo.uniformBlocks[uniformBlock], 0);
									//console.log("uniformBlock '" + uniformBlock + "' = " + programInfo.uniformBlocks[uniformBlock]);
								}
							}
						}
					}

					programInfo.vertexShaderFile = vertexShader;
					programInfo.fragmentShaderFile = fragmentShader;

					this.setProgram(settings, programInfo);

					resolve(programInfo);
				});
			});
		});

		this.promises.push(p);

		return p;
	}

	loadShaderFile(filename) {
		if (this.loadedFiles.has(filename)) {
			return this.loadedFiles.get(filename);
		}
		var promise = new Promise((resolve, reject) => {
			var request = new XMLHttpRequest();
			request.open("GET", filename, true);
			request.addEventListener("load", () => {
				resolve(request.responseText);
			});
			request.send();
		});
		this.loadedFiles.set(filename, promise);
		return promise;
	}

	initShaderProgram(gl, vsSource, fsSource) {
		const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
		const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

		const shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);

		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
			return null;
		}

		return shaderProgram;
	}

	loadShader(gl, type, source) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}
}