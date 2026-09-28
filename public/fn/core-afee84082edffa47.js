var e = {
	id: "boardwalk-nights",
	name: "Boardwalk Nights",
	biome: "boardwalk",
	cup: "summit",
	orderInCup: 2,
	laps: 3,
	targetLapSeconds: 48,
	medalTimesMs: {
		gold: 118e3,
		silver: 128e3,
		bronze: 145e3
	},
	voidY: -14,
	landmark: "ferris-wheel",
	music: "boardwalk",
	controlPoints: [
		{
			x: -96.3,
			y: 0,
			z: -128.4,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 0,
			y: 0,
			z: -130.54,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 96.3,
			y: 0,
			z: -126.26,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 149.8,
			y: 0,
			z: -101.65,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 171.2,
			y: 0,
			z: -58.85,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 160.5,
			y: 0,
			z: -16.05,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: 176.55,
			y: 0,
			z: 16.05,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: 160.5,
			y: 0,
			z: 48.15,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: 117.7,
			y: 0,
			z: 74.9,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 64.2,
			y: 0,
			z: 90.95,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 10.7,
			y: 0,
			z: 74.9,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: -32.1,
			y: 0,
			z: 96.3,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: -74.9,
			y: 0,
			z: 74.9,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -139.1,
			y: 0,
			z: 42.8,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -171.2,
			y: 0,
			z: -10.7,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -160.5,
			y: 0,
			z: -64.2,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -128.4,
			y: 0,
			z: -101.65,
			halfWidth: 8,
			surface: "road"
		}
	],
	checkpointCount: 12,
	startGrid: {
		t: .12,
		rows: 4,
		columns: 2,
		spacing: 3.5
	},
	shortcuts: [{
		id: "arcade-alley",
		entryT: .31,
		exitT: .41,
		risk: "narrow",
		controlPoints: [
			{
				x: 170.729,
				y: 0,
				z: -62.154,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 171.833,
				y: 0,
				z: -32.23,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 172.937,
				y: 0,
				z: -2.305,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 174.041,
				y: 0,
				z: 27.62,
				halfWidth: 5.5,
				surface: "road"
			}
		]
	}],
	jumps: [{
		id: "pier-gap-ramp",
		t: .8,
		lateral: 0,
		launch: 5,
		width: 6
	}],
	boostPads: [
		{
			t: .14,
			lateral: 0,
			width: 3
		},
		{
			t: .6,
			lateral: -3,
			width: 3
		},
		{
			t: .7917,
			lateral: 0,
			width: 3
		},
		{
			t: .7844,
			lateral: 0,
			width: 3
		},
		{
			t: .7771,
			lateral: 0,
			width: 3
		},
		{
			t: .34,
			lateral: 0,
			width: 3,
			shortcut: "arcade-alley"
		}
	],
	pickups: [
		{
			t: .16,
			lateral: 0
		},
		{
			t: .16,
			lateral: -3.6
		},
		{
			t: .16,
			lateral: 3.6
		},
		{
			t: .16,
			lateral: -7.1
		},
		{
			t: .16,
			lateral: 7.1
		},
		{
			t: .27,
			lateral: -1.8
		},
		{
			t: .27,
			lateral: 1.8
		},
		{
			t: .27,
			lateral: -5.4
		},
		{
			t: .27,
			lateral: 5.4
		},
		{
			t: .36,
			shortcut: "arcade-alley",
			lateral: 0
		},
		{
			t: .36,
			shortcut: "arcade-alley",
			lateral: -3.6
		},
		{
			t: .36,
			shortcut: "arcade-alley",
			lateral: 3.6
		},
		{
			t: .58,
			lateral: -1.8,
			double: !0
		},
		{
			t: .58,
			lateral: 1.8
		},
		{
			t: .58,
			lateral: -5.4
		},
		{
			t: .58,
			lateral: 5.4
		},
		{
			t: .9,
			lateral: -1.8
		},
		{
			t: .9,
			lateral: 1.8
		},
		{
			t: .9,
			lateral: -5.4
		},
		{
			t: .9,
			lateral: 5.4
		}
	],
	coins: [
		{
			t: .08,
			lateral: -2
		},
		{
			t: .08,
			lateral: 2
		},
		{
			t: .22,
			lateral: 0
		},
		{
			t: .38,
			shortcut: "arcade-alley",
			lateral: 0
		},
		{
			t: .44,
			lateral: 0
		},
		{
			t: .65,
			lateral: -2
		},
		{
			t: .65,
			lateral: 2
		},
		{
			t: .82,
			lateral: 0
		},
		{
			t: .97,
			lateral: 0
		}
	],
	hazards: [
		{
			id: "bumper-cars",
			type: "crossing",
			t: .72,
			lateral: 0,
			period: 5,
			speed: 2,
			hit: "bump",
			asset: "bumper-car"
		},
		{
			id: "teacup-1",
			type: "static",
			t: .67,
			lateral: -4,
			hit: "spin",
			asset: "teacup"
		},
		{
			id: "teacup-2",
			type: "static",
			t: .89,
			lateral: 4,
			hit: "spin",
			asset: "teacup"
		}
	],
	loops: [{
		id: "neon-loop",
		t: .47
	}],
	openEdges: [{
		fromT: .12,
		toT: .22,
		side: "right"
	}],
	finalLapShift: {
		kind: "fireworks",
		label: "FIREWORKS FINALE",
		sky: "boardwalk-fireworks",
		addsJumps: [{
			id: "ferris-ramp",
			t: .5,
			lateral: 0,
			launch: 6,
			width: 6
		}],
		fogDensity: .0015,
		musicVariant: "finale"
	},
	environment: {
		sky: "boardwalk-night",
		fogColor: "#1a1440",
		fogDensity: .0025,
		ground: {
			kind: "water",
			y: -1.5
		},
		sunDirection: [
			.4,
			.7,
			-.3
		],
		palette: {
			background: "#15154a",
			accent: "#2ee6ff"
		},
		landmarkFooting: "pier",
		decor: [
			{
				asset: "stall",
				instances: 55,
				band: "roadside"
			},
			{
				asset: "lamp",
				instances: 75,
				band: "roadside"
			},
			{
				asset: "tent",
				instances: 20,
				band: "far",
				footing: "pier"
			},
			{
				asset: "bumper-car",
				instances: 12,
				band: "roadside",
				lift: 1.2
			},
			{
				asset: "teacup",
				instances: 8,
				band: "roadside",
				lift: 1.2
			}
		]
	}
}, t = {
	id: "canyon-rush",
	name: "Mesa Rush",
	biome: "canyon",
	cup: "sunrise",
	orderInCup: 3,
	laps: 3,
	targetLapSeconds: 52,
	medalTimesMs: {
		gold: 11e4,
		silver: 12e4,
		bronze: 135e3
	},
	voidY: -25,
	offroad: !0,
	courseLimit: {
		straight: .45,
		outside: 1,
		inside: .3,
		start: .4
	},
	landmark: "arch",
	music: "canyon",
	controlPoints: [
		{
			x: -120,
			y: 0,
			z: -144,
			halfWidth: 10,
			surface: "road"
		},
		{
			x: -24,
			y: 0,
			z: -150,
			halfWidth: 10,
			surface: "road"
		},
		{
			x: 84,
			y: 0,
			z: -141.6,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: 156,
			y: 1,
			z: -114,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 192,
			y: 5,
			z: -66,
			halfWidth: 7,
			bank: 8,
			surface: "road"
		},
		{
			x: 201.6,
			y: 14,
			z: -12,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 194.4,
			y: 26,
			z: 42,
			halfWidth: 6,
			bank: -6,
			surface: "road"
		},
		{
			x: 168,
			y: 34,
			z: 84,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: 114,
			y: 36,
			z: 102,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: 60,
			y: 34,
			z: 93.6,
			halfWidth: 6,
			surface: "road"
		},
		{
			x: 12,
			y: 26,
			z: 72,
			halfWidth: 7,
			bank: 6,
			surface: "road"
		},
		{
			x: -36,
			y: 14,
			z: 54,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -84,
			y: 4,
			z: 48,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: -138,
			y: 0,
			z: 24,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: -180,
			y: 0,
			z: -36,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: -168,
			y: 0,
			z: -96,
			halfWidth: 9,
			surface: "road"
		}
	],
	checkpointCount: 12,
	startGrid: {
		t: .02,
		rows: 4,
		columns: 2,
		spacing: 3.5
	},
	shortcuts: [{
		id: "mine-tunnel",
		entryT: .32,
		exitT: .665,
		risk: "hazard",
		tunnel: {
			from: .161,
			to: .795
		},
		controlPoints: [
			{
				x: 187.27,
				y: 3.87,
				z: -75.81,
				halfWidth: 7,
				surface: "road"
			},
			{
				x: 187.78,
				y: 5.3,
				z: -65.82,
				halfWidth: 6.8,
				surface: "road"
			},
			{
				x: 186.38,
				y: 6.6,
				z: -58.71,
				halfWidth: 6.66,
				surface: "road"
			},
			{
				x: 181.82,
				y: 7.4,
				z: -53.09,
				halfWidth: 6.51,
				surface: "road"
			},
			{
				x: 151.26,
				y: 7.2,
				z: -30.05,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 120.7,
				y: 7.5,
				z: -7.02,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 90.14,
				y: 17,
				z: 16.01,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 59.58,
				y: 25.8,
				z: 39.04,
				halfWidth: 5.64,
				surface: "road"
			},
			{
				x: 29.02,
				y: 28.64,
				z: 62.07,
				halfWidth: 6.23,
				surface: "road"
			},
			{
				x: 20.32,
				y: 27.73,
				z: 66.29,
				halfWidth: 6.5,
				surface: "road"
			},
			{
				x: 10.67,
				y: 25.81,
				z: 66.89,
				halfWidth: 6.69,
				surface: "road"
			},
			{
				x: -5.19,
				y: 21.91,
				z: 64.77,
				halfWidth: 7,
				surface: "road"
			}
		]
	}],
	jumps: [
		{
			id: "wash-ramp",
			t: .28,
			lateral: -2,
			launch: 5,
			width: 6
		},
		{
			id: "outcrop-ramp",
			t: .7,
			lateral: -2,
			launch: 6,
			width: 6
		},
		{
			id: "dune-1",
			t: .92,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "dune-2",
			t: .9334,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "dune-3",
			t: .9469,
			launch: 4.5,
			shape: "hump"
		}
	],
	boostPads: [
		{
			t: .12,
			lateral: 0,
			width: 3
		},
		{
			t: .6914,
			lateral: 0,
			width: 3
		},
		{
			t: .6837,
			lateral: 0,
			width: 3
		},
		{
			t: .676,
			lateral: 0,
			width: 3
		},
		{
			t: .72,
			lateral: 0,
			width: 3
		}
	],
	pickups: [
		{
			t: .04,
			lateral: 0
		},
		{
			t: .04,
			lateral: -3.6
		},
		{
			t: .04,
			lateral: 3.6
		},
		{
			t: .04,
			lateral: -7.2
		},
		{
			t: .04,
			lateral: 7.2
		},
		{
			t: .36,
			shortcut: "mine-tunnel",
			lateral: -1.8
		},
		{
			t: .36,
			shortcut: "mine-tunnel",
			lateral: 1.8
		},
		{
			t: .36,
			shortcut: "mine-tunnel",
			lateral: -5.4
		},
		{
			t: .36,
			shortcut: "mine-tunnel",
			lateral: 5.4
		},
		{
			t: .71,
			lateral: -1.8,
			double: !0
		},
		{
			t: .71,
			lateral: 1.8
		},
		{
			t: .71,
			lateral: -5.4
		},
		{
			t: .71,
			lateral: 5.4
		},
		{
			t: .78,
			lateral: 0
		},
		{
			t: .78,
			lateral: -3.6
		},
		{
			t: .78,
			lateral: 3.6
		},
		{
			t: .78,
			lateral: -7.1
		},
		{
			t: .78,
			lateral: 7.1
		}
	],
	coins: [
		{
			t: .08,
			lateral: -3
		},
		{
			t: .08,
			lateral: 3
		},
		{
			t: .22,
			lateral: 0
		},
		{
			t: .46,
			shortcut: "mine-tunnel",
			lateral: 0
		},
		{
			t: .9,
			lateral: -2
		},
		{
			t: .9,
			lateral: 2
		},
		{
			t: .85,
			lateral: 0
		},
		{
			t: .95,
			lateral: 0
		}
	],
	hazards: [
		{
			id: "rockfall-1",
			type: "falling",
			t: .22,
			lateral: 2,
			period: 5,
			hit: "slow",
			asset: "rockfall"
		},
		{
			id: "minecart-1",
			type: "crossing",
			t: .74,
			lateral: 0,
			period: 6,
			speed: 1.4,
			hit: "spin",
			asset: "minecart"
		},
		{
			id: "geyser-1",
			type: "vent",
			asset: "geyser",
			t: .145,
			lateral: -4,
			period: 4,
			offset: 0
		},
		{
			id: "geyser-2",
			type: "vent",
			asset: "geyser",
			t: .154,
			lateral: 4,
			period: 4,
			offset: 2
		}
	],
	openEdges: [{
		fromT: .46,
		toT: .6,
		side: "left"
	}, {
		fromT: .51,
		toT: .56,
		side: "right"
	}],
	finalLapShift: {
		kind: "collapse",
		label: "THE BRIDGE IS DOWN",
		closesShortcuts: ["mine-tunnel"],
		routeOverrides: [{
			fromT: .32,
			toT: .665,
			controlPoints: [
				{
					x: 187.27,
					y: 3.87,
					z: -75.81,
					halfWidth: 7,
					surface: "road"
				},
				{
					x: 187.78,
					y: 5.3,
					z: -65.82,
					halfWidth: 6.8,
					surface: "road"
				},
				{
					x: 186.38,
					y: 6.6,
					z: -58.71,
					halfWidth: 6.66,
					surface: "road"
				},
				{
					x: 181.82,
					y: 7.4,
					z: -53.09,
					halfWidth: 6.51,
					surface: "road"
				},
				{
					x: 151.26,
					y: 7.2,
					z: -30.05,
					halfWidth: 5.5,
					surface: "road"
				},
				{
					x: 120.7,
					y: 7.5,
					z: -7.02,
					halfWidth: 5.5,
					surface: "road"
				},
				{
					x: 90.14,
					y: 17,
					z: 16.01,
					halfWidth: 5.5,
					surface: "road"
				},
				{
					x: 59.58,
					y: 25.8,
					z: 39.04,
					halfWidth: 5.64,
					surface: "road"
				},
				{
					x: 29.02,
					y: 28.64,
					z: 62.07,
					halfWidth: 6.23,
					surface: "road"
				},
				{
					x: 20.32,
					y: 27.73,
					z: 66.29,
					halfWidth: 6.5,
					surface: "road"
				},
				{
					x: 10.67,
					y: 25.81,
					z: 66.89,
					halfWidth: 6.69,
					surface: "road"
				},
				{
					x: -5.19,
					y: 21.91,
					z: 64.77,
					halfWidth: 7,
					surface: "road"
				}
			]
		}],
		sky: "canyon-dusk",
		fogDensity: .003,
		musicVariant: "dusk"
	},
	environment: {
		sky: "canyon-day",
		fogColor: "#f2d9b8",
		fogDensity: .0015,
		ground: {
			kind: "plane",
			y: -1
		},
		sunDirection: [
			.5,
			.75,
			.3
		],
		palette: {
			background: "#d97a4a",
			accent: "#3ec9c0"
		},
		decor: [
			{
				asset: "cactus",
				instances: 45,
				band: "roadside"
			},
			{
				asset: "rock",
				instances: 50,
				band: "roadside"
			},
			{
				asset: "mesa",
				instances: 20,
				band: "far"
			},
			{
				asset: "minecart",
				instances: 10,
				band: "roadside",
				lift: .7
			},
			{
				asset: "arch",
				instances: 5,
				band: "far"
			},
			{
				asset: "rock",
				instances: 40,
				band: "far"
			},
			{
				asset: "scrub",
				instances: 200,
				band: "verge"
			},
			{
				asset: "pebbles",
				instances: 220,
				band: "verge"
			},
			{
				asset: "ranch-fence",
				instances: 150,
				band: "roadside",
				layout: "row",
				every: 4,
				run: 8,
				dist: [13, 13.3],
				merge: !0
			},
			{
				asset: "saguaro",
				instances: 70,
				band: "roadside",
				merge: !0
			},
			{
				asset: "saguaro-tall",
				instances: 40,
				band: "roadside",
				merge: !0
			},
			{
				asset: "canyon-sign",
				instances: 12,
				band: "roadside",
				layout: "row",
				every: 6,
				run: 4,
				side: "outside",
				dist: [13, 13.5],
				at: [.43, .5],
				merge: !0
			},
			{
				asset: "mine-track",
				instances: 6,
				band: "roadside",
				layout: "row",
				every: 12,
				run: 3,
				dist: [15, 18],
				at: [.22, .33],
				merge: !0
			},
			{
				asset: "water-tower",
				instances: 2,
				band: "roadside",
				at: [.22, .33],
				merge: !0
			},
			{
				asset: "water-tower",
				instances: 2,
				band: "roadside",
				merge: !0
			},
			{
				asset: "adobe",
				instances: 5,
				band: "roadside",
				at: [.9, .12],
				merge: !0
			},
			{
				asset: "adobe",
				instances: 3,
				band: "roadside",
				at: [.22, .33],
				merge: !0
			},
			{
				asset: "signpost",
				instances: 4,
				band: "roadside",
				at: [.9, .34],
				merge: !0
			},
			{
				asset: "crate",
				instances: 10,
				band: "roadside",
				at: [.22, .33],
				merge: !0
			},
			{
				asset: "windpump",
				instances: 8,
				band: "roadside",
				merge: !0
			},
			{
				asset: "crate",
				instances: 12,
				band: "roadside",
				merge: !0
			},
			{
				asset: "cliff",
				instances: 10,
				band: "roadside",
				layout: "row",
				every: 21,
				run: 5,
				dist: [15, 17],
				at: [.17, .3],
				merge: !0
			},
			{
				asset: "cliff",
				instances: 8,
				band: "roadside",
				layout: "row",
				every: 21,
				run: 4,
				side: "outside",
				dist: [15, 17],
				at: [.86, .97],
				merge: !0
			},
			{
				asset: "rock-span",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.07, .11],
				keepShape: !0,
				merge: !0
			},
			{
				asset: "canyon-bunting",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.17, .2],
				merge: !0
			},
			{
				asset: "canyon-bunting",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.86, .9],
				merge: !0
			},
			{
				asset: "barrel-cactus",
				instances: 130,
				band: "verge",
				merge: !0
			},
			{
				asset: "tumbleweed",
				instances: 70,
				band: "verge",
				merge: !0
			},
			{
				asset: "hoodoo",
				instances: 40,
				band: "far",
				dist: [36, 160],
				merge: !0
			},
			{
				asset: "saguaro",
				instances: 60,
				band: "far",
				dist: [30, 110],
				merge: !0
			},
			{
				asset: "windpump",
				instances: 5,
				band: "far",
				dist: [40, 110],
				merge: !0
			},
			{
				asset: "dune",
				instances: 70,
				band: "far",
				dist: [32, 180],
				scale: [.6, 1.6],
				merge: !0
			}
		]
	}
}, n = {
	id: "frostbite-pass",
	name: "Frostbite Pass",
	biome: "frost",
	cup: "summit",
	orderInCup: 1,
	laps: 3,
	targetLapSeconds: 54,
	medalTimesMs: {
		gold: 127e3,
		silver: 137e3,
		bronze: 155e3
	},
	voidY: -10,
	offroad: !0,
	courseLimit: {
		straight: .3,
		outside: .8,
		inside: .25,
		start: .35
	},
	landmark: "peak",
	music: "frost",
	controlPoints: [
		{
			x: -72,
			y: 0,
			z: -192,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: 48,
			y: 0,
			z: -194.4,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: 138,
			y: 1,
			z: -177.6,
			halfWidth: 8,
			bank: 6,
			surface: "ice"
		},
		{
			x: 189.6,
			y: 3,
			z: -153.6,
			halfWidth: 7.5,
			bank: 14,
			surface: "ice"
		},
		{
			x: 192,
			y: 4.5,
			z: -105.6,
			halfWidth: 7,
			bank: 10,
			surface: "road"
		},
		{
			x: 153.6,
			y: 6,
			z: -66,
			halfWidth: 6.5,
			surface: "road"
		},
		{
			x: 114,
			y: 7.5,
			z: -24,
			halfWidth: 6.5,
			surface: "road"
		},
		{
			x: 74.4,
			y: 9,
			z: 6,
			halfWidth: 6.5,
			surface: "road"
		},
		{
			x: 30,
			y: 10,
			z: 26.4,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -30,
			y: 10.5,
			z: 36,
			halfWidth: 7,
			bank: -8,
			surface: "road"
		},
		{
			x: -74.4,
			y: 9,
			z: 66,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -122.4,
			y: 6.5,
			z: 96,
			halfWidth: 7,
			bank: 12,
			surface: "road"
		},
		{
			x: -170.4,
			y: 3.5,
			z: 72,
			halfWidth: 7,
			bank: 8,
			surface: "road"
		},
		{
			x: -194.4,
			y: 1,
			z: 19.2,
			halfWidth: 7.5,
			bank: 6,
			surface: "road"
		},
		{
			x: -188.4,
			y: 0,
			z: -45.6,
			halfWidth: 8,
			bank: 4,
			surface: "ice"
		},
		{
			x: -158.4,
			y: 0,
			z: -105.6,
			halfWidth: 8.5,
			surface: "road"
		},
		{
			x: -120,
			y: 0,
			z: -158.4,
			halfWidth: 9,
			surface: "road"
		}
	],
	checkpointCount: 12,
	startGrid: {
		t: .03,
		rows: 4,
		columns: 2,
		spacing: 3.5
	},
	shortcuts: [{
		id: "lake-crossing",
		entryT: .5513,
		exitT: .7606,
		risk: "hazard",
		openOnLaps: [3],
		controlPoints: [
			{
				x: -30,
				y: 10.5,
				z: 36,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -90,
				y: 6,
				z: 28.8,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -115.12,
				y: 4.93,
				z: 34.21,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -140.24,
				y: 3.86,
				z: 39.61,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -165.36,
				y: 2.79,
				z: 45.02,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -174.31,
				y: 2.41,
				z: 44.89,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -182.32,
				y: 2.04,
				z: 40.87,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -187.76,
				y: 1.67,
				z: 33.76,
				halfWidth: 6,
				surface: "ice"
			},
			{
				x: -194.4,
				y: 1,
				z: 19.2,
				halfWidth: 6,
				surface: "ice"
			}
		]
	}],
	jumps: [
		{
			id: "ski-jump",
			t: .472,
			lateral: 0,
			launch: 5.5,
			width: 6
		},
		{
			id: "mogul-1",
			t: .335,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "mogul-2",
			t: .348,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "mogul-3",
			t: .361,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "mogul-4",
			t: .374,
			launch: 4.5,
			shape: "hump"
		}
	],
	boostPads: [
		{
			t: .14,
			lateral: 0,
			width: 3
		},
		{
			t: .4636,
			lateral: 0,
			width: 3
		},
		{
			t: .4562,
			lateral: 0,
			width: 3
		},
		{
			t: .4488,
			lateral: 0,
			width: 3
		},
		{
			t: .68,
			lateral: 0,
			width: 3
		},
		{
			t: .69,
			lateral: 0,
			width: 3,
			shortcut: "lake-crossing"
		}
	],
	pickups: [
		{
			t: .03,
			lateral: 0
		},
		{
			t: .03,
			lateral: -3.6
		},
		{
			t: .03,
			lateral: 3.6
		},
		{
			t: .03,
			lateral: -7.2
		},
		{
			t: .03,
			lateral: 7.2
		},
		{
			t: .3,
			lateral: -1.8,
			double: !0
		},
		{
			t: .3,
			lateral: 1.8
		},
		{
			t: .3,
			lateral: -5.4
		},
		{
			t: .3,
			lateral: 5.4
		},
		{
			t: .46,
			lateral: -1.8
		},
		{
			t: .46,
			lateral: 1.8
		},
		{
			t: .46,
			lateral: -5.4
		},
		{
			t: .46,
			lateral: 5.4
		},
		{
			t: .62,
			lateral: -1.8
		},
		{
			t: .62,
			lateral: 1.8
		},
		{
			t: .62,
			lateral: -5.4
		},
		{
			t: .62,
			lateral: 5.4
		},
		{
			t: .65,
			shortcut: "lake-crossing",
			lateral: 0
		},
		{
			t: .65,
			shortcut: "lake-crossing",
			lateral: -3.6
		},
		{
			t: .65,
			shortcut: "lake-crossing",
			lateral: 3.6
		},
		{
			t: .9,
			lateral: 0,
			double: !0
		},
		{
			t: .9,
			lateral: -3.6
		},
		{
			t: .9,
			lateral: 3.6
		},
		{
			t: .9,
			lateral: -7.2
		},
		{
			t: .9,
			lateral: 7.2
		}
	],
	coins: [
		{
			t: .08,
			lateral: -2
		},
		{
			t: .08,
			lateral: 2
		},
		{
			t: .2,
			lateral: 0
		},
		{
			t: .4,
			lateral: -2
		},
		{
			t: .4,
			lateral: 2
		},
		{
			t: .6,
			lateral: 0,
			shortcut: "lake-crossing"
		},
		{
			t: .7,
			lateral: 0
		},
		{
			t: .88,
			lateral: -2
		},
		{
			t: .88,
			lateral: 2
		}
	],
	hazards: [
		{
			id: "snowball-1",
			type: "rolling",
			t: .22,
			lateral: 3,
			period: 8,
			speed: 6,
			hit: "spin",
			asset: "snowball"
		},
		{
			id: "snowball-2",
			type: "rolling",
			t: .83,
			lateral: -3,
			period: 8,
			speed: 6,
			hit: "spin",
			asset: "snowball"
		},
		{
			id: "steam-1",
			type: "vent",
			asset: "steam",
			t: .926,
			lateral: -3.8,
			period: 4.5,
			offset: 0
		},
		{
			id: "steam-2",
			type: "vent",
			asset: "steam",
			t: .935,
			lateral: 3.8,
			period: 4.5,
			offset: 2.25
		}
	],
	openEdges: [{
		fromT: .535,
		toT: .6,
		side: "right"
	}],
	finalLapShift: {
		kind: "blizzard",
		label: "BLIZZARD!",
		opensShortcuts: ["lake-crossing"],
		sky: "frost-blizzard",
		fogDensity: .006,
		musicVariant: "blizzard"
	},
	environment: {
		sky: "frost-day",
		fogColor: "#eaf6ff",
		fogDensity: .0012,
		ground: {
			kind: "plane",
			y: -.5
		},
		sunDirection: [
			.35,
			.85,
			.3
		],
		palette: {
			background: "#eaf6ff",
			accent: "#ff2d95"
		},
		decor: [
			{
				asset: "pine",
				instances: 90,
				band: "roadside"
			},
			{
				asset: "snowman",
				instances: 35,
				band: "roadside"
			},
			{
				asset: "chalet",
				instances: 25,
				band: "far"
			},
			{
				asset: "snowball",
				instances: 80,
				band: "roadside",
				lift: .35
			},
			{
				asset: "chalet",
				instances: 15,
				band: "roadside",
				at: [.9, .18]
			},
			{
				asset: "pine",
				instances: 40,
				band: "far"
			},
			{
				asset: "sapling",
				instances: 180,
				band: "verge"
			},
			{
				asset: "stones",
				instances: 160,
				band: "verge"
			},
			{
				asset: "cottage",
				instances: 12,
				band: "roadside",
				at: [.9, .16],
				merge: !0
			},
			{
				asset: "cottage-teal",
				instances: 12,
				band: "roadside",
				at: [.9, .16],
				merge: !0
			},
			{
				asset: "lantern-post",
				instances: 30,
				band: "roadside",
				layout: "row",
				every: 16,
				run: 5,
				dist: [13, 13.5],
				at: [.88, .2],
				merge: !0
			},
			{
				asset: "ice-crystals",
				instances: 14,
				band: "roadside",
				at: [.9, .16],
				merge: !0
			},
			{
				asset: "snow-fence",
				instances: 150,
				band: "roadside",
				layout: "row",
				every: 4,
				run: 8,
				dist: [13, 13.3],
				merge: !0
			},
			{
				asset: "frost-sign",
				instances: 12,
				band: "roadside",
				layout: "row",
				every: 6,
				run: 4,
				side: "outside",
				dist: [13, 13.5],
				at: [.235, .3],
				merge: !0
			},
			{
				asset: "frost-sign",
				instances: 8,
				band: "roadside",
				layout: "row",
				every: 6,
				run: 4,
				side: "outside",
				dist: [13, 13.5],
				at: [.645, .67],
				merge: !0
			},
			{
				asset: "igloo",
				instances: 8,
				band: "roadside",
				at: [.56, .8],
				merge: !0
			},
			{
				asset: "sled",
				instances: 16,
				band: "roadside",
				at: [.56, .2],
				merge: !0
			},
			{
				asset: "fir",
				instances: 100,
				band: "roadside",
				merge: !0
			},
			{
				asset: "lantern-post",
				instances: 24,
				band: "roadside",
				layout: "row",
				every: 20,
				run: 4,
				dist: [14, 15],
				merge: !0
			},
			{
				asset: "frost-bunting",
				instances: 2,
				band: "roadside",
				layout: "span",
				at: [.07, .13],
				merge: !0
			},
			{
				asset: "frost-bunting",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.85, .9],
				merge: !0
			},
			{
				asset: "ice-shards",
				instances: 110,
				band: "verge",
				merge: !0
			},
			{
				asset: "fir-far",
				instances: 110,
				band: "far",
				dist: [30, 110],
				merge: !0
			},
			{
				asset: "crag",
				instances: 18,
				band: "far",
				dist: [40, 150],
				merge: !0
			},
			{
				asset: "frozen-falls",
				instances: 2,
				band: "far",
				layout: "row",
				run: 1,
				side: "outside",
				dist: [40, 52],
				at: [.23, .31],
				merge: !0
			},
			{
				asset: "frozen-falls",
				instances: 1,
				band: "far",
				layout: "row",
				run: 1,
				side: "outside",
				dist: [40, 52],
				at: [.63, .68],
				merge: !0
			},
			{
				asset: "ski-lift",
				instances: 8,
				band: "far",
				layout: "row",
				every: 24,
				run: 8,
				dist: [44, 50],
				at: [.36, .5],
				merge: !0
			},
			{
				asset: "cottage",
				instances: 10,
				band: "far",
				dist: [34, 90],
				merge: !0
			},
			{
				asset: "snowdrift",
				instances: 70,
				band: "far",
				dist: [30, 180],
				scale: [.6, 1.6],
				merge: !0
			},
			{
				asset: "ski-lodge",
				instances: 1,
				band: "roadside",
				layout: "row",
				run: 1,
				side: "right",
				footing: "sink",
				dist: [15, 18],
				at: [.46, .48],
				merge: !0
			},
			{
				asset: "jump-tower",
				instances: 1,
				band: "roadside",
				layout: "row",
				run: 1,
				side: "right",
				footing: "sink",
				dist: [16, 19],
				at: [.51, .53],
				merge: !0
			},
			{
				asset: "crag",
				instances: 5,
				band: "roadside",
				side: "right",
				footing: "sink",
				dist: [15, 19],
				at: [.4, .56],
				merge: !0
			},
			{
				asset: "fir-far",
				instances: 14,
				band: "far",
				side: "right",
				dist: [28, 52],
				at: [.38, .56],
				merge: !0
			},
			{
				asset: "lantern-post",
				instances: 10,
				band: "roadside",
				layout: "row",
				every: 18,
				run: 5,
				side: "right",
				dist: [14, 15],
				at: [.4, .56],
				merge: !0
			},
			{
				asset: "snow-tufts",
				instances: 90,
				band: "verge",
				at: [.36, .62],
				merge: !0
			},
			{
				asset: "frozen-pond",
				instances: 1,
				band: "far",
				dist: [34, 60],
				at: [.7, .8],
				merge: !0
			}
		]
	}
}, r = {
	id: "harbour-loop",
	name: "Lighthouse Loop",
	biome: "harbour",
	cup: "sunrise",
	orderInCup: 1,
	laps: 3,
	targetLapSeconds: 50,
	medalTimesMs: {
		gold: 119e3,
		silver: 129e3,
		bronze: 146e3
	},
	voidY: -12,
	offroad: !0,
	courseLimit: {
		straight: .3,
		outside: .8,
		inside: .25,
		start: .3
	},
	landmark: "lighthouse",
	music: "harbour",
	controlPoints: [
		{
			x: -80,
			y: 0,
			z: -110,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 20,
			y: 0,
			z: -112,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 110,
			y: 0,
			z: -105,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 133,
			y: 0,
			z: -106,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 152.2,
			y: 0,
			z: -97.7,
			halfWidth: 8,
			bank: 8,
			surface: "road"
		},
		{
			x: 161,
			y: 0,
			z: -78,
			halfWidth: 8,
			bank: 8,
			surface: "road"
		},
		{
			x: 163,
			y: .5,
			z: -45,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 170,
			y: 1,
			z: 20,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 150,
			y: 4,
			z: 90,
			halfWidth: 7,
			bank: 10,
			surface: "road"
		},
		{
			x: 80,
			y: 8,
			z: 130,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: 0,
			y: 8,
			z: 140,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -80,
			y: 5,
			z: 120,
			halfWidth: 7,
			bank: -10,
			surface: "road"
		},
		{
			x: -150,
			y: 2,
			z: 75,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: -190,
			y: 0,
			z: 0,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: -165,
			y: 0,
			z: -70,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: -120,
			y: 0,
			z: -102,
			halfWidth: 8,
			surface: "road"
		}
	],
	checkpointCount: 12,
	startGrid: {
		t: .0197,
		rows: 4,
		columns: 2,
		spacing: 3.5
	},
	shortcuts: [{
		id: "beach",
		entryT: .6799,
		exitT: .9446,
		risk: "narrow",
		controlPoints: [
			{
				x: -95.48,
				y: 4.37,
				z: 112.9,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -107.56,
				y: 4.06,
				z: 102.4,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -114.81,
				y: 3.84,
				z: 93.65,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -118.88,
				y: 3.62,
				z: 83.03,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -126.59,
				y: 2.88,
				z: 45.5,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -134.31,
				y: 2.14,
				z: 7.96,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -142.02,
				y: 1.4,
				z: -29.58,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -149.73,
				y: .66,
				z: -67.12,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -149.23,
				y: .46,
				z: -77.11,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -143.96,
				y: .27,
				z: -85.61,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -133.84,
				y: 0,
				z: -95.28,
				halfWidth: 5.5,
				surface: "road"
			}
		]
	}],
	jumps: [{
		id: "pier-ramp",
		t: .335,
		lateral: 3,
		launch: 5,
		width: 6
	}],
	boostPads: [
		{
			t: .217,
			lateral: -4,
			width: 3
		},
		{
			t: .3262,
			lateral: 0,
			width: 3
		},
		{
			t: .3183,
			lateral: 0,
			width: 3
		},
		{
			t: .3104,
			lateral: 0,
			width: 3
		},
		{
			t: .62,
			lateral: 4,
			width: 3
		},
		{
			t: .8,
			lateral: 0,
			width: 3,
			shortcut: "beach"
		}
	],
	pickups: [
		{
			t: .0493,
			lateral: 0
		},
		{
			t: .0493,
			lateral: -3.6
		},
		{
			t: .0493,
			lateral: 3.6
		},
		{
			t: .0493,
			lateral: -7.1
		},
		{
			t: .0493,
			lateral: 7.1
		},
		{
			t: .3886,
			lateral: -1.8
		},
		{
			t: .3886,
			lateral: 1.8
		},
		{
			t: .3886,
			lateral: -5.4
		},
		{
			t: .3886,
			lateral: 5.4
		},
		{
			t: .542,
			lateral: -1.8,
			double: !0
		},
		{
			t: .542,
			lateral: 1.8
		},
		{
			t: .542,
			lateral: -5.4
		},
		{
			t: .542,
			lateral: 5.4
		},
		{
			t: .8028,
			lateral: 0
		},
		{
			t: .8028,
			lateral: -3.6
		},
		{
			t: .8028,
			lateral: 3.6
		},
		{
			t: .8028,
			lateral: -7.1
		},
		{
			t: .8028,
			lateral: 7.1
		}
	],
	coins: [
		{
			t: .0986,
			lateral: -2
		},
		{
			t: .0986,
			lateral: 2
		},
		{
			t: .2172,
			lateral: -4
		},
		{
			t: .4576,
			lateral: 0
		},
		{
			t: .4774,
			lateral: 0
		},
		{
			t: .6253,
			lateral: -2
		},
		{
			t: .6253,
			lateral: 2
		},
		{
			t: .7718,
			shortcut: "beach",
			lateral: 0
		},
		{
			t: .9014,
			lateral: 0
		}
	],
	hazards: [{
		id: "barrels",
		type: "rolling",
		t: .3689,
		lateral: 3,
		period: 8,
		speed: 6,
		hit: "spin",
		asset: "barrel"
	}],
	openEdges: [{
		fromT: .47,
		toT: .6,
		side: "left"
	}],
	finalLapShift: {
		kind: "flood",
		label: "THE TIDE IS IN",
		closesShortcuts: ["beach"],
		sky: "harbour-tide",
		fogDensity: .004,
		musicVariant: "tide"
	},
	environment: {
		sky: "harbour-day",
		fogColor: "#dff3ff",
		fogDensity: .002,
		ground: {
			kind: "water",
			y: -1.5
		},
		sunDirection: [
			.4,
			.8,
			.3
		],
		palette: {
			background: "#f3e5c8",
			accent: "#ff6f61"
		},
		decor: [
			{
				asset: "palm",
				instances: 60,
				band: "roadside"
			},
			{
				asset: "house",
				instances: 40,
				band: "roadside"
			},
			{
				asset: "boat",
				instances: 40,
				band: "far",
				lift: -.5
			},
			{
				asset: "barrel",
				instances: 30,
				band: "roadside",
				lift: 1.02
			},
			{
				asset: "stall",
				instances: 16,
				band: "roadside"
			},
			{
				asset: "lamp",
				instances: 30,
				band: "roadside"
			},
			{
				asset: "crate",
				instances: 24,
				band: "roadside"
			},
			{
				asset: "umbrella",
				instances: 20,
				band: "roadside"
			},
			{
				asset: "rope-post",
				instances: 24,
				band: "roadside"
			},
			{
				asset: "tuft",
				instances: 480,
				band: "verge"
			},
			{
				asset: "flowers",
				instances: 300,
				band: "verge"
			},
			{
				asset: "bush",
				instances: 110,
				band: "verge"
			},
			{
				asset: "harbour-sign",
				instances: 12,
				band: "roadside",
				layout: "row",
				every: 6,
				run: 4,
				side: "outside",
				dist: [13, 13.5],
				at: [.205, .245],
				merge: !0
			},
			{
				asset: "harbour-bunting",
				instances: 2,
				band: "roadside",
				layout: "span",
				at: [.05, .13],
				merge: !0
			},
			{
				asset: "harbour-bunting",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.12, .2],
				merge: !0
			}
		]
	}
}, i = {
	id: "meadow-run",
	name: "Windmill Run",
	biome: "meadow",
	cup: "sunrise",
	orderInCup: 2,
	laps: 3,
	targetLapSeconds: 50,
	medalTimesMs: {
		gold: 121e3,
		silver: 131e3,
		bronze: 148e3
	},
	voidY: -10,
	offroad: !0,
	courseLimit: {
		straight: .3,
		outside: 1,
		inside: .25,
		start: .35
	},
	landmark: "windmill",
	music: "meadow",
	controlPoints: [
		{
			x: -140,
			y: 0,
			z: -15,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		},
		{
			x: -115.38,
			y: 1,
			z: -19.36,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: 210,
			y: 2,
			z: -77,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: 248.5,
			y: 2.83,
			z: -66.68,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: 276.68,
			y: 3.67,
			z: -38.5,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: 287,
			y: 4.5,
			z: 0,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: 276.68,
			y: 3.67,
			z: 38.5,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: 248.5,
			y: 2.83,
			z: 66.68,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: 210,
			y: 2,
			z: 77,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		},
		{
			x: -115.38,
			y: 1,
			z: 19.36,
			halfWidth: 9,
			surface: "mud"
		},
		{
			x: -140,
			y: 0,
			z: 15,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		},
		{
			x: -147.5,
			y: 0,
			z: 12.99,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		},
		{
			x: -152.99,
			y: 0,
			z: 7.5,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		},
		{
			x: -155,
			y: 0,
			z: 0,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		},
		{
			x: -152.99,
			y: 0,
			z: -7.5,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		},
		{
			x: -147.5,
			y: 0,
			z: -12.99,
			halfWidth: 6,
			bank: 12,
			surface: "road"
		}
	],
	checkpointCount: 12,
	startGrid: {
		t: .06,
		rows: 4,
		columns: 2,
		spacing: 3.5
	},
	shortcuts: [{
		id: "hedgerow-cut",
		entryT: .3556,
		exitT: .5571,
		risk: "narrow",
		controlPoints: [
			{
				x: 210,
				y: 2,
				z: -77,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 223.36,
				y: 2.07,
				z: -72.81,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 230.08,
				y: 2.11,
				z: -68.67,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 234,
				y: 2.15,
				z: -61.81,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 243.5,
				y: 2.32,
				z: -27.48,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 253,
				y: 2.5,
				z: 6.86,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 262.51,
				y: 2.68,
				z: 41.2,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 262.56,
				y: 2.72,
				z: 49.54,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 258.4,
				y: 2.76,
				z: 56.78,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 248.5,
				y: 2.83,
				z: 66.68,
				halfWidth: 5,
				surface: "road"
			}
		]
	}],
	jumps: [
		{
			id: "haystack-ramp",
			t: .75,
			lateral: 2,
			launch: 5,
			width: 6
		},
		{
			id: "hay-hump-1",
			t: .84,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "hay-hump-2",
			t: .854,
			launch: 4.5,
			shape: "hump"
		},
		{
			id: "hay-hump-3",
			t: .868,
			launch: 4.5,
			shape: "hump"
		}
	],
	boostPads: [
		{
			t: .15,
			lateral: 0,
			width: 3
		},
		{
			t: .741,
			lateral: 0,
			width: 3
		},
		{
			t: .733,
			lateral: 0,
			width: 3
		},
		{
			t: .725,
			lateral: 0,
			width: 3
		},
		{
			t: .95,
			lateral: 3,
			width: 3
		},
		{
			t: .45,
			lateral: 0,
			width: 3,
			shortcut: "hedgerow-cut"
		}
	],
	pickups: [
		{
			t: .09,
			lateral: 0
		},
		{
			t: .09,
			lateral: -3.6
		},
		{
			t: .09,
			lateral: 3.6
		},
		{
			t: .09,
			lateral: -7.2
		},
		{
			t: .09,
			lateral: 7.2
		},
		{
			t: .4765,
			shortcut: "hedgerow-cut",
			lateral: 0
		},
		{
			t: .4765,
			shortcut: "hedgerow-cut",
			lateral: -3.6
		},
		{
			t: .4765,
			shortcut: "hedgerow-cut",
			lateral: 3.6
		},
		{
			t: .62,
			lateral: 0,
			double: !0
		},
		{
			t: .62,
			lateral: -3.6
		},
		{
			t: .62,
			lateral: 3.6
		},
		{
			t: .62,
			lateral: -7.1
		},
		{
			t: .62,
			lateral: 7.1
		},
		{
			t: .9,
			lateral: 0
		},
		{
			t: .9,
			lateral: -3.6
		},
		{
			t: .9,
			lateral: 3.6
		},
		{
			t: .9,
			lateral: -7.2
		},
		{
			t: .9,
			lateral: 7.2
		}
	],
	coins: [
		{
			t: .2,
			lateral: -3
		},
		{
			t: .2,
			lateral: 3
		},
		{
			t: .3,
			lateral: 0
		},
		{
			t: .64,
			lateral: -2
		},
		{
			t: .64,
			lateral: 2
		},
		{
			t: .8,
			lateral: 0
		},
		{
			t: .97,
			lateral: -2
		},
		{
			t: .97,
			lateral: 2
		}
	],
	hazards: [{
		id: "haybale-1",
		type: "rolling",
		t: .16,
		lateral: -3,
		period: 8,
		speed: 6,
		hit: "spin",
		asset: "haybale"
	}],
	finalLapShift: {
		kind: "storm",
		label: "STORM ROLLS IN",
		closesShortcuts: ["hedgerow-cut"],
		sky: "meadow-storm",
		gripMultiplier: .85,
		fogDensity: .003
	},
	environment: {
		sky: "meadow-day",
		fogColor: "#eaf6d8",
		fogDensity: .0015,
		ground: {
			kind: "plane",
			y: -.3
		},
		sunDirection: [
			.4,
			.8,
			.3
		],
		palette: {
			background: "#eaf6d8",
			accent: "#ffd23f"
		},
		decor: [
			{
				asset: "oak",
				instances: 50,
				band: "roadside"
			},
			{
				asset: "fence",
				instances: 60,
				band: "roadside"
			},
			{
				asset: "barn",
				instances: 30,
				band: "far"
			},
			{
				asset: "windmill-small",
				instances: 40,
				band: "far"
			},
			{
				asset: "haybale",
				instances: 36,
				band: "roadside",
				lift: 1
			},
			{
				asset: "rock",
				instances: 20,
				band: "far"
			},
			{
				asset: "tuft",
				instances: 520,
				band: "verge"
			},
			{
				asset: "flowers",
				instances: 320,
				band: "verge"
			},
			{
				asset: "bush",
				instances: 110,
				band: "verge"
			},
			{
				asset: "ranch-fence",
				instances: 100,
				band: "roadside",
				layout: "row",
				every: 4,
				run: 8,
				dist: [13, 13.3],
				merge: !0
			},
			{
				asset: "sunflowers",
				instances: 50,
				band: "roadside",
				merge: !0
			},
			{
				asset: "meadow-sign",
				instances: 12,
				band: "roadside",
				layout: "row",
				every: 6,
				run: 4,
				side: "outside",
				dist: [13, 13.5],
				at: [.955, .995],
				merge: !0
			},
			{
				asset: "water-tower",
				instances: 2,
				band: "roadside",
				merge: !0
			},
			{
				asset: "windpump",
				instances: 4,
				band: "roadside",
				merge: !0
			},
			{
				asset: "signpost",
				instances: 3,
				band: "roadside",
				merge: !0
			},
			{
				asset: "meadow-bunting",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.09, .14],
				merge: !0
			},
			{
				asset: "meadow-bunting",
				instances: 1,
				band: "roadside",
				layout: "span",
				at: [.58, .68],
				merge: !0
			},
			{
				asset: "knoll",
				instances: 40,
				band: "far",
				dist: [40, 180],
				scale: [.6, 1.5],
				merge: !0
			}
		]
	}
}, a = {
	id: "skyline-circuit",
	name: "Skyline Circuit",
	biome: "skyline",
	cup: "summit",
	orderInCup: 3,
	laps: 3,
	targetLapSeconds: 54,
	medalTimesMs: {
		gold: 129e3,
		silver: 139e3,
		bronze: 158e3
	},
	voidY: 0,
	landmark: "airship",
	music: "skyline",
	controlPoints: [
		{
			x: -190,
			y: 38,
			z: 0,
			halfWidth: 10,
			surface: "road"
		},
		{
			x: -164.5,
			y: 42,
			z: -75,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: -95,
			y: 50,
			z: -129.9,
			halfWidth: 9,
			surface: "road"
		},
		{
			x: 0,
			y: 60,
			z: -150,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 95,
			y: 68,
			z: -129.9,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 164.5,
			y: 63,
			z: -75,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 190,
			y: 70,
			z: 0,
			halfWidth: 8,
			surface: "road"
		},
		{
			x: 194.1,
			y: 84,
			z: 88.5,
			halfWidth: 7,
			bank: 8,
			surface: "road"
		},
		{
			x: 112.1,
			y: 94,
			z: 153.3,
			halfWidth: 7,
			bank: -6,
			surface: "road"
		},
		{
			x: 0,
			y: 82,
			z: 150,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -95,
			y: 64,
			z: 129.9,
			halfWidth: 7,
			surface: "road"
		},
		{
			x: -164.5,
			y: 48,
			z: 75,
			halfWidth: 8,
			bank: 6,
			surface: "road"
		}
	],
	checkpointCount: 12,
	startGrid: {
		t: .02,
		rows: 4,
		columns: 2,
		spacing: 3.5
	},
	shortcuts: [{
		id: "sky-rail",
		entryT: .479,
		exitT: .7578,
		risk: "narrow",
		controlPoints: [
			{
				x: 189.97,
				y: 69.98,
				z: -.13,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 188.8,
				y: 70.74,
				z: 15.83,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 186.17,
				y: 71.3,
				z: 27.43,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 180.25,
				y: 71.87,
				z: 37.75,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 171.56,
				y: 72.43,
				z: 45.86,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 136.91,
				y: 74.42,
				z: 69.68,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 102.25,
				y: 76.41,
				z: 93.49,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 67.6,
				y: 78.41,
				z: 117.3,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 32.94,
				y: 80.4,
				z: 141.11,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 16,
				y: 81.26,
				z: 147.74,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: .16,
				y: 82.02,
				z: 150.02,
				halfWidth: 4.5,
				surface: "rail"
			}
		]
	}],
	jumps: [{
		id: "island-hop",
		t: .29,
		lateral: -2,
		launch: 5,
		width: 6
	}],
	boostPads: [
		{
			t: .06,
			lateral: 0,
			width: 3
		},
		{
			t: .9,
			lateral: -3,
			width: 3
		},
		{
			t: .282,
			lateral: 0,
			width: 3
		},
		{
			t: .2748,
			lateral: 0,
			width: 3
		},
		{
			t: .2677,
			lateral: 0,
			width: 3
		},
		{
			t: .6,
			lateral: 0,
			width: 3,
			shortcut: "sky-rail"
		}
	],
	pickups: [
		{
			t: .03,
			lateral: 0
		},
		{
			t: .03,
			lateral: -3.6
		},
		{
			t: .03,
			lateral: 3.6
		},
		{
			t: .03,
			lateral: -7.2
		},
		{
			t: .03,
			lateral: 7.2
		},
		{
			t: .6184,
			shortcut: "sky-rail",
			lateral: 0
		},
		{
			t: .6184,
			shortcut: "sky-rail",
			lateral: -3.6
		},
		{
			t: .6184,
			shortcut: "sky-rail",
			lateral: 3.6
		},
		{
			t: .8,
			lateral: -1.8,
			double: !0
		},
		{
			t: .8,
			lateral: 1.8
		},
		{
			t: .8,
			lateral: -5.4
		},
		{
			t: .8,
			lateral: 5.4
		},
		{
			t: .95,
			lateral: 0
		},
		{
			t: .95,
			lateral: -3.6
		},
		{
			t: .95,
			lateral: 3.6
		},
		{
			t: .95,
			lateral: -7.2
		},
		{
			t: .95,
			lateral: 7.2
		}
	],
	coins: [
		{
			t: .09,
			lateral: -3
		},
		{
			t: .09,
			lateral: 3
		},
		{
			t: .16,
			lateral: 0
		},
		{
			t: .35,
			lateral: 0
		},
		{
			t: .71,
			shortcut: "sky-rail",
			lateral: 0
		},
		{
			t: .88,
			lateral: -2
		},
		{
			t: .88,
			lateral: 2
		},
		{
			t: .97,
			lateral: 0
		}
	],
	hazards: [{
		id: "wake-gust",
		type: "gust",
		t: .12,
		lateral: 3,
		period: 6,
		speed: 11,
		hit: "bump",
		asset: "gust"
	}],
	openEdges: [{
		fromT: .18,
		toT: .27,
		side: "both"
	}, {
		fromT: .62,
		toT: .7,
		side: "left"
	}],
	finalLapShift: {
		kind: "sunset",
		label: "SUNSET TO STARLIGHT",
		closesShortcuts: ["sky-rail"],
		routeOverrides: [{
			fromT: .479,
			toT: .7578,
			controlPoints: [
				{
					x: 189.97,
					y: 69.98,
					z: -.13,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 188.8,
					y: 70.74,
					z: 15.83,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 186.17,
					y: 71.3,
					z: 27.43,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 180.25,
					y: 71.87,
					z: 37.75,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 171.56,
					y: 72.43,
					z: 45.86,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 136.91,
					y: 74.42,
					z: 69.68,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 102.25,
					y: 76.41,
					z: 93.49,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 67.6,
					y: 78.41,
					z: 117.3,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 32.94,
					y: 80.4,
					z: 141.11,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 16,
					y: 81.26,
					z: 147.74,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: .16,
					y: 82.02,
					z: 150.02,
					halfWidth: 4.5,
					surface: "rail"
				}
			]
		}],
		sky: "skyline-night",
		fogDensity: .0035,
		musicVariant: "starlight"
	},
	environment: {
		sky: "skyline-dawn",
		fogColor: "#ffd9b3",
		fogDensity: .0018,
		ground: { kind: "none" },
		sunDirection: [
			.4,
			.7,
			.35
		],
		palette: {
			background: "#ffb997",
			accent: "#f2b705"
		},
		decor: [
			{
				asset: "cloud",
				instances: 40,
				band: "sky"
			},
			{
				asset: "island",
				instances: 20,
				band: "far"
			},
			{
				asset: "cloud-sea",
				instances: 36,
				band: "far"
			},
			{
				asset: "sky-lamp",
				instances: 60,
				band: "roadside"
			}
		]
	}
}, o = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "kart.schema.json",
	title: "KartArchetype and Racer",
	description: "Base handling constants, the three archetype multipliers, the eight racers, the ten karts and the rules that keep every racer-and-kart pair fair. Skins are cosmetic only. The racer owns the class; the chosen kart's stats take the place of the racer's own kart's (any racer in any kart: design §5, Adam 25 Sept 2026), so a racer in their own kart handles exactly as their class and another kart changes how they are fast, not how fast (src/kart-controller/karts.ts).",
	type: "object",
	required: [
		"base",
		"archetypes",
		"racers",
		"bodies"
	],
	properties: /* @__PURE__ */ JSON.parse("{\"base\":{\"type\":\"object\",\"required\":[\"topSpeed\",\"accel\",\"brake\",\"steerRate\",\"driftSteerMin\",\"driftSteerMax\",\"driftYawLag\",\"airSteer\",\"gripDrift\",\"bumpSeparateRate\",\"hopSeconds\",\"chargeFull\",\"chargeNeutral\",\"driftTiers\",\"boostMultiplier\",\"boostSeconds\",\"trickMultiplier\",\"trickSeconds\",\"padMultiplier\",\"padSeconds\",\"itemSpeedMultiplier\",\"itemSpeedSeconds\",\"slipstreamSeconds\",\"slipstreamMultiplier\",\"slipstreamBoostSeconds\",\"coinBonusEach\",\"coinCap\",\"gripRoad\",\"gripOffroad\",\"gripMud\",\"gripIce\",\"startBoostWindowSeconds\",\"startBoostMultiplier\",\"startBoostSeconds\",\"bumpForce\",\"hitSpinSeconds\",\"hitCoinsLost\",\"speedClasses\",\"surfaceSpeed\",\"gravity\",\"hopVelocity\",\"coastDecel\",\"overSpeedDecel\",\"reverseFraction\",\"steerFalloff\",\"driftMinSpeed\",\"driftKeepSpeed\",\"driftAirCancelSeconds\",\"kartRadius\",\"groundStick\",\"groundLaunchVy\",\"wallRestitution\",\"wallScrub\",\"wallDeflect\",\"wallDeflectRate\",\"groundCatch\",\"startBoostCentreSeconds\",\"slipstreamLength\",\"slipstreamHalfWidth\",\"tSearchWindow\",\"driftVisualSlip\",\"dashMassBonus\",\"coinShield\",\"wallCooldownSeconds\",\"bumpCoold" +
"ownSeconds\",\"hardWallFraction\",\"slipstreamSameWayDot\",\"hopLandWindow\",\"maxBoostMultiplier\",\"shieldMassBonus\",\"rideSpeedMultiplier\",\"rideLookahead\",\"rideMassBonus\",\"rideRadius\",\"pilotTurnRate\",\"pilotAccel\",\"towSpeedMultiplier\",\"towSideOffset\",\"towFollowRoad\",\"springLaunch\",\"slamSpeed\",\"fallCatchDepth\",\"loopSpeedFactor\",\"wallEndOvershoot\",\"wallEndPushRate\",\"accelLaunch\",\"accelTaper\",\"contactHeight\",\"trickBufferSeconds\",\"trickDrop\",\"driftLateSteer\",\"airGrip\",\"steerLowSpeed\",\"lipZone\"],\"properties\":{\"topSpeed\":{\"type\":\"number\",\"description\":\"m/s\",\"default\":25},\"accel\":{\"type\":\"number\",\"default\":12},\"accelLaunch\":{\"type\":\"number\",\"description\":\"Throttle accel tapers with speed (24 Sept 2026): accel × (accelLaunch − accelTaper × (v / V)²). 1.3 and 0.7 give 15.6 m/s² off the line, 7.2 at the top, and 0 to V in 2.04 s (the old flat 12 m/s² took 2.08 s): a punchy launch that eases into top speed, like Mario Kart. 1.5 / 1.0 (18 m/s²) made a wall-scraping driver recover so fast it matched the Hard AI (ai-driver gate 2).\",\"default\":1.3},\"accelTaper\":{\"type\":\"number\",\"description\":\"See accelLau" +
"nch. Keep accelLaunch − accelTaper above 0 so the kart always reaches V.\",\"default\":0.7},\"brake\":{\"type\":\"number\",\"default\":20},\"steerRate\":{\"type\":\"number\",\"description\":\"rad/s at low speed\",\"default\":2.4},\"driftSteerMin\":{\"type\":\"number\",\"description\":\"Drift yaw = steerRate × lerp(driftSteerMin, driftSteerMax, drift.yawK) × driftSpeedScale, where yawK chases the whole stick range, (1 + steer × direction) / 2, over driftYawLag and starts at 0 on the lock. Full outward stick: 0.07 rad/s at top speed (a 350 m arc), the wide line, so a drift can hold the gentlest sweeper. Centred: 0.52 rad/s (48 m), the medium line. 24 Sept 2026 (Adam: MKW-level drift reward): it was 0.1 (0.24 rad/s, a 104 m arc), tighter than the racing line through most of our bends, so a drift ran onto the inside edge and let go at tier 1. 24 Sept 2026: the stick used to count only toward the drift side, so a centred stick drew the widest line (99 m). Mario Kart Wii datamine: the turn value lerps toward the stick each frame (reactivity), it never snaps.\",\"default\":0.03},\"driftSteerMax\":{\"type\":\"number\",\"description\":\"Full inward stick: 0.96 rad/s, a 26 m circle at top sp" +
"eed, a notch tighter than the grip turn at full lock (30 m). Adam settled it by feel on 21 Sept 2026 (1.08 too tight, 0.84 too loose). Below top speed a drift tightens as the grip turn does (driftSpeedScale), so full inward is never wider than steering at the same speed.\",\"default\":0.4},\"airSteer\":{\"type\":\"number\",\"description\":\"Steering authority while airborne, as a fraction of the grip turn. Mario Kart: the hop goes straight and the stick at landing sets the drift (delay drift); 0.15 keeps a whisper of control off ramps.\",\"default\":0.15},\"driftYawLag\":{\"type\":\"number\",\"description\":\"Seconds for the drift turn value to close most of the gap to the stick (MKW drift reactivity). The drift begins loose and tightens.\",\"default\":0.35},\"gripDrift\":{\"type\":\"number\",\"description\":\"Lateral damping per second while drifting. Lower than the road grip, so the kart carries outward on the drift lock and slides through the bend (MKW outside drift, target angle).\",\"default\":4.5},\"bumpSeparateRate\":{\"type\":\"number\",\"description\":\"m/s at which overlapping karts are eased apart, or the closing speed of the hit if that is faster (24 Sept 2026: capped a" +
"t 2.5 m/s a rear-ender drove straight through); the old instant pop was the jarring part of a bump.\",\"default\":2.5},\"contactHeight\":{\"type\":\"number\",\"description\":\"metres. Two karts touch (bump, slipstream) only when their heights differ by less than this, the same rule as items (src/items/powers.ts level()): a kart high on a spring or a jump passes over.\",\"default\":2},\"hopSeconds\":{\"type\":\"number\",\"default\":0.25},\"chargeFull\":{\"type\":\"number\",\"description\":\"Mini-turbo charge per 60 fps frame with the stick centred or into the drift (Mario Kart 8 Deluxe: 5).\",\"default\":5},\"chargeNeutral\":{\"type\":\"number\",\"description\":\"Charge per frame with the stick pushed out of the drift (the wide line). 24 Sept 2026: 2 → 3.5 (Mario Kart 8 Deluxe has 2), because on our wide sweepers the line is the wide stick; blue still comes 0.25 s later than with the stick in.\",\"default\":3.5},\"driftTiers\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"Charge for blue, orange, purple: 0.55 / 1.33 / 2.33 s at the full rate (0.79 / 1.9 / 3.3 s pushed out). 24 Sept 2026 (Adam: MKW-level drift reward): was 250 / 550 / 850 (Mario Kart 8 Deluxe," +
" 0.83 / 1.83 / 2.83 s), which our bends only reached orange on and seldom purple.\",\"default\":[165,400,700]},\"boostMultiplier\":{\"type\":\"number\",\"description\":\"Drift mini-turbo. Mario Kart Wii's mini-turbo is +30%; the +20% row is its standstill mini-turbo.\",\"default\":1.3},\"boostSeconds\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"Mini-turbo length for blue, orange, purple. Mario Kart 8 Deluxe (Nintendo tutorial): 0.62 / 1.67 / 2.63 s. Ours ramps up to the boosted speed (throttle accel) rather than kicking, so blue is 0.8 s (0.6 paid 0.13 s; now 0.23 s, orange 0.45 s, purple 0.72 s on a straight). 24 Sept 2026.\",\"default\":[0.8,1.5,2.4]},\"trickMultiplier\":{\"type\":\"number\",\"default\":1.3},\"trickSeconds\":{\"type\":\"number\",\"default\":0.7},\"padMultiplier\":{\"type\":\"number\",\"description\":\"Mario Kart Wii dash panel: +40% for 60 frames.\",\"default\":1.4},\"padSeconds\":{\"type\":\"number\",\"default\":1.0},\"itemSpeedMultiplier\":{\"type\":\"number\",\"default\":1.4},\"itemSpeedSeconds\":{\"type\":\"number\",\"default\":1.5},\"slipstreamSeconds\":{\"type\":\"number\",\"description\":\"Seconds in a wake before the boost fires\"" +
",\"default\":2.0},\"slipstreamMultiplier\":{\"type\":\"number\",\"default\":1.12},\"slipstreamBoostSeconds\":{\"type\":\"number\",\"description\":\"design §7: slipstream 2 s → +12% for 1.5 s\",\"default\":1.5},\"coinBonusEach\":{\"type\":\"number\",\"default\":0.0066},\"coinCap\":{\"type\":\"integer\",\"default\":10},\"gripRoad\":{\"type\":\"number\",\"description\":\"Lateral velocity damping per second. Mario Kart does NOT reduce grip off-road; the off-road penalty is the speed cap in surfaceSpeed. Only slippery surfaces (ice) cut grip. See docs/sops/kart-controller.md Approach.\",\"default\":8},\"gripOffroad\":{\"type\":\"number\",\"description\":\"Dirt. Equal to gripRoad on purpose (MK8DX BrakeRt only caps speed off-road).\",\"default\":8},\"gripMud\":{\"type\":\"number\",\"description\":\"Equal to gripRoad on purpose; mud is punished by surfaceSpeed, not by grip.\",\"default\":8},\"gripIce\":{\"type\":\"number\",\"description\":\"The one surface that really slides (MK8DX SlipRt applies to ice and sand).\",\"default\":2.5},\"surfaceSpeed\":{\"description\":\"Top-speed cap per surface, as a fraction of the kart's on-road top speed. This is how Mario Kart models off-road: a hard s" +
"peed cap, not drag and not grip. MK8DX datamined BrakeRt for dirt terrain has three tiers, 0.7 light / 0.5 medium / 0.3 heavy (deep sand). We map dirt to the light tier and mud to the medium tier; 0.3 stays free for a future deep-mud surface. Ice takes the slippery-terrain value (~0.9) and pays the rest in grip. The cap is ignored while a boost is live and while airborne (both are real MK rules, and they are what makes the hop-over-off-road line worth learning).\",\"type\":\"object\",\"required\":[\"road\",\"dirt\",\"mud\",\"ice\",\"boost\",\"rail\"],\"properties\":{\"road\":{\"type\":\"number\",\"default\":1.0},\"dirt\":{\"type\":\"number\",\"default\":0.7},\"mud\":{\"type\":\"number\",\"description\":\"MK8DX's medium off-road tier is 0.5; softened to 0.6 by design decision 8 Sept 2026.\",\"default\":0.6},\"ice\":{\"type\":\"number\",\"default\":0.9},\"boost\":{\"type\":\"number\",\"default\":1.0},\"rail\":{\"type\":\"number\",\"default\":1.0}}},\"boostIgnoresSurfaceCap\":{\"type\":\"boolean\",\"description\":\"MK Wii: a dash-panel boost carries off-road immunity. We apply it to every boost source for one readable rule.\",\"default\":true},\"airborneIgnoresSurfaceCap\":{\"type\":\"" +
"boolean\",\"description\":\"No ground contact, no surface cap. This is what makes hopping over a mud patch work.\",\"default\":true},\"gravity\":{\"type\":\"number\",\"description\":\"m/s². No Mario Kart datamine exists for this; tuned so hopSeconds lands.\",\"default\":26},\"hopVelocity\":{\"type\":\"number\",\"description\":\"m/s. gravity × hopSeconds / 2 so a flat hop lasts exactly hopSeconds.\",\"default\":3.25},\"coastDecel\":{\"type\":\"number\",\"default\":4.5},\"overSpeedDecel\":{\"type\":\"number\",\"description\":\"m/s². How fast speed falls back to the cap when a boost ends or a surface cap bites.\",\"default\":10},\"reverseFraction\":{\"type\":\"number\",\"description\":\"Reverse top speed as a fraction of forward top speed.\",\"default\":0.35},\"steerFalloff\":{\"type\":\"number\",\"description\":\"Turn rate shrinks with speed by this fraction at top speed, giving ~30 m radius (SuperTuxKart).\",\"default\":0.65},\"driftMinSpeed\":{\"type\":\"number\",\"description\":\"Fraction of top speed needed to start a drift.\",\"default\":0.45},\"driftKeepSpeed\":{\"type\":\"number\",\"description\":\"Drift cancels with no boost below this fraction.\",\"default\":0.3},\"driftAirC" +
"ancelSeconds\":{\"type\":\"number\",\"default\":0.9},\"kartRadius\":{\"type\":\"number\",\"description\":\"metres; collision circle\",\"default\":0.85},\"groundStick\":{\"type\":\"number\",\"description\":\"metres; stay glued to the ground within this height so crests do not launch the kart\",\"default\":0.12},\"groundLaunchVy\":{\"type\":\"number\",\"default\":1.0},\"wallRestitution\":{\"type\":\"number\",\"default\":0.3},\"wallScrub\":{\"type\":\"number\",\"description\":\"Fraction of speed lost on a square (90°) wall hit, once per impact (not per tick of contact), scaled from nothing at hardWallFraction to all of it head-on by how square the hit is (outward speed / total): a 30° glance loses 4% (24 Sept 2026: per-tick scrub took a 30° hit at 25 m/s down to 8 m/s in 50 ms).\",\"default\":0.15},\"wallDeflect\":{\"type\":\"number\",\"description\":\"On any wall contact with the nose pointing in, the nose swings this fraction of the way from its heading to the wall line, so the kart slides along the wall instead of sticking to it nose-first (Mario Kart bounces you off; it never parks you).\",\"default\":0.7},\"wallDeflectRate\":{\"type\":\"number\",\"description\":\"rad/s cap on tha" +
"t swing, so the nose turns along the wall over a few frames instead of snapping.\",\"default\":5.0},\"groundCatch\":{\"type\":\"number\",\"description\":\"metres. An airborne kart found under the road by less than this lands on it (a hop across a banked or sloping road); deeper, it is really under and keeps falling.\",\"default\":1.0},\"slipstreamLength\":{\"type\":\"number\",\"description\":\"metres behind the kart ahead\",\"default\":8},\"slipstreamHalfWidth\":{\"type\":\"number\",\"default\":2},\"tSearchWindow\":{\"type\":\"number\",\"description\":\"Spline fraction searched around the previous t. Never search globally.\",\"default\":0.02},\"driftVisualSlip\":{\"type\":\"number\",\"description\":\"rad; render-only body yaw offset at full drift, into the bend. The sim already slides (gripDrift), so the nose points inward by the slip angle before this is added; 0.49 on top read as a spin.\",\"default\":0.22},\"dashMassBonus\":{\"type\":\"number\",\"description\":\"Added to collision mass while any boost is live. MK8DX has a separate 'dash mass' for exactly this, so a boosting light kart can still win a bump.\",\"default\":0.35},\"shieldMassBonus\":{\"type\":\"number\",\"descriptio" +
"n\":\"Added to collision mass while a Bubble is up (research plan §5: +50 % bump weight; items Decisions 2026-09-21).\",\"default\":0.5},\"coinShield\":{\"description\":\"Off (Adam, 24 Sept 2026). When enabled, coins would be a hit buffer: with coins in hand a hit costs coins and a short slow instead of a spin. That is not how Mario Kart works: in Mario Kart 8 Deluxe and World every item or hazard hit spins you out and costs coins (hitCoinsLost), whatever you hold. Kept only as a switch.\",\"type\":\"object\",\"required\":[\"enabled\",\"slowedTo\",\"slowSeconds\"],\"properties\":{\"enabled\":{\"type\":\"boolean\",\"default\":false},\"slowedTo\":{\"type\":\"number\",\"description\":\"Speed multiplier applied instead of a spin when the kart has at least one coin.\",\"default\":0.75},\"slowSeconds\":{\"type\":\"number\",\"default\":0.6}}},\"wallCooldownSeconds\":{\"type\":\"number\",\"description\":\"Min seconds between wall events\",\"default\":0.2},\"bumpCooldownSeconds\":{\"type\":\"number\",\"description\":\"Min seconds between kart-vs-kart shoves for a pair\",\"default\":0.25},\"hardWallFraction\":{\"type\":\"number\",\"description\":\"A wall hit is hard (scrubs speed, once per i" +
"mpact) when outward speed / total speed exceeds this\",\"default\":0.3},\"slipstreamSameWayDot\":{\"type\":\"number\",\"description\":\"Min dot of both forward vectors to count as drafting\",\"default\":0.7},\"hopLandWindow\":{\"type\":\"number\",\"description\":\"Multiple of hopSeconds inside which landing with stick held locks a drift\",\"default\":2},\"driftLateSteer\":{\"type\":\"number\",\"description\":\"Grounded, not drifting, drift button held, fast enough and |steer| at least this: the drift starts now, no hop (a late drift, or one straight off a landing, as in Mario Kart 8 Deluxe and World).\",\"default\":0.3},\"trickBufferSeconds\":{\"type\":\"number\",\"description\":\"A drift press this long before a ramp's lip or a trick bump's crest still counts as the trick at the launch, even when the hop it made came down on the ramp's or the bump's rise (a hop still in the air there always does, and takes the launch); also this long before a flight turns into real air (trickDrop). Mario Kart Wii buffers the trick input 13 frames (0.22 s) before leaving trickable road (wiki.mkwtas.com/wiki/Trick); 0.15 until 26 Sept 2026, when a press as the kart climbed a trick bump's 4 m face wa" +
"s lost.\",\"default\":0.22},\"trickDrop\":{\"type\":\"number\",\"description\":\"metres. A flight the course did not launch (the kart's own hop, or rolling off an edge) is real air, and a drift press in it a trick, once the ground under the kart has fallen this far below the line it took off along (a crest, a ledge, a drop). A steady slope never falls below its own line, so a hop up, down or along a hill is never one; 0.2 m is the flat hop's own apex (hopVelocity^2 / 2 gravity), and a flight that drops it lasts 0.3 s or more (26 Sept 2026, Adam: 'it should allow you to do a bit of a boost').\",\"default\":0.2},\"airGrip\":{\"type\":\"number\",\"description\":\"Multiple of the surface grip on lateral velocity while airborne (the hop included).\",\"default\":0.5},\"steerLowSpeed\":{\"type\":\"number\",\"description\":\"Fraction of top speed below which the grip turn fades to nothing (no pivoting on the spot).\",\"default\":0.15},\"lipZone\":{\"type\":\"number\",\"description\":\"metres around a ramp lip inside which the lip-from-behind wall is checked\",\"default\":8},\"maxBoostMultiplier\":{\"type\":\"number\",\"description\":\"Hard ceiling on any boost multiplier (design §7: pad an" +
"d item are +40%). requestBoost clamps to it.\",\"default\":1.4},\"startBoostCentreSeconds\":{\"type\":\"number\",\"description\":\"Seconds before GO the throttle should go down: the moment the 2 appears, like Mario Kart (Adam, 21 Sept 2026).\",\"default\":2.0},\"startBoostWindowSeconds\":{\"type\":\"number\",\"description\":\"Full width of the window around the centre.\",\"default\":1.0},\"startBoostMultiplier\":{\"type\":\"number\",\"default\":1.2},\"startBoostSeconds\":{\"type\":\"number\",\"default\":1.0},\"bumpForce\":{\"type\":\"number\",\"description\":\"Lateral m/s given to the lighter kart on contact, scaled by weight difference. 6 threw the kart a lane in one tick (Adam, 21 Sept 2026).\",\"default\":3.5},\"hitSpinSeconds\":{\"type\":\"number\",\"description\":\"Default stun when an item or hazard lands\",\"default\":1.0},\"rideSpeedMultiplier\":{\"type\":\"number\",\"description\":\"Strike Ball: autopilot speed as a multiple of top speed (its own path, above the boost ceiling; design §8, Adam 23 Sept 2026)\",\"default\":1.5},\"rideLookahead\":{\"type\":\"number\",\"description\":\"Strike Ball: metres ahead on the centreline the autopilot aims at\",\"default\":14},\"rideMas" +
"sBonus\":{\"type\":\"number\",\"description\":\"Strike Ball: added to collision mass\",\"default\":6},\"rideRadius\":{\"type\":\"number\",\"description\":\"Strike Ball: collision radius while rolling (the ball is about 2.6 m across)\",\"default\":1.3},\"pilotTurnRate\":{\"type\":\"number\",\"description\":\"Autopilot (Strike Ball, Grapple Anchor): radians per second the heading may turn toward its aim\",\"default\":5},\"pilotAccel\":{\"type\":\"number\",\"description\":\"Autopilot: multiple of accel while it speeds up\",\"default\":3},\"towSpeedMultiplier\":{\"type\":\"number\",\"description\":\"Grapple Anchor: the reel-in speed as a multiple of top speed\",\"default\":1.4},\"towSideOffset\":{\"type\":\"number\",\"description\":\"Grapple Anchor: the pull aims this far beside the hooked kart, so you draw level and pass instead of rear-ending it\",\"default\":2.2},\"towFollowRoad\":{\"type\":\"number\",\"description\":\"Grapple Anchor: while the hooked kart is more than this far ahead along the road (m), the pull follows the road\",\"default\":20},\"springLaunch\":{\"type\":\"number\",\"description\":\"Pogo Spring: m/s straight up (about 3.8 m and 1.1 s of air at gravity 26)\",\"defa" +
"ult\":14},\"slamSpeed\":{\"type\":\"number\",\"description\":\"Pogo Spring: m/s straight down on the slam\",\"default\":30},\"fallCatchDepth\":{\"type\":\"number\",\"description\":\"Off an open edge: this far below the road the claw catches the kart mid-fall (race-manager rescue)\",\"default\":5},\"wallEndOvershoot\":{\"type\":\"number\",\"description\":\"A kart this far outside a wall's line (on an open shoulder where the barrier starts, or landing outside it) is eased back in, not snapped (metres; more than a kart radius, so an ordinary wall hit still snaps)\",\"default\":1.2},\"wallEndPushRate\":{\"type\":\"number\",\"description\":\"m/s at which that kart is eased back onto the road\",\"default\":10},\"loopSpeedFactor\":{\"type\":\"number\",\"description\":\"A loop-the-loop carries a kart round at its own speed, never slower than this fraction of top speed (design.md Track thrills): boost in and you fly round\",\"default\":0.8},\"hitCoinsLost\":{\"type\":\"integer\",\"description\":\"Mario Kart World lowered this from 3 to 2 for every racer.\",\"default\":2},\"speedClasses\":{\"description\":\"Top-speed scale per cc class\",\"type\":\"object\",\"required\":[\"50\",\"100\",\"150\"" +
"],\"properties\":{\"50\":{\"type\":\"number\",\"default\":0.7},\"100\":{\"type\":\"number\",\"default\":0.85},\"150\":{\"type\":\"number\",\"default\":1.0}}}}},\"archetypes\":{\"description\":\"The three classes (design §4): multipliers on the shared base, a racer in their own kart. Why speed is only −1% / +1%: bug hunt 2, 24 Sept 2026 (design §4). Moved here from kart-controller constants.ts on 25 Sept 2026 with the same values; src/kart-controller/karts.ts reads them.\",\"type\":\"object\",\"required\":[\"light\",\"medium\",\"heavy\"],\"default\":{\"light\":{\"speed\":-0.01,\"accel\":0.12,\"handling\":0.12,\"weight\":-0.15,\"hook\":\"none\"},\"medium\":{\"speed\":0,\"accel\":0,\"handling\":0,\"weight\":0,\"hook\":\"none\"},\"heavy\":{\"speed\":0.01,\"accel\":-0.12,\"handling\":-0.10,\"weight\":0.18,\"hook\":\"hardBump\"}},\"additionalProperties\":{\"type\":\"object\",\"required\":[\"speed\",\"accel\",\"handling\",\"weight\",\"hook\"],\"properties\":{\"speed\":{\"type\":\"number\"},\"accel\":{\"type\":\"number\"},\"handling\":{\"type\":\"number\"},\"weight\":{\"type\":\"number\"},\"hook\":{\"type\":\"string\",\"enum\":[\"none\",\"hardBump\"],\"description\":\"Researched 8 Sept 202" +
"6 against Mario Kart World. hardBump = heavy: every Mario Kart decides a bump by collision mass, and MKW's own Weight tooltip says weight 'affects collision between vehicles'. light and medium take none. A light 'fastCharge' hook was rejected: MK8DX's hidden Mini-Turbo stat is per character and kart part and does not track weight (Bowser is max, Wario is min). A medium 'keepCoins' hook was rejected as invented (design §4, 8 Sept 2026); the coin buffer that replaced it (base.coinShield) was switched off on 24 Sept 2026: in Mario Kart a hit always spins you.\"}}}},\"racers\":{\"type\":\"array\",\"minItems\":8,\"maxItems\":8,\"items\":{\"type\":\"object\",\"required\":[\"id\",\"name\",\"archetype\",\"accent\",\"secondary\",\"kartAsset\",\"headAsset\",\"horn\"],\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"archetype\":{\"type\":\"string\",\"enum\":[\"light\",\"medium\",\"heavy\"]},\"accent\":{\"type\":\"string\"},\"secondary\":{\"type\":\"string\"},\"kartAsset\":{\"type\":\"string\"},\"headAsset\":{\"type\":\"string\"},\"propAsset\":{\"type\":\"string\"},\"horn\":{\"type\":\"string\"},\"hitYelp\":{\"type\":\"string\"},\"aiPersonality\":{\"$ref\":\"#/$def" +
"s/aiPersonality\"},\"skins\":{\"description\":\"Alt palettes. All racers are available from the start; only skins unlock (design §10).\",\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/unlockable\"}}}}},\"bodies\":{\"description\":\"The old shared kart bodies' ids (classic, buggy), kept because the save's unlocked.bodies holds them. Since 25 Sept 2026 they are the karts Classic and Buggy (karts: twins of the Wind-Up Racer and the Scrap Buggy), picked on the kart screen, so an unlock changes the look, never the speed.\",\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/unlockable\"}},\"racerClasses\":{\"description\":\"Each racer's class (design §4). The class sets the racer's stats, and the racer's own kart (karts[].owner) is the zero a chosen kart is measured from. The racers' names, colors and art live in the game (src/game/racers.ts, src/ui-hud/data/cast.ts); kart-controller karts.test.ts keeps the three in step.\",\"type\":\"object\",\"additionalProperties\":{\"type\":\"string\",\"enum\":[\"light\",\"medium\",\"heavy\"]},\"default\":{\"pip\":\"light\",\"momo\":\"light\",\"nova\":\"light\",\"juniper\":\"medium\",\"otto\":\"medium\",\"sprocket\":\"medium\",\"boulder\":\"heavy\",\"" +
"gus\":\"heavy\"}},\"karts\":{\"description\":\"The ten karts (design §5; Adam, 25 Sept 2026, option B: any racer in any kart, like Mario Kart World). Each racer's signature kart (owner) and two unlockable twins (twinOf: the stats of that kart, so an unlock changes the look, never the speed; a twin carries no numbers of its own). The numbers are fractions of the base in whole kartSteps, at most kartLimits steps each, and balanced (kartPace): a kart trades one stat for another of equal lap-time value. Combine (src/kart-controller/karts.ts), in exactly this order: total = archetypes[the racer's class] + (this kart − the racer's own kart), so a racer in their own kart (or its twin) gets their class to the last bit. Then topSpeed = base.topSpeed × speedClasses[cc] × (1 + speed), accel = base.accel × (1 + accel), steerRate = base.steerRate × (1 + handling) (the grip turn and the drift turn), mass = 1 + weight (the dash, Bubble and Strike Ball bonuses on top, as ever). An unknown kart is the racer's own; an unknown racer takes the class alone. No hidden stats: no terrain stats, no mini-turbo stat. The balance gate (src/game/combos.e2e.test.ts) may move a kart one step toward neutral; thes" +
"e are the final numbers.\",\"type\":\"array\",\"minItems\":10,\"maxItems\":10,\"items\":{\"$ref\":\"#/$defs/kart\"},\"default\":[{\"id\":\"scooter\",\"name\":\"Parcel Scooter\",\"owner\":\"pip\",\"speed\":-0.005,\"accel\":0.06,\"handling\":0,\"weight\":-0.05},{\"id\":\"scrap\",\"name\":\"Scrap Buggy\",\"owner\":\"momo\",\"speed\":-0.010,\"accel\":0.06,\"handling\":0.06,\"weight\":-0.05},{\"id\":\"pod\",\"name\":\"Comet Pod\",\"owner\":\"nova\",\"speed\":-0.005,\"accel\":0,\"handling\":0.06,\"weight\":-0.05},{\"id\":\"wagon\",\"name\":\"Timber Wagon\",\"owner\":\"juniper\",\"speed\":0,\"accel\":0,\"handling\":0,\"weight\":0.05},{\"id\":\"skimmer\",\"name\":\"Wave Skimmer\",\"owner\":\"otto\",\"speed\":0,\"accel\":0.06,\"handling\":-0.06,\"weight\":0},{\"id\":\"windup\",\"name\":\"Wind-Up Racer\",\"owner\":\"sprocket\",\"speed\":0.005,\"accel\":0,\"handling\":-0.06,\"weight\":0},{\"id\":\"stomper\",\"name\":\"Stone Stomper\",\"owner\":\"boulder\",\"speed\":0.005,\"accel\":-0.06,\"handling\":0,\"weight\":0.05},{\"id\":\"snacktruck\",\"name\":\"Snack Truck\",\"owner\":\"gus\",\"speed\":0.010,\"accel\":-0.06,\"handling\":-0.06,\"weight\":0.05},{\"id\":\"classic\",\"name\":\"Classic\",\"" +
"twinOf\":\"windup\"},{\"id\":\"buggy\",\"name\":\"Buggy\",\"twinOf\":\"scrap\"}]},\"kartSteps\":{\"description\":\"One step of each kart stat, about equal in lap time on our tracks (design §5: 1% top speed ≈ 12% accel ≈ 11% handling; weight only moves bumps). A kart's numbers are whole steps, and the stat screens show one chevron per step.\",\"type\":\"object\",\"required\":[\"speed\",\"accel\",\"handling\",\"weight\"],\"properties\":{\"speed\":{\"type\":\"number\",\"default\":0.005},\"accel\":{\"type\":\"number\",\"default\":0.06},\"handling\":{\"type\":\"number\",\"default\":0.06},\"weight\":{\"type\":\"number\",\"default\":0.05}}},\"kartLimits\":{\"description\":\"The most whole steps a kart's stat may sit from zero (design §5): two of speed, one of each of the others.\",\"type\":\"object\",\"required\":[\"speed\",\"accel\",\"handling\",\"weight\"],\"properties\":{\"speed\":{\"type\":\"integer\",\"default\":2},\"accel\":{\"type\":\"integer\",\"default\":1},\"handling\":{\"type\":\"integer\",\"default\":1},\"weight\":{\"type\":\"integer\",\"default\":1}}},\"comboBounds\":{\"description\":\"[low, high] for each stat's total over every racer-and-kart pair (kart-controller karts.tes" +
"t.ts checks all of them). Also the ends of the stat bars on the racer and kart screens: bar = 0.08 + 0.92 × (total − low) / (high − low). The weight ends are the lightest and the heaviest class in their own karts (mass 0.85 to 1.18), so no pair bumps harder or softer than today's classes.\",\"type\":\"object\",\"required\":[\"speed\",\"accel\",\"handling\",\"weight\"],\"properties\":{\"speed\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"default\":[-0.015,0.015]},\"accel\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"default\":[-0.18,0.18]},\"handling\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"default\":[-0.18,0.18]},\"weight\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"default\":[-0.15,0.18]}}},\"kartPace\":{\"description\":\"The lap-time model a kart is balanced by (design §5; bug hunt 2, 24 Sept 2026: our tracks are fast and flowing, so top speed sets most of a lap): its predicted effect on lap pace is speed + accel / accel + handling / handling, and it must be within ±balance of zero. The real gate is src/game/combos.e" +
"2e.test.ts, which drives every distinct total on all six tracks.\",\"type\":\"object\",\"required\":[\"accel\",\"handling\",\"balance\"],\"properties\":{\"accel\":{\"type\":\"number\",\"description\":\"An accel fraction this many times larger is worth the same lap time as a top-speed fraction.\",\"default\":12},\"handling\":{\"type\":\"number\",\"description\":\"A handling fraction this many times larger is worth the same lap time as a top-speed fraction.\",\"default\":11},\"balance\":{\"type\":\"number\",\"description\":\"The most a kart's predicted lap effect may sit from zero (a fraction: 0.001 = 0.1%).\",\"default\":0.001}}},\"ai\":{\"description\":\"AI driver constants (docs/sops/ai-driver.md Approach). Never set per race; the defaults are the only values. src/ai-driver/constants.ts reads them. Seconds, metres, radians; fractions are of top speed or half-width as named.\",\"type\":\"object\",\"properties\":{\"line\":{\"type\":\"object\",\"properties\":{\"lookAheadGain\":{\"type\":\"number\",\"description\":\"look-ahead L = clamp(speed × gain, min, max) metres (turbo-kart-rush)\",\"default\":0.9},\"lookAheadMin\":{\"type\":\"number\",\"default\":8},\"lookAheadMax\":{\"type\":\"" +
"number\",\"default\":30},\"turnNearSeconds\":{\"type\":\"number\",\"description\":\"heading change measured this far ahead in seconds of travel\",\"default\":1.2},\"turnFarSeconds\":{\"type\":\"number\",\"default\":2.4},\"insideGain\":{\"type\":\"number\",\"description\":\"inside-corner bias = clamp(−sign(turn) × |turnNear| × gain, ±insideBiasMax) × halfWidth\",\"default\":0.5},\"insideBiasMax\":{\"type\":\"number\",\"default\":0.4},\"lateralMaxFraction\":{\"type\":\"number\",\"description\":\"lateral target clamp as a fraction of halfWidth\",\"default\":0.6},\"laneHalfFraction\":{\"type\":\"number\",\"description\":\"personality lateralBias spans ± this × halfWidth\",\"default\":0.45},\"edgeMargin\":{\"type\":\"number\",\"description\":\"metres kept from the road edge\",\"default\":1.4},\"aimClampMargin\":{\"type\":\"number\",\"default\":0.5},\"laneRate\":{\"type\":\"number\",\"description\":\"m/s the lateral target may move per second (smooths flickering nudges; fast enough to dodge)\",\"default\":10},\"narrowRoad\":{\"type\":\"number\",\"description\":\"halfWidth below this is narrow: centre line, no passing, no drifting, short look-ahead\",\"default\":5},\"narrowLookAhead\":{\"" +
"type\":\"number\",\"description\":\"look-ahead scale on a narrow road or near a branch entry/exit (floor lookAheadMin)\",\"default\":0.5},\"narrowMargin\":{\"type\":\"number\",\"description\":\"corner-speed margin multiplier on a narrow road, where a slide has nowhere to go\",\"default\":0.75},\"outsideFraction\":{\"type\":\"number\",\"description\":\"before a drift-worthy bend, set up on the outside at this × halfWidth so the drift has room\",\"default\":0.2},\"branchCommitMetres\":{\"type\":\"number\",\"description\":\"a taken shortcut stays the aim this far past its entry; the kart is only moved onto the branch once it has left the main road\",\"default\":40},\"edgeLift\":{\"type\":\"number\",\"description\":\"metres inside the outside road edge (negative: past it, onto the curb) at which a grip-driving AI pointing off the road lifts; a racing line touches the edge at every exit, so only past it (the drift has outsideSlack; grip needed its own: review, 23 Sept 2026, Frostbite's moguls)\",\"default\":-0.4},\"edgeShed\":{\"type\":\"number\",\"description\":\"m/s under its present speed an AI lifting at the outside edge aims for\",\"default\":3},\"airMargin\":{\"type\":\"number\",\"" +
"description\":\"share of the corner margin kept on a bend with bumps or a ramp ahead: airborne, a kart turns with only its air steer\",\"default\":0.7},\"trickBend\":{\"type\":\"number\",\"description\":\"rad (heading change over turnNearSeconds): over bumps on a bend sharper than this the AI does no tricks; each trick boost carries it faster into the next bump, where airborne it cannot turn (the Canyon dunes)\",\"default\":0.12},\"joinShare\":{\"type\":\"number\",\"description\":\"airborne on a shortcut, the heading step where its end meets the main road counts as a bend turned in this share of the metres left to the join (floor lookAheadMin), so the kart sheds speed before it lands at that angle (bug hunt 2, 24 Sept 2026, Canyon's mine exit). 0.25 and 0.5 measure the same (the brake is on either way); 1 lets more karts onto the sand\",\"default\":0.5},\"bendSeconds\":{\"type\":\"number\",\"description\":\"seconds of travel the AI scans ahead for how far the bend it is in keeps turning (LineInfo.bendAngle, bendMetres) and for the next bump or ramp (airMetres)\",\"default\":5},\"bendStep\":{\"type\":\"number\",\"description\":\"metres between the samples of that scan\",\"default\":" +
"8},\"bendBack\":{\"type\":\"number\",\"description\":\"rad the road may turn back before the scan calls the bend over (an S-bend)\",\"default\":0.15},\"shortcutSure\":{\"type\":\"number\",\"description\":\"skill at or above which an open wide shortcut is always taken (side paths help: gate 16 proves each at least as fast for Hard); below it, a roll of the racer aggression. Narrow ones stay a catch-up (shortcutRb)\",\"default\":0.9},\"declineFraction\":{\"type\":\"number\",\"description\":\"after declining a shortcut, keep at least this × halfWidth on the far side of the fork\",\"default\":0.35},\"wanderAmpMin\":{\"type\":\"number\",\"default\":0.08},\"wanderAmpMax\":{\"type\":\"number\",\"default\":0.2},\"wanderPeriodMin\":{\"type\":\"number\",\"default\":3.3},\"wanderPeriodMax\":{\"type\":\"number\",\"default\":8.3}}},\"steer\":{\"type\":\"object\",\"properties\":{\"kP\":{\"type\":\"number\",\"default\":2.2},\"kD\":{\"type\":\"number\",\"default\":0.15},\"dErrMax\":{\"type\":\"number\",\"description\":\"rad/s clamp on the derivative term\",\"default\":6},\"offroadGain\":{\"type\":\"number\",\"description\":\"steer gain multiplier while off the road surface\",\"default\":1.3},\"noi" +
"seSmoothing\":{\"type\":\"number\",\"description\":\"low-pass factor per tick on the seeded steering noise\",\"default\":0.05},\"kLat\":{\"type\":\"number\",\"description\":\"steer per metre of lateral error to the lane target; pure pursuit alone changes lanes too slowly to dodge\",\"default\":0.15},\"kLatMax\":{\"type\":\"number\",\"description\":\"clamp on the lateral term\",\"default\":0.6}}},\"avoid\":{\"type\":\"object\",\"properties\":{\"hazardLookAhead\":{\"type\":\"number\",\"description\":\"metres; a hazard is dodged from this far, or hazardSeconds of travel if that is further\",\"default\":25},\"hazardSeconds\":{\"type\":\"number\",\"description\":\"seconds of travel ahead a hazard that is not rolling is dodged from (24 Sept 2026: 25 m was 1 s at 150cc, too late to move a kart 3 m)\",\"default\":1.8},\"rollingLookAhead\":{\"type\":\"number\",\"description\":\"metres; a rolling hazard comes at you, so look further\",\"default\":45},\"hazardLateral\":{\"type\":\"number\",\"default\":2.2},\"dodgeClearance\":{\"type\":\"number\",\"default\":2.6},\"avoidLookAhead\":{\"type\":\"number\",\"description\":\"metres ahead another moving kart matters for passing and drafting\",\"defa" +
"ult\":25},\"stoppedLookAhead\":{\"type\":\"number\",\"description\":\"metres ahead a slow, spinning or stopped kart is treated as a hazard\",\"default\":40},\"slowKartSpeed\":{\"type\":\"number\",\"description\":\"m/s; a kart slower than this ahead is an obstacle\",\"default\":4},\"stoppedClearance\":{\"type\":\"number\",\"description\":\"metres of lateral clearance kept from a stopped or spinning kart\",\"default\":3.0},\"crossRate\":{\"type\":\"number\",\"description\":\"m/s sideways: a pass never crosses the line of a slow kart it cannot get past at this rate before it reaches it, nor squeezes by with less than a kart's width (24 Sept 2026)\",\"default\":4},\"passDistance\":{\"type\":\"number\",\"default\":10},\"passClosing\":{\"type\":\"number\",\"description\":\"m/s closing speed that starts a pass\",\"default\":1},\"touchDistance\":{\"type\":\"number\",\"description\":\"metres behind a kart at which the AI pulls out instead of drafting into it\",\"default\":3.5},\"spawnBehind\":{\"type\":\"number\",\"description\":\"metres past the spawn spot of a rolling or falling hazard the berth is still kept\",\"default\":5},\"ringHop\":{\"type\":\"number\",\"description\":\"seconds of t" +
"ravel before a shock wave along the ground (the Rumblesaur footstep ring) reaches the kart that it hops to clear it\",\"default\":0.1},\"ringSkill\":{\"type\":\"number\",\"description\":\"the least skill that hops shock waves\",\"default\":0.5},\"seekDistance\":{\"type\":\"number\",\"default\":40},\"seekLateral\":{\"type\":\"number\",\"description\":\"max metres off the line a pad, balloon or coin pulls the kart\",\"default\":2.5},\"seekSlope\":{\"type\":\"number\",\"description\":\"metres across the road a balloon may be per metre ahead and still be picked (at least seekLateral): the kart can steer to it in time\",\"default\":0.12},\"rowGap\":{\"type\":\"number\",\"description\":\"metres along the road within which balloons count as one row\",\"default\":2},\"claimWidth\":{\"type\":\"number\",\"description\":\"metres: a kart ahead, between us and a balloon row, this close across the road to a balloon will pop it first\",\"default\":1.6},\"claimCost\":{\"type\":\"number\",\"description\":\"metres added to a claimed balloon's distance from the racer's pick, so it goes for another in the row\",\"default\":4},\"pickSpread\":{\"type\":\"number\",\"description\":\"seeded spread added to" +
" a racer's lateralBias for where across a balloon row it goes for, so the pack spreads over the row\",\"default\":0.7},\"padSkill\":{\"type\":\"number\",\"description\":\"min skill to aim for boost pads\",\"default\":0.3}}},\"drift\":{\"type\":\"object\",\"properties\":{\"maxHold\":{\"type\":\"number\",\"default\":4.5},\"cooldown\":{\"type\":\"number\",\"default\":0.6},\"abortCooldown\":{\"type\":\"number\",\"default\":1.6},\"hopCommit\":{\"type\":\"number\",\"description\":\"seconds after the hop the drift side is held no matter what\",\"default\":0.3},\"hopCommitStick\":{\"type\":\"number\",\"description\":\"stick toward the drift side through the hop: enough to lock the drift and keep the full charge, not the full swing\",\"default\":0.5},\"chargeSecondsAhead\":{\"type\":\"number\",\"description\":\"with the next tier this many seconds of full charge away, hold a half stick through the exit and take the swing\",\"default\":0.3},\"startYawFraction\":{\"type\":\"number\",\"description\":\"hop only when the road under the nose already asks for this fraction of a half-stick drift yaw\",\"default\":0.4},\"exitYawFraction\":{\"type\":\"number\",\"description\":\"with a tier banked, le" +
"t go once the road under the nose asks for less than this fraction of the minimum drift yaw\",\"default\":0.5},\"overRotate\":{\"type\":\"number\",\"description\":\"rad of heading swung past the aim point before a drift lets go. The drift yaw is tighter than most bends, so a drift is a swing in and a straighten out; reachableTier() plans the tier from this.\",\"default\":0.6},\"aligned\":{\"type\":\"number\",\"description\":\"rad; release when the error and turnNear are both this small\",\"default\":0.08},\"alignedTurn\":{\"type\":\"number\",\"default\":0.15},\"edgeMargin\":{\"type\":\"number\",\"description\":\"metres from the inside edge that releases\",\"default\":1.2},\"outsideSlack\":{\"type\":\"number\",\"description\":\"metres past the outside road edge (onto the curb, still road) a drift may slide before the AI lets go; past the curb is off-road\",\"default\":0.3},\"aimGain\":{\"type\":\"number\",\"description\":\"rad/s of drift yaw asked per rad of error between the road ahead and where the kart is going (its velocity, not its nose: a drift slides, and holding the nose on the road slid the kart 3 m/s outward into the walls)\",\"default\":2},\"easeMin\":{\"type\":\"number\"" +
",\"description\":\"rad/s; the least a drift is taken to turn its course back out with the stick out (on a bend gentler than the widest drift it cannot, and must not swing in fast)\",\"default\":0.05},\"swingStep\":{\"type\":\"number\",\"description\":\"seconds per step of swingIn(), the AI's forward run of a drift with the stick out\",\"default\":0.05},\"swingSeconds\":{\"type\":\"number\",\"description\":\"the longest that run looks ahead\",\"default\":3},\"wideLift\":{\"type\":\"number\",\"description\":\"rad; at full inward stick with the course running this far wide of the road the drift lifts (twice this: brakes), so a hairpin taken too fast is held\",\"default\":0.05},\"easePlan\":{\"type\":\"number\",\"description\":\"rad/s; a bend whose yaw is less than this over the widest drift yaw cannot be held in a drift (the course swung in cannot be taken back in time): only a single sweep across the road is planned there\",\"default\":0.07},\"sweepRoom\":{\"type\":\"number\",\"description\":\"the width of that sweep, as a fraction of halfWidth\",\"default\":1.2},\"latCourseMax\":{\"type\":\"number\",\"description\":\"rad; the most course the drift's lane term asks\",\"default\":0.15" +
"},\"apexMargin\":{\"type\":\"number\",\"description\":\"metres inside the inside edge the drift aims its apex; while it has that room the stick stays at half or more (full charge)\",\"default\":2.2},\"wallMargin\":{\"type\":\"number\",\"description\":\"metres short of where the outside wall stops the kart (wall − kartRadius) that a drift lets go; on an open edge it is outsideSlack past the road\",\"default\":0.3},\"hopRoom\":{\"type\":\"number\",\"description\":\"a hop only with at least this many metres between the kart and the drift apex lane on the inside (halfWidth - apexMargin): the slide sweeps in and needs the room\",\"default\":1.5},\"hopAlign\":{\"type\":\"number\",\"description\":\"rad; no hop with the kart going (its course, the velocity) further than this off the road, in or out\",\"default\":0.12},\"hopMidBend\":{\"type\":\"number\",\"description\":\"rad the road under the nose turns over the hop and the loose lock (hopSeconds + driftYawLag) above which no hop starts: hop before a tight bend, not in it\",\"default\":0.2},\"snapRoom\":{\"type\":\"number\",\"description\":\"metres short of the inside release line (edgeMargin) inside which the stick is no longer pushed to" +
" a half for the charge\",\"default\":0.8},\"planTop\":{\"type\":\"number\",\"description\":\"a drift is planned at no more than this × the class top speed (coins included, not a boost): the boost runs out mid-drift\",\"default\":1.1},\"exitLead\":{\"type\":\"number\",\"description\":\"seconds of travel before the bend stops turning at which a drift at its planned tier (short of the top tier) lets go, so the boost goes onto the exit\",\"default\":0.5},\"hopLead\":{\"type\":\"number\",\"description\":\"seconds of travel before the bend gets tight (LineInfo.bendStart) the AI hops: the hop does not turn and the drift locks loose, tightening over driftYawLag\",\"default\":0.6},\"airLead\":{\"type\":\"number\",\"description\":\"seconds of travel before the foot of a bump or a ramp a drift lets go (the boost fires on the road); a drift is planned to end there\",\"default\":0.4},\"minTier\":{\"type\":\"integer\",\"description\":\"a drift starts only when the bend lets it reach this tier (or the racer's target tier, if lower). 24 Sept 2026 (Adam: MKW-level drift reward): a blue mini-turbo now pays about 0.3 s, so 1 (was 2: a tier-1 boost barely paid for the hop)\",\"default\":1},\"useBySkil" +
"l\":{\"type\":\"number\",\"description\":\"a racer drifts a bend with chance max(driftUse, skill × useBySkill) (driftUse 0 never drifts): a sharp driver drifts every bend, as Mario Kart World's hard CPUs do, whatever its personality\",\"default\":1},\"chainSeconds\":{\"type\":\"number\",\"description\":\"after a top-tier release, drift again at once (no wide set-up) while the bend goes on at least this many seconds of travel: chaining mini-turbos through a long sweeper, as in Mario Kart\",\"default\":1.6},\"hazardMiss\":{\"type\":\"number\",\"description\":\"metres off its dodge lane a drift may be with a hazard that stays put in its lane before it lets go\",\"default\":0.8},\"hazardSeconds\":{\"type\":\"number\",\"description\":\"no drift starts, and a drift lets go, with a hazard that stays put this many seconds of travel ahead within its clearance of the drift's lane: the slide cannot dodge\",\"default\":2.2},\"tierBySkill\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"skill below [0] → tier 1, below [1] → tier 2, else 3\",\"default\":[0.5,0.8]}}},\"recover\":{\"type\":\"object\",\"properties\":{\"stuckSeconds\":{\"type\":\"number\",\"description\":\"the" +
" AI's own stuck timer; the race-manager 6 s respawn is the backstop\",\"default\":1.5},\"reverseSeconds\":{\"type\":\"number\",\"default\":0.8},\"cooldownSeconds\":{\"type\":\"number\",\"default\":2.5}}},\"rubber\":{\"type\":\"object\",\"properties\":{\"min\":{\"type\":\"number\",\"default\":0.6},\"max\":{\"type\":\"number\",\"default\":1.4},\"deadZone\":{\"type\":\"number\",\"description\":\"metres of gap with no effect\",\"default\":20},\"scale\":{\"type\":\"number\",\"description\":\"metres; tanh scale beyond the dead zone. 60: a leader 100 m up the road is at rb 0.67 and has lost ~21 % power, so a player closes 100 m in ~25 s (test drive, 2026-09-21)\",\"default\":60},\"powerFrom\":{\"type\":\"number\",\"description\":\"rb below this cuts power (top-speed cap); above it only skill moves\",\"default\":0.85},\"skillGain\":{\"type\":\"number\",\"description\":\"skill += (rb − 1) × gain\",\"default\":1.25},\"shortcutRb\":{\"type\":\"number\",\"description\":\"rubber band at or above which a narrow shortcut is taken as a catch-up\",\"default\":1.15},\"fieldPaceSpread\":{\"type\":\"number\",\"description\":\"seeded per-race pace governor spread across the AI field, fraction of legal " +
"top speed\",\"default\":0.075}}},\"items\":{\"type\":\"object\",\"properties\":{\"forwardRange\":{\"type\":\"number\",\"default\":45},\"forwardCone\":{\"type\":\"number\",\"description\":\"rad\",\"default\":0.2},\"homingRange\":{\"type\":\"number\",\"default\":90},\"rearRange\":{\"type\":\"number\",\"default\":15},\"defenceRadius\":{\"type\":\"number\",\"default\":6},\"holdMax\":{\"type\":\"number\",\"default\":8},\"holdMin\":{\"type\":\"number\",\"default\":5,\"description\":\"seconds an AI keeps a new item before an attack, a boost, a ride or the fog: only a threat, a tailgater, a close kart or the grass uses it sooner (24 Sept 2026: used at once, the slot sat empty 80% of the race; Mario Kart World racers carry an item most of the time)\"},\"speedItemGap\":{\"type\":\"number\",\"default\":80},\"straightTurn\":{\"type\":\"number\",\"description\":\"rad; |turnFar| below this is a straight\",\"default\":0.15},\"anchorMin\":{\"type\":\"number\",\"description\":\"Grapple Anchor: hook a kart ahead no closer than this (m), not worth it nearer\",\"default\":10},\"anchorMax\":{\"type\":\"number\",\"description\":\"Grapple Anchor: and no farther than this (m, under the item's 50 m reach)\"" +
",\"default\":45},\"anchorAlign\":{\"type\":\"number\",\"description\":\"Grapple Anchor: only fired with the nose within this many rad of the road ahead and the nearest kart ahead within this bearing\",\"default\":0.35},\"runnerRange\":{\"type\":\"number\",\"description\":\"Wind-Up Mouse: send it when a kart is ahead within this (m)\",\"default\":60},\"springRange\":{\"type\":\"number\",\"description\":\"Pogo Spring: boing when a kart ahead is this close (m), and slam when one is inside this under you\",\"default\":7},\"equaliserMinRank\":{\"type\":\"integer\",\"description\":\"The Fog Bank only works from this place back (item.schema minPosition); the AI waits until then\",\"default\":5}}},\"autopilot\":{\"type\":\"object\",\"description\":\"a finished kart keeps rolling out of the way\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.5},\"power\":{\"type\":\"number\",\"default\":0.6}}},\"profiles\":{\"type\":\"object\",\"description\":\"Difficulty comes from the speed class: 50 easy, 100 normal, 150 hard (ai-driver Decisions 2026-09-21). 26 Sept 2026 (Adam: \\\"The races seem pretty easy\\\"): Normal races at the player's own top speed (power 0.98 to 1, skill 0.65 to " +
"0.7) and Hard at its sharpest (skill 0.95 to 1), and a Hard racer ahead of the player is held back in sharpness only, never in power (rbMin 0.6 to 0.85, at or above rubber.powerFrom); Easy is as it was (ai-driver Decisions 2026-09-26, game/difficulty.e2e.test.ts).\",\"properties\":{\"easy\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.35},\"power\":{\"type\":\"number\",\"default\":0.94},\"noise\":{\"type\":\"number\",\"default\":0.09},\"reactionMin\":{\"type\":\"number\",\"default\":0.8},\"reactionMax\":{\"type\":\"number\",\"default\":1.6},\"driftThreshold\":{\"type\":\"number\",\"default\":0.45},\"brakeAbove\":{\"type\":\"number\",\"default\":1.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":1.6},\"shortcutSkill\":{\"type\":\"number\",\"default\":1.1},\"trickChance\":{\"type\":\"number\",\"default\":0.2},\"rbMin\":{\"type\":\"number\",\"default\":0.6}}},\"normal\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.7},\"power\":{\"type\":\"number\",\"default\":1.0},\"noise\":{\"type\":\"n" +
"umber\",\"default\":0.045},\"reactionMin\":{\"type\":\"number\",\"default\":0.4},\"reactionMax\":{\"type\":\"number\",\"default\":0.9},\"driftThreshold\":{\"type\":\"number\",\"default\":0.35},\"brakeAbove\":{\"type\":\"number\",\"default\":2.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":0.8},\"shortcutSkill\":{\"type\":\"number\",\"default\":0.6},\"trickChance\":{\"type\":\"number\",\"default\":0.5},\"rbMin\":{\"type\":\"number\",\"default\":0.6}}},\"hard\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.95},\"power\":{\"type\":\"number\",\"default\":1.0},\"noise\":{\"type\":\"number\",\"default\":0.015},\"reactionMin\":{\"type\":\"number\",\"default\":0.15},\"reactionMax\":{\"type\":\"number\",\"default\":0.4},\"driftThreshold\":{\"type\":\"number\",\"default\":0.3},\"brakeAbove\":{\"type\":\"number\",\"default\":3.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":0.25},\"shortcutSkill\":{\"type\":\"number\",\"default\":0.3},\"trickChance\":{\"type\":\"number\",\"default\":0.95},\"rbMin\"" +
":{\"type\":\"number\",\"default\":0.85}}}}}}}}"),
	$defs: {
		kart: {
			description: "One kart (see karts). An owned kart has an owner and its four numbers; a twin has twinOf and no numbers.",
			type: "object",
			required: ["id", "name"],
			properties: {
				id: { type: "string" },
				name: { type: "string" },
				owner: {
					type: "string",
					description: "The racer whose signature kart it is (design §4); each racer owns exactly one."
				},
				twinOf: {
					type: "string",
					description: "An unlockable twin (design §10): the stats of this owned kart."
				},
				speed: { type: "number" },
				accel: { type: "number" },
				handling: { type: "number" },
				weight: { type: "number" }
			}
		},
		aiPersonality: {
			description: "Per-racer AI flavour (design §4). lateralBias −1..1 as a fraction of laneHalf; aggression and driftUse 0..1 are seeded roll thresholds.",
			type: "object",
			required: [
				"lateralBias",
				"aggression",
				"driftUse"
			],
			properties: {
				lateralBias: {
					type: "number",
					minimum: -1,
					maximum: 1
				},
				aggression: {
					type: "number",
					minimum: 0,
					maximum: 1
				},
				driftUse: {
					type: "number",
					minimum: 0,
					maximum: 1
				}
			}
		},
		aiProfile: {
			type: "object",
			required: [
				"skill",
				"power",
				"noise",
				"reactionMin",
				"reactionMax",
				"driftThreshold",
				"brakeAbove",
				"startPressMean",
				"startPressSpread",
				"shortcutSkill",
				"trickChance",
				"rbMin"
			],
			description: "skill 0..1 drives line, drift tier and reactions; power ≤ 1 is the top-speed cap as a fraction of the player-legal speed; noise is steer noise amplitude; brakeAbove is m/s over the corner speed before the brake comes on; reaction is seconds before an item is used; startPress is seconds before go the throttle goes down, mean ± spread; rbMin is how far the rubber band may hold back a racer ahead of the player (rubber.min at the most)."
		},
		unlockable: {
			type: "object",
			required: [
				"id",
				"name",
				"asset",
				"unlock"
			],
			properties: {
				id: { type: "string" },
				name: { type: "string" },
				asset: { type: "string" },
				unlock: {
					type: "object",
					required: ["kind"],
					properties: {
						kind: {
							type: "string",
							enum: [
								"start",
								"goldOnCup",
								"goldOnAllTracks",
								"winKnockout",
								"finishGrandPrix",
								"finishKnockout",
								"ultraTurbos"
							]
						},
						cup: { type: "string" },
						count: { type: "integer" }
					}
				}
			}
		}
	}
};
Object.freeze([
	"speed",
	"accel",
	"handling",
	"weight"
]);
var s = o.properties, c = Object.freeze(Object.fromEntries(Object.entries(s.archetypes.default).map(([e, t]) => [e, Object.freeze({ ...t })]))), l = Object.freeze({ ...s.racerClasses.default }), u = s.karts.default, d = (e) => ({
	speed: e?.speed ?? 0,
	accel: e?.accel ?? 0,
	handling: e?.handling ?? 0,
	weight: e?.weight ?? 0
}), f = Object.freeze(u.map((e) => Object.freeze({
	id: e.id,
	name: e.name,
	...e.owner ? { owner: e.owner } : {},
	...e.twinOf ? { twinOf: e.twinOf } : {},
	...d(e.twinOf ? u.find((t) => t.id === e.twinOf) : e)
})));
Object.freeze(f.map((e) => e.id));
var p = new Map(f.map((e) => [e.id, e])), m = new Map(f.filter((e) => e.owner).map((e) => [e.owner, e.id]));
Object.freeze(h(s.kartSteps.properties)), Object.freeze(h(s.kartLimits.properties)), Object.freeze(h(s.comboBounds.properties)), Object.freeze(h(s.kartPace.properties));
function h(e) {
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, structuredClone(t.default)]));
}
var g = (e) => e === void 0 ? void 0 : p.get(e), _ = (e) => typeof e == "string" && p.has(e), v = (e) => m.get(e), y = (e) => l[e];
function b(e, t) {
	let n = v(e);
	return n === void 0 ? "" : _(t) ? t : n;
}
function x(e, t, n = y(e) ?? "medium") {
	let r = c[n], i = g(v(e));
	if (!i) return r;
	let a = g(b(e, t));
	return Object.freeze({
		speed: r.speed + (a.speed - i.speed),
		accel: r.accel + (a.accel - i.accel),
		handling: r.handling + (a.handling - i.handling),
		weight: r.weight + (a.weight - i.weight),
		hook: r.hook
	});
}
//#endregion
//#region src/ui-hud/data/cast.ts
var S = Object.freeze([
	{
		id: "pip",
		name: "Pip",
		archetype: "light",
		species: "Hummingbird courier",
		personality: "Fast-talking, never stops moving",
		kart: "Delivery scooter",
		accent: "#2EC4B6",
		secondary: "#FF6F61",
		face: [
			.469,
			.215,
			.125
		]
	},
	{
		id: "momo",
		name: "Momo",
		archetype: "light",
		species: "Cat mechanic",
		personality: "Deadpan, competent",
		kart: "Stripped-down buggy",
		accent: "#3B3B3B",
		secondary: "#FFD23F",
		face: [
			.488,
			.25,
			.125
		]
	},
	{
		id: "nova",
		name: "Nova",
		archetype: "light",
		species: "Moth astronaut",
		personality: "Dreamy, drawn to the lights",
		kart: "Thruster pod",
		accent: "#B39DDB",
		secondary: "#FFFFFF",
		face: [
			.5,
			.254,
			.16
		]
	},
	{
		id: "juniper",
		name: "Juniper",
		archetype: "medium",
		species: "Fox park ranger",
		personality: "Cheerful rule-follower, secretly fierce",
		kart: "Wood-panel off-roader",
		accent: "#B7410E",
		secondary: "#2D6A4F",
		face: [
			.48,
			.203,
			.125
		]
	},
	{
		id: "otto",
		name: "Otto",
		archetype: "medium",
		species: "Otter lifeguard",
		personality: "Laid-back, waves at everyone",
		kart: "Water-scooter kart",
		accent: "#64B5F6",
		secondary: "#E53935",
		face: [
			.5,
			.188,
			.117
		]
	},
	{
		id: "sprocket",
		name: "Sprocket",
		archetype: "medium",
		species: "Wind-up robot",
		personality: "Literal, counts laps aloud",
		kart: "Tin-toy racer",
		accent: "#F5E6C8",
		secondary: "#B08D57",
		face: [
			.488,
			.277,
			.152
		]
	},
	{
		id: "boulder",
		name: "Boulder",
		archetype: "heavy",
		species: "Rock golem",
		personality: "Gentle giant, says sorry after ramming",
		kart: "Stone monster truck",
		accent: "#708090",
		secondary: "#6A994E",
		face: [
			.473,
			.207,
			.141
		]
	},
	{
		id: "gus",
		name: "Big Gus",
		archetype: "heavy",
		species: "Walrus chef",
		personality: "Booming laugh, feeds rivals after races",
		kart: "Food-truck kart",
		accent: "#E63946",
		secondary: "#FFFFFF",
		face: [
			.488,
			.207,
			.156
		]
	}
]), C = "8", w = 262144, T = (e = /* @__PURE__ */ new Date()) => e.getUTCHours() * 60 + e.getUTCMinutes();
function E(e) {
	let t = e.trim().toLowerCase();
	if (!t.includes(":")) return t;
	if (t.includes(".")) return t.slice(t.lastIndexOf(":") + 1);
	let [n, r] = t.split("::"), i = n ? n.split(":") : [], a = r ? r.split(":") : [];
	return `${(t.includes("::") ? [
		...i,
		...Array(Math.max(0, 8 - i.length - a.length)).fill("0"),
		...a
	] : t.split(":")).slice(0, 4).map((e) => (parseInt(e || "0", 16) || 0).toString(16)).join(":")}::/64`;
}
function D(e = /* @__PURE__ */ new Date()) {
	return e.getUTCFullYear() * 1e4 + (e.getUTCMonth() + 1) * 100 + e.getUTCDate();
}
function O(e, t) {
	let n = [...t].sort();
	return n[e % n.length];
}
var ee = (e) => e === "timeTrial" || e === "daily";
function k(e, t, n, r, i) {
	let a = S.find((e) => e.id === n);
	return {
		mode: e,
		trackId: t,
		speedClass: 150,
		seed: e === "timeTrial" ? 0 : r,
		racers: [{
			racerId: n,
			archetype: a?.archetype ?? "medium",
			isPlayer: !0,
			...i ? { kartId: i } : {}
		}]
	};
}
var te = /* @__PURE__ */ "fuck.cunt.nigg.bitch.whore.retard.hitler.penis.vagina.pussy.faggot.wanker.dickhead.shithead.cocksuck.wetback.kkk.siegheil.asshole.arsehole.bastard.biatch.bollock.dildo.jizz.porn.fcuk".split("."), A = /* @__PURE__ */ "shit.shitty.dick.cock.fag.slut.slutty.rape.rapist.nazi.twat.wank.kike.chink.spic.coon.tranny.beaner.heil.fuk.fck.btch.kunt.cnut.ass.arse.cum.tit.boob.sex.sexy.anal.anus.milf.wtf.stfu.homo.dyke.negro".split("."), ne = {
	0: "o",
	1: "i",
	2: "z",
	3: "e",
	4: "a",
	5: "s",
	6: "g",
	7: "t",
	8: "b",
	9: "g",
	"@": "a",
	$: "s"
};
function j(e) {
	return e.toLowerCase().replace(/[0-9@$]/g, (e) => ne[e]).replace(/[^a-z]/g, "");
}
var M = (e) => [e, e.replace(/ph/g, "f").replace(/l/g, "i").replace(/v/g, "u").replace(/q/g, "g")], re = [[/([aeiou])\1+/g, /([aeiou])\1/], [/([a-z])\1+/g, /([a-z])\1/]];
function ie(e, t, n) {
	return M(e).some((e) => t.some((t) => n(e, t)) || re.some(([r, i]) => t.some((t) => !i.test(t) && n(e.replace(r, "$1"), t))));
}
function ae(e) {
	let t = [], n = "";
	for (let r of e.split(/[ _-]+/)) {
		if (r.length === 1) {
			n += r;
			continue;
		}
		n && t.push(n), n = "", r && t.push(r, ...r.split(/(?<=[a-z])(?=[A-Z])/));
	}
	return n && t.push(n), t;
}
function oe(e) {
	if (e.replace(/[^0-9]/g, "").includes("1488") || ie(j(e), te, (e, t) => e.includes(t))) return !1;
	let t = (e) => ie(e, A, (e, t) => e === t || e === `${t}s`);
	return !ae(e).some((e) => t(j(e)) || t(e.toLowerCase().replace(/[^a-z]/g, "")));
}
function se(e, t, n = D(), r = T()) {
	if (!e || typeof e != "object") return "payload must be an object";
	let i = e;
	if (typeof i.name != "string" || !/^[A-Za-z0-9 _-]{1,16}$/.test(i.name) || !i.name.trim()) return "name must be 1–16 letters, digits, spaces, _ or -";
	if (!oe(i.name)) return "please pick another name";
	if (typeof i.trackId != "string" || !t.includes(i.trackId)) return "unknown track";
	if (typeof i.mode != "string" || !ee(i.mode)) return "mode must be timeTrial or daily";
	if (i.speedClass !== 150) return "leaderboards are 150cc only";
	if (typeof i.racerId != "string" || !S.some((e) => e.id === i.racerId)) return "unknown racer";
	if (!Number.isInteger(i.timeMs) || i.timeMs < 3e4) return "time is not a whole number of milliseconds of at least 30 s";
	if (typeof i.inputLog != "string" || i.inputLog.length === 0 || i.inputLog.length > 262144) return "input log missing or too large";
	if (i.clientVersion !== "8") return "please reload the game: new version";
	if (!_(i.kartId)) return "unknown kart";
	if (i.mode === "daily") {
		let e = i.dailySeed === ce(n) && r < 15;
		if (!Number.isInteger(i.dailySeed) || i.dailySeed !== n && !e) return "that daily challenge is closed";
		if (i.trackId !== O(i.dailySeed, t)) return "wrong track for that day";
	}
	return null;
}
function ce(e) {
	let t = Math.floor(e / 1e4), n = Math.floor(e / 100) % 100, r = e % 100;
	return D(/* @__PURE__ */ new Date(Date.UTC(t, n - 1, r) - 864e5));
}
//#endregion
//#region src/kart-controller/constants.ts
function le(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = le(r.properties));
	return t;
}
var N = Object.freeze(le(o.properties.base.properties));
function ue(e, t, n = "", r) {
	let i = x(n, r, e), a = N.speedClasses[String(t)];
	return Object.freeze({
		...structuredClone(N),
		archetype: e,
		cc: t,
		stats: i,
		kartId: b(n, r),
		baseTopSpeed: N.topSpeed,
		topSpeed: N.topSpeed * a * (1 + i.speed),
		accel: N.accel * (1 + i.accel),
		steerRate: N.steerRate * (1 + i.handling),
		mass: 1 + i.weight
	});
}
function de(e, t) {
	switch (t) {
		case "dirt": return e.gripOffroad;
		case "mud": return e.gripMud;
		case "ice": return e.gripIce;
		default: return e.gripRoad;
	}
}
//#endregion
//#region src/kart-controller/boost.ts
var fe = Object.freeze({
	none: 0,
	start: 1,
	slipstream: 1,
	drift: 2,
	pad: 3,
	item: 4,
	trick: 5
});
function pe(e) {
	return e.boost.source !== "none" && e.boost.remaining > 0;
}
function me(e, t, n, r) {
	let i = e.boostQueue;
	i.source !== "none" && i.remaining > 0 && (i.multiplier > n || i.multiplier === n && i.remaining >= r) || (i.source = t, i.multiplier = n, i.remaining = r);
}
function he(e, t, n, r, i) {
	e.boost.source = t, e.boost.multiplier = n, e.boost.remaining = r, i.push({
		type: "boostStart",
		source: t,
		multiplier: n,
		seconds: r
	});
}
function ge(e, t, n, r, i) {
	if (t === "none" || r <= 0) return !1;
	if (n = Math.min(n, N.maxBoostMultiplier), !pe(e)) return he(e, t, n, r, i), !0;
	let a = e.boost;
	if (t === a.source) return r <= a.remaining && n <= a.multiplier ? !1 : (he(e, t, Math.max(n, a.multiplier), Math.max(r, a.remaining), i), !0);
	let o = fe[t], s = fe[a.source];
	return o < s || n < a.multiplier || o === s && r <= a.remaining ? (me(e, t, n, r), !1) : (me(e, a.source, a.multiplier, a.remaining), he(e, t, n, r, i), !0);
}
function _e(e) {
	e.boost.source = "none", e.boost.multiplier = 1, e.boost.remaining = 0, e.boostQueue.source = "none", e.boostQueue.multiplier = 1, e.boostQueue.remaining = 0;
}
function ve(e, t) {
	let n = e.boostQueue;
	if (n.remaining > 0) {
		let e = n.remaining - t;
		e > 1e-9 ? n.remaining = e : (n.source = "none", n.multiplier = 1, n.remaining = 0);
	}
	if (e.boost.remaining <= 0) return;
	let r = e.boost.remaining - t;
	e.boost.remaining = r > 1e-9 ? r : 0, !(e.boost.remaining > 0) && (n.source !== "none" && n.remaining > 0 ? (e.boost.source = n.source, e.boost.multiplier = n.multiplier, e.boost.remaining = n.remaining, n.source = "none", n.multiplier = 1, n.remaining = 0) : _e(e));
}
//#endregion
//#region src/sim-math/dmath.ts
function ye(e, t) {
	let n = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	return n.setUint32(0, e >>> 0), n.setUint32(4, t >>> 0), n.getFloat64(0);
}
var P = /* @__PURE__ */ new Float64Array(2046);
P[1022] = 1;
for (let e = 1; e <= 1023; e++) P[1022 + e] = P[1021 + e] * 2;
for (let e = 1; e <= 1022; e++) P[1022 - e] = P[1023 - e] * .5;
function be(e, t) {
	return t > 1023 ? e * P[2045] * P[1022 + t - 1023] : t < -1022 ? e * P[1022 + t + 1e3] * P[22] : e * P[1022 + t];
}
function xe(e) {
	let t = 134217729 * e;
	return t - (t - e);
}
var Se = 7.450580596923828e-9, Ce = (e) => e < 0 || e === 0 && 1 / e < 0, we = -.16666666666666632, Te = .00833333333332249, Ee = -.0001984126982985795, De = 27557313707070068e-22, Oe = -2.5050760253406863e-8, ke = 158969099521155e-24, Ae = .0416666666666666, je = -.001388888888887411, Me = 2480158728947673e-20, Ne = -2.7557314351390663e-7, Pe = 2.087572321298175e-9, Fe = -11359647557788195e-27;
function Ie(e, t, n) {
	let r = e * e, i = r * r, a = Te + r * (Ee + r * De) + r * i * (Oe + r * ke), o = r * e;
	return n === 0 ? e + o * (we + r * a) : e - (r * (.5 * t - o * a) - t - o * we);
}
function Le(e, t) {
	let n = e * e, r = n * n, i = n * (Ae + n * (je + n * Me)) + r * r * (Ne + n * (Pe + n * Fe)), a = .5 * n, o = 1 - a;
	return o + (1 - o - a + (n * i - e * t));
}
var Re = .3333333333333341, ze = .13333333333320124, Be = .05396825397622605, Ve = .021869488294859542, He = .0088632398235993, Ue = .0035920791075913124, We = .0014562094543252903, Ge = .0005880412408202641, Ke = .0002464631348184699, qe = 7817944429395571e-20, Je = 7140724913826082e-20, Ye = -18558637485527546e-21, Xe = 2590730518636337e-20, Ze = .7853981633974483, Qe = 3061616997868383e-32, $e = ye(1072010280, 0);
function et(e, t, n) {
	let r = e < 0, i = Math.abs(e) >= $e;
	i && (r && (e = -e, t = -t), e = Ze - e + (Qe - t), t = 0);
	let a = e * e, o = a * a, s = ze + o * (Ve + o * (Ue + o * (Ge + o * (qe + o * Ye)))), c = a * (Be + o * (He + o * (We + o * (Ke + o * (Je + o * Xe))))), l = a * e;
	if (s = t + a * (l * (s + c) + t), s += Re * l, o = e + s, i) return c = n, (r ? -1 : 1) * (c - 2 * (e - (o * o / (o + c) - s)));
	if (n === 1) return o;
	let u = xe(o);
	c = s - (u - e);
	let d = -1 / o, f = xe(d);
	return f + d * (1 + f * u + f * c);
}
var tt = 3.141592653589793, nt = .6366197723675814, rt = 1.5707963267341256, it = 6077100506506192e-26, at = 6077100506303966e-26, ot = 20222662487959506e-37, st = 20222662487111665e-37, ct = 84784276603689e-45, lt = ye(1072243195, 4294967295), F = 0, ut = 0, dt = 1647099.3291652855, ft = 2 * tt;
function pt(e) {
	Math.abs(e) > dt && (e %= ft);
	let t = Math.round(e * nt), n = e - t * rt, r = t * it, i = n;
	r = t * at, n = i - r, r = t * ot - (i - n - r), i = n, r = t * st, n = i - r, r = t * ct - (i - n - r), F = n - r, ut = n - F - r;
	let a = t % 4;
	return a < 0 ? a + 4 : a;
}
function I(e) {
	if (Math.abs(e) <= lt) return Math.abs(e) < Se ? e : Ie(e, 0, 0);
	if (!(Math.abs(e) < Infinity)) return NaN;
	switch (pt(e)) {
		case 0: return Ie(F, ut, 1);
		case 1: return Le(F, ut);
		case 2: return -Ie(F, ut, 1);
		default: return -Le(F, ut);
	}
}
function mt(e) {
	if (Math.abs(e) <= lt) return Le(e, 0);
	if (!(Math.abs(e) < Infinity)) return NaN;
	switch (pt(e)) {
		case 0: return Le(F, ut);
		case 1: return -Ie(F, ut, 1);
		case 2: return -Le(F, ut);
		default: return Ie(F, ut, 1);
	}
}
function ht(e) {
	if (Math.abs(e) <= lt) return Math.abs(e) < Se ? e : et(e, 0, 1);
	if (!(Math.abs(e) < Infinity)) return NaN;
	let t = pt(e);
	return et(F, ut, t & 1 ? -1 : 1);
}
var gt = [
	.4636476090008061,
	.7853981633974483,
	.982793723247329,
	1.5707963267948966
], _t = [
	22698777452961687e-33,
	3061616997868383e-32,
	13903311031230998e-33,
	6123233995736766e-32
], vt = .3333333333333293, yt = -.19999999999876483, bt = .14285714272503466, xt = -.11111110405462356, St = .09090887133436507, Ct = -.0769187620504483, wt = .06661073137387531, Tt = -.058335701337905735, Et = .049768779946159324, Dt = -.036531572744216916, Ot = .016285820115365782, kt = 0x40000000000000000;
function At(e) {
	let t = Math.abs(e), n = e < 0;
	if (t >= kt) return t === t ? e > 0 ? gt[3] + _t[3] : -gt[3] - _t[3] : e;
	let r;
	if (t < .4375) {
		if (t < Se) return e;
		r = -1;
	} else e = t, t < 1.1875 ? t < .6875 ? (r = 0, e = (2 * e - 1) / (2 + e)) : (r = 1, e = (e - 1) / (e + 1)) : t < 2.4375 ? (r = 2, e = (e - 1.5) / (1 + 1.5 * e)) : (r = 3, e = -1 / e);
	let i = e * e, a = i * i, o = i * (vt + a * (bt + a * (St + a * (wt + a * (Et + a * Ot))))), s = a * (yt + a * (xt + a * (Ct + a * (Tt + a * Dt))));
	if (r < 0) return e - e * (o + s);
	let c = gt[r] - (e * (o + s) - _t[r] - e);
	return n ? -c : c;
}
var jt = 3.141592653589793, Mt = 12246467991473532e-32, Nt = 1.5707963267948966, Pt = .7853981633974483, Ft = 0x1000000000000000, It = 8673617379884035e-34;
function Lt(e, t) {
	if (t !== t || e !== e) return NaN;
	if (t === 1) return At(e);
	let n = +!!Ce(e) | (Ce(t) ? 2 : 0);
	if (e === 0) return n < 2 ? e : n === 2 ? jt : -3.141592653589793;
	if (t === 0) return n & 1 ? -1.5707963267948966 : Nt;
	if (t === Infinity || t === -Infinity) return e === Infinity || e === -Infinity ? [
		Pt,
		-.7853981633974483,
		3 * Pt,
		-3 * Pt
	][n] : [
		0,
		-0,
		jt,
		-3.141592653589793
	][n];
	if (e === Infinity || e === -Infinity) return n & 1 ? -1.5707963267948966 : Nt;
	let r = Math.abs(e / t), i, a = n;
	switch (r > Ft ? (i = 1.5707963267948966, a &= 1) : i = n & 2 && r < It ? 0 : At(r), a) {
		case 0: return i;
		case 1: return -i;
		case 2: return jt - (i - Mt);
		default: return i - Mt - jt;
	}
}
var Rt = 1.5707963267948966, zt = 6123233995736766e-32, Bt = .7853981633974483, Vt = .16666666666666666, Ht = -.3255658186224009, Ut = .20121253213486293, Wt = -.04005553450067941, Gt = .0007915349942898145, Kt = 3479331075960212e-20, qt = -2.403394911734414, Jt = 2.0209457602335057, Yt = -.6882839716054533, Xt = .07703815055590194, Zt = ye(1072640819, 0), Qt = 1.4901161193847656e-8, $t = 6938893903907228e-33, en = (e) => e * (Vt + e * (Ht + e * (Ut + e * (Wt + e * (Gt + e * Kt))))), tn = (e) => 1 + e * (qt + e * (Jt + e * (Yt + e * Xt)));
function nn(e) {
	let t = Math.abs(e);
	if (t >= 1) return t === 1 ? e * Rt + e * zt : NaN;
	if (t < .5) {
		if (t < Qt) return e;
		let n = e * e;
		return e + e * (en(n) / tn(n));
	}
	let n = (1 - t) * .5, r = en(n), i = tn(n), a = Math.sqrt(n), o;
	if (t >= Zt) o = Rt - (2 * (a + r / i * a) - zt);
	else {
		let e = xe(a), t = (n - e * e) / (a + e);
		o = Bt - (2 * a * (r / i) - (zt - 2 * t) - (Bt - 2 * e));
	}
	return e > 0 ? o : -o;
}
function rn(e) {
	let t = Math.abs(e);
	if (t >= 1) return t === 1 ? e > 0 ? 0 : 3.141592653589793 : NaN;
	if (t < .5) {
		if (t <= $t) return 1.5707963267948966;
		let n = e * e;
		return Rt - (e - (zt - e * (en(n) / tn(n))));
	}
	if (e < 0) {
		let t = (1 + e) * .5, n = Math.sqrt(t);
		return jt - 2 * (n + (en(t) / tn(t) * n - zt));
	}
	let n = (1 - e) * .5, r = Math.sqrt(n), i = xe(r), a = (n - i * i) / (r + i);
	return 2 * (i + (en(n) / tn(n) * r + a));
}
var an = 709.782712893384, on = -745.1332191019411, sn = .6931471803691238, cn = 19082149292705877e-26, ln = 1.4426950408889634, un = .16666666666666602, dn = -.0027777777777015593, fn = 6613756321437934e-20, pn = -16533902205465252e-22, mn = 4.1381367970572385e-8, hn = ye(1071001155, 0), gn = ye(1072734898, 0), _n = 3.725290298461914e-9;
function vn(e) {
	if (e !== e) return e;
	if (e > an) return Infinity;
	if (e < on) return 0;
	let t = Math.abs(e), n = 0, r = 0, i = 0;
	if (t >= hn) t < gn ? e > 0 ? (n = e - sn, r = cn, i = 1) : (n = e + sn, r = -19082149292705877e-26, i = -1) : (i = Math.trunc(ln * e + (e < 0 ? -.5 : .5)), n = e - i * sn, r = i * cn), e = n - r;
	else if (t < _n) return 1 + e;
	let a = e * e, o = e - a * (un + a * (dn + a * (fn + a * (pn + a * mn))));
	return i === 0 ? 1 - (e * o / (o - 2) - e) : be(1 - (r - e * o / (2 - o) - n), i);
}
var yn = -.03333333333333313, bn = .0015873015872548146, xn = -793650757867488e-19, Sn = 4008217827329362e-21, Cn = -2.0109921818362437e-7, wn = ye(1078159482, 0), Tn = 5551115123125783e-32;
function En(e) {
	if (e !== e) return e;
	let t = Math.abs(e);
	if (t >= wn) {
		if (e > an) return Infinity;
		if (e < 0) return -1;
	}
	let n, r, i, a = 0;
	if (t >= hn) t < gn ? e > 0 ? (n = e - sn, r = cn, i = 1) : (n = e + sn, r = -19082149292705877e-26, i = -1) : (i = Math.trunc(ln * e + (e < 0 ? -.5 : .5)), n = e - i * sn, r = i * cn), e = n - r, a = n - e - r;
	else if (t < Tn) return e;
	else i = 0;
	let o = .5 * e, s = e * o, c = 1 + s * (yn + s * (bn + s * (xn + s * (Sn + s * Cn)))), l = 3 - c * o, u = s * ((c - l) / (6 - e * l));
	if (i === 0) return e - (e * u - s);
	if (u = e * (u - a) - a, u -= s, i === -1) return .5 * (e - u) - .5;
	if (i === 1) return e < -.25 ? -2 * (u - (e + .5)) : 1 + 2 * (e - u);
	let d;
	return i <= -2 || i > 56 ? (d = 1 - (u - e), be(d, i) - 1) : (i < 20 ? (l = 1 - P[1022 - i], d = l - (u - e)) : (l = P[1022 - i], d = e - (u + l), d += 1), be(d, i));
}
var Dn = 27755575615628914e-33;
function On(e) {
	if (e !== e) return e;
	let t = Math.abs(e), n;
	if (t < 22) {
		if (t < Dn) return e;
		if (t >= 1) n = 1 - 2 / (En(2 * t) + 2);
		else {
			let e = En(-2 * t);
			n = -e / (e + 2);
		}
	} else n = 1;
	return e < 0 ? -n : n;
}
function L(e, t) {
	return Math.sqrt(e * e + t * t);
}
function R(e, t, n) {
	return Math.sqrt(e * e + t * t + n * n);
}
//#endregion
//#region src/kart-controller/types.ts
var kn = Object.freeze({
	steer: 0,
	throttle: 0,
	brake: 0,
	drift: !1,
	item: !1,
	lookBack: !1,
	horn: !1
});
function An(e) {
	return {
		racerId: e.racerId,
		isPlayer: e.isPlayer ?? !1,
		isGhost: e.isGhost ?? !1,
		position: e.position ? [...e.position] : [
			0,
			0,
			0
		],
		heading: e.heading ?? 0,
		speed: 0,
		lateralVelocity: 0,
		verticalVelocity: 0,
		grounded: !0,
		surface: "road",
		t: e.t ?? 0,
		branch: 0,
		lap: 0,
		checkpointsHit: 0,
		distanceAlong: 0,
		slipstreamSeconds: 0,
		drift: {
			active: !1,
			phase: "idle",
			direction: 0,
			charge: 0,
			tier: 0,
			hopSeconds: 0,
			yawK: 0,
			chargeMultiplier: 1,
			chargeMultiplierRemaining: 0
		},
		airborne: {
			trickQueued: !1,
			seconds: 0,
			realAir: !1,
			lineY: 0,
			lineRate: 0,
			climb: 0
		},
		boost: {
			source: "none",
			remaining: 0,
			multiplier: 1
		},
		item: {
			held: "none",
			charges: 0,
			rouletteRemaining: 0,
			next: "none",
			nextCharges: 0,
			nextRouletteRemaining: 0
		},
		status: {
			spinRemaining: 0,
			shield: !1,
			slowedTo: 1,
			slowRemaining: 0,
			intangibleRemaining: 0,
			rideRemaining: 0,
			towRemaining: 0,
			towTarget: -1,
			falling: !1,
			fallFromY: 0,
			held: !1,
			wallEasing: !1,
			loopIndex: -1,
			loopS: 0,
			loopS0: 0,
			loopLat0: 0,
			loopSpeed: 0,
			loopAngle: 0
		},
		coins: e.coins ?? 0,
		rank: 0,
		prevDrift: !1,
		wallCooldown: 0,
		bumpCooldown: 0,
		gripScale: 1,
		boostQueue: {
			source: "none",
			remaining: 0,
			multiplier: 1
		},
		trickBuffer: 0,
		groundNormal: [
			0,
			1,
			0
		]
	};
}
function jn(e, t) {
	return (t < 0 ? e.wallLeft : e.wallRight) ?? e.wall ?? e.halfWidth;
}
function z(e) {
	return [
		I(e),
		0,
		mt(e)
	];
}
function Mn(e) {
	return [
		mt(e),
		0,
		-I(e)
	];
}
function B(e) {
	return Lt(e[0], e[2]);
}
//#endregion
//#region src/kart-controller/powers.ts
function V(e) {
	return e.status.rideRemaining > 0;
}
function Nn(e) {
	return e.status.towRemaining > 0 && e.status.towTarget >= 0;
}
function Pn(e, t) {
	return V(e) ? t.rideRadius : t.kartRadius;
}
function Fn(e, t, n, r) {
	let i = e.t + n.rideLookahead / t.length;
	i -= Math.floor(i);
	let a = t.sample(i, 0, e.branch).position;
	return r[0] = a[0], r[1] = a[1], r[2] = a[2], r;
}
function In(e, t, n, r, i) {
	if ((t.t - e.t - Math.floor(t.t - e.t)) * n.length > r.towFollowRoad) return Fn(e, n, r, i);
	let a = Mn(t.heading), o = (e.position[0] - t.position[0]) * a[0] + (e.position[2] - t.position[2]) * a[2] >= 0 ? 1 : -1;
	return i[0] = t.position[0] + a[0] * o * r.towSideOffset, i[1] = t.position[1], i[2] = t.position[2] + a[2] * o * r.towSideOffset, i;
}
function Ln(e, t, n, r, i) {
	let a = t[0] - e.position[0], o = t[2] - e.position[2];
	if (a * a + o * o > 1e-6) {
		let t = Lt(a, o) - e.heading;
		for (; t > Math.PI;) t -= 2 * Math.PI;
		for (; t < -Math.PI;) t += 2 * Math.PI;
		let n = r.pilotTurnRate * i;
		e.heading += Math.max(-n, Math.min(n, t));
	}
	e.lateralVelocity *= Math.max(0, 1 - 12 * i), e.speed = e.speed < n ? Math.min(n, e.speed + r.accel * r.pilotAccel * i) : Math.max(n, e.speed - r.overSpeedDecel * i);
}
//#endregion
//#region src/kart-controller/collide.ts
function Rn(e, t) {
	return t.mass + (pe(e) ? t.dashMassBonus : 0) + (e.status.shield ? t.shieldMassBonus : 0) + (V(e) ? t.rideMassBonus : 0);
}
function zn(e) {
	let t = z(e.heading), n = Mn(e.heading);
	return [
		t[0] * e.speed + n[0] * e.lateralVelocity,
		0,
		t[2] * e.speed + n[2] * e.lateralVelocity
	];
}
function Bn(e, t) {
	let n = z(e.heading), r = Mn(e.heading);
	e.speed = t[0] * n[0] + t[2] * n[2], e.lateralVelocity = t[0] * r[0] + t[2] * r[2];
}
function Vn(e, t, n, r, i, a, o, s = 0) {
	let c = r - Pn(e, i);
	if (Math.abs(t) <= c) {
		e.status.wallEasing = !1;
		return;
	}
	let l = Math.sign(t);
	if (s & (l < 0 ? 1 : 2)) return;
	let u = Math.abs(t) - c;
	u > i.wallEndOvershoot && (e.status.wallEasing = !0);
	let d = e.status.wallEasing ? Math.min(u, i.wallEndPushRate * a) : u;
	d >= u && (e.status.wallEasing = !1), e.position[0] -= n[0] * d * l, e.position[2] -= n[2] * d * l, Hn(e, [
		n[0] * l,
		0,
		n[2] * l
	], i, a, o);
}
function Hn(e, t, n, r, i) {
	let a = zn(e), o = a[0] * t[0] + a[2] * t[2];
	if (o <= 0) return;
	let s = L(a[0], a[2]);
	a[0] -= t[0] * o * (1 + n.wallRestitution), a[2] -= t[2] * o * (1 + n.wallRestitution);
	let c = s > 0 ? o / s : 0, l = e.wallCooldown <= 0;
	if (l && c > n.hardWallFraction) {
		let e = 1 - n.wallScrub * (c - n.hardWallFraction) / (1 - n.hardWallFraction);
		a[0] *= e, a[2] *= e;
	}
	let u = z(e.heading), d = a[0] * u[0] + a[2] * u[2];
	if (l && c > n.hardWallFraction && d > 0) {
		let t = Lt(a[0], a[2]) - e.heading;
		for (; t > Math.PI;) t -= 2 * Math.PI;
		for (; t < -Math.PI;) t += 2 * Math.PI;
		e.heading += t * n.wallDeflect;
	} else {
		let i = u[0] * t[0] + u[2] * t[2];
		if (i > 0) {
			let a = [
				u[0] - t[0] * i,
				0,
				u[2] - t[2] * i
			], o = L(a[0], a[2]);
			if (o > 1e-6) {
				let t = Lt(a[0] / o, a[2] / o) - e.heading;
				for (; t > Math.PI;) t -= 2 * Math.PI;
				for (; t < -Math.PI;) t += 2 * Math.PI;
				e.heading += Math.sign(t) * Math.min(Math.abs(t) * n.wallDeflect, n.wallDeflectRate * r);
			}
		}
	}
	Bn(e, a), l && (i.push({ type: "wall" }), e.wallCooldown = n.wallCooldownSeconds);
}
function Un(e, t, n) {
	return Math.abs(e.position[1] - t.position[1]) < n.contactHeight;
}
function Wn(e) {
	return e.isGhost || e.status.intangibleRemaining > 0;
}
function Gn(e, t, n, r, i, a, o, s) {
	if (Wn(e) || Wn(t) || !Un(e, t, i)) return !1;
	let c = t.position[0] - e.position[0], l = t.position[2] - e.position[2], u = L(c, l), d = Pn(e, n) + Pn(t, r);
	if (u >= d || u === 0) return !1;
	let f = c / u, p = l / u, m = Rn(e, n), h = Rn(t, r), g = m + h, _ = zn(e), v = zn(t), y = (_[0] - v[0]) * f + (_[2] - v[2]) * p;
	y > 0 && (_[0] -= f * y * (h / g), _[2] -= p * y * (h / g), v[0] += f * y * (m / g), v[2] += p * y * (m / g));
	let b = Math.min(d - u, Math.max(i.bumpSeparateRate, y) * a);
	e.position[0] -= f * b * (h / g), e.position[2] -= p * b * (h / g), t.position[0] += f * b * (m / g), t.position[2] += p * b * (m / g);
	let x = e.bumpCooldown <= 0 && t.bumpCooldown <= 0;
	if (x) {
		let e = i.bumpForce * (h / g), t = i.bumpForce * (m / g);
		_[0] -= f * e, _[2] -= p * e, v[0] += f * t, v[2] += p * t;
	}
	return (y > 0 || x) && (Bn(e, _), Bn(t, v)), !x || (e.bumpCooldown = i.bumpCooldownSeconds, t.bumpCooldown = i.bumpCooldownSeconds, o.push({
		type: "bump",
		otherId: t.racerId
	}), s.push({
		type: "bump",
		otherId: e.racerId
	}), !0);
}
//#endregion
//#region src/kart-controller/steer.ts
function Kn(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function qn(e, t, n) {
	return e + (t - e) * n;
}
function Jn(e, t) {
	return (1 + Kn(e * t, -1, 1)) / 2;
}
function Yn(e) {
	return Kn(2 * e - 1, -1, 1);
}
function Xn(e, t, n) {
	return t <= 0 ? 1 : (1 - n.steerFalloff * Math.min(1, Math.abs(e) / t)) / (1 - n.steerFalloff);
}
function Zn(e, t, n, r) {
	if (e.drift.phase === "drifting") {
		let t = qn(n.driftSteerMin, n.driftSteerMax, e.drift.yawK);
		return e.drift.direction * n.steerRate * t * Xn(e.speed, r, n);
	}
	let i = Math.abs(e.speed);
	if (i <= 0 || r <= 0) return 0;
	let a = Math.min(1, i / (n.steerLowSpeed * r)) * (1 - n.steerFalloff * Math.min(1, i / r)), o = e.grounded ? 1 : n.airSteer, s = t.steer * n.steerRate * a * o;
	return e.speed < 0 ? -s : s;
}
function Qn(e, t) {
	if (t === 0) return;
	let n = mt(t), r = I(t), i = e.speed, a = e.lateralVelocity;
	e.heading += t, e.speed = i * n + a * r, e.lateralVelocity = a * n - i * r;
}
function $n(e, t, n) {
	e.lateralVelocity -= e.lateralVelocity * Math.min(1, t * n);
}
function er(e, t, n, r, i, a) {
	if (e.drift.phase === "drifting") {
		let r = 1 - vn(-a / n.driftYawLag);
		e.drift.yawK += (Jn(t.steer, e.drift.direction) - e.drift.yawK) * r;
	}
	let o = Zn(e, t, n, r) * a;
	return Qn(e, o), $n(e, i, a), o;
}
//#endregion
//#region src/kart-controller/drift.ts
function tr(e, t, n = Infinity) {
	let r = 0;
	for (let n of t) e >= n && r++;
	return Math.min(r, n);
}
function nr(e) {
	return !e.grounded && (e.airborne.fromJumpId !== void 0 || e.airborne.realAir);
}
function rr(e, t) {
	e.airborne.trickQueued || (e.airborne.trickQueued = !0, e.trickBuffer = 0, t.push({ type: "trick" }));
}
function H(e) {
	e.drift.active = !1, e.drift.phase = "idle", e.drift.direction = 0, e.drift.charge = 0, e.drift.tier = 0, e.drift.hopSeconds = 0;
}
function ir(e, t, n) {
	let r = e.drift;
	r.phase = "drifting", r.active = !0, r.direction = t, r.charge = 0, r.tier = 0, r.yawK = 0, n.push({
		type: "driftStart",
		direction: t
	});
}
function ar(e, t, n) {
	let r = e.drift.tier;
	n.push({
		type: "driftEnd",
		tier: r
	}), r > 0 && ge(e, "drift", t.boostMultiplier, t.boostSeconds[r - 1], n), H(e);
}
function or(e, t, n, r, i, a, o = {}) {
	let s = t.drift && !e.prevDrift;
	e.prevDrift = t.drift;
	let c = e.drift;
	switch (s && nr(e) ? rr(e, a) : s && (e.trickBuffer = n.trickBufferSeconds), c.phase) {
		case "idle":
			s && e.grounded && e.speed >= n.driftMinSpeed * r ? (c.phase = "hopping", c.hopSeconds = 0, e.verticalVelocity = n.hopVelocity, e.grounded = !1, a.push({ type: "hop" })) : !s && t.drift && e.grounded && Math.abs(t.steer) >= n.driftLateSteer && e.speed >= n.driftMinSpeed * r && ir(e, Math.sign(t.steer), a);
			return;
		case "hopping":
			if (c.hopSeconds += i, !e.grounded) {
				c.hopSeconds > n.hopSeconds * n.hopLandWindow && H(e);
				return;
			}
			t.drift && t.steer !== 0 && e.speed >= n.driftMinSpeed * r ? ir(e, Math.sign(t.steer), a) : H(e);
			return;
		case "drifting": {
			if (e.speed < n.driftKeepSpeed * r) {
				H(e);
				return;
			}
			if (!e.grounded && e.airborne.seconds > n.driftAirCancelSeconds) {
				H(e);
				return;
			}
			if (!t.drift) {
				ar(e, n, a);
				return;
			}
			let s = Jn(t.steer, c.direction) >= .5 ? n.chargeFull : n.chargeNeutral, l = c.chargeMultiplierRemaining > 0 ? c.chargeMultiplier : 1;
			c.charge += s * i * 60 * l;
			let u = tr(c.charge, n.driftTiers, o.maxDriftTier ?? n.driftTiers.length);
			u !== c.tier && (c.tier = u, a.push({
				type: "driftTierUp",
				tier: u
			}));
			return;
		}
	}
}
//#endregion
//#region src/kart-controller/loop.ts
var sr = Math.PI * 2;
function cr(e) {
	return e.status.loopIndex >= 0;
}
function lr(e) {
	return e.approach + sr * e.radius + e.exit;
}
var ur = (e) => {
	let t = Math.max(0, Math.min(1, e));
	return t * t * (3 - 2 * t);
};
function dr(e, t, n) {
	let r = -e.shift / 2 + Math.max(-1, Math.min(1, t / n)) * e.spread;
	return [r, r + e.shift];
}
function fr(e, t) {
	let n = e.sample(t.t, 0, 0), r = L(n.tangent[0], n.tangent[2]) || 1, i = n.tangent[0] / r, a = n.tangent[2] / r;
	return {
		origin: [...n.position],
		forward: [
			i,
			0,
			a
		],
		right: [
			a,
			0,
			-i
		],
		halfWidth: n.halfWidth
	};
}
function pr(e, t, n) {
	let r = e.sample(t, n, 0);
	return {
		position: [
			r.position[0],
			r.position[1] + Sr(e, t, 0, n, r.halfWidth),
			r.position[2]
		],
		tangent: r.tangent
	};
}
function mr(e, t, n, r, i = 0) {
	let a = e.length, o = fr(e, t), [s, c] = dr(t, n, o.halfWidth), l = sr * t.radius;
	if (r < t.approach) {
		let o = t.t + (r - t.approach) / a, c = Math.max(1e-6, t.approach - i), l = Math.max(0, Math.min(1, (r - i) / c)), u = n + (s - n) * ur(l), d = (s - n) * 6 * l * (1 - l) / c, f = pr(e, o, u);
		return {
			position: f.position,
			heading: B(f.tangent) + At(d),
			angle: 0,
			t: o
		};
	}
	if (r < t.approach + l) {
		let e = (r - t.approach) / t.radius, n = s + (c - s) * (e / sr), i = t.radius * I(e), a = t.radius * (1 - mt(e)), l = o.origin;
		return {
			position: [
				l[0] + o.right[0] * n + o.forward[0] * i,
				l[1] + a,
				l[2] + o.right[2] * n + o.forward[2] * i
			],
			heading: B(o.forward),
			angle: e,
			t: t.t
		};
	}
	let u = t.t + Math.min(r - t.approach - l, t.exit) / a, d = pr(e, u, c);
	return {
		position: d.position,
		heading: B(d.tangent),
		angle: 0,
		t: u
	};
}
function hr(e, t, n, r, i, a, o = 0) {
	let s = e.status;
	s.loopIndex = t, s.loopS = o, s.loopS0 = o, s.loopLat0 = r, s.loopSpeed = Math.max(Math.abs(e.speed), i.topSpeed * i.loopSpeedFactor), s.loopAngle = 0, s.intangibleRemaining = Math.max(s.intangibleRemaining, (lr(n) - o) / s.loopSpeed + .2), H(e), a.push({
		type: "loop",
		phase: "start"
	});
}
function gr(e, t, n, r, i) {
	let a = e.status, o = t.loops?.[a.loopIndex];
	if (!o) {
		a.loopIndex = -1, a.loopAngle = 0;
		return;
	}
	let s = lr(o);
	a.loopS = Math.min(s, a.loopS + a.loopSpeed * r);
	let c = mr(t, o, a.loopLat0, a.loopS, a.loopS0);
	e.position[0] = c.position[0], e.position[1] = c.position[1], e.position[2] = c.position[2], e.heading = c.heading, e.t = (c.t % 1 + 1) % 1, e.branch = 0, e.distanceAlong = e.t * t.length, e.speed = a.loopSpeed, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !0, a.loopAngle = c.angle, !(a.loopS < s) && (a.loopIndex = -1, a.loopAngle = 0, ge(e, "pad", n.padMultiplier, n.padSeconds, i), i.push({
		type: "loop",
		phase: "end"
	}));
}
//#endregion
//#region src/kart-controller/ground.ts
function _r(e, t, n, r = 0) {
	let i = e.sample(t, 0, r), a = [
		i.tangent[2],
		0,
		-i.tangent[0]
	], o = n[0] - i.position[0], s = n[2] - i.position[2];
	return {
		lateral: o * a[0] + s * a[2],
		right: a
	};
}
var vr = (e) => (e % 1 + 1) % 1;
function yr(e, t, n) {
	let r = vr(t - e);
	if (r === 0 || r > .5) return !1;
	let i = vr(n - e);
	return i > 0 && i <= r;
}
function br(e, t, n, r) {
	if (e === "hump") {
		if (Math.abs(r) >= t / 2) return 0;
		let e = mt(Math.PI * r / t);
		return n * e * e;
	}
	return r >= 0 && r < t ? n * (1 - r / t) : 0;
}
function xr(e, t, n) {
	if (!e) return 1;
	let r = (n - Math.abs(t)) / e;
	return r >= 1 ? 1 : r <= 0 ? 0 : r * r * (3 - 2 * r);
}
function Sr(e, t, n, r = 0, i = Infinity, a = 0) {
	let o = 0, s = e.length;
	for (let c of e.jumps) {
		if (!c.rise || !c.run || (c.branch ?? 0) !== n) continue;
		let e = xr(c.edge, r, i);
		if (!c.edge && Math.abs(r) > i) {
			let t = c.skirt && !(a & (r < 0 ? 1 : 2)) ? 1 - (Math.abs(r) - i) / c.skirt : 0;
			if (t <= 0) continue;
			e = t * t * (3 - 2 * t);
		}
		let l = (c.t - t) * s;
		l > s / 2 ? l -= s : l < -s / 2 && (l += s);
		let u = br(c.shape, c.run, c.rise, l) * e;
		u > o && (o = u);
	}
	return o;
}
function Cr(e, t, n, r) {
	for (let i of e.jumps) if (i.shape !== "hump" && i.rise && (i.branch ?? 0) === n && Math.abs(vr(i.t - t + .5) - .5) * e.length < r) return !0;
	return !1;
}
function wr(e, t, n) {
	let r = vr(e - t);
	return r === 0 || r > .5 ? !1 : vr(n - t) < r;
}
function Tr(e, t, n, r, i) {
	for (let a of e.jumps) if (a.shape !== "hump" && a.rise && (a.branch ?? 0) === r && wr(t, n, a.t) && Math.abs(i) <= e.sample(a.t, 0, r).halfWidth + (a.skirt ?? 0) / 2) return a;
}
var Er = .25;
function Dr(e, t, n, r, i, a, o) {
	let s = a.normal, c = s[0], l = s[1], u = s[2], d = t.jumps.length ? Sr(t, n + Er / t.length, r, i, a.halfWidth, a.open ?? 0) : 0;
	if (o > 0 || d > 0) {
		let e = (d - o) / Er, t = a.tangent;
		c -= t[0] * e, l -= t[1] * e, u -= t[2] * e;
	}
	let f = R(c, l, u) || 1;
	e[0] = c / f, e[1] = l / f, e[2] = u / f;
}
function Or(e, t, n, r, i, a, o, s, c, l, u) {
	let d = [
		r,
		i,
		a
	], f = t.sample(c, _r(t, c, d, l).lateral, l), p = [
		r - o * u,
		i,
		a - s * u
	], m = t.nearest(p, {
		t: c,
		branch: l
	}, n.tSearchWindow), h = _r(t, m.t, p, m.branch).lateral, g = t.sample(m.t, h, m.branch), _ = !g.overCliff && !f.overCliff;
	return e.airborne.lineY = i, e.airborne.lineRate = _ ? (i - g.groundY - Sr(t, m.t, m.branch, h, g.halfWidth, g.open ?? 0)) / u : 0, e.airborne.realAir = !1, _ ? (f.groundY - g.groundY) / u : 0;
}
function kr(e, t, n, r, i) {
	let a = z(e.heading), o = Mn(e.heading), s = a[0] * e.speed + o[0] * e.lateralVelocity, c = a[2] * e.speed + o[2] * e.lateralVelocity, l = e.position[0], u = e.position[1], d = e.position[2], f = e.branch;
	e.position[0] += s * r, e.position[2] += c * r;
	let p = e.t, m = t.nearest(e.position, {
		t: e.t,
		branch: e.branch
	}, n.tSearchWindow);
	e.t = m.t, e.branch = m.branch;
	let { lateral: h, right: g } = _r(t, e.t, e.position, e.branch), _ = e.grounded && Cr(t, e.t, e.branch, n.lipZone) ? t.nearest([
		l,
		e.position[1],
		d
	], {
		t: p,
		branch: f
	}, n.tSearchWindow).t : p, v = e.grounded ? Tr(t, _, e.t, e.branch, h) : void 0;
	if (v) {
		let a = t.sample(v.t, 0, e.branch).tangent, o = L(a[0], a[2]) || 1, s = [
			-a[0] / o,
			0,
			-a[2] / o
		], c = e.position[0] - l, u = e.position[2] - d, p = c * s[0] + u * s[2];
		e.position[0] = l + c - s[0] * p, e.position[2] = d + u - s[2] * p, e.branch = f;
		let m = t.length, y = (e) => (vr(e - v.t + .5) - .5) * m;
		e.t = t.nearest(e.position, {
			t: _,
			branch: f
		}, n.tSearchWindow).t;
		let b = y(_) - y(e.t);
		b > 0 && (e.position[0] -= s[0] * b, e.position[2] -= s[2] * b, e.t = _), {lateral: h, right: g} = _r(t, e.t, e.position, e.branch);
		let x = t.sample(e.t, h, e.branch), S = h < 0 ? -1 : 1;
		if (Math.abs(h) >= jn(x, h) - Pn(e, n) && !((x.open ?? 0) & (S < 0 ? 1 : 2))) {
			s[0] += g[0] * S, s[2] += g[2] * S;
			let e = L(s[0], s[2]);
			s[0] /= e, s[2] /= e;
		}
		Hn(e, s, n, r, i);
	}
	e.distanceAlong = e.t * t.length;
	let y = t.sample(e.t, h, e.branch), b = e.grounded, x = !1;
	if (!e.grounded && e.airborne.seconds === 0 && e.drift.phase === "hopping" && e.drift.hopSeconds === 0) {
		let i = Or(e, t, n, l, u, d, s, c, p, f, r);
		e.verticalVelocity += i, e.airborne.climb = i, x = !0;
	}
	if (e.grounded || e.drift.phase === "hopping") {
		for (let n of t.jumps) if ((n.branch ?? 0) === e.branch && yr(p, e.t, n.t) && Math.abs(h) <= y.halfWidth) {
			let t = e.drift.phase === "hopping";
			e.verticalVelocity = Math.max(e.verticalVelocity, n.launch), e.grounded = !1, e.airborne.fromJumpId = n.id, e.airborne.seconds = 0, e.airborne.climb = 0, x = !1, i.push({
				type: "launched",
				jumpId: n.id
			}), (e.trickBuffer > 0 || t) && rr(e, i), e.trickBuffer = 0;
			break;
		}
	}
	if (e.grounded) {
		for (let r of t.boostPads) if ((r.branch ?? 0) === e.branch && yr(p, e.t, r.t) && Math.abs(h - r.lateral) <= r.halfWidth) {
			ge(e, "pad", n.padMultiplier, n.padSeconds, i);
			break;
		}
	}
	let S = e.surface;
	e.verticalVelocity -= n.gravity * r, e.position[1] += e.verticalVelocity * r;
	let C = e.position[1];
	y.overCliff && !e.status.falling ? (e.status.falling = !0, e.status.fallFromY = y.groundY) : e.status.falling && !y.overCliff && Math.abs(y.groundY - e.status.fallFromY) < n.groundCatch && C >= y.groundY - n.groundCatch && (e.status.falling = !1);
	let w = e.status.falling ? 0 : Sr(t, e.t, e.branch, h, y.halfWidth, y.open ?? 0), T = e.status.falling ? -Infinity : y.groundY + w, E = e.verticalVelocity - (e.grounded ? 0 : e.airborne.climb) <= n.groundLaunchVy, D = !b && C < T - Math.max(Math.abs(e.verticalVelocity) * r + n.groundStick, n.groundCatch);
	if (C < T && !D && (e.position[1] = T, E && (e.verticalVelocity = 0)), C <= T + n.groundStick && E && !D ? (e.position[1] = T, e.verticalVelocity = 0, e.grounded = !0) : e.grounded = !1, e.grounded) {
		if (e.surface = y.surface, e.gripScale = y.gripScale, Dr(e.groundNormal, t, e.t, e.branch, h, y, w), y.surface === "boost" && (S !== "boost" || !b) && ge(e, "pad", n.padMultiplier, n.padSeconds, i), !b) {
			let t = e.airborne.trickQueued;
			i.push({
				type: "landed",
				fromJumpId: e.airborne.fromJumpId,
				trick: t
			}), t && ge(e, "trick", n.trickMultiplier, n.trickSeconds, i), e.airborne.fromJumpId = void 0, e.airborne.trickQueued = !1, e.airborne.seconds = 0, e.airborne.realAir = !1, e.airborne.climb = 0;
		}
	} else e.airborne.seconds === 0 && !x && (Or(e, t, n, l, u, d, s, c, p, f, r), e.airborne.climb = 0), e.airborne.seconds += r, !e.airborne.realAir && Number.isFinite(T) && e.airborne.lineY + e.airborne.lineRate * e.airborne.seconds - T >= n.trickDrop && (e.airborne.realAir = !0, e.trickBuffer > 0 && rr(e, i));
	let O = vr(e.t - p);
	if (e.grounded && e.branch === 0 && t.loops && !e.status.falling && O > 0 && O < .5) {
		let r = t.length;
		for (let a = 0; a < t.loops.length; a++) {
			let o = t.loops[a], s = vr(e.t - (o.t - o.approach / r)) * r;
			if (s < o.approach) {
				hr(e, a, o, h, n, i, s);
				break;
			}
		}
	}
	return (e.position[1] < t.voidY || e.status.falling && e.position[1] < e.status.fallFromY - n.fallCatchDepth) && i.push({ type: "respawn" }), {
		sample: y,
		lateral: h,
		right: g
	};
}
//#endregion
//#region src/kart-controller/slipstream.ts
function Ar(e, t, n) {
	if (t === e || t.isGhost || e.isGhost || !Un(e, t, n)) return !1;
	let r = z(t.heading), i = Mn(t.heading), a = e.position[0] - t.position[0], o = e.position[2] - t.position[2], s = a * r[0] + o * r[2], c = a * i[0] + o * i[2];
	if (s >= 0 || s < -n.slipstreamLength || Math.abs(c) > n.slipstreamHalfWidth) return !1;
	let l = z(e.heading);
	return l[0] * r[0] + l[2] * r[2] < n.slipstreamSameWayDot ? !1 : t.speed > 0 && e.speed > 0;
}
function jr(e, t, n, r, i) {
	if (!t.some((t) => Ar(e, t, n))) {
		e.slipstreamSeconds = 0;
		return;
	}
	e.slipstreamSeconds += r, e.slipstreamSeconds >= n.slipstreamSeconds && (ge(e, "slipstream", n.slipstreamMultiplier, n.slipstreamBoostSeconds, i), e.slipstreamSeconds = 0);
}
//#endregion
//#region src/kart-controller/speed.ts
function Mr(e, t) {
	let n = Math.min(e.coins, t.coinCap), r = t.topSpeed * (1 + n * t.coinBonusEach), i = pe(e), a = r;
	i && (a *= e.boost.multiplier), e.status.slowRemaining > 0 && (a = Math.min(a, r * e.status.slowedTo));
	let o = i && t.boostIgnoresSurfaceCap || !e.grounded && t.airborneIgnoresSurfaceCap, s = t.surfaceSpeed[e.surface] ?? 1, c = r;
	return o || (a = Math.min(a, r * s), c = r * s), {
		base: r,
		effective: c,
		target: a
	};
}
function Nr(e, t, n) {
	let r = t > 0 ? Math.min(1, Math.max(0, e) / t) : 1;
	return n.accel * (n.accelLaunch - n.accelTaper * r * r);
}
function Pr(e, t, n, r, i) {
	let a = e.speed, o = t.brake > 0 && t.throttle <= 0;
	if (a > n) {
		e.speed = o ? Math.max(0, a - Math.max(r.overSpeedDecel, r.brake * t.brake) * i) : Math.max(n, a - r.overSpeedDecel * i);
		return;
	}
	if (o) {
		e.speed = a > 0 ? Math.max(0, a - r.brake * t.brake * i) : Math.max(-r.reverseFraction * n, a - r.accel * t.brake * i);
		return;
	}
	if (t.throttle > 0) {
		e.speed = Math.min(n, a + Nr(a, n, r) * t.throttle * i);
		return;
	}
	a > 0 ? e.speed = Math.max(0, a - r.coastDecel * i) : a < 0 && (e.speed = Math.min(0, a + r.coastDecel * i));
}
var Fr = 1 / 120, Ir = 1e-9;
function Lr(e, t) {
	let n = e - t;
	return n > Ir ? n : 0;
}
function Rr(e, t) {
	ve(e, t), e.status.spinRemaining = Lr(e.status.spinRemaining, t), e.status.slowRemaining = Lr(e.status.slowRemaining, t), e.status.slowRemaining === 0 && (e.status.slowedTo = 1), e.status.intangibleRemaining = Lr(e.status.intangibleRemaining, t), e.drift.chargeMultiplierRemaining = Lr(e.drift.chargeMultiplierRemaining, t), e.drift.chargeMultiplierRemaining === 0 && (e.drift.chargeMultiplier = 1), e.wallCooldown = Lr(e.wallCooldown, t), e.bumpCooldown = Lr(e.bumpCooldown, t), e.trickBuffer = Lr(e.trickBuffer, t), e.status.rideRemaining = Lr(e.status.rideRemaining, t), e.status.towRemaining = Lr(e.status.towRemaining, t), e.status.towRemaining === 0 && (e.status.towTarget = -1);
}
var zr = [
	0,
	0,
	0
], Br = [
	0,
	0,
	0
];
function Vr(e, t, n, r, i, a = {}, o) {
	let s = [], c = e.status.spinRemaining > 0;
	if (Rr(e, i), e.status.held) return e.prevDrift = t.drift, s;
	if (cr(e)) return e.prevDrift = t.drift, gr(e, n, r, i, s), s;
	let l = c ? kn : t;
	if (c) {
		e.prevDrift = t.drift;
		let n = e.status.spinRemaining;
		e.speed = n > 0 ? e.speed * (n / (n + i)) : 0;
	} else if (V(e) || Nn(e) && o) {
		e.prevDrift = t.drift;
		let a = Mr(e, r).base;
		V(e) ? Ln(e, Fn(e, n, r, zr), a * r.rideSpeedMultiplier, r, i) : Ln(e, o, a * r.towSpeedMultiplier, r, i), H(e);
	} else {
		let t = Mr(e, r);
		Pr(e, l, t.target, r, i);
		let n = de(r, e.surface), o = (e.drift.phase === "drifting" ? Math.min(n, r.gripDrift) : n) * e.gripScale * (e.grounded ? 1 : r.airGrip);
		er(e, l, r, t.base, o, i), or(e, l, r, t.base, i, s, a);
	}
	let u = kr(e, n, r, i, s);
	return e.status.falling || Vn(e, u.lateral, u.right, jn(u.sample, u.lateral), r, i, s, u.sample.open ?? 0), s;
}
function Hr(e, t, n, r, i, a = {}) {
	let o = e.map((o, s) => {
		let c = o.status.towTarget, l = Nn(o) && c < e.length ? In(o, e[c], n, r[s], Br) : void 0;
		return Vr(o, t[s], n, r[s], i, a, l);
	});
	for (let t = 0; t < e.length; t++) for (let n = t + 1; n < e.length; n++) cr(e[t]) || cr(e[n]) || e[t].status.held || e[n].status.held || Gn(e[t], e[n], r[t], r[n], r[t], i, o[t], o[n]);
	for (let t = 0; t < e.length; t++) !cr(e[t]) && !e[t].status.held && jr(e[t], e, r[t], i, o[t]);
	return o;
}
function Ur(e, t, n, r) {
	let i = e.coins > 0, a = Math.min(e.coins, t.hitCoinsLost);
	e.coins -= a;
	let o;
	t.coinShield.enabled && i ? (e.status.slowedTo = t.coinShield.slowedTo, e.status.slowRemaining = t.coinShield.slowSeconds, o = !1) : (e.status.spinRemaining = t.hitSpinSeconds, o = !0), H(e), _e(e), e.status.towRemaining = 0, e.status.towTarget = -1, r.push({
		type: "hit",
		kind: n,
		spun: o,
		coinsLost: a
	});
}
function Wr(e, t, n, r) {
	return Math.abs(n - t.startBoostCentreSeconds) > t.startBoostWindowSeconds / 2 ? !1 : (e.boost.source = "start", e.boost.multiplier = t.startBoostMultiplier, e.boost.remaining = t.startBoostSeconds, r.push({
		type: "boostStart",
		source: "start",
		multiplier: t.startBoostMultiplier,
		seconds: t.startBoostSeconds
	}), !0);
}
var Gr = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "track.schema.json",
	title: "TrackDefinition",
	description: "One track. The closed spline drives road mesh, checkpoints, AI line, positions, wrong-way, respawn and minimap.",
	type: "object",
	required: [
		"id",
		"name",
		"biome",
		"cup",
		"laps",
		"controlPoints",
		"checkpointCount",
		"startGrid",
		"finalLapShift",
		"medalTimesMs",
		"voidY"
	],
	properties: /* @__PURE__ */ JSON.parse("{\"id\":{\"type\":\"string\",\"pattern\":\"^[a-z0-9-]+$\"},\"name\":{\"type\":\"string\"},\"biome\":{\"type\":\"string\",\"enum\":[\"harbour\",\"meadow\",\"canyon\",\"frost\",\"boardwalk\",\"skyline\",\"temple\",\"foundry\"]},\"cup\":{\"type\":\"string\",\"enum\":[\"sunrise\",\"summit\"]},\"orderInCup\":{\"type\":\"integer\",\"minimum\":1},\"laps\":{\"type\":\"integer\",\"minimum\":1,\"default\":3},\"targetLapSeconds\":{\"type\":\"number\",\"minimum\":30,\"maximum\":90},\"medalTimesMs\":{\"description\":\"Time Trial thresholds at 150cc. Gold on every track in a cup drives unlocks (design §10).\",\"type\":\"object\",\"required\":[\"gold\",\"silver\",\"bronze\"],\"properties\":{\"gold\":{\"type\":\"integer\"},\"silver\":{\"type\":\"integer\"},\"bronze\":{\"type\":\"integer\"}}},\"voidY\":{\"type\":\"number\",\"description\":\"World Y below which a kart respawns at its last checkpoint\"},\"controlPoints\":{\"description\":\"Closed Catmull-Rom control points in world metres. halfWidth and surface apply from this point to the next.\",\"type\":\"array\",\"minItems\":8,\"items\":{\"type\":\"object\",\"required\":[\"x\",\"y\",\"z\",\"halfWidth\"],\"properties\":{\"x\":{\"type\":\"number\"}" +
",\"y\":{\"type\":\"number\"},\"z\":{\"type\":\"number\"},\"halfWidth\":{\"type\":\"number\",\"minimum\":3},\"bank\":{\"type\":\"number\",\"description\":\"Roll in degrees, positive banks into a right turn\",\"default\":0},\"surface\":{\"type\":\"string\",\"enum\":[\"road\",\"dirt\",\"mud\",\"ice\",\"boost\",\"rail\"],\"default\":\"road\"}}}},\"checkpointCount\":{\"type\":\"integer\",\"minimum\":4},\"startGrid\":{\"type\":\"object\",\"required\":[\"t\",\"rows\",\"columns\",\"spacing\"],\"properties\":{\"t\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1,\"description\":\"Spline fraction of the start line\"},\"rows\":{\"type\":\"integer\"},\"columns\":{\"type\":\"integer\"},\"spacing\":{\"type\":\"number\"}}},\"shortcuts\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"id\",\"entryT\",\"exitT\",\"controlPoints\",\"risk\"],\"properties\":{\"id\":{\"type\":\"string\"},\"entryT\":{\"type\":\"number\"},\"exitT\":{\"type\":\"number\"},\"controlPoints\":{\"$ref\":\"#/properties/controlPoints\"},\"risk\":{\"type\":\"string\",\"enum\":[\"jump\",\"narrow\",\"hazard\"]},\"openOnLaps\":{\"type\":\"array\",\"items\":{\"type\":\"integer\"},\"description\":\"Empty = always op" +
"en\"},\"tunnel\":{\"type\":\"object\",\"required\":[\"from\",\"to\"],\"description\":\"The stretch (fractions of the shortcut's length) that runs through a mine: rock walls at the curb, a timber-framed rock roof with lanterns, and the land rising over it as a mesa (the hill tunnelHill metres above the road, reached tunnelRamp metres in from each portal). Karts are held inside; the off-road beside the approach narrows to the mouth over tunnelFunnel metres.\",\"properties\":{\"from\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1},\"to\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1}}}}}},\"hazards\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"type\",\"t\"],\"properties\":{\"id\":{\"type\":\"string\"},\"type\":{\"type\":\"string\",\"enum\":[\"rolling\",\"crossing\",\"falling\",\"static\",\"gust\",\"creature\",\"vent\"]},\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\",\"default\":0},\"period\":{\"type\":\"number\",\"description\":\"Seconds between activations\"},\"speed\":{\"type\":\"number\",\"description\":\"m/s for rolling/crossing/falling; gust push strength\"},\"hit\":{\"type\":\"string\",\"enum\":[\"spin\",\"slow\",\"bump\",\"launch\"],\"" +
"default\":\"spin\"},\"offset\":{\"type\":\"number\",\"description\":\"type vent: seconds into its cycle at race time 0, so vents side by side take turns\"},\"launch\":{\"type\":\"number\",\"description\":\"type vent: m/s up it throws a kart (default builder ventLaunch)\"},\"asset\":{\"type\":\"string\"},\"creature\":{\"type\":\"string\",\"enum\":[\"rumblesaur\",\"yeti\",\"kraken\",\"crab\",\"goose\",\"whale\"],\"description\":\"type creature: the track's big creature (design §6); lateral's sign picks its side of the road\"}}}},\"offroad\":{\"type\":\"boolean\",\"default\":false,\"description\":\"The Mario Kart World edge: the land meets the curb with no strip and no wall; it is drivable (the dirt top-speed cap) out to an invisible course limit past the curb (offroadReach metres, or per stretch: courseLimit), where the roadside scenery starts. False (a pier, a sky road): a solid low edge wall at the road's edge.\"},\"courseLimit\":{\"type\":\"object\",\"description\":\"Off-road tracks: where the invisible course limit stands, stretch by stretch, as Mario Kart World sets it (Adam, 27 Sept 2026: \\\"Whatever Mario Kart World does\\\"; measured on its open-country courses with the road" +
"'s own width as the ruler: docs/sops/track-builder.md). Each value is a share of the road's width with both curbs (2 x (halfWidth + kerbWidth)), measured from the curb out: on a straight, on the outside and on the inside of a bend (by how sharply the road turns: limitBend), and on the start straight (limitStart). Between them the limit eases (limitSlope); by a shortcut's mouth it keeps offroadReach on the shortcut's side, and a tunnel's approach narrows as before. Absent: offroadReach everywhere.\",\"properties\":{\"straight\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1.5},\"outside\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1.5},\"inside\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1.5},\"start\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1.5}}},\"loops\":{\"description\":\"Loop-the-loops on the main line (design.md Track thrills). Every kart on the ground is caught before the foot at t, rides up and round the ring and is set down after it with a boost. Put one on a straight at least approach + exit metres long.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"id\",\"t\"],\"properties\":{\"id\":{\"type\":\"string\"},\"t\":{\"type\":\"number\",\"" +
"description\":\"main-line t of the ring's foot\"},\"radius\":{\"type\":\"number\",\"description\":\"metres (default builder loopRadius)\"}}}},\"openEdges\":{\"description\":\"Stretches of the main line with no wall on one or both sides (left = negative lateral). Past the shoulder there is no ground: a kart falls and the claw brings it back.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"fromT\",\"toT\",\"side\"],\"properties\":{\"fromT\":{\"type\":\"number\"},\"toT\":{\"type\":\"number\"},\"side\":{\"type\":\"string\",\"enum\":[\"left\",\"right\",\"both\"]}}}},\"jumps\":{\"description\":\"Trick ramps. Leaving a jump airborne with the hop button pressed awards a trick boost.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"id\",\"t\",\"launch\"],\"properties\":{\"id\":{\"type\":\"string\"},\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\",\"default\":0},\"width\":{\"type\":\"number\"},\"launch\":{\"type\":\"number\",\"description\":\"Vertical launch speed m/s\"},\"shape\":{\"type\":\"string\",\"enum\":[\"ramp\",\"hump\"],\"default\":\"ramp\",\"description\":\"ramp: a striped wedge across the road up to a lip at t; hump: a trick bump" +
" (dune, mogul) whose crest is at t (design.md Track thrills)\"},\"run\":{\"type\":\"number\",\"description\":\"metres along the road the ramp rises over, or the bump spans (default builder rampRun / humpRun)\"},\"rise\":{\"type\":\"number\",\"description\":\"metres the lip or crest stands above the road (default builder rampRise / humpRise)\"},\"shortcut\":{\"type\":\"string\",\"description\":\"Shortcut id this jump sits on; t stays main-equivalent\"}}}},\"pickups\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"t\"],\"properties\":{\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\"},\"shortcut\":{\"type\":\"string\"},\"double\":{\"type\":\"boolean\",\"description\":\"A gold double balloon: fills both item slots at once (design §8)\"}}}},\"coins\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"t\"],\"properties\":{\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\"},\"shortcut\":{\"type\":\"string\"}}}},\"boostPads\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"t\"],\"properties\":{\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\"},\"width\":{\"type\":\"number\"},\"shortcut\":{\"type\":\"str" +
"ing\"}}}},\"finalLapShift\":{\"description\":\"Exactly one readable change on the last lap. Fires once, globally, when the race leader starts the final lap.\",\"type\":\"object\",\"required\":[\"kind\",\"label\"],\"properties\":{\"kind\":{\"type\":\"string\",\"enum\":[\"flood\",\"storm\",\"collapse\",\"blizzard\",\"fireworks\",\"sunset\",\"rise\",\"reverse\"]},\"label\":{\"type\":\"string\",\"description\":\"Banner text, e.g. 'THE TIDE IS IN'\"},\"closesShortcuts\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"opensShortcuts\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"routeOverrides\":{\"description\":\"Replace a t-range of the main spline (bridges retract, rail becomes mandatory). The LUT is rebuilt once when the shift fires.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"fromT\",\"toT\",\"controlPoints\"],\"properties\":{\"fromT\":{\"type\":\"number\"},\"toT\":{\"type\":\"number\"},\"controlPoints\":{\"$ref\":\"#/properties/controlPoints\"}}}},\"surfaceOverrides\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"fromT\":{\"type\":\"number\"},\"toT\":{\"type\":\"number\"},\"surface\":{\"type\":\"string\"}}}},\"gripMult" +
"iplier\":{\"type\":\"number\",\"default\":1,\"description\":\"Global grip scale, e.g. 0.8 for wet grass\"},\"addsJumps\":{\"$ref\":\"#/properties/jumps\"},\"enablesHazards\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"disablesHazards\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"sky\":{\"type\":\"string\",\"description\":\"Sky preset id\"},\"lut\":{\"type\":\"string\"},\"fogDensity\":{\"type\":\"number\"},\"musicVariant\":{\"type\":\"string\"}}},\"environment\":{\"type\":\"object\",\"properties\":{\"sky\":{\"type\":\"string\"},\"lut\":{\"type\":\"string\"},\"fogColor\":{\"type\":\"string\"},\"fogDensity\":{\"type\":\"number\"},\"ground\":{\"description\":\"One flat plane under the whole track. 'none' for sky tracks; the void is below voidY.\",\"type\":\"object\",\"required\":[\"kind\"],\"properties\":{\"kind\":{\"type\":\"string\",\"enum\":[\"plane\",\"water\",\"none\"],\"default\":\"plane\"},\"y\":{\"type\":\"number\",\"default\":0}}},\"sunDirection\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":3,\"maxItems\":3},\"palette\":{\"type\":\"object\",\"properties\":{\"background\":{\"type\":\"string\"},\"accent\":{\"type\":\"string\"}}},\"decor\"" +
":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"asset\":{\"type\":\"string\"},\"instances\":{\"type\":\"integer\"},\"band\":{\"type\":\"string\",\"enum\":[\"roadside\",\"verge\",\"far\",\"sky\"],\"description\":\"verge: an off-road track's small ground cover (flowers, tufts, stones) on the drivable land between the curb and the course limit; visual only, karts drive through it\"},\"footing\":{\"type\":\"string\",\"enum\":[\"pier\",\"sink\"],\"description\":\"pier: out at sea, each one stands on its own wooden pier, raised pierLift above the water. sink: a set-piece whose foundation reaches 3.5 m below it, so it may stand where the land slopes\"},\"lift\":{\"type\":\"number\",\"description\":\"Metres above its band's ground: a model centred on its middle (a hazard's) sits on the ground with lift = its radius\"},\"layout\":{\"type\":\"string\",\"enum\":[\"scatter\",\"row\",\"span\"],\"default\":\"scatter\",\"description\":\"scatter: little groups with open ground between; row: runs of pieces `every` metres apart along the road, turned along it, local +X away from the road (fences, lamp posts, corner signs, a ski lift, cliff walls); span: one piece across the roa" +
"d, its legs past the course limit (bunting, a rock arch)\"},\"every\":{\"type\":\"number\",\"description\":\"row: metres between pieces along the road\"},\"run\":{\"type\":\"integer\",\"default\":6,\"description\":\"row: pieces per run\"},\"at\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"description\":\"[t0, t1]: group centres stay in this stretch of the main line (t0 > t1 wraps past the start)\"},\"side\":{\"type\":\"string\",\"enum\":[\"left\",\"right\",\"outside\",\"inside\"],\"description\":\"Which side of the road; default: the outside of corners, favoured\"},\"dist\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"description\":\"Overrides the band's [near, far] metres (past the curb for roadside and verge, from the centreline for far)\"},\"scale\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"description\":\"Random uniform scale range (default [0.7, 1.3]; rows and spans 1)\"},\"keepShape\":{\"type\":\"boolean\",\"default\":false,\"description\":\"span: grow the piece whole to the road's width instead of stretching it across (a rock arch keeps its shape)\"},\"mer" +
"ge\":{\"type\":\"boolean\",\"default\":false,\"description\":\"A code-built (vertex-coloured) model baked into the track's merged dressing chunks, one draw per chunk for every merged kind, instead of an instancer of its own\"}}}},\"landmarkFooting\":{\"type\":\"string\",\"enum\":[\"pier\"],\"description\":\"The landmark stands on a wooden pier (a sea track)\"}}},\"music\":{\"type\":\"string\"},\"landmark\":{\"type\":\"string\",\"description\":\"The thing visible from the start line\"},\"mirrored\":{\"type\":\"boolean\",\"default\":false,\"description\":\"Never authored: set by track-builder mirror.ts on a track reflected left to right for Mirror mode (design §10). Every lateral, bank and side in it is already flipped.\"},\"builder\":{\"description\":\"Track-builder constants. Never set per track; the defaults are the only values. Code reads them from here (docs/sops/track-builder.md Constants).\",\"type\":\"object\",\"properties\":{\"lutSamples\":{\"type\":\"integer\",\"default\":2048,\"description\":\"Arc-length samples per branch LUT\"},\"arcDivisions\":{\"type\":\"integer\",\"default\":4096,\"description\":\"Fine steps used to walk the curve before resampling\"},\"globalSearchSt" +
"ep\":{\"type\":\"integer\",\"default\":8,\"description\":\"Coarse stride for nearestTGlobal\"},\"branchHysteresis\":{\"type\":\"number\",\"default\":1.0,\"description\":\"metres; another branch must be closer by this much to win\"},\"branchLeaveMargin\":{\"type\":\"number\",\"default\":1.35,\"description\":\"metres inside a road edge a kart still counts as on that road; another branch can only take it once it is past this. Must exceed kartRadius (0.85): the wall holds a kart exactly one radius inside the edge, so at 0.85 nobody could ever leave\"},\"maxBankDeg\":{\"type\":\"number\",\"default\":20},\"minTurnRadiusFactor\":{\"type\":\"number\",\"default\":1.5,\"description\":\"turn radius must be >= factor × halfWidth (hairpin guard)\"},\"minStartHalfWidth\":{\"type\":\"number\",\"default\":4},\"branchBlendMetres\":{\"type\":\"number\",\"default\":14,\"description\":\"a shortcut ribbon loses its kerbs and sinks 3 cm for this long at each end, where it overlaps the main road\"},\"kerbWidth\":{\"type\":\"number\",\"default\":1.0},\"kerbHeight\":{\"type\":\"number\",\"default\":0.1},\"shoulderWidth\":{\"type\":\"number\",\"default\":6.0},\"shoulderDrop\":{\"type\":\"number\",\"default\"" +
":0.4},\"rampSkirt\":{\"type\":\"number\",\"default\":2.5,\"description\":\"Off-road tracks: metres past the curb over which a ramp's sides slope down to the sand (karts beside a ramp drive up its side instead of popping up a square edge)\"},\"tunnelWall\":{\"type\":\"number\",\"default\":4.2,\"description\":\"metres: a tunnel's side walls rise this high above the road before the roof arches over\"},\"tunnelApex\":{\"type\":\"number\",\"default\":6.2,\"description\":\"metres: the top of a tunnel's arched roof above the road\"},\"tunnelHill\":{\"type\":\"number\",\"default\":9,\"description\":\"metres: the land over a tunnel stands this high above its road (a mesa the mine runs through)\"},\"tunnelRamp\":{\"type\":\"number\",\"default\":2.5,\"description\":\"metres in from a portal over which the land rises to tunnelHill: the mesa ends in a cliff, and the portal is a rock face in it (mesh/tunnel.ts)\"},\"tunnelMesaTop\":{\"type\":\"number\",\"default\":3,\"description\":\"metres of the mesa's flat top past where a road's shoulder would end, before its sides fall away (a ridge over the mine, not a plateau)\"},\"tunnelFunnel\":{\"type\":\"number\",\"default\":16,\"description\":\"metre" +
"s before a portal over which the off-road beside the approach narrows to the curb, guiding karts into the mouth\"},\"tunnelFrameSpacing\":{\"type\":\"number\",\"default\":8,\"description\":\"metres between the timber frames inside a tunnel\"},\"tunnelLanternSpacing\":{\"type\":\"number\",\"default\":12,\"description\":\"metres between lanterns inside a tunnel (alternate walls)\"},\"offroadReach\":{\"type\":\"number\",\"default\":12,\"description\":\"Off-road tracks: metres past the curb the ground is drivable (slowly) before an invisible course limit, just short of the roadside scenery (the Mario Kart World way: no strip, no wall along the road)\"},\"offroadDrop\":{\"type\":\"number\",\"default\":0.12,\"description\":\"Off-road tracks: the ground past the curb sits this far under the road, as the land mesh draws it\"},\"limitMin\":{\"type\":\"number\",\"default\":3.5,\"description\":\"courseLimit: the least off-road past the curb anywhere but a tunnel's approach, metres (room to run wide and come back)\"},\"limitMax\":{\"type\":\"number\",\"default\":17,\"description\":\"courseLimit: the most off-road past the curb, metres (the land stays flat to about 20 m past the curb: land.ts)\"" +
"},\"limitSlope\":{\"type\":\"number\",\"default\":0.22,\"description\":\"courseLimit: metres the limit may come in or go out per metre of road (a wall angled at most about 12 degrees to the road: a kart running wide is led back, never stopped by a corner)\"},\"limitWindow\":{\"type\":\"number\",\"default\":24,\"description\":\"courseLimit: metres of road over which how sharply it turns is read\"},\"limitBend\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[110,45],\"description\":\"courseLimit: a turn of the first radius (metres) begins to count as a bend, of the second is a full bend\"},\"limitStart\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[45,45],\"description\":\"courseLimit: metres before and after the start line that take the start value (the grid and the gantry)\"},\"limitMouth\":{\"type\":\"number\",\"default\":30,\"description\":\"courseLimit: metres either side of a shortcut's ends where the main road keeps offroadReach on the shortcut's side\"},\"barrierSpacing\":{\"type\":\"number\",\"default\":2.0},\"roadTileLength\":{\"type\":\"number\",\"default\":10,\"description\":\"metres of road per UV v unit\"},\"chunkCount\":{\"type\":\"" +
"integer\",\"default\":8},\"minimapSamples\":{\"type\":\"integer\",\"default\":200},\"minimapPadding\":{\"type\":\"number\",\"default\":0.06},\"boostPadHalfLength\":{\"type\":\"number\",\"default\":1.75},\"boostPadWidth\":{\"type\":\"number\",\"default\":3.0},\"rampRun\":{\"type\":\"number\",\"default\":5,\"description\":\"metres a ramp rises over to its lip (karts drive up it: kart-controller jumpLift)\"},\"rampRise\":{\"type\":\"number\",\"default\":0.8,\"description\":\"height of a ramp's lip above the road, metres\"},\"humpRun\":{\"type\":\"number\",\"default\":8,\"description\":\"metres along the road a trick bump spans\"},\"humpRise\":{\"type\":\"number\",\"default\":1.0,\"description\":\"height of a trick bump's crest, metres\"},\"loopRadius\":{\"type\":\"number\",\"default\":9,\"description\":\"a loop-the-loop's radius, metres\"},\"loopShift\":{\"type\":\"number\",\"default\":7,\"description\":\"metres the ring moves right in one turn: the way in (left of centre) never meets the way out (right)\"},\"loopSpread\":{\"type\":\"number\",\"default\":1.2,\"description\":\"metres either side of its lane a kart rides round, by where it came in (karts side by side stay side by side)\"" +
"},\"loopApproach\":{\"type\":\"number\",\"default\":24,\"description\":\"metres before the foot a kart is caught and eased into the entry lane\"},\"loopExit\":{\"type\":\"number\",\"default\":6,\"description\":\"metres after the foot a kart is set down in the exit lane\"},\"loopWidth\":{\"type\":\"number\",\"default\":6,\"description\":\"width of the ring's track, metres\"},\"humpEdge\":{\"type\":\"number\",\"default\":1.6,\"description\":\"metres over which a trick bump rounds off to the road at each kerb\"},\"balloonHeight\":{\"type\":\"number\",\"default\":1.2},\"balloonRadius\":{\"type\":\"number\",\"default\":0.9},\"pierLift\":{\"type\":\"number\",\"default\":1.1,\"description\":\"A pier's deck stands this far above the sea (level with a sea track's coast)\"},\"coinRadius\":{\"type\":\"number\",\"default\":0.5},\"hazardRadius\":{\"type\":\"number\",\"default\":1.2},\"ventRadius\":{\"type\":\"number\",\"default\":2.2,\"description\":\"a launch vent's mouth, metres (design.md Track thrills)\"},\"ventWarnSeconds\":{\"type\":\"number\",\"default\":1.0,\"description\":\"a vent glows and bubbles this long before it erupts\"},\"ventEruptSeconds\":{\"type\":\"number\",\"default\":1.5,\"" +
"description\":\"how long a vent erupts; a kart on it then is thrown up\"},\"ventLaunch\":{\"type\":\"number\",\"default\":14,\"description\":\"m/s up a vent throws a kart, about 4 m high (a ramp is 5 to 6)\"},\"fallingActiveSeconds\":{\"type\":\"number\",\"default\":0.5},\"fallingWarnSeconds\":{\"type\":\"number\",\"default\":1.0,\"description\":\"a falling hazard drops this long before it lands (and can hit), its shadow growing on the spot\"},\"fallingHeight\":{\"type\":\"number\",\"default\":14,\"description\":\"metres above the road a falling hazard drops from\"},\"gustWindow\":{\"type\":\"number\",\"default\":6,\"description\":\"metres along the road a gust acts over\"},\"decorBands\":{\"type\":\"object\",\"properties\":{\"roadside\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[8,14]},\"roadsideOffroad\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[13,19],\"description\":\"the roadside band on an off-road track: just past the course limit, so the scenery lines the course\"},\"verge\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[2.5,11],\"description\":\"metres past the curb for an off-road track's ground cover: past a " +
"ramp's skirt (rampSkirt), inside the course limit (offroadReach)\"},\"far\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[30,120]},\"sky\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[25,60]}}},\"lapTimeWarn\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[40,65],\"description\":\"seconds; estimated lap outside this warns\"},\"trackDrawCallBudget\":{\"type\":\"integer\",\"default\":40}}}}")
}, Kr = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "race-state.schema.json",
	title: "RaceState",
	description: "The whole simulation state at one fixed-timestep tick. Deterministic given inputs and seed. Serialisable for ghosts and verification.",
	type: "object",
	required: [
		"mode",
		"trackId",
		"speedClass",
		"seed",
		"tick",
		"phase",
		"lapsTotal",
		"karts"
	],
	properties: {
		mode: {
			type: "string",
			enum: [
				"quick",
				"grandPrix",
				"knockout",
				"timeTrial",
				"daily"
			]
		},
		trackId: { type: "string" },
		speedClass: {
			type: "integer",
			enum: [
				50,
				100,
				150
			]
		},
		mirrored: {
			type: "boolean",
			default: !1
		},
		seed: { type: "integer" },
		tick: {
			type: "integer",
			description: "Fixed 120 Hz sim ticks since race start"
		},
		phase: {
			type: "string",
			enum: [
				"countdown",
				"racing",
				"finalLap",
				"finished"
			]
		},
		lapsTotal: { type: "integer" },
		finalLapShiftFired: { type: "boolean" },
		knockout: {
			type: "object",
			properties: {
				setId: {
					type: "string",
					description: "Id in cups.schema knockoutSets"
				},
				segment: { type: "integer" },
				cutLineAt: { type: "integer" },
				eliminated: {
					type: "array",
					items: { type: "string" }
				}
			}
		},
		pickupStates: {
			type: "array",
			description: "One per track pickup, by index",
			items: {
				type: "object",
				properties: { respawnRemaining: { type: "number" } }
			}
		},
		coinStates: {
			type: "array",
			description: "One per track coin, by index",
			items: {
				type: "object",
				properties: { respawnRemaining: { type: "number" } }
			}
		},
		karts: {
			type: "array",
			minItems: 1,
			maxItems: 8,
			items: {
				type: "object",
				required: [
					"racerId",
					"kartId",
					"isPlayer",
					"position",
					"heading",
					"speed",
					"lateralVelocity",
					"verticalVelocity",
					"t",
					"lap",
					"checkpointsHit",
					"drift",
					"boost",
					"item",
					"coins",
					"rank"
				],
				properties: {
					racerId: { type: "string" },
					isPlayer: { type: "boolean" },
					isGhost: {
						type: "boolean",
						default: !1,
						description: "Time Trial ghost: rendered, no collision, no items"
					},
					kartId: {
						type: "string",
						description: "The kart it drives (kart.schema.json karts id): the one picked, or the racer's own when none was (every AI racer drives their own; design §5). Looks and the leaderboard only: its handling is already in the kart's constants (race-manager consts). Empty only for a racer the kart table does not know (test fixtures)."
					},
					bodyId: { type: "string" },
					skinId: { type: "string" },
					slipstreamSeconds: {
						type: "number",
						description: "Time spent in another kart's wake"
					},
					position: {
						type: "array",
						items: { type: "number" },
						minItems: 3,
						maxItems: 3
					},
					heading: { type: "number" },
					speed: { type: "number" },
					lateralVelocity: { type: "number" },
					verticalVelocity: { type: "number" },
					grounded: { type: "boolean" },
					surface: { type: "string" },
					t: { type: "number" },
					branch: {
						type: "integer",
						minimum: 0,
						default: 0,
						description: "Track branch the kart is on: 0 = main spline, i = shortcuts[i-1]. t is always main-equivalent progress."
					},
					lap: { type: "integer" },
					checkpointsHit: { type: "integer" },
					distanceAlong: { type: "number" },
					wrongWaySeconds: { type: "number" },
					stuckSeconds: { type: "number" },
					drift: {
						type: "object",
						properties: {
							active: { type: "boolean" },
							direction: { type: "integer" },
							charge: { type: "number" },
							tier: { type: "integer" },
							chargeMultiplier: { type: "number" },
							chargeMultiplierRemaining: { type: "number" }
						}
					},
					airborne: {
						type: "object",
						description: "A flight: a trick press counts in it when a jump, vent or item launched it (fromJumpId) or it is realAir (the ground fell trickDrop below the line it took off along: a crest, a ledge).",
						properties: {
							fromJumpId: { type: "string" },
							trickQueued: { type: "boolean" },
							seconds: { type: "number" },
							realAir: { type: "boolean" },
							lineY: { type: "number" },
							lineRate: {
								type: "number",
								description: "m/s the ground under the kart climbed as it took off, ramps and bumps included"
							},
							climb: {
								type: "number",
								description: "m/s of the road's climb a hop took off with (its rise is judged against it); 0 for any other flight"
							}
						}
					},
					boost: {
						type: "object",
						properties: {
							source: {
								type: "string",
								enum: [
									"none",
									"drift",
									"trick",
									"pad",
									"item",
									"slipstream",
									"start"
								]
							},
							remaining: { type: "number" },
							multiplier: { type: "number" }
						}
					},
					item: {
						type: "object",
						description: "Two slots (design §8): the held item is used first; next moves up when it runs out. Each slot rolls on its own timer.",
						properties: {
							held: { type: "string" },
							charges: { type: "integer" },
							rouletteRemaining: { type: "number" },
							next: { type: "string" },
							nextCharges: { type: "integer" },
							nextRouletteRemaining: { type: "number" }
						}
					},
					status: {
						type: "object",
						properties: {
							spinRemaining: { type: "number" },
							shield: { type: "boolean" },
							slowedTo: { type: "number" },
							slowRemaining: { type: "number" },
							intangibleRemaining: { type: "number" },
							rideRemaining: { type: "number" },
							towRemaining: { type: "number" },
							towTarget: { type: "integer" },
							falling: { type: "boolean" },
							fallFromY: { type: "number" },
							held: { type: "boolean" },
							wallEasing: { type: "boolean" },
							loopIndex: { type: "integer" },
							loopS: { type: "number" },
							loopS0: { type: "number" },
							loopLat0: { type: "number" },
							loopSpeed: { type: "number" },
							loopAngle: { type: "number" }
						}
					},
					coins: { type: "integer" },
					rank: { type: "integer" },
					finishTick: { type: "integer" },
					ai: {
						type: "object",
						properties: {
							difficulty: {
								type: "string",
								enum: [
									"easy",
									"normal",
									"hard"
								]
							},
							rubberBand: { type: "number" }
						}
					}
				}
			}
		},
		projectiles: {
			type: "array",
			items: {
				type: "object",
				properties: {
					itemId: { type: "string" },
					ownerId: { type: "string" },
					position: {
						type: "array",
						items: { type: "number" }
					},
					velocity: {
						type: "array",
						items: { type: "number" }
					},
					bouncesLeft: { type: "integer" },
					targetId: { type: "string" },
					ttl: { type: "number" }
				}
			}
		},
		groundItems: {
			type: "array",
			items: {
				type: "object",
				properties: {
					itemId: { type: "string" },
					position: {
						type: "array",
						items: { type: "number" }
					},
					ttl: { type: "number" }
				}
			}
		},
		inputLog: {
			type: "array",
			description: "Player input per tick, stored for ghosts and server re-simulation",
			items: {
				type: "object",
				properties: {
					steer: { type: "number" },
					throttle: { type: "number" },
					brake: { type: "number" },
					drift: {
						type: "boolean",
						description: "Hop/drift button; pressed in real air (off a jump, a vent, a crest, a ledge) = trick"
					},
					item: { type: "boolean" },
					lookBack: { type: "boolean" },
					horn: { type: "boolean" }
				}
			}
		},
		constants: {
			description: "Race-manager constants. Never set per race; the defaults are the only values. Code reads them from here (docs/sops/race-manager.md Constants).",
			type: "object",
			properties: {
				countdownSteps: {
					type: "integer",
					default: 3
				},
				countdownStepSeconds: {
					type: "number",
					default: 1
				},
				playerGridSlot: {
					type: "integer",
					default: 7,
					description: "Back row; AI fill the rest in racer order"
				},
				wrongWaySpeed: {
					type: "number",
					default: -1,
					description: "m/s along the tangent; below this the wrong-way timer runs"
				},
				wrongWayHoldSeconds: {
					type: "number",
					default: 1.2
				},
				wrongWayClearSpeed: {
					type: "number",
					default: .5,
					description: "m/s along the tangent; above this the warning clears"
				},
				stuckSeconds: {
					type: "number",
					default: 6
				},
				stuckSpeed: {
					type: "number",
					default: .5,
					description: "m/s; slower than this while wanting to move counts as stuck"
				},
				stuckInputMin: {
					type: "number",
					default: .3,
					description: "throttle or brake above this means the player wants to move; also the start-boost throttle threshold"
				},
				respawnFreezeSeconds: {
					type: "number",
					default: .6
				},
				respawnLift: {
					type: "number",
					default: .35,
					description: "metres above the checkpoint ground"
				},
				respawnInset: {
					type: "number",
					default: .6,
					description: "a respawned kart keeps its side of the road but lands no further out than this fraction of the half-width (never on the lip of an open edge)"
				},
				rescueSeconds: {
					type: "number",
					default: 2.4,
					description: "the claw rescue, from the fall to the kart back on the road (Adam, 23 Sept 2026: a creative way back, not a cloud with a fishing rod)"
				},
				rescueRise: {
					type: "number",
					default: 7,
					description: "metres the claw lifts the kart above the higher of the two ends while it carries it back"
				},
				rankDebounceSeconds: {
					type: "number",
					default: .3,
					description: "a new rank must hold this long before positionChange fires"
				},
				finishGraceSeconds: {
					type: "number",
					default: 12,
					description: "after the player finishes, stragglers are force-finished"
				},
				checkpointResyncSectors: {
					type: "number",
					default: .5,
					description: "after a Final Lap Shift, a next checkpoint this far behind the kart counts as hit"
				},
				teleportGuardSectors: {
					type: "number",
					default: 1,
					description: "a forward t jump of more than this many checkpoint sectors in one tick counts nothing"
				},
				hazardSlowTo: {
					type: "number",
					default: .6
				},
				hazardSlowSeconds: {
					type: "number",
					default: 1
				},
				hazardBumpLateral: {
					type: "number",
					default: 4,
					description: "m/s added away from the hazard centre"
				},
				hazardCooldownSeconds: {
					type: "number",
					default: 1
				},
				pickupRespawnSeconds: {
					type: "number",
					default: .5,
					description: "a popped balloon is back this soon, so the karts right behind the one that took it still find one (24 Sept 2026: at 3.0 places 2-8 rolled 0.9-1.8 items a minute and sat with an empty slot about 90% of the race; 1.0 still left the middle of the pack empty 60% of the time, 0.5 carries an item about half of it, like Mario Kart World)"
				},
				coinRespawnSeconds: {
					type: "number",
					default: 5
				}
			}
		}
	}
};
//#endregion
//#region src/track-builder/constants.ts
function qr(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = qr(r.properties));
	return t;
}
var U = Object.freeze(qr(Gr.properties.builder.properties)), Jr = o.properties.base.properties.kartRadius.default;
o.properties.base.properties.tSearchWindow.default, Kr.properties.constants.properties.countdownSteps.default, Kr.properties.constants.properties.countdownStepSeconds.default;
//#endregion
//#region src/track-builder/spline.ts
var Yr = 1e-4;
function Xr(e, t, n, r, i, a, o, s, c) {
	let l = (t - e) / i - (n - e) / (i + a) + (n - t) / a, u = (n - t) / a - (r - t) / (a + o) + (r - n) / o;
	l *= a, u *= a, s[c] = t, s[c + 1] = l, s[c + 2] = -3 * t + 3 * n - 2 * l - u, s[c + 3] = 2 * t - 2 * n + l + u;
}
var Zr = class {
	closed = !0;
	count;
	c;
	constructor(e) {
		if (e.length < 4) throw Error(`ClosedSpline needs at least 4 points, got ${e.length}`);
		let t = e.length;
		this.count = t, this.c = new Float64Array(t * 12);
		for (let n = 0; n < t; n++) {
			let r = e[(n - 1 + t) % t], i = e[n], a = e[(n + 1) % t], o = e[(n + 2) % t], s = Math.sqrt(Math.sqrt($r(r, i))), c = Math.sqrt(Math.sqrt($r(i, a))), l = Math.sqrt(Math.sqrt($r(a, o)));
			c < Yr && (c = 1), s < Yr && (s = c), l < Yr && (l = c);
			let u = n * 12;
			Xr(r.x, i.x, a.x, o.x, s, c, l, this.c, u), Xr(r.y, i.y, a.y, o.y, s, c, l, this.c, u + 4), Xr(r.z, i.z, a.z, o.z, s, c, l, this.c, u + 8);
		}
	}
	segmentOf(e) {
		let t = this.count, n = ei(e) * t;
		return {
			index: Math.floor(n) % t,
			local: n - Math.floor(n)
		};
	}
	pointAt(e, t = [
		0,
		0,
		0
	]) {
		let { index: n, local: r } = this.segmentOf(e), i = n * 12, a = this.c, o = r * r, s = o * r;
		return t[0] = a[i] + a[i + 1] * r + a[i + 2] * o + a[i + 3] * s, t[1] = a[i + 4] + a[i + 5] * r + a[i + 6] * o + a[i + 7] * s, t[2] = a[i + 8] + a[i + 9] * r + a[i + 10] * o + a[i + 11] * s, t;
	}
	pointIn(e, t, n = [
		0,
		0,
		0
	]) {
		return this.pointAt((e + t) / this.count, n);
	}
	walkArcLength(e) {
		let t = new Float64Array(e + 1), n = [
			0,
			0,
			0
		], r = [
			0,
			0,
			0
		];
		this.pointAt(0, n);
		let i = 0;
		for (let a = 1; a <= e; a++) this.pointAt(a / e, r), i += R(r[0] - n[0], r[1] - n[1], r[2] - n[2]), t[a] = i, n[0] = r[0], n[1] = r[1], n[2] = r[2];
		return t;
	}
}, Qr = class {
	closed = !1;
	count;
	c;
	constructor(e) {
		if (e.length < 2) throw Error(`OpenSpline needs at least 2 points, got ${e.length}`);
		let t = e.length;
		this.count = t;
		let n = t - 1;
		this.c = new Float64Array(n * 12);
		let r = (e, t) => ({
			x: 2 * e.x - t.x,
			y: 2 * e.y - t.y,
			z: 2 * e.z - t.z
		});
		for (let i = 0; i < n; i++) {
			let n = i === 0 ? r(e[0], e[1]) : e[i - 1], a = e[i], o = e[i + 1], s = i + 2 < t ? e[i + 2] : r(e[t - 1], e[t - 2]), c = Math.sqrt(Math.sqrt($r(n, a))), l = Math.sqrt(Math.sqrt($r(a, o))), u = Math.sqrt(Math.sqrt($r(o, s)));
			l < Yr && (l = 1), c < Yr && (c = l), u < Yr && (u = l);
			let d = i * 12;
			Xr(n.x, a.x, o.x, s.x, c, l, u, this.c, d), Xr(n.y, a.y, o.y, s.y, c, l, u, this.c, d + 4), Xr(n.z, a.z, o.z, s.z, c, l, u, this.c, d + 8);
		}
	}
	segmentOf(e) {
		let t = this.count - 1, n = (e < 0 ? 0 : e > 1 ? 1 : e) * t, r = Math.floor(n);
		return r >= t && (r = t - 1), {
			index: r,
			local: n - r
		};
	}
	pointAt(e, t = [
		0,
		0,
		0
	]) {
		let { index: n, local: r } = this.segmentOf(e), i = n * 12, a = this.c, o = r * r, s = o * r;
		return t[0] = a[i] + a[i + 1] * r + a[i + 2] * o + a[i + 3] * s, t[1] = a[i + 4] + a[i + 5] * r + a[i + 6] * o + a[i + 7] * s, t[2] = a[i + 8] + a[i + 9] * r + a[i + 10] * o + a[i + 11] * s, t;
	}
	walkArcLength(e) {
		let t = new Float64Array(e + 1), n = [
			0,
			0,
			0
		], r = [
			0,
			0,
			0
		];
		this.pointAt(0, n);
		let i = 0;
		for (let a = 1; a <= e; a++) this.pointAt(a / e, r), i += R(r[0] - n[0], r[1] - n[1], r[2] - n[2]), t[a] = i, n[0] = r[0], n[1] = r[1], n[2] = r[2];
		return t;
	}
};
function $r(e, t) {
	let n = e.x - t.x, r = e.y - t.y, i = e.z - t.z;
	return n * n + r * r + i * i;
}
function ei(e) {
	let t = e % 1;
	return t < 0 ? t + 1 : t;
}
//#endregion
//#region src/track-builder/types.ts
var ti = Object.freeze([
	"road",
	"dirt",
	"mud",
	"ice",
	"boost",
	"rail"
]);
function ni(e) {
	let t = ti.indexOf(e ?? "road");
	return t < 0 ? 0 : t;
}
//#endregion
//#region src/track-builder/lut.ts
var W = (e) => {
	let t = e % 1;
	return t < 0 ? t + 1 : t;
}, ri = (e) => e < 0 ? 0 : e > 1 ? 1 : e, ii = Math.PI / 180, ai = {
	top: 0,
	edge: 0,
	next: 0,
	open: !1,
	cover: NaN,
	lip: NaN,
	pieces: 0
}, oi = class {
	n;
	closed;
	step;
	length;
	spline;
	px;
	py;
	pz;
	tx;
	ty;
	tz;
	rx;
	rz;
	bank;
	hw;
	surface;
	open;
	offroad = !1;
	land = null;
	floorY = -Infinity;
	covered;
	reachL;
	reachR;
	landAbove;
	bore;
	seg;
	grip;
	minY;
	maxY;
	constructor(e, t = {}) {
		let n = t.samples ?? U.lutSamples, r = t.divisions ?? U.arcDivisions, i = t.closed ?? !0, a = i ? new Zr(e) : new Qr(e);
		this.spline = a, this.n = n, this.closed = i, this.step = i ? n : n - 1, this.px = new Float64Array(n), this.py = new Float64Array(n), this.pz = new Float64Array(n), this.tx = new Float64Array(n), this.ty = new Float64Array(n), this.tz = new Float64Array(n), this.rx = new Float64Array(n), this.rz = new Float64Array(n), this.bank = new Float64Array(n), this.hw = new Float64Array(n), this.surface = new Uint8Array(n), this.open = new Uint8Array(n), this.seg = new Uint16Array(n), this.grip = new Float64Array(n).fill(1), this.covered = new Uint8Array(n), this.reachL = new Float32Array(n).fill(U.offroadReach), this.reachR = new Float32Array(n).fill(U.offroadReach), this.landAbove = new Float32Array(n).fill(NaN), this.bore = new Float32Array(n).fill(NaN);
		let o = a.walkArcLength(r), s = o[r];
		this.length = s;
		let c = [
			0,
			0,
			0
		], l = 0, u = Infinity, d = -Infinity, f = e.length;
		for (let t = 0; t < n; t++) {
			let n = t / this.step * s;
			for (; l < r - 1 && o[l + 1] < n;) l++;
			let i = o[l + 1] - o[l], p = i > 0 ? (n - o[l]) / i : 0, m = (l + p) / r;
			a.pointAt(m, c), this.px[t] = c[0], this.py[t] = c[1], this.pz[t] = c[2], c[1] < u && (u = c[1]), c[1] > d && (d = c[1]);
			let { index: h, local: g } = a.segmentOf(m), _ = e[h], v = e[(h + 1) % f], y = g * g * (3 - 2 * g);
			this.seg[t] = h, this.surface[t] = ni(_.surface), this.hw[t] = _.halfWidth + (v.halfWidth - _.halfWidth) * y;
			let b = (_.bank ?? 0) * ii, x = (v.bank ?? 0) * ii;
			this.bank[t] = b + (x - b) * y;
		}
		this.minY = u, this.maxY = d, this.refreshFrames();
	}
	refreshFrames() {
		for (let e = 0; e < this.n; e++) {
			let t = this.idx(e + 1), n = this.idx(e - 1), r = this.px[t] - this.px[n], i = this.py[t] - this.py[n], a = this.pz[t] - this.pz[n], o = R(r, i, a) || 1;
			r /= o, i /= o, a /= o, this.tx[e] = r, this.ty[e] = i, this.tz[e] = a;
			let s = L(r, a) || 1;
			this.rx[e] = a / s, this.rz[e] = -r / s;
		}
	}
	idx(e) {
		let t = this.n;
		return this.closed ? (e % t + t) % t : e < 0 ? 0 : e >= t ? t - 1 : e;
	}
	norm(e) {
		return this.closed ? W(e) : ri(e);
	}
	sample(e, t) {
		return this.sampleInto(e, t, {
			position: [
				0,
				0,
				0
			],
			tangent: [
				0,
				0,
				0
			],
			normal: [
				0,
				0,
				0
			],
			groundY: 0,
			halfWidth: 0,
			surface: "road",
			gripScale: 1
		});
	}
	sampleInto(e, t, n) {
		let r = this.norm(e) * this.step, i = Math.floor(r), a = this.idx(i), o = this.idx(i + 1), s = r - i, c = 1 - s, l = this.tx[a] * c + this.tx[o] * s, u = this.ty[a] * c + this.ty[o] * s, d = this.tz[a] * c + this.tz[o] * s, f = R(l, u, d) || 1;
		l /= f, u /= f, d /= f;
		let p = L(l, d) || 1, m = d / p, h = -l / p, g = this.bank[a] * c + this.bank[o] * s, _ = -t * ht(g), v = this.px[a] * c + this.px[o] * s + m * t, y = this.py[a] * c + this.py[o] * s + _, b = this.pz[a] * c + this.pz[o] * s + h * t, x = m, S = -ht(g), C = h, w = u * C - d * S, T = d * x - l * C, E = l * S - u * x, D = R(w, T, E) || 1;
		w /= D, T /= D, E /= D;
		let O = n.position, ee = n.tangent, k = n.normal;
		O[0] = v, O[1] = y, O[2] = b, ee[0] = l, ee[1] = u, ee[2] = d, k[0] = w, k[1] = T, k[2] = E, n.groundY = y, n.halfWidth = this.hw[a] * c + this.hw[o] * s, n.surface = ti[this.surface[a]], n.gripScale = this.grip[a] * c + this.grip[o] * s;
		let te = this.open[a];
		n.open = te, n.overCliff = !1;
		let A = !!(te & (t < 0 ? 1 : 2)), ne = (this.covered[a] | this.covered[o]) !== 0;
		if ((A || this.offroad) && !ne) {
			let e = Math.abs(t) - n.halfWidth;
			if (e > U.kerbWidth) {
				if (n.surface = "dirt", A) {
					let t = U.shoulderDrop * Math.min(1, (e - U.kerbWidth) / U.shoulderWidth);
					n.groundY -= t, O[1] -= t;
				} else {
					let r = y + Math.sign(t) * (e - U.kerbWidth) * ht(g) - U.offroadDrop, i = !1;
					if (this.land) {
						let e = this.land.query(v, b, ai);
						e.pieces > 0 && (r = e.top, i = e.pieces > 1);
					}
					r < this.floorY && (r = this.floorY);
					let a = Math.min(1, (e - U.kerbWidth) / .5), o = y + (r - y) * a;
					if (n.groundY = o, O[1] = o, a >= 1) {
						let e = 0, t = 0;
						if (i && this.land) {
							let n = Math.max(this.floorY, this.land.top(v + .5, b)), i = Math.max(this.floorY, this.land.top(v, b + .5));
							e = (n - r) / .5, t = (i - r) / .5, k[0] = -e, k[1] = 1, k[2] = -t;
						} else k[0] = u * h, k[1] = d * m - l * h, k[2] = -u * m;
						let n = R(k[0], k[1], k[2]) || 1;
						k[0] /= n, k[1] /= n, k[2] /= n;
					}
				}
			}
			A && (n.overCliff = e > U.kerbWidth + U.shoulderWidth);
		}
		let j = n.halfWidth, M = n.halfWidth;
		return ne ? (j = n.halfWidth + U.kerbWidth, M = j) : this.offroad && (j = n.halfWidth + U.kerbWidth + (this.reachL[a] * c + this.reachL[o] * s), M = n.halfWidth + U.kerbWidth + (this.reachR[a] * c + this.reachR[o] * s)), n.wallLeft = j, n.wallRight = M, n.wall = t < 0 ? j : t > 0 ? M : j < M ? j : M, n;
	}
	dist2XZ(e, t, n) {
		let r = this.px[e] - t, i = this.pz[e] - n;
		return r * r + i * i;
	}
	dist2XYZ(e, t, n, r) {
		let i = this.px[e] - t, a = this.py[e] - n, o = this.pz[e] - r;
		return i * i + a * a + o * o;
	}
	nearestT(e, t, n) {
		let r = Math.round(this.norm(t) * this.step), i = Math.max(1, Math.round(n * this.step)), a = e[0], o = e[2], s = this.idx(r), c = Infinity, l = this.closed ? -i : Math.max(-i, -r), u = this.closed ? i : Math.min(i, this.n - 1 - r);
		for (let e = l; e <= u; e++) {
			let t = this.idx(r + e), n = this.dist2XZ(t, a, o);
			n < c && (c = n, s = t);
		}
		return this.refine(s, c, a, 0, o, !1);
	}
	nearestTGlobal(e) {
		let t = this.n, n = U.globalSearchStep, [r, i, a] = e, o = 0, s = Infinity;
		for (let e = 0; e < t; e += n) {
			let t = this.dist2XYZ(e, r, i, a);
			t < s && (s = t, o = e);
		}
		if (!this.closed) {
			let e = this.dist2XYZ(t - 1, r, i, a);
			e < s && (s = e, o = t - 1);
		}
		let c = o;
		for (let e = -n; e <= n; e++) {
			let t = this.idx(c + e), n = this.dist2XYZ(t, r, i, a);
			n < s && (s = n, o = t);
		}
		return this.refine(o, s, r, i, a, !0);
	}
	refine(e, t, n, r, i, a) {
		let o = e / this.step, s = t;
		for (let t = -1; t <= 0; t++) {
			let c = this.idx(e + t), l = this.idx(c + 1);
			if (c === l) continue;
			let u = this.px[c], d = this.py[c], f = this.pz[c], p = this.px[l] - u, m = a ? this.py[l] - d : 0, h = this.pz[l] - f, g = p * p + m * m + h * h;
			if (g <= 1e-12) continue;
			let _ = a ? r - d : 0, v = ((n - u) * p + _ * m + (i - f) * h) / g;
			v = v < 0 ? 0 : v > 1 ? 1 : v;
			let y = u + p * v - n, b = a ? d + m * v - r : 0, x = f + h * v - i, S = y * y + b * b + x * x;
			S < s && (s = S, o = (c + v) / this.step);
		}
		return this.norm(o);
	}
	dist2At(e, t) {
		let n = this.norm(e) * this.step, r = Math.floor(n), i = this.idx(r), a = this.idx(r + 1), o = n - r, s = 1 - o, c = this.px[i] * s + this.px[a] * o - t[0], l = this.py[i] * s + this.py[a] * o - t[1], u = this.pz[i] * s + this.pz[a] * o - t[2];
		return c * c + l * l + u * u;
	}
};
function si(e, t) {
	return new oi(e, t);
}
//#endregion
//#region src/track-builder/branches.ts
function G(e, t) {
	let n = W(e - t);
	return n > .5 ? n - 1 : n;
}
var ci = class {
	index;
	id;
	openOnLaps;
	lut;
	entryT;
	exitT;
	span;
	entryPoint;
	exitPoint;
	forcedOpen;
	lapOpen = !0;
	constructor(e, t, n, r, i, a = []) {
		this.index = e, this.id = t, this.lut = n, this.entryT = r, this.exitT = i, this.span = e === 0 ? 1 : W(i - r), this.openOnLaps = a, this.entryPoint = e === 0 ? [
			n.px[0],
			n.py[0],
			n.pz[0]
		] : n.sample(0, 0).position, this.exitPoint = e === 0 ? this.entryPoint : n.sample(1, 0).position;
	}
	get isMain() {
		return this.index === 0;
	}
	get open() {
		return this.isMain ? !0 : this.forcedOpen ?? this.lapOpen;
	}
	setLap(e) {
		this.lapOpen = this.openOnLaps.length === 0 || this.openOnLaps.includes(e);
	}
	toLocal(e) {
		if (this.isMain) return W(e);
		let t = G(e, this.entryT) / this.span;
		return t < 0 ? 0 : t > 1 ? 1 : t;
	}
	toMain(e) {
		return this.isMain ? W(e) : W(this.entryT + e * this.span);
	}
	sample(e, t) {
		return this.lut.sample(this.toLocal(e), t);
	}
	sampleInto(e, t, n) {
		return this.lut.sampleInto(this.toLocal(e), t, n);
	}
	overlaps(e, t) {
		if (this.isMain) return !0;
		let n = G(e, this.entryT);
		return n + t >= 0 && n - t <= this.span;
	}
	nearestLocal(e, t, n) {
		if (this.isMain) {
			let r = this.lut.nearestT(e, t, n);
			return {
				t: r,
				d2: this.lut.dist2At(r, e)
			};
		}
		let r = this.lut.nearestT(e, this.toLocal(t), n / this.span);
		return this.pastEnd(r, e) ? {
			t: this.toMain(r),
			d2: Infinity
		} : {
			t: this.toMain(r),
			d2: this.lut.dist2At(r, e)
		};
	}
	settle(e, t, n) {
		for (let r = 0; r < li; r++) {
			let r = this.nearestLocal(e, t, n).t;
			if (r === t) break;
			t = r;
		}
		return t;
	}
	pastEnd(e, t) {
		if (e > 0 && e < 1) return !1;
		let n = this.lut, r = e <= 0 ? 0 : n.n - 1, i = (t[0] - n.px[r]) * n.tx[r] + (t[2] - n.pz[r]) * n.tz[r];
		return e <= 0 ? i < 0 : i > 0;
	}
	halfWidthAt(e) {
		let t = this.toLocal(e);
		return this.lut.hw[this.lut.idx(Math.round(t * this.lut.step))];
	}
	nearestGlobal(e) {
		let t = this.lut.nearestTGlobal(e);
		return {
			t: this.toMain(t),
			d2: this.lut.dist2At(t, e)
		};
	}
}, li = 3;
function ui(e, t) {
	return Math.max(64, Math.round(U.lutSamples * e / t));
}
function di(e, t, n, r = t.controlPoints) {
	let i = si(r, {
		closed: !1,
		samples: 64,
		divisions: 256
	}), a = si(r, {
		closed: !1,
		samples: ui(i.length, n.length),
		divisions: Math.max(256, Math.round(U.arcDivisions * i.length / n.length))
	});
	return fi(a, n, W(t.entryT), W(t.exitT)), new ci(e, t.id, a, W(t.entryT), W(t.exitT), t.openOnLaps ?? []);
}
function fi(e, t, n, r) {
	let i = e.length / e.step;
	for (let a of [!0, !1]) {
		let o = t.idx(Math.round((a ? n : r) * t.step)), s = -1;
		for (let n = 0; n < e.n >> 1; n++) {
			let r = a ? n : e.n - 1 - n, c = e.px[r], l = e.pz[r], u = Infinity, d = o;
			for (let e = -24; e <= 24; e++) {
				let n = t.idx(o + e), r = t.px[n] - c, i = t.pz[n] - l, a = r * r + i * i;
				a < u && (u = a, d = n);
			}
			let f = o = d, p = (c - t.px[f]) * t.rx[f] + (l - t.pz[f]) * t.rz[f], m = e.rx[r] * t.rx[f] + e.rz[r] * t.rz[f], h = Math.abs(p) - (t.hw[f] + U.kerbWidth) - (e.hw[r] + U.kerbWidth) * Math.abs(m);
			s < 0 && h > -1 && (s = n * i);
			let g = s < 0 ? 0 : Math.min(1, (n * i - s) / 30), _ = 1 - g * g * (3 - 2 * g);
			if (_ <= 0) break;
			let v = t.hw[f] + U.kerbWidth, y = Math.max(-v, Math.min(v, p)), b = L(t.tx[f], t.tz[f]) || 1, x = t.ty[f] / b, S = (e.rx[r] * t.tx[f] + e.rz[r] * t.tz[f]) / b, C = ((c - t.px[f]) * t.tx[f] + (l - t.pz[f]) * t.tz[f]) / b, w = t.py[f] + C * x - y * ht(t.bank[f]), T = Math.max(0, Math.min(1, 1 - (Math.abs(p) - v) / e.hw[r])), E = At(ht(t.bank[f]) * m * T - x * S);
			e.py[r] += (w - e.py[r]) * _, e.bank[r] += (E - e.bank[r]) * _;
		}
	}
	e.refreshFrames();
}
var pi = class {
	list;
	constructor(e) {
		this.list = e;
	}
	get main() {
		return this.list[0];
	}
	byId(e) {
		return this.list.find((t) => t.id === e);
	}
	setLap(e) {
		for (let t of this.list) t.setLap(e);
	}
	sample(e, t, n = 0) {
		return this.resolve(e, n).sample(e, t);
	}
	sampleInto(e, t, n, r) {
		return this.resolve(e, n).sampleInto(e, t, r);
	}
	resolve(e, t) {
		let n = this.list[t] ?? this.main;
		if (!n.isMain) {
			let t = G(e, n.entryT);
			if (t < 0 || t > n.span) return this.main;
		}
		return n;
	}
	nearest(e, t, n) {
		let r = this.list[t.branch] ?? this.main;
		!r.open && !r.overlaps(t.t, 0) && (r = this.main);
		let i = r.nearestLocal(e, t.t, n), a = r.index, o = Math.sqrt(i.d2), s = i.t, c = r.halfWidthAt(s);
		if (o <= c - U.branchLeaveMargin) return {
			t: s,
			branch: r.index
		};
		let l = U.branchHysteresis, u = o - c;
		for (let i of this.list) {
			if (i === r || !i.open || !i.overlaps(t.t, n)) continue;
			let o = i.nearestLocal(e, t.t, n), c = Math.sqrt(o.d2) - i.halfWidthAt(o.t);
			c < u - l && (u = c, a = i.index, s = o.t);
		}
		return a !== r.index && (s = this.list[a].settle(e, s, n)), {
			t: s,
			branch: a
		};
	}
	nearestGlobal(e) {
		let t = 0, n = this.main.nearestGlobal(e);
		for (let r of this.list) {
			if (r.isMain || !r.open) continue;
			let i = r.nearestGlobal(e);
			i.d2 < n.d2 - U.branchHysteresis * U.branchHysteresis && (n = i, t = r.index);
		}
		return {
			t: n.t,
			branch: t
		};
	}
};
//#endregion
//#region src/ai-driver/constants.ts
function mi(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = mi(r.properties));
	return t;
}
function hi(e) {
	if (e && typeof e == "object") for (let t of Object.values(e)) hi(t);
	return Object.freeze(e);
}
var K = hi(mi(o.properties.ai.properties)), gi = K.profiles;
function _i(e) {
	return e === 50 ? "easy" : e === 100 ? "normal" : "hard";
}
function vi(e) {
	let [t, n] = K.drift.tierBySkill;
	return e < t ? 1 : e < n ? 2 : 3;
}
//#endregion
//#region src/ai-driver/rng.ts
function yi(e, t) {
	return (Math.imul(e | 0, 2654435761) ^ Math.imul(t + 1, 2246822519)) >>> 0;
}
function bi(e) {
	return e + 1831565813 >>> 0;
}
function xi(e) {
	let t = e;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), (t ^ t >>> 14) >>> 0;
}
function Si(e) {
	return e.rng = bi(e.rng), xi(e.rng);
}
function Ci(e) {
	return e.driftRng = bi(e.driftRng), xi(e.driftRng) / 4294967296;
}
function wi(e, t, n) {
	return xi((e ^ Math.imul(t + 1, 2654435761) ^ Math.imul(n + 1, 2246822519)) >>> 0) / 4294967296;
}
function Ti(e) {
	return Si(e) / 4294967296;
}
function q(e, t, n) {
	return t + (n - t) * Ti(e);
}
//#endregion
//#region src/ai-driver/drift.ts
function Ei(e, t) {
	let n = e - t;
	return n > 1e-9 ? n : 0;
}
function Di(e, t) {
	return e.steerRate * (e.driftSteerMin + (e.driftSteerMax - e.driftSteerMin) * t);
}
function Oi(e, t) {
	return Math.max(1, Math.min(Math.abs(e.speed), t.topSpeed * K.drift.planTop));
}
function ki(e) {
	return Math.min(vi(e), K.drift.minTier);
}
function Ai(e, t, n) {
	let r = K.drift, i = Oi(e, t), a = Number.isFinite(n.bendMetres), o = a ? Math.max(0, n.bendStart - i * r.hopLead) : 0, s = Math.min(a ? n.bendMetres : Infinity, n.airMetres - i * r.airLead), c = Math.min(r.maxHold, (s - o) / i) - t.hopSeconds;
	if (!(c > 0)) return 0;
	let l = a && n.bendMetres > o ? n.bendAngle * i / (n.bendMetres - o + 1e-9) : Math.abs(n.turnNear) / K.line.turnNearSeconds, u = Di(t, 0), d = Di(t, .5), f = e.drift.chargeMultiplierRemaining > 0 ? e.drift.chargeMultiplier : 1;
	if (l - u < r.easePlan) {
		let e = Math.sqrt(2 * n.halfWidth * r.sweepRoom / (i * Math.max(.001, d - l)));
		return tr(t.chargeFull * 60 * f * Math.min(c, e), t.driftTiers);
	}
	let p = J((l - u) / (d - u), 0, 1);
	return tr((t.chargeFull * p + t.chargeNeutral * (1 - p)) * 60 * f * c, t.driftTiers);
}
function ji(e, t, n, r, i = n.skill) {
	let a = r.turnNear, o = r.turnFar;
	return Math.abs(o) <= n.driftThreshold || Math.abs(a) <= n.driftThreshold * .5 || Math.sign(a) !== Math.sign(o) || r.hazardInLane || r.bendHalfWidth < K.line.narrowRoad ? !1 : Ai(e, t, r) >= ki(i);
}
function Mi(e, t, n, r) {
	return ji(e, t, n, r) && r.bendStart <= Math.abs(e.speed) * K.drift.hopLead;
}
function Ni(e, t, n, r) {
	return ji(e, t, n, r) ? Math.abs(r.turnNear) / K.line.turnNearSeconds < Di(t, .5) : !1;
}
function Pi(e, t) {
	return Number.isFinite(t.bendMetres) && t.bendMetres > Math.max(1, Math.abs(e.speed)) * K.drift.chainSeconds;
}
function Fi(e, t) {
	return e > 0 ? Math.max(e, t * K.drift.useBySkill) : 0;
}
function Ii(e, t, n, r, i) {
	if (n.driftDir !== 0) return;
	let a = i.turnFar;
	if (n.driftPlan !== 0) {
		if (Math.abs(a) <= r.driftThreshold || Math.sign(a) !== n.driftPlanSide) n.driftPlan = 0;
		else {
			let r = i.turnShort * n.driftPlanSide * Math.abs(e.speed) * (t.hopSeconds + t.driftYawLag) / K.line.lookAheadMin > K.drift.hopMidBend;
			n.driftPlan === 1 && r && n.driftCooldown === 0 && (n.driftPlan = Pi(e, i) ? 2 : -1);
			return;
		}
	}
	i.narrow || i.nearNarrowBranch || !ji(e, t, r, i, n.skill) || (n.driftPlan = Ci(n) < Fi(n.personality.driftUse, n.skill) ? 1 : -1, n.driftPlanSide = Math.sign(a));
}
function Li(e, t, n, r, i, a, o, s) {
	let c = K.drift;
	if (n.driftCooldown = Ei(n.driftCooldown, s), o.drift = !1, n.driftDir === 0) {
		if (n.driftCooldown > 0 || !e.grounded || e.drift.phase !== "idle" || i.narrow || i.nearNarrowBranch || i.airAhead || i.hazardInLane || e.speed < t.driftMinSpeed * a) return;
		let s = i.turnNear, l = i.turnFar;
		if (!(Math.abs(l) > r.driftThreshold && Math.abs(s) > r.driftThreshold * .5 && Math.sign(s) === Math.sign(l)) || i.bendStart > Math.abs(e.speed) * c.hopLead || i.myLat * Math.sign(l) > i.halfWidth - c.apexMargin - c.hopRoom) return;
		let u = Math.sign(l), d = Math.abs(e.speed), f = i.turnShort * u;
		if (Math.abs(i.course) > c.hopAlign) return;
		let p = Math.abs(f) / K.line.lookAheadMin * d * (t.hopSeconds + t.driftYawLag);
		if (f > 0 ? p > c.hopMidBend : p > c.hopMidBend * .5) return;
		let m = Math.min(vi(n.skill), Ai(e, t, i));
		if (m < ki(n.skill) || n.driftPlan < 1) return;
		n.driftDir = s > 0 ? 1 : -1, n.driftTier = m, n.driftHold = 0, o.drift = !0, o.steer = n.driftDir;
		return;
	}
	let l = n.driftDir;
	n.driftHold += s, o.drift = !0;
	let u = t.hopSeconds * t.hopLandWindow + s;
	if (e.drift.phase === "idle" && n.driftHold > u) {
		zi(n, c.abortCooldown, o, "abort");
		return;
	}
	if (n.driftHold <= c.hopCommit || e.drift.phase !== "drifting") {
		o.steer = l * c.hopCommitStick;
		return;
	}
	n.driftTier = Math.max(n.driftTier, Math.min(vi(n.skill), Ai(e, t, i)));
	let d = Math.max(Math.abs(e.speed), 1), f = Xn(e.speed, a, t), p = i.turnNear * l / K.line.turnNearSeconds, m = i.myLat * l, h = i.course * l, g = i.dodging || i.hazardInLane ? n.lateral * l : Math.max(0, i.halfWidth - c.apexMargin), _ = t.driftYawLag + 1 / t.gripDrift, v = h + (Di(t, e.drift.yawK) * f - p) * _, y = Math.max(c.easeMin, p - Di(t, 0) * f), b = g - m - d * h * _, x = Math.sign(b) * Math.min(c.latCourseMax, Math.sqrt(2 * y * Math.abs(b) / d)), S = J(((p + c.aimGain * (x - v)) / (t.steerRate * f) - t.driftSteerMin) / (t.driftSteerMax - t.driftSteerMin), 0, 1);
	if (S < .5 && e.drift.tier < n.driftTier) {
		let n = Ri(e, t, l, d, f, p, m, h), r = e.drift.chargeMultiplierRemaining > 0 ? e.drift.chargeMultiplier : 1, a = (t.driftTiers[Math.min(e.drift.tier, t.driftTiers.length - 1)] - e.drift.charge) / (t.chargeFull * 60 * r) <= c.chargeSecondsAhead && n < i.halfWidth - c.edgeMargin - c.snapRoom;
		(n < g || a) && (S = .5);
	}
	o.steer = l * Yn(S), S >= 1 && h < -c.wideLift && (o.throttle = 0, h < -2 * c.wideLift && (o.brake = 1));
	let C = i.open & (l > 0 ? 1 : 2) ? i.halfWidth + c.outsideSlack : Math.min(i.halfWidth + c.outsideSlack, (l > 0 ? i.wallLeft : i.wallRight) - t.kartRadius - c.wallMargin), w = Math.sign(i.turnNear === 0 ? i.turnFar : i.turnNear) !== l || i.bendMetres < d * c.exitLead, T = e.wallCooldown > 0 && e.wallCooldown > t.wallCooldownSeconds - n.driftHold, E = i.roadErr, D = e.drift.tier, O = D >= n.driftTier && D >= vi(n.skill) ? "tier" : w && (D >= 1 || n.driftHold > c.hopCommit + t.driftYawLag) ? "aligned" : T ? "wall" : E * l < -c.overRotate ? "over" : D >= 1 && Math.abs(E) < c.aligned && i.kappaShort * Math.abs(e.speed) < c.exitYawFraction * Di(t, 0) ? "aligned" : m > i.halfWidth - c.edgeMargin || -m > C ? "edge" : n.driftHold > c.maxHold ? "hold" : i.hazardInLane && Math.abs(n.lateral - i.myLat) > c.hazardMiss ? "hazard" : i.airMetres < d * c.airLead ? "air" : "none";
	O !== "none" && (zi(n, D === 0 ? c.abortCooldown : c.cooldown, o, O), O === "tier" && Pi(e, i) && (n.driftPlan = 2, n.driftPlanSide = l));
}
function Ri(e, t, n, r, i, a, o, s) {
	let c = K.drift, l = c.swingStep, u = 1 - vn(-l / t.driftYawLag), d = e.drift.yawK, f = -Lt(e.lateralVelocity, r) * n, p = o, m = s, h = o;
	for (let e = 0; e < c.swingSeconds; e += l) {
		d -= d * u;
		let e = t.steerRate * (t.driftSteerMin + (t.driftSteerMax - t.driftSteerMin) * d) * i;
		if (f += (e - t.gripDrift * f) * l, m += (t.gripDrift * f - a) * l, p += r * m * l, p > h && (h = p), m < 0) break;
	}
	return h;
}
function zi(e, t, n, r) {
	e.driftDir = 0, e.driftPlan = -1, e.driftHold = 0, e.driftCooldown = t, e.driftEndReason = r, n.drift = !1;
}
function Bi(e, t, n, r, i) {
	if (!nr(e)) {
		t.trickRolled = !1, t.trickDone = !1;
		return;
	}
	if (t.driftDir === 0 && (t.trickRolled || (t.trickRolled = !0, t.trickDone = Ti(t) >= n.trickChance, i && i.airAhead && Math.abs(i.turnNear) > K.line.trickBend && (t.trickDone = !0)), !t.trickDone)) {
		if (e.prevDrift) {
			r.drift = !1;
			return;
		}
		r.drift = !0, t.trickDone = !0;
	}
}
//#endregion
//#region src/ai-driver/line.ts
function J(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function Vi(e) {
	for (; e > Math.PI;) e -= 2 * Math.PI;
	for (; e < -Math.PI;) e += 2 * Math.PI;
	return e;
}
function Hi(e) {
	let t = K.line;
	return J(Math.abs(e) * t.lookAheadGain, t.lookAheadMin, t.lookAheadMax);
}
var Ui = 5, Wi = /* @__PURE__ */ new WeakMap();
function Gi(e) {
	let t = Wi.get(e);
	return t || (t = e.branches.list.map((e, t) => t > 0 && e.lut.sample(.5, 0).halfWidth < K.line.narrowRoad), Wi.set(e, t)), t;
}
function Ki(e, t, n, r, i, a) {
	let o = K.line, s = t.length, c = n.branchChoice > 0 ? n.branchChoice : e.branch, l = Math.max(Math.abs(e.speed), Ui);
	t.sampleInto(e.t, 0, e.branch, r.here), t.sampleInto(W(e.t + l * o.turnNearSeconds / s), 0, c, r.near), t.sampleInto(W(e.t + l * o.turnFarSeconds / s), 0, c, r.far);
	let u = B(r.here.tangent);
	i.turnNear = Vi(B(r.near.tangent) - u), i.turnFar = Vi(B(r.far.tangent) - u), i.probeNear = l * o.turnNearSeconds, t.sampleInto(W(e.t + o.lookAheadMin / s), 0, c, r.short);
	let d = B(r.short.tangent), f = Vi(d - u);
	if (i.kappaShort = Math.abs(f) / o.lookAheadMin, i.turnShort = f, i.kappa = Math.max(i.kappaShort, Math.abs(i.turnNear) / i.probeNear), e.branch !== 0 && !e.grounded) {
		let n = t.branches.list[e.branch], a = G(n.exitT, e.t) * s;
		if (a > 0) {
			let s = B(t.sampleInto(n.exitT, 0, e.branch, r.tmp).tangent), c = Math.abs(Vi(B(t.sampleInto(n.exitT, 0, 0, r.tmp).tangent) - s));
			i.kappa = Math.max(i.kappa, c / Math.max(o.joinShare * a, o.lookAheadMin));
		}
	}
	i.roadErr = Vi(d - e.heading), i.course = Vi(e.heading + Lt(e.lateralVelocity, Math.max(1, Math.abs(e.speed))) - u), i.halfWidth = r.here.halfWidth, i.wallLeft = jn(r.here, -1), i.wallRight = jn(r.here, 1), i.open = r.here.open ?? 0, i.narrow = r.here.halfWidth < o.narrowRoad, i.airAhead = !1, i.airMetres = Infinity;
	for (let n of t.jumps) {
		if (!n.rise || (n.branch ?? 0) !== c) continue;
		let t = W(n.t - e.t) * s;
		t < i.probeNear + (n.run ?? 0) && (i.airAhead = !0), i.airMetres = Math.min(i.airMetres, Math.max(0, t - (n.run ?? 0)));
	}
	let p = Math.sign(i.turnNear === 0 ? i.turnFar : i.turnNear), m = 0, h = 0, g = 0;
	i.bendStart = Infinity;
	let _ = a ? K.drift.startYawFraction * Di(a, .5) / Math.min(l, a.topSpeed * K.drift.planTop) : Infinity;
	i.bendHalfWidth = r.here.halfWidth, i.kappaShort >= _ && (i.bendStart = 0);
	let v = l * o.bendSeconds;
	if (p !== 0) for (let n = o.bendStep; n <= v; n += o.bendStep) {
		let a = Vi(B(t.sampleInto(W(e.t + n / s), 0, c, r.tmp).tangent) - u) * p;
		if (i.bendStart === Infinity && (a - g) / o.bendStep >= _ && (i.bendStart = n - o.bendStep / 2, i.bendHalfWidth = r.tmp.halfWidth), g = a, a > m + .001) m = a, h = n;
		else if (a < m - o.bendBack) break;
	}
	i.bendAngle = m, i.bendMetres = h;
	let y = Hi(e.speed), b = e.branch !== 0 || n.branchChoice > 0, x = Gi(t), S = e.branch !== 0 && x[e.branch] || n.branchChoice > 0 && x[n.branchChoice];
	i.branchAhead = 0, i.branchSide = 0;
	let C = t.branches.list;
	for (let n = 1; n < C.length; n++) {
		let a = C[n];
		if (!a.open) continue;
		let o = G(a.entryT, e.t) * s, c = G(a.exitT, e.t) * s;
		if ((o > -y && o < y || c > -y && c < y) && (b = !0, x[n] && (S = !0)), e.branch === 0 && o > 0 && o < y && i.branchAhead === 0) {
			let e = W(a.entryT + a.span * .25), o = t.sampleInto(e, 0, n, r.tmp).position, s = t.sampleInto(e, 0, 0, r.ahead), c = (o[0] - s.position[0]) * s.tangent[2] - (o[2] - s.position[2]) * s.tangent[0];
			i.branchAhead = n, i.branchSide = c > .3 ? 1 : c < -.3 ? -1 : 0;
		}
	}
	(i.narrow || b) && (y = Math.max(o.lookAheadMin, y * o.narrowLookAhead)), i.L = y, i.nearBranch = b, i.nearNarrowBranch = S, i.branch = c;
	let w = r.here.tangent, T = r.here.position;
	return i.myLat = (e.position[0] - T[0]) * w[2] - (e.position[2] - T[2]) * w[0], i;
}
function qi(e, t, n, r, i, a) {
	let o = K.line;
	if (e.branch !== 0 || i.narrow || n.branchChoice > 0 || e.surface === "dirt" || e.surface === "mud") return 0;
	let s = i.halfWidth, c = n.personality.lateralBias * o.laneHalfFraction * s;
	if (n.driftDir === 0 && n.driftPlan === 1 && Ni(e, t, r, i)) return -Math.sign(i.turnFar) * o.outsideFraction * s;
	let l = J(i.turnNear * o.insideGain, -o.insideBiasMax, o.insideBiasMax) * s, u = n.wanderAmp * I(2 * Math.PI * a / n.wanderPeriod + n.wanderPhase), d = o.lateralMaxFraction * s;
	return J(c + l + u, -d, d);
}
function Ji(e, t, n, r, i, a) {
	if (e.branch !== 0) {
		n.branchChoice = 0;
		return;
	}
	let o = t.branches.list, s = t.length;
	if (n.branchChoice !== 0) {
		let t = o[Math.abs(n.branchChoice)];
		if (!t || !t.open) {
			n.branchChoice = 0;
			return;
		}
		let r = G(t.entryT, e.t) * s;
		(n.branchChoice > 0 ? r < -K.line.branchCommitMetres : r < 0) && (n.branchChoice = 0);
		return;
	}
	for (let t = 1; t < o.length; t++) {
		let c = o[t];
		if (!c.open) continue;
		let l = G(c.entryT, e.t) * s;
		if (l <= 0 || l > 2 * i.L) continue;
		let u = c.lut.sample(.5, 0).halfWidth < K.line.narrowRoad, d = n.skill >= r.shortcutSkill;
		n.branchChoice = (a === void 0 ? d && (n.rb >= K.rubber.shortcutRb || !u && (n.skill >= K.line.shortcutSure || wi(n.seed, t, e.lap) < n.personality.aggression)) : c.id === a) ? t : -t;
		return;
	}
}
//#endregion
//#region src/ai-driver/avoid.ts
function Yi(e, t, n, r) {
	let i = e.track.sampleInto(t, 0, n, e.sc.tmp), a = i.tangent, o = i.position;
	return (r[0] - o[0]) * a[2] - (r[2] - o[2]) * a[0];
}
function Xi(e, t) {
	return e > .05 ? -1 : e < -.05 || t >= e ? 1 : -1;
}
function Zi(e, t, n, r) {
	return Math.abs(e - t) >= n ? e : t + Xi(t, r) * n;
}
var Qi = [], $i = [], ea = [], ta = [], na = [], ra = [], ia = 1e-6;
function aa(e, t, n, r, i, a, o) {
	let s = e, c = -1, l = !0, u = Infinity, d = !0, f = 2 * N.kartRadius, p = i * (i - 1) >> 1, m = 2 * (i + a + 1);
	for (let h = 0; h < m + p; h++) {
		let p;
		if (h < m) {
			let e = h >> 1, t = h & 1 ? 1 : -1;
			p = J(e < i ? Qi[e] + t * r : e < i + a ? na[e - i] + t * ra[e - i] : t * n, -n, n);
		} else {
			let e = h - m, t = 0;
			for (; e >= i - 1 - t;) e -= i - 1 - t, t++;
			p = J((Qi[t] + Qi[t + 1 + e]) / 2, -n, n);
		}
		let g = r, _ = !1, v = !1;
		for (let e = 0; e < i; e++) g = Math.min(g, Math.abs(p - Qi[e])), (Qi[e] - t) * (Qi[e] - p) < 0 && Math.abs(Qi[e] - t) + f > $i[e] / Math.max(1, o) * K.avoid.crossRate && (v = !0);
		g < f && (v = !0);
		for (let e = 0; e < a; e++) Math.abs(p - na[e]) < ra[e] - ia && (_ = !0);
		let y = Math.abs(p - e) + Math.abs(p - t);
		(v === d ? g > c + ia || g > c - ia && (_ === l ? y < u : !_) : !v) && (s = p, c = g, l = _, u = y, d = v);
	}
	return s;
}
function oa(e, t, n, r, i, a, o = 0) {
	let s = K.avoid, { track: c, karts: l } = t, u = c.length, d = n.halfWidth, f = N.kartRadius, p = Math.max(.5, d - f - .2), m = Math.min(s.stoppedClearance, p), h = Math.min(2 * f + .3, p), g = 0;
	for (let n = 0; n < l.length; n++) {
		let r = l[n];
		if (r === e || r.isGhost || r.branch !== e.branch) continue;
		let i = G(r.t, e.t) * u;
		i <= 0 || i > s.seekDistance || (ea[g] = i, ta[g++] = Yi(t, r.t, r.branch, r.position));
	}
	let _ = c.features, v = Infinity, y = a, b = 0, x = Infinity, S = Infinity, C = a;
	for (let i = 0; i < _.length; i++) {
		let c = _[i];
		if (c.branch !== e.branch) continue;
		let l = 0;
		if (c.kind === "coin") {
			if (e.coins >= N.coinCap) continue;
			let n = i < t.coinOf.length ? t.coinOf[i] : -1;
			if (n < 0 || t.coinStates[n].respawnRemaining > 0) continue;
			l = 1;
		} else if (c.kind === "pickup") {
			let n = e.item.held !== "none" || e.item.rouletteRemaining > 0, r = e.item.next !== "none" || e.item.nextRouletteRemaining > 0;
			if (n && r) continue;
			let a = i < t.pickupOf.length ? t.pickupOf[i] : -1;
			if (a < 0 || t.pickupStates[a].respawnRemaining > 0) continue;
			l = 2;
		} else if (c.kind === "boostPad") {
			if (r < s.padSkill) continue;
			l = 3;
		} else continue;
		let p = G(c.t, e.t) * u;
		if (!(p <= 0 || p > s.seekDistance)) {
			if (l === 2) {
				if (Math.abs(c.lateral - n.myLat) > Math.max(s.seekLateral, p * s.seekSlope) || Math.abs(c.lateral) > d - f) continue;
				let e = !1;
				for (let t = 0; t < g; t++) if (ea[t] < p && Math.abs(ta[t] - c.lateral) < s.claimWidth) {
					e = !0;
					break;
				}
				let t = Math.abs(c.lateral - o * d) + (e ? s.claimCost : 0);
				(x === Infinity || p < x - s.rowGap || p <= x + s.rowGap && t < S) && (x = p, S = t, C = c.lateral);
				continue;
			}
			Math.abs(c.lateral - a) > s.seekLateral || (l > b || l === b && p < v) && (b = l, v = p, y = c.lateral);
		}
	}
	x < Infinity && b < 3 && (y = C), a = y;
	let w = 0;
	for (let r = 0; r < l.length; r++) {
		let i = l[r];
		if (i === e || i.isGhost) continue;
		let o = G(i.t, e.t) * u;
		if (o <= 0 || o > s.stoppedLookAhead || i.branch !== e.branch) continue;
		if (i.speed < s.slowKartSpeed || i.status.spinRemaining > 0 || i.status.intangibleRemaining > 0 || i.finishTick !== void 0) {
			$i[w] = o, Qi[w++] = Yi(t, i.t, i.branch, i.position);
			continue;
		}
		if (o > s.avoidLookAhead) continue;
		let c = Yi(t, i.t, i.branch, i.position);
		n.narrow || n.nearBranch || o > s.passDistance || (e.speed - i.speed > s.passClosing || o < s.touchDistance ? a = Zi(a, c, h, n.myLat) : x === Infinity && o <= N.slipstreamLength && Math.abs(a - c) < N.slipstreamHalfWidth && (a = c));
	}
	if (i < 0 && n.branchAhead === -i && n.branchSide !== 0) {
		let e = K.line.declineFraction * d;
		a * -n.branchSide < e && (a = -n.branchSide * e);
	}
	let T = Math.abs(e.speed), E = Math.max(s.hazardLookAhead, T * s.hazardSeconds), D = T * K.drift.hazardSeconds, O = Math.sign(n.turnNear) * Math.max(0, d - K.drift.apexMargin), ee = Math.min(n.myLat, O), k = Math.max(n.myLat, O);
	n.hazardInLane = !1, n.dodging = !1, n.hopRing = !1;
	let te = a, A = 0, ne = t.hazards;
	if (ne.length) {
		let r = Math.max(s.rollingLookAhead, E, D) / u + .02;
		for (let i = 0; i < ne.length; i++) {
			let o = ne[i];
			if (o.type === "gust" || o.type === "vent") continue;
			if (o.ground) {
				L(o.position[0] - e.position[0], o.position[2] - e.position[2]) - o.radius - f < T * s.ringHop && (n.hopRing = !0);
				continue;
			}
			let l = o.type === "static" || o.type === "falling", m = o.type === "rolling" ? s.rollingLookAhead : l ? E : s.hazardLookAhead, h = c.nearestT(o.position, e.t, r), g = G(h, e.t) * u;
			if (g <= 0 || g > (l ? Math.max(m, D) : m)) continue;
			let _ = Yi(t, h, 0, o.position);
			if (Math.abs(_) > d + o.radius) continue;
			let v = Math.min(s.dodgeClearance + o.radius, p);
			l && _ > ee - v && _ < k + v && (n.hazardInLane = !0), !(g > m) && (a = Zi(a, _, v, n.myLat), l && (na[A] = _, ra[A++] = v));
		}
	}
	let j = c.def.hazards;
	if (j) for (let t = 0; t < j.length; t++) {
		let r = j[t];
		if (r.type !== "rolling" && r.type !== "falling") continue;
		let i = G(r.t, e.t) * u, o = Math.min(s.dodgeClearance + U.hazardRadius, p);
		r.type === "rolling" && i > 0 && i - (r.speed ?? 0) * (r.period ?? 1) < s.stoppedLookAhead && (na[A] = r.lateral ?? 0, ra[A++] = o), r.type === "falling" && i > 0 && i < D && (r.lateral ?? 0) > ee - o && (r.lateral ?? 0) < k + o && (n.hazardInLane = !0), !(i < -s.spawnBehind || i > s.hazardLookAhead) && (a = Zi(a, r.lateral ?? 0, o, n.myLat), na[A] = r.lateral ?? 0, ra[A++] = o);
	}
	let M = Math.max(0, Math.min(d - K.line.edgeMargin, d - f - .3));
	Math.abs(a - te) > ia && (n.dodging = !0), a = J(a, -M, M);
	for (let e = 0; e < w; e++) if (Math.abs(a - Qi[e]) < m - ia) return n.dodging = !0, aa(a, n.myLat, M, m, w, A, T);
	return a;
}
//#endregion
//#region src/ai-driver/items.ts
function sa(e, t) {
	return Vi(Lt(t.position[0] - e.position[0], t.position[2] - e.position[2]) - e.heading);
}
function ca(e, t) {
	return L(e.position[0] - t.position[0], e.position[2] - t.position[2]);
}
var la = /* @__PURE__ */ new Set([
	"forward",
	"rearDrop",
	"deception",
	"runner"
]);
function ua(e, t, n, r, i, a) {
	let o = e.item.held;
	if (o !== t.lastItem) return t.lastItem = o, t.itemHold = 0, t.itemPressed = t.itemTrailing = !1, t.reactionRemaining = o === "none" ? 0 : q(t, n.reactionMin, n.reactionMax) * (1 - t.skill), !1;
	if (o === "none" || e.item.rouletteRemaining > 0 || e.item.charges <= 0) return t.itemPressed = t.itemTrailing = !1, !1;
	if (t.itemHold += a, t.reactionRemaining > 0) return t.reactionRemaining -= a, !1;
	let s = i.roles[o];
	if (!s) return !1;
	if (t.itemPressed && !t.itemTrailing) return t.itemPressed = !1, !1;
	let c = K.items, l = Infinity, u = Infinity, d = Infinity, f = Infinity, p = 0, m = z(e.heading);
	for (let t of i.karts) {
		if (t === e || t.isGhost || t.finishTick !== void 0) continue;
		let n = ca(e, t);
		f = Math.min(f, n);
		let r = t.position[0] - e.position[0], i = t.position[2] - e.position[2];
		r * m[0] + i * m[2] > 0 ? (n < l && (p = sa(e, t)), l = Math.min(l, n), Math.abs(sa(e, t)) < c.forwardCone && (u = Math.min(u, n))) : d = Math.min(d, n);
	}
	let h = Math.abs(r.turnFar) < c.straightTurn, g = e.surface === "dirt" || e.surface === "mud", _ = t.itemHold >= c.holdMin, v;
	switch (s) {
		case "forward":
			v = _ && u <= c.forwardRange;
			break;
		case "homing":
			v = _ && l <= c.homingRange;
			break;
		case "rearDrop":
		case "deception":
			v = d <= c.rearRange * .5 || t.itemHold >= c.holdMax;
			break;
		case "defenceArea":
			v = f <= c.defenceRadius || i.threatened;
			break;
		case "defenceHeld":
			v = i.threatened || d <= c.rearRange;
			break;
		case "speed":
			v = _ && h || g || i.gap > c.speedItemGap;
			break;
		case "ride":
			v = _;
			break;
		case "jump":
			v = e.grounded ? i.threatened || l <= c.springRange || t.itemHold >= c.holdMax : f <= c.springRange;
			break;
		case "tether":
			v = _ && l >= c.anchorMin && l <= c.anchorMax && Math.abs(r.roadErr) < c.anchorAlign && Math.abs(p) < c.anchorAlign;
			break;
		case "runner":
			v = _ && l <= c.runnerRange;
			break;
		case "equaliser":
			v = _ && e.rank >= c.equaliserMinRank;
			break;
		case "chaos": v = !0;
	}
	if (la.has(s)) {
		if (!v) return t.itemTrailing = t.itemPressed = !0, !0;
		if (t.itemTrailing) return t.itemTrailing = t.itemPressed = !1, !1;
	}
	return v && (t.itemPressed = !0), v;
}
//#endregion
//#region src/ai-driver/personalities.ts
var da = Object.freeze({
	pip: {
		lateralBias: -.2,
		aggression: .7,
		driftUse: .9
	},
	momo: {
		lateralBias: .1,
		aggression: .5,
		driftUse: .8
	},
	nova: {
		lateralBias: .35,
		aggression: .3,
		driftUse: .6
	},
	juniper: {
		lateralBias: 0,
		aggression: .8,
		driftUse: .7
	},
	otto: {
		lateralBias: -.4,
		aggression: .2,
		driftUse: .5
	},
	sprocket: {
		lateralBias: .2,
		aggression: .4,
		driftUse: .75
	},
	boulder: {
		lateralBias: -.1,
		aggression: .3,
		driftUse: .4
	},
	gus: {
		lateralBias: .4,
		aggression: .6,
		driftUse: .5
	}
});
function fa(e, t) {
	let n = da[e];
	return n ? { ...n } : {
		lateralBias: q(t, -.5, .5),
		aggression: q(t, .3, .7),
		driftUse: q(t, .5, .9)
	};
}
//#endregion
//#region src/ai-driver/rubber.ts
function pa(e, t = K.rubber.min) {
	let n = K.rubber, r = Math.abs(e);
	if (r <= n.deadZone) return 1;
	let i = On((r - n.deadZone) / n.scale), a = t > n.min ? t : n.min;
	return e > 0 ? 1 + (n.max - 1) * i : 1 - (1 - a) * i;
}
function ma(e, t) {
	let n = e.skill + (t - 1) * K.rubber.skillGain;
	return n < 0 ? 0 : n > 1 ? 1 : n;
}
function ha(e, t) {
	let n = t / K.rubber.powerFrom;
	return e.power * (n < 1 ? n : 1);
}
var ga = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "cups.schema.json",
	title: "Cups, Knockout sets and Grand Prix scoring",
	description: "Mode configuration. Which tracks make a cup, which three tracks link into a Knockout, and how points and stars are awarded.",
	type: "object",
	required: [
		"cups",
		"knockoutSets",
		"gpPointsByRank",
		"starThresholds"
	],
	properties: {
		cups: {
			type: "array",
			minItems: 2,
			items: {
				type: "object",
				required: [
					"id",
					"name",
					"trackIds"
				],
				properties: {
					id: {
						type: "string",
						enum: ["sunrise", "summit"]
					},
					name: { type: "string" },
					trackIds: {
						type: "array",
						minItems: 3,
						maxItems: 4,
						items: { type: "string" }
					},
					musicFinaleVariant: { type: "string" }
				}
			}
		},
		knockoutSets: {
			description: "Three linked tracks. Cut lines are the racer count kept after each segment: 8 → 6 → 4 → 2 → winner.",
			type: "array",
			minItems: 1,
			items: {
				type: "object",
				required: [
					"id",
					"name",
					"trackIds",
					"cutLines"
				],
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					trackIds: {
						type: "array",
						minItems: 3,
						maxItems: 3,
						items: { type: "string" }
					},
					cutLines: {
						type: "array",
						items: { type: "integer" },
						default: [
							6,
							4,
							2
						]
					},
					lapsPerSegment: {
						type: "integer",
						default: 2
					}
				}
			}
		},
		gpPointsByRank: {
			type: "array",
			minItems: 8,
			maxItems: 8,
			items: { type: "integer" },
			default: [
				15,
				12,
				10,
				8,
				7,
				6,
				5,
				4
			]
		},
		starThresholds: {
			description: "Cup total points needed for 1, 2 and 3 stars",
			type: "array",
			minItems: 3,
			maxItems: 3,
			items: { type: "integer" }
		}
	}
};
//#endregion
//#region src/race-manager/constants.ts
function _a(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = _a(r.properties));
	return t;
}
var Y = Object.freeze(_a(Kr.properties.constants.properties));
Object.freeze([...ga.properties.gpPointsByRank.default]), Object.freeze([...ga.properties.knockoutSets.items.properties.cutLines.default]), ga.properties.knockoutSets.items.properties.lapsPerSegment.default, Object.freeze([
	.6,
	.8,
	1
]);
//#endregion
//#region src/ai-driver/speed.ts
function va(e) {
	return .55 + .35 * e;
}
function ya(e, t, n, r, i) {
	if (e <= 1e-6) return Infinity;
	let a = n.steerRate * r * (i ? n.driftSteerMax / (1 - n.steerFalloff) : 1);
	return a / (e + a * n.steerFalloff / t);
}
function ba(e, t, n, r, i, a) {
	let o = Mr(e, t), s = o.target, c = e.drift.phase === "drifting" || i, l = va(n.skill) * (r.narrow ? K.line.narrowMargin : 1) * (r.airAhead && !c ? K.line.airMargin : 1), u = ya(r.kappa, o.base, t, l, c);
	a.legal = s, a.corner = u, a.target = Math.min(n.powerCap * n.fieldPace * s, Math.max(u, xa));
	let d = Math.sign(r.turnNear);
	return !c && d !== 0 && e.grounded && r.halfWidth - r.myLat * -d < K.line.edgeLift && r.roadErr * d > 0 && (a.target = Math.min(a.target, Math.max(xa, e.speed - K.line.edgeShed))), a;
}
var xa = 4;
function Sa(e, t, n, r) {
	if (r.brake = 0, e.speed <= Y.stuckSpeed) {
		r.throttle = 1;
		return;
	}
	if (e.speed < t.target) {
		r.throttle = 1;
		return;
	}
	r.throttle = 0, e.speed > t.target + n.brakeAbove && (r.brake = 1);
}
//#endregion
//#region src/ai-driver/steer.ts
function Ca(e, t) {
	return Vi(Lt(t[0] - e.position[0], t[2] - e.position[2]) - e.heading);
}
function wa(e, t, n, r, i, a, o) {
	let s = K.steer, c = Ca(e, t), l = J((c - n.prevErr) / o, -s.dErrMax, s.dErrMax);
	n.prevErr = c, n.noise += (q(n, -r, r) - n.noise) * s.noiseSmoothing;
	let u = J(s.kLat * a, -s.kLatMax, s.kLatMax);
	return J((s.kP * c + s.kD * l + u) * i + n.noise, -1, 1);
}
//#endregion
//#region src/ai-driver/recover.ts
function Ta(e, t, n, r) {
	let i = K.recover;
	return t.recovery === "reverse" ? (t.recoverTimer -= r, n.throttle = 0, n.brake = 1, n.drift = !1, n.steer = t.prevErr > 0 ? -1 : 1, t.recoverTimer <= 1e-9 && (t.recovery = "cooldown", t.recoverTimer = i.cooldownSeconds), !0) : t.recovery === "cooldown" ? (t.recoverTimer -= r, t.recoverTimer <= 1e-9 && (t.recovery = "none", t.recoverTimer = 0), t.stuckSeconds = 0, !1) : (t.stuckSeconds = e.grounded && e.status.spinRemaining === 0 && e.status.intangibleRemaining === 0 && Math.abs(e.speed) < Y.stuckSpeed ? t.stuckSeconds + r : 0, t.stuckSeconds + 1e-9 >= i.stuckSeconds && (t.stuckSeconds = 0, t.recovery = "reverse", t.recoverTimer = i.reverseSeconds, t.driftDir = 0, n.throttle = 0, n.brake = 1, n.drift = !1, n.steer = t.prevErr > 0 ? -1 : 1, !0));
}
//#endregion
//#region src/ai-driver/types.ts
function Ea() {
	return {
		position: [
			0,
			0,
			0
		],
		tangent: [
			0,
			0,
			1
		],
		normal: [
			0,
			1,
			0
		],
		groundY: 0,
		halfWidth: 1,
		surface: "road",
		gripScale: 1
	};
}
function Da() {
	return {
		ahead: Ea(),
		near: Ea(),
		far: Ea(),
		here: Ea(),
		short: Ea(),
		tmp: Ea()
	};
}
function Oa() {
	return {
		L: 0,
		turnNear: 0,
		turnFar: 0,
		probeNear: 1,
		kappa: 0,
		kappaShort: 0,
		turnShort: 0,
		roadErr: 0,
		course: 0,
		halfWidth: 1,
		wallLeft: Infinity,
		wallRight: Infinity,
		open: 0,
		bendAngle: Infinity,
		bendMetres: Infinity,
		bendStart: 0,
		bendHalfWidth: Infinity,
		airMetres: Infinity,
		hazardInLane: !1,
		dodging: !1,
		hopRing: !1,
		branch: 0,
		myLat: 0,
		nearBranch: !1,
		nearNarrowBranch: !1,
		narrow: !1,
		airAhead: !1,
		branchAhead: 0,
		branchSide: 0
	};
}
//#endregion
//#region src/ai-driver/driver.ts
var ka = 625341585, Aa = Object.freeze({
	...gi.normal,
	skill: K.autopilot.skill,
	power: K.autopilot.power
});
function ja(e, t, n, r, i, a) {
	let o = {
		seed: yi(e, t),
		rng: yi(e, t),
		driftRng: yi(e, t) ^ ka,
		personality: {
			lateralBias: 0,
			aggression: 0,
			driftUse: 0
		},
		fieldPace: i,
		startPress: 0,
		wanderAmp: 0,
		wanderPeriod: 1,
		wanderPhase: 0,
		prevErr: 0,
		noise: 0,
		rb: 1,
		skill: r.skill,
		powerCap: r.power,
		driftHold: 0,
		driftCooldown: 0,
		driftDir: 0,
		driftTier: 0,
		driftPlan: 0,
		driftPlanSide: 0,
		driftEndReason: "none",
		trickRolled: !1,
		trickDone: !1,
		recovery: "none",
		recoverTimer: 0,
		stuckSeconds: 0,
		reactionRemaining: 0,
		lastItem: "none",
		itemHold: 0,
		itemPressed: !1,
		itemTrailing: !1,
		branchChoice: 0,
		lateral: 0,
		balloonPick: 0
	};
	return o.personality = a ? { ...a } : fa(n, o), o.startPress = r.startPressMean + q(o, -r.startPressSpread, r.startPressSpread), o.wanderAmp = q(o, K.line.wanderAmpMin, K.line.wanderAmpMax), o.wanderPeriod = q(o, K.line.wanderPeriodMin, K.line.wanderPeriodMax), o.wanderPhase = q(o, 0, 2 * Math.PI), o.balloonPick = Math.max(-1, Math.min(1, o.personality.lateralBias + q(o, -K.avoid.pickSpread, K.avoid.pickSpread))), o;
}
var Ma = class {
	track;
	profile;
	onlyShortcut;
	memory;
	consts;
	outputs;
	playerIndex;
	sc = Da();
	line = Oa();
	speed = {
		legal: 0,
		target: 0,
		corner: Infinity
	};
	avoidCtx;
	itemCtx;
	threatened = [];
	constructor(e, t, n, r = {}) {
		this.track = e, this.profile = r.profile ?? gi[_i(t.speedClass)], this.onlyShortcut = r.onlyShortcut;
		let i = new Map(t.racers.map((e) => [e.racerId, e])), a = n.karts;
		this.consts = a.map((e) => {
			let n = i.get(e.racerId);
			return ue(n?.archetype ?? "medium", t.speedClass, e.racerId, n?.kartId);
		}), this.outputs = a.map(() => ({ ...kn })), this.playerIndex = a.findIndex((e) => e.isPlayer);
		let o = a.map((e, t) => t).filter((e) => !a[e].isPlayer && !a[e].isGhost), s = o.map((e, t) => 1 - K.rubber.fieldPaceSpread * t / Math.max(1, o.length - 1)), c = { rng: yi(n.seed, 24301) };
		for (let e = s.length - 1; e > 0; e--) {
			let t = Math.floor(Ti(c) * (e + 1));
			[s[e], s[t]] = [s[t], s[e]];
		}
		let l = new Map(o.map((e, t) => [e, s[t]]));
		this.memory = a.map((e, t) => ja(n.seed, n.trackers[t]?.gridSlot ?? t, e.racerId, this.profile, l.get(t) ?? 1, r.personalities?.[e.racerId]));
		let u = [], d = [], f = 0, p = 0;
		for (let t of e.features) u.push(t.kind === "pickup" ? f++ : -1), d.push(t.kind === "coin" ? p++ : -1);
		this.avoidCtx = {
			track: e,
			karts: a,
			hazards: [],
			pickupStates: n.pickupStates,
			coinStates: n.coinStates,
			pickupOf: u,
			coinOf: d,
			sc: this.sc
		}, this.itemCtx = {
			karts: a,
			roles: r.itemRoles ?? {},
			gap: 0,
			threatened: !1
		};
	}
	snapshot() {
		return JSON.parse(JSON.stringify(this.memory));
	}
	restore(e) {
		this.memory = JSON.parse(JSON.stringify(e));
	}
	drivePlayer = !1;
	fill(e, t, n) {
		let r = e.karts;
		this.avoidCtx.hazards = t, this.avoidCtx.pickupStates = e.pickupStates, this.avoidCtx.coinStates = e.coinStates;
		let i = this.playerIndex >= 0 ? r[this.playerIndex] : void 0, a = i !== void 0 && i.finishTick === void 0;
		for (let t = 0; t < r.length; t++) {
			let o = r[t];
			if (o.isGhost || o.isPlayer && o.finishTick === void 0 && !this.drivePlayer) continue;
			let s = this.outputs[t];
			n[t] = s, this.drive(e, o, t, a ? i : void 0, s);
		}
	}
	drive(e, t, n, r, i) {
		let a = this.memory[n], o = this.consts[n], s = Fr, c = t.finishTick !== void 0, l = c ? Aa : this.profile;
		if (i.steer = 0, i.throttle = 0, i.brake = 0, i.drift = !1, i.item = !1, i.lookBack = !1, i.horn = !1, e.phase === "countdown") {
			i.throttle = +(e.time >= -a.startPress);
			return;
		}
		if (t.status.spinRemaining > 0) return;
		let u = r && !c ? r.distanceAlong - t.distanceAlong : 0;
		a.rb = pa(u, l.rbMin), a.skill = ma(l, a.rb), a.powerCap = ha(l, a.rb);
		let d = Ki(t, this.track, a, this.sc, this.line, o);
		Ji(t, this.track, a, l, d, this.onlyShortcut), c || Ii(t, o, a, l, d);
		let f = qi(t, o, a, l, d, e.tick / 120);
		f = oa(t, this.avoidCtx, d, a.skill, a.branchChoice, f, a.balloonPick);
		let p = K.line.laneRate * s, m = f - a.lateral;
		a.lateral += m > p ? p : m < -p ? -p : m;
		let h = this.track.sampleInto(W(t.t + d.L / this.track.length), a.lateral, d.branch, this.sc.ahead).position, g = t.surface === "dirt" || t.surface === "mud";
		i.steer = wa(t, h, a, l.noise * (1 - a.skill), g ? K.steer.offroadGain : 1, a.lateral - d.myLat, s);
		let _ = ba(t, o, a, d, !c && a.driftDir === 0 && a.driftCooldown === 0 && a.driftPlan === 1 && !d.narrow && !d.nearNarrowBranch && !d.airAhead && Mi(t, o, l, d), this.speed);
		Sa(t, _, l, i), c || (Li(t, o, a, l, d, _.legal, i, s), Bi(t, a, l, i, d), d.hopRing && a.driftDir === 0 && t.grounded && t.drift.phase === "idle" && !t.prevDrift && a.skill >= K.avoid.ringSkill && (i.drift = !0)), c || (this.itemCtx.gap = u, this.itemCtx.threatened = this.threatened[n] === !0, i.item = ua(t, a, l, d, this.itemCtx, s)), Ta(t, a, i, s);
	}
};
//#endregion
//#region src/track-builder/features.ts
function Na(e, t) {
	if (!t) return 0;
	let n = e.byId(t);
	if (!n) throw Error(`feature names unknown shortcut "${t}"`);
	return n.index;
}
function Pa(e, t, n, r, i, a) {
	let o = Na(e, r.shortcut), s = r.lateral ?? 0, c = r.t, l = e.sample(c, s, o);
	return {
		id: n,
		kind: t,
		branch: o,
		t: e.list[o].toMain(e.list[o].toLocal(c)),
		lateral: s,
		position: l.position,
		width: i,
		launch: a
	};
}
function Fa(e, t) {
	let n = [];
	return (e.pickups ?? []).forEach((e, r) => n.push({
		...Pa(t, "pickup", `pickup-${r}`, e, U.balloonRadius * 2, 0),
		...e.double ? { double: !0 } : {}
	})), (e.coins ?? []).forEach((e, r) => n.push(Pa(t, "coin", `coin-${r}`, e, U.coinRadius * 2, 0))), (e.boostPads ?? []).forEach((e, r) => n.push(Pa(t, "boostPad", `pad-${r}`, e, e.width ?? U.boostPadWidth, 0))), (e.jumps ?? []).forEach((e) => n.push(Ia(t, e))), n;
}
function Ia(e, t) {
	let n = t.shape === "hump";
	return {
		...Pa(e, "jump", t.id, t, t.width ?? U.boostPadWidth, t.launch),
		shape: n ? "hump" : "ramp",
		run: t.run ?? (n ? U.humpRun : U.rampRun),
		rise: t.rise ?? (n ? U.humpRise : U.rampRise),
		...n ? { edge: U.humpEdge } : {}
	};
}
function La(e, t, n, r) {
	let i = e.sample(t, 0, n), a = i.tangent[2], o = -i.tangent[0], s = L(a, o) || 1;
	return ((r[0] - i.position[0]) * a + (r[2] - i.position[2]) * o) / s;
}
function Ra(e, t) {
	for (let n of e) {
		let e = t.list[n.branch] ?? t.main;
		n.t = e.nearestGlobal(n.position).t, n.lateral = La(t, n.t, e.index, n.position);
	}
}
function za(e) {
	return e.filter((e) => e.kind === "jump").map((e) => ({
		id: e.id,
		t: e.t,
		launch: e.launch,
		branch: e.branch,
		shape: e.shape,
		run: e.run,
		rise: e.rise,
		...e.edge ? { edge: e.edge } : {}
	}));
}
function Ba(e) {
	return e.filter((e) => e.kind === "boostPad").map((e) => ({
		t: e.t,
		lateral: e.lateral,
		halfWidth: e.width / 2,
		branch: e.branch
	}));
}
//#endregion
//#region src/track-builder/shift.ts
var Va = (e, t, n) => W(e - t) <= W(n - t), Ha = 2;
function Ua(e, t, n) {
	let r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of n) {
		let n = [];
		for (let r = 0; r < e.length; r++) Va(t[r], a.fromT, a.toT) && n.push(r);
		let o;
		if (n.length) {
			n.sort((e, n) => W(t[e] - a.fromT) - W(t[n] - a.fromT)), o = n[0];
			for (let e of n) r.add(e);
		} else {
			o = 0;
			let n = Infinity;
			for (let r = 0; r < e.length; r++) {
				let e = W(t[r] - a.toT);
				e < n && (n = e, o = r);
			}
		}
		i.set(o, [...i.get(o) ?? [], ...a.controlPoints]);
		for (let t of [a.controlPoints[0], a.controlPoints[a.controlPoints.length - 1]]) if (t) for (let n = 0; n < e.length; n++) {
			let i = e[n];
			R(i.x - t.x, i.y - t.y, i.z - t.z) < Ha * t.halfWidth && r.add(n);
		}
	}
	let a = [];
	for (let t = 0; t < e.length; t++) {
		let n = i.get(t);
		n && a.push(...n.map((e) => ({ ...e }))), r.has(t) || a.push({ ...e[t] });
	}
	return a;
}
function Wa(e, t = []) {
	if (e.shifted) return;
	e.shifted = !0;
	let n = e.def.finalLapShift, r = e.branches, i = r.main, a = [], o = n.routeOverrides ?? [];
	if (o.length) {
		let n = t.map((e) => e.branch > 0 && r.list[e.branch] ? r.list[e.branch].toLocal(e.t) : 0), s = e.controlPoints.map((e) => i.lut.nearestTGlobal([
			e.x,
			e.y,
			e.z
		]));
		e.controlPoints = Ua(e.controlPoints, s, o);
		let c = r.list.map((e) => e.lut);
		i.lut = si(e.controlPoints), Ga(i.lut, c);
		for (let e of o) a.push([e.fromT, e.toT]);
		for (let e of r.list) e.isMain || (e.entryT = i.lut.nearestTGlobal(e.entryPoint), e.exitT = i.lut.nearestTGlobal(e.exitPoint), e.span = W(e.exitT - e.entryT));
		e.startT = i.lut.nearestTGlobal(e.startPoint);
		let l = (e) => o.some((t) => Va(e, t.fromT, t.toT));
		e.openEdges = e.openEdges.filter((e) => !l(e.fromT) && !l(e.toT)).map((e) => ({
			...e,
			fromT: i.lut.nearestTGlobal(e.fromPoint),
			toT: i.lut.nearestTGlobal(e.toPoint)
		})), e.loopFeet = e.loopFeet.filter((e) => !l(e.t)).map((e) => ({
			...e,
			t: i.lut.nearestTGlobal(e.point)
		}));
		for (let t of e.hazards.creatures) l(t.t) && e.hazards.setEnabled(t.id, !1);
		t.forEach((e, t) => {
			let a = r.list[e.branch];
			if (e.branch > 0 && a) {
				let i = Ja(r, e.position);
				i >= 0 ? (e.t = i, e.branch = 0) : e.t = a.toMain(n[t]);
			} else e.t = i.lut.nearestTGlobal(e.position), e.branch = 0;
		}), Ra(e.features, r), e.hazards.rederive();
	}
	for (let e of n.surfaceOverrides ?? []) {
		let t = ni(e.surface), n = i.lut;
		for (let r = 0; r < n.n; r++) Va(r / n.n, e.fromT, e.toT) && (n.surface[r] = t);
		a.push([e.fromT, e.toT]);
	}
	let s = n.gripMultiplier ?? 1;
	if (s !== 1) for (let e of r.list) for (let t = 0; t < e.lut.n; t++) e.lut.grip[t] *= s;
	for (let e of n.closesShortcuts ?? []) {
		let t = r.byId(e);
		t && (t.forcedOpen = !1);
	}
	for (let e of n.opensShortcuts ?? []) {
		let t = r.byId(e);
		t && (t.forcedOpen = !0);
	}
	for (let t of n.addsJumps ?? []) e.features.push(Ia(r, t));
	for (let t of n.enablesHazards ?? []) e.hazards.setEnabled(t, !0);
	for (let t of n.disablesHazards ?? []) e.hazards.setEnabled(t, !1);
	e.rebuildDerived();
	let c = {
		kind: n.kind,
		label: n.label,
		sky: n.sky,
		lut: n.lut,
		fogDensity: n.fogDensity,
		musicVariant: n.musicVariant,
		length: i.lut.length,
		changedRanges: a.map(([e, t]) => [W(e), W(t)])
	};
	return e.emit(c), c;
}
function Ga(e, t) {
	let n = e.n, r = e.length / e.step, i = new Float64Array(n), a = new Float64Array(n), o = new Uint8Array(n);
	for (let r = 0; r < n; r++) {
		let n = Infinity;
		for (let o of t) {
			let t = qa(o, e, r);
			t && t.gap < n && (n = t.gap, i[r] = t.y - e.py[r], a[r] = t.bank - e.bank[r]);
		}
		o[r] = +(n < 0);
	}
	let s = new Float64Array(n).fill(Infinity), c = new Int32Array(n).fill(-1);
	for (let e of [1, -1]) {
		let t = -1;
		for (let i = 0; i < 2 * n; i++) {
			let a = e > 0 ? i % n : n - 1 - i % n;
			o[a] ? t = i : t >= 0 && (i - t) * r < s[a] && (s[a] = (i - t) * r, c[a] = e > 0 ? t % n : n - 1 - t % n);
		}
	}
	for (let t = 0; t < n; t++) {
		let n = t, r = 1;
		if (!o[t]) {
			if (c[t] < 0) continue;
			n = c[t];
			let e = Math.min(1, s[t] / 30);
			r = 1 - e * e * (3 - 2 * e);
		}
		e.py[t] += i[n] * r, e.bank[t] += a[n] * r;
	}
	e.refreshFrames();
}
var Ka = {
	y: 0,
	bank: 0,
	gap: 0
}, X = [
	0,
	0,
	0
];
function qa(e, t, n) {
	X[0] = t.px[n], X[1] = t.py[n], X[2] = t.pz[n];
	let r = e.nearestT(X, e.nearestTGlobal(X), U.globalSearchStep / e.step);
	if (!e.closed && (r <= 0 || r >= 1)) {
		let t = r <= 0 ? 0 : e.n - 1;
		if (((X[0] - e.px[t]) * e.tx[t] + (X[2] - e.pz[t]) * e.tz[t]) * (r <= 0 ? -1 : 1) > 0) return null;
	}
	let i = e.norm(r) * e.step, a = Math.floor(i), o = e.idx(a), s = e.idx(a + 1), c = i - a, l = 1 - c, u = e.px[o] * l + e.px[s] * c, d = e.py[o] * l + e.py[s] * c, f = e.pz[o] * l + e.pz[s] * c, p = e.tx[o] * l + e.tx[s] * c, m = e.ty[o] * l + e.ty[s] * c, h = e.tz[o] * l + e.tz[s] * c, g = L(p, h) || 1, _ = h / g, v = -p / g, y = e.bank[o] * l + e.bank[s] * c, b = e.hw[o] * l + e.hw[s] * c + U.kerbWidth, x = (X[0] - u) * _ + (X[2] - f) * v, S = d - Math.max(-b, Math.min(b, x)) * ht(y);
	if (Math.abs(S - X[1]) > U.tunnelApex) return null;
	let C = t.rx[n] * _ + t.rz[n] * v, w = (t.rx[n] * p + t.rz[n] * h) / g;
	return Ka.y = S, Ka.bank = At(ht(y) * C - m / g * w), Ka.gap = Math.abs(x) - b - (t.hw[n] + U.kerbWidth) * Math.abs(C), Ka;
}
function Ja(e, t) {
	let n = e.main, r = n.nearestGlobal(t);
	return Math.sqrt(r.d2) <= n.halfWidthAt(r.t) ? r.t : -1;
}
function Ya(e, t, n) {
	return Va(e, t, n) || G(e, t) === 0;
}
var Xa = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "item.schema.json",
	title: "ItemDefinition and distribution table",
	type: "object",
	required: [
		"items",
		"table",
		"lockoutSeconds",
		"finalLapLockoutSeconds",
		"rouletteSeconds"
	],
	properties: {
		rouletteSeconds: {
			type: "number",
			default: 1.5,
			description: "HUD balloon roulette length after a pickup"
		},
		items: {
			type: "array",
			items: {
				type: "object",
				required: [
					"id",
					"name",
					"role",
					"behaviour",
					"icon",
					"sfx"
				],
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					role: {
						type: "string",
						enum: [
							"forward",
							"homing",
							"rearDrop",
							"deception",
							"defenceArea",
							"defenceHeld",
							"speed",
							"equaliser",
							"chaos",
							"ride",
							"jump",
							"tether",
							"runner"
						]
					},
					behaviour: {
						type: "object",
						properties: {
							projectileSpeed: { type: "number" },
							bounces: { type: "integer" },
							homing: { type: "boolean" },
							lifetimeSeconds: { type: "number" },
							radius: { type: "number" },
							speedMultiplier: { type: "number" },
							durationSeconds: { type: "number" },
							charges: { type: "integer" },
							affects: {
								type: "string",
								enum: [
									"target",
									"self",
									"ahead",
									"adjacent",
									"all"
								]
							},
							slowTo: { type: "number" },
							stripsItem: { type: "boolean" },
							minPosition: { type: "integer" },
							chargeMultiplier: {
								type: "number",
								description: "Triple Fizz: drift charge rate scale while active"
							},
							chargeSeconds: { type: "number" },
							weightBonus: {
								type: "number",
								description: "Bubble: added to weight while held"
							},
							trailable: {
								type: "boolean",
								description: "Hold the button to trail it behind as a rear shield; let go to use it (MKW drag)"
							},
							hits: {
								type: "integer",
								description: "Wind-Up Mouse: karts it can bump before it runs down"
							},
							weave: {
								type: "number",
								description: "Wind-Up Mouse: weave amplitude, fraction of the free road half width"
							},
							weaveSeconds: {
								type: "number",
								description: "Wind-Up Mouse: one full weave"
							},
							range: {
								type: "number",
								description: "Grapple Anchor: metres ahead along the road it can hook"
							},
							releaseMetres: {
								type: "number",
								description: "Grapple Anchor: the pull lets go this close and slingshots"
							},
							slingshotSeconds: {
								type: "number",
								description: "Grapple Anchor: item boost on release"
							},
							tugSlowTo: { type: "number" },
							tugSeconds: { type: "number" },
							burstRadius: {
								type: "number",
								description: "Strike Ball: the closing STRIKE burst spins karts inside it"
							},
							slamRadius: {
								type: "number",
								description: "Pogo Spring: the slam's shock ring"
							},
							popSpeed: {
								type: "number",
								description: "Strike Ball: m/s up given to a kart it knocks, so it flies like a pin"
							}
						}
					},
					hitEffect: {
						description: "What landing this item does to the victim. Omit for items that never hit.",
						type: "object",
						properties: {
							spinSeconds: { type: "number" },
							coinsLost: { type: "integer" },
							slowTo: { type: "number" },
							slowSeconds: { type: "number" },
							dropsItem: { type: "boolean" }
						}
					},
					icon: { type: "string" },
					sfx: { type: "string" },
					asset: { type: "string" },
					silhouetteChecked: {
						type: "boolean",
						description: "Passed the 32 px silhouette test"
					}
				}
			}
		},
		table: {
			description: "Weights per position (1-based index into the array). Missing items weigh 0.",
			type: "array",
			minItems: 8,
			maxItems: 8,
			items: {
				type: "object",
				additionalProperties: {
					type: "number",
					minimum: 0
				}
			}
		},
		lockoutSeconds: {
			type: "number",
			default: 15
		},
		ownerGraceSeconds: {
			type: "number",
			default: .35,
			description: "A kart cannot be hit by its own projectile or drop for this long after firing (turbo-kart-rush OWNER_GRACE)"
		},
		spawnAheadMetres: {
			type: "number",
			default: 1.5,
			description: "Projectiles spawn this far ahead (or behind) of the kart"
		},
		dropBehindMetres: {
			type: "number",
			default: 2.5,
			description: "Ground items land this far behind the kart; past kartRadius + the widest ground radius (0.85 + 1.2) so a parked kart never sits on its own drop"
		},
		projectileHeight: {
			type: "number",
			default: .35,
			description: "Metres above the road a projectile flies"
		},
		homingSnapDistance: {
			type: "number",
			default: 42,
			description: "Metres from its target at which the Homing Kite leaves the centreline for the lateral of its kart: one second of flight (42 m at 42 m/s, 30 at the old 30 m/s). At homingLateralRate sideways it must reach a kart out on the sand, up to 19 m off the centreline, before it passes it"
		},
		homingLateralRate: {
			type: "number",
			default: 11,
			description: "m/s the Kite can move sideways while snapping (8 at the old 30 m/s; it rose with the speed so it still lines up on a kart on the sand in its last second)"
		},
		maxProjectilesPerOwner: {
			type: "integer",
			default: 3,
			description: "Beach Balls and Wind-Up Mice one kart can have in flight at once (24 Sept 2026: 1 refused a Ball for the 10 s a Kite flew)"
		},
		maxKitesPerOwner: {
			type: "integer",
			default: 1,
			description: "Homing Kites one kart can have in flight at once (counted apart from maxProjectilesPerOwner)"
		},
		kiteWarnMetres: {
			type: "number",
			default: 8,
			description: "A Kite homing on a kart counts as a threat (items.threatened, the AI's cue to horn, hop or bubble) once it is this close ..."
		},
		kiteWarnSeconds: {
			type: "number",
			default: .4,
			description: "... or this many seconds from reaching it at its closing speed"
		},
		crossHitHeight: {
			type: "number",
			default: 1.5,
			description: "Where two roads cross at one level (Boardwalk), a shot, drop and kart on different roads touch when they overlap and are within this many metres in height"
		},
		maxGroundPerOwner: {
			type: "integer",
			default: 2,
			description: "A further drop pops the owner's oldest ground item"
		},
		trailBehindMetres: {
			type: "number",
			default: 1.9,
			description: "A trailed item rides this far behind the kart centre (past kartRadius + the item radius)"
		},
		hitHeight: {
			type: "number",
			default: 1.4,
			description: "A kart whose ground clearance is more than this passes over projectiles and ground items (Pogo Spring)"
		},
		finalLapLockoutSeconds: {
			type: "number",
			default: 8
		},
		lockedDuringLockout: {
			type: "array",
			items: { type: "string" }
		},
		knockoutPoolByRacers: {
			type: "object",
			additionalProperties: {
				type: "array",
				items: { type: "string" }
			},
			description: "Racers remaining → item ids allowed"
		}
	}
};
//#endregion
//#region src/items/data.ts
function Z(e) {
	return Xa.properties[e].default;
}
var Za = Object.freeze([
	{
		id: "beachBall",
		name: "Beach Ball",
		role: "forward",
		behaviour: {
			projectileSpeed: 38,
			bounces: 3,
			lifetimeSeconds: 8,
			radius: .6,
			affects: "target",
			trailable: !0
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "beach-ball",
		sfx: "ball-bounce"
	},
	{
		id: "homingKite",
		name: "Homing Kite",
		role: "homing",
		behaviour: {
			projectileSpeed: 42,
			homing: !0,
			lifetimeSeconds: 10,
			radius: .6,
			affects: "target"
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "kite",
		sfx: "kite-whoosh"
	},
	{
		id: "oilCan",
		name: "Oil Can",
		role: "rearDrop",
		behaviour: {
			lifetimeSeconds: 20,
			radius: 1.2,
			affects: "target",
			trailable: !0
		},
		hitEffect: {
			slowTo: .5,
			slowSeconds: 1,
			dropsItem: !1
		},
		icon: "oil-can",
		sfx: "oil-splash"
	},
	{
		id: "decoyBalloon",
		name: "Decoy Balloon",
		role: "deception",
		behaviour: {
			lifetimeSeconds: 20,
			radius: .9,
			affects: "target",
			trailable: !0
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "decoy-balloon",
		sfx: "balloon-pop-bad"
	},
	{
		id: "airHorn",
		name: "Air Horn",
		role: "defenceArea",
		behaviour: {
			radius: 6,
			affects: "adjacent"
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "air-horn",
		sfx: "air-horn"
	},
	{
		id: "bubble",
		name: "Bubble",
		role: "defenceHeld",
		behaviour: {
			durationSeconds: 8,
			weightBonus: .5,
			affects: "self"
		},
		icon: "bubble",
		sfx: "bubble-up"
	},
	{
		id: "fizzPop",
		name: "Fizz Pop",
		role: "speed",
		behaviour: {
			charges: 1,
			affects: "self"
		},
		icon: "fizz-pop",
		sfx: "fizz-pop"
	},
	{
		id: "tripleFizz",
		name: "Triple Fizz",
		role: "speed",
		behaviour: {
			charges: 3,
			chargeMultiplier: 2,
			chargeSeconds: 2,
			affects: "self"
		},
		icon: "triple-fizz",
		sfx: "fizz-pop"
	},
	{
		id: "fogBank",
		name: "Fog Bank",
		role: "equaliser",
		behaviour: {
			slowTo: .6,
			durationSeconds: 3,
			stripsItem: !0,
			minPosition: 5,
			affects: "ahead"
		},
		icon: "fog-bank",
		sfx: "fog-roll"
	},
	{
		id: "strikeBall",
		name: "Strike Ball",
		role: "ride",
		behaviour: {
			durationSeconds: 5,
			burstRadius: 7,
			popSpeed: 7,
			affects: "adjacent"
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "strike-ball",
		sfx: "strike-roll"
	},
	{
		id: "pogoSpring",
		name: "Pogo Spring",
		role: "jump",
		behaviour: {
			charges: 2,
			slamRadius: 6,
			affects: "adjacent"
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "pogo-spring",
		sfx: "boing"
	},
	{
		id: "grappleAnchor",
		name: "Grapple Anchor",
		role: "tether",
		behaviour: {
			range: 50,
			durationSeconds: 3,
			releaseMetres: 4,
			slingshotSeconds: 1.2,
			tugSlowTo: .8,
			tugSeconds: .6,
			affects: "target"
		},
		icon: "grapple-anchor",
		sfx: "anchor-throw"
	},
	{
		id: "windUpMouse",
		name: "Wind-Up Mouse",
		role: "runner",
		behaviour: {
			projectileSpeed: 32,
			lifetimeSeconds: 8,
			radius: .7,
			hits: 3,
			weave: .55,
			weaveSeconds: 1.6,
			affects: "target",
			trailable: !0
		},
		hitEffect: {
			spinSeconds: 1,
			dropsItem: !1
		},
		icon: "wind-up-mouse",
		sfx: "mouse-scurry"
	}
]), Qa = Object.freeze([
	{
		beachBall: 20,
		oilCan: 30,
		decoyBalloon: 20,
		bubble: 10,
		fizzPop: 10,
		windUpMouse: 10
	},
	{
		beachBall: 20,
		oilCan: 20,
		decoyBalloon: 15,
		bubble: 10,
		fizzPop: 15,
		windUpMouse: 10,
		pogoSpring: 10
	},
	{
		beachBall: 20,
		homingKite: 15,
		oilCan: 10,
		bubble: 10,
		fizzPop: 15,
		windUpMouse: 15,
		pogoSpring: 15
	},
	{
		beachBall: 10,
		homingKite: 20,
		bubble: 5,
		airHorn: 5,
		fizzPop: 10,
		tripleFizz: 15,
		windUpMouse: 15,
		pogoSpring: 10,
		grappleAnchor: 10
	},
	{
		homingKite: 20,
		airHorn: 10,
		fizzPop: 5,
		tripleFizz: 25,
		windUpMouse: 10,
		pogoSpring: 5,
		grappleAnchor: 15,
		strikeBall: 5,
		fogBank: 5
	},
	{
		homingKite: 15,
		airHorn: 10,
		tripleFizz: 25,
		pogoSpring: 5,
		grappleAnchor: 20,
		strikeBall: 15,
		fogBank: 10
	},
	{
		homingKite: 10,
		tripleFizz: 25,
		grappleAnchor: 15,
		strikeBall: 35,
		fogBank: 15
	},
	{
		tripleFizz: 20,
		grappleAnchor: 10,
		strikeBall: 50,
		fogBank: 20
	}
]), $a = Za.map((e) => e.id), eo = Object.freeze({
	rouletteSeconds: Z("rouletteSeconds"),
	items: [...Za],
	table: [...Qa],
	lockoutSeconds: Z("lockoutSeconds"),
	finalLapLockoutSeconds: Z("finalLapLockoutSeconds"),
	lockedDuringLockout: ["fogBank", "strikeBall"],
	knockoutPoolByRacers: {
		8: $a,
		6: $a,
		4: $a.filter((e) => e !== "fogBank" && e !== "strikeBall"),
		2: $a.filter((e) => e !== "fogBank" && e !== "decoyBalloon" && e !== "strikeBall")
	},
	ownerGraceSeconds: Z("ownerGraceSeconds"),
	spawnAheadMetres: Z("spawnAheadMetres"),
	dropBehindMetres: Z("dropBehindMetres"),
	projectileHeight: Z("projectileHeight"),
	homingSnapDistance: Z("homingSnapDistance"),
	homingLateralRate: Z("homingLateralRate"),
	maxProjectilesPerOwner: Z("maxProjectilesPerOwner"),
	maxKitesPerOwner: Z("maxKitesPerOwner"),
	kiteWarnMetres: Z("kiteWarnMetres"),
	kiteWarnSeconds: Z("kiteWarnSeconds"),
	crossHitHeight: Z("crossHitHeight"),
	maxGroundPerOwner: Z("maxGroundPerOwner"),
	trailBehindMetres: Z("trailBehindMetres"),
	hitHeight: Z("hitHeight")
}), to = Object.freeze(Object.fromEntries(Za.map((e) => [e.id, e.role])));
//#endregion
//#region src/items/projectiles.ts
function no(e, t, n, r) {
	let i = e.sample(t, 0, n).tangent, a = L(i[0], i[2]) || 1;
	return r[0] = i[2] / a, r[1] = 0, r[2] = -i[0] / a, r;
}
function ro(e, t, n, r) {
	let i = e.sample(t, 0, n).position, a = no(e, t, n, [
		0,
		0,
		0
	]);
	return (r[0] - i[0]) * a[0] + (r[2] - i[2]) * a[2];
}
function io(e) {
	return N.speedClasses[String(e)];
}
function ao(e, t, n, r) {
	let i = 0;
	for (let a of t.projectiles) a.owner === n && e.items.find((e) => e.id === a.itemId)?.behaviour.homing === !0 === r && i++;
	return i;
}
function oo(e, t) {
	return t === e || t === 0;
}
function so(e) {
	return !e.isGhost && e.finishTick === void 0 && e.status.intangibleRemaining <= 0;
}
function co(e, t, n, r) {
	let i = -1, a = .5;
	for (let o = 0; o < e.length; o++) {
		let s = e[o];
		if (o === t || !so(s) || !oo(r, s.branch)) continue;
		let c = W(s.t - n);
		c > 0 && c < a && (a = c, i = o);
	}
	return i;
}
function lo(e, t, n) {
	return co(e, t, e[t].t, n);
}
function uo(e, t, n, r, i, a, o, s, c) {
	let l = r[a], u = z(l.heading), d = s ? -1 : 1, f = (o.behaviour.projectileSpeed ?? 30) * io(i), p = [
		l.position[0] + u[0] * e.spawnAheadMetres * d,
		l.position[1],
		l.position[2] + u[2] * e.spawnAheadMetres * d
	], m = n.nearest(p, {
		t: l.t,
		branch: l.branch
	}, N.tSearchWindow), h = n.sample(m.t, 0, m.branch);
	p[1] = h.groundY + Sr(n, m.t, m.branch, ro(n, m.t, m.branch, p), h.halfWidth) + e.projectileHeight;
	let g = o.behaviour.homing === !0, _ = o.role === "runner", v = {
		id: t.nextId++,
		itemId: o.id,
		owner: a,
		ownerId: l.racerId,
		t: m.t,
		branch: m.branch,
		lateral: ro(n, m.t, m.branch, p),
		velocity: [
			u[0] * f * d,
			0,
			u[2] * f * d
		],
		speed: g ? f : _ ? f * d : 0,
		position: p,
		prevPosition: [...p],
		bouncesLeft: g || _ ? 0 : o.behaviour.bounces ?? 0,
		target: g ? lo(r, a, m.branch) : -1,
		ttl: o.behaviour.lifetimeSeconds ?? 8,
		graceRemaining: e.ownerGraceSeconds,
		radius: o.behaviour.radius ?? .5,
		hitsLeft: o.behaviour.hits ?? 1,
		hitMask: _ ? 1 << a : 0,
		age: 0,
		weave: _ ? o.behaviour.weave ?? 0 : 0,
		weaveSeconds: o.behaviour.weaveSeconds ?? 1
	};
	if (_ && v.weave > 0) {
		let e = Math.max(1e-6, h.halfWidth - v.radius);
		v.age = nn(Math.max(-1, Math.min(1, v.lateral / (e * v.weave)))) / (2 * Math.PI) * v.weaveSeconds;
	}
	return t.projectiles.push(v), c.push({
		type: "projectileSpawn",
		id: v.id,
		itemId: v.itemId,
		racerId: l.racerId,
		position: [...p]
	}), v;
}
function fo(e, t, n) {
	let r = e.projectiles.indexOf(t);
	r < 0 || (e.projectiles.splice(r, 1), n.push({
		type: "projectilePop",
		id: t.id,
		itemId: t.itemId,
		position: [...t.position]
	}));
}
var po = [
	0,
	0,
	0
], mo = 1e-9;
function ho(e, t, n, r, i, a) {
	let o = n.length;
	for (let s = t.projectiles.length - 1; s >= 0; s--) {
		let c = t.projectiles[s];
		if (c.prevPosition[0] = c.position[0], c.prevPosition[1] = c.position[1], c.prevPosition[2] = c.position[2], c.graceRemaining = Math.max(0, c.graceRemaining - i), c.ttl -= i, c.age += i, c.ttl <= 1e-9) {
			fo(t, c, a);
			continue;
		}
		if (c.speed !== 0) {
			let t = c.target >= 0 ? r[c.target] : void 0;
			if (t && !so(t) && (c.target = co(r, c.owner, c.t, c.branch)), c.t = W(c.t + c.speed * i / o), c.branch > 0) {
				let e = n.branches.list[c.branch], t = G(c.t, e.entryT);
				(t < 0 || t > e.span) && (c.branch = 0);
			}
			let a = 0;
			if (c.target >= 0) {
				let t = r[c.target], i = W(t.t - c.t) * o;
				t.branch === c.branch && i <= e.homingSnapDistance && (a = ro(n, t.t, t.branch, t.position));
			}
			let s = n.sample(c.t, 0, c.branch);
			if (c.weave > 0) c.lateral = I(2 * Math.PI * c.age / c.weaveSeconds) * c.weave * (s.halfWidth - c.radius);
			else {
				let t = e.homingLateralRate * i;
				c.lateral += Math.max(-t, Math.min(t, a - c.lateral));
			}
			let l = c.weave <= 0 && c.target >= 0, u = l ? jn(s, -1) : s.halfWidth, d = l ? jn(s, 1) : s.halfWidth;
			c.lateral = Math.max(-u + c.radius, Math.min(d - c.radius, c.lateral));
			let f = n.sample(c.t, c.lateral, c.branch);
			c.position[0] = f.position[0], c.position[1] = f.groundY + Sr(n, c.t, c.branch, c.lateral, f.halfWidth, f.open ?? 0) + e.projectileHeight, c.position[2] = f.position[2];
			continue;
		}
		c.position[0] += c.velocity[0] * i, c.position[2] += c.velocity[2] * i;
		let l = n.nearest(c.position, {
			t: c.t,
			branch: c.branch
		}, N.tSearchWindow);
		if (c.t = l.t, c.branch = l.branch, c.branch > 0) {
			let e = n.branches.list[c.branch].toLocal(c.t);
			(e <= mo || e >= .999999999) && (c.t = n.branches.main.nearestLocal(c.position, c.t, N.tSearchWindow).t, c.branch = 0);
		}
		let u = n.sample(c.t, 0, c.branch), d = no(n, c.t, c.branch, po), f = (c.position[0] - u.position[0]) * d[0] + (c.position[2] - u.position[2]) * d[2], p = jn(u, f) - c.radius;
		if (Math.abs(f) > p) {
			if (c.bouncesLeft--, c.bouncesLeft < 0) {
				fo(t, c, a);
				continue;
			}
			let e = c.velocity[0] * d[0] + c.velocity[2] * d[2];
			c.velocity[0] -= 2 * e * d[0], c.velocity[2] -= 2 * e * d[2], f = Math.sign(f) * p, a.push({
				type: "projectileBounce",
				id: c.id,
				itemId: c.itemId,
				position: [...c.position],
				bouncesLeft: c.bouncesLeft
			});
		}
		c.lateral = f;
		let m = n.sample(c.t, f, c.branch);
		c.position[0] = m.position[0], c.position[2] = m.position[2], c.position[1] = m.groundY + Sr(n, c.t, c.branch, f, m.halfWidth, m.open ?? 0) + e.projectileHeight;
	}
}
//#endregion
//#region src/items/ground.ts
function go(e, t, n, r, i, a, o) {
	let s = r[i], c = t.groundItems.filter((e) => e.owner === i);
	for (; c.length >= e.maxGroundPerOwner;) _o(t, c.shift(), o);
	let l = z(s.heading), u = [
		s.position[0] - l[0] * e.dropBehindMetres,
		s.position[1],
		s.position[2] - l[2] * e.dropBehindMetres
	], d = n.nearest(u, {
		t: s.t,
		branch: s.branch
	}, N.tSearchWindow), f = ro(n, d.t, d.branch, u), p = n.sample(d.t, f, d.branch);
	u[1] = p.groundY + Sr(n, d.t, d.branch, f, p.halfWidth);
	let m = {
		id: t.nextId++,
		itemId: a.id,
		owner: i,
		ownerId: s.racerId,
		t: d.t,
		branch: d.branch,
		position: u,
		ttl: a.behaviour.lifetimeSeconds ?? 20,
		graceRemaining: e.ownerGraceSeconds,
		radius: a.behaviour.radius ?? 1
	};
	return t.groundItems.push(m), o.push({
		type: "groundPlace",
		id: m.id,
		itemId: m.itemId,
		racerId: s.racerId,
		position: [...m.position]
	}), m;
}
function _o(e, t, n) {
	let r = e.groundItems.indexOf(t);
	r < 0 || (e.groundItems.splice(r, 1), n.push({
		type: "groundPop",
		id: t.id,
		itemId: t.itemId,
		position: [...t.position]
	}));
}
function vo(e, t) {
	for (let n = 0; n < e.length; n++) if (e[n].branch === t) return !0;
	return !1;
}
function yo(e, t, n, r, i) {
	for (let a = e.groundItems.length - 1; a >= 0; a--) {
		let o = e.groundItems[a];
		o.graceRemaining = Math.max(0, o.graceRemaining - r), o.ttl -= r, (o.ttl <= 1e-9 || !t.branches.list[o.branch].open && !vo(n, o.branch)) && _o(e, o, i);
	}
}
//#endregion
//#region src/items/rng.ts
var bo = 45477;
function xo(e, t = bo) {
	return (Math.imul(e | 0, 2654435761) ^ Math.imul(t + 1, 2246822519)) >>> 0;
}
function So(e) {
	e.rng = e.rng + 1831565813 >>> 0;
	let t = e.rng;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), (t ^ t >>> 14) >>> 0;
}
function Co(e) {
	return So(e) / 4294967296;
}
function wo(e, t) {
	let n = 0;
	for (let t of Object.values(e)) t > 0 && (n += t);
	if (n <= 0) return;
	let r = 0, i;
	for (let [a, o] of Object.entries(e)) if (!(o <= 0) && (i = a, r += o, t * n < r)) return a;
	return i;
}
//#endregion
//#region src/items/roulette.ts
function To(e, t, n) {
	if (e.phase !== "finalLap") return Infinity;
	let r = -1;
	for (let t = 0; t < e.karts.length; t++) {
		let n = e.karts[t];
		n.isGhost || n.finishTick !== void 0 || (r < 0 || n.rank < e.karts[r].rank) && (r = t);
	}
	if (r < 0) return Infinity;
	let i = e.lapsTotal * n.length - e.karts[r].distanceAlong;
	return Math.max(0, i) / t[r].topSpeed;
}
function Eo(e) {
	let t = e.knockout?.eliminated ?? [], n = 0;
	for (let r of e.karts) !r.isGhost && !t.includes(r.racerId) && n++;
	return n;
}
function Do(e, t, n) {
	return t <= 1 ? 1 : Math.min(n, 1 + Math.round((Math.min(Math.max(e, 1), Math.max(t, 1)) - 1) * (n - 1) / (t - 1)));
}
function Oo(e, t) {
	let n = -1;
	for (let r of Object.keys(e.knockoutPoolByRacers)) {
		let e = Number(r);
		e <= t && e > n && (n = e);
	}
	return n < 0 ? void 0 : e.knockoutPoolByRacers[String(n)];
}
function ko(e, t, n, r, i) {
	let a = Eo(t), o = { ...e.table[Do(i, a, e.table.length) - 1] };
	if (t.time < e.lockoutSeconds || To(t, n, r) <= e.finalLapLockoutSeconds) for (let t of e.lockedDuringLockout) o[t] = 0;
	for (let t of e.items) o[t.id] && i < (t.behaviour.minPosition ?? 1) && (o[t.id] = 0);
	if (t.mode === "knockout") {
		let t = Oo(e, a);
		if (t) for (let e of Object.keys(o)) t.includes(e) || (o[e] = 0);
	}
	return o;
}
function Ao(e, t, n, r, i, a, o) {
	let s = n.karts[a];
	if (s.isGhost || s.finishTick !== void 0) return !1;
	let c = s.item.held === "none" && s.item.rouletteRemaining <= 0, l = s.item.next === "none" && s.item.nextRouletteRemaining <= 0;
	if (!c && !l) return !1;
	let u = wo(ko(e, n, r, i, s.rank), Co(t));
	if (!u) return !1;
	let d = e.items.find((e) => e.id === u)?.behaviour.charges ?? 1, f = +!c;
	return f === 0 ? (s.item.held = u, s.item.charges = d, s.item.rouletteRemaining = e.rouletteSeconds) : (s.item.next = u, s.item.nextCharges = d, s.item.nextRouletteRemaining = e.rouletteSeconds), o.push({
		type: "roulette",
		racerId: s.racerId,
		itemId: u,
		seconds: e.rouletteSeconds,
		slot: f
	}), !0;
}
function jo(e, t) {
	let n = e - t;
	return n > 1e-9 ? n : 0;
}
function Mo(e, t, n) {
	e.item.rouletteRemaining > 0 && (e.item.rouletteRemaining = jo(e.item.rouletteRemaining, t), e.item.rouletteRemaining === 0 && e.item.held !== "none" && n.push({
		type: "itemReady",
		racerId: e.racerId,
		itemId: e.item.held,
		slot: 0
	})), e.item.nextRouletteRemaining > 0 && (e.item.nextRouletteRemaining = jo(e.item.nextRouletteRemaining, t), e.item.nextRouletteRemaining === 0 && e.item.next !== "none" && n.push({
		type: "itemReady",
		racerId: e.racerId,
		itemId: e.item.next,
		slot: 1
	}));
}
function No(e) {
	e.item.held = "none", e.item.charges = 0, e.item.rouletteRemaining = 0, e.item.next = "none", e.item.nextCharges = 0, e.item.nextRouletteRemaining = 0;
}
function Po(e) {
	e.item.held = e.item.next, e.item.charges = e.item.nextCharges, e.item.rouletteRemaining = e.item.nextRouletteRemaining, e.item.next = "none", e.item.nextCharges = 0, e.item.nextRouletteRemaining = 0;
}
//#endregion
//#region src/items/hits.ts
function Q(e, t) {
	return L(e[0] - t[0], e[2] - t[2]);
}
function Fo(e) {
	return !e.isGhost && e.finishTick === void 0 && e.status.intangibleRemaining <= 0 && e.status.spinRemaining <= 0 && !V(e);
}
function Io(e, t, n, r, i, a, o, s, c) {
	let l = e[r];
	if (!Fo(l)) return !1;
	if (l.status.shield) return l.status.shield = !1, n.shieldRemaining[r] = 0, s.push({
		type: "shieldPop",
		racerId: l.racerId
	}), !0;
	let u = a.hitEffect ?? {}, d = !1, f = 0;
	if ((u.spinSeconds ?? 0) > 0) {
		c.length = 0, Ur(l, t[r], o, c);
		for (let e of c) e.type === "hit" && (d = e.spun, f = e.coinsLost);
	} else u.slowTo !== void 0 && (l.speed = Math.min(l.speed, t[r].topSpeed * u.slowTo), H(l), _e(l), l.status.slowedTo = Math.min(l.status.slowRemaining > 0 ? l.status.slowedTo : 1, u.slowTo), l.status.slowRemaining = Math.max(l.status.slowRemaining, u.slowSeconds ?? 0));
	return u.dropsItem && l.item.held !== "none" && (s.push({
		type: "itemLost",
		racerId: l.racerId,
		itemId: l.item.held
	}), l.item.next !== "none" && s.push({
		type: "itemLost",
		racerId: l.racerId,
		itemId: l.item.next
	}), No(l)), s.push({
		type: "hit",
		racerId: l.racerId,
		byRacerId: i,
		itemId: a.id,
		spun: d,
		coinsLost: f
	}), !0;
}
function Lo(e, t, n, r) {
	let i = e[t], a = n.behaviour.slowTo ?? 1, o = n.behaviour.durationSeconds ?? 0, s = [];
	for (let c = 0; c < e.length; c++) {
		let l = e[c];
		c === t || l.isGhost || l.finishTick !== void 0 || l.rank >= i.rank || V(l) || (l.status.slowedTo = Math.min(l.status.slowRemaining > 0 ? l.status.slowedTo : 1, a), l.status.slowRemaining = Math.max(l.status.slowRemaining, o), n.behaviour.stripsItem && (l.item.held !== "none" && r.push({
			type: "itemLost",
			racerId: l.racerId,
			itemId: l.item.held
		}), l.item.next !== "none" && r.push({
			type: "itemLost",
			racerId: l.racerId,
			itemId: l.item.next
		}), No(l)), s.push(l.racerId));
	}
	return r.push({
		type: "fog",
		racerId: i.racerId,
		victims: s
	}), s;
}
//#endregion
//#region src/items/powers.ts
function Ro(e, t) {
	return Math.abs(e.position[1] - t.position[1]) < 2;
}
function zo(e, t, n, r, i, a, o, s) {
	let c = e[r];
	for (let l = 0; l < e.length; l++) l !== r && Ro(c, e[l]) && Q(e[l].position, c.position) <= a + t[l].kartRadius && Io(e, t, n, l, c.racerId, i, "item", o, s);
}
function Bo(e, t, n, r, i, a) {
	for (let o = 0; o < t.length; o++) {
		let s = t[o];
		if (e.power[o]) {
			let c = r.get(e.power[o]);
			if (s.status.held) s.status.rideRemaining = 0, i.push({
				type: "powerEnd",
				racerId: s.racerId,
				itemId: c.id
			}), s.item.held === c.id && s.item.charges === 0 && Po(s), e.power[o] = "";
			else if (V(s)) {
				for (let r = 0; r < t.length; r++) {
					let l = t[r];
					r === o || e.knocked[o] & 1 << r || !Ro(s, l) || Q(l.position, s.position) > Pn(s, n[o]) + Pn(l, n[r]) + .3 || Io(t, n, e, r, s.racerId, c, "item", i, a) && (e.knocked[o] |= 1 << r, l.status.spinRemaining > 0 && (l.verticalVelocity = c.behaviour.popSpeed ?? 0, l.grounded = !1));
				}
				for (let t = e.groundItems.length - 1; t >= 0; t--) {
					let r = e.groundItems[t];
					Q(r.position, s.position) <= Pn(s, n[o]) + r.radius && _o(e, r, i);
				}
			} else {
				let r = c.behaviour.burstRadius ?? 0;
				i.push({
					type: "burst",
					racerId: s.racerId,
					position: [...s.position],
					radius: r
				}), zo(t, n, e, o, c, r, i, a), i.push({
					type: "powerEnd",
					racerId: s.racerId,
					itemId: c.id
				}), s.item.held === c.id && s.item.charges === 0 && Po(s), e.power[o] = "";
			}
		}
		if (e.pogo[o] > 0 && s.grounded) {
			let c = r.get("pogoSpring");
			if (e.pogo[o] === 2 && c) {
				let r = c.behaviour.slamRadius ?? 0;
				i.push({
					type: "springSlam",
					racerId: s.racerId,
					position: [...s.position],
					radius: r
				}), zo(t, n, e, o, c, r, i, a);
			} else s.item.held === "pogoSpring" && s.item.charges === 1 && (s.item.charges = 0, Po(s));
			e.pogo[o] = 0;
		}
		if (e.towing[o]) {
			let c = r.get("grappleAnchor"), l = s.status.towTarget, u = l >= 0 ? t[l] : void 0, d = !1, f = !Nn(s) || !u || !c;
			!f && u && c && (u.finishTick !== void 0 || u.isGhost || u.status.intangibleRemaining > 0 || V(u) || u.branch !== s.branch && u.branch !== 0 ? f = !0 : Q(s.position, u.position) <= (c.behaviour.releaseMetres ?? 0) && (f = d = !0, ge(s, "item", n[o].itemSpeedMultiplier, c.behaviour.slingshotSeconds ?? 0, a), u.status.slowedTo = Math.min(u.status.slowRemaining > 0 ? u.status.slowedTo : 1, c.behaviour.tugSlowTo ?? 1), u.status.slowRemaining = Math.max(u.status.slowRemaining, c.behaviour.tugSeconds ?? 0))), f && (i.push({
				type: "tetherEnd",
				racerId: s.racerId,
				targetId: u?.racerId ?? "",
				slingshot: d
			}), s.status.towRemaining = 0, s.status.towTarget = -1, e.towing[o] = !1);
		}
	}
}
//#endregion
//#region src/items/use.ts
function Vo(e, t, n) {
	return e.push({
		type: "itemRefused",
		racerId: t.racerId,
		itemId: t.item.held,
		reason: n
	}), !1;
}
function Ho(e, t, n = !1) {
	e.item.charges = Math.max(0, e.item.charges - 1), t.push({
		type: "itemUsed",
		racerId: e.racerId,
		itemId: e.item.held,
		chargesLeft: e.item.charges
	}), e.item.charges === 0 && !n && Po(e);
}
function Uo(e, t) {
	return e.phase !== "racing" && e.phase !== "finalLap" || t.isGhost || t.finishTick !== void 0 ? "notRacing" : t.item.rouletteRemaining > 0 ? "roulette" : t.item.charges <= 0 ? "inUse" : t.status.spinRemaining > 0 ? "spinning" : t.status.intangibleRemaining > 0 ? "intangible" : null;
}
function Wo(e, t, n, r) {
	let i = e[t], a = -1, o = r / n;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		if (n === t || r.branch !== i.branch || r.isGhost || r.finishTick !== void 0 || r.status.intangibleRemaining > 0 || V(r)) continue;
		let s = W(r.t - i.t);
		s > 0 && s <= o && (o = s, a = n);
	}
	return a;
}
function Go(e, t, n, r, i, a, o, s, c) {
	let l = n.karts, u = l[a];
	if (u.item.held === "none") return !1;
	let d = e.items.find((e) => e.id === u.item.held);
	if (!d) return !1;
	let f = Uo(n, u);
	if (f) return Vo(s, u, f);
	let p = !1;
	switch (d.role) {
		case "forward":
		case "homing":
		case "runner": {
			let r = d.role === "homing";
			if (ao(e, t, a, r) >= (r ? e.maxKitesPerOwner : e.maxProjectilesPerOwner)) return Vo(s, u, "inFlight");
			uo(e, t, i, l, n.speedClass, a, d, d.role !== "homing" && o.lookBack, s);
			break;
		}
		case "rearDrop":
		case "deception":
			go(e, t, i, l, a, d, s);
			break;
		case "defenceArea":
			Ko(t, l, r, a, d, s, c);
			break;
		case "defenceHeld":
			u.status.shield = !0, t.shieldRemaining[a] = d.behaviour.durationSeconds ?? 0, s.push({
				type: "shieldUp",
				racerId: u.racerId
			});
			break;
		case "speed": {
			let e = r[a];
			ge(u, "item", e.itemSpeedMultiplier, e.itemSpeedSeconds, c), d.behaviour.chargeMultiplier && (u.drift.chargeMultiplier = d.behaviour.chargeMultiplier, u.drift.chargeMultiplierRemaining = d.behaviour.chargeSeconds ?? 0);
			break;
		}
		case "equaliser":
			if (u.rank < (d.behaviour.minPosition ?? 1)) return Vo(s, u, "position");
			Lo(l, a, d, s);
			break;
		case "ride": {
			let e = d.behaviour.durationSeconds ?? 0;
			u.status.rideRemaining = e, u.status.towRemaining = 0, u.status.towTarget = -1, t.power[a] = d.id, t.knocked[a] = 0, t.trailing[a] = !1, s.push({
				type: "powerStart",
				racerId: u.racerId,
				itemId: d.id,
				seconds: e
			}), p = !0;
			break;
		}
		case "jump": {
			let e = r[a];
			if (t.pogo[a] === 0) u.verticalVelocity = e.springLaunch, u.grounded = !1, u.airborne.fromJumpId = "pogo", u.airborne.seconds = 0, u.airborne.trickQueued = !1, t.pogo[a] = 1, s.push({
				type: "springLaunch",
				racerId: u.racerId
			});
			else if (t.pogo[a] === 1) u.verticalVelocity = -e.slamSpeed, u.airborne.trickQueued = !1, t.pogo[a] = 2;
			else return Vo(s, u, "inUse");
			break;
		}
		case "tether": {
			let e = Wo(l, a, i.length, d.behaviour.range ?? 0);
			if (e < 0) return Vo(s, u, "noTarget");
			let n = l[e];
			if (n.status.shield) {
				Io(l, r, t, e, u.racerId, d, "item", s, c);
				break;
			}
			u.status.towTarget = e, u.status.towRemaining = d.behaviour.durationSeconds ?? 0, t.towing[a] = !0, s.push({
				type: "tetherStart",
				racerId: u.racerId,
				targetId: n.racerId
			});
			break;
		}
	}
	return Ho(u, s, p), !0;
}
function Ko(e, t, n, r, i, a, o) {
	let s = t[r], c = i.behaviour.radius ?? 0;
	a.push({
		type: "horn",
		racerId: s.racerId,
		position: [...s.position],
		radius: c
	});
	for (let t = e.projectiles.length - 1; t >= 0; t--) {
		let n = e.projectiles[t];
		Q(n.position, s.position) <= c + n.radius && fo(e, n, a);
	}
	for (let t = e.groundItems.length - 1; t >= 0; t--) {
		let n = e.groundItems[t];
		Q(n.position, s.position) <= c + n.radius && _o(e, n, a);
	}
	for (let l = 0; l < t.length; l++) l !== r && Q(t[l].position, s.position) <= c + n[l].kartRadius && Io(t, n, e, l, s.racerId, i, "item", a, o);
}
//#endregion
//#region src/items/items.ts
function qo(e, t, n, r, i) {
	let a = e.sample(t, 0, n);
	return Math.abs(r) > jn(a, r) + i;
}
var Jo = class {
	cfg;
	track;
	host;
	state;
	roles;
	threatened;
	threatDistance;
	defs = /* @__PURE__ */ new Map();
	scratch = [];
	inert;
	doubles;
	constructor(e, t, n = eo) {
		this.cfg = n, this.track = e, this.host = t;
		for (let e of n.items) this.defs.set(e.id, e);
		this.roles = n === eo ? to : Object.fromEntries(n.items.map((e) => [e.id, e.role]));
		let r = t.state.karts.length;
		this.threatened = Array(r).fill(!1), this.threatDistance = Array(r).fill(Infinity), this.state = {
			rng: xo(t.state.seed),
			nextId: 1,
			prevItem: Array(r).fill(!1),
			shieldRemaining: Array(r).fill(0),
			fogHeldBy: "",
			projectiles: [],
			groundItems: [],
			trailing: Array(r).fill(!1),
			power: Array(r).fill(""),
			knocked: Array(r).fill(0),
			pogo: Array(r).fill(0),
			towing: Array(r).fill(!1)
		}, this.inert = t.state.mode === "timeTrial", this.doubles = e.features.filter((e) => e.kind === "pickup").map((e) => e.double === !0);
	}
	isTrailing(e) {
		return this.state.trailing[e];
	}
	trailable(e) {
		return this.defs.get(e.item.held)?.behaviour.trailable === !0;
	}
	snapshot() {
		return structuredClone(this.state);
	}
	restore(e) {
		this.state = structuredClone(e);
	}
	step(e, t, n) {
		let r = [];
		if (this.inert) return r;
		this.scratch.length = 0;
		let i = this.host.state, a = this.host.consts, o = this.track, s = this.state, c = this.cfg, l = i.karts;
		for (let e of t) if (e.type === "trackChanged") {
			this.reseat(r);
			break;
		}
		for (let e = 0; e < l.length; e++) {
			let t = l[e];
			Mo(t, n, r), s.shieldRemaining[e] > 0 && !t.status.shield && (s.shieldRemaining[e] = 0, r.push({
				type: "shieldPop",
				racerId: t.racerId
			})), s.shieldRemaining[e] > 0 && (s.shieldRemaining[e] = Math.max(0, s.shieldRemaining[e] - n), s.shieldRemaining[e] === 0 && t.status.shield && (t.status.shield = !1, r.push({
				type: "shieldEnd",
				racerId: t.racerId
			})));
		}
		for (let e of t) {
			if (e.type !== "pickup") continue;
			let t = l.findIndex((t) => t.racerId === e.racerId);
			t < 0 || (Ao(c, s, i, a, o, t, r), this.doubles[e.index] && Ao(c, s, i, a, o, t, r));
		}
		for (let t = 0; t < l.length; t++) {
			let n = l[t], u = e[t]?.item === !0, d = s.prevItem[t];
			if (s.prevItem[t] = u, s.trailing[t] && (!this.trailable(n) || n.item.charges <= 0) && (s.trailing[t] = !1), s.trailing[t] && n.status.spinRemaining > 0) {
				s.trailing[t] = !1, r.push({
					type: "itemLost",
					racerId: n.racerId,
					itemId: n.item.held
				}), Ho(n, r);
				continue;
			}
			u && !d ? this.trailable(n) && Uo(i, n) === null ? (s.trailing[t] = !0, r.push({
				type: "trailStart",
				racerId: n.racerId,
				itemId: n.item.held
			})) : Go(c, s, i, a, o, t, e[t], r, this.scratch) : !u && d && s.trailing[t] && (s.trailing[t] = !1, Go(c, s, i, a, o, t, e[t], r, this.scratch));
		}
		ho(c, s, o, l, n, r), yo(s, o, l, n, r);
		let u = s.projectiles, d = s.groundItems;
		for (let e = u.length - 1; e >= 0; e--) {
			let t = u[e], n = !1;
			for (let i = e - 1; i >= 0 && !n; i--) {
				let a = u[i];
				this.meets(t.branch, t.position[1], a.branch, a.position[1]) && Q(t.position, a.position) <= t.radius + a.radius && (fo(s, t, r), fo(s, a, r), n = !0, e--);
			}
			if (!n) {
				for (let e = d.length - 1; e >= 0 && !n; e--) {
					let i = d[e];
					this.meets(t.branch, t.position[1] - c.projectileHeight, i.branch, i.position[1]) && Q(t.position, i.position) <= t.radius + i.radius && (fo(s, t, r), _o(s, i, r), n = !0);
				}
				if (!n) for (let e = 0; e < l.length && !n; e++) {
					let i = l[e];
					if (t.hitMask & 1 << e || !this.meets(t.branch, t.position[1] - c.projectileHeight, i.branch, i.position[1]) || e === t.owner && t.graceRemaining > 0 || Q(t.position, i.position) > t.radius + a[e].kartRadius || i.position[1] - (t.position[1] - c.projectileHeight) > c.hitHeight) continue;
					if (V(i)) {
						fo(s, t, r), n = !0;
						continue;
					}
					if (!Fo(i)) continue;
					if (s.trailing[e] && this.fromBehind(t, i)) {
						r.push({
							type: "trailBlock",
							racerId: i.racerId,
							itemId: i.item.held,
							position: [...t.position]
						}), s.trailing[e] = !1, Ho(i, r), fo(s, t, r), n = !0;
						continue;
					}
					let o = this.defs.get(t.itemId);
					Io(l, a, s, e, t.ownerId, o, "projectile", r, this.scratch), t.hitMask |= 1 << e, --t.hitsLeft <= 0 && (fo(s, t, r), n = !0);
				}
			}
		}
		for (let e = d.length - 1; e >= 0; e--) {
			let t = d[e];
			for (let e = 0; e < l.length; e++) {
				let n = l[e];
				if (!Fo(n) || !this.meets(t.branch, t.position[1], n.branch, n.position[1]) || e === t.owner && t.graceRemaining > 0 || Q(t.position, n.position) > t.radius + a[e].kartRadius || n.position[1] - t.position[1] > c.hitHeight) continue;
				let i = this.defs.get(t.itemId);
				Io(l, a, s, e, t.ownerId, i, "item", r, this.scratch), _o(s, t, r);
				break;
			}
		}
		Bo(s, l, a, this.defs, r, this.scratch), this.threatened.fill(!1), this.threatDistance.fill(Infinity);
		for (let e of s.projectiles) {
			if (e.target < 0) continue;
			let t = l[e.target], n = Q(e.position, t.position);
			n < this.threatDistance[e.target] && (this.threatDistance[e.target] = n);
			let r = Math.abs(e.speed) - t.speed;
			(n <= c.kiteWarnMetres || r > 0 && n / r <= c.kiteWarnSeconds) && (this.threatened[e.target] = !0);
		}
		let f = "";
		for (let e of l) if (this.defs.get(e.item.held)?.role === "equaliser" || this.defs.get(e.item.next)?.role === "equaliser") {
			f = e.racerId;
			break;
		}
		return f !== s.fogHeldBy && (s.fogHeldBy && r.push({
			type: "equaliserHeld",
			racerId: s.fogHeldBy,
			on: !1
		}), f && r.push({
			type: "equaliserHeld",
			racerId: f,
			on: !0
		}), s.fogHeldBy = f), r;
	}
	reseat(e) {
		let t = this.track, n = this.state;
		if (t.def.finalLapShift.routeOverrides?.length) {
			for (let r = n.projectiles.length - 1; r >= 0; r--) {
				let i = n.projectiles[r];
				this.seat(i), i.lateral = ro(t, i.t, i.branch, i.position), qo(t, i.t, i.branch, i.lateral, i.radius) && fo(n, i, e);
			}
			for (let r = n.groundItems.length - 1; r >= 0; r--) {
				let i = n.groundItems[r];
				this.seat(i), qo(t, i.t, i.branch, ro(t, i.t, i.branch, i.position), i.radius) && _o(n, i, e);
			}
		}
	}
	seat(e) {
		let t = this.track.branches, n = e.branch > 0 ? Ja(t, e.position) : -1;
		n >= 0 ? (e.t = n, e.branch = 0) : e.t = t.list[e.branch].nearestGlobal(e.position).t;
	}
	meets(e, t, n, r) {
		return e === n || Math.abs(t - r) <= this.cfg.crossHitHeight;
	}
	fromBehind(e, t) {
		let n = z(t.heading);
		return (e.position[0] - t.position[0]) * n[0] + (e.position[2] - t.position[2]) * n[2] < 0;
	}
};
//#endregion
//#region src/race-manager/checkpoints.ts
function Yo(e, t) {
	return {
		gridSlot: e,
		nextCheckpoint: 0,
		lastCheckpoint: 0,
		prevT: t,
		lapTicks: [],
		throttleHeldSinceTick: -1,
		hazardCooldownRemaining: 0,
		ventCooldownRemaining: 0,
		shownRank: 0,
		rankHeldSeconds: 0,
		wrongWayOn: !1,
		wrongWaySeconds: 0,
		stuckSeconds: 0,
		freezeRemaining: 0,
		respawnCount: 0,
		dnf: !1,
		finalDistance: 0
	};
}
function Xo(e, t, n, r, i, a, o) {
	let s = n.checkpoints.length;
	if (t.lastCheckpoint = r, t.nextCheckpoint = (r + 1) % s, r !== 0) return e.checkpointsHit++, o.push({
		type: "checkpoint",
		racerId: e.racerId,
		index: r
	}), "checkpoint";
	let c = e.checkpointsHit === s - 1;
	return e.checkpointsHit = 0, c ? (t.lapTicks.push(a), e.lap >= i ? (e.finishTick = a, "finish") : (e.lap++, o.push({
		type: "lap",
		racerId: e.racerId,
		lap: e.lap,
		isFinal: e.lap === i
	}), "lap")) : "checkpoint";
}
function Zo(e, t, n, r, i, a) {
	let o = t.prevT;
	if (t.prevT = e.t, e.isGhost || e.finishTick !== void 0) return "none";
	let s = n.checkpoints.length;
	if (W(e.t - o) > Y.teleportGuardSectors / s) return "none";
	let c = n.checkpoints[t.nextCheckpoint];
	return yr(o, e.t, c.t) ? Xo(e, t, n, t.nextCheckpoint, r, i, a) : "none";
}
function Qo(e, t, n, r, i, a) {
	if (t.prevT = e.t, e.isGhost || e.finishTick !== void 0) return "none";
	let o = n.checkpoints.length, s = n.checkpoints[t.nextCheckpoint], c = G(e.t, s.t);
	return c > 0 && c < Y.checkpointResyncSectors / o ? Xo(e, t, n, t.nextCheckpoint, r, i, a) : "none";
}
var $o = 1.5;
function es(e, t, n) {
	let r = n.checkpoints[t.lastCheckpoint], i = n.length, a = W(e.t - r.t), o = a > $o / n.checkpoints.length ? a - 1 : a;
	return (e.lap - 1) * i + (W(r.t - n.startT) + o) * i;
}
//#endregion
//#region src/race-manager/countdown.ts
var ts = Math.round(Y.countdownStepSeconds * 120), ns = Y.countdownSteps * ts;
function rs(e, t, n, r, i, a, o) {
	for (let i = 0; i < t.length; i++) {
		let t = n[i];
		r[i].throttle > Y.stuckInputMin ? t.throttleHeldSinceTick < 0 && (t.throttleHeldSinceTick = e) : t.throttleHeldSinceTick = -1;
	}
	if (e < ns) return e % ts === 0 && a.push({
		type: "countdown",
		stepsLeft: Y.countdownSteps - e / ts
	}), !1;
	for (let e = 0; e < t.length; e++) {
		let r = n[e].throttleHeldSinceTick;
		r >= 0 && Wr(t[e], i[e], (ns - r) / 120, o[e]);
	}
	return a.push({ type: "go" }), !0;
}
//#endregion
//#region src/race-manager/util.ts
var is = 1e-9;
function as(e, t) {
	let n = e - t;
	return n > is ? n : 0;
}
function os(e, t) {
	return L(e[0] - t[0], e[2] - t[2]);
}
function ss(e, t) {
	return R(e[0] - t[0], e[1] - t[1], e[2] - t[2]);
}
//#endregion
//#region src/race-manager/hazards.ts
function cs(e, t, n, r, i, a, o) {
	if (t.hazardCooldownRemaining = as(t.hazardCooldownRemaining, i), t.ventCooldownRemaining = as(t.ventCooldownRemaining, i), e.isGhost || e.finishTick !== void 0) return;
	if (t.hazardInside !== void 0) {
		let i = r.find((e) => e.id === t.hazardInside);
		(!i || ss(e.position, i.position) > i.radius + n.kartRadius) && (t.hazardInside = void 0);
	}
	let s, c;
	for (let l of r) if (!(ss(e.position, l.position) > l.radius + n.kartRadius) && !(e.status.intangibleRemaining > 0 || V(e)) && (!l.ground || e.grounded)) {
		if ((!s || !c) && (s = z(e.heading), c = Mn(e.heading)), l.hit === "launch") {
			let n = l.launch ?? 0;
			if (t.ventCooldownRemaining > 0 || e.airborne.fromJumpId === l.id || e.verticalVelocity >= n) continue;
			e.verticalVelocity = n, e.grounded = !1, e.airborne.fromJumpId = l.id, e.airborne.seconds = 0, t.ventCooldownRemaining = U.ventEruptSeconds, o.push({
				type: "launched",
				jumpId: l.id
			});
			continue;
		}
		if (l.type === "gust") {
			let t = l.push ?? [
				0,
				0,
				0
			];
			e.speed += (t[0] * s[0] + t[2] * s[2]) * i, e.lateralVelocity += (t[0] * c[0] + t[2] * c[2]) * i;
			continue;
		}
		if (!(t.hazardCooldownRemaining > 0 || e.status.spinRemaining > 0 || l.id === t.hazardInside)) {
			if (e.status.shield && (l.hit === "spin" || l.hit === "slow")) {
				e.status.shield = !1, t.hazardCooldownRemaining = Y.hazardCooldownSeconds, t.hazardInside = l.id;
				continue;
			}
			switch (l.hit) {
				case "spin":
					Ur(e, n, "hazard", o);
					break;
				case "slow":
					e.status.slowedTo = Y.hazardSlowTo, e.status.slowRemaining = Y.hazardSlowSeconds;
					break;
				case "bump": {
					let t = e.position[0] - l.position[0], n = e.position[2] - l.position[2], r = t * c[0] + n * c[2] >= 0 ? 1 : -1;
					e.lateralVelocity += r * Y.hazardBumpLateral;
					break;
				}
			}
			t.hazardCooldownRemaining = Y.hazardCooldownSeconds, t.hazardInside = l.id, a.push({
				type: "hazardHit",
				racerId: e.racerId,
				hazardId: l.id,
				hit: l.hit
			});
		}
	}
}
//#endregion
//#region src/race-manager/pickups.ts
function ls(e) {
	let t = {
		pickups: [],
		coins: []
	};
	return e.features.forEach((e, n) => {
		e.kind === "pickup" ? t.pickups.push(n) : e.kind === "coin" && t.coins.push(n);
	}), t;
}
function us(e) {
	return {
		pickupStates: e.pickups.map(() => ({ respawnRemaining: 0 })),
		coinStates: e.coins.map(() => ({ respawnRemaining: 0 }))
	};
}
function ds(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < t.length; c++) {
		let l = n[c];
		if (l.respawnRemaining = as(l.respawnRemaining, o), l.respawnRemaining > 0) continue;
		let u = r.features[t[c]];
		if (!r.branches.list[u.branch].open) continue;
		let d = u.width / 2;
		for (let t = 0; t < i.length; t++) {
			let n = i[t];
			if (!(n.isGhost || n.finishTick !== void 0 || n.status.held || n.branch !== u.branch) && !(os(n.position, u.position) > d + a[t].kartRadius)) {
				e === "coin" ? (l.respawnRemaining = Y.coinRespawnSeconds, n.coins = Math.min(a[t].coinCap, n.coins + 1), s.push({
					type: "coin",
					racerId: n.racerId,
					coins: n.coins
				})) : (l.respawnRemaining = Y.pickupRespawnSeconds, s.push({
					type: "pickup",
					racerId: n.racerId,
					index: c
				}));
				break;
			}
		}
	}
}
function fs(e, t, n, r, i, a, o, s) {
	ds("pickup", e.pickups, t, r, i, a, o, s), ds("coin", e.coins, n, r, i, a, o, s);
}
//#endregion
//#region src/race-manager/ranking.ts
var ps = (e) => e.status.loopIndex >= 0 ? e.status.loopS : 0;
function ms(e, t, n, r) {
	let i = e[n], a = e[r], o = i.finishTick !== void 0, s = a.finishTick !== void 0;
	if (o && s) {
		let e = i.finishTick - a.finishTick;
		return e === 0 ? t[n].dnf === t[r].dnf ? t[n].finalDistance === t[r].finalDistance ? ps(i) === ps(a) ? t[n].gridSlot - t[r].gridSlot : ps(a) - ps(i) : t[r].finalDistance - t[n].finalDistance : t[n].dnf ? 1 : -1 : e;
	}
	return o === s ? i.distanceAlong === a.distanceAlong ? ps(i) === ps(a) ? t[n].gridSlot - t[r].gridSlot : ps(a) - ps(i) : a.distanceAlong - i.distanceAlong : o ? -1 : 1;
}
function hs(e, t, n) {
	n.length = 0;
	for (let t = 0; t < e.length; t++) e[t].isGhost || n.push(t);
	for (let r = 1; r < n.length; r++) {
		let i = n[r], a = r - 1;
		for (; a >= 0 && ms(e, t, n[a], i) > 0;) n[a + 1] = n[a], a--;
		n[a + 1] = i;
	}
	return n;
}
function gs(e, t, n, r, i) {
	for (let a = 0; a < n.length; a++) {
		let o = n[a], s = e[o], c = t[o], l = a + 1;
		c.rankHeldSeconds = l === s.rank ? c.rankHeldSeconds + r : r, s.rank = l, l !== c.shownRank && (s.finishTick !== void 0 || c.rankHeldSeconds + 1e-9 >= Y.rankDebounceSeconds) && (c.shownRank = l, i.push({
			type: "positionChange",
			racerId: s.racerId,
			rank: l
		}));
	}
}
//#endregion
//#region src/race-manager/wrongway.ts
var _s = {
	position: [
		0,
		0,
		0
	],
	tangent: [
		0,
		0,
		1
	],
	normal: [
		0,
		1,
		0
	],
	groundY: 0,
	halfWidth: 0,
	surface: "road",
	gripScale: 1
};
function vs(e, t) {
	let n = t.sampleInto(e.t, 0, e.branch, _s), r = z(e.heading), i = Mn(e.heading), a = r[0] * e.speed + i[0] * e.lateralVelocity, o = r[2] * e.speed + i[2] * e.lateralVelocity;
	return a * n.tangent[0] + o * n.tangent[2];
}
function ys(e, t, n) {
	t.wrongWaySeconds = 0, t.wrongWayOn && (t.wrongWayOn = !1, n.push({
		type: "wrongWay",
		racerId: e.racerId,
		on: !1
	}));
}
function bs(e, t, n, r, i) {
	if (e.isGhost || e.finishTick !== void 0) {
		ys(e, t, i);
		return;
	}
	let a = vs(e, n);
	a < Y.wrongWaySpeed ? (t.wrongWaySeconds += r, !t.wrongWayOn && t.wrongWaySeconds + 1e-9 >= Y.wrongWayHoldSeconds && (t.wrongWayOn = !0, i.push({
		type: "wrongWay",
		racerId: e.racerId,
		on: !0
	}))) : a > Y.wrongWayClearSpeed && ys(e, t, i);
}
//#endregion
//#region src/race-manager/respawn.ts
function xs(e, t, n, r) {
	return t.stuckSeconds = (!e.isPlayer || n.throttle > Y.stuckInputMin || n.brake > Y.stuckInputMin) && Math.abs(e.speed) < Y.stuckSpeed && e.status.spinRemaining === 0 && e.grounded && t.freezeRemaining === 0 ? t.stuckSeconds + r : 0, t.stuckSeconds + 1e-9 >= Y.stuckSeconds;
}
function Ss(e, t, n, r) {
	let i = r ?? _r(t, e.t, e.position, e.branch).lateral, a = Math.max(0, Math.min(n - N.kartRadius, n * Y.respawnInset));
	return Number.isFinite(i) ? i < -a ? -a : i > a ? a : i : 0;
}
function Cs(e, t) {
	let n = e.branches.main.lut, r = (e) => (n.covered[n.idx(e)] | n.covered[n.idx(e + 1)]) !== 0, i = Math.floor(n.norm(t) * n.step);
	if (!r(i)) return t;
	for (let e = 0; e < n.n && r(i); e++) i--;
	return W((i - Math.ceil(U.tunnelFunnel / (n.length / n.step))) / n.step);
}
function ws(e, t, n, r) {
	let i = n.checkpoints[t.lastCheckpoint], a = Cs(n, i.t), o = a === i.t ? i : n.sample(a, 0, 0), s = n.sample(a, Ss(e, n, o.halfWidth, r), 0).position;
	return {
		position: [
			s[0],
			s[1] + Y.respawnLift,
			s[2]
		],
		heading: B(o.tangent),
		t: a
	};
}
var Ts = (e) => {
	let t = Math.max(0, Math.min(1, e));
	return t * t * (3 - 2 * t);
};
function Es(e, t, n, r) {
	let i = _r(n, e.t, e.position, e.branch).lateral, a = ws(e, t, n, i);
	t.rescue = {
		lateral: Number.isFinite(i) ? i : 0,
		from: [...e.position],
		fromHeading: e.heading,
		to: a.position,
		toHeading: a.heading,
		remaining: Y.rescueSeconds
	}, e.status.falling = !1, e.status.held = !0, t.freezeRemaining = Math.max(t.freezeRemaining, Y.rescueSeconds + Y.respawnFreezeSeconds), e.status.intangibleRemaining = Math.max(e.status.intangibleRemaining, Y.rescueSeconds + Y.respawnFreezeSeconds), H(e), _e(e), r.push({
		type: "rescue",
		racerId: e.racerId,
		phase: "start"
	});
}
function Ds(e, t) {
	let n = Y.rescueSeconds, r = n / 2.4 * .8, i = n / 2.4 * 2, a = e.from, o = e.to;
	if (t < r) return {
		position: [
			a[0],
			a[1] + .3 * Ts((t - r * .7) / (r * .3)),
			a[2]
		],
		heading: e.fromHeading
	};
	if (t < i) {
		let n = Ts((t - r) / (i - r)), s = Math.max(a[1], o[1]) + Y.rescueRise, c = (t - r) / (i - r), l = c < .5 ? a[1] + .3 + (s - a[1] - .3) * Ts(c * 2) : s + (o[1] + 1.5 - s) * Ts((c - .5) * 2), u = e.toHeading - e.fromHeading;
		for (; u > Math.PI;) u -= 2 * Math.PI;
		for (; u < -Math.PI;) u += 2 * Math.PI;
		return {
			position: [
				a[0] + (o[0] - a[0]) * n,
				l,
				a[2] + (o[2] - a[2]) * n
			],
			heading: e.fromHeading + u * n
		};
	}
	let s = Ts((t - i) / (n - i));
	return {
		position: [
			o[0],
			o[1] + 1.5 * (1 - s),
			o[2]
		],
		heading: e.toHeading
	};
}
function Os(e, t, n) {
	let r = _r(t, e.t, e.position, e.branch).lateral, i = t.sample(e.t, r, e.branch), a = i.open ?? 0;
	if (!(a & (r < 0 ? 1 : 2)) && Math.abs(r) - (jn(i, r) - Pn(e, n)) > n.wallEndOvershoot) return !0;
	let o = e.position[1] - (i.groundY + Sr(t, e.t, e.branch, r, i.halfWidth, a));
	return o < -n.groundCatch || e.grounded && o > n.groundCatch;
}
function ks(e, t, n) {
	if (!t.rescue) return;
	let r = ws(e, t, n, t.rescue.lateral);
	t.rescue.to = r.position, t.rescue.toHeading = r.heading;
}
function As(e, t, n, r, i) {
	let a = t.rescue;
	if (!a) return;
	a.remaining = Math.max(0, a.remaining - r);
	let o = Ds(a, Y.rescueSeconds - a.remaining);
	e.position = o.position, e.heading = o.heading, e.speed = 0, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !1, !(a.remaining > 1e-9) && (t.rescue = void 0, js(e, t, n, i, a.lateral), i.push({
		type: "rescue",
		racerId: e.racerId,
		phase: "end"
	}));
}
function js(e, t, n, r, i) {
	let a = ws(e, t, n, i);
	e.position = a.position, e.heading = a.heading, e.t = a.t, e.branch = 0, e.speed = 0, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !0, e.status.falling = !1, e.status.held = !1, e.airborne.fromJumpId = void 0, e.airborne.trickQueued = !1, e.airborne.seconds = 0, H(e), _e(e), e.status.intangibleRemaining = Math.max(e.status.intangibleRemaining, Y.respawnFreezeSeconds), t.prevT = W(a.t - 1e-7), t.freezeRemaining = Y.respawnFreezeSeconds, t.stuckSeconds = 0, t.respawnCount++, ys(e, t, r), r.push({
		type: "respawn",
		racerId: e.racerId,
		checkpoint: t.lastCheckpoint
	});
}
//#endregion
//#region src/race-manager/race.ts
var Ms = class {
	track;
	config;
	state;
	consts;
	playerIndex;
	lastActiveHazards = [];
	ventStates = /* @__PURE__ */ new Map();
	creatureActions = /* @__PURE__ */ new Map();
	order = [];
	fi;
	effective;
	kartEvents;
	finishedNow = [];
	endRequested = !1;
	constructor(e, t) {
		this.track = e, this.config = t;
		let n = e.spawnGrid;
		if (t.racers.length > n.length) throw Error(`${t.racers.length} racers for ${n.length} grid slots`);
		let r = t.laps ?? e.def.laps, i = t.mode === "knockout" ? t.racers.length : n.length, a = Math.min(Y.playerGridSlot, i - 1), o = t.racers.some((e) => e.isPlayer), s = [];
		for (let e = 0; e < n.length; e++) o && e === a || s.push(e);
		let c = [], l = [], u = [], d = -1;
		t.racers.forEach((e, r) => {
			let i = e.isPlayer || e.isGhost && o ? a : s.shift(), f = n[i], p = An({
				racerId: e.racerId,
				isPlayer: e.isPlayer,
				isGhost: e.isGhost,
				position: [...f.position],
				heading: f.heading,
				t: f.t
			}), m = ue(e.archetype, t.speedClass, e.racerId, e.kartId);
			p.lap = 1, p.kartId = m.kartId, p.bodyId = e.bodyId, p.skinId = e.skinId, e.isPlayer && (d = r), c.push(p), l.push(Yo(i, f.t)), u.push(m);
		}), this.playerIndex = d, this.consts = u, this.fi = ls(e);
		let f = us(this.fi);
		this.state = {
			mode: t.mode,
			trackId: t.trackId,
			speedClass: t.speedClass,
			mirrored: t.mirrored ?? !1,
			seed: t.seed,
			tick: 0,
			goTick: ns,
			time: -ns * Fr,
			phase: "countdown",
			lapsTotal: r,
			finalLapShiftFired: !1,
			knockout: t.knockout ? {
				setId: t.knockout.setId,
				segment: t.knockout.segment,
				cutLineAt: r,
				eliminated: [...t.knockout.eliminated]
			} : void 0,
			pickupStates: f.pickupStates,
			coinStates: f.coinStates,
			karts: c,
			trackers: l,
			inputLog: [],
			playerFinishTick: -1,
			leaderLap: 1
		}, this.effective = c.map(() => kn), this.kartEvents = c.map(() => []);
		for (let t = 0; t < c.length; t++) c[t].distanceAlong = es(c[t], l[t], e);
		hs(c, l, this.order), this.order.forEach((e, t) => {
			c[e].rank = t + 1, l[e].shownRank = t + 1;
		});
	}
	get dt() {
		return Fr;
	}
	step(e) {
		let t = this.state, { karts: n, trackers: r } = t, i = this.track, a = t.tick, o = Fr, s = [];
		if (t.time = (a - t.goTick) * o, this.lastActiveHazards = i.activeHazards(t.time), t.phase !== "countdown") for (let e of i.hazards.vents(t.time)) this.ventStates.get(e.id) !== e.state && (this.ventStates.set(e.id, e.state), e.state !== "idle" && s.push({
			type: "vent",
			id: e.id,
			asset: e.asset,
			phase: e.state,
			position: [...e.position]
		}));
		if (i.hazards.creatures.length && t.phase !== "countdown") for (let e of i.hazards.creaturePoses(t.time)) this.creatureActions.get(e.id) !== e.action && (this.creatureActions.set(e.id, e.action), s.push({
			type: "creature",
			id: e.id,
			kind: e.kind,
			action: e.action,
			position: [...e.position]
		}));
		let c = this.kartEvents;
		for (let e of c) e.length = 0;
		let l = t.phase === "finished", u = !1;
		if (t.phase === "countdown") {
			u = rs(a, n, r, e, this.consts, s, c);
			for (let e = 0; e < n.length; e++) this.effective[e] = kn;
		} else for (let t = 0; t < n.length; t++) {
			let i = n[t], a = r[t];
			this.effective[t] = !i.isGhost && a.freezeRemaining > 0 ? kn : e[t];
		}
		this.playerIndex >= 0 && t.playerFinishTick < 0 && t.inputLog.push({ ...e[this.playerIndex] });
		let d = Hr(n, this.effective, i, this.consts, o);
		for (let e = 0; e < n.length; e++) {
			let t = d[e], n = c[e];
			for (let e = 0; e < t.length; e++) n.push(t[e]);
		}
		if (u && (t.phase = "racing", s.push({
			type: "phase",
			phase: "racing"
		}), t.lapsTotal === 1 && this.fireShift(a, s)), t.phase === "racing" || t.phase === "finalLap") {
			let l = this.finishedNow;
			l.length = 0;
			for (let u = 0; u < n.length; u++) {
				let d = n[u], f = r[u], p = this.consts[u];
				f.freezeRemaining = as(f.freezeRemaining, o);
				let m = !1, h = c[u];
				for (let e = h.length - 1; e >= 0; e--) h[e].type === "respawn" && (m = !0, h.splice(e, 1));
				if (f.rescue) {
					As(d, f, i, o, s);
					continue;
				}
				if (m || Zo(d, f, i, t.lapsTotal, a, s) === "finish" && (l.push(u), d.isPlayer && (t.playerFinishTick = a)), bs(d, f, i, o, s), !m && !d.isGhost && d.finishTick === void 0 && xs(d, f, e[u], o) && (m = !0), m) {
					Es(d, f, i, s);
					continue;
				}
				cs(d, f, p, this.lastActiveHazards, o, s, c[u]);
			}
			fs(this.fi, t.pickupStates, t.coinStates, i, n, this.consts, o, s);
			for (let e = 0; e < n.length; e++) n[e].distanceAlong = es(n[e], r[e], i);
			for (let e = 0; e < l.length; e++) r[l[e]].finalDistance = n[l[e]].distanceAlong;
			hs(n, r, this.order), gs(n, r, this.order, o, s);
			for (let e of this.order) l.includes(e) && s.push({
				type: "finish",
				racerId: n[e].racerId,
				rank: n[e].rank,
				tick: a,
				dnf: !1
			});
			let u = this.order.length ? n[this.order[0]] : void 0;
			u && u.lap !== t.leaderLap && (t.leaderLap = u.lap, i.setLap(u.lap), u.lap === t.lapsTotal && this.fireShift(a, s));
			let d = !0;
			for (let e = 0; e < n.length; e++) if (!n[e].isGhost && n[e].finishTick === void 0) {
				d = !1;
				break;
			}
			let f = t.playerFinishTick >= 0 && (this.endRequested || a - t.playerFinishTick >= Math.round(Y.finishGraceSeconds / o));
			if (d || f) {
				for (let e of this.order) {
					let t = n[e];
					t.finishTick === void 0 && (t.finishTick = a, r[e].dnf = !0, r[e].finalDistance = t.distanceAlong);
				}
				hs(n, r, this.order), this.order.forEach((e, t) => {
					n[e].rank = t + 1;
				});
				for (let e of this.order) r[e].dnf && s.push({
					type: "finish",
					racerId: n[e].racerId,
					rank: n[e].rank,
					tick: a,
					dnf: !0
				});
				t.phase = "finished", s.push({
					type: "phase",
					phase: "finished"
				}), s.push({ type: "raceFinished" });
			}
		}
		if (l) for (let e = 0; e < n.length; e++) r[e].freezeRemaining = as(r[e].freezeRemaining, o), r[e].rescue && As(n[e], r[e], i, o, s);
		t.tick = a + 1;
		let f = [];
		for (let e = 0; e < n.length; e++) for (let t of c[e]) f.push({
			type: "kart",
			racerId: n[e].racerId,
			event: t
		});
		for (let e = 0; e < s.length; e++) f.push(s[e]);
		return f;
	}
	endRace() {
		this.state.playerFinishTick >= 0 && (this.endRequested = !0);
	}
	fireShift(e, t) {
		let n = this.state;
		if (n.finalLapShiftFired) return;
		n.finalLapShiftFired = !0;
		let r = this.track.def.finalLapShift.routeOverrides ?? [], i = n.karts.map((e) => e.branch === 0 && r.some((t) => Ya(e.t, t.fromT, t.toT))), a = this.track.applyFinalLapShift(n.karts);
		a && t.push({
			type: "trackChanged",
			event: a
		});
		for (let r = 0; r < n.karts.length; r++) {
			let o = n.karts[r], s = n.trackers[r];
			Qo(o, s, this.track, n.lapsTotal, e, t), ks(o, s, this.track), a && i[r] && !s.rescue && !cr(o) && Os(o, this.track, this.consts[r]) && Es(o, s, this.track, t), o.distanceAlong = es(o, s, this.track);
		}
		n.phase = "finalLap", t.push({
			type: "phase",
			phase: "finalLap"
		});
	}
	results() {
		let e = this.state, t = e.lapsTotal * this.track.length, n = 0, r = this.order.map((r) => {
			let i = e.karts[r], a = e.trackers[r], o = i.finishTick ?? -1, s = a.lapTicks.map((t, n) => Ns(t - (n === 0 ? e.goTick : a.lapTicks[n - 1]))), c = o < 0 ? -1 : Ns(o - e.goTick), l = o < 0 || a.dnf, u = -1;
			return l && c > 0 && a.finalDistance > 0 && (u = Math.max(n + 100, Math.round(c * Math.max(1, t / a.finalDistance)))), n = Math.max(n, l ? u : c), {
				racerId: i.racerId,
				rank: i.rank,
				finishTick: o,
				timeMs: c,
				lapTimesMs: s,
				dnf: l,
				projectedMs: u
			};
		});
		return {
			mode: e.mode,
			trackId: e.trackId,
			speedClass: e.speedClass,
			seed: e.seed,
			goTick: e.goTick,
			ranks: r
		};
	}
};
function Ns(e) {
	return Math.round(e * 1e3 * Fr);
}
//#endregion
//#region src/track-builder/creatures.ts
var Ps = Object.freeze({
	rumblesaur: {
		off: 9,
		step: 3.5,
		footprint: 5,
		idle: 2.9,
		rear: 1.2,
		ringSpeed: 19,
		ringReach: 30,
		ringHalf: 1.2,
		footRadius: 3,
		footSeconds: .3,
		ringPoints: 48
	},
	yeti: {
		off: 11,
		windUp: .9,
		flight: 1.2,
		roll: 2.2,
		rollSpeed: 10,
		radius: 1.6,
		footprint: 7,
		ahead: 14
	},
	kraken: {
		off: 17,
		idle: 3.4,
		warn: 1.5,
		slam: .7,
		retract: 1.2,
		radius: 1.5
	},
	crab: {
		wait: 1.4,
		cross: 2.4,
		radius: 3,
		off: 5,
		warn: .6,
		warnMarks: 5
	},
	goose: {
		wait: 2.2,
		charge: 3.2,
		turn: 1.4,
		speed: 17,
		radius: 2,
		off: 7,
		weave: 2.2,
		weavePeriod: 1.1
	},
	whale: {
		off: 70,
		height: 26,
		swim: 7.5,
		warn: 1.8,
		slap: 2,
		gust: 20,
		window: 36
	}
}), Fs = (e) => {
	let t = Math.max(0, Math.min(1, e));
	return t * t * (3 - 2 * t);
}, Is = (e) => {
	let t = I(e * 127.1 + 311.7) * 43758.5453;
	return t - Math.floor(t);
}, Ls = class {
	id;
	kind;
	def;
	branches;
	side;
	t;
	spot;
	constructor(e, t, n) {
		this.id = e, this.def = t, this.kind = t.creature, this.branches = n, this.side = (t.lateral ?? 1) >= 0 ? 1 : -1, this.t = t.t, this.spot = n.main.sample(t.t, 0).position;
	}
	rederive() {
		this.t = this.branches.main.nearestGlobal(this.spot).t;
	}
	frame(e) {
		let t = this.branches.main.sample(e, 0), n = t.tangent[2], r = -t.tangent[0], i = L(n, r) || 1;
		return {
			t: e,
			p: t.position,
			tangent: t.tangent,
			right: [
				n / i,
				0,
				r / i
			],
			hw: t.halfWidth,
			reach: Math.max(t.wallLeft ?? t.wall ?? t.halfWidth, t.wallRight ?? t.wall ?? t.halfWidth),
			heading: Lt(t.tangent[0], t.tangent[2])
		};
	}
	clear(e, t, n) {
		return Math.max(e.hw + t, e.reach + n);
	}
	at(e, t, n = 0) {
		return [
			e.p[0] + e.right[0] * t,
			e.p[1] + n,
			e.p[2] + e.right[2] * t
		];
	}
	on(e, t, n = 0) {
		let r = this.at(e, t);
		return r[1] = this.branches.main.sample(e.t, t).groundY + n, r;
	}
	period() {
		return this.def.period ?? 8;
	}
	phase(e) {
		let t = this.period();
		return (e % t + t) % t;
	}
	hazards(e) {
		let t = [], n = this.pose(e), r = this.id, i = this.def.hit ?? "spin";
		switch (this.kind) {
			case "rumblesaur": {
				let e = Ps.rumblesaur;
				for (let a of n.marks) if (a.kind === "ring") {
					let n = this.frame(this.t);
					for (let i = 0; i < e.ringPoints; i++) {
						let o = i / e.ringPoints * Math.PI * 2, s = a.position[0] + mt(o) * a.radius, c = a.position[2] + I(o) * a.radius, l = (s - n.p[0]) * n.right[0] + (c - n.p[2]) * n.right[2];
						Math.abs(l) > Math.max(n.hw + 2, n.reach) || t.push({
							id: r,
							type: "creature",
							position: [
								s,
								a.position[1],
								c
							],
							radius: e.ringHalf,
							hit: "bump",
							ground: !0
						});
					}
				} else a.kind === "shadow" && n.action === "stomp" && t.push({
					id: r,
					type: "creature",
					position: a.position,
					radius: e.footRadius,
					hit: i
				});
				break;
			}
			case "yeti":
				for (let e of n.marks) e.kind === "snowball" && e.strength >= 1 && t.push({
					id: r,
					type: "rolling",
					position: e.position,
					radius: e.radius,
					hit: i
				});
				break;
			case "kraken":
				if (n.action === "slam") for (let e of n.marks) e.kind === "tentacle" && t.push({
					id: r,
					type: "creature",
					position: e.position,
					radius: e.radius,
					hit: i
				});
				break;
			case "crab":
			case "goose": {
				let e = this.kind === "crab" ? Ps.crab : Ps.goose, a = this.frame(this.t), o = (n.position[0] - a.p[0]) * a.right[0] + (n.position[2] - a.p[2]) * a.right[2];
				(this.kind === "goose" || Math.abs(o) < Math.max(a.hw, a.reach) + e.radius) && t.push({
					id: r,
					type: "creature",
					position: n.position,
					radius: e.radius,
					hit: i
				});
				break;
			}
			case "whale": {
				if (n.action !== "slap") break;
				let e = Ps.whale, i = this.frame(this.t), a = e.gust * -this.side;
				t.push({
					id: r,
					type: "gust",
					position: i.p,
					radius: e.window / 2,
					hit: "bump",
					push: [
						i.right[0] * a,
						0,
						i.right[2] * a
					]
				});
				break;
			}
		}
		return t;
	}
	pose(e) {
		let t = this.phase(e), n = this.side, r = this.id, i = this.kind, a = [];
		switch (i) {
			case "rumblesaur": {
				let e = Ps.rumblesaur, o = this.frame(this.t), s = this.on(o, n * this.clear(o, e.off, e.footprint)), c = o.heading - n * Math.PI / 2, l = this.on(o, n * (o.hw + e.off - e.step)), u = e.idle + e.rear, d = "idle", f = t / e.idle;
				if (t >= e.idle && t < u) d = "rear", f = (t - e.idle) / e.rear, a.push({
					kind: "shadow",
					position: l,
					radius: e.footRadius,
					strength: f
				});
				else if (t >= u) {
					let n = t - u, r = e.footRadius + n * e.ringSpeed;
					d = n < e.footSeconds ? "stomp" : "settle", f = Math.min(1, n / (this.period() - u)), n < e.footSeconds && a.push({
						kind: "shadow",
						position: l,
						radius: e.footRadius,
						strength: 1
					}), r < e.ringReach && a.push({
						kind: "ring",
						position: l,
						radius: r,
						strength: 1 - r / e.ringReach
					});
				}
				return {
					id: r,
					kind: i,
					position: s,
					heading: c,
					action: d,
					phase: f,
					marks: a
				};
			}
			case "yeti": {
				let o = Ps.yeti, s = this.frame(this.t), c = this.on(s, n * this.clear(s, o.off, o.footprint), 3), l = s.heading - n * Math.PI / 2, u = this.period(), d = Math.floor(e / u), f = "idle", p = 0;
				t >= u - o.windUp ? (f = "windUp", p = (t - (u - o.windUp)) / o.windUp) : t < o.flight && (f = "throw", p = t / o.flight);
				let m = this.branches.main.lut.length, h = this.t + o.ahead / m, g = this.frame(h), _ = (Is(d) * 2 - 1) * Math.max(0, g.hw - o.radius - 1), v = this.at(g, _);
				if (t < o.flight) {
					let e = Fs(t / o.flight), n = [
						c[0],
						c[1] + 4,
						c[2]
					], r = I(e * Math.PI) * 9;
					a.push({
						kind: "snowball",
						position: [
							n[0] + (v[0] - n[0]) * e,
							n[1] + (v[1] + o.radius - n[1]) * e + r,
							n[2] + (v[2] - n[2]) * e
						],
						radius: o.radius,
						strength: 0
					}), a.push({
						kind: "shadow",
						position: v,
						radius: o.radius * (.6 + .6 * e),
						strength: e
					});
				} else if (t < o.flight + o.roll) {
					let e = h - (t - o.flight) * o.rollSpeed / m, n = this.frame(e), r = this.at(n, _, o.radius);
					a.push({
						kind: "snowball",
						position: r,
						radius: o.radius,
						strength: 1
					});
				}
				return {
					id: r,
					kind: i,
					position: c,
					heading: l,
					action: f,
					phase: p,
					marks: a
				};
			}
			case "kraken": {
				let e = Ps.kraken, o = this.frame(this.t), s = n * (o.hw + e.off), c = this.at(o, s, -1), l = o.heading - n * Math.PI / 2, u = "idle", d = t / e.idle, f = e.idle + e.warn, p = f + e.slam;
				t >= e.idle && t < f ? (u = "warn", d = (t - e.idle) / e.warn) : t >= f && t < p ? (u = "slam", d = (t - f) / e.slam) : t >= p && (u = "retract", d = Math.min(1, (t - p) / e.retract));
				let m = this.at(o, n * (o.hw + 1)), h = this.at(o, -n * (o.hw + 1));
				if (u === "warn" && a.push({
					kind: "line",
					position: m,
					to: h,
					radius: e.radius,
					strength: d
				}), u === "slam") {
					let t = Math.ceil((2 * o.hw + 2) / (e.radius * 1.6));
					for (let n = 0; n <= t; n++) {
						let r = n / t;
						a.push({
							kind: "tentacle",
							position: [
								m[0] + (h[0] - m[0]) * r,
								m[1] + .8,
								m[2] + (h[2] - m[2]) * r
							],
							radius: e.radius,
							strength: 1
						});
					}
				}
				return {
					id: r,
					kind: i,
					position: c,
					heading: l,
					action: u,
					phase: d,
					marks: a
				};
			}
			case "crab": {
				let e = Ps.crab, o = this.frame(this.t), s = o.hw + e.off, c = e.wait + e.cross, l = t % c, u = (t >= c ? -1 : 1) * n * s, d = -u, f = u, p = "wait", m = l / e.wait;
				if (l >= e.wait) {
					let t = Fs((l - e.wait) / e.cross);
					f = u + (d - u) * t, p = "cross", m = (l - e.wait) / e.cross;
				} else if (l >= e.wait - e.warn) {
					let t = (l - (e.wait - e.warn)) / e.warn;
					for (let n = 0; n < e.warnMarks; n++) {
						let r = n / (e.warnMarks - 1), i = u + (d - u) * r;
						a.push({
							kind: "shadow",
							position: this.on(o, i),
							radius: e.radius * .8,
							strength: Math.max(0, Math.min(1, t * 1.5 - r * .5))
						});
					}
				}
				return {
					id: r,
					kind: i,
					position: this.on(o, f),
					heading: o.heading + Math.PI,
					action: p,
					phase: m,
					marks: a
				};
			}
			case "goose": {
				let e = Ps.goose, o = this.branches.main.lut.length, s = this.frame(this.t), c = s.hw + e.off, l = e.wait + e.charge, u = l + e.turn, d = 0, f = n * c, p = "wait", m = t / e.wait, h = s.heading + Math.PI;
				if (t >= e.wait && t < l) {
					let r = t - e.wait;
					d = r * e.speed;
					let i = Fs(r / .8);
					f = n * c * (1 - i) + I(r / e.weavePeriod * Math.PI * 2) * e.weave * i, p = "charge", m = r / e.charge;
				} else if (t >= l) {
					d = e.charge * e.speed;
					let r = Fs((t - l) / e.turn);
					f = n * c * r, p = t < u ? "turn" : "walk", m = t < u ? (t - l) / e.turn : (t - u) / (this.period() - u), t >= u && (d = e.charge * e.speed * (1 - Fs((t - u) / (this.period() - u)))), h = t >= u ? s.heading : s.heading + Math.PI - n * Math.PI / 2 * r;
				}
				let g = this.frame(this.t - d / o), _ = this.on(g, f);
				return p === "wait" && m > .4 && a.push({
					kind: "shadow",
					position: this.at(s, n * (s.hw - 1)),
					radius: 1.5,
					strength: m
				}), {
					id: r,
					kind: i,
					position: _,
					heading: p === "charge" ? g.heading + Math.PI : h,
					action: p,
					phase: m,
					marks: a
				};
			}
			case "whale": {
				let o = Ps.whale, s = this.frame(this.t), c = o.swim + o.warn, l = c + o.slap, u = "swim", d = t / o.swim, f = 0;
				t >= o.swim - 2 && t < o.swim ? f = Fs((t - (o.swim - 2)) / 2) : t >= o.swim && t < l ? f = 1 : t >= l && (f = 1 - Fs((t - l) / Math.max(.5, this.period() - l))), t >= o.swim && t < c ? (u = "warn", d = (t - o.swim) / o.warn) : t >= c && t < l ? (u = "slap", d = (t - c) / o.slap) : t >= l && (u = "swim", d = (t - l) / (this.period() - l));
				let p = I(e / this.period() * Math.PI * 2) * 20, m = this.branches.main.lut.length, h = this.frame(this.t + p / m), g = n * (s.hw + o.off * (1 - f * .55));
				return {
					id: r,
					kind: i,
					position: this.at(h, g, o.height - f * 8),
					heading: h.heading + (mt(e / this.period() * Math.PI * 2) > 0 ? 0 : Math.PI),
					action: u,
					phase: d,
					marks: a
				};
			}
		}
		return {
			id: r,
			kind: i,
			position: this.frame(this.t).p,
			heading: 0,
			action: "idle",
			phase: 0,
			marks: a
		};
	}
};
//#endregion
//#region src/track-builder/hazards.ts
function Rs(e, t) {
	let n = Math.max(e.period ?? 5, U.ventWarnSeconds + U.ventEruptSeconds + .1), r = ((t + (e.offset ?? 0)) % n + n) % n, i = n - U.ventEruptSeconds, a = i - U.ventWarnSeconds;
	return r >= i ? {
		state: "erupt",
		k: (r - i) / U.ventEruptSeconds
	} : r >= a ? {
		state: "warn",
		k: (r - a) / U.ventWarnSeconds
	} : {
		state: "idle",
		k: r / a
	};
}
function zs(e, t) {
	let n = e.period ?? 1, r = n > 0 ? (t % n + n) % n : 0;
	if (r < U.fallingActiveSeconds) return {
		state: "down",
		k: r / U.fallingActiveSeconds
	};
	let i = Math.min(U.fallingWarnSeconds, n - U.fallingActiveSeconds);
	return r >= n - i ? {
		state: "drop",
		k: (r - (n - i)) / i
	} : {
		state: "idle",
		k: 0
	};
}
var Bs = class {
	items = [];
	branches;
	creatures = [];
	constructor(e, t) {
		this.branches = t, e.forEach((e, n) => {
			if (e.type === "creature") {
				this.creatures.push(new Ls(e.id ?? `creature-${n}`, e, t));
				return;
			}
			let r = e.lateral ?? 0, i = t.sample(e.t, r, 0);
			this.items.push({
				id: e.id ?? `hazard-${n}`,
				def: e,
				t: e.t,
				lateral: r,
				position: i.position,
				enabled: !0
			});
		});
	}
	get ids() {
		return [...this.items.map((e) => e.id), ...this.creatures.map((e) => e.id)];
	}
	vents(e) {
		let t = [];
		for (let n of this.items) n.def.type === "vent" && n.enabled && t.push({
			id: n.id,
			position: n.position,
			asset: n.def.asset ?? "geyser",
			...Rs(n.def, e)
		});
		return t;
	}
	falling(e) {
		let t = [];
		for (let n of this.items) n.def.type === "falling" && n.enabled && t.push({
			id: n.id,
			position: n.position,
			...zs(n.def, e)
		});
		return t;
	}
	creaturePoses(e) {
		return this.creatures.filter((e) => this.creatureEnabled(e.id)).map((t) => t.pose(e));
	}
	setEnabled(e, t) {
		let n = this.items.find((t) => t.id === e);
		n && (n.enabled = t), this.creatures.some((t) => t.id === e) && (t ? this.off.delete(e) : this.off.add(e));
	}
	isEnabled(e) {
		return this.creatures.some((t) => t.id === e) ? !this.off.has(e) : this.items.find((t) => t.id === e)?.enabled ?? !1;
	}
	rederive() {
		for (let e of this.creatures) e.rederive();
		for (let e of this.items) e.t = this.branches.main.nearestGlobal(e.position).t, e.lateral = La(this.branches, e.t, 0, e.position);
	}
	activeHazards(e) {
		let t = [], n = this.branches.main, r = n.lut.length, i = U.hazardRadius;
		for (let a of this.items) {
			if (!a.enabled) continue;
			let o = a.def, s = o.hit ?? "spin", c = o.period ?? 1, l = c > 0 ? (e % c + c) % c : 0;
			switch (o.type) {
				case "static":
					t.push({
						id: a.id,
						type: o.type,
						position: a.position,
						radius: i,
						hit: s
					});
					break;
				case "rolling": {
					let e = (o.speed ?? 0) * l, c = a.t - e / r;
					t.push({
						id: a.id,
						type: o.type,
						position: n.sample(c, a.lateral).position,
						radius: i,
						hit: s
					});
					break;
				}
				case "crossing": {
					let e = n.sample(a.t, 0).halfWidth, r = Math.max(0, e - i) * I(2 * Math.PI * l / c);
					t.push({
						id: a.id,
						type: o.type,
						position: n.sample(a.t, r).position,
						radius: i,
						hit: s
					});
					break;
				}
				case "falling":
					zs(o, e).state === "down" && t.push({
						id: a.id,
						type: o.type,
						position: a.position,
						radius: i,
						hit: s
					});
					break;
				case "vent":
					Rs(o, e).state === "erupt" && t.push({
						id: a.id,
						type: o.type,
						position: a.position,
						radius: U.ventRadius,
						hit: "launch",
						launch: o.launch ?? U.ventLaunch
					});
					break;
				case "gust": if (l < c / 2) {
					let e = n.sample(a.t, 0), r = e.tangent[2], i = -e.tangent[0], s = L(r, i) || 1, c = a.lateral > 0 ? -1 : 1, l = (o.speed ?? 0) * c;
					t.push({
						id: a.id,
						type: o.type,
						position: e.position,
						radius: U.gustWindow / 2,
						hit: "bump",
						push: [
							r / s * l,
							0,
							i / s * l
						]
					});
				}
			}
		}
		for (let n of this.creatures) this.creatureEnabled(n.id) && t.push(...n.hazards(e));
		return t;
	}
	off = /* @__PURE__ */ new Set();
	creatureEnabled(e) {
		return !this.off.has(e);
	}
};
//#endregion
//#region src/track-builder/minimap.ts
function Vs(e) {
	let t = U.minimapSamples, n = U.minimapPadding, r = [], i = Infinity, a = -Infinity, o = Infinity, s = -Infinity;
	for (let n of e.list) {
		let c = [], l = [], u = n.isMain ? t : Math.max(8, Math.round(t * n.lut.length / e.main.lut.length)), d = n.isMain ? u : u - 1;
		for (let e = 0; e < u; e++) {
			let t = e / d, r = n.lut.sample(t, 0).halfWidth, u = n.lut.sample(t, -r).position, f = n.lut.sample(t, r).position;
			c.push(u[0], u[2]), l.push(f[0], f[2]);
			for (let e of [u, f]) e[0] < i && (i = e[0]), e[0] > a && (a = e[0]), e[2] < o && (o = e[2]), e[2] > s && (s = e[2]);
		}
		r.push({
			branch: n.index,
			open: n.open,
			left: c,
			right: l
		});
	}
	let c = a - i || 1, l = s - o || 1, u = (1 - 2 * n) / Math.max(c, l), d = n + (1 - 2 * n - c * u) / 2 - i * u, f = n + (1 - 2 * n - l * u) / 2 - o * u, p = (e) => [e[0] * u + d, e[2] * u + f], m = (e) => {
		let t = new Float32Array(e.length);
		for (let n = 0; n < e.length; n += 2) t[n] = e[n] * u + d, t[n + 1] = e[n + 1] * u + f;
		return t;
	};
	return {
		outlines: r.map((e) => ({
			branch: e.branch,
			open: e.open,
			left: m(e.left),
			right: m(e.right)
		})),
		toMinimap: p,
		scale: u,
		offsetX: d,
		offsetZ: f
	};
}
//#endregion
//#region src/track-builder/race.ts
function Hs(e, t, n) {
	let r = [];
	for (let i = 0; i < n; i++) {
		let a = W(t + i / n), o = e.sample(a, 0);
		r.push({
			index: i,
			t: a,
			position: o.position,
			tangent: o.tangent,
			halfWidth: o.halfWidth
		});
	}
	return r;
}
function Us(e, t, n) {
	let r = [], { rows: i, columns: a, spacing: o } = n;
	for (let n = 0; n < i; n++) {
		let i = W(t - (n + 1) * o / e.length), s = e.sample(i, 0).halfWidth, c = Math.max(0, Math.min(.5 * s, s - Jr)), l = a > 1 ? 2 * c / (a - 1) : 0, u = n % 2 == 1 ? l / 4 : 0;
		for (let t = 0; t < a; t++) {
			let o = a > 1 ? -c + u + t * (2 * (c - u)) / (a - 1) : n % 2 == 1 ? c / 2 : -c / 2, s = e.sample(i, o);
			r.push({
				index: n * a + t,
				t: i,
				lateral: o,
				position: s.position,
				heading: B(s.tangent)
			});
		}
	}
	return r;
}
//#endregion
//#region src/track-builder/terrain.ts
var Ws = 30, Gs = .01, Ks = 16, qs = 15, Js = class {
	luts;
	x0;
	z0;
	nx;
	nz;
	start;
	items;
	maxHw;
	constructor(e) {
		this.luts = e;
		let t = Infinity, n = -Infinity, r = Infinity, i = -Infinity, a = 0;
		for (let o of e) for (let e = 0; e < o.n; e++) o.px[e] < t && (t = o.px[e]), o.px[e] > n && (n = o.px[e]), o.pz[e] < r && (r = o.pz[e]), o.pz[e] > i && (i = o.pz[e]), o.hw[e] > a && (a = o.hw[e]);
		this.maxHw = a, this.x0 = t - Ks, this.z0 = r - Ks, this.nx = Math.ceil((n - t) / Ks) + 3, this.nz = Math.ceil((i - r) / Ks) + 3;
		let o = new Int32Array(this.nx * this.nz + 1), s = (e, t) => Math.floor((e.pz[t] - this.z0) / Ks) * this.nx + Math.floor((e.px[t] - this.x0) / Ks);
		for (let t of e) for (let e = 0; e < t.n; e++) o[s(t, e) + 1]++;
		for (let e = 0; e < this.nx * this.nz; e++) o[e + 1] += o[e];
		this.start = o.slice();
		let c = o.slice();
		this.items = new Int32Array(this.start[this.nx * this.nz]), e.forEach((e, t) => {
			for (let n = 0; n < e.n; n++) this.items[c[s(e, n)]++] = t << 20 | n;
		});
	}
	top(e, t) {
		return this.query(e, t, Ys, Ws).top;
	}
	query(e, t, n, r = Ws) {
		let i = this.maxHw + U.kerbWidth + r, a = i * i, o = Math.max(0, Math.floor((e - i - this.x0) / Ks)), s = Math.min(this.nx - 1, Math.floor((e + i - this.x0) / Ks)), c = Math.max(0, Math.floor((t - i - this.z0) / Ks)), l = Math.min(this.nz - 1, Math.floor((t + i - this.z0) / Ks)), u = 0, d = 0, f = Infinity, p = Infinity, m = NaN, h = !1, g = NaN, _ = NaN, v = 0;
		for (let n = c; n <= l; n++) for (let i = o; i <= s; i++) {
			let o = n * this.nx + i;
			for (let n = this.start[o]; n < this.start[o + 1]; n++) {
				let i = this.items[n], o = this.luts[i >> 20], s = i & 1048575, c = Xs(o, s, e, t);
				if (c > a) continue;
				let l = o.idx(s - 1), y = o.idx(s + 1);
				if (l !== s && Xs(o, l, e, t) < c || y !== s && Xs(o, y, e, t) <= c) continue;
				let b = Zs(o, s, e, t);
				if (!b || b.edge > r) continue;
				v++, b.edge < f ? (p = f, f = b.edge, m = b.h, h = b.open, g = b.cover, _ = b.lip) : b.edge < p && (p = b.edge);
				let x = b.edge > 0 ? b.edge : 0, S = 1 - x / Ws;
				if (S <= 0) continue;
				let C = S * S * b.fade / (x + Gs);
				u += C, d += C * b.h;
			}
		}
		return n.top = u > 1e-12 ? d / u : m, n.edge = f, n.next = p, n.open = h, n.cover = g, n.lip = _, n.pieces = v, n;
	}
}, Ys = {
	top: 0,
	edge: 0,
	next: 0,
	open: !1,
	cover: NaN,
	lip: NaN,
	pieces: 0
}, $ = {
	h: 0,
	edge: 0,
	open: !1,
	fade: 1,
	cover: NaN,
	lip: NaN
};
function Xs(e, t, n, r) {
	let i = e.px[t] - n, a = e.pz[t] - r;
	return i * i + a * a;
}
function Zs(e, t, n, r) {
	let i = Infinity, a = t;
	for (let o = t - 1; o <= t; o++) {
		let t = e.idx(o), s = e.idx(o + 1);
		if (t === s) continue;
		let c = e.px[s] - e.px[t], l = e.pz[s] - e.pz[t], u = c * c + l * l;
		if (u <= 0) continue;
		let d = ((n - e.px[t]) * c + (r - e.pz[t]) * l) / u, f = d < 0 ? 0 : d > 1 ? 1 : d, p = e.px[t] + c * f - n, m = e.pz[t] + l * f - r, h = p * p + m * m;
		h < i && (i = h, a = o + f);
	}
	if (!e.closed && (t === 0 || t === e.n - 1)) {
		let i = t, a = t === 0 ? -1 : 1;
		if (((n - e.px[i]) * e.tx[i] + (r - e.pz[i]) * e.tz[i]) * a > 0) return null;
	}
	let o = e.idx(Math.floor(a)), s = e.idx(Math.floor(a) + 1), c = a - Math.floor(a), l = 1 - c, u = e.px[o] * l + e.px[s] * c, d = e.pz[o] * l + e.pz[s] * c, f = e.rx[o] * l + e.rx[s] * c, p = e.rz[o] * l + e.rz[s] * c, m = L(f, p) || 1, h = ((n - u) * f + (r - d) * p) / m, g = e.hw[o] * l + e.hw[s] * c + U.kerbWidth, _ = e.bank[o] * l + e.bank[s] * c;
	$.open = !!(e.open[o] & (h < 0 ? 1 : 2));
	let v = $.open ? g + U.shoulderWidth : g, y = h < -v ? -v : h > v ? v : h, b = e.py[o] * l + e.py[s] * c, x = e.landAbove[o], S = Math.abs(h) - g, C = e.bore[o];
	if ($.cover = C === C && S < 1.5 ? b + C : NaN, x === x ? ($.h = b + x, $.lip = U.tunnelMesaTop) : ($.h = b - y * ht(_) - U.offroadDrop, $.lip = NaN), $.edge = S, e.closed) $.fade = 1;
	else {
		let t = Math.min(1, Math.min(a, e.n - 1 - a) * e.length / e.step / qs);
		$.fade = t * t * (3 - 2 * t);
	}
	return $;
}
function Qs(e, t) {
	let n = e.environment?.ground;
	if (n?.kind === "none") return -Infinity;
	let r = n?.y ?? 0;
	if (e.offroad !== !0) return r;
	let i = Infinity;
	for (let e = 0; e < t.n; e++) {
		let n = t.hw[e] + U.kerbWidth, r = t.py[e] - n * Math.abs(ht(t.bank[e]));
		r < i && (i = r);
	}
	return Math.min(r, i - U.offroadDrop - .25);
}
//#endregion
//#region src/track-builder/tunnel.ts
var $s = 3, ec = (e) => {
	let t = e < 0 ? 0 : e > 1 ? 1 : e;
	return t * t * (3 - 2 * t);
};
function tc(e, t, n) {
	let r = Math.round(t * e.step), i = Math.round(n * e.step), a = e.length / e.step, o = i - r + 1, s = new Float64Array(o), c = new Float64Array(o), l = new Float64Array(o), u = Infinity, d = -Infinity, f = Infinity, p = -Infinity;
	for (let t = Math.max(0, r - Math.ceil($s / a)); t <= Math.min(e.n - 1, i + Math.ceil($s / a)); t++) e.bore[t] = U.tunnelApex + .8;
	for (let t = r; t <= i; t++) {
		let n = Math.min(t - r, i - t) * a;
		e.landAbove[t] = -U.offroadDrop + (U.tunnelHill + U.offroadDrop) * ec(n / U.tunnelRamp);
		let o = t - r;
		s[o] = e.px[t], c[o] = e.py[t], l[o] = e.pz[t], s[o] < u && (u = s[o]), s[o] > d && (d = s[o]), l[o] < f && (f = l[o]), l[o] > p && (p = l[o]);
	}
	return {
		lut: e,
		i0: r,
		i1: i,
		x: s,
		y: c,
		z: l,
		minX: u,
		maxX: d,
		minZ: f,
		maxZ: p
	};
}
function nc(e, t) {
	if (e.covered.fill(0), !t.length) return;
	for (let n = 0; n < e.n; n++) {
		let r = e.px[n], i = e.pz[n];
		for (let a of t) {
			if (r < a.minX - 2 || r > a.maxX + 2 || i < a.minZ - 2 || i > a.maxZ + 2) continue;
			let t = Infinity, o = 0, s = 0;
			for (let e = 0; e < a.x.length; e++) {
				let n = a.x[e] - r, c = a.z[e] - i, l = n * n + c * c;
				l < t && (t = l, o = a.y[e], s = e);
			}
			let c = s === 0 || s === a.x.length - 1;
			if (t < (c ? .09 : 2.25) && Math.abs(e.py[n] - o) < 2) {
				e.covered[n] = 1, e.reachL[n] = 0, e.reachR[n] = 0;
				break;
			}
		}
	}
	let n = e.length / e.step, r = Math.ceil(U.tunnelFunnel / n);
	for (let t = 0; t < e.n; t++) if (!e.covered[t]) for (let i = 1; i <= r; i++) {
		let r = e.idx(t + i), a = e.idx(t - i);
		if (r !== t && e.covered[r] || a !== t && e.covered[a]) {
			let r = U.offroadReach * ec(i * n / U.tunnelFunnel);
			r < e.reachL[t] && (e.reachL[t] = r), r < e.reachR[t] && (e.reachR[t] = r);
			break;
		}
	}
}
//#endregion
//#region src/track-builder/limits.ts
var rc = (e) => {
	let t = e < 0 ? 0 : e > 1 ? 1 : e;
	return t * t * (3 - 2 * t);
};
function ic(e, t, n) {
	for (let t of e.list) t.lut.reachL.fill(U.offroadReach), t.lut.reachR.fill(U.offroadReach);
	let r = t.courseLimit;
	if (!r || t.offroad !== !0) return;
	let i = e.main.lut, a = uc(i, r, n);
	for (let t of e.list) if (!t.isMain) for (let [e, n] of [[t.entryT, .12], [t.exitT, .88]]) {
		let r = dc(i, t.lut, e, n) < 0 ? a.left : a.right;
		fc(i, e, U.limitMouth, (e) => {
			r[e] < U.offroadReach && (r[e] = U.offroadReach);
		});
	}
	mc(i, a.left), mc(i, a.right);
	let o = new Float32Array(i.n).fill(Infinity), s = e.list.filter((e) => !e.isMain).map((e) => sc(e.lut));
	for (let e = 0; e < i.n; e++) for (let t of s) if (lc(t, i.px[e], i.pz[e], ac)) {
		o[e] = U.offroadReach;
		break;
	}
	pc(i, o);
	for (let e = 0; e < i.n; e++) a.left[e] > o[e] && (a.left[e] = o[e]), a.right[e] > o[e] && (a.right[e] = o[e]);
	i.reachL.set(a.left), i.reachR.set(a.right);
}
var ac = 1.5, oc = 8;
function sc(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n = 0; n < e.n; n++) {
		let r = cc(Math.floor(e.px[n] / oc), Math.floor(e.pz[n] / oc)), i = t.get(r);
		i || t.set(r, i = []), i.push(n);
	}
	return {
		L: e,
		cells: t
	};
}
var cc = (e, t) => (e + 32768) * 65536 + (t + 32768);
function lc(e, t, n, r) {
	let i = r * r, a = Math.floor(t / oc), o = Math.floor(n / oc);
	for (let r = a - 1; r <= a + 1; r++) for (let a = o - 1; a <= o + 1; a++) {
		let o = e.cells.get(cc(r, a));
		if (o) for (let r of o) {
			let a = e.L.px[r] - t, o = e.L.pz[r] - n;
			if (a * a + o * o < i) return !0;
		}
	}
	return !1;
}
function uc(e, t, n) {
	let r = e.n, i = e.length / e.step, a = new Float32Array(r), o = new Float32Array(r), s = new Float32Array(r), c = Math.max(1, Math.round(U.limitWindow / 2 / i)), l = 1 / U.limitBend[0], u = 1 / U.limitBend[1], [d, f] = U.limitStart;
	for (let p = 0; p < r; p++) {
		let r = 2 * (e.hw[p] + U.kerbWidth), m = (t.straight ?? U.offroadReach / r) * r, h = (t.outside ?? t.straight ?? U.offroadReach / r) * r, g = (t.inside ?? t.straight ?? U.offroadReach / r) * r, _ = e.idx(p - c), v = e.idx(p + c), y = Math.sqrt(e.tx[_] * e.tx[_] + e.tz[_] * e.tz[_]) || 1, b = Math.sqrt(e.tx[v] * e.tx[v] + e.tz[v] * e.tz[v]) || 1, x = e.tx[v] / b - e.tx[_] / y, S = e.tz[v] / b - e.tz[_] / y, C = rc((Math.sqrt(x * x + S * S) / (2 * c * i) - l) / (u - l));
		s[p] = C;
		let w = x * e.rx[p] + S * e.rz[p] > 0, T = m + C * ((w ? h : g) - m), E = m + C * ((w ? g : h) - m), D = (((p / e.step - n) % 1 + 1.5) % 1 - .5) * e.length;
		D >= -d && D <= f && t.start !== void 0 && (T = t.start * r, E = T), a[p] = Math.max(U.limitMin, Math.min(U.limitMax, T)), o[p] = Math.max(U.limitMin, Math.min(U.limitMax, E));
	}
	return {
		left: a,
		right: o,
		bend: s
	};
}
function dc(e, t, n, r) {
	let i = t.sample(r, 0).position, a = e.sample(n, 0), o = Math.sqrt(a.tangent[0] * a.tangent[0] + a.tangent[2] * a.tangent[2]) || 1;
	return ((i[0] - a.position[0]) * a.tangent[2] - (i[2] - a.position[2]) * a.tangent[0]) / o < 0 ? -1 : 1;
}
function fc(e, t, n, r) {
	let i = e.length / e.step, a = Math.round((t % 1 + 1) % 1 * e.step), o = Math.ceil(n / i);
	for (let t = -o; t <= o; t++) r(e.idx(a + t));
}
function pc(e, t) {
	let n = e.n, r = U.limitSlope * (e.length / e.step);
	for (let e = 0; e < 2; e++) {
		for (let e = 1; e < 2 * n; e++) {
			let i = e % n, a = (e - 1) % n;
			t[a] + r < t[i] && (t[i] = t[a] + r);
		}
		for (let e = 2 * n - 2; e >= 0; e--) {
			let i = e % n, a = (e + 1) % n;
			t[a] + r < t[i] && (t[i] = t[a] + r);
		}
	}
}
function mc(e, t) {
	let n = e.n, r = U.limitSlope * (e.length / e.step);
	for (let e = 0; e < 2; e++) {
		for (let e = 1; e < 2 * n; e++) {
			let i = e % n, a = (e - 1) % n;
			t[a] - r > t[i] && (t[i] = t[a] - r);
		}
		for (let e = 2 * n - 2; e >= 0; e--) {
			let i = e % n, a = (e + 1) % n;
			t[a] - r > t[i] && (t[i] = t[a] - r);
		}
	}
}
//#endregion
//#region src/track-builder/validate.ts
var hc = o.properties.base.properties.topSpeed.default, gc = .8, _c = 2, vc = 5, yc = 4, bc = .25, xc = 30, Sc = 10, Cc = Math.max(U.hazardRadius, U.ventRadius) + Jr + 1, wc = /* @__PURE__ */ new Set(["static", "vent"]);
function Tc(e) {
	return [
		e.x,
		e.y,
		e.z,
		e.halfWidth,
		e.bank ?? 0
	].some((e) => !Number.isFinite(e));
}
function Ec(e, t, n, r) {
	if (e.length < r) return n.push(`${t}: needs at least ${r} control points, has ${e.length}`), !1;
	for (let r = 0; r < e.length; r++) {
		if (Tc(e[r])) return n.push(`${t}: control point ${r} has a NaN or infinite value`), !1;
		Math.abs(e[r].bank ?? 0) > U.maxBankDeg && n.push(`${t}: control point ${r} bank ${e[r].bank}° exceeds ${U.maxBankDeg}°`);
	}
	return !0;
}
function Dc(e, t) {
	let n = e.idx(t + 1), r = e.idx(t - 1), i = e.tx[n] - e.tx[r], a = e.ty[n] - e.ty[r], o = e.tz[n] - e.tz[r], s = e.length / e.step, c = R(i, a, o) / (2 * s);
	return c > 0 ? 1 / c : Infinity;
}
function Oc(e, t, n, r) {
	let i = e.length;
	for (let a = 0; a < (r ? i : i - 1); a++) {
		let r = e[a], o = e[(a + 1) % i], s = R(o.x - r.x, o.y - r.y, o.z - r.z);
		s < yc && n.push(`${t}: control points ${a} and ${(a + 1) % i} are ${s.toFixed(2)} m apart (min ${yc})`);
	}
}
function kc(e, t, n) {
	let r = e.length / e.step, i = +!e.closed, a = e.closed ? e.n : e.n - 1, o = Infinity, s = 0, c = 0, l = 0;
	for (let t = i; t < a; t++) {
		let n = Dc(e, t) / e.hw[t];
		n < o && (o = n, s = t / e.step);
	}
	for (let t = 0; t < (e.closed ? e.n : e.n - 1); t++) {
		let n = Math.abs(e.hw[e.idx(t + 1)] - e.hw[t]) / r;
		n > c && (c = n, l = t / e.step);
	}
	o < U.minTurnRadiusFactor && n.push(`${t}: hairpin at t=${s.toFixed(3)}: turn radius is ${o.toFixed(2)} × halfWidth, minimum ${U.minTurnRadiusFactor}`), c > bc && n.push(`${t}: halfWidth changes ${c.toFixed(2)} m per metre at t=${l.toFixed(3)}, max ${bc}`);
}
function Ac(e, t) {
	let n = (e[0] * t[0] + e[2] * t[2]) / (L(e[0], e[2]) * L(t[0], t[2]) || 1);
	return rn(Math.max(-1, Math.min(1, n))) * 180 / Math.PI;
}
function jc(e, t) {
	let n = e.finalLapShift.routeOverrides ?? [];
	if (!n.length) return null;
	let r = e.controlPoints.map((e) => t.nearestTGlobal([
		e.x,
		e.y,
		e.z
	])), i = Ua(e.controlPoints, r, n);
	return {
		points: i,
		lut: si(i)
	};
}
function Mc(e) {
	let t = [], n = [], r = e.controlPoints;
	if (Ec(r, "controlPoints", t, 8)) {
		let e = r[0], n = r[r.length - 1];
		e.x === n.x && e.y === n.y && e.z === n.z && t.push("controlPoints: last point repeats the first; the loop closes itself, drop it");
	}
	e.checkpointCount < 4 && t.push(`checkpointCount ${e.checkpointCount} < 4`);
	let i = e.startGrid;
	if (Number.isFinite(i.t) || t.push(`startGrid.t ${i.t} is not finite`), (!Number.isInteger(i.rows) || i.rows < 1) && t.push(`startGrid.rows ${i.rows} must be an integer ≥ 1`), (!Number.isInteger(i.columns) || i.columns < 1) && t.push(`startGrid.columns ${i.columns} must be an integer ≥ 1`), (!Number.isFinite(i.spacing) || i.spacing <= 0) && t.push(`startGrid.spacing ${i.spacing} must be > 0`), t.length) return {
		ok: !1,
		errors: t,
		warnings: n
	};
	let a = si(r), o = W(e.startGrid.t), s = a.sample(o, 0).halfWidth;
	s < U.minStartHalfWidth && t.push(`start line halfWidth ${s.toFixed(2)} < ${U.minStartHalfWidth}`), Oc(r, "controlPoints", t, !0), kc(a, "main", t);
	let c = a.minY, l = /* @__PURE__ */ new Set();
	for (let r of e.shortcuts ?? []) {
		let e = `shortcut "${r.id}"`;
		l.has(r.id) && t.push(`${e}: duplicate id`), l.add(r.id);
		let i = W(r.exitT - r.entryT);
		if ((i <= 0 || i > .5) && t.push(`${e}: exitT must follow entryT by less than half a lap (span ${i.toFixed(3)})`), !Ec(r.controlPoints, e, t, 2)) continue;
		let o = a.sample(r.entryT, 0).position, s = a.sample(r.exitT, 0).position, u = r.controlPoints[0], d = r.controlPoints[r.controlPoints.length - 1], f = R(u.x - o[0], u.y - o[1], u.z - o[2]), p = R(d.x - s[0], d.y - s[1], d.z - s[2]);
		f > _c && t.push(`${e}: first point is ${f.toFixed(2)} m from the main line at entryT (max ${_c})`), p > _c && t.push(`${e}: last point is ${p.toFixed(2)} m from the main line at exitT (max ${_c})`);
		let m = si(r.controlPoints, {
			closed: !1,
			samples: 256,
			divisions: 512
		});
		m.minY < c && (c = m.minY), Oc(r.controlPoints, e, t, !1), kc(m, e, t);
		let h = Ac(m.sample(0, 0).tangent, a.sample(r.entryT, 0).tangent), g = Ac(m.sample(1, 0).tangent, a.sample(r.exitT, 0).tangent);
		h > xc && n.push(`${e}: leaves the main line at ${h.toFixed(0)}° (max ${xc}°)`), g > xc && n.push(`${e}: rejoins the main line at ${g.toFixed(0)}° (max ${xc}°)`);
	}
	let u = jc(e, a);
	u && (Oc(u.points, "final-lap road", t, !0), kc(u.lut, "final-lap road", t));
	let d = (n, r, i, a) => {
		(e.hazards ?? []).forEach((o, s) => {
			if (!wc.has(o.type)) return;
			let c = i(o);
			for (let i = 0; i < e.checkpointCount; i++) {
				let l = G(c, W(r + i / e.checkpointCount)) * n.length;
				l >= 0 && l < Sc && t.push(`${a}hazard ${o.id ?? s} (${o.type}) is ${l.toFixed(1)} m past checkpoint ${i} (min ${Sc})`), l < 0 && -l < Cc && t.push(`${a}hazard ${o.id ?? s} (${o.type}) is ${(-l).toFixed(1)} m before checkpoint ${i} (min ${Cc.toFixed(1)})`);
			}
		});
	};
	if (d(a, o, (e) => e.t, ""), u) {
		let e = u.lut;
		d(e, e.nearestTGlobal(a.sample(o, 0).position), (t) => e.nearestTGlobal(a.sample(t.t, t.lateral ?? 0).position), "final lap: ");
	}
	e.voidY > c - vc && t.push(`voidY ${e.voidY} must be at least ${vc} m below the lowest road sample (${c.toFixed(2)})`);
	let f = (e) => e >= 0 && e <= 1, p = (e, n) => {
		(n ?? []).forEach((n, r) => {
			f(n.t) || t.push(`${e} ${r}: t ${n.t} outside 0..1`), n.shortcut && !l.has(n.shortcut) && t.push(`${e} ${r}: unknown shortcut "${n.shortcut}"`);
		});
	};
	p("pickup", e.pickups), p("coin", e.coins), p("boostPad", e.boostPads), p("jump", e.jumps), (e.hazards ?? []).forEach((e, n) => {
		f(e.t) || t.push(`hazard ${n}: t ${e.t} outside 0..1`);
	});
	let m = (e, t, n) => W(e - t) <= W(n - t);
	(e.openEdges ?? []).forEach((n, r) => {
		(!f(n.fromT) || !f(n.toT)) && t.push(`openEdges ${r}: t outside 0..1`);
		for (let i of e.finalLapShift.routeOverrides ?? []) {
			let e = m(n.fromT, i.fromT, i.toT), a = m(n.toT, i.fromT, i.toT), o = m(i.fromT, n.fromT, n.toT) || m(i.toT, n.fromT, n.toT);
			(e !== a || !e && o) && t.push(`openEdges ${r}: ${n.fromT}-${n.toT} partly overlaps the route override ${i.fromT}-${i.toT}; keep it clear of it or wholly inside`);
		}
	});
	let h = e.finalLapShift, g = new Set((e.hazards ?? []).map((e, t) => e.id ?? `hazard-${t}`));
	for (let e of [...h.closesShortcuts ?? [], ...h.opensShortcuts ?? []]) l.has(e) || t.push(`finalLapShift names unknown shortcut "${e}"`);
	for (let e of [...h.enablesHazards ?? [], ...h.disablesHazards ?? []]) g.has(e) || t.push(`finalLapShift names unknown hazard "${e}"`);
	for (let e of h.routeOverrides ?? []) (!f(e.fromT) || !f(e.toT)) && t.push("routeOverride: fromT/toT outside 0..1"), Ec(e.controlPoints, "routeOverride", t, 1);
	p("addsJump", h.addsJumps);
	let _ = a.length / (gc * hc), [v, y] = U.lapTimeWarn;
	return (_ < v || _ > y) && n.push(`estimated lap ${_.toFixed(1)} s (length ${a.length.toFixed(0)} m) is outside ${v}–${y} s; design target is 45–60 s`), {
		ok: t.length === 0,
		errors: t,
		warnings: n
	};
}
function Nc(e) {
	let t = Mc(e);
	if (!t.ok) throw Error(`track "${e.id}" is invalid:\n  ${t.errors.join("\n  ")}`);
}
//#endregion
//#region src/track-builder/track.ts
var Pc = class {
	def;
	voidY;
	branches;
	controlPoints;
	startT;
	startPoint;
	features;
	hazards;
	checkpoints = [];
	spawnGrid = [];
	minimap;
	jumps = [];
	loops = [];
	boostPads = [];
	shifted = !1;
	openEdges;
	loopFeet;
	groundPlaneY;
	land;
	tunnels;
	listeners = [];
	constructor(e) {
		this.def = e, this.voidY = e.voidY, this.controlPoints = e.controlPoints.map((e) => ({ ...e }));
		let t = si(this.controlPoints), n = [new ci(0, "main", t, 0, 1, [])];
		(e.shortcuts ?? []).forEach((e, r) => n.push(di(r + 1, e, t))), this.branches = new pi(n), this.groundPlaneY = Qs(e, t), this.tunnels = (e.shortcuts ?? []).flatMap((e, t) => e.tunnel ? [tc(n[t + 1].lut, e.tunnel.from, e.tunnel.to)] : []), this.land = e.offroad === !0 ? new Js(n.map((e) => e.lut)) : null, this.startT = W(e.startGrid.t), this.startPoint = t.sample(this.startT, 0).position, this.openEdges = (e.openEdges ?? []).map((e) => ({
			...e,
			fromPoint: t.sample(e.fromT, 0).position,
			toPoint: t.sample(e.toT, 0).position
		})), this.loopFeet = (e.loops ?? []).map((e) => ({
			...e,
			point: t.sample(e.t, 0).position
		})), this.features = Fa(e, this.branches), this.hazards = new Bs(e.hazards ?? [], this.branches), this.branches.setLap(1), this.rebuildDerived();
	}
	get length() {
		return this.branches.main.lut.length;
	}
	get id() {
		return this.def.id;
	}
	sample(e, t, n = 0) {
		return this.branches.sample(e, t, n);
	}
	sampleInto(e, t, n, r) {
		return this.branches.sampleInto(e, t, n, r);
	}
	nearestT(e, t, n) {
		return this.branches.main.lut.nearestT(e, t, n);
	}
	nearest(e, t, n) {
		return this.branches.nearest(e, t, n);
	}
	nearestTGlobal(e) {
		return this.branches.main.lut.nearestTGlobal(e);
	}
	nearestGlobal(e) {
		return this.branches.nearestGlobal(e);
	}
	setLap(e) {
		this.branches.setLap(e), this.minimap = Vs(this.branches);
	}
	activeHazards(e) {
		return this.hazards.activeHazards(e);
	}
	applyFinalLapShift(e = []) {
		return Wa(this, e);
	}
	onChanged(e) {
		return this.listeners.push(e), () => {
			let t = this.listeners.indexOf(e);
			t >= 0 && this.listeners.splice(t, 1);
		};
	}
	emit(e) {
		for (let t of this.listeners) t(e);
	}
	rebuildDerived() {
		let e = this.branches.main.lut;
		for (let e of this.branches.list) e.lut.offroad = this.def.offroad === !0, e.lut.land = this.land, e.lut.floorY = this.groundPlaneY;
		ic(this.branches, this.def, this.startT);
		for (let e of this.branches.list) nc(e.lut, this.tunnels);
		e.open.fill(0);
		for (let t of this.openEdges) {
			let n = t.side === "left" ? 1 : t.side === "right" ? 2 : 3;
			for (let r = 0; r < e.n; r++) ((r / e.n - t.fromT) % 1 + 1) % 1 <= ((t.toT - t.fromT) % 1 + 1) % 1 && (e.open[r] |= n);
		}
		this.checkpoints = Hs(e, this.startT, this.def.checkpointCount), this.spawnGrid = Us(e, this.startT, this.def.startGrid), this.minimap = Vs(this.branches);
		let t = this.def.offroad === !0 ? U.rampSkirt : 0;
		this.jumps = za(this.features).map((e) => t && e.shape !== "hump" && e.rise ? {
			...e,
			skirt: t
		} : e), this.boostPads = Ba(this.features), this.loops = this.loopFeet.map((e) => ({
			id: e.id,
			t: e.t,
			radius: e.radius ?? U.loopRadius,
			spread: U.loopSpread,
			shift: this.def.mirrored ? -U.loopShift : U.loopShift,
			approach: U.loopApproach,
			exit: U.loopExit,
			width: U.loopWidth
		}));
	}
};
function Fc(e, t = {}) {
	return (t.validate ?? !0) && Nc(e), new Pc(e);
}
//#endregion
//#region src/backend-leaderboard/inputlog.ts
var Ic = 127, Lc = (e, t, n) => Math.round(Math.min(n, Math.max(t, e)) * Ic) / Ic + 0;
function Rc(e, t) {
	return t.steer = Lc(e.steer, -1, 1), t.throttle = Lc(e.throttle, 0, 1), t.brake = Lc(e.brake, 0, 1), t.drift = e.drift, t.item = e.item, t.lookBack = e.lookBack, t.horn = e.horn, t;
}
function zc(e, t, n) {
	t[n] = Math.round(e.steer * Ic) + 256 & 255, t[n + 1] = Math.round(e.throttle * Ic), t[n + 2] = Math.round(e.brake * Ic), t[n + 3] = +!!e.drift | (e.item ? 2 : 0) | (e.lookBack ? 4 : 0) | (e.horn ? 8 : 0);
}
function Bc(e, t) {
	let n = e[t] > 127 ? e[t] - 256 : e[t], r = e[t + 3];
	return {
		steer: n / Ic + 0,
		throttle: e[t + 1] / Ic,
		brake: e[t + 2] / Ic,
		drift: (r & 1) > 0,
		item: (r & 2) > 0,
		lookBack: (r & 4) > 0,
		horn: (r & 8) > 0
	};
}
function Vc(e) {
	let t = "";
	for (let n = 0; n < e.length; n += 32768) t += String.fromCharCode(...e.subarray(n, n + 32768));
	return btoa(t);
}
function Hc(e) {
	let t = atob(e), n = new Uint8Array(t.length);
	for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
	return n;
}
function Uc(e) {
	let t = /* @__PURE__ */ new Uint8Array(4), n = /* @__PURE__ */ new Uint8Array(4), r = [1], i = 0, a = () => {
		let e = i;
		for (; e >= 128;) r.push(e & 127 | 128), e >>>= 7;
		r.push(e), r.push(n[0], n[1], n[2], n[3]);
	};
	for (let r of e) {
		if (zc(r, t, 0), i > 0 && t[0] === n[0] && t[1] === n[1] && t[2] === n[2] && t[3] === n[3]) {
			i++;
			continue;
		}
		i > 0 && a(), n.set(t), i = 1;
	}
	return i > 0 && a(), Vc(Uint8Array.from(r));
}
function Wc(e, t = 72e3) {
	let n = Hc(e);
	if (n[0] !== 1) throw Error("unknown log version");
	let r = [], i = 1;
	for (; i < n.length;) {
		let e = 0, a = 0;
		for (;;) {
			if (i >= n.length || a > 28) throw Error("bad run length");
			let t = n[i++];
			if (e |= (t & 127) << a, t < 128) break;
			a += 7;
		}
		if (i + 4 > n.length) throw Error("truncated record");
		if (e <= 0 || r.length + e > t) throw Error("log too long");
		let o = Bc(n, i);
		i += 4;
		for (let t = 0; t < e; t++) r.push(o);
	}
	return r;
}
//#endregion
//#region src/game/simtick.ts
function Gc(e, t) {
	let { manager: n, ai: r, items: i, inputs: a, playerIndex: o } = e;
	r.fill(n.state, n.lastActiveHazards, a), o >= 0 && t && n.state.karts[o].finishTick === void 0 && (a[o] = Rc(t, e.playerSlot));
	let s = n.step(a), c = i.step(a, s, Fr);
	for (let e = 0; e < a.length; e++) r.threatened[e] = i.threatened[e];
	return {
		race: s,
		items: c
	};
}
//#endregion
//#region src/backend-leaderboard/verify.ts
function Kc(e, t, n, r, i, a) {
	let o = k(t, e.id, n, r, a), s = Fc(e), c = new Ms(s, o), l = new Jo(s, c), u = {
		manager: c,
		items: l,
		ai: new Ma(s, o, c.state, { itemRoles: l.roles }),
		inputs: c.state.karts.map(() => ({ ...kn })),
		playerIndex: 0,
		playerSlot: { ...kn }
	}, d = 0;
	for (; d < i.length && c.state.phase !== "finished"; d++) Gc(u, i[d]);
	let f = c.results().ranks[0], p = f !== void 0 && !f.dnf && f.finishTick >= 0;
	return {
		finished: p,
		timeMs: p ? f.timeMs : -1,
		lapTimesMs: p ? f.lapTimesMs : [],
		ticks: d
	};
}
var qc = 1e3;
function Jc(e, t, n, r, i, a, o) {
	let s;
	try {
		s = Wc(i);
	} catch (e) {
		return {
			ok: !1,
			reason: `bad input log: ${e.message}`
		};
	}
	let c = Kc(e, t, n, r, s, o);
	return c.finished ? Math.abs(c.timeMs - a) > 1e3 ? {
		ok: !1,
		reason: `claimed ${a} ms but the replay finished in ${c.timeMs} ms`
	} : {
		ok: !0,
		timeMs: c.timeMs,
		lapTimesMs: c.lapTimesMs,
		canonicalLog: Uc(Yc(e, t, n, r, s.slice(0, c.ticks), c.timeMs, o))
	} : {
		ok: !1,
		reason: "the replay never reached the finish line"
	};
}
function Yc(e, t, n, r, i, a, o) {
	let s = i.map((e, n) => {
		let r = Rc(e, { ...kn });
		return r.horn = !1, n <= ns ? {
			...kn,
			throttle: +(r.throttle > Y.stuckInputMin)
		} : (t === "timeTrial" && (r.item = !1, r.lookBack = !1), r);
	}), c = Kc(e, t, n, r, s, o);
	return c.finished && c.timeMs === a ? s : i.map((e) => e.horn ? {
		...e,
		horn: !1
	} : e);
}
var Xc = Object.freeze(Object.fromEntries(Object.values(/* @__PURE__ */ Object.assign({
	"../track-builder/tracks/boardwalk-nights.json": e,
	"../track-builder/tracks/canyon-rush.json": t,
	"../track-builder/tracks/frostbite-pass.json": n,
	"../track-builder/tracks/harbour-loop.json": r,
	"../track-builder/tracks/meadow-run.json": i,
	"../track-builder/tracks/skyline-circuit.json": a
})).map((e) => [e.id, e]))), Zc = Object.freeze(Object.keys(Xc).sort());
//#endregion
export { qc as CLAIM_TOLERANCE_MS, C as CLIENT_VERSION, w as MAX_LOG_BYTES, Xc as TRACKS, Zc as TRACK_IDS, se as checkSubmission, D as dailySeed, E as ipBucket, Jc as verifyRun };
