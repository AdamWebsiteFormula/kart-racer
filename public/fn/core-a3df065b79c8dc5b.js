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
			id: "kraken",
			type: "creature",
			creature: "kraken",
			t: .42,
			lateral: 1,
			period: 7.6,
			hit: "spin"
		},
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
	name: "Canyon Rush",
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
			id: "rumblesaur",
			type: "creature",
			creature: "rumblesaur",
			t: .8,
			lateral: 1,
			period: 5.6,
			hit: "spin"
		},
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
			id: "yeti",
			type: "creature",
			creature: "yeti",
			t: .62,
			lateral: -1,
			period: 3.6,
			hit: "spin"
		},
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
				asset: "fir",
				instances: 130,
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
			}
		]
	}
}, r = {
	id: "harbour-loop",
	name: "Harbor Loop",
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
		id: "crab",
		type: "creature",
		creature: "crab",
		t: .36,
		lateral: 1,
		period: 7.6,
		hit: "spin"
	}, {
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
				band: "far"
			},
			{
				asset: "gull",
				instances: 30,
				band: "sky"
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
	name: "Meadow Run",
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
		id: "goose",
		type: "creature",
		creature: "goose",
		t: .3,
		lateral: 1,
		period: 11,
		hit: "spin"
	}, {
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
		id: "whale",
		type: "creature",
		creature: "whale",
		t: .5,
		lateral: -1,
		period: 12
	}, {
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
			},
			{
				asset: "airship",
				instances: 6,
				band: "far",
				lift: 70
			}
		]
	}
}, o = Object.freeze([
	{
		id: "pip",
		name: "Pip",
		archetype: "light",
		species: "Hummingbird courier",
		personality: "Fast-talking, never stops moving",
		kart: "Delivery scooter",
		accent: "#2EC4B6",
		secondary: "#FF6F61"
	},
	{
		id: "momo",
		name: "Momo",
		archetype: "light",
		species: "Cat mechanic",
		personality: "Deadpan, competent",
		kart: "Stripped-down buggy",
		accent: "#3B3B3B",
		secondary: "#FFD23F"
	},
	{
		id: "nova",
		name: "Nova",
		archetype: "light",
		species: "Moth astronaut",
		personality: "Dreamy, drawn to the lights",
		kart: "Thruster pod",
		accent: "#B39DDB",
		secondary: "#FFFFFF"
	},
	{
		id: "juniper",
		name: "Juniper",
		archetype: "medium",
		species: "Fox park ranger",
		personality: "Rule-follower, secretly ruthless",
		kart: "Wood-panel jeep",
		accent: "#B7410E",
		secondary: "#2D6A4F"
	},
	{
		id: "otto",
		name: "Otto",
		archetype: "medium",
		species: "Otter lifeguard",
		personality: "Laid-back, waves at everyone",
		kart: "Jet-ski kart",
		accent: "#64B5F6",
		secondary: "#E53935"
	},
	{
		id: "sprocket",
		name: "Sprocket",
		archetype: "medium",
		species: "Wind-up robot",
		personality: "Literal, counts laps aloud",
		kart: "Tin-toy racer",
		accent: "#F5E6C8",
		secondary: "#B08D57"
	},
	{
		id: "boulder",
		name: "Boulder",
		archetype: "heavy",
		species: "Rock golem",
		personality: "Gentle giant, says sorry after ramming",
		kart: "Stone monster truck",
		accent: "#708090",
		secondary: "#6A994E"
	},
	{
		id: "gus",
		name: "Big Gus",
		archetype: "heavy",
		species: "Walrus chef",
		personality: "Booming laugh, feeds rivals after",
		kart: "Food-truck kart",
		accent: "#E63946",
		secondary: "#FFFFFF"
	}
]), s = "4", c = 262144, l = (e = /* @__PURE__ */ new Date()) => e.getUTCHours() * 60 + e.getUTCMinutes();
function u(e) {
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
function d(e = /* @__PURE__ */ new Date()) {
	return e.getUTCFullYear() * 1e4 + (e.getUTCMonth() + 1) * 100 + e.getUTCDate();
}
function f(e, t) {
	let n = [...t].sort();
	return n[e % n.length];
}
var p = (e) => e === "timeTrial" || e === "daily";
function m(e, t, n, r) {
	let i = o.find((e) => e.id === n);
	return {
		mode: e,
		trackId: t,
		speedClass: 150,
		seed: e === "timeTrial" ? 0 : r,
		racers: [{
			racerId: n,
			archetype: i?.archetype ?? "medium",
			isPlayer: !0
		}]
	};
}
var h = [
	"fuck",
	"cunt",
	"nigg",
	"bitch",
	"whore",
	"retard",
	"hitler",
	"penis",
	"vagina",
	"pussy",
	"faggot",
	"wanker",
	"dickhead",
	"shithead",
	"cocksuck",
	"wetback",
	"kkk",
	"siegheil"
], g = [
	"shit",
	"shitty",
	"dick",
	"cock",
	"fag",
	"slut",
	"slutty",
	"rape",
	"rapist",
	"nazi",
	"twat",
	"wank",
	"kike",
	"chink",
	"spic",
	"coon",
	"tranny",
	"beaner",
	"heil"
], _ = {
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
function v(e) {
	return e.toLowerCase().replace(/[0-9@$]/g, (e) => _[e]).replace(/[^a-z]/g, "");
}
var y = (e) => [e, e.replace(/ph/g, "f").replace(/l/g, "i").replace(/v/g, "u").replace(/q/g, "g")];
function b(e) {
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
function x(e) {
	if (e.replace(/[^0-9]/g, "").includes("1488") || y(v(e)).some((e) => h.some((t) => e.includes(t)))) return !1;
	let t = (e) => y(e).some((e) => g.some((t) => e === t || e === `${t}s`));
	return !b(e).some((e) => t(v(e)) || t(e.toLowerCase().replace(/[^a-z]/g, "")));
}
function S(e, t, n = d(), r = l()) {
	if (!e || typeof e != "object") return "payload must be an object";
	let i = e;
	if (typeof i.name != "string" || !/^[A-Za-z0-9 _-]{1,16}$/.test(i.name) || !i.name.trim()) return "name must be 1–16 letters, digits, spaces, _ or -";
	if (!x(i.name)) return "please pick another name";
	if (typeof i.trackId != "string" || !t.includes(i.trackId)) return "unknown track";
	if (typeof i.mode != "string" || !p(i.mode)) return "mode must be timeTrial or daily";
	if (i.speedClass !== 150) return "leaderboards are 150cc only";
	if (typeof i.racerId != "string" || !o.some((e) => e.id === i.racerId)) return "unknown racer";
	if (!Number.isInteger(i.timeMs) || i.timeMs < 3e4) return "time is not a whole number of milliseconds of at least 30 s";
	if (typeof i.inputLog != "string" || i.inputLog.length === 0 || i.inputLog.length > 262144) return "input log missing or too large";
	if (i.clientVersion !== "4") return "please reload the game: new version";
	if (i.mode === "daily") {
		let e = i.dailySeed === C(n) && r < 15;
		if (!Number.isInteger(i.dailySeed) || i.dailySeed !== n && !e) return "that daily challenge is closed";
		if (i.trackId !== f(i.dailySeed, t)) return "wrong track for that day";
	}
	return null;
}
function C(e) {
	let t = Math.floor(e / 1e4), n = Math.floor(e / 100) % 100, r = e % 100;
	return d(/* @__PURE__ */ new Date(Date.UTC(t, n - 1, r) - 864e5));
}
var w = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "kart.schema.json",
	title: "KartArchetype and Racer",
	description: "Base handling constants, the three archetype multipliers, the eight racers, and the shared kart bodies. Bodies and skins are cosmetic only; the racer owns the class.",
	type: "object",
	required: [
		"base",
		"archetypes",
		"racers",
		"bodies"
	],
	properties: /* @__PURE__ */ JSON.parse("{\"base\":{\"type\":\"object\",\"required\":[\"topSpeed\",\"accel\",\"brake\",\"steerRate\",\"driftSteerMin\",\"driftSteerMax\",\"driftYawLag\",\"airSteer\",\"gripDrift\",\"bumpSeparateRate\",\"hopSeconds\",\"chargeFull\",\"chargeNeutral\",\"driftTiers\",\"boostMultiplier\",\"boostSeconds\",\"trickMultiplier\",\"trickSeconds\",\"padMultiplier\",\"padSeconds\",\"itemSpeedMultiplier\",\"itemSpeedSeconds\",\"slipstreamSeconds\",\"slipstreamMultiplier\",\"slipstreamBoostSeconds\",\"coinBonusEach\",\"coinCap\",\"gripRoad\",\"gripOffroad\",\"gripMud\",\"gripIce\",\"startBoostWindowSeconds\",\"startBoostMultiplier\",\"startBoostSeconds\",\"bumpForce\",\"hitSpinSeconds\",\"hitCoinsLost\",\"speedClasses\",\"surfaceSpeed\",\"gravity\",\"hopVelocity\",\"coastDecel\",\"overSpeedDecel\",\"reverseFraction\",\"steerFalloff\",\"driftMinSpeed\",\"driftKeepSpeed\",\"driftAirCancelSeconds\",\"kartRadius\",\"groundStick\",\"groundLaunchVy\",\"wallRestitution\",\"wallScrub\",\"wallDeflect\",\"wallDeflectRate\",\"groundCatch\",\"startBoostCentreSeconds\",\"slipstreamLength\",\"slipstreamHalfWidth\",\"tSearchWindow\",\"driftVisualSlip\",\"dashMassBonus\",\"coinShield\",\"wallCooldownSeconds\",\"bumpCoold" +
"ownSeconds\",\"hardWallFraction\",\"slipstreamSameWayDot\",\"hopLandWindow\",\"maxBoostMultiplier\",\"shieldMassBonus\",\"rideSpeedMultiplier\",\"rideLookahead\",\"rideMassBonus\",\"rideRadius\",\"pilotTurnRate\",\"pilotAccel\",\"towSpeedMultiplier\",\"towSideOffset\",\"towFollowRoad\",\"springLaunch\",\"slamSpeed\",\"fallCatchDepth\",\"loopSpeedFactor\",\"wallEndOvershoot\",\"wallEndPushRate\",\"accelLaunch\",\"accelTaper\",\"contactHeight\",\"trickBufferSeconds\",\"driftLateSteer\",\"airGrip\",\"steerLowSpeed\",\"lipZone\"],\"properties\":{\"topSpeed\":{\"type\":\"number\",\"description\":\"m/s\",\"default\":25},\"accel\":{\"type\":\"number\",\"default\":12},\"accelLaunch\":{\"type\":\"number\",\"description\":\"Throttle accel tapers with speed (24 Sept 2026): accel × (accelLaunch − accelTaper × (v / V)²). 1.3 and 0.7 give 15.6 m/s² off the line, 7.2 at the top, and 0 to V in 2.04 s (the old flat 12 m/s² took 2.08 s): a punchy launch that eases into top speed, like Mario Kart. 1.5 / 1.0 (18 m/s²) made a wall-scraping driver recover so fast it matched the Hard AI (ai-driver gate 2).\",\"default\":1.3},\"accelTaper\":{\"type\":\"number\",\"description\":\"See accelLaunch. Keep acce" +
"lLaunch − accelTaper above 0 so the kart always reaches V.\",\"default\":0.7},\"brake\":{\"type\":\"number\",\"default\":20},\"steerRate\":{\"type\":\"number\",\"description\":\"rad/s at low speed\",\"default\":2.4},\"driftSteerMin\":{\"type\":\"number\",\"description\":\"Drift yaw = steerRate × lerp(driftSteerMin, driftSteerMax, drift.yawK) × driftSpeedScale, where yawK chases the whole stick range, (1 + steer × direction) / 2, over driftYawLag and starts at 0 on the lock. Full outward stick: 0.07 rad/s at top speed (a 350 m arc), the wide line, so a drift can hold the gentlest sweeper. Centred: 0.52 rad/s (48 m), the medium line. 24 Sept 2026 (Adam: MKW-level drift reward): it was 0.1 (0.24 rad/s, a 104 m arc), tighter than the racing line through most of our bends, so a drift ran onto the inside edge and let go at tier 1. 24 Sept 2026: the stick used to count only toward the drift side, so a centred stick drew the widest line (99 m). Mario Kart Wii datamine: the turn value lerps toward the stick each frame (reactivity), it never snaps.\",\"default\":0.03},\"driftSteerMax\":{\"type\":\"number\",\"description\":\"Full inward stick: 0.96 rad/s, a 26 m circle at top speed, a notch t" +
"ighter than the grip turn at full lock (30 m). Adam settled it by feel on 21 Sept 2026 (1.08 too tight, 0.84 too loose). Below top speed a drift tightens as the grip turn does (driftSpeedScale), so full inward is never wider than steering at the same speed.\",\"default\":0.4},\"airSteer\":{\"type\":\"number\",\"description\":\"Steering authority while airborne, as a fraction of the grip turn. Mario Kart: the hop goes straight and the stick at landing sets the drift (delay drift); 0.15 keeps a whisper of control off ramps.\",\"default\":0.15},\"driftYawLag\":{\"type\":\"number\",\"description\":\"Seconds for the drift turn value to close most of the gap to the stick (MKW drift reactivity). The drift begins loose and tightens.\",\"default\":0.35},\"gripDrift\":{\"type\":\"number\",\"description\":\"Lateral damping per second while drifting. Lower than the road grip, so the kart carries outward on the drift lock and slides through the bend (MKW outside drift, target angle).\",\"default\":4.5},\"bumpSeparateRate\":{\"type\":\"number\",\"description\":\"m/s at which overlapping karts are eased apart, or the closing speed of the hit if that is faster (24 Sept 2026: capped at 2.5 m/s a re" +
"ar-ender drove straight through); the old instant pop was the jarring part of a bump.\",\"default\":2.5},\"contactHeight\":{\"type\":\"number\",\"description\":\"metres. Two karts touch (bump, slipstream) only when their heights differ by less than this, the same rule as items (src/items/powers.ts level()): a kart high on a spring or a jump passes over.\",\"default\":2},\"hopSeconds\":{\"type\":\"number\",\"default\":0.25},\"chargeFull\":{\"type\":\"number\",\"description\":\"Mini-turbo charge per 60 fps frame with the stick centred or into the drift (Mario Kart 8 Deluxe: 5).\",\"default\":5},\"chargeNeutral\":{\"type\":\"number\",\"description\":\"Charge per frame with the stick pushed out of the drift (the wide line). 24 Sept 2026: 2 → 3.5 (Mario Kart 8 Deluxe has 2), because on our wide sweepers the line is the wide stick; blue still comes 0.25 s later than with the stick in.\",\"default\":3.5},\"driftTiers\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"Charge for blue, orange, purple: 0.55 / 1.33 / 2.33 s at the full rate (0.79 / 1.9 / 3.3 s pushed out). 24 Sept 2026 (Adam: MKW-level drift reward): was 250 / 550 / 850 (Mario Kart 8 Deluxe, 0.83 / 1.83 /" +
" 2.83 s), which our bends only reached orange on and seldom purple.\",\"default\":[165,400,700]},\"boostMultiplier\":{\"type\":\"number\",\"description\":\"Drift mini-turbo. Mario Kart Wii's mini-turbo is +30%; the +20% row is its standstill mini-turbo.\",\"default\":1.3},\"boostSeconds\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"Mini-turbo length for blue, orange, purple. Mario Kart 8 Deluxe (Nintendo tutorial): 0.62 / 1.67 / 2.63 s. Ours ramps up to the boosted speed (throttle accel) rather than kicking, so blue is 0.8 s (0.6 paid 0.13 s; now 0.23 s, orange 0.45 s, purple 0.72 s on a straight). 24 Sept 2026.\",\"default\":[0.8,1.5,2.4]},\"trickMultiplier\":{\"type\":\"number\",\"default\":1.3},\"trickSeconds\":{\"type\":\"number\",\"default\":0.7},\"padMultiplier\":{\"type\":\"number\",\"description\":\"Mario Kart Wii dash panel: +40% for 60 frames.\",\"default\":1.4},\"padSeconds\":{\"type\":\"number\",\"default\":1.0},\"itemSpeedMultiplier\":{\"type\":\"number\",\"default\":1.4},\"itemSpeedSeconds\":{\"type\":\"number\",\"default\":1.5},\"slipstreamSeconds\":{\"type\":\"number\",\"description\":\"Seconds in a wake before the boost fires\",\"default\"" +
":2.0},\"slipstreamMultiplier\":{\"type\":\"number\",\"default\":1.12},\"slipstreamBoostSeconds\":{\"type\":\"number\",\"description\":\"design §7: slipstream 2 s → +12% for 1.5 s\",\"default\":1.5},\"coinBonusEach\":{\"type\":\"number\",\"default\":0.0066},\"coinCap\":{\"type\":\"integer\",\"default\":10},\"gripRoad\":{\"type\":\"number\",\"description\":\"Lateral velocity damping per second. Mario Kart does NOT reduce grip off-road; the off-road penalty is the speed cap in surfaceSpeed. Only slippery surfaces (ice) cut grip. See docs/sops/kart-controller.md Approach.\",\"default\":8},\"gripOffroad\":{\"type\":\"number\",\"description\":\"Dirt. Equal to gripRoad on purpose (MK8DX BrakeRt only caps speed off-road).\",\"default\":8},\"gripMud\":{\"type\":\"number\",\"description\":\"Equal to gripRoad on purpose; mud is punished by surfaceSpeed, not by grip.\",\"default\":8},\"gripIce\":{\"type\":\"number\",\"description\":\"The one surface that really slides (MK8DX SlipRt applies to ice and sand).\",\"default\":2.5},\"surfaceSpeed\":{\"description\":\"Top-speed cap per surface, as a fraction of the kart's on-road top speed. This is how Mario Kart models off-road: a hard speed cap, no" +
"t drag and not grip. MK8DX datamined BrakeRt for dirt terrain has three tiers, 0.7 light / 0.5 medium / 0.3 heavy (deep sand). We map dirt to the light tier and mud to the medium tier; 0.3 stays free for a future deep-mud surface. Ice takes the slippery-terrain value (~0.9) and pays the rest in grip. The cap is ignored while a boost is live and while airborne (both are real MK rules, and they are what makes the hop-over-off-road line worth learning).\",\"type\":\"object\",\"required\":[\"road\",\"dirt\",\"mud\",\"ice\",\"boost\",\"rail\"],\"properties\":{\"road\":{\"type\":\"number\",\"default\":1.0},\"dirt\":{\"type\":\"number\",\"default\":0.7},\"mud\":{\"type\":\"number\",\"description\":\"MK8DX's medium off-road tier is 0.5; softened to 0.6 by design decision 8 Sept 2026.\",\"default\":0.6},\"ice\":{\"type\":\"number\",\"default\":0.9},\"boost\":{\"type\":\"number\",\"default\":1.0},\"rail\":{\"type\":\"number\",\"default\":1.0}}},\"boostIgnoresSurfaceCap\":{\"type\":\"boolean\",\"description\":\"MK Wii: a dash-panel boost carries off-road immunity. We apply it to every boost source for one readable rule.\",\"default\":true},\"airborneIgnoresSurfaceCap\":{\"type\":\"boolean\",\"" +
"description\":\"No ground contact, no surface cap. This is what makes hopping over a mud patch work.\",\"default\":true},\"gravity\":{\"type\":\"number\",\"description\":\"m/s². No Mario Kart datamine exists for this; tuned so hopSeconds lands.\",\"default\":26},\"hopVelocity\":{\"type\":\"number\",\"description\":\"m/s. gravity × hopSeconds / 2 so a flat hop lasts exactly hopSeconds.\",\"default\":3.25},\"coastDecel\":{\"type\":\"number\",\"default\":4.5},\"overSpeedDecel\":{\"type\":\"number\",\"description\":\"m/s². How fast speed falls back to the cap when a boost ends or a surface cap bites.\",\"default\":10},\"reverseFraction\":{\"type\":\"number\",\"description\":\"Reverse top speed as a fraction of forward top speed.\",\"default\":0.35},\"steerFalloff\":{\"type\":\"number\",\"description\":\"Turn rate shrinks with speed by this fraction at top speed, giving ~30 m radius (SuperTuxKart).\",\"default\":0.65},\"driftMinSpeed\":{\"type\":\"number\",\"description\":\"Fraction of top speed needed to start a drift.\",\"default\":0.45},\"driftKeepSpeed\":{\"type\":\"number\",\"description\":\"Drift cancels with no boost below this fraction.\",\"default\":0.3},\"driftAirCancelSeconds\"" +
":{\"type\":\"number\",\"default\":0.9},\"kartRadius\":{\"type\":\"number\",\"description\":\"metres; collision circle\",\"default\":0.85},\"groundStick\":{\"type\":\"number\",\"description\":\"metres; stay glued to the ground within this height so crests do not launch the kart\",\"default\":0.12},\"groundLaunchVy\":{\"type\":\"number\",\"default\":1.0},\"wallRestitution\":{\"type\":\"number\",\"default\":0.3},\"wallScrub\":{\"type\":\"number\",\"description\":\"Fraction of speed lost on a square (90°) wall hit, once per impact (not per tick of contact), scaled from nothing at hardWallFraction to all of it head-on by how square the hit is (outward speed / total): a 30° glance loses 4% (24 Sept 2026: per-tick scrub took a 30° hit at 25 m/s down to 8 m/s in 50 ms).\",\"default\":0.15},\"wallDeflect\":{\"type\":\"number\",\"description\":\"On any wall contact with the nose pointing in, the nose swings this fraction of the way from its heading to the wall line, so the kart slides along the wall instead of sticking to it nose-first (Mario Kart bounces you off; it never parks you).\",\"default\":0.7},\"wallDeflectRate\":{\"type\":\"number\",\"description\":\"rad/s cap on that swing, so th" +
"e nose turns along the wall over a few frames instead of snapping.\",\"default\":5.0},\"groundCatch\":{\"type\":\"number\",\"description\":\"metres. An airborne kart found under the road by less than this lands on it (a hop across a banked or sloping road); deeper, it is really under and keeps falling.\",\"default\":1.0},\"slipstreamLength\":{\"type\":\"number\",\"description\":\"metres behind the kart ahead\",\"default\":8},\"slipstreamHalfWidth\":{\"type\":\"number\",\"default\":2},\"tSearchWindow\":{\"type\":\"number\",\"description\":\"Spline fraction searched around the previous t. Never search globally.\",\"default\":0.02},\"driftVisualSlip\":{\"type\":\"number\",\"description\":\"rad; render-only body yaw offset at full drift, into the bend. The sim already slides (gripDrift), so the nose points inward by the slip angle before this is added; 0.49 on top read as a spin.\",\"default\":0.22},\"dashMassBonus\":{\"type\":\"number\",\"description\":\"Added to collision mass while any boost is live. MK8DX has a separate 'dash mass' for exactly this, so a boosting light kart can still win a bump.\",\"default\":0.35},\"shieldMassBonus\":{\"type\":\"number\",\"description\":\"Added to" +
" collision mass while a Bubble is up (research plan §5: +50 % bump weight; items Decisions 2026-09-21).\",\"default\":0.5},\"coinShield\":{\"description\":\"Off (Adam, 24 Sept 2026). When enabled, coins would be a hit buffer: with coins in hand a hit costs coins and a short slow instead of a spin. That is not how Mario Kart works: in Mario Kart 8 Deluxe and World every item or hazard hit spins you out and costs coins (hitCoinsLost), whatever you hold. Kept only as a switch.\",\"type\":\"object\",\"required\":[\"enabled\",\"slowedTo\",\"slowSeconds\"],\"properties\":{\"enabled\":{\"type\":\"boolean\",\"default\":false},\"slowedTo\":{\"type\":\"number\",\"description\":\"Speed multiplier applied instead of a spin when the kart has at least one coin.\",\"default\":0.75},\"slowSeconds\":{\"type\":\"number\",\"default\":0.6}}},\"wallCooldownSeconds\":{\"type\":\"number\",\"description\":\"Min seconds between wall events\",\"default\":0.2},\"bumpCooldownSeconds\":{\"type\":\"number\",\"description\":\"Min seconds between kart-vs-kart shoves for a pair\",\"default\":0.25},\"hardWallFraction\":{\"type\":\"number\",\"description\":\"A wall hit is hard (scrubs speed, once per impact) when ou" +
"tward speed / total speed exceeds this\",\"default\":0.3},\"slipstreamSameWayDot\":{\"type\":\"number\",\"description\":\"Min dot of both forward vectors to count as drafting\",\"default\":0.7},\"hopLandWindow\":{\"type\":\"number\",\"description\":\"Multiple of hopSeconds inside which landing with stick held locks a drift\",\"default\":2},\"driftLateSteer\":{\"type\":\"number\",\"description\":\"Grounded, not drifting, drift button held, fast enough and |steer| at least this: the drift starts now, no hop (a late drift, or one straight off a landing, as in Mario Kart 8 Deluxe and World).\",\"default\":0.3},\"trickBufferSeconds\":{\"type\":\"number\",\"description\":\"A drift press this long before a ramp launch still counts as the trick (and a hop at the lip still takes the launch).\",\"default\":0.15},\"airGrip\":{\"type\":\"number\",\"description\":\"Multiple of the surface grip on lateral velocity while airborne (the hop included).\",\"default\":0.5},\"steerLowSpeed\":{\"type\":\"number\",\"description\":\"Fraction of top speed below which the grip turn fades to nothing (no pivoting on the spot).\",\"default\":0.15},\"lipZone\":{\"type\":\"number\",\"description\":\"metres aroun" +
"d a ramp lip inside which the lip-from-behind wall is checked\",\"default\":8},\"maxBoostMultiplier\":{\"type\":\"number\",\"description\":\"Hard ceiling on any boost multiplier (design §7: pad and item are +40%). requestBoost clamps to it.\",\"default\":1.4},\"startBoostCentreSeconds\":{\"type\":\"number\",\"description\":\"Seconds before GO the throttle should go down: the moment the 2 appears, like Mario Kart (Adam, 21 Sept 2026).\",\"default\":2.0},\"startBoostWindowSeconds\":{\"type\":\"number\",\"description\":\"Full width of the window around the centre.\",\"default\":1.0},\"startBoostMultiplier\":{\"type\":\"number\",\"default\":1.2},\"startBoostSeconds\":{\"type\":\"number\",\"default\":1.0},\"bumpForce\":{\"type\":\"number\",\"description\":\"Lateral m/s given to the lighter kart on contact, scaled by weight difference. 6 threw the kart a lane in one tick (Adam, 21 Sept 2026).\",\"default\":3.5},\"hitSpinSeconds\":{\"type\":\"number\",\"description\":\"Default stun when an item or hazard lands\",\"default\":1.0},\"rideSpeedMultiplier\":{\"type\":\"number\",\"description\":\"Strike Ball: autopilot speed as a multiple of top speed (its own path, above the boost ceiling; des" +
"ign §8, Adam 23 Sept 2026)\",\"default\":1.5},\"rideLookahead\":{\"type\":\"number\",\"description\":\"Strike Ball: metres ahead on the centreline the autopilot aims at\",\"default\":14},\"rideMassBonus\":{\"type\":\"number\",\"description\":\"Strike Ball: added to collision mass\",\"default\":6},\"rideRadius\":{\"type\":\"number\",\"description\":\"Strike Ball: collision radius while rolling (the ball is about 2.6 m across)\",\"default\":1.3},\"pilotTurnRate\":{\"type\":\"number\",\"description\":\"Autopilot (Strike Ball, Grapple Anchor): radians per second the heading may turn toward its aim\",\"default\":5},\"pilotAccel\":{\"type\":\"number\",\"description\":\"Autopilot: multiple of accel while it speeds up\",\"default\":3},\"towSpeedMultiplier\":{\"type\":\"number\",\"description\":\"Grapple Anchor: the reel-in speed as a multiple of top speed\",\"default\":1.4},\"towSideOffset\":{\"type\":\"number\",\"description\":\"Grapple Anchor: the pull aims this far beside the hooked kart, so you draw level and pass instead of rear-ending it\",\"default\":2.2},\"towFollowRoad\":{\"type\":\"number\",\"description\":\"Grapple Anchor: while the hooked kart is more than this far ahead along " +
"the road (m), the pull follows the road\",\"default\":20},\"springLaunch\":{\"type\":\"number\",\"description\":\"Pogo Spring: m/s straight up (about 3.8 m and 1.1 s of air at gravity 26)\",\"default\":14},\"slamSpeed\":{\"type\":\"number\",\"description\":\"Pogo Spring: m/s straight down on the slam\",\"default\":30},\"fallCatchDepth\":{\"type\":\"number\",\"description\":\"Off an open edge: this far below the road the claw catches the kart mid-fall (race-manager rescue)\",\"default\":5},\"wallEndOvershoot\":{\"type\":\"number\",\"description\":\"A kart this far outside a wall's line (on an open shoulder where the barrier starts, or landing outside it) is eased back in, not snapped (metres; more than a kart radius, so an ordinary wall hit still snaps)\",\"default\":1.2},\"wallEndPushRate\":{\"type\":\"number\",\"description\":\"m/s at which that kart is eased back onto the road\",\"default\":10},\"loopSpeedFactor\":{\"type\":\"number\",\"description\":\"A loop-the-loop carries a kart round at its own speed, never slower than this fraction of top speed (design.md Track thrills): boost in and you fly round\",\"default\":0.8},\"hitCoinsLost\":{\"type\":\"integer\",\"description\":\"M" +
"ario Kart World lowered this from 3 to 2 for every racer.\",\"default\":2},\"speedClasses\":{\"description\":\"Top-speed scale per cc class\",\"type\":\"object\",\"required\":[\"50\",\"100\",\"150\"],\"properties\":{\"50\":{\"type\":\"number\",\"default\":0.7},\"100\":{\"type\":\"number\",\"default\":0.85},\"150\":{\"type\":\"number\",\"default\":1.0}}}}},\"archetypes\":{\"type\":\"object\",\"required\":[\"light\",\"medium\",\"heavy\"],\"additionalProperties\":{\"type\":\"object\",\"required\":[\"speed\",\"accel\",\"handling\",\"weight\",\"hook\"],\"properties\":{\"speed\":{\"type\":\"number\"},\"accel\":{\"type\":\"number\"},\"handling\":{\"type\":\"number\"},\"weight\":{\"type\":\"number\"},\"hook\":{\"type\":\"string\",\"enum\":[\"none\",\"hardBump\"],\"description\":\"Researched 8 Sept 2026 against Mario Kart World. hardBump = heavy: every Mario Kart decides a bump by collision mass, and MKW's own Weight tooltip says weight 'affects collision between vehicles'. light and medium take none. A light 'fastCharge' hook was rejected: MK8DX's hidden Mini-Turbo stat is per character and kart part and does not track weight (Bowser is max, Wario is min). A medium 'keepCoins' hook was rej" +
"ected as invented (design §4, 8 Sept 2026); the coin buffer that replaced it (base.coinShield) was switched off on 24 Sept 2026: in Mario Kart a hit always spins you.\"}}}},\"racers\":{\"type\":\"array\",\"minItems\":8,\"maxItems\":8,\"items\":{\"type\":\"object\",\"required\":[\"id\",\"name\",\"archetype\",\"accent\",\"secondary\",\"kartAsset\",\"headAsset\",\"horn\"],\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"archetype\":{\"type\":\"string\",\"enum\":[\"light\",\"medium\",\"heavy\"]},\"accent\":{\"type\":\"string\"},\"secondary\":{\"type\":\"string\"},\"kartAsset\":{\"type\":\"string\"},\"headAsset\":{\"type\":\"string\"},\"propAsset\":{\"type\":\"string\"},\"horn\":{\"type\":\"string\"},\"hitYelp\":{\"type\":\"string\"},\"aiPersonality\":{\"$ref\":\"#/$defs/aiPersonality\"},\"skins\":{\"description\":\"Alt palettes. All racers are available from the start; only skins unlock (design §10).\",\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/unlockable\"}}}}},\"bodies\":{\"description\":\"Shared kart body styles. Cosmetic only: no stat change, so leaderboard times stay comparable.\",\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/unlockable\"}},\"" +
"ai\":{\"description\":\"AI driver constants (docs/sops/ai-driver.md Approach). Never set per race; the defaults are the only values. src/ai-driver/constants.ts reads them. Seconds, metres, radians; fractions are of top speed or half-width as named.\",\"type\":\"object\",\"properties\":{\"line\":{\"type\":\"object\",\"properties\":{\"lookAheadGain\":{\"type\":\"number\",\"description\":\"look-ahead L = clamp(speed × gain, min, max) metres (turbo-kart-rush)\",\"default\":0.9},\"lookAheadMin\":{\"type\":\"number\",\"default\":8},\"lookAheadMax\":{\"type\":\"number\",\"default\":30},\"turnNearSeconds\":{\"type\":\"number\",\"description\":\"heading change measured this far ahead in seconds of travel\",\"default\":1.2},\"turnFarSeconds\":{\"type\":\"number\",\"default\":2.4},\"insideGain\":{\"type\":\"number\",\"description\":\"inside-corner bias = clamp(−sign(turn) × |turnNear| × gain, ±insideBiasMax) × halfWidth\",\"default\":0.5},\"insideBiasMax\":{\"type\":\"number\",\"default\":0.4},\"lateralMaxFraction\":{\"type\":\"number\",\"description\":\"lateral target clamp as a fraction of halfWidth\",\"default\":0.6},\"laneHalfFraction\":{\"type\":\"number\",\"description\":\"personality l" +
"ateralBias spans ± this × halfWidth\",\"default\":0.45},\"edgeMargin\":{\"type\":\"number\",\"description\":\"metres kept from the road edge\",\"default\":1.4},\"aimClampMargin\":{\"type\":\"number\",\"default\":0.5},\"laneRate\":{\"type\":\"number\",\"description\":\"m/s the lateral target may move per second (smooths flickering nudges; fast enough to dodge)\",\"default\":10},\"narrowRoad\":{\"type\":\"number\",\"description\":\"halfWidth below this is narrow: centre line, no passing, no drifting, short look-ahead\",\"default\":5},\"narrowLookAhead\":{\"type\":\"number\",\"description\":\"look-ahead scale on a narrow road or near a branch entry/exit (floor lookAheadMin)\",\"default\":0.5},\"narrowMargin\":{\"type\":\"number\",\"description\":\"corner-speed margin multiplier on a narrow road, where a slide has nowhere to go\",\"default\":0.75},\"outsideFraction\":{\"type\":\"number\",\"description\":\"before a drift-worthy bend, set up on the outside at this × halfWidth so the drift has room\",\"default\":0.2},\"branchCommitMetres\":{\"type\":\"number\",\"description\":\"a taken shortcut stays the aim this far past its entry; the kart is only moved onto the branch once it has left " +
"the main road\",\"default\":40},\"edgeLift\":{\"type\":\"number\",\"description\":\"metres inside the outside road edge (negative: past it, onto the curb) at which a grip-driving AI pointing off the road lifts; a racing line touches the edge at every exit, so only past it (the drift has outsideSlack; grip needed its own: review, 23 Sept 2026, Frostbite's moguls)\",\"default\":-0.4},\"edgeShed\":{\"type\":\"number\",\"description\":\"m/s under its present speed an AI lifting at the outside edge aims for\",\"default\":3},\"airMargin\":{\"type\":\"number\",\"description\":\"share of the corner margin kept on a bend with bumps or a ramp ahead: airborne, a kart turns with only its air steer\",\"default\":0.7},\"trickBend\":{\"type\":\"number\",\"description\":\"rad (heading change over turnNearSeconds): over bumps on a bend sharper than this the AI does no tricks; each trick boost carries it faster into the next bump, where airborne it cannot turn (the Canyon dunes)\",\"default\":0.12},\"joinShare\":{\"type\":\"number\",\"description\":\"airborne on a shortcut, the heading step where its end meets the main road counts as a bend turned in this share of the metres left to the join (floor " +
"lookAheadMin), so the kart sheds speed before it lands at that angle (bug hunt 2, 24 Sept 2026, Canyon's mine exit). 0.25 and 0.5 measure the same (the brake is on either way); 1 lets more karts onto the sand\",\"default\":0.5},\"bendSeconds\":{\"type\":\"number\",\"description\":\"seconds of travel the AI scans ahead for how far the bend it is in keeps turning (LineInfo.bendAngle, bendMetres) and for the next bump or ramp (airMetres)\",\"default\":5},\"bendStep\":{\"type\":\"number\",\"description\":\"metres between the samples of that scan\",\"default\":8},\"bendBack\":{\"type\":\"number\",\"description\":\"rad the road may turn back before the scan calls the bend over (an S-bend)\",\"default\":0.15},\"shortcutSure\":{\"type\":\"number\",\"description\":\"skill at or above which an open wide shortcut is always taken (side paths help: gate 16 proves each at least as fast for Hard); below it, a roll of the racer aggression. Narrow ones stay a catch-up (shortcutRb)\",\"default\":0.9},\"declineFraction\":{\"type\":\"number\",\"description\":\"after declining a shortcut, keep at least this × halfWidth on the far side of the fork\",\"default\":0.35},\"wanderAmpMin\":{\"type\":\"number\"" +
",\"default\":0.08},\"wanderAmpMax\":{\"type\":\"number\",\"default\":0.2},\"wanderPeriodMin\":{\"type\":\"number\",\"default\":3.3},\"wanderPeriodMax\":{\"type\":\"number\",\"default\":8.3}}},\"steer\":{\"type\":\"object\",\"properties\":{\"kP\":{\"type\":\"number\",\"default\":2.2},\"kD\":{\"type\":\"number\",\"default\":0.15},\"dErrMax\":{\"type\":\"number\",\"description\":\"rad/s clamp on the derivative term\",\"default\":6},\"offroadGain\":{\"type\":\"number\",\"description\":\"steer gain multiplier while off the road surface\",\"default\":1.3},\"noiseSmoothing\":{\"type\":\"number\",\"description\":\"low-pass factor per tick on the seeded steering noise\",\"default\":0.05},\"kLat\":{\"type\":\"number\",\"description\":\"steer per metre of lateral error to the lane target; pure pursuit alone changes lanes too slowly to dodge\",\"default\":0.15},\"kLatMax\":{\"type\":\"number\",\"description\":\"clamp on the lateral term\",\"default\":0.6}}},\"avoid\":{\"type\":\"object\",\"properties\":{\"hazardLookAhead\":{\"type\":\"number\",\"description\":\"metres; a hazard is dodged from this far, or hazardSeconds of travel if that is further\",\"default\":25},\"hazardSeconds\":{\"type\":\"" +
"number\",\"description\":\"seconds of travel ahead a hazard that is not rolling is dodged from (24 Sept 2026: 25 m was 1 s at 150cc, too late to move a kart 3 m)\",\"default\":1.8},\"rollingLookAhead\":{\"type\":\"number\",\"description\":\"metres; a rolling hazard comes at you, so look further\",\"default\":45},\"hazardLateral\":{\"type\":\"number\",\"default\":2.2},\"dodgeClearance\":{\"type\":\"number\",\"default\":2.6},\"avoidLookAhead\":{\"type\":\"number\",\"description\":\"metres ahead another moving kart matters for passing and drafting\",\"default\":25},\"stoppedLookAhead\":{\"type\":\"number\",\"description\":\"metres ahead a slow, spinning or stopped kart is treated as a hazard\",\"default\":40},\"slowKartSpeed\":{\"type\":\"number\",\"description\":\"m/s; a kart slower than this ahead is an obstacle\",\"default\":4},\"stoppedClearance\":{\"type\":\"number\",\"description\":\"metres of lateral clearance kept from a stopped or spinning kart\",\"default\":3.0},\"crossRate\":{\"type\":\"number\",\"description\":\"m/s sideways: a pass never crosses the line of a slow kart it cannot get past at this rate before it reaches it, nor squeezes by with less than a kart's width (24 " +
"Sept 2026)\",\"default\":4},\"passDistance\":{\"type\":\"number\",\"default\":10},\"passClosing\":{\"type\":\"number\",\"description\":\"m/s closing speed that starts a pass\",\"default\":1},\"touchDistance\":{\"type\":\"number\",\"description\":\"metres behind a kart at which the AI pulls out instead of drafting into it\",\"default\":3.5},\"spawnBehind\":{\"type\":\"number\",\"description\":\"metres past the spawn spot of a rolling or falling hazard the berth is still kept\",\"default\":5},\"ringHop\":{\"type\":\"number\",\"description\":\"seconds of travel before a shock wave along the ground (the Rumblesaur footstep ring) reaches the kart that it hops to clear it\",\"default\":0.1},\"ringSkill\":{\"type\":\"number\",\"description\":\"the least skill that hops shock waves\",\"default\":0.5},\"seekDistance\":{\"type\":\"number\",\"default\":40},\"seekLateral\":{\"type\":\"number\",\"description\":\"max metres off the line a pad, balloon or coin pulls the kart\",\"default\":2.5},\"seekSlope\":{\"type\":\"number\",\"description\":\"metres across the road a balloon may be per metre ahead and still be picked (at least seekLateral): the kart can steer to it in time\",\"default\":0.12},\"" +
"rowGap\":{\"type\":\"number\",\"description\":\"metres along the road within which balloons count as one row\",\"default\":2},\"claimWidth\":{\"type\":\"number\",\"description\":\"metres: a kart ahead, between us and a balloon row, this close across the road to a balloon will pop it first\",\"default\":1.6},\"claimCost\":{\"type\":\"number\",\"description\":\"metres added to a claimed balloon's distance from the racer's pick, so it goes for another in the row\",\"default\":4},\"pickSpread\":{\"type\":\"number\",\"description\":\"seeded spread added to a racer's lateralBias for where across a balloon row it goes for, so the pack spreads over the row\",\"default\":0.7},\"padSkill\":{\"type\":\"number\",\"description\":\"min skill to aim for boost pads\",\"default\":0.3}}},\"drift\":{\"type\":\"object\",\"properties\":{\"maxHold\":{\"type\":\"number\",\"default\":4.5},\"cooldown\":{\"type\":\"number\",\"default\":0.6},\"abortCooldown\":{\"type\":\"number\",\"default\":1.6},\"hopCommit\":{\"type\":\"number\",\"description\":\"seconds after the hop the drift side is held no matter what\",\"default\":0.3},\"hopCommitStick\":{\"type\":\"number\",\"description\":\"stick toward the drift si" +
"de through the hop: enough to lock the drift and keep the full charge, not the full swing\",\"default\":0.5},\"chargeSecondsAhead\":{\"type\":\"number\",\"description\":\"with the next tier this many seconds of full charge away, hold a half stick through the exit and take the swing\",\"default\":0.3},\"startYawFraction\":{\"type\":\"number\",\"description\":\"hop only when the road under the nose already asks for this fraction of a half-stick drift yaw\",\"default\":0.4},\"exitYawFraction\":{\"type\":\"number\",\"description\":\"with a tier banked, let go once the road under the nose asks for less than this fraction of the minimum drift yaw\",\"default\":0.5},\"overRotate\":{\"type\":\"number\",\"description\":\"rad of heading swung past the aim point before a drift lets go. The drift yaw is tighter than most bends, so a drift is a swing in and a straighten out; reachableTier() plans the tier from this.\",\"default\":0.6},\"aligned\":{\"type\":\"number\",\"description\":\"rad; release when the error and turnNear are both this small\",\"default\":0.08},\"alignedTurn\":{\"type\":\"number\",\"default\":0.15},\"edgeMargin\":{\"type\":\"number\",\"description\":\"metres from the inside " +
"edge that releases\",\"default\":1.2},\"outsideSlack\":{\"type\":\"number\",\"description\":\"metres past the outside road edge (onto the curb, still road) a drift may slide before the AI lets go; past the curb is off-road\",\"default\":0.3},\"aimGain\":{\"type\":\"number\",\"description\":\"rad/s of drift yaw asked per rad of error between the road ahead and where the kart is going (its velocity, not its nose: a drift slides, and holding the nose on the road slid the kart 3 m/s outward into the walls)\",\"default\":2},\"easeMin\":{\"type\":\"number\",\"description\":\"rad/s; the least a drift is taken to turn its course back out with the stick out (on a bend gentler than the widest drift it cannot, and must not swing in fast)\",\"default\":0.05},\"swingStep\":{\"type\":\"number\",\"description\":\"seconds per step of swingIn(), the AI's forward run of a drift with the stick out\",\"default\":0.05},\"swingSeconds\":{\"type\":\"number\",\"description\":\"the longest that run looks ahead\",\"default\":3},\"wideLift\":{\"type\":\"number\",\"description\":\"rad; at full inward stick with the course running this far wide of the road the drift lifts (twice this: brakes), so a hairpin tak" +
"en too fast is held\",\"default\":0.05},\"easePlan\":{\"type\":\"number\",\"description\":\"rad/s; a bend whose yaw is less than this over the widest drift yaw cannot be held in a drift (the course swung in cannot be taken back in time): only a single sweep across the road is planned there\",\"default\":0.07},\"sweepRoom\":{\"type\":\"number\",\"description\":\"the width of that sweep, as a fraction of halfWidth\",\"default\":1.2},\"latCourseMax\":{\"type\":\"number\",\"description\":\"rad; the most course the drift's lane term asks\",\"default\":0.15},\"apexMargin\":{\"type\":\"number\",\"description\":\"metres inside the inside edge the drift aims its apex; while it has that room the stick stays at half or more (full charge)\",\"default\":2.2},\"wallMargin\":{\"type\":\"number\",\"description\":\"metres short of where the outside wall stops the kart (wall − kartRadius) that a drift lets go; on an open edge it is outsideSlack past the road\",\"default\":0.3},\"hopRoom\":{\"type\":\"number\",\"description\":\"a hop only with at least this many metres between the kart and the drift apex lane on the inside (halfWidth - apexMargin): the slide sweeps in and needs the room\",\"default\"" +
":1.5},\"hopAlign\":{\"type\":\"number\",\"description\":\"rad; no hop with the kart going (its course, the velocity) further than this off the road, in or out\",\"default\":0.12},\"hopMidBend\":{\"type\":\"number\",\"description\":\"rad the road under the nose turns over the hop and the loose lock (hopSeconds + driftYawLag) above which no hop starts: hop before a tight bend, not in it\",\"default\":0.2},\"snapRoom\":{\"type\":\"number\",\"description\":\"metres short of the inside release line (edgeMargin) inside which the stick is no longer pushed to a half for the charge\",\"default\":0.8},\"planTop\":{\"type\":\"number\",\"description\":\"a drift is planned at no more than this × the class top speed (coins included, not a boost): the boost runs out mid-drift\",\"default\":1.1},\"exitLead\":{\"type\":\"number\",\"description\":\"seconds of travel before the bend stops turning at which a drift at its planned tier (short of the top tier) lets go, so the boost goes onto the exit\",\"default\":0.5},\"hopLead\":{\"type\":\"number\",\"description\":\"seconds of travel before the bend gets tight (LineInfo.bendStart) the AI hops: the hop does not turn and the drift locks loose, tightenin" +
"g over driftYawLag\",\"default\":0.6},\"airLead\":{\"type\":\"number\",\"description\":\"seconds of travel before the foot of a bump or a ramp a drift lets go (the boost fires on the road); a drift is planned to end there\",\"default\":0.4},\"minTier\":{\"type\":\"integer\",\"description\":\"a drift starts only when the bend lets it reach this tier (or the racer's target tier, if lower). 24 Sept 2026 (Adam: MKW-level drift reward): a blue mini-turbo now pays about 0.3 s, so 1 (was 2: a tier-1 boost barely paid for the hop)\",\"default\":1},\"useBySkill\":{\"type\":\"number\",\"description\":\"a racer drifts a bend with chance max(driftUse, skill × useBySkill) (driftUse 0 never drifts): a sharp driver drifts every bend, as Mario Kart World's hard CPUs do, whatever its personality\",\"default\":1},\"chainSeconds\":{\"type\":\"number\",\"description\":\"after a top-tier release, drift again at once (no wide set-up) while the bend goes on at least this many seconds of travel: chaining mini-turbos through a long sweeper, as in Mario Kart\",\"default\":1.6},\"hazardMiss\":{\"type\":\"number\",\"description\":\"metres off its dodge lane a drift may be with a hazard that stays put in its l" +
"ane before it lets go\",\"default\":0.8},\"hazardSeconds\":{\"type\":\"number\",\"description\":\"no drift starts, and a drift lets go, with a hazard that stays put this many seconds of travel ahead within its clearance of the drift's lane: the slide cannot dodge\",\"default\":2.2},\"tierBySkill\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"skill below [0] → tier 1, below [1] → tier 2, else 3\",\"default\":[0.5,0.8]}}},\"recover\":{\"type\":\"object\",\"properties\":{\"stuckSeconds\":{\"type\":\"number\",\"description\":\"the AI's own stuck timer; the race-manager 6 s respawn is the backstop\",\"default\":1.5},\"reverseSeconds\":{\"type\":\"number\",\"default\":0.8},\"cooldownSeconds\":{\"type\":\"number\",\"default\":2.5}}},\"rubber\":{\"type\":\"object\",\"properties\":{\"min\":{\"type\":\"number\",\"default\":0.6},\"max\":{\"type\":\"number\",\"default\":1.4},\"deadZone\":{\"type\":\"number\",\"description\":\"metres of gap with no effect\",\"default\":20},\"scale\":{\"type\":\"number\",\"description\":\"metres; tanh scale beyond the dead zone. 60: a leader 100 m up the road is at rb 0.67 and has lost ~21 % power, so a player closes 100 m in ~25 s (test" +
" drive, 2026-09-21)\",\"default\":60},\"powerFrom\":{\"type\":\"number\",\"description\":\"rb below this cuts power (top-speed cap); above it only skill moves\",\"default\":0.85},\"skillGain\":{\"type\":\"number\",\"description\":\"skill += (rb − 1) × gain\",\"default\":1.25},\"shortcutRb\":{\"type\":\"number\",\"description\":\"rubber band at or above which a narrow shortcut is taken as a catch-up\",\"default\":1.15},\"fieldPaceSpread\":{\"type\":\"number\",\"description\":\"seeded per-race pace governor spread across the AI field, fraction of legal top speed\",\"default\":0.065}}},\"items\":{\"type\":\"object\",\"properties\":{\"forwardRange\":{\"type\":\"number\",\"default\":45},\"forwardCone\":{\"type\":\"number\",\"description\":\"rad\",\"default\":0.2},\"homingRange\":{\"type\":\"number\",\"default\":90},\"rearRange\":{\"type\":\"number\",\"default\":15},\"defenceRadius\":{\"type\":\"number\",\"default\":6},\"holdMax\":{\"type\":\"number\",\"default\":8},\"holdMin\":{\"type\":\"number\",\"default\":5,\"description\":\"seconds an AI keeps a new item before an attack, a boost, a ride or the fog: only a threat, a tailgater, a close kart or the grass uses it sooner (24 Sept 2026:" +
" used at once, the slot sat empty 80% of the race; Mario Kart World racers carry an item most of the time)\"},\"speedItemGap\":{\"type\":\"number\",\"default\":80},\"straightTurn\":{\"type\":\"number\",\"description\":\"rad; |turnFar| below this is a straight\",\"default\":0.15},\"anchorMin\":{\"type\":\"number\",\"description\":\"Grapple Anchor: hook a kart ahead no closer than this (m), not worth it nearer\",\"default\":10},\"anchorMax\":{\"type\":\"number\",\"description\":\"Grapple Anchor: and no farther than this (m, under the item's 50 m reach)\",\"default\":45},\"anchorAlign\":{\"type\":\"number\",\"description\":\"Grapple Anchor: only fired with the nose within this many rad of the road ahead and the nearest kart ahead within this bearing\",\"default\":0.35},\"runnerRange\":{\"type\":\"number\",\"description\":\"Wind-Up Mouse: send it when a kart is ahead within this (m)\",\"default\":60},\"springRange\":{\"type\":\"number\",\"description\":\"Pogo Spring: boing when a kart ahead is this close (m), and slam when one is inside this under you\",\"default\":7},\"equaliserMinRank\":{\"type\":\"integer\",\"description\":\"The Fog Bank only works from this place back (item.schema " +
"minPosition); the AI waits until then\",\"default\":5}}},\"autopilot\":{\"type\":\"object\",\"description\":\"a finished kart keeps rolling out of the way\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.5},\"power\":{\"type\":\"number\",\"default\":0.6}}},\"profiles\":{\"type\":\"object\",\"description\":\"Difficulty comes from the speed class: 50 easy, 100 normal, 150 hard (ai-driver Decisions 2026-09-21).\",\"properties\":{\"easy\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.35},\"power\":{\"type\":\"number\",\"default\":0.94},\"noise\":{\"type\":\"number\",\"default\":0.09},\"reactionMin\":{\"type\":\"number\",\"default\":0.8},\"reactionMax\":{\"type\":\"number\",\"default\":1.6},\"driftThreshold\":{\"type\":\"number\",\"default\":0.45},\"brakeAbove\":{\"type\":\"number\",\"default\":1.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":1.6},\"shortcutSkill\":{\"type\":\"number\",\"default\":1.1},\"trickChance\":{\"type\":\"number\",\"default\":0.2}}},\"normal\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skil" +
"l\":{\"type\":\"number\",\"default\":0.65},\"power\":{\"type\":\"number\",\"default\":0.98},\"noise\":{\"type\":\"number\",\"default\":0.045},\"reactionMin\":{\"type\":\"number\",\"default\":0.4},\"reactionMax\":{\"type\":\"number\",\"default\":0.9},\"driftThreshold\":{\"type\":\"number\",\"default\":0.35},\"brakeAbove\":{\"type\":\"number\",\"default\":2.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":0.8},\"shortcutSkill\":{\"type\":\"number\",\"default\":0.6},\"trickChance\":{\"type\":\"number\",\"default\":0.5}}},\"hard\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.95},\"power\":{\"type\":\"number\",\"default\":1.0},\"noise\":{\"type\":\"number\",\"default\":0.015},\"reactionMin\":{\"type\":\"number\",\"default\":0.15},\"reactionMax\":{\"type\":\"number\",\"default\":0.4},\"driftThreshold\":{\"type\":\"number\",\"default\":0.3},\"brakeAbove\":{\"type\":\"number\",\"default\":3.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":0.25},\"shortcutSkill\":{\"type\":\"number\",\"default\":" +
"0.3},\"trickChance\":{\"type\":\"number\",\"default\":0.95}}}}}}}}"),
	$defs: {
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
				"trickChance"
			],
			description: "skill 0..1 drives line, drift tier and reactions; power ≤ 1 is the top-speed cap as a fraction of the player-legal speed; noise is steer noise amplitude; brakeAbove is m/s over the corner speed before the brake comes on; reaction is seconds before an item is used; startPress is seconds before go the throttle goes down, mean ± spread."
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
}, T = Object.freeze({
	light: {
		speed: -.01,
		accel: .12,
		handling: .12,
		weight: -.15,
		hook: "none"
	},
	medium: {
		speed: 0,
		accel: 0,
		handling: 0,
		weight: 0,
		hook: "none"
	},
	heavy: {
		speed: .01,
		accel: -.12,
		handling: -.1,
		weight: .18,
		hook: "hardBump"
	}
});
function E(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = E(r.properties));
	return t;
}
var D = Object.freeze(E(w.properties.base.properties));
function O(e, t) {
	let n = T[e], r = D.speedClasses[String(t)];
	return Object.freeze({
		...structuredClone(D),
		archetype: e,
		cc: t,
		stats: n,
		baseTopSpeed: D.topSpeed,
		topSpeed: D.topSpeed * r * (1 + n.speed),
		accel: D.accel * (1 + n.accel),
		steerRate: D.steerRate * (1 + n.handling),
		mass: 1 + n.weight
	});
}
function ee(e, t) {
	switch (t) {
		case "dirt": return e.gripOffroad;
		case "mud": return e.gripMud;
		case "ice": return e.gripIce;
		default: return e.gripRoad;
	}
}
//#endregion
//#region src/kart-controller/boost.ts
var k = Object.freeze({
	none: 0,
	start: 1,
	slipstream: 1,
	drift: 2,
	pad: 3,
	item: 4,
	trick: 5
});
function te(e) {
	return e.boost.source !== "none" && e.boost.remaining > 0;
}
function ne(e, t, n, r) {
	let i = e.boostQueue;
	i.source !== "none" && i.remaining > 0 && (i.multiplier > n || i.multiplier === n && i.remaining >= r) || (i.source = t, i.multiplier = n, i.remaining = r);
}
function A(e, t, n, r, i) {
	e.boost.source = t, e.boost.multiplier = n, e.boost.remaining = r, i.push({
		type: "boostStart",
		source: t,
		multiplier: n,
		seconds: r
	});
}
function j(e, t, n, r, i) {
	if (t === "none" || r <= 0) return !1;
	if (n = Math.min(n, D.maxBoostMultiplier), !te(e)) return A(e, t, n, r, i), !0;
	let a = e.boost;
	if (t === a.source) return r <= a.remaining && n <= a.multiplier ? !1 : (A(e, t, Math.max(n, a.multiplier), Math.max(r, a.remaining), i), !0);
	let o = k[t], s = k[a.source];
	return o < s || n < a.multiplier || o === s && r <= a.remaining ? (ne(e, t, n, r), !1) : (ne(e, a.source, a.multiplier, a.remaining), A(e, t, n, r, i), !0);
}
function re(e) {
	e.boost.source = "none", e.boost.multiplier = 1, e.boost.remaining = 0, e.boostQueue.source = "none", e.boostQueue.multiplier = 1, e.boostQueue.remaining = 0;
}
function ie(e, t) {
	let n = e.boostQueue;
	if (n.remaining > 0) {
		let e = n.remaining - t;
		e > 1e-9 ? n.remaining = e : (n.source = "none", n.multiplier = 1, n.remaining = 0);
	}
	if (e.boost.remaining <= 0) return;
	let r = e.boost.remaining - t;
	e.boost.remaining = r > 1e-9 ? r : 0, !(e.boost.remaining > 0) && (n.source !== "none" && n.remaining > 0 ? (e.boost.source = n.source, e.boost.multiplier = n.multiplier, e.boost.remaining = n.remaining, n.source = "none", n.multiplier = 1, n.remaining = 0) : re(e));
}
//#endregion
//#region src/sim-math/dmath.ts
function ae(e, t) {
	let n = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	return n.setUint32(0, e >>> 0), n.setUint32(4, t >>> 0), n.getFloat64(0);
}
var M = /* @__PURE__ */ new Float64Array(2046);
M[1022] = 1;
for (let e = 1; e <= 1023; e++) M[1022 + e] = M[1021 + e] * 2;
for (let e = 1; e <= 1022; e++) M[1022 - e] = M[1023 - e] * .5;
function oe(e, t) {
	return t > 1023 ? e * M[2045] * M[1022 + t - 1023] : t < -1022 ? e * M[1022 + t + 1e3] * M[22] : e * M[1022 + t];
}
function se(e) {
	let t = 134217729 * e;
	return t - (t - e);
}
var ce = 7.450580596923828e-9, le = (e) => e < 0 || e === 0 && 1 / e < 0, ue = -.16666666666666632, de = .00833333333332249, fe = -.0001984126982985795, pe = 27557313707070068e-22, me = -2.5050760253406863e-8, he = 158969099521155e-24, ge = .0416666666666666, _e = -.001388888888887411, ve = 2480158728947673e-20, ye = -2.7557314351390663e-7, be = 2.087572321298175e-9, xe = -11359647557788195e-27;
function Se(e, t, n) {
	let r = e * e, i = r * r, a = de + r * (fe + r * pe) + r * i * (me + r * he), o = r * e;
	return n === 0 ? e + o * (ue + r * a) : e - (r * (.5 * t - o * a) - t - o * ue);
}
function Ce(e, t) {
	let n = e * e, r = n * n, i = n * (ge + n * (_e + n * ve)) + r * r * (ye + n * (be + n * xe)), a = .5 * n, o = 1 - a;
	return o + (1 - o - a + (n * i - e * t));
}
var we = .3333333333333341, Te = .13333333333320124, Ee = .05396825397622605, De = .021869488294859542, Oe = .0088632398235993, ke = .0035920791075913124, Ae = .0014562094543252903, je = .0005880412408202641, Me = .0002464631348184699, Ne = 7817944429395571e-20, Pe = 7140724913826082e-20, Fe = -18558637485527546e-21, Ie = 2590730518636337e-20, Le = .7853981633974483, Re = 3061616997868383e-32, ze = ae(1072010280, 0);
function Be(e, t, n) {
	let r = e < 0, i = Math.abs(e) >= ze;
	i && (r && (e = -e, t = -t), e = Le - e + (Re - t), t = 0);
	let a = e * e, o = a * a, s = Te + o * (De + o * (ke + o * (je + o * (Ne + o * Fe)))), c = a * (Ee + o * (Oe + o * (Ae + o * (Me + o * (Pe + o * Ie))))), l = a * e;
	if (s = t + a * (l * (s + c) + t), s += we * l, o = e + s, i) return c = n, (r ? -1 : 1) * (c - 2 * (e - (o * o / (o + c) - s)));
	if (n === 1) return o;
	let u = se(o);
	c = s - (u - e);
	let d = -1 / o, f = se(d);
	return f + d * (1 + f * u + f * c);
}
var Ve = 3.141592653589793, He = .6366197723675814, Ue = 1.5707963267341256, We = 6077100506506192e-26, Ge = 6077100506303966e-26, Ke = 20222662487959506e-37, qe = 20222662487111665e-37, Je = 84784276603689e-45, Ye = ae(1072243195, 4294967295), N = 0, P = 0, Xe = 1647099.3291652855, Ze = 2 * Ve;
function Qe(e) {
	Math.abs(e) > Xe && (e %= Ze);
	let t = Math.round(e * He), n = e - t * Ue, r = t * We, i = n;
	r = t * Ge, n = i - r, r = t * Ke - (i - n - r), i = n, r = t * qe, n = i - r, r = t * Je - (i - n - r), N = n - r, P = n - N - r;
	let a = t % 4;
	return a < 0 ? a + 4 : a;
}
function F(e) {
	if (Math.abs(e) <= Ye) return Math.abs(e) < ce ? e : Se(e, 0, 0);
	if (!(Math.abs(e) < Infinity)) return NaN;
	switch (Qe(e)) {
		case 0: return Se(N, P, 1);
		case 1: return Ce(N, P);
		case 2: return -Se(N, P, 1);
		default: return -Ce(N, P);
	}
}
function $e(e) {
	if (Math.abs(e) <= Ye) return Ce(e, 0);
	if (!(Math.abs(e) < Infinity)) return NaN;
	switch (Qe(e)) {
		case 0: return Ce(N, P);
		case 1: return -Se(N, P, 1);
		case 2: return -Ce(N, P);
		default: return Se(N, P, 1);
	}
}
function et(e) {
	if (Math.abs(e) <= Ye) return Math.abs(e) < ce ? e : Be(e, 0, 1);
	if (!(Math.abs(e) < Infinity)) return NaN;
	let t = Qe(e);
	return Be(N, P, t & 1 ? -1 : 1);
}
var tt = [
	.4636476090008061,
	.7853981633974483,
	.982793723247329,
	1.5707963267948966
], nt = [
	22698777452961687e-33,
	3061616997868383e-32,
	13903311031230998e-33,
	6123233995736766e-32
], rt = .3333333333333293, it = -.19999999999876483, at = .14285714272503466, ot = -.11111110405462356, st = .09090887133436507, ct = -.0769187620504483, lt = .06661073137387531, ut = -.058335701337905735, dt = .049768779946159324, ft = -.036531572744216916, pt = .016285820115365782, mt = 0x40000000000000000;
function ht(e) {
	let t = Math.abs(e), n = e < 0;
	if (t >= mt) return t === t ? e > 0 ? tt[3] + nt[3] : -tt[3] - nt[3] : e;
	let r;
	if (t < .4375) {
		if (t < ce) return e;
		r = -1;
	} else e = t, t < 1.1875 ? t < .6875 ? (r = 0, e = (2 * e - 1) / (2 + e)) : (r = 1, e = (e - 1) / (e + 1)) : t < 2.4375 ? (r = 2, e = (e - 1.5) / (1 + 1.5 * e)) : (r = 3, e = -1 / e);
	let i = e * e, a = i * i, o = i * (rt + a * (at + a * (st + a * (lt + a * (dt + a * pt))))), s = a * (it + a * (ot + a * (ct + a * (ut + a * ft))));
	if (r < 0) return e - e * (o + s);
	let c = tt[r] - (e * (o + s) - nt[r] - e);
	return n ? -c : c;
}
var gt = 3.141592653589793, _t = 12246467991473532e-32, vt = 1.5707963267948966, yt = .7853981633974483, bt = 0x1000000000000000, xt = 8673617379884035e-34;
function St(e, t) {
	if (t !== t || e !== e) return NaN;
	if (t === 1) return ht(e);
	let n = +!!le(e) | (le(t) ? 2 : 0);
	if (e === 0) return n < 2 ? e : n === 2 ? gt : -3.141592653589793;
	if (t === 0) return n & 1 ? -1.5707963267948966 : vt;
	if (t === Infinity || t === -Infinity) return e === Infinity || e === -Infinity ? [
		yt,
		-.7853981633974483,
		3 * yt,
		-3 * yt
	][n] : [
		0,
		-0,
		gt,
		-3.141592653589793
	][n];
	if (e === Infinity || e === -Infinity) return n & 1 ? -1.5707963267948966 : vt;
	let r = Math.abs(e / t), i, a = n;
	switch (r > bt ? (i = 1.5707963267948966, a &= 1) : i = n & 2 && r < xt ? 0 : ht(r), a) {
		case 0: return i;
		case 1: return -i;
		case 2: return gt - (i - _t);
		default: return i - _t - gt;
	}
}
var Ct = 1.5707963267948966, wt = 6123233995736766e-32, Tt = .7853981633974483, Et = .16666666666666666, Dt = -.3255658186224009, Ot = .20121253213486293, kt = -.04005553450067941, At = .0007915349942898145, jt = 3479331075960212e-20, Mt = -2.403394911734414, Nt = 2.0209457602335057, Pt = -.6882839716054533, Ft = .07703815055590194, It = ae(1072640819, 0), Lt = 1.4901161193847656e-8, Rt = 6938893903907228e-33, zt = (e) => e * (Et + e * (Dt + e * (Ot + e * (kt + e * (At + e * jt))))), Bt = (e) => 1 + e * (Mt + e * (Nt + e * (Pt + e * Ft)));
function Vt(e) {
	let t = Math.abs(e);
	if (t >= 1) return t === 1 ? e * Ct + e * wt : NaN;
	if (t < .5) {
		if (t < Lt) return e;
		let n = e * e;
		return e + e * (zt(n) / Bt(n));
	}
	let n = (1 - t) * .5, r = zt(n), i = Bt(n), a = Math.sqrt(n), o;
	if (t >= It) o = Ct - (2 * (a + r / i * a) - wt);
	else {
		let e = se(a), t = (n - e * e) / (a + e);
		o = Tt - (2 * a * (r / i) - (wt - 2 * t) - (Tt - 2 * e));
	}
	return e > 0 ? o : -o;
}
function Ht(e) {
	let t = Math.abs(e);
	if (t >= 1) return t === 1 ? e > 0 ? 0 : 3.141592653589793 : NaN;
	if (t < .5) {
		if (t <= Rt) return 1.5707963267948966;
		let n = e * e;
		return Ct - (e - (wt - e * (zt(n) / Bt(n))));
	}
	if (e < 0) {
		let t = (1 + e) * .5, n = Math.sqrt(t);
		return gt - 2 * (n + (zt(t) / Bt(t) * n - wt));
	}
	let n = (1 - e) * .5, r = Math.sqrt(n), i = se(r), a = (n - i * i) / (r + i);
	return 2 * (i + (zt(n) / Bt(n) * r + a));
}
var Ut = 709.782712893384, Wt = -745.1332191019411, Gt = .6931471803691238, Kt = 19082149292705877e-26, qt = 1.4426950408889634, Jt = .16666666666666602, Yt = -.0027777777777015593, Xt = 6613756321437934e-20, Zt = -16533902205465252e-22, Qt = 4.1381367970572385e-8, $t = ae(1071001155, 0), en = ae(1072734898, 0), tn = 3.725290298461914e-9;
function nn(e) {
	if (e !== e) return e;
	if (e > Ut) return Infinity;
	if (e < Wt) return 0;
	let t = Math.abs(e), n = 0, r = 0, i = 0;
	if (t >= $t) t < en ? e > 0 ? (n = e - Gt, r = Kt, i = 1) : (n = e + Gt, r = -19082149292705877e-26, i = -1) : (i = Math.trunc(qt * e + (e < 0 ? -.5 : .5)), n = e - i * Gt, r = i * Kt), e = n - r;
	else if (t < tn) return 1 + e;
	let a = e * e, o = e - a * (Jt + a * (Yt + a * (Xt + a * (Zt + a * Qt))));
	return i === 0 ? 1 - (e * o / (o - 2) - e) : oe(1 - (r - e * o / (2 - o) - n), i);
}
var rn = -.03333333333333313, an = .0015873015872548146, on = -793650757867488e-19, sn = 4008217827329362e-21, cn = -2.0109921818362437e-7, ln = ae(1078159482, 0), un = 5551115123125783e-32;
function dn(e) {
	if (e !== e) return e;
	let t = Math.abs(e);
	if (t >= ln) {
		if (e > Ut) return Infinity;
		if (e < 0) return -1;
	}
	let n, r, i, a = 0;
	if (t >= $t) t < en ? e > 0 ? (n = e - Gt, r = Kt, i = 1) : (n = e + Gt, r = -19082149292705877e-26, i = -1) : (i = Math.trunc(qt * e + (e < 0 ? -.5 : .5)), n = e - i * Gt, r = i * Kt), e = n - r, a = n - e - r;
	else if (t < un) return e;
	else i = 0;
	let o = .5 * e, s = e * o, c = 1 + s * (rn + s * (an + s * (on + s * (sn + s * cn)))), l = 3 - c * o, u = s * ((c - l) / (6 - e * l));
	if (i === 0) return e - (e * u - s);
	if (u = e * (u - a) - a, u -= s, i === -1) return .5 * (e - u) - .5;
	if (i === 1) return e < -.25 ? -2 * (u - (e + .5)) : 1 + 2 * (e - u);
	let d;
	return i <= -2 || i > 56 ? (d = 1 - (u - e), oe(d, i) - 1) : (i < 20 ? (l = 1 - M[1022 - i], d = l - (u - e)) : (l = M[1022 - i], d = e - (u + l), d += 1), oe(d, i));
}
var fn = 27755575615628914e-33;
function pn(e) {
	if (e !== e) return e;
	let t = Math.abs(e), n;
	if (t < 22) {
		if (t < fn) return e;
		if (t >= 1) n = 1 - 2 / (dn(2 * t) + 2);
		else {
			let e = dn(-2 * t);
			n = -e / (e + 2);
		}
	} else n = 1;
	return e < 0 ? -n : n;
}
function I(e, t) {
	return Math.sqrt(e * e + t * t);
}
function L(e, t, n) {
	return Math.sqrt(e * e + t * t + n * n);
}
//#endregion
//#region src/kart-controller/types.ts
var mn = Object.freeze({
	steer: 0,
	throttle: 0,
	brake: 0,
	drift: !1,
	item: !1,
	lookBack: !1,
	horn: !1
});
function hn(e) {
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
			seconds: 0
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
function R(e) {
	return [
		F(e),
		0,
		$e(e)
	];
}
function gn(e) {
	return [
		$e(e),
		0,
		-F(e)
	];
}
function z(e) {
	return St(e[0], e[2]);
}
//#endregion
//#region src/kart-controller/powers.ts
function B(e) {
	return e.status.rideRemaining > 0;
}
function _n(e) {
	return e.status.towRemaining > 0 && e.status.towTarget >= 0;
}
function vn(e, t) {
	return B(e) ? t.rideRadius : t.kartRadius;
}
function yn(e, t, n, r) {
	let i = e.t + n.rideLookahead / t.length;
	i -= Math.floor(i);
	let a = t.sample(i, 0, e.branch).position;
	return r[0] = a[0], r[1] = a[1], r[2] = a[2], r;
}
function bn(e, t, n, r, i) {
	if ((t.t - e.t - Math.floor(t.t - e.t)) * n.length > r.towFollowRoad) return yn(e, n, r, i);
	let a = gn(t.heading), o = (e.position[0] - t.position[0]) * a[0] + (e.position[2] - t.position[2]) * a[2] >= 0 ? 1 : -1;
	return i[0] = t.position[0] + a[0] * o * r.towSideOffset, i[1] = t.position[1], i[2] = t.position[2] + a[2] * o * r.towSideOffset, i;
}
function xn(e, t, n, r, i) {
	let a = t[0] - e.position[0], o = t[2] - e.position[2];
	if (a * a + o * o > 1e-6) {
		let t = St(a, o) - e.heading;
		for (; t > Math.PI;) t -= 2 * Math.PI;
		for (; t < -Math.PI;) t += 2 * Math.PI;
		let n = r.pilotTurnRate * i;
		e.heading += Math.max(-n, Math.min(n, t));
	}
	e.lateralVelocity *= Math.max(0, 1 - 12 * i), e.speed = e.speed < n ? Math.min(n, e.speed + r.accel * r.pilotAccel * i) : Math.max(n, e.speed - r.overSpeedDecel * i);
}
//#endregion
//#region src/kart-controller/collide.ts
function Sn(e, t) {
	return t.mass + (te(e) ? t.dashMassBonus : 0) + (e.status.shield ? t.shieldMassBonus : 0) + (B(e) ? t.rideMassBonus : 0);
}
function Cn(e) {
	let t = R(e.heading), n = gn(e.heading);
	return [
		t[0] * e.speed + n[0] * e.lateralVelocity,
		0,
		t[2] * e.speed + n[2] * e.lateralVelocity
	];
}
function wn(e, t) {
	let n = R(e.heading), r = gn(e.heading);
	e.speed = t[0] * n[0] + t[2] * n[2], e.lateralVelocity = t[0] * r[0] + t[2] * r[2];
}
function Tn(e, t, n, r, i, a, o, s = 0) {
	let c = r - vn(e, i);
	if (Math.abs(t) <= c) {
		e.status.wallEasing = !1;
		return;
	}
	let l = Math.sign(t);
	if (s & (l < 0 ? 1 : 2)) return;
	let u = Math.abs(t) - c;
	u > i.wallEndOvershoot && (e.status.wallEasing = !0);
	let d = e.status.wallEasing ? Math.min(u, i.wallEndPushRate * a) : u;
	d >= u && (e.status.wallEasing = !1), e.position[0] -= n[0] * d * l, e.position[2] -= n[2] * d * l, En(e, [
		n[0] * l,
		0,
		n[2] * l
	], i, a, o);
}
function En(e, t, n, r, i) {
	let a = Cn(e), o = a[0] * t[0] + a[2] * t[2];
	if (o <= 0) return;
	let s = I(a[0], a[2]);
	a[0] -= t[0] * o * (1 + n.wallRestitution), a[2] -= t[2] * o * (1 + n.wallRestitution);
	let c = s > 0 ? o / s : 0, l = e.wallCooldown <= 0;
	if (l && c > n.hardWallFraction) {
		let e = 1 - n.wallScrub * (c - n.hardWallFraction) / (1 - n.hardWallFraction);
		a[0] *= e, a[2] *= e;
	}
	let u = R(e.heading), d = a[0] * u[0] + a[2] * u[2];
	if (l && c > n.hardWallFraction && d > 0) {
		let t = St(a[0], a[2]) - e.heading;
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
			], o = I(a[0], a[2]);
			if (o > 1e-6) {
				let t = St(a[0] / o, a[2] / o) - e.heading;
				for (; t > Math.PI;) t -= 2 * Math.PI;
				for (; t < -Math.PI;) t += 2 * Math.PI;
				e.heading += Math.sign(t) * Math.min(Math.abs(t) * n.wallDeflect, n.wallDeflectRate * r);
			}
		}
	}
	wn(e, a), l && (i.push({ type: "wall" }), e.wallCooldown = n.wallCooldownSeconds);
}
function Dn(e, t, n) {
	return Math.abs(e.position[1] - t.position[1]) < n.contactHeight;
}
function On(e) {
	return e.isGhost || e.status.intangibleRemaining > 0;
}
function kn(e, t, n, r, i, a, o, s) {
	if (On(e) || On(t) || !Dn(e, t, i)) return !1;
	let c = t.position[0] - e.position[0], l = t.position[2] - e.position[2], u = I(c, l), d = vn(e, n) + vn(t, r);
	if (u >= d || u === 0) return !1;
	let f = c / u, p = l / u, m = Sn(e, n), h = Sn(t, r), g = m + h, _ = Cn(e), v = Cn(t), y = (_[0] - v[0]) * f + (_[2] - v[2]) * p;
	y > 0 && (_[0] -= f * y * (h / g), _[2] -= p * y * (h / g), v[0] += f * y * (m / g), v[2] += p * y * (m / g));
	let b = Math.min(d - u, Math.max(i.bumpSeparateRate, y) * a);
	e.position[0] -= f * b * (h / g), e.position[2] -= p * b * (h / g), t.position[0] += f * b * (m / g), t.position[2] += p * b * (m / g);
	let x = e.bumpCooldown <= 0 && t.bumpCooldown <= 0;
	if (x) {
		let e = i.bumpForce * (h / g), t = i.bumpForce * (m / g);
		_[0] -= f * e, _[2] -= p * e, v[0] += f * t, v[2] += p * t;
	}
	return (y > 0 || x) && (wn(e, _), wn(t, v)), !x || (e.bumpCooldown = i.bumpCooldownSeconds, t.bumpCooldown = i.bumpCooldownSeconds, o.push({
		type: "bump",
		otherId: t.racerId
	}), s.push({
		type: "bump",
		otherId: e.racerId
	}), !0);
}
//#endregion
//#region src/kart-controller/steer.ts
function An(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function jn(e, t, n) {
	return e + (t - e) * n;
}
function Mn(e, t) {
	return (1 + An(e * t, -1, 1)) / 2;
}
function Nn(e) {
	return An(2 * e - 1, -1, 1);
}
function Pn(e, t, n) {
	return t <= 0 ? 1 : (1 - n.steerFalloff * Math.min(1, Math.abs(e) / t)) / (1 - n.steerFalloff);
}
function Fn(e, t, n, r) {
	if (e.drift.phase === "drifting") {
		let t = jn(n.driftSteerMin, n.driftSteerMax, e.drift.yawK);
		return e.drift.direction * n.steerRate * t * Pn(e.speed, r, n);
	}
	let i = Math.abs(e.speed);
	if (i <= 0 || r <= 0) return 0;
	let a = Math.min(1, i / (n.steerLowSpeed * r)) * (1 - n.steerFalloff * Math.min(1, i / r)), o = e.grounded ? 1 : n.airSteer, s = t.steer * n.steerRate * a * o;
	return e.speed < 0 ? -s : s;
}
function In(e, t) {
	if (t === 0) return;
	let n = $e(t), r = F(t), i = e.speed, a = e.lateralVelocity;
	e.heading += t, e.speed = i * n + a * r, e.lateralVelocity = a * n - i * r;
}
function Ln(e, t, n) {
	e.lateralVelocity -= e.lateralVelocity * Math.min(1, t * n);
}
function Rn(e, t, n, r, i, a) {
	if (e.drift.phase === "drifting") {
		let r = 1 - nn(-a / n.driftYawLag);
		e.drift.yawK += (Mn(t.steer, e.drift.direction) - e.drift.yawK) * r;
	}
	let o = Fn(e, t, n, r) * a;
	return In(e, o), Ln(e, i, a), o;
}
//#endregion
//#region src/kart-controller/drift.ts
function zn(e, t, n = Infinity) {
	let r = 0;
	for (let n of t) e >= n && r++;
	return Math.min(r, n);
}
function V(e) {
	e.drift.active = !1, e.drift.phase = "idle", e.drift.direction = 0, e.drift.charge = 0, e.drift.tier = 0, e.drift.hopSeconds = 0;
}
function Bn(e, t, n) {
	let r = e.drift;
	r.phase = "drifting", r.active = !0, r.direction = t, r.charge = 0, r.tier = 0, r.yawK = 0, n.push({
		type: "driftStart",
		direction: t
	});
}
function Vn(e, t, n) {
	let r = e.drift.tier;
	n.push({
		type: "driftEnd",
		tier: r
	}), r > 0 && j(e, "drift", t.boostMultiplier, t.boostSeconds[r - 1], n), V(e);
}
function Hn(e, t, n, r, i, a, o = {}) {
	let s = t.drift && !e.prevDrift;
	e.prevDrift = t.drift;
	let c = e.drift;
	switch (s && !e.grounded && e.airborne.fromJumpId !== void 0 && !e.airborne.trickQueued ? (e.airborne.trickQueued = !0, a.push({ type: "trick" })) : s && (e.trickBuffer = n.trickBufferSeconds), c.phase) {
		case "idle":
			s && e.grounded && e.speed >= n.driftMinSpeed * r ? (c.phase = "hopping", c.hopSeconds = 0, e.verticalVelocity = n.hopVelocity, e.grounded = !1, a.push({ type: "hop" })) : !s && t.drift && e.grounded && Math.abs(t.steer) >= n.driftLateSteer && e.speed >= n.driftMinSpeed * r && Bn(e, Math.sign(t.steer), a);
			return;
		case "hopping":
			if (c.hopSeconds += i, !e.grounded) {
				c.hopSeconds > n.hopSeconds * n.hopLandWindow && V(e);
				return;
			}
			t.drift && t.steer !== 0 && e.speed >= n.driftMinSpeed * r ? Bn(e, Math.sign(t.steer), a) : V(e);
			return;
		case "drifting": {
			if (e.speed < n.driftKeepSpeed * r) {
				V(e);
				return;
			}
			if (!e.grounded && e.airborne.seconds > n.driftAirCancelSeconds) {
				V(e);
				return;
			}
			if (!t.drift) {
				Vn(e, n, a);
				return;
			}
			let s = Mn(t.steer, c.direction) >= .5 ? n.chargeFull : n.chargeNeutral, l = c.chargeMultiplierRemaining > 0 ? c.chargeMultiplier : 1;
			c.charge += s * i * 60 * l;
			let u = zn(c.charge, n.driftTiers, o.maxDriftTier ?? n.driftTiers.length);
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
var Un = Math.PI * 2;
function Wn(e) {
	return e.status.loopIndex >= 0;
}
function Gn(e) {
	return e.approach + Un * e.radius + e.exit;
}
var Kn = (e) => {
	let t = Math.max(0, Math.min(1, e));
	return t * t * (3 - 2 * t);
};
function qn(e, t, n) {
	let r = -e.shift / 2 + Math.max(-1, Math.min(1, t / n)) * e.spread;
	return [r, r + e.shift];
}
function Jn(e, t) {
	let n = e.sample(t.t, 0, 0), r = I(n.tangent[0], n.tangent[2]) || 1, i = n.tangent[0] / r, a = n.tangent[2] / r;
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
function Yn(e, t, n) {
	let r = e.sample(t, n, 0);
	return {
		position: [
			r.position[0],
			r.position[1] + ir(e, t, 0, n, r.halfWidth),
			r.position[2]
		],
		tangent: r.tangent
	};
}
function Xn(e, t, n, r, i = 0) {
	let a = e.length, o = Jn(e, t), [s, c] = qn(t, n, o.halfWidth), l = Un * t.radius;
	if (r < t.approach) {
		let o = t.t + (r - t.approach) / a, c = Math.max(1e-6, t.approach - i), l = Math.max(0, Math.min(1, (r - i) / c)), u = n + (s - n) * Kn(l), d = (s - n) * 6 * l * (1 - l) / c, f = Yn(e, o, u);
		return {
			position: f.position,
			heading: z(f.tangent) + ht(d),
			angle: 0,
			t: o
		};
	}
	if (r < t.approach + l) {
		let e = (r - t.approach) / t.radius, n = s + (c - s) * (e / Un), i = t.radius * F(e), a = t.radius * (1 - $e(e)), l = o.origin;
		return {
			position: [
				l[0] + o.right[0] * n + o.forward[0] * i,
				l[1] + a,
				l[2] + o.right[2] * n + o.forward[2] * i
			],
			heading: z(o.forward),
			angle: e,
			t: t.t
		};
	}
	let u = t.t + Math.min(r - t.approach - l, t.exit) / a, d = Yn(e, u, c);
	return {
		position: d.position,
		heading: z(d.tangent),
		angle: 0,
		t: u
	};
}
function Zn(e, t, n, r, i, a, o = 0) {
	let s = e.status;
	s.loopIndex = t, s.loopS = o, s.loopS0 = o, s.loopLat0 = r, s.loopSpeed = Math.max(Math.abs(e.speed), i.topSpeed * i.loopSpeedFactor), s.loopAngle = 0, s.intangibleRemaining = Math.max(s.intangibleRemaining, (Gn(n) - o) / s.loopSpeed + .2), V(e), a.push({
		type: "loop",
		phase: "start"
	});
}
function Qn(e, t, n, r, i) {
	let a = e.status, o = t.loops?.[a.loopIndex];
	if (!o) {
		a.loopIndex = -1, a.loopAngle = 0;
		return;
	}
	let s = Gn(o);
	a.loopS = Math.min(s, a.loopS + a.loopSpeed * r);
	let c = Xn(t, o, a.loopLat0, a.loopS, a.loopS0);
	e.position[0] = c.position[0], e.position[1] = c.position[1], e.position[2] = c.position[2], e.heading = c.heading, e.t = (c.t % 1 + 1) % 1, e.branch = 0, e.distanceAlong = e.t * t.length, e.speed = a.loopSpeed, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !0, a.loopAngle = c.angle, !(a.loopS < s) && (a.loopIndex = -1, a.loopAngle = 0, j(e, "pad", n.padMultiplier, n.padSeconds, i), i.push({
		type: "loop",
		phase: "end"
	}));
}
//#endregion
//#region src/kart-controller/ground.ts
function $n(e, t, n, r = 0) {
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
var er = (e) => (e % 1 + 1) % 1;
function tr(e, t, n) {
	let r = er(t - e);
	if (r === 0 || r > .5) return !1;
	let i = er(n - e);
	return i > 0 && i <= r;
}
function nr(e, t, n, r) {
	if (e === "hump") {
		if (Math.abs(r) >= t / 2) return 0;
		let e = $e(Math.PI * r / t);
		return n * e * e;
	}
	return r >= 0 && r < t ? n * (1 - r / t) : 0;
}
function rr(e, t, n) {
	if (!e) return 1;
	let r = (n - Math.abs(t)) / e;
	return r >= 1 ? 1 : r <= 0 ? 0 : r * r * (3 - 2 * r);
}
function ir(e, t, n, r = 0, i = Infinity, a = 0) {
	let o = 0, s = e.length;
	for (let c of e.jumps) {
		if (!c.rise || !c.run || (c.branch ?? 0) !== n) continue;
		let e = rr(c.edge, r, i);
		if (!c.edge && Math.abs(r) > i) {
			let t = c.skirt && !(a & (r < 0 ? 1 : 2)) ? 1 - (Math.abs(r) - i) / c.skirt : 0;
			if (t <= 0) continue;
			e = t * t * (3 - 2 * t);
		}
		let l = (c.t - t) * s;
		l > s / 2 ? l -= s : l < -s / 2 && (l += s);
		let u = nr(c.shape, c.run, c.rise, l) * e;
		u > o && (o = u);
	}
	return o;
}
function ar(e, t, n, r) {
	for (let i of e.jumps) if (i.shape !== "hump" && i.rise && (i.branch ?? 0) === n && Math.abs(er(i.t - t + .5) - .5) * e.length < r) return !0;
	return !1;
}
function or(e, t, n) {
	let r = er(e - t);
	return r === 0 || r > .5 ? !1 : er(n - t) < r;
}
function sr(e, t, n, r, i) {
	for (let a of e.jumps) if (a.shape !== "hump" && a.rise && (a.branch ?? 0) === r && or(t, n, a.t) && Math.abs(i) <= e.sample(a.t, 0, r).halfWidth + (a.skirt ?? 0) / 2) return a;
}
var cr = .25;
function lr(e, t, n, r, i, a, o) {
	let s = a.normal, c = s[0], l = s[1], u = s[2], d = t.jumps.length ? ir(t, n + cr / t.length, r, i, a.halfWidth, a.open ?? 0) : 0;
	if (o > 0 || d > 0) {
		let e = (d - o) / cr, t = a.tangent;
		c -= t[0] * e, l -= t[1] * e, u -= t[2] * e;
	}
	let f = L(c, l, u) || 1;
	e[0] = c / f, e[1] = l / f, e[2] = u / f;
}
function ur(e, t, n, r, i) {
	let a = R(e.heading), o = gn(e.heading), s = a[0] * e.speed + o[0] * e.lateralVelocity, c = a[2] * e.speed + o[2] * e.lateralVelocity, l = e.position[0], u = e.position[2], d = e.branch;
	e.position[0] += s * r, e.position[2] += c * r;
	let f = e.t, p = t.nearest(e.position, {
		t: e.t,
		branch: e.branch
	}, n.tSearchWindow);
	e.t = p.t, e.branch = p.branch;
	let { lateral: m, right: h } = $n(t, e.t, e.position, e.branch), g = e.grounded && ar(t, e.t, e.branch, n.lipZone) ? t.nearest([
		l,
		e.position[1],
		u
	], {
		t: f,
		branch: d
	}, n.tSearchWindow).t : f, _ = e.grounded ? sr(t, g, e.t, e.branch, m) : void 0;
	if (_) {
		let a = t.sample(_.t, 0, e.branch).tangent, o = I(a[0], a[2]) || 1, s = [
			-a[0] / o,
			0,
			-a[2] / o
		], c = e.position[0] - l, f = e.position[2] - u, p = c * s[0] + f * s[2];
		e.position[0] = l + c - s[0] * p, e.position[2] = u + f - s[2] * p, e.branch = d;
		let v = t.length, y = (e) => (er(e - _.t + .5) - .5) * v;
		e.t = t.nearest(e.position, {
			t: g,
			branch: d
		}, n.tSearchWindow).t;
		let b = y(g) - y(e.t);
		b > 0 && (e.position[0] -= s[0] * b, e.position[2] -= s[2] * b, e.t = g), {lateral: m, right: h} = $n(t, e.t, e.position, e.branch);
		let x = t.sample(e.t, m, e.branch), S = m < 0 ? -1 : 1;
		if (Math.abs(m) >= (x.wall ?? x.halfWidth) - vn(e, n) && !((x.open ?? 0) & (S < 0 ? 1 : 2))) {
			s[0] += h[0] * S, s[2] += h[2] * S;
			let e = I(s[0], s[2]);
			s[0] /= e, s[2] /= e;
		}
		En(e, s, n, r, i);
	}
	e.distanceAlong = e.t * t.length;
	let v = t.sample(e.t, m, e.branch), y = e.grounded;
	if (e.grounded || e.drift.phase === "hopping") {
		for (let n of t.jumps) if ((e.grounded || n.shape !== "hump") && (n.branch ?? 0) === e.branch && tr(f, e.t, n.t) && Math.abs(m) <= v.halfWidth) {
			e.verticalVelocity = Math.max(e.verticalVelocity, n.launch), e.grounded = !1, e.airborne.fromJumpId = n.id, e.airborne.seconds = 0, i.push({
				type: "launched",
				jumpId: n.id
			}), e.trickBuffer > 0 && n.shape !== "hump" && !e.airborne.trickQueued && (e.airborne.trickQueued = !0, i.push({ type: "trick" })), e.trickBuffer = 0;
			break;
		}
	}
	if (e.grounded) {
		for (let r of t.boostPads) if ((r.branch ?? 0) === e.branch && tr(f, e.t, r.t) && Math.abs(m - r.lateral) <= r.halfWidth) {
			j(e, "pad", n.padMultiplier, n.padSeconds, i);
			break;
		}
	}
	let b = e.surface;
	e.verticalVelocity -= n.gravity * r, e.position[1] += e.verticalVelocity * r;
	let x = e.position[1];
	v.overCliff && !e.status.falling ? (e.status.falling = !0, e.status.fallFromY = v.groundY) : e.status.falling && !v.overCliff && Math.abs(v.groundY - e.status.fallFromY) < n.groundCatch && x >= v.groundY - n.groundCatch && (e.status.falling = !1);
	let S = e.status.falling ? 0 : ir(t, e.t, e.branch, m, v.halfWidth, v.open ?? 0), C = e.status.falling ? -Infinity : v.groundY + S, w = e.verticalVelocity <= n.groundLaunchVy, T = !y && x < C - Math.max(Math.abs(e.verticalVelocity) * r + n.groundStick, n.groundCatch);
	if (x < C && !T && (e.position[1] = C, w && (e.verticalVelocity = 0)), x <= C + n.groundStick && w && !T ? (e.position[1] = C, e.verticalVelocity = 0, e.grounded = !0) : e.grounded = !1, e.grounded) {
		if (e.surface = v.surface, e.gripScale = v.gripScale, lr(e.groundNormal, t, e.t, e.branch, m, v, S), v.surface === "boost" && (b !== "boost" || !y) && j(e, "pad", n.padMultiplier, n.padSeconds, i), !y) {
			let t = e.airborne.trickQueued;
			i.push({
				type: "landed",
				fromJumpId: e.airborne.fromJumpId,
				trick: t
			}), t && j(e, "trick", n.trickMultiplier, n.trickSeconds, i), e.airborne.fromJumpId = void 0, e.airborne.trickQueued = !1, e.airborne.seconds = 0;
		}
	} else e.airborne.seconds += r;
	let E = er(e.t - f);
	if (e.grounded && e.branch === 0 && t.loops && !e.status.falling && E > 0 && E < .5) {
		let r = t.length;
		for (let a = 0; a < t.loops.length; a++) {
			let o = t.loops[a], s = er(e.t - (o.t - o.approach / r)) * r;
			if (s < o.approach) {
				Zn(e, a, o, m, n, i, s);
				break;
			}
		}
	}
	return (e.position[1] < t.voidY || e.status.falling && e.position[1] < e.status.fallFromY - n.fallCatchDepth) && i.push({ type: "respawn" }), {
		sample: v,
		lateral: m,
		right: h
	};
}
//#endregion
//#region src/kart-controller/slipstream.ts
function dr(e, t, n) {
	if (t === e || t.isGhost || e.isGhost || !Dn(e, t, n)) return !1;
	let r = R(t.heading), i = gn(t.heading), a = e.position[0] - t.position[0], o = e.position[2] - t.position[2], s = a * r[0] + o * r[2], c = a * i[0] + o * i[2];
	if (s >= 0 || s < -n.slipstreamLength || Math.abs(c) > n.slipstreamHalfWidth) return !1;
	let l = R(e.heading);
	return l[0] * r[0] + l[2] * r[2] < n.slipstreamSameWayDot ? !1 : t.speed > 0 && e.speed > 0;
}
function fr(e, t, n, r, i) {
	if (!t.some((t) => dr(e, t, n))) {
		e.slipstreamSeconds = 0;
		return;
	}
	e.slipstreamSeconds += r, e.slipstreamSeconds >= n.slipstreamSeconds && (j(e, "slipstream", n.slipstreamMultiplier, n.slipstreamBoostSeconds, i), e.slipstreamSeconds = 0);
}
//#endregion
//#region src/kart-controller/speed.ts
function pr(e, t) {
	let n = Math.min(e.coins, t.coinCap), r = t.topSpeed * (1 + n * t.coinBonusEach), i = te(e), a = r;
	i && (a *= e.boost.multiplier), e.status.slowRemaining > 0 && (a = Math.min(a, r * e.status.slowedTo));
	let o = i && t.boostIgnoresSurfaceCap || !e.grounded && t.airborneIgnoresSurfaceCap, s = t.surfaceSpeed[e.surface] ?? 1, c = r;
	return o || (a = Math.min(a, r * s), c = r * s), {
		base: r,
		effective: c,
		target: a
	};
}
function mr(e, t, n) {
	let r = t > 0 ? Math.min(1, Math.max(0, e) / t) : 1;
	return n.accel * (n.accelLaunch - n.accelTaper * r * r);
}
function hr(e, t, n, r, i) {
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
		e.speed = Math.min(n, a + mr(a, n, r) * t.throttle * i);
		return;
	}
	a > 0 ? e.speed = Math.max(0, a - r.coastDecel * i) : a < 0 && (e.speed = Math.min(0, a + r.coastDecel * i));
}
var gr = 1 / 120, _r = 1e-9;
function vr(e, t) {
	let n = e - t;
	return n > _r ? n : 0;
}
function yr(e, t) {
	ie(e, t), e.status.spinRemaining = vr(e.status.spinRemaining, t), e.status.slowRemaining = vr(e.status.slowRemaining, t), e.status.slowRemaining === 0 && (e.status.slowedTo = 1), e.status.intangibleRemaining = vr(e.status.intangibleRemaining, t), e.drift.chargeMultiplierRemaining = vr(e.drift.chargeMultiplierRemaining, t), e.drift.chargeMultiplierRemaining === 0 && (e.drift.chargeMultiplier = 1), e.wallCooldown = vr(e.wallCooldown, t), e.bumpCooldown = vr(e.bumpCooldown, t), e.trickBuffer = vr(e.trickBuffer, t), e.status.rideRemaining = vr(e.status.rideRemaining, t), e.status.towRemaining = vr(e.status.towRemaining, t), e.status.towRemaining === 0 && (e.status.towTarget = -1);
}
var br = [
	0,
	0,
	0
], xr = [
	0,
	0,
	0
];
function Sr(e, t, n, r, i, a = {}, o) {
	let s = [], c = e.status.spinRemaining > 0;
	if (yr(e, i), e.status.held) return e.prevDrift = t.drift, s;
	if (Wn(e)) return e.prevDrift = t.drift, Qn(e, n, r, i, s), s;
	let l = c ? mn : t;
	if (c) {
		e.prevDrift = t.drift;
		let n = e.status.spinRemaining;
		e.speed = n > 0 ? e.speed * (n / (n + i)) : 0;
	} else if (B(e) || _n(e) && o) {
		e.prevDrift = t.drift;
		let a = pr(e, r).base;
		B(e) ? xn(e, yn(e, n, r, br), a * r.rideSpeedMultiplier, r, i) : xn(e, o, a * r.towSpeedMultiplier, r, i), V(e);
	} else {
		let t = pr(e, r);
		hr(e, l, t.target, r, i);
		let n = ee(r, e.surface), o = (e.drift.phase === "drifting" ? Math.min(n, r.gripDrift) : n) * e.gripScale * (e.grounded ? 1 : r.airGrip);
		Rn(e, l, r, t.base, o, i), Hn(e, l, r, t.base, i, s, a);
	}
	let u = ur(e, n, r, i, s);
	return e.status.falling || Tn(e, u.lateral, u.right, u.sample.wall ?? u.sample.halfWidth, r, i, s, u.sample.open ?? 0), s;
}
function Cr(e, t, n, r, i, a = {}) {
	let o = e.map((o, s) => {
		let c = o.status.towTarget, l = _n(o) && c < e.length ? bn(o, e[c], n, r[s], xr) : void 0;
		return Sr(o, t[s], n, r[s], i, a, l);
	});
	for (let t = 0; t < e.length; t++) for (let n = t + 1; n < e.length; n++) Wn(e[t]) || Wn(e[n]) || e[t].status.held || e[n].status.held || kn(e[t], e[n], r[t], r[n], r[t], i, o[t], o[n]);
	for (let t = 0; t < e.length; t++) !Wn(e[t]) && !e[t].status.held && fr(e[t], e, r[t], i, o[t]);
	return o;
}
function wr(e, t, n, r) {
	let i = e.coins > 0, a = Math.min(e.coins, t.hitCoinsLost);
	e.coins -= a;
	let o;
	t.coinShield.enabled && i ? (e.status.slowedTo = t.coinShield.slowedTo, e.status.slowRemaining = t.coinShield.slowSeconds, o = !1) : (e.status.spinRemaining = t.hitSpinSeconds, o = !0), V(e), re(e), e.status.towRemaining = 0, e.status.towTarget = -1, r.push({
		type: "hit",
		kind: n,
		spun: o,
		coinsLost: a
	});
}
function Tr(e, t, n, r) {
	return Math.abs(n - t.startBoostCentreSeconds) > t.startBoostWindowSeconds / 2 ? !1 : (e.boost.source = "start", e.boost.multiplier = t.startBoostMultiplier, e.boost.remaining = t.startBoostSeconds, r.push({
		type: "boostStart",
		source: "start",
		multiplier: t.startBoostMultiplier,
		seconds: t.startBoostSeconds
	}), !0);
}
var Er = {
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
"default\":\"spin\"},\"offset\":{\"type\":\"number\",\"description\":\"type vent: seconds into its cycle at race time 0, so vents side by side take turns\"},\"launch\":{\"type\":\"number\",\"description\":\"type vent: m/s up it throws a kart (default builder ventLaunch)\"},\"asset\":{\"type\":\"string\"},\"creature\":{\"type\":\"string\",\"enum\":[\"rumblesaur\",\"yeti\",\"kraken\",\"crab\",\"goose\",\"whale\"],\"description\":\"type creature: the track's big creature (design §6); lateral's sign picks its side of the road\"}}}},\"offroad\":{\"type\":\"boolean\",\"default\":false,\"description\":\"The Mario Kart World edge: the land meets the curb with no strip and no wall; it is drivable (the dirt top-speed cap) out to an invisible course limit offroadReach metres past the curb, where the roadside scenery starts. False (a pier, a sky road): a solid low edge wall at the road's edge.\"},\"loops\":{\"description\":\"Loop-the-loops on the main line (design.md Track thrills). Every kart on the ground is caught before the foot at t, rides up and round the ring and is set down after it with a boost. Put one on a straight at least approach + exit metres long.\",\"type\":\"array\",\"items\":" +
"{\"type\":\"object\",\"required\":[\"id\",\"t\"],\"properties\":{\"id\":{\"type\":\"string\"},\"t\":{\"type\":\"number\",\"description\":\"main-line t of the ring's foot\"},\"radius\":{\"type\":\"number\",\"description\":\"metres (default builder loopRadius)\"}}}},\"openEdges\":{\"description\":\"Stretches of the main line with no wall on one or both sides (left = negative lateral). Past the shoulder there is no ground: a kart falls and the claw brings it back.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"fromT\",\"toT\",\"side\"],\"properties\":{\"fromT\":{\"type\":\"number\"},\"toT\":{\"type\":\"number\"},\"side\":{\"type\":\"string\",\"enum\":[\"left\",\"right\",\"both\"]}}}},\"jumps\":{\"description\":\"Trick ramps. Leaving a jump airborne with the hop button pressed awards a trick boost.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"id\",\"t\",\"launch\"],\"properties\":{\"id\":{\"type\":\"string\"},\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\",\"default\":0},\"width\":{\"type\":\"number\"},\"launch\":{\"type\":\"number\",\"description\":\"Vertical launch speed m/s\"},\"shape\":{\"type\":\"string\",\"enum\":[\"ramp\",\"" +
"hump\"],\"default\":\"ramp\",\"description\":\"ramp: a striped wedge across the road up to a lip at t; hump: a trick bump (dune, mogul) whose crest is at t (design.md Track thrills)\"},\"run\":{\"type\":\"number\",\"description\":\"metres along the road the ramp rises over, or the bump spans (default builder rampRun / humpRun)\"},\"rise\":{\"type\":\"number\",\"description\":\"metres the lip or crest stands above the road (default builder rampRise / humpRise)\"},\"shortcut\":{\"type\":\"string\",\"description\":\"Shortcut id this jump sits on; t stays main-equivalent\"}}}},\"pickups\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"t\"],\"properties\":{\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\"},\"shortcut\":{\"type\":\"string\"},\"double\":{\"type\":\"boolean\",\"description\":\"A gold double balloon: fills both item slots at once (design §8)\"}}}},\"coins\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"t\"],\"properties\":{\"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\"},\"shortcut\":{\"type\":\"string\"}}}},\"boostPads\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"t\"],\"properties\":{\"" +
"t\":{\"type\":\"number\"},\"lateral\":{\"type\":\"number\"},\"width\":{\"type\":\"number\"},\"shortcut\":{\"type\":\"string\"}}}},\"finalLapShift\":{\"description\":\"Exactly one readable change on the last lap. Fires once, globally, when the race leader starts the final lap.\",\"type\":\"object\",\"required\":[\"kind\",\"label\"],\"properties\":{\"kind\":{\"type\":\"string\",\"enum\":[\"flood\",\"storm\",\"collapse\",\"blizzard\",\"fireworks\",\"sunset\",\"rise\",\"reverse\"]},\"label\":{\"type\":\"string\",\"description\":\"Banner text, e.g. 'THE TIDE IS IN'\"},\"closesShortcuts\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"opensShortcuts\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"routeOverrides\":{\"description\":\"Replace a t-range of the main spline (bridges retract, rail becomes mandatory). The LUT is rebuilt once when the shift fires.\",\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"fromT\",\"toT\",\"controlPoints\"],\"properties\":{\"fromT\":{\"type\":\"number\"},\"toT\":{\"type\":\"number\"},\"controlPoints\":{\"$ref\":\"#/properties/controlPoints\"}}}},\"surfaceOverrides\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"pro" +
"perties\":{\"fromT\":{\"type\":\"number\"},\"toT\":{\"type\":\"number\"},\"surface\":{\"type\":\"string\"}}}},\"gripMultiplier\":{\"type\":\"number\",\"default\":1,\"description\":\"Global grip scale, e.g. 0.8 for wet grass\"},\"addsJumps\":{\"$ref\":\"#/properties/jumps\"},\"enablesHazards\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"disablesHazards\":{\"type\":\"array\",\"items\":{\"type\":\"string\"}},\"sky\":{\"type\":\"string\",\"description\":\"Sky preset id\"},\"lut\":{\"type\":\"string\"},\"fogDensity\":{\"type\":\"number\"},\"musicVariant\":{\"type\":\"string\"}}},\"environment\":{\"type\":\"object\",\"properties\":{\"sky\":{\"type\":\"string\"},\"lut\":{\"type\":\"string\"},\"fogColor\":{\"type\":\"string\"},\"fogDensity\":{\"type\":\"number\"},\"ground\":{\"description\":\"One flat plane under the whole track. 'none' for sky tracks; the void is below voidY.\",\"type\":\"object\",\"required\":[\"kind\"],\"properties\":{\"kind\":{\"type\":\"string\",\"enum\":[\"plane\",\"water\",\"none\"],\"default\":\"plane\"},\"y\":{\"type\":\"number\",\"default\":0}}},\"sunDirection\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":3,\"maxItems\":3},\"palett" +
"e\":{\"type\":\"object\",\"properties\":{\"background\":{\"type\":\"string\"},\"accent\":{\"type\":\"string\"}}},\"decor\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"properties\":{\"asset\":{\"type\":\"string\"},\"instances\":{\"type\":\"integer\"},\"band\":{\"type\":\"string\",\"enum\":[\"roadside\",\"verge\",\"far\",\"sky\"],\"description\":\"verge: an off-road track's small ground cover (flowers, tufts, stones) on the drivable land between the curb and the course limit; visual only, karts drive through it\"},\"footing\":{\"type\":\"string\",\"enum\":[\"pier\"],\"description\":\"Out at sea: each one stands on its own wooden pier, raised pierLift above the water\"},\"lift\":{\"type\":\"number\",\"description\":\"Metres above its band's ground: a model centred on its middle (a hazard's) sits on the ground with lift = its radius\"},\"layout\":{\"type\":\"string\",\"enum\":[\"scatter\",\"row\",\"span\"],\"default\":\"scatter\",\"description\":\"scatter: little groups with open ground between; row: runs of pieces `every` metres apart along the road, turned along it, local +X away from the road (fences, lamp posts, corner signs, a ski lift, cliff walls); span: one piece acros" +
"s the road, its legs past the course limit (bunting, a rock arch)\"},\"every\":{\"type\":\"number\",\"description\":\"row: metres between pieces along the road\"},\"run\":{\"type\":\"integer\",\"default\":6,\"description\":\"row: pieces per run\"},\"at\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"description\":\"[t0, t1]: group centres stay in this stretch of the main line (t0 > t1 wraps past the start)\"},\"side\":{\"type\":\"string\",\"enum\":[\"left\",\"right\",\"outside\",\"inside\"],\"description\":\"Which side of the road; default: the outside of corners, favoured\"},\"dist\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"description\":\"Overrides the band's [near, far] metres (past the curb for roadside and verge, from the centreline for far)\"},\"scale\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"minItems\":2,\"maxItems\":2,\"description\":\"Random uniform scale range (default [0.7, 1.3]; rows and spans 1)\"},\"merge\":{\"type\":\"boolean\",\"default\":false,\"description\":\"A code-built (vertex-coloured) model baked into the track's merged dressing chunks, one draw per chunk for every" +
" merged kind, instead of an instancer of its own\"}}}},\"landmarkFooting\":{\"type\":\"string\",\"enum\":[\"pier\"],\"description\":\"The landmark stands on a wooden pier (a sea track)\"}}},\"music\":{\"type\":\"string\"},\"landmark\":{\"type\":\"string\",\"description\":\"The thing visible from the start line\"},\"mirrored\":{\"type\":\"boolean\",\"default\":false,\"description\":\"Never authored: set by track-builder mirror.ts on a track reflected left to right for Mirror mode (design §10). Every lateral, bank and side in it is already flipped.\"},\"builder\":{\"description\":\"Track-builder constants. Never set per track; the defaults are the only values. Code reads them from here (docs/sops/track-builder.md Constants).\",\"type\":\"object\",\"properties\":{\"lutSamples\":{\"type\":\"integer\",\"default\":2048,\"description\":\"Arc-length samples per branch LUT\"},\"arcDivisions\":{\"type\":\"integer\",\"default\":4096,\"description\":\"Fine steps used to walk the curve before resampling\"},\"globalSearchStep\":{\"type\":\"integer\",\"default\":8,\"description\":\"Coarse stride for nearestTGlobal\"},\"branchHysteresis\":{\"type\":\"number\",\"default\":1.0,\"description\":\"metr" +
"es; another branch must be closer by this much to win\"},\"branchLeaveMargin\":{\"type\":\"number\",\"default\":1.35,\"description\":\"metres inside a road edge a kart still counts as on that road; another branch can only take it once it is past this. Must exceed kartRadius (0.85): the wall holds a kart exactly one radius inside the edge, so at 0.85 nobody could ever leave\"},\"maxBankDeg\":{\"type\":\"number\",\"default\":20},\"minTurnRadiusFactor\":{\"type\":\"number\",\"default\":1.5,\"description\":\"turn radius must be >= factor × halfWidth (hairpin guard)\"},\"minStartHalfWidth\":{\"type\":\"number\",\"default\":4},\"branchBlendMetres\":{\"type\":\"number\",\"default\":14,\"description\":\"a shortcut ribbon loses its kerbs and sinks 3 cm for this long at each end, where it overlaps the main road\"},\"kerbWidth\":{\"type\":\"number\",\"default\":1.0},\"kerbHeight\":{\"type\":\"number\",\"default\":0.1},\"shoulderWidth\":{\"type\":\"number\",\"default\":6.0},\"shoulderDrop\":{\"type\":\"number\",\"default\":0.4},\"rampSkirt\":{\"type\":\"number\",\"default\":2.5,\"description\":\"Off-road tracks: metres past the curb over which a ramp's sides slope down to the sand (karts besid" +
"e a ramp drive up its side instead of popping up a square edge)\"},\"tunnelWall\":{\"type\":\"number\",\"default\":4.2,\"description\":\"metres: a tunnel's side walls rise this high above the road before the roof arches over\"},\"tunnelApex\":{\"type\":\"number\",\"default\":6.2,\"description\":\"metres: the top of a tunnel's arched roof above the road\"},\"tunnelHill\":{\"type\":\"number\",\"default\":9,\"description\":\"metres: the land over a tunnel stands this high above its road (a mesa the mine runs through)\"},\"tunnelRamp\":{\"type\":\"number\",\"default\":2.5,\"description\":\"metres in from a portal over which the land rises to tunnelHill: the mesa ends in a cliff, and the portal is a rock face in it (mesh/tunnel.ts)\"},\"tunnelMesaTop\":{\"type\":\"number\",\"default\":3,\"description\":\"metres of the mesa's flat top past where a road's shoulder would end, before its sides fall away (a ridge over the mine, not a plateau)\"},\"tunnelFunnel\":{\"type\":\"number\",\"default\":16,\"description\":\"metres before a portal over which the off-road beside the approach narrows to the curb, guiding karts into the mouth\"},\"tunnelFrameSpacing\":{\"type\":\"number\",\"default\":8,\"" +
"description\":\"metres between the timber frames inside a tunnel\"},\"tunnelLanternSpacing\":{\"type\":\"number\",\"default\":12,\"description\":\"metres between lanterns inside a tunnel (alternate walls)\"},\"offroadReach\":{\"type\":\"number\",\"default\":12,\"description\":\"Off-road tracks: metres past the curb the ground is drivable (slowly) before an invisible course limit, just short of the roadside scenery (the Mario Kart World way: no strip, no wall along the road)\"},\"offroadDrop\":{\"type\":\"number\",\"default\":0.12,\"description\":\"Off-road tracks: the ground past the curb sits this far under the road, as the land mesh draws it\"},\"barrierSpacing\":{\"type\":\"number\",\"default\":2.0},\"roadTileLength\":{\"type\":\"number\",\"default\":10,\"description\":\"metres of road per UV v unit\"},\"chunkCount\":{\"type\":\"integer\",\"default\":8},\"minimapSamples\":{\"type\":\"integer\",\"default\":200},\"minimapPadding\":{\"type\":\"number\",\"default\":0.06},\"boostPadHalfLength\":{\"type\":\"number\",\"default\":1.75},\"boostPadWidth\":{\"type\":\"number\",\"default\":3.0},\"rampRun\":{\"type\":\"number\",\"default\":5,\"description\":\"metres a ramp rises over to its " +
"lip (karts drive up it: kart-controller jumpLift)\"},\"rampRise\":{\"type\":\"number\",\"default\":0.8,\"description\":\"height of a ramp's lip above the road, metres\"},\"humpRun\":{\"type\":\"number\",\"default\":8,\"description\":\"metres along the road a trick bump spans\"},\"humpRise\":{\"type\":\"number\",\"default\":1.0,\"description\":\"height of a trick bump's crest, metres\"},\"loopRadius\":{\"type\":\"number\",\"default\":9,\"description\":\"a loop-the-loop's radius, metres\"},\"loopShift\":{\"type\":\"number\",\"default\":7,\"description\":\"metres the ring moves right in one turn: the way in (left of centre) never meets the way out (right)\"},\"loopSpread\":{\"type\":\"number\",\"default\":1.2,\"description\":\"metres either side of its lane a kart rides round, by where it came in (karts side by side stay side by side)\"},\"loopApproach\":{\"type\":\"number\",\"default\":24,\"description\":\"metres before the foot a kart is caught and eased into the entry lane\"},\"loopExit\":{\"type\":\"number\",\"default\":6,\"description\":\"metres after the foot a kart is set down in the exit lane\"},\"loopWidth\":{\"type\":\"number\",\"default\":6,\"description\":\"width of the ri" +
"ng's track, metres\"},\"humpEdge\":{\"type\":\"number\",\"default\":1.6,\"description\":\"metres over which a trick bump rounds off to the road at each kerb\"},\"balloonHeight\":{\"type\":\"number\",\"default\":1.2},\"balloonRadius\":{\"type\":\"number\",\"default\":0.9},\"pierLift\":{\"type\":\"number\",\"default\":1.1,\"description\":\"A pier's deck stands this far above the sea (level with a sea track's coast)\"},\"coinRadius\":{\"type\":\"number\",\"default\":0.5},\"hazardRadius\":{\"type\":\"number\",\"default\":1.2},\"ventRadius\":{\"type\":\"number\",\"default\":2.2,\"description\":\"a launch vent's mouth, metres (design.md Track thrills)\"},\"ventWarnSeconds\":{\"type\":\"number\",\"default\":1.0,\"description\":\"a vent glows and bubbles this long before it erupts\"},\"ventEruptSeconds\":{\"type\":\"number\",\"default\":1.5,\"description\":\"how long a vent erupts; a kart on it then is thrown up\"},\"ventLaunch\":{\"type\":\"number\",\"default\":14,\"description\":\"m/s up a vent throws a kart, about 4 m high (a ramp is 5 to 6)\"},\"fallingActiveSeconds\":{\"type\":\"number\",\"default\":0.5},\"fallingWarnSeconds\":{\"type\":\"number\",\"default\":1.0,\"description\":\"a f" +
"alling hazard drops this long before it lands (and can hit), its shadow growing on the spot\"},\"fallingHeight\":{\"type\":\"number\",\"default\":14,\"description\":\"metres above the road a falling hazard drops from\"},\"gustWindow\":{\"type\":\"number\",\"default\":6,\"description\":\"metres along the road a gust acts over\"},\"decorBands\":{\"type\":\"object\",\"properties\":{\"roadside\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[8,14]},\"roadsideOffroad\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[13,19],\"description\":\"the roadside band on an off-road track: just past the course limit, so the scenery lines the course\"},\"verge\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[2.5,11],\"description\":\"metres past the curb for an off-road track's ground cover: past a ramp's skirt (rampSkirt), inside the course limit (offroadReach)\"},\"far\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[30,120]},\"sky\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[25,60]}}},\"lapTimeWarn\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[40,65],\"description\":\"seconds; estim" +
"ated lap outside this warns\"},\"trackDrawCallBudget\":{\"type\":\"integer\",\"default\":40}}}}")
}, Dr = {
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
						properties: {
							fromJumpId: { type: "string" },
							trickQueued: { type: "boolean" }
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
						description: "Hop/drift button; pressed while airborne from a jump = trick"
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
function Or(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = Or(r.properties));
	return t;
}
var H = Object.freeze(Or(Er.properties.builder.properties)), kr = w.properties.base.properties.kartRadius.default;
w.properties.base.properties.tSearchWindow.default, Dr.properties.constants.properties.countdownSteps.default, Dr.properties.constants.properties.countdownStepSeconds.default;
//#endregion
//#region src/track-builder/spline.ts
var Ar = 1e-4;
function jr(e, t, n, r, i, a, o, s, c) {
	let l = (t - e) / i - (n - e) / (i + a) + (n - t) / a, u = (n - t) / a - (r - t) / (a + o) + (r - n) / o;
	l *= a, u *= a, s[c] = t, s[c + 1] = l, s[c + 2] = -3 * t + 3 * n - 2 * l - u, s[c + 3] = 2 * t - 2 * n + l + u;
}
var Mr = class {
	closed = !0;
	count;
	c;
	constructor(e) {
		if (e.length < 4) throw Error(`ClosedSpline needs at least 4 points, got ${e.length}`);
		let t = e.length;
		this.count = t, this.c = new Float64Array(t * 12);
		for (let n = 0; n < t; n++) {
			let r = e[(n - 1 + t) % t], i = e[n], a = e[(n + 1) % t], o = e[(n + 2) % t], s = Math.sqrt(Math.sqrt(Pr(r, i))), c = Math.sqrt(Math.sqrt(Pr(i, a))), l = Math.sqrt(Math.sqrt(Pr(a, o)));
			c < Ar && (c = 1), s < Ar && (s = c), l < Ar && (l = c);
			let u = n * 12;
			jr(r.x, i.x, a.x, o.x, s, c, l, this.c, u), jr(r.y, i.y, a.y, o.y, s, c, l, this.c, u + 4), jr(r.z, i.z, a.z, o.z, s, c, l, this.c, u + 8);
		}
	}
	segmentOf(e) {
		let t = this.count, n = Fr(e) * t;
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
		for (let a = 1; a <= e; a++) this.pointAt(a / e, r), i += L(r[0] - n[0], r[1] - n[1], r[2] - n[2]), t[a] = i, n[0] = r[0], n[1] = r[1], n[2] = r[2];
		return t;
	}
}, Nr = class {
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
			let n = i === 0 ? r(e[0], e[1]) : e[i - 1], a = e[i], o = e[i + 1], s = i + 2 < t ? e[i + 2] : r(e[t - 1], e[t - 2]), c = Math.sqrt(Math.sqrt(Pr(n, a))), l = Math.sqrt(Math.sqrt(Pr(a, o))), u = Math.sqrt(Math.sqrt(Pr(o, s)));
			l < Ar && (l = 1), c < Ar && (c = l), u < Ar && (u = l);
			let d = i * 12;
			jr(n.x, a.x, o.x, s.x, c, l, u, this.c, d), jr(n.y, a.y, o.y, s.y, c, l, u, this.c, d + 4), jr(n.z, a.z, o.z, s.z, c, l, u, this.c, d + 8);
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
		for (let a = 1; a <= e; a++) this.pointAt(a / e, r), i += L(r[0] - n[0], r[1] - n[1], r[2] - n[2]), t[a] = i, n[0] = r[0], n[1] = r[1], n[2] = r[2];
		return t;
	}
};
function Pr(e, t) {
	let n = e.x - t.x, r = e.y - t.y, i = e.z - t.z;
	return n * n + r * r + i * i;
}
function Fr(e) {
	let t = e % 1;
	return t < 0 ? t + 1 : t;
}
//#endregion
//#region src/track-builder/types.ts
var Ir = Object.freeze([
	"road",
	"dirt",
	"mud",
	"ice",
	"boost",
	"rail"
]);
function Lr(e) {
	let t = Ir.indexOf(e ?? "road");
	return t < 0 ? 0 : t;
}
//#endregion
//#region src/track-builder/lut.ts
var U = (e) => {
	let t = e % 1;
	return t < 0 ? t + 1 : t;
}, Rr = (e) => e < 0 ? 0 : e > 1 ? 1 : e, zr = Math.PI / 180, Br = {
	top: 0,
	edge: 0,
	next: 0,
	open: !1,
	cover: NaN,
	lip: NaN,
	pieces: 0
}, Vr = class {
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
	reach;
	landAbove;
	bore;
	seg;
	grip;
	minY;
	maxY;
	constructor(e, t = {}) {
		let n = t.samples ?? H.lutSamples, r = t.divisions ?? H.arcDivisions, i = t.closed ?? !0, a = i ? new Mr(e) : new Nr(e);
		this.spline = a, this.n = n, this.closed = i, this.step = i ? n : n - 1, this.px = new Float64Array(n), this.py = new Float64Array(n), this.pz = new Float64Array(n), this.tx = new Float64Array(n), this.ty = new Float64Array(n), this.tz = new Float64Array(n), this.rx = new Float64Array(n), this.rz = new Float64Array(n), this.bank = new Float64Array(n), this.hw = new Float64Array(n), this.surface = new Uint8Array(n), this.open = new Uint8Array(n), this.seg = new Uint16Array(n), this.grip = new Float64Array(n).fill(1), this.covered = new Uint8Array(n), this.reach = new Float32Array(n).fill(H.offroadReach), this.landAbove = new Float32Array(n).fill(NaN), this.bore = new Float32Array(n).fill(NaN);
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
			this.seg[t] = h, this.surface[t] = Lr(_.surface), this.hw[t] = _.halfWidth + (v.halfWidth - _.halfWidth) * y;
			let b = (_.bank ?? 0) * zr, x = (v.bank ?? 0) * zr;
			this.bank[t] = b + (x - b) * y;
		}
		this.minY = u, this.maxY = d, this.refreshFrames();
	}
	refreshFrames() {
		for (let e = 0; e < this.n; e++) {
			let t = this.idx(e + 1), n = this.idx(e - 1), r = this.px[t] - this.px[n], i = this.py[t] - this.py[n], a = this.pz[t] - this.pz[n], o = L(r, i, a) || 1;
			r /= o, i /= o, a /= o, this.tx[e] = r, this.ty[e] = i, this.tz[e] = a;
			let s = I(r, a) || 1;
			this.rx[e] = a / s, this.rz[e] = -r / s;
		}
	}
	idx(e) {
		let t = this.n;
		return this.closed ? (e % t + t) % t : e < 0 ? 0 : e >= t ? t - 1 : e;
	}
	norm(e) {
		return this.closed ? U(e) : Rr(e);
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
		let r = this.norm(e) * this.step, i = Math.floor(r), a = this.idx(i), o = this.idx(i + 1), s = r - i, c = 1 - s, l = this.tx[a] * c + this.tx[o] * s, u = this.ty[a] * c + this.ty[o] * s, d = this.tz[a] * c + this.tz[o] * s, f = L(l, u, d) || 1;
		l /= f, u /= f, d /= f;
		let p = I(l, d) || 1, m = d / p, h = -l / p, g = this.bank[a] * c + this.bank[o] * s, _ = -t * et(g), v = this.px[a] * c + this.px[o] * s + m * t, y = this.py[a] * c + this.py[o] * s + _, b = this.pz[a] * c + this.pz[o] * s + h * t, x = m, S = -et(g), C = h, w = u * C - d * S, T = d * x - l * C, E = l * S - u * x, D = L(w, T, E) || 1;
		w /= D, T /= D, E /= D;
		let O = n.position, ee = n.tangent, k = n.normal;
		O[0] = v, O[1] = y, O[2] = b, ee[0] = l, ee[1] = u, ee[2] = d, k[0] = w, k[1] = T, k[2] = E, n.groundY = y, n.halfWidth = this.hw[a] * c + this.hw[o] * s, n.surface = Ir[this.surface[a]], n.gripScale = this.grip[a] * c + this.grip[o] * s;
		let te = this.open[a];
		n.open = te, n.overCliff = !1;
		let ne = !!(te & (t < 0 ? 1 : 2)), A = (this.covered[a] | this.covered[o]) !== 0;
		if ((ne || this.offroad) && !A) {
			let e = Math.abs(t) - n.halfWidth;
			if (e > H.kerbWidth) {
				if (n.surface = "dirt", ne) {
					let t = H.shoulderDrop * Math.min(1, (e - H.kerbWidth) / H.shoulderWidth);
					n.groundY -= t, O[1] -= t;
				} else {
					let r = y + Math.sign(t) * (e - H.kerbWidth) * et(g) - H.offroadDrop, i = !1;
					if (this.land) {
						let e = this.land.query(v, b, Br);
						e.pieces > 0 && (r = e.top, i = e.pieces > 1);
					}
					r < this.floorY && (r = this.floorY);
					let a = Math.min(1, (e - H.kerbWidth) / .5), o = y + (r - y) * a;
					if (n.groundY = o, O[1] = o, a >= 1) {
						let e = 0, t = 0;
						if (i && this.land) {
							let n = Math.max(this.floorY, this.land.top(v + .5, b)), i = Math.max(this.floorY, this.land.top(v, b + .5));
							e = (n - r) / .5, t = (i - r) / .5, k[0] = -e, k[1] = 1, k[2] = -t;
						} else k[0] = u * h, k[1] = d * m - l * h, k[2] = -u * m;
						let n = L(k[0], k[1], k[2]) || 1;
						k[0] /= n, k[1] /= n, k[2] /= n;
					}
				}
			}
			ne && (n.overCliff = e > H.kerbWidth + H.shoulderWidth);
		}
		return n.wall = A ? n.halfWidth + H.kerbWidth : this.offroad ? n.halfWidth + H.kerbWidth + (this.reach[a] * c + this.reach[o] * s) : n.halfWidth, n;
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
		let t = this.n, n = H.globalSearchStep, [r, i, a] = e, o = 0, s = Infinity;
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
function Hr(e, t) {
	return new Vr(e, t);
}
//#endregion
//#region src/track-builder/branches.ts
function W(e, t) {
	let n = U(e - t);
	return n > .5 ? n - 1 : n;
}
var Ur = class {
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
		this.index = e, this.id = t, this.lut = n, this.entryT = r, this.exitT = i, this.span = e === 0 ? 1 : U(i - r), this.openOnLaps = a, this.entryPoint = e === 0 ? [
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
		if (this.isMain) return U(e);
		let t = W(e, this.entryT) / this.span;
		return t < 0 ? 0 : t > 1 ? 1 : t;
	}
	toMain(e) {
		return this.isMain ? U(e) : U(this.entryT + e * this.span);
	}
	sample(e, t) {
		return this.lut.sample(this.toLocal(e), t);
	}
	sampleInto(e, t, n) {
		return this.lut.sampleInto(this.toLocal(e), t, n);
	}
	overlaps(e, t) {
		if (this.isMain) return !0;
		let n = W(e, this.entryT);
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
		for (let r = 0; r < Wr; r++) {
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
}, Wr = 3;
function Gr(e, t) {
	return Math.max(64, Math.round(H.lutSamples * e / t));
}
function Kr(e, t, n, r = t.controlPoints) {
	let i = Hr(r, {
		closed: !1,
		samples: 64,
		divisions: 256
	}), a = Hr(r, {
		closed: !1,
		samples: Gr(i.length, n.length),
		divisions: Math.max(256, Math.round(H.arcDivisions * i.length / n.length))
	});
	return qr(a, n, U(t.entryT), U(t.exitT)), new Ur(e, t.id, a, U(t.entryT), U(t.exitT), t.openOnLaps ?? []);
}
function qr(e, t, n, r) {
	let i = e.length / e.step;
	for (let a of [!0, !1]) {
		let o = t.idx(Math.round((a ? n : r) * t.step)), s = -1;
		for (let n = 0; n < e.n >> 1; n++) {
			let r = a ? n : e.n - 1 - n, c = e.px[r], l = e.pz[r], u = Infinity, d = o;
			for (let e = -24; e <= 24; e++) {
				let n = t.idx(o + e), r = t.px[n] - c, i = t.pz[n] - l, a = r * r + i * i;
				a < u && (u = a, d = n);
			}
			let f = o = d, p = (c - t.px[f]) * t.rx[f] + (l - t.pz[f]) * t.rz[f], m = e.rx[r] * t.rx[f] + e.rz[r] * t.rz[f], h = Math.abs(p) - (t.hw[f] + H.kerbWidth) - (e.hw[r] + H.kerbWidth) * Math.abs(m);
			s < 0 && h > -1 && (s = n * i);
			let g = s < 0 ? 0 : Math.min(1, (n * i - s) / 30), _ = 1 - g * g * (3 - 2 * g);
			if (_ <= 0) break;
			let v = t.hw[f] + H.kerbWidth, y = Math.max(-v, Math.min(v, p)), b = I(t.tx[f], t.tz[f]) || 1, x = t.ty[f] / b, S = (e.rx[r] * t.tx[f] + e.rz[r] * t.tz[f]) / b, C = ((c - t.px[f]) * t.tx[f] + (l - t.pz[f]) * t.tz[f]) / b, w = t.py[f] + C * x - y * et(t.bank[f]), T = Math.max(0, Math.min(1, 1 - (Math.abs(p) - v) / e.hw[r])), E = ht(et(t.bank[f]) * m * T - x * S);
			e.py[r] += (w - e.py[r]) * _, e.bank[r] += (E - e.bank[r]) * _;
		}
	}
	e.refreshFrames();
}
var Jr = class {
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
			let t = W(e, n.entryT);
			if (t < 0 || t > n.span) return this.main;
		}
		return n;
	}
	nearest(e, t, n) {
		let r = this.list[t.branch] ?? this.main;
		!r.open && !r.overlaps(t.t, 0) && (r = this.main);
		let i = r.nearestLocal(e, t.t, n), a = r.index, o = Math.sqrt(i.d2), s = i.t, c = r.halfWidthAt(s);
		if (o <= c - H.branchLeaveMargin) return {
			t: s,
			branch: r.index
		};
		let l = H.branchHysteresis, u = o - c;
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
			i.d2 < n.d2 - H.branchHysteresis * H.branchHysteresis && (n = i, t = r.index);
		}
		return {
			t: n.t,
			branch: t
		};
	}
};
//#endregion
//#region src/ai-driver/constants.ts
function Yr(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = Yr(r.properties));
	return t;
}
function Xr(e) {
	if (e && typeof e == "object") for (let t of Object.values(e)) Xr(t);
	return Object.freeze(e);
}
var G = Xr(Yr(w.properties.ai.properties)), Zr = G.profiles;
function Qr(e) {
	return e === 50 ? "easy" : e === 100 ? "normal" : "hard";
}
function $r(e) {
	let [t, n] = G.drift.tierBySkill;
	return e < t ? 1 : e < n ? 2 : 3;
}
//#endregion
//#region src/ai-driver/rng.ts
function ei(e, t) {
	return (Math.imul(e | 0, 2654435761) ^ Math.imul(t + 1, 2246822519)) >>> 0;
}
function ti(e) {
	return e + 1831565813 >>> 0;
}
function ni(e) {
	let t = e;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), (t ^ t >>> 14) >>> 0;
}
function ri(e) {
	return e.rng = ti(e.rng), ni(e.rng);
}
function ii(e) {
	return e.driftRng = ti(e.driftRng), ni(e.driftRng) / 4294967296;
}
function ai(e, t, n) {
	return ni((e ^ Math.imul(t + 1, 2654435761) ^ Math.imul(n + 1, 2246822519)) >>> 0) / 4294967296;
}
function oi(e) {
	return ri(e) / 4294967296;
}
function K(e, t, n) {
	return t + (n - t) * oi(e);
}
//#endregion
//#region src/ai-driver/drift.ts
function si(e, t) {
	let n = e - t;
	return n > 1e-9 ? n : 0;
}
function ci(e, t) {
	return e.steerRate * (e.driftSteerMin + (e.driftSteerMax - e.driftSteerMin) * t);
}
function li(e, t) {
	return Math.max(1, Math.min(Math.abs(e.speed), t.topSpeed * G.drift.planTop));
}
function ui(e) {
	return Math.min($r(e), G.drift.minTier);
}
function di(e, t, n) {
	let r = G.drift, i = li(e, t), a = Number.isFinite(n.bendMetres), o = a ? Math.max(0, n.bendStart - i * r.hopLead) : 0, s = Math.min(a ? n.bendMetres : Infinity, n.airMetres - i * r.airLead), c = Math.min(r.maxHold, (s - o) / i) - t.hopSeconds;
	if (!(c > 0)) return 0;
	let l = a && n.bendMetres > o ? n.bendAngle * i / (n.bendMetres - o + 1e-9) : Math.abs(n.turnNear) / G.line.turnNearSeconds, u = ci(t, 0), d = ci(t, .5), f = e.drift.chargeMultiplierRemaining > 0 ? e.drift.chargeMultiplier : 1;
	if (l - u < r.easePlan) {
		let e = Math.sqrt(2 * n.halfWidth * r.sweepRoom / (i * Math.max(.001, d - l)));
		return zn(t.chargeFull * 60 * f * Math.min(c, e), t.driftTiers);
	}
	let p = q((l - u) / (d - u), 0, 1);
	return zn((t.chargeFull * p + t.chargeNeutral * (1 - p)) * 60 * f * c, t.driftTiers);
}
function fi(e, t, n, r, i = n.skill) {
	let a = r.turnNear, o = r.turnFar;
	return Math.abs(o) <= n.driftThreshold || Math.abs(a) <= n.driftThreshold * .5 || Math.sign(a) !== Math.sign(o) || r.hazardInLane || r.bendHalfWidth < G.line.narrowRoad ? !1 : di(e, t, r) >= ui(i);
}
function pi(e, t, n, r) {
	return fi(e, t, n, r) && r.bendStart <= Math.abs(e.speed) * G.drift.hopLead;
}
function mi(e, t, n, r) {
	return fi(e, t, n, r) ? Math.abs(r.turnNear) / G.line.turnNearSeconds < ci(t, .5) : !1;
}
function hi(e, t) {
	return Number.isFinite(t.bendMetres) && t.bendMetres > Math.max(1, Math.abs(e.speed)) * G.drift.chainSeconds;
}
function gi(e, t) {
	return e > 0 ? Math.max(e, t * G.drift.useBySkill) : 0;
}
function _i(e, t, n, r, i) {
	if (n.driftDir !== 0) return;
	let a = i.turnFar;
	if (n.driftPlan !== 0) {
		if (Math.abs(a) <= r.driftThreshold || Math.sign(a) !== n.driftPlanSide) n.driftPlan = 0;
		else {
			let r = i.turnShort * n.driftPlanSide * Math.abs(e.speed) * (t.hopSeconds + t.driftYawLag) / G.line.lookAheadMin > G.drift.hopMidBend;
			n.driftPlan === 1 && r && n.driftCooldown === 0 && (n.driftPlan = hi(e, i) ? 2 : -1);
			return;
		}
	}
	i.narrow || i.nearNarrowBranch || !fi(e, t, r, i, n.skill) || (n.driftPlan = ii(n) < gi(n.personality.driftUse, n.skill) ? 1 : -1, n.driftPlanSide = Math.sign(a));
}
function vi(e, t, n, r, i, a, o, s) {
	let c = G.drift;
	if (n.driftCooldown = si(n.driftCooldown, s), o.drift = !1, n.driftDir === 0) {
		if (n.driftCooldown > 0 || !e.grounded || e.drift.phase !== "idle" || i.narrow || i.nearNarrowBranch || i.airAhead || i.hazardInLane || e.speed < t.driftMinSpeed * a) return;
		let s = i.turnNear, l = i.turnFar;
		if (!(Math.abs(l) > r.driftThreshold && Math.abs(s) > r.driftThreshold * .5 && Math.sign(s) === Math.sign(l)) || i.bendStart > Math.abs(e.speed) * c.hopLead || i.myLat * Math.sign(l) > i.halfWidth - c.apexMargin - c.hopRoom) return;
		let u = Math.sign(l), d = Math.abs(e.speed), f = i.turnShort * u;
		if (Math.abs(i.course) > c.hopAlign) return;
		let p = Math.abs(f) / G.line.lookAheadMin * d * (t.hopSeconds + t.driftYawLag);
		if (f > 0 ? p > c.hopMidBend : p > c.hopMidBend * .5) return;
		let m = Math.min($r(n.skill), di(e, t, i));
		if (m < ui(n.skill) || n.driftPlan < 1) return;
		n.driftDir = s > 0 ? 1 : -1, n.driftTier = m, n.driftHold = 0, o.drift = !0, o.steer = n.driftDir;
		return;
	}
	let l = n.driftDir;
	n.driftHold += s, o.drift = !0;
	let u = t.hopSeconds * t.hopLandWindow + s;
	if (e.drift.phase === "idle" && n.driftHold > u) {
		bi(n, c.abortCooldown, o, "abort");
		return;
	}
	if (n.driftHold <= c.hopCommit || e.drift.phase !== "drifting") {
		o.steer = l * c.hopCommitStick;
		return;
	}
	n.driftTier = Math.max(n.driftTier, Math.min($r(n.skill), di(e, t, i)));
	let d = Math.max(Math.abs(e.speed), 1), f = Pn(e.speed, a, t), p = i.turnNear * l / G.line.turnNearSeconds, m = i.myLat * l, h = i.course * l, g = i.dodging || i.hazardInLane ? n.lateral * l : Math.max(0, i.halfWidth - c.apexMargin), _ = t.driftYawLag + 1 / t.gripDrift, v = h + (ci(t, e.drift.yawK) * f - p) * _, y = Math.max(c.easeMin, p - ci(t, 0) * f), b = g - m - d * h * _, x = Math.sign(b) * Math.min(c.latCourseMax, Math.sqrt(2 * y * Math.abs(b) / d)), S = q(((p + c.aimGain * (x - v)) / (t.steerRate * f) - t.driftSteerMin) / (t.driftSteerMax - t.driftSteerMin), 0, 1);
	if (S < .5 && e.drift.tier < n.driftTier) {
		let n = yi(e, t, l, d, f, p, m, h), r = e.drift.chargeMultiplierRemaining > 0 ? e.drift.chargeMultiplier : 1, a = (t.driftTiers[Math.min(e.drift.tier, t.driftTiers.length - 1)] - e.drift.charge) / (t.chargeFull * 60 * r) <= c.chargeSecondsAhead && n < i.halfWidth - c.edgeMargin - c.snapRoom;
		(n < g || a) && (S = .5);
	}
	o.steer = l * Nn(S), S >= 1 && h < -c.wideLift && (o.throttle = 0, h < -2 * c.wideLift && (o.brake = 1));
	let C = i.open & (l > 0 ? 1 : 2) ? i.halfWidth + c.outsideSlack : Math.min(i.halfWidth + c.outsideSlack, i.wall - t.kartRadius - c.wallMargin), w = Math.sign(i.turnNear === 0 ? i.turnFar : i.turnNear) !== l || i.bendMetres < d * c.exitLead, T = e.wallCooldown > 0 && e.wallCooldown > t.wallCooldownSeconds - n.driftHold, E = i.roadErr, D = e.drift.tier, O = D >= n.driftTier && D >= $r(n.skill) ? "tier" : w && (D >= 1 || n.driftHold > c.hopCommit + t.driftYawLag) ? "aligned" : T ? "wall" : E * l < -c.overRotate ? "over" : D >= 1 && Math.abs(E) < c.aligned && i.kappaShort * Math.abs(e.speed) < c.exitYawFraction * ci(t, 0) ? "aligned" : m > i.halfWidth - c.edgeMargin || -m > C ? "edge" : n.driftHold > c.maxHold ? "hold" : i.hazardInLane && Math.abs(n.lateral - i.myLat) > c.hazardMiss ? "hazard" : i.airMetres < d * c.airLead ? "air" : "none";
	O !== "none" && (bi(n, D === 0 ? c.abortCooldown : c.cooldown, o, O), O === "tier" && hi(e, i) && (n.driftPlan = 2, n.driftPlanSide = l));
}
function yi(e, t, n, r, i, a, o, s) {
	let c = G.drift, l = c.swingStep, u = 1 - nn(-l / t.driftYawLag), d = e.drift.yawK, f = -St(e.lateralVelocity, r) * n, p = o, m = s, h = o;
	for (let e = 0; e < c.swingSeconds; e += l) {
		d -= d * u;
		let e = t.steerRate * (t.driftSteerMin + (t.driftSteerMax - t.driftSteerMin) * d) * i;
		if (f += (e - t.gripDrift * f) * l, m += (t.gripDrift * f - a) * l, p += r * m * l, p > h && (h = p), m < 0) break;
	}
	return h;
}
function bi(e, t, n, r) {
	e.driftDir = 0, e.driftPlan = -1, e.driftHold = 0, e.driftCooldown = t, e.driftEndReason = r, n.drift = !1;
}
function xi(e, t, n, r, i) {
	if (e.grounded || e.airborne.fromJumpId === void 0) {
		t.trickRolled = !1, t.trickDone = !1;
		return;
	}
	if (t.driftDir === 0 && (t.trickRolled || (t.trickRolled = !0, t.trickDone = oi(t) >= n.trickChance, i && i.airAhead && Math.abs(i.turnNear) > G.line.trickBend && (t.trickDone = !0)), !t.trickDone)) {
		if (e.prevDrift) {
			r.drift = !1;
			return;
		}
		r.drift = !0, t.trickDone = !0;
	}
}
//#endregion
//#region src/ai-driver/line.ts
function q(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function Si(e) {
	for (; e > Math.PI;) e -= 2 * Math.PI;
	for (; e < -Math.PI;) e += 2 * Math.PI;
	return e;
}
function Ci(e) {
	let t = G.line;
	return q(Math.abs(e) * t.lookAheadGain, t.lookAheadMin, t.lookAheadMax);
}
var wi = 5, Ti = /* @__PURE__ */ new WeakMap();
function Ei(e) {
	let t = Ti.get(e);
	return t || (t = e.branches.list.map((e, t) => t > 0 && e.lut.sample(.5, 0).halfWidth < G.line.narrowRoad), Ti.set(e, t)), t;
}
function Di(e, t, n, r, i, a) {
	let o = G.line, s = t.length, c = n.branchChoice > 0 ? n.branchChoice : e.branch, l = Math.max(Math.abs(e.speed), wi);
	t.sampleInto(e.t, 0, e.branch, r.here), t.sampleInto(U(e.t + l * o.turnNearSeconds / s), 0, c, r.near), t.sampleInto(U(e.t + l * o.turnFarSeconds / s), 0, c, r.far);
	let u = z(r.here.tangent);
	i.turnNear = Si(z(r.near.tangent) - u), i.turnFar = Si(z(r.far.tangent) - u), i.probeNear = l * o.turnNearSeconds, t.sampleInto(U(e.t + o.lookAheadMin / s), 0, c, r.short);
	let d = z(r.short.tangent), f = Si(d - u);
	if (i.kappaShort = Math.abs(f) / o.lookAheadMin, i.turnShort = f, i.kappa = Math.max(i.kappaShort, Math.abs(i.turnNear) / i.probeNear), e.branch !== 0 && !e.grounded) {
		let n = t.branches.list[e.branch], a = W(n.exitT, e.t) * s;
		if (a > 0) {
			let s = z(t.sampleInto(n.exitT, 0, e.branch, r.tmp).tangent), c = Math.abs(Si(z(t.sampleInto(n.exitT, 0, 0, r.tmp).tangent) - s));
			i.kappa = Math.max(i.kappa, c / Math.max(o.joinShare * a, o.lookAheadMin));
		}
	}
	i.roadErr = Si(d - e.heading), i.course = Si(e.heading + St(e.lateralVelocity, Math.max(1, Math.abs(e.speed))) - u), i.halfWidth = r.here.halfWidth, i.wall = r.here.wall ?? r.here.halfWidth, i.open = r.here.open ?? 0, i.narrow = r.here.halfWidth < o.narrowRoad, i.airAhead = !1, i.airMetres = Infinity;
	for (let n of t.jumps) {
		if (!n.rise || (n.branch ?? 0) !== c) continue;
		let t = U(n.t - e.t) * s;
		t < i.probeNear + (n.run ?? 0) && (i.airAhead = !0), i.airMetres = Math.min(i.airMetres, Math.max(0, t - (n.run ?? 0)));
	}
	let p = Math.sign(i.turnNear === 0 ? i.turnFar : i.turnNear), m = 0, h = 0, g = 0;
	i.bendStart = Infinity;
	let _ = a ? G.drift.startYawFraction * ci(a, .5) / Math.min(l, a.topSpeed * G.drift.planTop) : Infinity;
	i.bendHalfWidth = r.here.halfWidth, i.kappaShort >= _ && (i.bendStart = 0);
	let v = l * o.bendSeconds;
	if (p !== 0) for (let n = o.bendStep; n <= v; n += o.bendStep) {
		let a = Si(z(t.sampleInto(U(e.t + n / s), 0, c, r.tmp).tangent) - u) * p;
		if (i.bendStart === Infinity && (a - g) / o.bendStep >= _ && (i.bendStart = n - o.bendStep / 2, i.bendHalfWidth = r.tmp.halfWidth), g = a, a > m + .001) m = a, h = n;
		else if (a < m - o.bendBack) break;
	}
	i.bendAngle = m, i.bendMetres = h;
	let y = Ci(e.speed), b = e.branch !== 0 || n.branchChoice > 0, x = Ei(t), S = e.branch !== 0 && x[e.branch] || n.branchChoice > 0 && x[n.branchChoice];
	i.branchAhead = 0, i.branchSide = 0;
	let C = t.branches.list;
	for (let n = 1; n < C.length; n++) {
		let a = C[n];
		if (!a.open) continue;
		let o = W(a.entryT, e.t) * s, c = W(a.exitT, e.t) * s;
		if ((o > -y && o < y || c > -y && c < y) && (b = !0, x[n] && (S = !0)), e.branch === 0 && o > 0 && o < y && i.branchAhead === 0) {
			let e = U(a.entryT + a.span * .25), o = t.sampleInto(e, 0, n, r.tmp).position, s = t.sampleInto(e, 0, 0, r.ahead), c = (o[0] - s.position[0]) * s.tangent[2] - (o[2] - s.position[2]) * s.tangent[0];
			i.branchAhead = n, i.branchSide = c > .3 ? 1 : c < -.3 ? -1 : 0;
		}
	}
	(i.narrow || b) && (y = Math.max(o.lookAheadMin, y * o.narrowLookAhead)), i.L = y, i.nearBranch = b, i.nearNarrowBranch = S, i.branch = c;
	let w = r.here.tangent, T = r.here.position;
	return i.myLat = (e.position[0] - T[0]) * w[2] - (e.position[2] - T[2]) * w[0], i;
}
function Oi(e, t, n, r, i, a) {
	let o = G.line;
	if (e.branch !== 0 || i.narrow || n.branchChoice > 0 || e.surface === "dirt" || e.surface === "mud") return 0;
	let s = i.halfWidth, c = n.personality.lateralBias * o.laneHalfFraction * s;
	if (n.driftDir === 0 && n.driftPlan === 1 && mi(e, t, r, i)) return -Math.sign(i.turnFar) * o.outsideFraction * s;
	let l = q(i.turnNear * o.insideGain, -o.insideBiasMax, o.insideBiasMax) * s, u = n.wanderAmp * F(2 * Math.PI * a / n.wanderPeriod + n.wanderPhase), d = o.lateralMaxFraction * s;
	return q(c + l + u, -d, d);
}
function ki(e, t, n, r, i, a) {
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
		let r = W(t.entryT, e.t) * s;
		(n.branchChoice > 0 ? r < -G.line.branchCommitMetres : r < 0) && (n.branchChoice = 0);
		return;
	}
	for (let t = 1; t < o.length; t++) {
		let c = o[t];
		if (!c.open) continue;
		let l = W(c.entryT, e.t) * s;
		if (l <= 0 || l > 2 * i.L) continue;
		let u = c.lut.sample(.5, 0).halfWidth < G.line.narrowRoad, d = n.skill >= r.shortcutSkill;
		n.branchChoice = (a === void 0 ? d && (n.rb >= G.rubber.shortcutRb || !u && (n.skill >= G.line.shortcutSure || ai(n.seed, t, e.lap) < n.personality.aggression)) : c.id === a) ? t : -t;
		return;
	}
}
//#endregion
//#region src/ai-driver/avoid.ts
function Ai(e, t, n, r) {
	let i = e.track.sampleInto(t, 0, n, e.sc.tmp), a = i.tangent, o = i.position;
	return (r[0] - o[0]) * a[2] - (r[2] - o[2]) * a[0];
}
function ji(e, t) {
	return e > .05 ? -1 : e < -.05 || t >= e ? 1 : -1;
}
function Mi(e, t, n, r) {
	return Math.abs(e - t) >= n ? e : t + ji(t, r) * n;
}
var Ni = [], Pi = [], Fi = [], Ii = [], Li = [], Ri = [], zi = 1e-6;
function Bi(e, t, n, r, i, a, o) {
	let s = e, c = -1, l = !0, u = Infinity, d = !0, f = 2 * D.kartRadius, p = i * (i - 1) >> 1, m = 2 * (i + a + 1);
	for (let h = 0; h < m + p; h++) {
		let p;
		if (h < m) {
			let e = h >> 1, t = h & 1 ? 1 : -1;
			p = q(e < i ? Ni[e] + t * r : e < i + a ? Li[e - i] + t * Ri[e - i] : t * n, -n, n);
		} else {
			let e = h - m, t = 0;
			for (; e >= i - 1 - t;) e -= i - 1 - t, t++;
			p = q((Ni[t] + Ni[t + 1 + e]) / 2, -n, n);
		}
		let g = r, _ = !1, v = !1;
		for (let e = 0; e < i; e++) g = Math.min(g, Math.abs(p - Ni[e])), (Ni[e] - t) * (Ni[e] - p) < 0 && Math.abs(Ni[e] - t) + f > Pi[e] / Math.max(1, o) * G.avoid.crossRate && (v = !0);
		g < f && (v = !0);
		for (let e = 0; e < a; e++) Math.abs(p - Li[e]) < Ri[e] - zi && (_ = !0);
		let y = Math.abs(p - e) + Math.abs(p - t);
		(v === d ? g > c + zi || g > c - zi && (_ === l ? y < u : !_) : !v) && (s = p, c = g, l = _, u = y, d = v);
	}
	return s;
}
function Vi(e, t, n, r, i, a, o = 0) {
	let s = G.avoid, { track: c, karts: l } = t, u = c.length, d = n.halfWidth, f = D.kartRadius, p = Math.max(.5, d - f - .2), m = Math.min(s.stoppedClearance, p), h = Math.min(2 * f + .3, p), g = 0;
	for (let n = 0; n < l.length; n++) {
		let r = l[n];
		if (r === e || r.isGhost || r.branch !== e.branch) continue;
		let i = W(r.t, e.t) * u;
		i <= 0 || i > s.seekDistance || (Fi[g] = i, Ii[g++] = Ai(t, r.t, r.branch, r.position));
	}
	let _ = c.features, v = Infinity, y = a, b = 0, x = Infinity, S = Infinity, C = a;
	for (let i = 0; i < _.length; i++) {
		let c = _[i];
		if (c.branch !== e.branch) continue;
		let l = 0;
		if (c.kind === "coin") {
			if (e.coins >= D.coinCap) continue;
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
		let p = W(c.t, e.t) * u;
		if (!(p <= 0 || p > s.seekDistance)) {
			if (l === 2) {
				if (Math.abs(c.lateral - n.myLat) > Math.max(s.seekLateral, p * s.seekSlope) || Math.abs(c.lateral) > d - f) continue;
				let e = !1;
				for (let t = 0; t < g; t++) if (Fi[t] < p && Math.abs(Ii[t] - c.lateral) < s.claimWidth) {
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
		let o = W(i.t, e.t) * u;
		if (o <= 0 || o > s.stoppedLookAhead || i.branch !== e.branch) continue;
		if (i.speed < s.slowKartSpeed || i.status.spinRemaining > 0 || i.status.intangibleRemaining > 0 || i.finishTick !== void 0) {
			Pi[w] = o, Ni[w++] = Ai(t, i.t, i.branch, i.position);
			continue;
		}
		if (o > s.avoidLookAhead) continue;
		let c = Ai(t, i.t, i.branch, i.position);
		n.narrow || n.nearBranch || o > s.passDistance || (e.speed - i.speed > s.passClosing || o < s.touchDistance ? a = Mi(a, c, h, n.myLat) : x === Infinity && o <= D.slipstreamLength && Math.abs(a - c) < D.slipstreamHalfWidth && (a = c));
	}
	if (i < 0 && n.branchAhead === -i && n.branchSide !== 0) {
		let e = G.line.declineFraction * d;
		a * -n.branchSide < e && (a = -n.branchSide * e);
	}
	let T = Math.abs(e.speed), E = Math.max(s.hazardLookAhead, T * s.hazardSeconds), O = T * G.drift.hazardSeconds, ee = Math.sign(n.turnNear) * Math.max(0, d - G.drift.apexMargin), k = Math.min(n.myLat, ee), te = Math.max(n.myLat, ee);
	n.hazardInLane = !1, n.dodging = !1, n.hopRing = !1;
	let ne = a, A = 0, j = t.hazards;
	if (j.length) {
		let r = Math.max(s.rollingLookAhead, E, O) / u + .02;
		for (let i = 0; i < j.length; i++) {
			let o = j[i];
			if (o.type === "gust" || o.type === "vent") continue;
			if (o.ground) {
				I(o.position[0] - e.position[0], o.position[2] - e.position[2]) - o.radius - f < T * s.ringHop && (n.hopRing = !0);
				continue;
			}
			let l = o.type === "static" || o.type === "falling", m = o.type === "rolling" ? s.rollingLookAhead : l ? E : s.hazardLookAhead, h = c.nearestT(o.position, e.t, r), g = W(h, e.t) * u;
			if (g <= 0 || g > (l ? Math.max(m, O) : m)) continue;
			let _ = Ai(t, h, 0, o.position);
			if (Math.abs(_) > d + o.radius) continue;
			let v = Math.min(s.dodgeClearance + o.radius, p);
			l && _ > k - v && _ < te + v && (n.hazardInLane = !0), !(g > m) && (a = Mi(a, _, v, n.myLat), l && (Li[A] = _, Ri[A++] = v));
		}
	}
	let re = c.def.hazards;
	if (re) for (let t = 0; t < re.length; t++) {
		let r = re[t];
		if (r.type !== "rolling" && r.type !== "falling") continue;
		let i = W(r.t, e.t) * u, o = Math.min(s.dodgeClearance + H.hazardRadius, p);
		r.type === "rolling" && i > 0 && i - (r.speed ?? 0) * (r.period ?? 1) < s.stoppedLookAhead && (Li[A] = r.lateral ?? 0, Ri[A++] = o), r.type === "falling" && i > 0 && i < O && (r.lateral ?? 0) > k - o && (r.lateral ?? 0) < te + o && (n.hazardInLane = !0), !(i < -s.spawnBehind || i > s.hazardLookAhead) && (a = Mi(a, r.lateral ?? 0, o, n.myLat), Li[A] = r.lateral ?? 0, Ri[A++] = o);
	}
	let ie = Math.max(0, Math.min(d - G.line.edgeMargin, d - f - .3));
	Math.abs(a - ne) > zi && (n.dodging = !0), a = q(a, -ie, ie);
	for (let e = 0; e < w; e++) if (Math.abs(a - Ni[e]) < m - zi) return n.dodging = !0, Bi(a, n.myLat, ie, m, w, A, T);
	return a;
}
//#endregion
//#region src/ai-driver/items.ts
function Hi(e, t) {
	return Si(St(t.position[0] - e.position[0], t.position[2] - e.position[2]) - e.heading);
}
function Ui(e, t) {
	return I(e.position[0] - t.position[0], e.position[2] - t.position[2]);
}
var Wi = /* @__PURE__ */ new Set([
	"forward",
	"rearDrop",
	"deception",
	"runner"
]);
function Gi(e, t, n, r, i, a) {
	let o = e.item.held;
	if (o !== t.lastItem) return t.lastItem = o, t.itemHold = 0, t.itemPressed = t.itemTrailing = !1, t.reactionRemaining = o === "none" ? 0 : K(t, n.reactionMin, n.reactionMax) * (1 - t.skill), !1;
	if (o === "none" || e.item.rouletteRemaining > 0 || e.item.charges <= 0) return t.itemPressed = t.itemTrailing = !1, !1;
	if (t.itemHold += a, t.reactionRemaining > 0) return t.reactionRemaining -= a, !1;
	let s = i.roles[o];
	if (!s) return !1;
	if (t.itemPressed && !t.itemTrailing) return t.itemPressed = !1, !1;
	let c = G.items, l = Infinity, u = Infinity, d = Infinity, f = Infinity, p = 0, m = R(e.heading);
	for (let t of i.karts) {
		if (t === e || t.isGhost || t.finishTick !== void 0) continue;
		let n = Ui(e, t);
		f = Math.min(f, n);
		let r = t.position[0] - e.position[0], i = t.position[2] - e.position[2];
		r * m[0] + i * m[2] > 0 ? (n < l && (p = Hi(e, t)), l = Math.min(l, n), Math.abs(Hi(e, t)) < c.forwardCone && (u = Math.min(u, n))) : d = Math.min(d, n);
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
	if (Wi.has(s)) {
		if (!v) return t.itemTrailing = t.itemPressed = !0, !0;
		if (t.itemTrailing) return t.itemTrailing = t.itemPressed = !1, !1;
	}
	return v && (t.itemPressed = !0), v;
}
//#endregion
//#region src/ai-driver/personalities.ts
var Ki = Object.freeze({
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
function qi(e, t) {
	let n = Ki[e];
	return n ? { ...n } : {
		lateralBias: K(t, -.5, .5),
		aggression: K(t, .3, .7),
		driftUse: K(t, .5, .9)
	};
}
//#endregion
//#region src/ai-driver/rubber.ts
function Ji(e) {
	let t = G.rubber, n = Math.abs(e);
	if (n <= t.deadZone) return 1;
	let r = pn((n - t.deadZone) / t.scale);
	return e > 0 ? 1 + (t.max - 1) * r : 1 - (1 - t.min) * r;
}
function Yi(e, t) {
	let n = e.skill + (t - 1) * G.rubber.skillGain;
	return n < 0 ? 0 : n > 1 ? 1 : n;
}
function Xi(e, t) {
	let n = t / G.rubber.powerFrom;
	return e.power * (n < 1 ? n : 1);
}
var Zi = {
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
function Qi(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = Qi(r.properties));
	return t;
}
var J = Object.freeze(Qi(Dr.properties.constants.properties));
Object.freeze([...Zi.properties.gpPointsByRank.default]), Object.freeze([...Zi.properties.knockoutSets.items.properties.cutLines.default]), Zi.properties.knockoutSets.items.properties.lapsPerSegment.default, Object.freeze([
	.6,
	.8,
	1
]);
//#endregion
//#region src/ai-driver/speed.ts
function $i(e) {
	return .55 + .35 * e;
}
function ea(e, t, n, r, i) {
	if (e <= 1e-6) return Infinity;
	let a = n.steerRate * r * (i ? n.driftSteerMax / (1 - n.steerFalloff) : 1);
	return a / (e + a * n.steerFalloff / t);
}
function ta(e, t, n, r, i, a) {
	let o = pr(e, t), s = o.target, c = e.drift.phase === "drifting" || i, l = $i(n.skill) * (r.narrow ? G.line.narrowMargin : 1) * (r.airAhead && !c ? G.line.airMargin : 1), u = ea(r.kappa, o.base, t, l, c);
	a.legal = s, a.corner = u, a.target = Math.min(n.powerCap * n.fieldPace * s, Math.max(u, na));
	let d = Math.sign(r.turnNear);
	return !c && d !== 0 && e.grounded && r.halfWidth - r.myLat * -d < G.line.edgeLift && r.roadErr * d > 0 && (a.target = Math.min(a.target, Math.max(na, e.speed - G.line.edgeShed))), a;
}
var na = 4;
function ra(e, t, n, r) {
	if (r.brake = 0, e.speed <= J.stuckSpeed) {
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
function ia(e, t) {
	return Si(St(t[0] - e.position[0], t[2] - e.position[2]) - e.heading);
}
function aa(e, t, n, r, i, a, o) {
	let s = G.steer, c = ia(e, t), l = q((c - n.prevErr) / o, -s.dErrMax, s.dErrMax);
	n.prevErr = c, n.noise += (K(n, -r, r) - n.noise) * s.noiseSmoothing;
	let u = q(s.kLat * a, -s.kLatMax, s.kLatMax);
	return q((s.kP * c + s.kD * l + u) * i + n.noise, -1, 1);
}
//#endregion
//#region src/ai-driver/recover.ts
function oa(e, t, n, r) {
	let i = G.recover;
	return t.recovery === "reverse" ? (t.recoverTimer -= r, n.throttle = 0, n.brake = 1, n.drift = !1, n.steer = t.prevErr > 0 ? -1 : 1, t.recoverTimer <= 1e-9 && (t.recovery = "cooldown", t.recoverTimer = i.cooldownSeconds), !0) : t.recovery === "cooldown" ? (t.recoverTimer -= r, t.recoverTimer <= 1e-9 && (t.recovery = "none", t.recoverTimer = 0), t.stuckSeconds = 0, !1) : (t.stuckSeconds = e.grounded && e.status.spinRemaining === 0 && e.status.intangibleRemaining === 0 && Math.abs(e.speed) < J.stuckSpeed ? t.stuckSeconds + r : 0, t.stuckSeconds + 1e-9 >= i.stuckSeconds && (t.stuckSeconds = 0, t.recovery = "reverse", t.recoverTimer = i.reverseSeconds, t.driftDir = 0, n.throttle = 0, n.brake = 1, n.drift = !1, n.steer = t.prevErr > 0 ? -1 : 1, !0));
}
//#endregion
//#region src/ai-driver/types.ts
function sa() {
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
function ca() {
	return {
		ahead: sa(),
		near: sa(),
		far: sa(),
		here: sa(),
		short: sa(),
		tmp: sa()
	};
}
function la() {
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
		wall: Infinity,
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
var ua = 625341585, da = Object.freeze({
	...Zr.normal,
	skill: G.autopilot.skill,
	power: G.autopilot.power
});
function fa(e, t, n, r, i, a) {
	let o = {
		seed: ei(e, t),
		rng: ei(e, t),
		driftRng: ei(e, t) ^ ua,
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
	return o.personality = a ? { ...a } : qi(n, o), o.startPress = r.startPressMean + K(o, -r.startPressSpread, r.startPressSpread), o.wanderAmp = K(o, G.line.wanderAmpMin, G.line.wanderAmpMax), o.wanderPeriod = K(o, G.line.wanderPeriodMin, G.line.wanderPeriodMax), o.wanderPhase = K(o, 0, 2 * Math.PI), o.balloonPick = Math.max(-1, Math.min(1, o.personality.lateralBias + K(o, -G.avoid.pickSpread, G.avoid.pickSpread))), o;
}
var pa = class {
	track;
	profile;
	onlyShortcut;
	memory;
	consts;
	outputs;
	playerIndex;
	sc = ca();
	line = la();
	speed = {
		legal: 0,
		target: 0,
		corner: Infinity
	};
	avoidCtx;
	itemCtx;
	threatened = [];
	constructor(e, t, n, r = {}) {
		this.track = e, this.profile = r.profile ?? Zr[Qr(t.speedClass)], this.onlyShortcut = r.onlyShortcut;
		let i = new Map(t.racers.map((e) => [e.racerId, e])), a = n.karts;
		this.consts = a.map((e) => O(i.get(e.racerId)?.archetype ?? "medium", t.speedClass)), this.outputs = a.map(() => ({ ...mn })), this.playerIndex = a.findIndex((e) => e.isPlayer);
		let o = a.map((e, t) => t).filter((e) => !a[e].isPlayer && !a[e].isGhost), s = o.map((e, t) => 1 - G.rubber.fieldPaceSpread * t / Math.max(1, o.length - 1)), c = { rng: ei(n.seed, 24301) };
		for (let e = s.length - 1; e > 0; e--) {
			let t = Math.floor(oi(c) * (e + 1));
			[s[e], s[t]] = [s[t], s[e]];
		}
		let l = new Map(o.map((e, t) => [e, s[t]]));
		this.memory = a.map((e, t) => fa(n.seed, n.trackers[t]?.gridSlot ?? t, e.racerId, this.profile, l.get(t) ?? 1, r.personalities?.[e.racerId]));
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
		let a = this.memory[n], o = this.consts[n], s = gr, c = t.finishTick !== void 0, l = c ? da : this.profile;
		if (i.steer = 0, i.throttle = 0, i.brake = 0, i.drift = !1, i.item = !1, i.lookBack = !1, i.horn = !1, e.phase === "countdown") {
			i.throttle = +(e.time >= -a.startPress);
			return;
		}
		if (t.status.spinRemaining > 0) return;
		let u = r && !c ? r.distanceAlong - t.distanceAlong : 0;
		a.rb = Ji(u), a.skill = Yi(l, a.rb), a.powerCap = Xi(l, a.rb);
		let d = Di(t, this.track, a, this.sc, this.line, o);
		ki(t, this.track, a, l, d, this.onlyShortcut), c || _i(t, o, a, l, d);
		let f = Oi(t, o, a, l, d, e.tick / 120);
		f = Vi(t, this.avoidCtx, d, a.skill, a.branchChoice, f, a.balloonPick);
		let p = G.line.laneRate * s, m = f - a.lateral;
		a.lateral += m > p ? p : m < -p ? -p : m;
		let h = this.track.sampleInto(U(t.t + d.L / this.track.length), a.lateral, d.branch, this.sc.ahead).position, g = t.surface === "dirt" || t.surface === "mud";
		i.steer = aa(t, h, a, l.noise * (1 - a.skill), g ? G.steer.offroadGain : 1, a.lateral - d.myLat, s);
		let _ = ta(t, o, a, d, !c && a.driftDir === 0 && a.driftCooldown === 0 && a.driftPlan === 1 && !d.narrow && !d.nearNarrowBranch && !d.airAhead && pi(t, o, l, d), this.speed);
		ra(t, _, l, i), c || (vi(t, o, a, l, d, _.legal, i, s), xi(t, a, l, i, d), d.hopRing && a.driftDir === 0 && t.grounded && t.drift.phase === "idle" && !t.prevDrift && a.skill >= G.avoid.ringSkill && (i.drift = !0)), c || (this.itemCtx.gap = u, this.itemCtx.threatened = this.threatened[n] === !0, i.item = Gi(t, a, l, d, this.itemCtx, s)), oa(t, a, i, s);
	}
};
//#endregion
//#region src/track-builder/features.ts
function ma(e, t) {
	if (!t) return 0;
	let n = e.byId(t);
	if (!n) throw Error(`feature names unknown shortcut "${t}"`);
	return n.index;
}
function ha(e, t, n, r, i, a) {
	let o = ma(e, r.shortcut), s = r.lateral ?? 0, c = r.t, l = e.sample(c, s, o);
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
function ga(e, t) {
	let n = [];
	return (e.pickups ?? []).forEach((e, r) => n.push({
		...ha(t, "pickup", `pickup-${r}`, e, H.balloonRadius * 2, 0),
		...e.double ? { double: !0 } : {}
	})), (e.coins ?? []).forEach((e, r) => n.push(ha(t, "coin", `coin-${r}`, e, H.coinRadius * 2, 0))), (e.boostPads ?? []).forEach((e, r) => n.push(ha(t, "boostPad", `pad-${r}`, e, e.width ?? H.boostPadWidth, 0))), (e.jumps ?? []).forEach((e) => n.push(_a(t, e))), n;
}
function _a(e, t) {
	let n = t.shape === "hump";
	return {
		...ha(e, "jump", t.id, t, t.width ?? H.boostPadWidth, t.launch),
		shape: n ? "hump" : "ramp",
		run: t.run ?? (n ? H.humpRun : H.rampRun),
		rise: t.rise ?? (n ? H.humpRise : H.rampRise),
		...n ? { edge: H.humpEdge } : {}
	};
}
function va(e, t, n, r) {
	let i = e.sample(t, 0, n), a = i.tangent[2], o = -i.tangent[0], s = I(a, o) || 1;
	return ((r[0] - i.position[0]) * a + (r[2] - i.position[2]) * o) / s;
}
function ya(e, t) {
	for (let n of e) {
		let e = t.list[n.branch] ?? t.main;
		n.t = e.nearestGlobal(n.position).t, n.lateral = va(t, n.t, e.index, n.position);
	}
}
function ba(e) {
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
function xa(e) {
	return e.filter((e) => e.kind === "boostPad").map((e) => ({
		t: e.t,
		lateral: e.lateral,
		halfWidth: e.width / 2,
		branch: e.branch
	}));
}
//#endregion
//#region src/track-builder/shift.ts
var Sa = (e, t, n) => U(e - t) <= U(n - t), Ca = 2;
function wa(e, t, n) {
	let r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of n) {
		let n = [];
		for (let r = 0; r < e.length; r++) Sa(t[r], a.fromT, a.toT) && n.push(r);
		let o;
		if (n.length) {
			n.sort((e, n) => U(t[e] - a.fromT) - U(t[n] - a.fromT)), o = n[0];
			for (let e of n) r.add(e);
		} else {
			o = 0;
			let n = Infinity;
			for (let r = 0; r < e.length; r++) {
				let e = U(t[r] - a.toT);
				e < n && (n = e, o = r);
			}
		}
		i.set(o, [...i.get(o) ?? [], ...a.controlPoints]);
		for (let t of [a.controlPoints[0], a.controlPoints[a.controlPoints.length - 1]]) if (t) for (let n = 0; n < e.length; n++) {
			let i = e[n];
			L(i.x - t.x, i.y - t.y, i.z - t.z) < Ca * t.halfWidth && r.add(n);
		}
	}
	let a = [];
	for (let t = 0; t < e.length; t++) {
		let n = i.get(t);
		n && a.push(...n.map((e) => ({ ...e }))), r.has(t) || a.push({ ...e[t] });
	}
	return a;
}
function Ta(e, t = []) {
	if (e.shifted) return;
	e.shifted = !0;
	let n = e.def.finalLapShift, r = e.branches, i = r.main, a = [], o = n.routeOverrides ?? [];
	if (o.length) {
		let n = t.map((e) => e.branch > 0 && r.list[e.branch] ? r.list[e.branch].toLocal(e.t) : 0), s = e.controlPoints.map((e) => i.lut.nearestTGlobal([
			e.x,
			e.y,
			e.z
		]));
		e.controlPoints = wa(e.controlPoints, s, o);
		let c = r.list.map((e) => e.lut);
		i.lut = Hr(e.controlPoints), Ea(i.lut, c);
		for (let e of o) a.push([e.fromT, e.toT]);
		for (let e of r.list) e.isMain || (e.entryT = i.lut.nearestTGlobal(e.entryPoint), e.exitT = i.lut.nearestTGlobal(e.exitPoint), e.span = U(e.exitT - e.entryT));
		e.startT = i.lut.nearestTGlobal(e.startPoint);
		let l = (e) => o.some((t) => Sa(e, t.fromT, t.toT));
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
				let i = ka(r, e.position);
				i >= 0 ? (e.t = i, e.branch = 0) : e.t = a.toMain(n[t]);
			} else e.t = i.lut.nearestTGlobal(e.position), e.branch = 0;
		}), ya(e.features, r), e.hazards.rederive();
	}
	for (let e of n.surfaceOverrides ?? []) {
		let t = Lr(e.surface), n = i.lut;
		for (let r = 0; r < n.n; r++) Sa(r / n.n, e.fromT, e.toT) && (n.surface[r] = t);
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
	for (let t of n.addsJumps ?? []) e.features.push(_a(r, t));
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
		changedRanges: a.map(([e, t]) => [U(e), U(t)])
	};
	return e.emit(c), c;
}
function Ea(e, t) {
	let n = e.n, r = e.length / e.step, i = new Float64Array(n), a = new Float64Array(n), o = new Uint8Array(n);
	for (let r = 0; r < n; r++) {
		let n = Infinity;
		for (let o of t) {
			let t = Oa(o, e, r);
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
var Da = {
	y: 0,
	bank: 0,
	gap: 0
}, Y = [
	0,
	0,
	0
];
function Oa(e, t, n) {
	Y[0] = t.px[n], Y[1] = t.py[n], Y[2] = t.pz[n];
	let r = e.nearestT(Y, e.nearestTGlobal(Y), H.globalSearchStep / e.step);
	if (!e.closed && (r <= 0 || r >= 1)) {
		let t = r <= 0 ? 0 : e.n - 1;
		if (((Y[0] - e.px[t]) * e.tx[t] + (Y[2] - e.pz[t]) * e.tz[t]) * (r <= 0 ? -1 : 1) > 0) return null;
	}
	let i = e.norm(r) * e.step, a = Math.floor(i), o = e.idx(a), s = e.idx(a + 1), c = i - a, l = 1 - c, u = e.px[o] * l + e.px[s] * c, d = e.py[o] * l + e.py[s] * c, f = e.pz[o] * l + e.pz[s] * c, p = e.tx[o] * l + e.tx[s] * c, m = e.ty[o] * l + e.ty[s] * c, h = e.tz[o] * l + e.tz[s] * c, g = I(p, h) || 1, _ = h / g, v = -p / g, y = e.bank[o] * l + e.bank[s] * c, b = e.hw[o] * l + e.hw[s] * c + H.kerbWidth, x = (Y[0] - u) * _ + (Y[2] - f) * v, S = d - Math.max(-b, Math.min(b, x)) * et(y);
	if (Math.abs(S - Y[1]) > H.tunnelApex) return null;
	let C = t.rx[n] * _ + t.rz[n] * v, w = (t.rx[n] * p + t.rz[n] * h) / g;
	return Da.y = S, Da.bank = ht(et(y) * C - m / g * w), Da.gap = Math.abs(x) - b - (t.hw[n] + H.kerbWidth) * Math.abs(C), Da;
}
function ka(e, t) {
	let n = e.main, r = n.nearestGlobal(t);
	return Math.sqrt(r.d2) <= n.halfWidthAt(r.t) ? r.t : -1;
}
function Aa(e, t, n) {
	return Sa(e, t, n) || W(e, t) === 0;
}
var ja = {
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
function X(e) {
	return ja.properties[e].default;
}
var Ma = Object.freeze([
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
]), Na = Object.freeze([
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
]), Pa = Ma.map((e) => e.id), Fa = Object.freeze({
	rouletteSeconds: X("rouletteSeconds"),
	items: [...Ma],
	table: [...Na],
	lockoutSeconds: X("lockoutSeconds"),
	finalLapLockoutSeconds: X("finalLapLockoutSeconds"),
	lockedDuringLockout: ["fogBank", "strikeBall"],
	knockoutPoolByRacers: {
		8: Pa,
		6: Pa,
		4: Pa.filter((e) => e !== "fogBank" && e !== "strikeBall"),
		2: Pa.filter((e) => e !== "fogBank" && e !== "decoyBalloon" && e !== "strikeBall")
	},
	ownerGraceSeconds: X("ownerGraceSeconds"),
	spawnAheadMetres: X("spawnAheadMetres"),
	dropBehindMetres: X("dropBehindMetres"),
	projectileHeight: X("projectileHeight"),
	homingSnapDistance: X("homingSnapDistance"),
	homingLateralRate: X("homingLateralRate"),
	maxProjectilesPerOwner: X("maxProjectilesPerOwner"),
	maxKitesPerOwner: X("maxKitesPerOwner"),
	kiteWarnMetres: X("kiteWarnMetres"),
	kiteWarnSeconds: X("kiteWarnSeconds"),
	crossHitHeight: X("crossHitHeight"),
	maxGroundPerOwner: X("maxGroundPerOwner"),
	trailBehindMetres: X("trailBehindMetres"),
	hitHeight: X("hitHeight")
}), Ia = Object.freeze(Object.fromEntries(Ma.map((e) => [e.id, e.role])));
//#endregion
//#region src/items/projectiles.ts
function La(e, t, n, r) {
	let i = e.sample(t, 0, n).tangent, a = I(i[0], i[2]) || 1;
	return r[0] = i[2] / a, r[1] = 0, r[2] = -i[0] / a, r;
}
function Ra(e, t, n, r) {
	let i = e.sample(t, 0, n).position, a = La(e, t, n, [
		0,
		0,
		0
	]);
	return (r[0] - i[0]) * a[0] + (r[2] - i[2]) * a[2];
}
function za(e) {
	return D.speedClasses[String(e)];
}
function Ba(e, t, n, r) {
	let i = 0;
	for (let a of t.projectiles) a.owner === n && e.items.find((e) => e.id === a.itemId)?.behaviour.homing === !0 === r && i++;
	return i;
}
function Va(e, t) {
	return t === e || t === 0;
}
function Ha(e) {
	return !e.isGhost && e.finishTick === void 0 && e.status.intangibleRemaining <= 0;
}
function Ua(e, t, n, r) {
	let i = -1, a = .5;
	for (let o = 0; o < e.length; o++) {
		let s = e[o];
		if (o === t || !Ha(s) || !Va(r, s.branch)) continue;
		let c = U(s.t - n);
		c > 0 && c < a && (a = c, i = o);
	}
	return i;
}
function Wa(e, t, n) {
	return Ua(e, t, e[t].t, n);
}
function Ga(e, t, n, r, i, a, o, s, c) {
	let l = r[a], u = R(l.heading), d = s ? -1 : 1, f = (o.behaviour.projectileSpeed ?? 30) * za(i), p = [
		l.position[0] + u[0] * e.spawnAheadMetres * d,
		l.position[1],
		l.position[2] + u[2] * e.spawnAheadMetres * d
	], m = n.nearest(p, {
		t: l.t,
		branch: l.branch
	}, D.tSearchWindow), h = n.sample(m.t, 0, m.branch);
	p[1] = h.groundY + ir(n, m.t, m.branch, Ra(n, m.t, m.branch, p), h.halfWidth) + e.projectileHeight;
	let g = o.behaviour.homing === !0, _ = o.role === "runner", v = {
		id: t.nextId++,
		itemId: o.id,
		owner: a,
		ownerId: l.racerId,
		t: m.t,
		branch: m.branch,
		lateral: Ra(n, m.t, m.branch, p),
		velocity: [
			u[0] * f * d,
			0,
			u[2] * f * d
		],
		speed: g ? f : _ ? f * d : 0,
		position: p,
		prevPosition: [...p],
		bouncesLeft: g || _ ? 0 : o.behaviour.bounces ?? 0,
		target: g ? Wa(r, a, m.branch) : -1,
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
		v.age = Vt(Math.max(-1, Math.min(1, v.lateral / (e * v.weave)))) / (2 * Math.PI) * v.weaveSeconds;
	}
	return t.projectiles.push(v), c.push({
		type: "projectileSpawn",
		id: v.id,
		itemId: v.itemId,
		racerId: l.racerId,
		position: [...p]
	}), v;
}
function Z(e, t, n) {
	let r = e.projectiles.indexOf(t);
	r < 0 || (e.projectiles.splice(r, 1), n.push({
		type: "projectilePop",
		id: t.id,
		itemId: t.itemId,
		position: [...t.position]
	}));
}
var Ka = [
	0,
	0,
	0
], qa = 1e-9;
function Ja(e, t, n, r, i, a) {
	let o = n.length;
	for (let s = t.projectiles.length - 1; s >= 0; s--) {
		let c = t.projectiles[s];
		if (c.prevPosition[0] = c.position[0], c.prevPosition[1] = c.position[1], c.prevPosition[2] = c.position[2], c.graceRemaining = Math.max(0, c.graceRemaining - i), c.ttl -= i, c.age += i, c.ttl <= 1e-9) {
			Z(t, c, a);
			continue;
		}
		if (c.speed !== 0) {
			let t = c.target >= 0 ? r[c.target] : void 0;
			if (t && !Ha(t) && (c.target = Ua(r, c.owner, c.t, c.branch)), c.t = U(c.t + c.speed * i / o), c.branch > 0) {
				let e = n.branches.list[c.branch], t = W(c.t, e.entryT);
				(t < 0 || t > e.span) && (c.branch = 0);
			}
			let a = 0;
			if (c.target >= 0) {
				let t = r[c.target], i = U(t.t - c.t) * o;
				t.branch === c.branch && i <= e.homingSnapDistance && (a = Ra(n, t.t, t.branch, t.position));
			}
			let s = n.sample(c.t, 0, c.branch);
			if (c.weave > 0) c.lateral = F(2 * Math.PI * c.age / c.weaveSeconds) * c.weave * (s.halfWidth - c.radius);
			else {
				let t = e.homingLateralRate * i;
				c.lateral += Math.max(-t, Math.min(t, a - c.lateral));
			}
			let l = c.weave <= 0 && c.target >= 0 ? s.wall ?? s.halfWidth : s.halfWidth;
			c.lateral = Math.max(-l + c.radius, Math.min(l - c.radius, c.lateral));
			let u = n.sample(c.t, c.lateral, c.branch);
			c.position[0] = u.position[0], c.position[1] = u.groundY + ir(n, c.t, c.branch, c.lateral, u.halfWidth, u.open ?? 0) + e.projectileHeight, c.position[2] = u.position[2];
			continue;
		}
		c.position[0] += c.velocity[0] * i, c.position[2] += c.velocity[2] * i;
		let l = n.nearest(c.position, {
			t: c.t,
			branch: c.branch
		}, D.tSearchWindow);
		if (c.t = l.t, c.branch = l.branch, c.branch > 0) {
			let e = n.branches.list[c.branch].toLocal(c.t);
			(e <= qa || e >= .999999999) && (c.t = n.branches.main.nearestLocal(c.position, c.t, D.tSearchWindow).t, c.branch = 0);
		}
		let u = n.sample(c.t, 0, c.branch), d = La(n, c.t, c.branch, Ka), f = (c.position[0] - u.position[0]) * d[0] + (c.position[2] - u.position[2]) * d[2], p = (u.wall ?? u.halfWidth) - c.radius;
		if (Math.abs(f) > p) {
			if (c.bouncesLeft--, c.bouncesLeft < 0) {
				Z(t, c, a);
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
		c.position[0] = m.position[0], c.position[2] = m.position[2], c.position[1] = m.groundY + ir(n, c.t, c.branch, f, m.halfWidth, m.open ?? 0) + e.projectileHeight;
	}
}
//#endregion
//#region src/items/ground.ts
function Ya(e, t, n, r, i, a, o) {
	let s = r[i], c = t.groundItems.filter((e) => e.owner === i);
	for (; c.length >= e.maxGroundPerOwner;) Xa(t, c.shift(), o);
	let l = R(s.heading), u = [
		s.position[0] - l[0] * e.dropBehindMetres,
		s.position[1],
		s.position[2] - l[2] * e.dropBehindMetres
	], d = n.nearest(u, {
		t: s.t,
		branch: s.branch
	}, D.tSearchWindow), f = Ra(n, d.t, d.branch, u), p = n.sample(d.t, f, d.branch);
	u[1] = p.groundY + ir(n, d.t, d.branch, f, p.halfWidth);
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
function Xa(e, t, n) {
	let r = e.groundItems.indexOf(t);
	r < 0 || (e.groundItems.splice(r, 1), n.push({
		type: "groundPop",
		id: t.id,
		itemId: t.itemId,
		position: [...t.position]
	}));
}
function Za(e, t) {
	for (let n = 0; n < e.length; n++) if (e[n].branch === t) return !0;
	return !1;
}
function Qa(e, t, n, r, i) {
	for (let a = e.groundItems.length - 1; a >= 0; a--) {
		let o = e.groundItems[a];
		o.graceRemaining = Math.max(0, o.graceRemaining - r), o.ttl -= r, (o.ttl <= 1e-9 || !t.branches.list[o.branch].open && !Za(n, o.branch)) && Xa(e, o, i);
	}
}
//#endregion
//#region src/items/rng.ts
var $a = 45477;
function eo(e, t = $a) {
	return (Math.imul(e | 0, 2654435761) ^ Math.imul(t + 1, 2246822519)) >>> 0;
}
function to(e) {
	e.rng = e.rng + 1831565813 >>> 0;
	let t = e.rng;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), (t ^ t >>> 14) >>> 0;
}
function no(e) {
	return to(e) / 4294967296;
}
function ro(e, t) {
	let n = 0;
	for (let t of Object.values(e)) t > 0 && (n += t);
	if (n <= 0) return;
	let r = 0, i;
	for (let [a, o] of Object.entries(e)) if (!(o <= 0) && (i = a, r += o, t * n < r)) return a;
	return i;
}
//#endregion
//#region src/items/roulette.ts
function io(e, t, n) {
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
function ao(e) {
	let t = e.knockout?.eliminated ?? [], n = 0;
	for (let r of e.karts) !r.isGhost && !t.includes(r.racerId) && n++;
	return n;
}
function oo(e, t, n) {
	return t <= 1 ? 1 : Math.min(n, 1 + Math.round((Math.min(Math.max(e, 1), Math.max(t, 1)) - 1) * (n - 1) / (t - 1)));
}
function so(e, t) {
	let n = -1;
	for (let r of Object.keys(e.knockoutPoolByRacers)) {
		let e = Number(r);
		e <= t && e > n && (n = e);
	}
	return n < 0 ? void 0 : e.knockoutPoolByRacers[String(n)];
}
function co(e, t, n, r, i) {
	let a = ao(t), o = { ...e.table[oo(i, a, e.table.length) - 1] };
	if (t.time < e.lockoutSeconds || io(t, n, r) <= e.finalLapLockoutSeconds) for (let t of e.lockedDuringLockout) o[t] = 0;
	for (let t of e.items) o[t.id] && i < (t.behaviour.minPosition ?? 1) && (o[t.id] = 0);
	if (t.mode === "knockout") {
		let t = so(e, a);
		if (t) for (let e of Object.keys(o)) t.includes(e) || (o[e] = 0);
	}
	return o;
}
function lo(e, t, n, r, i, a, o) {
	let s = n.karts[a];
	if (s.isGhost || s.finishTick !== void 0) return !1;
	let c = s.item.held === "none" && s.item.rouletteRemaining <= 0, l = s.item.next === "none" && s.item.nextRouletteRemaining <= 0;
	if (!c && !l) return !1;
	let u = ro(co(e, n, r, i, s.rank), no(t));
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
function uo(e, t) {
	let n = e - t;
	return n > 1e-9 ? n : 0;
}
function fo(e, t, n) {
	e.item.rouletteRemaining > 0 && (e.item.rouletteRemaining = uo(e.item.rouletteRemaining, t), e.item.rouletteRemaining === 0 && e.item.held !== "none" && n.push({
		type: "itemReady",
		racerId: e.racerId,
		itemId: e.item.held,
		slot: 0
	})), e.item.nextRouletteRemaining > 0 && (e.item.nextRouletteRemaining = uo(e.item.nextRouletteRemaining, t), e.item.nextRouletteRemaining === 0 && e.item.next !== "none" && n.push({
		type: "itemReady",
		racerId: e.racerId,
		itemId: e.item.next,
		slot: 1
	}));
}
function po(e) {
	e.item.held = "none", e.item.charges = 0, e.item.rouletteRemaining = 0, e.item.next = "none", e.item.nextCharges = 0, e.item.nextRouletteRemaining = 0;
}
function mo(e) {
	e.item.held = e.item.next, e.item.charges = e.item.nextCharges, e.item.rouletteRemaining = e.item.nextRouletteRemaining, e.item.next = "none", e.item.nextCharges = 0, e.item.nextRouletteRemaining = 0;
}
//#endregion
//#region src/items/hits.ts
function Q(e, t) {
	return I(e[0] - t[0], e[2] - t[2]);
}
function ho(e) {
	return !e.isGhost && e.finishTick === void 0 && e.status.intangibleRemaining <= 0 && e.status.spinRemaining <= 0 && !B(e);
}
function go(e, t, n, r, i, a, o, s, c) {
	let l = e[r];
	if (!ho(l)) return !1;
	if (l.status.shield) return l.status.shield = !1, n.shieldRemaining[r] = 0, s.push({
		type: "shieldPop",
		racerId: l.racerId
	}), !0;
	let u = a.hitEffect ?? {}, d = !1, f = 0;
	if ((u.spinSeconds ?? 0) > 0) {
		c.length = 0, wr(l, t[r], o, c);
		for (let e of c) e.type === "hit" && (d = e.spun, f = e.coinsLost);
	} else u.slowTo !== void 0 && (l.speed = Math.min(l.speed, t[r].topSpeed * u.slowTo), V(l), re(l), l.status.slowedTo = Math.min(l.status.slowRemaining > 0 ? l.status.slowedTo : 1, u.slowTo), l.status.slowRemaining = Math.max(l.status.slowRemaining, u.slowSeconds ?? 0));
	return u.dropsItem && l.item.held !== "none" && (s.push({
		type: "itemLost",
		racerId: l.racerId,
		itemId: l.item.held
	}), l.item.next !== "none" && s.push({
		type: "itemLost",
		racerId: l.racerId,
		itemId: l.item.next
	}), po(l)), s.push({
		type: "hit",
		racerId: l.racerId,
		byRacerId: i,
		itemId: a.id,
		spun: d,
		coinsLost: f
	}), !0;
}
function _o(e, t, n, r) {
	let i = e[t], a = n.behaviour.slowTo ?? 1, o = n.behaviour.durationSeconds ?? 0, s = [];
	for (let c = 0; c < e.length; c++) {
		let l = e[c];
		c === t || l.isGhost || l.finishTick !== void 0 || l.rank >= i.rank || B(l) || (l.status.slowedTo = Math.min(l.status.slowRemaining > 0 ? l.status.slowedTo : 1, a), l.status.slowRemaining = Math.max(l.status.slowRemaining, o), n.behaviour.stripsItem && (l.item.held !== "none" && r.push({
			type: "itemLost",
			racerId: l.racerId,
			itemId: l.item.held
		}), l.item.next !== "none" && r.push({
			type: "itemLost",
			racerId: l.racerId,
			itemId: l.item.next
		}), po(l)), s.push(l.racerId));
	}
	return r.push({
		type: "fog",
		racerId: i.racerId,
		victims: s
	}), s;
}
//#endregion
//#region src/items/powers.ts
function vo(e, t) {
	return Math.abs(e.position[1] - t.position[1]) < 2;
}
function yo(e, t, n, r, i, a, o, s) {
	let c = e[r];
	for (let l = 0; l < e.length; l++) l !== r && vo(c, e[l]) && Q(e[l].position, c.position) <= a + t[l].kartRadius && go(e, t, n, l, c.racerId, i, "item", o, s);
}
function bo(e, t, n, r, i, a) {
	for (let o = 0; o < t.length; o++) {
		let s = t[o];
		if (e.power[o]) {
			let c = r.get(e.power[o]);
			if (s.status.held) s.status.rideRemaining = 0, i.push({
				type: "powerEnd",
				racerId: s.racerId,
				itemId: c.id
			}), s.item.held === c.id && s.item.charges === 0 && mo(s), e.power[o] = "";
			else if (B(s)) {
				for (let r = 0; r < t.length; r++) {
					let l = t[r];
					r === o || e.knocked[o] & 1 << r || !vo(s, l) || Q(l.position, s.position) > vn(s, n[o]) + vn(l, n[r]) + .3 || go(t, n, e, r, s.racerId, c, "item", i, a) && (e.knocked[o] |= 1 << r, l.status.spinRemaining > 0 && (l.verticalVelocity = c.behaviour.popSpeed ?? 0, l.grounded = !1));
				}
				for (let t = e.groundItems.length - 1; t >= 0; t--) {
					let r = e.groundItems[t];
					Q(r.position, s.position) <= vn(s, n[o]) + r.radius && Xa(e, r, i);
				}
			} else {
				let r = c.behaviour.burstRadius ?? 0;
				i.push({
					type: "burst",
					racerId: s.racerId,
					position: [...s.position],
					radius: r
				}), yo(t, n, e, o, c, r, i, a), i.push({
					type: "powerEnd",
					racerId: s.racerId,
					itemId: c.id
				}), s.item.held === c.id && s.item.charges === 0 && mo(s), e.power[o] = "";
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
				}), yo(t, n, e, o, c, r, i, a);
			} else s.item.held === "pogoSpring" && s.item.charges === 1 && (s.item.charges = 0, mo(s));
			e.pogo[o] = 0;
		}
		if (e.towing[o]) {
			let c = r.get("grappleAnchor"), l = s.status.towTarget, u = l >= 0 ? t[l] : void 0, d = !1, f = !_n(s) || !u || !c;
			!f && u && c && (u.finishTick !== void 0 || u.isGhost || u.status.intangibleRemaining > 0 || B(u) || u.branch !== s.branch && u.branch !== 0 ? f = !0 : Q(s.position, u.position) <= (c.behaviour.releaseMetres ?? 0) && (f = d = !0, j(s, "item", n[o].itemSpeedMultiplier, c.behaviour.slingshotSeconds ?? 0, a), u.status.slowedTo = Math.min(u.status.slowRemaining > 0 ? u.status.slowedTo : 1, c.behaviour.tugSlowTo ?? 1), u.status.slowRemaining = Math.max(u.status.slowRemaining, c.behaviour.tugSeconds ?? 0))), f && (i.push({
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
function xo(e, t, n) {
	return e.push({
		type: "itemRefused",
		racerId: t.racerId,
		itemId: t.item.held,
		reason: n
	}), !1;
}
function So(e, t, n = !1) {
	e.item.charges = Math.max(0, e.item.charges - 1), t.push({
		type: "itemUsed",
		racerId: e.racerId,
		itemId: e.item.held,
		chargesLeft: e.item.charges
	}), e.item.charges === 0 && !n && mo(e);
}
function Co(e, t) {
	return e.phase !== "racing" && e.phase !== "finalLap" || t.isGhost || t.finishTick !== void 0 ? "notRacing" : t.item.rouletteRemaining > 0 ? "roulette" : t.item.charges <= 0 ? "inUse" : t.status.spinRemaining > 0 ? "spinning" : t.status.intangibleRemaining > 0 ? "intangible" : null;
}
function wo(e, t, n, r) {
	let i = e[t], a = -1, o = r / n;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		if (n === t || r.branch !== i.branch || r.isGhost || r.finishTick !== void 0 || r.status.intangibleRemaining > 0 || B(r)) continue;
		let s = U(r.t - i.t);
		s > 0 && s <= o && (o = s, a = n);
	}
	return a;
}
function To(e, t, n, r, i, a, o, s, c) {
	let l = n.karts, u = l[a];
	if (u.item.held === "none") return !1;
	let d = e.items.find((e) => e.id === u.item.held);
	if (!d) return !1;
	let f = Co(n, u);
	if (f) return xo(s, u, f);
	let p = !1;
	switch (d.role) {
		case "forward":
		case "homing":
		case "runner": {
			let r = d.role === "homing";
			if (Ba(e, t, a, r) >= (r ? e.maxKitesPerOwner : e.maxProjectilesPerOwner)) return xo(s, u, "inFlight");
			Ga(e, t, i, l, n.speedClass, a, d, d.role !== "homing" && o.lookBack, s);
			break;
		}
		case "rearDrop":
		case "deception":
			Ya(e, t, i, l, a, d, s);
			break;
		case "defenceArea":
			Eo(t, l, r, a, d, s, c);
			break;
		case "defenceHeld":
			u.status.shield = !0, t.shieldRemaining[a] = d.behaviour.durationSeconds ?? 0, s.push({
				type: "shieldUp",
				racerId: u.racerId
			});
			break;
		case "speed": {
			let e = r[a];
			j(u, "item", e.itemSpeedMultiplier, e.itemSpeedSeconds, c), d.behaviour.chargeMultiplier && (u.drift.chargeMultiplier = d.behaviour.chargeMultiplier, u.drift.chargeMultiplierRemaining = d.behaviour.chargeSeconds ?? 0);
			break;
		}
		case "equaliser":
			if (u.rank < (d.behaviour.minPosition ?? 1)) return xo(s, u, "position");
			_o(l, a, d, s);
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
			else return xo(s, u, "inUse");
			break;
		}
		case "tether": {
			let e = wo(l, a, i.length, d.behaviour.range ?? 0);
			if (e < 0) return xo(s, u, "noTarget");
			let n = l[e];
			if (n.status.shield) {
				go(l, r, t, e, u.racerId, d, "item", s, c);
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
	return So(u, s, p), !0;
}
function Eo(e, t, n, r, i, a, o) {
	let s = t[r], c = i.behaviour.radius ?? 0;
	a.push({
		type: "horn",
		racerId: s.racerId,
		position: [...s.position],
		radius: c
	});
	for (let t = e.projectiles.length - 1; t >= 0; t--) {
		let n = e.projectiles[t];
		Q(n.position, s.position) <= c + n.radius && Z(e, n, a);
	}
	for (let t = e.groundItems.length - 1; t >= 0; t--) {
		let n = e.groundItems[t];
		Q(n.position, s.position) <= c + n.radius && Xa(e, n, a);
	}
	for (let l = 0; l < t.length; l++) l !== r && Q(t[l].position, s.position) <= c + n[l].kartRadius && go(t, n, e, l, s.racerId, i, "item", a, o);
}
//#endregion
//#region src/items/items.ts
function Do(e, t, n, r, i) {
	let a = e.sample(t, 0, n);
	return Math.abs(r) > (a.wall ?? a.halfWidth) + i;
}
var Oo = class {
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
	constructor(e, t, n = Fa) {
		this.cfg = n, this.track = e, this.host = t;
		for (let e of n.items) this.defs.set(e.id, e);
		this.roles = n === Fa ? Ia : Object.fromEntries(n.items.map((e) => [e.id, e.role]));
		let r = t.state.karts.length;
		this.threatened = Array(r).fill(!1), this.threatDistance = Array(r).fill(Infinity), this.state = {
			rng: eo(t.state.seed),
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
		let i = this.host.state, a = this.host.consts, o = this.track, s = this.state, c = this.cfg, l = i.karts;
		for (let e of t) if (e.type === "trackChanged") {
			this.reseat(r);
			break;
		}
		for (let e = 0; e < l.length; e++) {
			let t = l[e];
			fo(t, n, r), s.shieldRemaining[e] > 0 && !t.status.shield && (s.shieldRemaining[e] = 0, r.push({
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
			t < 0 || (lo(c, s, i, a, o, t, r), this.doubles[e.index] && lo(c, s, i, a, o, t, r));
		}
		for (let t = 0; t < l.length; t++) {
			let n = l[t], u = e[t]?.item === !0, d = s.prevItem[t];
			if (s.prevItem[t] = u, s.trailing[t] && (!this.trailable(n) || n.item.charges <= 0) && (s.trailing[t] = !1), s.trailing[t] && n.status.spinRemaining > 0) {
				s.trailing[t] = !1, r.push({
					type: "itemLost",
					racerId: n.racerId,
					itemId: n.item.held
				}), So(n, r);
				continue;
			}
			u && !d ? this.trailable(n) && Co(i, n) === null ? (s.trailing[t] = !0, r.push({
				type: "trailStart",
				racerId: n.racerId,
				itemId: n.item.held
			})) : To(c, s, i, a, o, t, e[t], r, this.scratch) : !u && d && s.trailing[t] && (s.trailing[t] = !1, To(c, s, i, a, o, t, e[t], r, this.scratch));
		}
		Ja(c, s, o, l, n, r), Qa(s, o, l, n, r);
		let u = s.projectiles, d = s.groundItems;
		for (let e = u.length - 1; e >= 0; e--) {
			let t = u[e], n = !1;
			for (let i = e - 1; i >= 0 && !n; i--) {
				let a = u[i];
				this.meets(t.branch, t.position[1], a.branch, a.position[1]) && Q(t.position, a.position) <= t.radius + a.radius && (Z(s, t, r), Z(s, a, r), n = !0, e--);
			}
			if (!n) {
				for (let e = d.length - 1; e >= 0 && !n; e--) {
					let i = d[e];
					this.meets(t.branch, t.position[1] - c.projectileHeight, i.branch, i.position[1]) && Q(t.position, i.position) <= t.radius + i.radius && (Z(s, t, r), Xa(s, i, r), n = !0);
				}
				if (!n) for (let e = 0; e < l.length && !n; e++) {
					let i = l[e];
					if (t.hitMask & 1 << e || !this.meets(t.branch, t.position[1] - c.projectileHeight, i.branch, i.position[1]) || e === t.owner && t.graceRemaining > 0 || Q(t.position, i.position) > t.radius + a[e].kartRadius || i.position[1] - (t.position[1] - c.projectileHeight) > c.hitHeight) continue;
					if (B(i)) {
						Z(s, t, r), n = !0;
						continue;
					}
					if (!ho(i)) continue;
					if (s.trailing[e] && this.fromBehind(t, i)) {
						r.push({
							type: "trailBlock",
							racerId: i.racerId,
							itemId: i.item.held,
							position: [...t.position]
						}), s.trailing[e] = !1, So(i, r), Z(s, t, r), n = !0;
						continue;
					}
					let o = this.defs.get(t.itemId);
					go(l, a, s, e, t.ownerId, o, "projectile", r, this.scratch), t.hitMask |= 1 << e, --t.hitsLeft <= 0 && (Z(s, t, r), n = !0);
				}
			}
		}
		for (let e = d.length - 1; e >= 0; e--) {
			let t = d[e];
			for (let e = 0; e < l.length; e++) {
				let n = l[e];
				if (!ho(n) || !this.meets(t.branch, t.position[1], n.branch, n.position[1]) || e === t.owner && t.graceRemaining > 0 || Q(t.position, n.position) > t.radius + a[e].kartRadius || n.position[1] - t.position[1] > c.hitHeight) continue;
				let i = this.defs.get(t.itemId);
				go(l, a, s, e, t.ownerId, i, "item", r, this.scratch), Xa(s, t, r);
				break;
			}
		}
		bo(s, l, a, this.defs, r, this.scratch), this.threatened.fill(!1), this.threatDistance.fill(Infinity);
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
				this.seat(i), i.lateral = Ra(t, i.t, i.branch, i.position), Do(t, i.t, i.branch, i.lateral, i.radius) && Z(n, i, e);
			}
			for (let r = n.groundItems.length - 1; r >= 0; r--) {
				let i = n.groundItems[r];
				this.seat(i), Do(t, i.t, i.branch, Ra(t, i.t, i.branch, i.position), i.radius) && Xa(n, i, e);
			}
		}
	}
	seat(e) {
		let t = this.track.branches, n = e.branch > 0 ? ka(t, e.position) : -1;
		n >= 0 ? (e.t = n, e.branch = 0) : e.t = t.list[e.branch].nearestGlobal(e.position).t;
	}
	meets(e, t, n, r) {
		return e === n || Math.abs(t - r) <= this.cfg.crossHitHeight;
	}
	fromBehind(e, t) {
		let n = R(t.heading);
		return (e.position[0] - t.position[0]) * n[0] + (e.position[2] - t.position[2]) * n[2] < 0;
	}
};
//#endregion
//#region src/race-manager/checkpoints.ts
function ko(e, t) {
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
		dnf: !1
	};
}
function Ao(e, t, n, r, i, a, o) {
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
function jo(e, t, n, r, i, a) {
	let o = t.prevT;
	if (t.prevT = e.t, e.isGhost || e.finishTick !== void 0) return "none";
	let s = n.checkpoints.length;
	if (U(e.t - o) > J.teleportGuardSectors / s) return "none";
	let c = n.checkpoints[t.nextCheckpoint];
	return tr(o, e.t, c.t) ? Ao(e, t, n, t.nextCheckpoint, r, i, a) : "none";
}
function Mo(e, t, n, r, i, a) {
	if (t.prevT = e.t, e.isGhost || e.finishTick !== void 0) return "none";
	let o = n.checkpoints.length, s = n.checkpoints[t.nextCheckpoint], c = W(e.t, s.t);
	return c > 0 && c < J.checkpointResyncSectors / o ? Ao(e, t, n, t.nextCheckpoint, r, i, a) : "none";
}
var No = 1.5;
function Po(e, t, n) {
	let r = n.checkpoints[t.lastCheckpoint], i = n.length, a = U(e.t - r.t), o = a > No / n.checkpoints.length ? a - 1 : a;
	return (e.lap - 1) * i + (U(r.t - n.startT) + o) * i;
}
//#endregion
//#region src/race-manager/countdown.ts
var Fo = Math.round(J.countdownStepSeconds * 120), Io = J.countdownSteps * Fo;
function Lo(e, t, n, r, i, a, o) {
	for (let i = 0; i < t.length; i++) {
		let t = n[i];
		r[i].throttle > J.stuckInputMin ? t.throttleHeldSinceTick < 0 && (t.throttleHeldSinceTick = e) : t.throttleHeldSinceTick = -1;
	}
	if (e < Io) return e % Fo === 0 && a.push({
		type: "countdown",
		stepsLeft: J.countdownSteps - e / Fo
	}), !1;
	for (let e = 0; e < t.length; e++) {
		let r = n[e].throttleHeldSinceTick;
		r >= 0 && Tr(t[e], i[e], (Io - r) / 120, o[e]);
	}
	return a.push({ type: "go" }), !0;
}
//#endregion
//#region src/race-manager/util.ts
var Ro = 1e-9;
function zo(e, t) {
	let n = e - t;
	return n > Ro ? n : 0;
}
function Bo(e, t) {
	return I(e[0] - t[0], e[2] - t[2]);
}
function Vo(e, t) {
	return L(e[0] - t[0], e[1] - t[1], e[2] - t[2]);
}
//#endregion
//#region src/race-manager/hazards.ts
function Ho(e, t, n, r, i, a, o) {
	if (t.hazardCooldownRemaining = zo(t.hazardCooldownRemaining, i), t.ventCooldownRemaining = zo(t.ventCooldownRemaining, i), e.isGhost || e.finishTick !== void 0) return;
	if (t.hazardInside !== void 0) {
		let i = r.find((e) => e.id === t.hazardInside);
		(!i || Vo(e.position, i.position) > i.radius + n.kartRadius) && (t.hazardInside = void 0);
	}
	let s, c;
	for (let l of r) if (!(Vo(e.position, l.position) > l.radius + n.kartRadius) && !(e.status.intangibleRemaining > 0 || B(e)) && (!l.ground || e.grounded)) {
		if ((!s || !c) && (s = R(e.heading), c = gn(e.heading)), l.hit === "launch") {
			let n = l.launch ?? 0;
			if (t.ventCooldownRemaining > 0 || e.airborne.fromJumpId === l.id || e.verticalVelocity >= n) continue;
			e.verticalVelocity = n, e.grounded = !1, e.airborne.fromJumpId = l.id, e.airborne.seconds = 0, t.ventCooldownRemaining = H.ventEruptSeconds, o.push({
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
				e.status.shield = !1, t.hazardCooldownRemaining = J.hazardCooldownSeconds, t.hazardInside = l.id;
				continue;
			}
			switch (l.hit) {
				case "spin":
					wr(e, n, "hazard", o);
					break;
				case "slow":
					e.status.slowedTo = J.hazardSlowTo, e.status.slowRemaining = J.hazardSlowSeconds;
					break;
				case "bump": {
					let t = e.position[0] - l.position[0], n = e.position[2] - l.position[2], r = t * c[0] + n * c[2] >= 0 ? 1 : -1;
					e.lateralVelocity += r * J.hazardBumpLateral;
					break;
				}
			}
			t.hazardCooldownRemaining = J.hazardCooldownSeconds, t.hazardInside = l.id, a.push({
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
function Uo(e) {
	let t = {
		pickups: [],
		coins: []
	};
	return e.features.forEach((e, n) => {
		e.kind === "pickup" ? t.pickups.push(n) : e.kind === "coin" && t.coins.push(n);
	}), t;
}
function Wo(e) {
	return {
		pickupStates: e.pickups.map(() => ({ respawnRemaining: 0 })),
		coinStates: e.coins.map(() => ({ respawnRemaining: 0 }))
	};
}
function Go(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < t.length; c++) {
		let l = n[c];
		if (l.respawnRemaining = zo(l.respawnRemaining, o), l.respawnRemaining > 0) continue;
		let u = r.features[t[c]];
		if (!r.branches.list[u.branch].open) continue;
		let d = u.width / 2;
		for (let t = 0; t < i.length; t++) {
			let n = i[t];
			if (!(n.isGhost || n.finishTick !== void 0 || n.status.held || n.branch !== u.branch) && !(Bo(n.position, u.position) > d + a[t].kartRadius)) {
				e === "coin" ? (l.respawnRemaining = J.coinRespawnSeconds, n.coins = Math.min(a[t].coinCap, n.coins + 1), s.push({
					type: "coin",
					racerId: n.racerId,
					coins: n.coins
				})) : (l.respawnRemaining = J.pickupRespawnSeconds, s.push({
					type: "pickup",
					racerId: n.racerId,
					index: c
				}));
				break;
			}
		}
	}
}
function Ko(e, t, n, r, i, a, o, s) {
	Go("pickup", e.pickups, t, r, i, a, o, s), Go("coin", e.coins, n, r, i, a, o, s);
}
//#endregion
//#region src/race-manager/ranking.ts
var qo = (e) => e.status.loopIndex >= 0 ? e.status.loopS : 0;
function Jo(e, t, n, r) {
	let i = e[n], a = e[r], o = i.finishTick !== void 0, s = a.finishTick !== void 0;
	if (o && s) {
		let e = i.finishTick - a.finishTick;
		return e === 0 ? t[n].dnf === t[r].dnf ? i.distanceAlong === a.distanceAlong ? qo(i) === qo(a) ? t[n].gridSlot - t[r].gridSlot : qo(a) - qo(i) : a.distanceAlong - i.distanceAlong : t[n].dnf ? 1 : -1 : e;
	}
	return o === s ? i.distanceAlong === a.distanceAlong ? qo(i) === qo(a) ? t[n].gridSlot - t[r].gridSlot : qo(a) - qo(i) : a.distanceAlong - i.distanceAlong : o ? -1 : 1;
}
function Yo(e, t, n) {
	n.length = 0;
	for (let t = 0; t < e.length; t++) e[t].isGhost || n.push(t);
	for (let r = 1; r < n.length; r++) {
		let i = n[r], a = r - 1;
		for (; a >= 0 && Jo(e, t, n[a], i) > 0;) n[a + 1] = n[a], a--;
		n[a + 1] = i;
	}
	return n;
}
function Xo(e, t, n, r, i) {
	for (let a = 0; a < n.length; a++) {
		let o = n[a], s = e[o], c = t[o], l = a + 1;
		c.rankHeldSeconds = l === s.rank ? c.rankHeldSeconds + r : r, s.rank = l, l !== c.shownRank && (s.finishTick !== void 0 || c.rankHeldSeconds + 1e-9 >= J.rankDebounceSeconds) && (c.shownRank = l, i.push({
			type: "positionChange",
			racerId: s.racerId,
			rank: l
		}));
	}
}
//#endregion
//#region src/race-manager/wrongway.ts
var Zo = {
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
function Qo(e, t) {
	let n = t.sampleInto(e.t, 0, e.branch, Zo), r = R(e.heading), i = gn(e.heading), a = r[0] * e.speed + i[0] * e.lateralVelocity, o = r[2] * e.speed + i[2] * e.lateralVelocity;
	return a * n.tangent[0] + o * n.tangent[2];
}
function $o(e, t, n) {
	t.wrongWaySeconds = 0, t.wrongWayOn && (t.wrongWayOn = !1, n.push({
		type: "wrongWay",
		racerId: e.racerId,
		on: !1
	}));
}
function es(e, t, n, r, i) {
	if (e.isGhost || e.finishTick !== void 0) {
		$o(e, t, i);
		return;
	}
	let a = Qo(e, n);
	a < J.wrongWaySpeed ? (t.wrongWaySeconds += r, !t.wrongWayOn && t.wrongWaySeconds + 1e-9 >= J.wrongWayHoldSeconds && (t.wrongWayOn = !0, i.push({
		type: "wrongWay",
		racerId: e.racerId,
		on: !0
	}))) : a > J.wrongWayClearSpeed && $o(e, t, i);
}
//#endregion
//#region src/race-manager/respawn.ts
function ts(e, t, n, r) {
	return t.stuckSeconds = (!e.isPlayer || n.throttle > J.stuckInputMin || n.brake > J.stuckInputMin) && Math.abs(e.speed) < J.stuckSpeed && e.status.spinRemaining === 0 && e.grounded && t.freezeRemaining === 0 ? t.stuckSeconds + r : 0, t.stuckSeconds + 1e-9 >= J.stuckSeconds;
}
function ns(e, t, n, r) {
	let i = r ?? $n(t, e.t, e.position, e.branch).lateral, a = Math.max(0, Math.min(n - D.kartRadius, n * J.respawnInset));
	return Number.isFinite(i) ? i < -a ? -a : i > a ? a : i : 0;
}
function rs(e, t) {
	let n = e.branches.main.lut, r = (e) => (n.covered[n.idx(e)] | n.covered[n.idx(e + 1)]) !== 0, i = Math.floor(n.norm(t) * n.step);
	if (!r(i)) return t;
	for (let e = 0; e < n.n && r(i); e++) i--;
	return U((i - Math.ceil(H.tunnelFunnel / (n.length / n.step))) / n.step);
}
function is(e, t, n, r) {
	let i = n.checkpoints[t.lastCheckpoint], a = rs(n, i.t), o = a === i.t ? i : n.sample(a, 0, 0), s = n.sample(a, ns(e, n, o.halfWidth, r), 0).position;
	return {
		position: [
			s[0],
			s[1] + J.respawnLift,
			s[2]
		],
		heading: z(o.tangent),
		t: a
	};
}
var as = (e) => {
	let t = Math.max(0, Math.min(1, e));
	return t * t * (3 - 2 * t);
};
function os(e, t, n, r) {
	let i = $n(n, e.t, e.position, e.branch).lateral, a = is(e, t, n, i);
	t.rescue = {
		lateral: Number.isFinite(i) ? i : 0,
		from: [...e.position],
		fromHeading: e.heading,
		to: a.position,
		toHeading: a.heading,
		remaining: J.rescueSeconds
	}, e.status.falling = !1, e.status.held = !0, t.freezeRemaining = Math.max(t.freezeRemaining, J.rescueSeconds + J.respawnFreezeSeconds), e.status.intangibleRemaining = Math.max(e.status.intangibleRemaining, J.rescueSeconds + J.respawnFreezeSeconds), V(e), re(e), r.push({
		type: "rescue",
		racerId: e.racerId,
		phase: "start"
	});
}
function ss(e, t) {
	let n = J.rescueSeconds, r = n / 2.4 * .8, i = n / 2.4 * 2, a = e.from, o = e.to;
	if (t < r) return {
		position: [
			a[0],
			a[1] + .3 * as((t - r * .7) / (r * .3)),
			a[2]
		],
		heading: e.fromHeading
	};
	if (t < i) {
		let n = as((t - r) / (i - r)), s = Math.max(a[1], o[1]) + J.rescueRise, c = (t - r) / (i - r), l = c < .5 ? a[1] + .3 + (s - a[1] - .3) * as(c * 2) : s + (o[1] + 1.5 - s) * as((c - .5) * 2), u = e.toHeading - e.fromHeading;
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
	let s = as((t - i) / (n - i));
	return {
		position: [
			o[0],
			o[1] + 1.5 * (1 - s),
			o[2]
		],
		heading: e.toHeading
	};
}
function cs(e, t, n) {
	let r = $n(t, e.t, e.position, e.branch).lateral, i = t.sample(e.t, r, e.branch), a = i.open ?? 0;
	if (!(a & (r < 0 ? 1 : 2)) && Math.abs(r) - ((i.wall ?? i.halfWidth) - vn(e, n)) > n.wallEndOvershoot) return !0;
	let o = e.position[1] - (i.groundY + ir(t, e.t, e.branch, r, i.halfWidth, a));
	return o < -n.groundCatch || e.grounded && o > n.groundCatch;
}
function ls(e, t, n) {
	if (!t.rescue) return;
	let r = is(e, t, n, t.rescue.lateral);
	t.rescue.to = r.position, t.rescue.toHeading = r.heading;
}
function us(e, t, n, r, i) {
	let a = t.rescue;
	if (!a) return;
	a.remaining = Math.max(0, a.remaining - r);
	let o = ss(a, J.rescueSeconds - a.remaining);
	e.position = o.position, e.heading = o.heading, e.speed = 0, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !1, !(a.remaining > 1e-9) && (t.rescue = void 0, ds(e, t, n, i, a.lateral), i.push({
		type: "rescue",
		racerId: e.racerId,
		phase: "end"
	}));
}
function ds(e, t, n, r, i) {
	let a = is(e, t, n, i);
	e.position = a.position, e.heading = a.heading, e.t = a.t, e.branch = 0, e.speed = 0, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !0, e.status.falling = !1, e.status.held = !1, e.airborne.fromJumpId = void 0, e.airborne.trickQueued = !1, e.airborne.seconds = 0, V(e), re(e), e.status.intangibleRemaining = Math.max(e.status.intangibleRemaining, J.respawnFreezeSeconds), t.prevT = U(a.t - 1e-7), t.freezeRemaining = J.respawnFreezeSeconds, t.stuckSeconds = 0, t.respawnCount++, $o(e, t, r), r.push({
		type: "respawn",
		racerId: e.racerId,
		checkpoint: t.lastCheckpoint
	});
}
//#endregion
//#region src/race-manager/race.ts
var fs = class {
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
		let r = t.laps ?? e.def.laps, i = t.mode === "knockout" ? t.racers.length : n.length, a = Math.min(J.playerGridSlot, i - 1), o = t.racers.some((e) => e.isPlayer), s = [];
		for (let e = 0; e < n.length; e++) o && e === a || s.push(e);
		let c = [], l = [], u = [], d = -1;
		t.racers.forEach((e, r) => {
			let i = e.isPlayer || e.isGhost && o ? a : s.shift(), f = n[i], p = hn({
				racerId: e.racerId,
				isPlayer: e.isPlayer,
				isGhost: e.isGhost,
				position: [...f.position],
				heading: f.heading,
				t: f.t
			});
			p.lap = 1, p.bodyId = e.bodyId, p.skinId = e.skinId, e.isPlayer && (d = r), c.push(p), l.push(ko(i, f.t)), u.push(O(e.archetype, t.speedClass));
		}), this.playerIndex = d, this.consts = u, this.fi = Uo(e);
		let f = Wo(this.fi);
		this.state = {
			mode: t.mode,
			trackId: t.trackId,
			speedClass: t.speedClass,
			mirrored: t.mirrored ?? !1,
			seed: t.seed,
			tick: 0,
			goTick: Io,
			time: -Io * gr,
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
		}, this.effective = c.map(() => mn), this.kartEvents = c.map(() => []);
		for (let t = 0; t < c.length; t++) c[t].distanceAlong = Po(c[t], l[t], e);
		Yo(c, l, this.order), this.order.forEach((e, t) => {
			c[e].rank = t + 1, l[e].shownRank = t + 1;
		});
	}
	get dt() {
		return gr;
	}
	step(e) {
		let t = this.state, { karts: n, trackers: r } = t, i = this.track, a = t.tick, o = gr, s = [];
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
			u = Lo(a, n, r, e, this.consts, s, c);
			for (let e = 0; e < n.length; e++) this.effective[e] = mn;
		} else for (let t = 0; t < n.length; t++) {
			let i = n[t], a = r[t];
			this.effective[t] = !i.isGhost && a.freezeRemaining > 0 ? mn : e[t];
		}
		this.playerIndex >= 0 && t.playerFinishTick < 0 && t.inputLog.push({ ...e[this.playerIndex] });
		let d = Cr(n, this.effective, i, this.consts, o);
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
				f.freezeRemaining = zo(f.freezeRemaining, o);
				let m = !1, h = c[u];
				for (let e = h.length - 1; e >= 0; e--) h[e].type === "respawn" && (m = !0, h.splice(e, 1));
				if (f.rescue) {
					us(d, f, i, o, s);
					continue;
				}
				if (m || jo(d, f, i, t.lapsTotal, a, s) === "finish" && (l.push(u), d.isPlayer && (t.playerFinishTick = a)), es(d, f, i, o, s), !m && !d.isGhost && d.finishTick === void 0 && ts(d, f, e[u], o) && (m = !0), m) {
					os(d, f, i, s);
					continue;
				}
				Ho(d, f, p, this.lastActiveHazards, o, s, c[u]);
			}
			Ko(this.fi, t.pickupStates, t.coinStates, i, n, this.consts, o, s);
			for (let e = 0; e < n.length; e++) n[e].distanceAlong = Po(n[e], r[e], i);
			Yo(n, r, this.order), Xo(n, r, this.order, o, s);
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
			let f = t.playerFinishTick >= 0 && (this.endRequested || a - t.playerFinishTick >= Math.round(J.finishGraceSeconds / o));
			if (d || f) {
				for (let e of this.order) {
					let t = n[e];
					t.finishTick === void 0 && (t.finishTick = a, r[e].dnf = !0);
				}
				Yo(n, r, this.order), this.order.forEach((e, t) => {
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
		if (l) for (let e = 0; e < n.length; e++) r[e].freezeRemaining = zo(r[e].freezeRemaining, o), r[e].rescue && us(n[e], r[e], i, o, s);
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
		let r = this.track.def.finalLapShift.routeOverrides ?? [], i = n.karts.map((e) => e.branch === 0 && r.some((t) => Aa(e.t, t.fromT, t.toT))), a = this.track.applyFinalLapShift(n.karts);
		a && t.push({
			type: "trackChanged",
			event: a
		});
		for (let r = 0; r < n.karts.length; r++) {
			let o = n.karts[r], s = n.trackers[r];
			Mo(o, s, this.track, n.lapsTotal, e, t), ls(o, s, this.track), a && i[r] && !s.rescue && !Wn(o) && cs(o, this.track, this.consts[r]) && os(o, s, this.track, t), o.distanceAlong = Po(o, s, this.track);
		}
		n.phase = "finalLap", t.push({
			type: "phase",
			phase: "finalLap"
		});
	}
	results() {
		let e = this.state, t = e.lapsTotal * this.track.length, n = 0, r = this.order.map((r) => {
			let i = e.karts[r], a = e.trackers[r], o = i.finishTick ?? -1, s = a.lapTicks.map((t, n) => ps(t - (n === 0 ? e.goTick : a.lapTicks[n - 1]))), c = o < 0 ? -1 : ps(o - e.goTick), l = o < 0 || a.dnf, u = -1;
			return l && c > 0 && i.distanceAlong > 0 && (u = Math.max(n + 100, Math.round(c * Math.max(1, t / i.distanceAlong)))), n = Math.max(n, l ? u : c), {
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
function ps(e) {
	return Math.round(e * 1e3 * gr);
}
//#endregion
//#region src/track-builder/creatures.ts
var ms = Object.freeze({
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
}), hs = (e) => {
	let t = Math.max(0, Math.min(1, e));
	return t * t * (3 - 2 * t);
}, gs = (e) => {
	let t = F(e * 127.1 + 311.7) * 43758.5453;
	return t - Math.floor(t);
}, _s = class {
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
		let t = this.branches.main.sample(e, 0), n = t.tangent[2], r = -t.tangent[0], i = I(n, r) || 1;
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
			reach: t.wall ?? t.halfWidth,
			heading: St(t.tangent[0], t.tangent[2])
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
				let e = ms.rumblesaur;
				for (let a of n.marks) if (a.kind === "ring") {
					let n = this.frame(this.t);
					for (let i = 0; i < e.ringPoints; i++) {
						let o = i / e.ringPoints * Math.PI * 2, s = a.position[0] + $e(o) * a.radius, c = a.position[2] + F(o) * a.radius, l = (s - n.p[0]) * n.right[0] + (c - n.p[2]) * n.right[2];
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
				let e = this.kind === "crab" ? ms.crab : ms.goose, a = this.frame(this.t), o = (n.position[0] - a.p[0]) * a.right[0] + (n.position[2] - a.p[2]) * a.right[2];
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
				let e = ms.whale, i = this.frame(this.t), a = e.gust * -this.side;
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
				let e = ms.rumblesaur, o = this.frame(this.t), s = this.on(o, n * this.clear(o, e.off, e.footprint)), c = o.heading - n * Math.PI / 2, l = this.on(o, n * (o.hw + e.off - e.step)), u = e.idle + e.rear, d = "idle", f = t / e.idle;
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
				let o = ms.yeti, s = this.frame(this.t), c = this.on(s, n * this.clear(s, o.off, o.footprint), 3), l = s.heading - n * Math.PI / 2, u = this.period(), d = Math.floor(e / u), f = "idle", p = 0;
				t >= u - o.windUp ? (f = "windUp", p = (t - (u - o.windUp)) / o.windUp) : t < o.flight && (f = "throw", p = t / o.flight);
				let m = this.branches.main.lut.length, h = this.t + o.ahead / m, g = this.frame(h), _ = (gs(d) * 2 - 1) * Math.max(0, g.hw - o.radius - 1), v = this.at(g, _);
				if (t < o.flight) {
					let e = hs(t / o.flight), n = [
						c[0],
						c[1] + 4,
						c[2]
					], r = F(e * Math.PI) * 9;
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
				let e = ms.kraken, o = this.frame(this.t), s = n * (o.hw + e.off), c = this.at(o, s, -1), l = o.heading - n * Math.PI / 2, u = "idle", d = t / e.idle, f = e.idle + e.warn, p = f + e.slam;
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
				let e = ms.crab, o = this.frame(this.t), s = o.hw + e.off, c = e.wait + e.cross, l = t % c, u = (t >= c ? -1 : 1) * n * s, d = -u, f = u, p = "wait", m = l / e.wait;
				if (l >= e.wait) {
					let t = hs((l - e.wait) / e.cross);
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
				let e = ms.goose, o = this.branches.main.lut.length, s = this.frame(this.t), c = s.hw + e.off, l = e.wait + e.charge, u = l + e.turn, d = 0, f = n * c, p = "wait", m = t / e.wait, h = s.heading + Math.PI;
				if (t >= e.wait && t < l) {
					let r = t - e.wait;
					d = r * e.speed;
					let i = hs(r / .8);
					f = n * c * (1 - i) + F(r / e.weavePeriod * Math.PI * 2) * e.weave * i, p = "charge", m = r / e.charge;
				} else if (t >= l) {
					d = e.charge * e.speed;
					let r = hs((t - l) / e.turn);
					f = n * c * r, p = t < u ? "turn" : "walk", m = t < u ? (t - l) / e.turn : (t - u) / (this.period() - u), t >= u && (d = e.charge * e.speed * (1 - hs((t - u) / (this.period() - u)))), h = t >= u ? s.heading : s.heading + Math.PI - n * Math.PI / 2 * r;
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
				let o = ms.whale, s = this.frame(this.t), c = o.swim + o.warn, l = c + o.slap, u = "swim", d = t / o.swim, f = 0;
				t >= o.swim - 2 && t < o.swim ? f = hs((t - (o.swim - 2)) / 2) : t >= o.swim && t < l ? f = 1 : t >= l && (f = 1 - hs((t - l) / Math.max(.5, this.period() - l))), t >= o.swim && t < c ? (u = "warn", d = (t - o.swim) / o.warn) : t >= c && t < l ? (u = "slap", d = (t - c) / o.slap) : t >= l && (u = "swim", d = (t - l) / (this.period() - l));
				let p = F(e / this.period() * Math.PI * 2) * 20, m = this.branches.main.lut.length, h = this.frame(this.t + p / m), g = n * (s.hw + o.off * (1 - f * .55));
				return {
					id: r,
					kind: i,
					position: this.at(h, g, o.height - f * 8),
					heading: h.heading + ($e(e / this.period() * Math.PI * 2) > 0 ? 0 : Math.PI),
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
function vs(e, t) {
	let n = Math.max(e.period ?? 5, H.ventWarnSeconds + H.ventEruptSeconds + .1), r = ((t + (e.offset ?? 0)) % n + n) % n, i = n - H.ventEruptSeconds, a = i - H.ventWarnSeconds;
	return r >= i ? {
		state: "erupt",
		k: (r - i) / H.ventEruptSeconds
	} : r >= a ? {
		state: "warn",
		k: (r - a) / H.ventWarnSeconds
	} : {
		state: "idle",
		k: r / a
	};
}
function ys(e, t) {
	let n = e.period ?? 1, r = n > 0 ? (t % n + n) % n : 0;
	if (r < H.fallingActiveSeconds) return {
		state: "down",
		k: r / H.fallingActiveSeconds
	};
	let i = Math.min(H.fallingWarnSeconds, n - H.fallingActiveSeconds);
	return r >= n - i ? {
		state: "drop",
		k: (r - (n - i)) / i
	} : {
		state: "idle",
		k: 0
	};
}
var bs = class {
	items = [];
	branches;
	creatures = [];
	constructor(e, t) {
		this.branches = t, e.forEach((e, n) => {
			if (e.type === "creature") {
				this.creatures.push(new _s(e.id ?? `creature-${n}`, e, t));
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
			...vs(n.def, e)
		});
		return t;
	}
	falling(e) {
		let t = [];
		for (let n of this.items) n.def.type === "falling" && n.enabled && t.push({
			id: n.id,
			position: n.position,
			...ys(n.def, e)
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
		for (let e of this.items) e.t = this.branches.main.nearestGlobal(e.position).t, e.lateral = va(this.branches, e.t, 0, e.position);
	}
	activeHazards(e) {
		let t = [], n = this.branches.main, r = n.lut.length, i = H.hazardRadius;
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
					let e = n.sample(a.t, 0).halfWidth, r = Math.max(0, e - i) * F(2 * Math.PI * l / c);
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
					ys(o, e).state === "down" && t.push({
						id: a.id,
						type: o.type,
						position: a.position,
						radius: i,
						hit: s
					});
					break;
				case "vent":
					vs(o, e).state === "erupt" && t.push({
						id: a.id,
						type: o.type,
						position: a.position,
						radius: H.ventRadius,
						hit: "launch",
						launch: o.launch ?? H.ventLaunch
					});
					break;
				case "gust": if (l < c / 2) {
					let e = n.sample(a.t, 0), r = e.tangent[2], i = -e.tangent[0], s = I(r, i) || 1, c = a.lateral > 0 ? -1 : 1, l = (o.speed ?? 0) * c;
					t.push({
						id: a.id,
						type: o.type,
						position: e.position,
						radius: H.gustWindow / 2,
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
function xs(e) {
	let t = H.minimapSamples, n = H.minimapPadding, r = [], i = Infinity, a = -Infinity, o = Infinity, s = -Infinity;
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
function Ss(e, t, n) {
	let r = [];
	for (let i = 0; i < n; i++) {
		let a = U(t + i / n), o = e.sample(a, 0);
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
function Cs(e, t, n) {
	let r = [], { rows: i, columns: a, spacing: o } = n;
	for (let n = 0; n < i; n++) {
		let i = U(t - (n + 1) * o / e.length), s = e.sample(i, 0).halfWidth, c = Math.max(0, Math.min(.5 * s, s - kr)), l = a > 1 ? 2 * c / (a - 1) : 0, u = n % 2 == 1 ? l / 4 : 0;
		for (let t = 0; t < a; t++) {
			let o = a > 1 ? -c + u + t * (2 * (c - u)) / (a - 1) : n % 2 == 1 ? c / 2 : -c / 2, s = e.sample(i, o);
			r.push({
				index: n * a + t,
				t: i,
				lateral: o,
				position: s.position,
				heading: z(s.tangent)
			});
		}
	}
	return r;
}
//#endregion
//#region src/track-builder/terrain.ts
var ws = 30, Ts = .01, Es = 16, Ds = 15, Os = class {
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
		this.maxHw = a, this.x0 = t - Es, this.z0 = r - Es, this.nx = Math.ceil((n - t) / Es) + 3, this.nz = Math.ceil((i - r) / Es) + 3;
		let o = new Int32Array(this.nx * this.nz + 1), s = (e, t) => Math.floor((e.pz[t] - this.z0) / Es) * this.nx + Math.floor((e.px[t] - this.x0) / Es);
		for (let t of e) for (let e = 0; e < t.n; e++) o[s(t, e) + 1]++;
		for (let e = 0; e < this.nx * this.nz; e++) o[e + 1] += o[e];
		this.start = o.slice();
		let c = o.slice();
		this.items = new Int32Array(this.start[this.nx * this.nz]), e.forEach((e, t) => {
			for (let n = 0; n < e.n; n++) this.items[c[s(e, n)]++] = t << 20 | n;
		});
	}
	top(e, t) {
		return this.query(e, t, ks, ws).top;
	}
	query(e, t, n, r = ws) {
		let i = this.maxHw + H.kerbWidth + r, a = i * i, o = Math.max(0, Math.floor((e - i - this.x0) / Es)), s = Math.min(this.nx - 1, Math.floor((e + i - this.x0) / Es)), c = Math.max(0, Math.floor((t - i - this.z0) / Es)), l = Math.min(this.nz - 1, Math.floor((t + i - this.z0) / Es)), u = 0, d = 0, f = Infinity, p = Infinity, m = NaN, h = !1, g = NaN, _ = NaN, v = 0;
		for (let n = c; n <= l; n++) for (let i = o; i <= s; i++) {
			let o = n * this.nx + i;
			for (let n = this.start[o]; n < this.start[o + 1]; n++) {
				let i = this.items[n], o = this.luts[i >> 20], s = i & 1048575, c = As(o, s, e, t);
				if (c > a) continue;
				let l = o.idx(s - 1), y = o.idx(s + 1);
				if (l !== s && As(o, l, e, t) < c || y !== s && As(o, y, e, t) <= c) continue;
				let b = js(o, s, e, t);
				if (!b || b.edge > r) continue;
				v++, b.edge < f ? (p = f, f = b.edge, m = b.h, h = b.open, g = b.cover, _ = b.lip) : b.edge < p && (p = b.edge);
				let x = b.edge > 0 ? b.edge : 0, S = 1 - x / ws;
				if (S <= 0) continue;
				let C = S * S * b.fade / (x + Ts);
				u += C, d += C * b.h;
			}
		}
		return n.top = u > 1e-12 ? d / u : m, n.edge = f, n.next = p, n.open = h, n.cover = g, n.lip = _, n.pieces = v, n;
	}
}, ks = {
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
function As(e, t, n, r) {
	let i = e.px[t] - n, a = e.pz[t] - r;
	return i * i + a * a;
}
function js(e, t, n, r) {
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
	let o = e.idx(Math.floor(a)), s = e.idx(Math.floor(a) + 1), c = a - Math.floor(a), l = 1 - c, u = e.px[o] * l + e.px[s] * c, d = e.pz[o] * l + e.pz[s] * c, f = e.rx[o] * l + e.rx[s] * c, p = e.rz[o] * l + e.rz[s] * c, m = I(f, p) || 1, h = ((n - u) * f + (r - d) * p) / m, g = e.hw[o] * l + e.hw[s] * c + H.kerbWidth, _ = e.bank[o] * l + e.bank[s] * c;
	$.open = !!(e.open[o] & (h < 0 ? 1 : 2));
	let v = $.open ? g + H.shoulderWidth : g, y = h < -v ? -v : h > v ? v : h, b = e.py[o] * l + e.py[s] * c, x = e.landAbove[o], S = Math.abs(h) - g, C = e.bore[o];
	if ($.cover = C === C && S < 1.5 ? b + C : NaN, x === x ? ($.h = b + x, $.lip = H.tunnelMesaTop) : ($.h = b - y * et(_) - H.offroadDrop, $.lip = NaN), $.edge = S, e.closed) $.fade = 1;
	else {
		let t = Math.min(1, Math.min(a, e.n - 1 - a) * e.length / e.step / Ds);
		$.fade = t * t * (3 - 2 * t);
	}
	return $;
}
function Ms(e, t) {
	let n = e.environment?.ground;
	if (n?.kind === "none") return -Infinity;
	let r = n?.y ?? 0;
	if (e.offroad !== !0) return r;
	let i = Infinity;
	for (let e = 0; e < t.n; e++) {
		let n = t.hw[e] + H.kerbWidth, r = t.py[e] - n * Math.abs(et(t.bank[e]));
		r < i && (i = r);
	}
	return Math.min(r, i - H.offroadDrop - .25);
}
//#endregion
//#region src/track-builder/tunnel.ts
var Ns = 3, Ps = (e) => {
	let t = e < 0 ? 0 : e > 1 ? 1 : e;
	return t * t * (3 - 2 * t);
};
function Fs(e, t, n) {
	let r = Math.round(t * e.step), i = Math.round(n * e.step), a = e.length / e.step, o = i - r + 1, s = new Float64Array(o), c = new Float64Array(o), l = new Float64Array(o), u = Infinity, d = -Infinity, f = Infinity, p = -Infinity;
	for (let t = Math.max(0, r - Math.ceil(Ns / a)); t <= Math.min(e.n - 1, i + Math.ceil(Ns / a)); t++) e.bore[t] = H.tunnelApex + .8;
	for (let t = r; t <= i; t++) {
		let n = Math.min(t - r, i - t) * a;
		e.landAbove[t] = -H.offroadDrop + (H.tunnelHill + H.offroadDrop) * Ps(n / H.tunnelRamp);
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
function Is(e, t) {
	if (e.covered.fill(0), e.reach.fill(H.offroadReach), !t.length) return;
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
				e.covered[n] = 1, e.reach[n] = 0;
				break;
			}
		}
	}
	let n = e.length / e.step, r = Math.ceil(H.tunnelFunnel / n);
	for (let t = 0; t < e.n; t++) if (!e.covered[t]) for (let i = 1; i <= r; i++) {
		let r = e.idx(t + i), a = e.idx(t - i);
		if (r !== t && e.covered[r] || a !== t && e.covered[a]) {
			e.reach[t] = H.offroadReach * Ps(i * n / H.tunnelFunnel);
			break;
		}
	}
}
//#endregion
//#region src/track-builder/validate.ts
var Ls = w.properties.base.properties.topSpeed.default, Rs = .8, zs = 2, Bs = 5, Vs = 4, Hs = .25, Us = 30, Ws = 10, Gs = Math.max(H.hazardRadius, H.ventRadius) + kr + 1, Ks = /* @__PURE__ */ new Set(["static", "vent"]);
function qs(e) {
	return [
		e.x,
		e.y,
		e.z,
		e.halfWidth,
		e.bank ?? 0
	].some((e) => !Number.isFinite(e));
}
function Js(e, t, n, r) {
	if (e.length < r) return n.push(`${t}: needs at least ${r} control points, has ${e.length}`), !1;
	for (let r = 0; r < e.length; r++) {
		if (qs(e[r])) return n.push(`${t}: control point ${r} has a NaN or infinite value`), !1;
		Math.abs(e[r].bank ?? 0) > H.maxBankDeg && n.push(`${t}: control point ${r} bank ${e[r].bank}° exceeds ${H.maxBankDeg}°`);
	}
	return !0;
}
function Ys(e, t) {
	let n = e.idx(t + 1), r = e.idx(t - 1), i = e.tx[n] - e.tx[r], a = e.ty[n] - e.ty[r], o = e.tz[n] - e.tz[r], s = e.length / e.step, c = L(i, a, o) / (2 * s);
	return c > 0 ? 1 / c : Infinity;
}
function Xs(e, t, n, r) {
	let i = e.length;
	for (let a = 0; a < (r ? i : i - 1); a++) {
		let r = e[a], o = e[(a + 1) % i], s = L(o.x - r.x, o.y - r.y, o.z - r.z);
		s < Vs && n.push(`${t}: control points ${a} and ${(a + 1) % i} are ${s.toFixed(2)} m apart (min ${Vs})`);
	}
}
function Zs(e, t, n) {
	let r = e.length / e.step, i = +!e.closed, a = e.closed ? e.n : e.n - 1, o = Infinity, s = 0, c = 0, l = 0;
	for (let t = i; t < a; t++) {
		let n = Ys(e, t) / e.hw[t];
		n < o && (o = n, s = t / e.step);
	}
	for (let t = 0; t < (e.closed ? e.n : e.n - 1); t++) {
		let n = Math.abs(e.hw[e.idx(t + 1)] - e.hw[t]) / r;
		n > c && (c = n, l = t / e.step);
	}
	o < H.minTurnRadiusFactor && n.push(`${t}: hairpin at t=${s.toFixed(3)}: turn radius is ${o.toFixed(2)} × halfWidth, minimum ${H.minTurnRadiusFactor}`), c > Hs && n.push(`${t}: halfWidth changes ${c.toFixed(2)} m per metre at t=${l.toFixed(3)}, max ${Hs}`);
}
function Qs(e, t) {
	let n = (e[0] * t[0] + e[2] * t[2]) / (I(e[0], e[2]) * I(t[0], t[2]) || 1);
	return Ht(Math.max(-1, Math.min(1, n))) * 180 / Math.PI;
}
function $s(e, t) {
	let n = e.finalLapShift.routeOverrides ?? [];
	if (!n.length) return null;
	let r = e.controlPoints.map((e) => t.nearestTGlobal([
		e.x,
		e.y,
		e.z
	])), i = wa(e.controlPoints, r, n);
	return {
		points: i,
		lut: Hr(i)
	};
}
function ec(e) {
	let t = [], n = [], r = e.controlPoints;
	if (Js(r, "controlPoints", t, 8)) {
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
	let a = Hr(r), o = U(e.startGrid.t), s = a.sample(o, 0).halfWidth;
	s < H.minStartHalfWidth && t.push(`start line halfWidth ${s.toFixed(2)} < ${H.minStartHalfWidth}`), Xs(r, "controlPoints", t, !0), Zs(a, "main", t);
	let c = a.minY, l = /* @__PURE__ */ new Set();
	for (let r of e.shortcuts ?? []) {
		let e = `shortcut "${r.id}"`;
		l.has(r.id) && t.push(`${e}: duplicate id`), l.add(r.id);
		let i = U(r.exitT - r.entryT);
		if ((i <= 0 || i > .5) && t.push(`${e}: exitT must follow entryT by less than half a lap (span ${i.toFixed(3)})`), !Js(r.controlPoints, e, t, 2)) continue;
		let o = a.sample(r.entryT, 0).position, s = a.sample(r.exitT, 0).position, u = r.controlPoints[0], d = r.controlPoints[r.controlPoints.length - 1], f = L(u.x - o[0], u.y - o[1], u.z - o[2]), p = L(d.x - s[0], d.y - s[1], d.z - s[2]);
		f > zs && t.push(`${e}: first point is ${f.toFixed(2)} m from the main line at entryT (max ${zs})`), p > zs && t.push(`${e}: last point is ${p.toFixed(2)} m from the main line at exitT (max ${zs})`);
		let m = Hr(r.controlPoints, {
			closed: !1,
			samples: 256,
			divisions: 512
		});
		m.minY < c && (c = m.minY), Xs(r.controlPoints, e, t, !1), Zs(m, e, t);
		let h = Qs(m.sample(0, 0).tangent, a.sample(r.entryT, 0).tangent), g = Qs(m.sample(1, 0).tangent, a.sample(r.exitT, 0).tangent);
		h > Us && n.push(`${e}: leaves the main line at ${h.toFixed(0)}° (max ${Us}°)`), g > Us && n.push(`${e}: rejoins the main line at ${g.toFixed(0)}° (max ${Us}°)`);
	}
	let u = $s(e, a);
	u && (Xs(u.points, "final-lap road", t, !0), Zs(u.lut, "final-lap road", t));
	let d = (n, r, i, a) => {
		(e.hazards ?? []).forEach((o, s) => {
			if (!Ks.has(o.type)) return;
			let c = i(o);
			for (let i = 0; i < e.checkpointCount; i++) {
				let l = W(c, U(r + i / e.checkpointCount)) * n.length;
				l >= 0 && l < Ws && t.push(`${a}hazard ${o.id ?? s} (${o.type}) is ${l.toFixed(1)} m past checkpoint ${i} (min ${Ws})`), l < 0 && -l < Gs && t.push(`${a}hazard ${o.id ?? s} (${o.type}) is ${(-l).toFixed(1)} m before checkpoint ${i} (min ${Gs.toFixed(1)})`);
			}
		});
	};
	if (d(a, o, (e) => e.t, ""), u) {
		let e = u.lut;
		d(e, e.nearestTGlobal(a.sample(o, 0).position), (t) => e.nearestTGlobal(a.sample(t.t, t.lateral ?? 0).position), "final lap: ");
	}
	e.voidY > c - Bs && t.push(`voidY ${e.voidY} must be at least ${Bs} m below the lowest road sample (${c.toFixed(2)})`);
	let f = (e) => e >= 0 && e <= 1, p = (e, n) => {
		(n ?? []).forEach((n, r) => {
			f(n.t) || t.push(`${e} ${r}: t ${n.t} outside 0..1`), n.shortcut && !l.has(n.shortcut) && t.push(`${e} ${r}: unknown shortcut "${n.shortcut}"`);
		});
	};
	p("pickup", e.pickups), p("coin", e.coins), p("boostPad", e.boostPads), p("jump", e.jumps), (e.hazards ?? []).forEach((e, n) => {
		f(e.t) || t.push(`hazard ${n}: t ${e.t} outside 0..1`);
	});
	let m = (e, t, n) => U(e - t) <= U(n - t);
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
	for (let e of h.routeOverrides ?? []) (!f(e.fromT) || !f(e.toT)) && t.push("routeOverride: fromT/toT outside 0..1"), Js(e.controlPoints, "routeOverride", t, 1);
	p("addsJump", h.addsJumps);
	let _ = a.length / (Rs * Ls), [v, y] = H.lapTimeWarn;
	return (_ < v || _ > y) && n.push(`estimated lap ${_.toFixed(1)} s (length ${a.length.toFixed(0)} m) is outside ${v}–${y} s; design target is 45–60 s`), {
		ok: t.length === 0,
		errors: t,
		warnings: n
	};
}
function tc(e) {
	let t = ec(e);
	if (!t.ok) throw Error(`track "${e.id}" is invalid:\n  ${t.errors.join("\n  ")}`);
}
//#endregion
//#region src/track-builder/track.ts
var nc = class {
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
		let t = Hr(this.controlPoints), n = [new Ur(0, "main", t, 0, 1, [])];
		(e.shortcuts ?? []).forEach((e, r) => n.push(Kr(r + 1, e, t))), this.branches = new Jr(n), this.groundPlaneY = Ms(e, t), this.tunnels = (e.shortcuts ?? []).flatMap((e, t) => e.tunnel ? [Fs(n[t + 1].lut, e.tunnel.from, e.tunnel.to)] : []), this.land = e.offroad === !0 ? new Os(n.map((e) => e.lut)) : null, this.startT = U(e.startGrid.t), this.startPoint = t.sample(this.startT, 0).position, this.openEdges = (e.openEdges ?? []).map((e) => ({
			...e,
			fromPoint: t.sample(e.fromT, 0).position,
			toPoint: t.sample(e.toT, 0).position
		})), this.loopFeet = (e.loops ?? []).map((e) => ({
			...e,
			point: t.sample(e.t, 0).position
		})), this.features = ga(e, this.branches), this.hazards = new bs(e.hazards ?? [], this.branches), this.branches.setLap(1), this.rebuildDerived();
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
		this.branches.setLap(e), this.minimap = xs(this.branches);
	}
	activeHazards(e) {
		return this.hazards.activeHazards(e);
	}
	applyFinalLapShift(e = []) {
		return Ta(this, e);
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
		for (let e of this.branches.list) e.lut.offroad = this.def.offroad === !0, e.lut.land = this.land, e.lut.floorY = this.groundPlaneY, Is(e.lut, this.tunnels);
		e.open.fill(0);
		for (let t of this.openEdges) {
			let n = t.side === "left" ? 1 : t.side === "right" ? 2 : 3;
			for (let r = 0; r < e.n; r++) ((r / e.n - t.fromT) % 1 + 1) % 1 <= ((t.toT - t.fromT) % 1 + 1) % 1 && (e.open[r] |= n);
		}
		this.checkpoints = Ss(e, this.startT, this.def.checkpointCount), this.spawnGrid = Cs(e, this.startT, this.def.startGrid), this.minimap = xs(this.branches);
		let t = this.def.offroad === !0 ? H.rampSkirt : 0;
		this.jumps = ba(this.features).map((e) => t && e.shape !== "hump" && e.rise ? {
			...e,
			skirt: t
		} : e), this.boostPads = xa(this.features), this.loops = this.loopFeet.map((e) => ({
			id: e.id,
			t: e.t,
			radius: e.radius ?? H.loopRadius,
			spread: H.loopSpread,
			shift: this.def.mirrored ? -H.loopShift : H.loopShift,
			approach: H.loopApproach,
			exit: H.loopExit,
			width: H.loopWidth
		}));
	}
};
function rc(e, t = {}) {
	return (t.validate ?? !0) && tc(e), new nc(e);
}
//#endregion
//#region src/backend-leaderboard/inputlog.ts
var ic = 127, ac = (e, t, n) => Math.round(Math.min(n, Math.max(t, e)) * ic) / ic + 0;
function oc(e, t) {
	return t.steer = ac(e.steer, -1, 1), t.throttle = ac(e.throttle, 0, 1), t.brake = ac(e.brake, 0, 1), t.drift = e.drift, t.item = e.item, t.lookBack = e.lookBack, t.horn = e.horn, t;
}
function sc(e, t, n) {
	t[n] = Math.round(e.steer * ic) + 256 & 255, t[n + 1] = Math.round(e.throttle * ic), t[n + 2] = Math.round(e.brake * ic), t[n + 3] = +!!e.drift | (e.item ? 2 : 0) | (e.lookBack ? 4 : 0) | (e.horn ? 8 : 0);
}
function cc(e, t) {
	let n = e[t] > 127 ? e[t] - 256 : e[t], r = e[t + 3];
	return {
		steer: n / ic + 0,
		throttle: e[t + 1] / ic,
		brake: e[t + 2] / ic,
		drift: (r & 1) > 0,
		item: (r & 2) > 0,
		lookBack: (r & 4) > 0,
		horn: (r & 8) > 0
	};
}
function lc(e) {
	let t = "";
	for (let n = 0; n < e.length; n += 32768) t += String.fromCharCode(...e.subarray(n, n + 32768));
	return btoa(t);
}
function uc(e) {
	let t = atob(e), n = new Uint8Array(t.length);
	for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
	return n;
}
function dc(e) {
	let t = /* @__PURE__ */ new Uint8Array(4), n = /* @__PURE__ */ new Uint8Array(4), r = [1], i = 0, a = () => {
		let e = i;
		for (; e >= 128;) r.push(e & 127 | 128), e >>>= 7;
		r.push(e), r.push(n[0], n[1], n[2], n[3]);
	};
	for (let r of e) {
		if (sc(r, t, 0), i > 0 && t[0] === n[0] && t[1] === n[1] && t[2] === n[2] && t[3] === n[3]) {
			i++;
			continue;
		}
		i > 0 && a(), n.set(t), i = 1;
	}
	return i > 0 && a(), lc(Uint8Array.from(r));
}
function fc(e, t = 72e3) {
	let n = uc(e);
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
		let o = cc(n, i);
		i += 4;
		for (let t = 0; t < e; t++) r.push(o);
	}
	return r;
}
//#endregion
//#region src/game/simtick.ts
function pc(e, t) {
	let { manager: n, ai: r, items: i, inputs: a, playerIndex: o } = e;
	r.fill(n.state, n.lastActiveHazards, a), o >= 0 && t && n.state.karts[o].finishTick === void 0 && (a[o] = oc(t, e.playerSlot));
	let s = n.step(a), c = i.step(a, s, gr);
	for (let e = 0; e < a.length; e++) r.threatened[e] = i.threatened[e];
	return {
		race: s,
		items: c
	};
}
//#endregion
//#region src/backend-leaderboard/verify.ts
function mc(e, t, n, r, i) {
	let a = m(t, e.id, n, r), o = rc(e), s = new fs(o, a), c = new Oo(o, s), l = {
		manager: s,
		items: c,
		ai: new pa(o, a, s.state, { itemRoles: c.roles }),
		inputs: s.state.karts.map(() => ({ ...mn })),
		playerIndex: 0,
		playerSlot: { ...mn }
	}, u = 0;
	for (; u < i.length && s.state.phase !== "finished"; u++) pc(l, i[u]);
	let d = s.results().ranks[0], f = d !== void 0 && !d.dnf && d.finishTick >= 0;
	return {
		finished: f,
		timeMs: f ? d.timeMs : -1,
		lapTimesMs: f ? d.lapTimesMs : [],
		ticks: u
	};
}
var hc = 1e3;
function gc(e, t, n, r, i, a) {
	let o;
	try {
		o = fc(i);
	} catch (e) {
		return {
			ok: !1,
			reason: `bad input log: ${e.message}`
		};
	}
	let s = mc(e, t, n, r, o);
	return s.finished ? Math.abs(s.timeMs - a) > 1e3 ? {
		ok: !1,
		reason: `claimed ${a} ms but the replay finished in ${s.timeMs} ms`
	} : {
		ok: !0,
		timeMs: s.timeMs,
		lapTimesMs: s.lapTimesMs,
		canonicalLog: dc(_c(e, t, n, r, o.slice(0, s.ticks), s.timeMs))
	} : {
		ok: !1,
		reason: "the replay never reached the finish line"
	};
}
function _c(e, t, n, r, i, a) {
	let o = i.map((e, n) => {
		let r = oc(e, { ...mn });
		return r.horn = !1, n <= Io ? {
			...mn,
			throttle: +(r.throttle > J.stuckInputMin)
		} : (t === "timeTrial" && (r.item = !1, r.lookBack = !1), r);
	}), s = mc(e, t, n, r, o);
	return s.finished && s.timeMs === a ? o : i.map((e) => e.horn ? {
		...e,
		horn: !1
	} : e);
}
var vc = Object.freeze(Object.fromEntries(Object.values(/* @__PURE__ */ Object.assign({
	"../track-builder/tracks/boardwalk-nights.json": e,
	"../track-builder/tracks/canyon-rush.json": t,
	"../track-builder/tracks/frostbite-pass.json": n,
	"../track-builder/tracks/harbour-loop.json": r,
	"../track-builder/tracks/meadow-run.json": i,
	"../track-builder/tracks/skyline-circuit.json": a
})).map((e) => [e.id, e]))), yc = Object.freeze(Object.keys(vc).sort());
//#endregion
export { hc as CLAIM_TOLERANCE_MS, s as CLIENT_VERSION, c as MAX_LOG_BYTES, vc as TRACKS, yc as TRACK_IDS, S as checkSubmission, d as dailySeed, u as ipBucket, gc as verifyRun };
