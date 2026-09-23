var e = {
	id: "boardwalk-nights",
	name: "Boardwalk Nights",
	biome: "boardwalk",
	cup: "summit",
	orderInCup: 2,
	laps: 3,
	targetLapSeconds: 48,
	medalTimesMs: {
		gold: 148e3,
		silver: 163e3,
		bronze: 179e3
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
	boostPads: [{
		t: .14,
		lateral: 0,
		width: 3
	}, {
		t: .6,
		lateral: -3,
		width: 3
	}],
	pickups: [
		{
			t: .16,
			lateral: -4
		},
		{
			t: .16,
			lateral: 0
		},
		{
			t: .16,
			lateral: 4
		},
		{
			t: .27,
			lateral: -3
		},
		{
			t: .27,
			lateral: 3
		},
		{
			t: .36,
			shortcut: "arcade-alley",
			lateral: 0
		},
		{
			t: .58,
			lateral: -3
		},
		{
			t: .58,
			lateral: 3
		},
		{
			t: .9,
			lateral: -3
		},
		{
			t: .9,
			lateral: 3
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
			t: .87,
			lateral: 4,
			hit: "spin",
			asset: "teacup"
		}
	],
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
				band: "far"
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
		gold: 156e3,
		silver: 172e3,
		bronze: 188e3
	},
	voidY: -25,
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
		controlPoints: [
			{
				x: 187.27,
				y: 3.87,
				z: -75.81,
				halfWidth: 7,
				surface: "road"
			},
			{
				x: 139.16,
				y: -9.3,
				z: -40.67,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 91.04,
				y: -12.11,
				z: -5.52,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: 42.93,
				y: -.28,
				z: 29.63,
				halfWidth: 5.5,
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
	jumps: [{
		id: "wash-ramp",
		t: .28,
		lateral: -2,
		launch: 5,
		width: 6
	}, {
		id: "outcrop-ramp",
		t: .7,
		lateral: -2,
		launch: 6,
		width: 6
	}],
	boostPads: [{
		t: .12,
		lateral: 0,
		width: 3
	}, {
		t: .72,
		lateral: 0,
		width: 3
	}],
	pickups: [
		{
			t: .04,
			lateral: -5
		},
		{
			t: .04,
			lateral: 0
		},
		{
			t: .04,
			lateral: 5
		},
		{
			t: .36,
			shortcut: "mine-tunnel",
			lateral: 0
		},
		{
			t: .71,
			lateral: -3
		},
		{
			t: .71,
			lateral: 3
		},
		{
			t: .78,
			lateral: -3
		},
		{
			t: .78,
			lateral: 3
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
	hazards: [{
		id: "rockfall-1",
		type: "falling",
		t: .22,
		lateral: 2,
		period: 5,
		hit: "slow",
		asset: "rockfall"
	}, {
		id: "minecart-1",
		type: "crossing",
		t: .74,
		lateral: 0,
		period: 6,
		speed: 1.4,
		hit: "spin",
		asset: "minecart"
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
					x: 139.16,
					y: -9.3,
					z: -40.67,
					halfWidth: 5.5,
					surface: "road"
				},
				{
					x: 91.04,
					y: -12.11,
					z: -5.52,
					halfWidth: 5.5,
					surface: "road"
				},
				{
					x: 42.93,
					y: -.28,
					z: 29.63,
					halfWidth: 5.5,
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
				instances: 40,
				band: "roadside"
			},
			{
				asset: "rock",
				instances: 40,
				band: "roadside"
			},
			{
				asset: "mesa",
				instances: 20,
				band: "far"
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
		gold: 162e3,
		silver: 177e3,
		bronze: 192e3
	},
	voidY: -10,
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
				x: -150,
				y: 2.5,
				z: 21.6,
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
	jumps: [{
		id: "ski-jump",
		t: .472,
		lateral: 2,
		launch: 5.5,
		width: 6
	}],
	boostPads: [{
		t: .14,
		lateral: 0,
		width: 3
	}, {
		t: .68,
		lateral: 0,
		width: 3
	}],
	pickups: [
		{
			t: .03,
			lateral: -4
		},
		{
			t: .03,
			lateral: 0
		},
		{
			t: .03,
			lateral: 4
		},
		{
			t: .3,
			lateral: -3
		},
		{
			t: .3,
			lateral: 3
		},
		{
			t: .46,
			lateral: 0
		},
		{
			t: .62,
			lateral: -3
		},
		{
			t: .62,
			lateral: 3
		},
		{
			t: .65,
			lateral: 0,
			shortcut: "lake-crossing"
		},
		{
			t: .9,
			lateral: -3
		},
		{
			t: .9,
			lateral: 3
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
	hazards: [{
		id: "snowball-1",
		type: "rolling",
		t: .22,
		lateral: 3,
		period: 8,
		speed: 6,
		hit: "spin",
		asset: "snowball"
	}, {
		id: "snowball-2",
		type: "rolling",
		t: .83,
		lateral: -3,
		period: 8,
		speed: 6,
		hit: "spin",
		asset: "snowball"
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
		fogDensity: .002,
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
				instances: 80,
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
			}
		]
	}
}, r = {
	id: "harbour-loop",
	name: "Harbour Loop",
	biome: "harbour",
	cup: "sunrise",
	orderInCup: 1,
	laps: 3,
	targetLapSeconds: 50,
	medalTimesMs: {
		gold: 15e4,
		silver: 165e3,
		bronze: 18e4
	},
	voidY: -12,
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
				x: -108,
				y: 3,
				z: 60,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -115,
				y: 1,
				z: 0,
				halfWidth: 5.5,
				surface: "road"
			},
			{
				x: -125,
				y: 0,
				z: -55,
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
	boostPads: [{
		t: .2172,
		lateral: -4,
		width: 3
	}, {
		t: .3886,
		lateral: 0,
		width: 3
	}],
	pickups: [
		{
			t: .0493,
			lateral: -4
		},
		{
			t: .0493,
			lateral: 0
		},
		{
			t: .0493,
			lateral: 4
		},
		{
			t: .3886,
			lateral: -3
		},
		{
			t: .3886,
			lateral: 3
		},
		{
			t: .542,
			lateral: -4
		},
		{
			t: .542,
			lateral: 0
		},
		{
			t: .542,
			lateral: 4
		},
		{
			t: .8028,
			lateral: -3
		},
		{
			t: .8028,
			lateral: 3
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
				instances: 20,
				band: "far"
			},
			{
				asset: "gull",
				instances: 30,
				band: "sky"
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
		gold: 148e3,
		silver: 163e3,
		bronze: 178e3
	},
	voidY: -10,
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
				x: 222.7,
				y: 2.27,
				z: -29.6,
				halfWidth: 5,
				surface: "road"
			},
			{
				x: 235.8,
				y: 2.56,
				z: 19.3,
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
	jumps: [{
		id: "haystack-ramp",
		t: .75,
		lateral: 2,
		launch: 5,
		width: 6
	}],
	boostPads: [{
		t: .15,
		lateral: 0,
		width: 3
	}, {
		t: .7,
		lateral: -3,
		width: 3
	}],
	pickups: [
		{
			t: .09,
			lateral: -4
		},
		{
			t: .09,
			lateral: 0
		},
		{
			t: .09,
			lateral: 4
		},
		{
			t: .4765,
			shortcut: "hedgerow-cut",
			lateral: 0
		},
		{
			t: .62,
			lateral: -3
		},
		{
			t: .62,
			lateral: 3
		},
		{
			t: .9,
			lateral: 0
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
				instances: 15,
				band: "far"
			},
			{
				asset: "windmill-small",
				instances: 20,
				band: "far"
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
		gold: 162e3,
		silver: 178e3,
		bronze: 194e3
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
				x: 126.7,
				y: 70.99,
				z: 49.92,
				halfWidth: 4.5,
				surface: "rail"
			},
			{
				x: 63.43,
				y: 76.01,
				z: 99.97,
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
	boostPads: [{
		t: .06,
		lateral: 0,
		width: 3
	}, {
		t: .9,
		lateral: -3,
		width: 3
	}],
	pickups: [
		{
			t: .03,
			lateral: -4
		},
		{
			t: .03,
			lateral: 0
		},
		{
			t: .03,
			lateral: 4
		},
		{
			t: .6184,
			shortcut: "sky-rail",
			lateral: 0
		},
		{
			t: .8,
			lateral: -3
		},
		{
			t: .8,
			lateral: 3
		},
		{
			t: .95,
			lateral: 0
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
					x: 126.7,
					y: 70.99,
					z: 49.92,
					halfWidth: 4.5,
					surface: "rail"
				},
				{
					x: 63.43,
					y: 76.01,
					z: 99.97,
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
]), s = "1", c = 262144;
function l(e = /* @__PURE__ */ new Date()) {
	return e.getUTCFullYear() * 1e4 + (e.getUTCMonth() + 1) * 100 + e.getUTCDate();
}
function u(e, t) {
	let n = [...t].sort();
	return n[e % n.length];
}
var d = (e) => e === "timeTrial" || e === "daily";
function f(e, t, n, r) {
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
var p = [
	"fuck",
	"shit",
	"cunt",
	"nigg",
	"fag",
	"bitch",
	"whore",
	"slut",
	"rape",
	"nazi",
	"hitler",
	"penis",
	"vagina",
	"cock",
	"dick",
	"pussy",
	"twat",
	"wank",
	"retard"
];
function m(e) {
	return e.toLowerCase().replace(/[013457@$]/g, (e) => ({
		0: "o",
		1: "i",
		3: "e",
		4: "a",
		5: "s",
		7: "t",
		"@": "a",
		$: "s"
	})[e]).replace(/[^a-z]/g, "");
}
function h(e) {
	let t = m(e);
	return !p.some((e) => t.includes(e));
}
function g(e, t, n = l()) {
	if (!e || typeof e != "object") return "payload must be an object";
	let r = e;
	if (typeof r.name != "string" || !/^[A-Za-z0-9 _-]{1,16}$/.test(r.name) || !r.name.trim()) return "name must be 1–16 letters, digits, spaces, _ or -";
	if (!h(r.name)) return "please pick another name";
	if (typeof r.trackId != "string" || !t.includes(r.trackId)) return "unknown track";
	if (typeof r.mode != "string" || !d(r.mode)) return "mode must be timeTrial or daily";
	if (r.speedClass !== 150) return "leaderboards are 150cc only";
	if (typeof r.racerId != "string" || !o.some((e) => e.id === r.racerId)) return "unknown racer";
	if (!Number.isInteger(r.timeMs) || r.timeMs < 3e4) return "time is not a whole number of milliseconds of at least 30 s";
	if (typeof r.inputLog != "string" || r.inputLog.length === 0 || r.inputLog.length > 262144) return "input log missing or too large";
	if (r.clientVersion !== "1") return "please reload the game: new version";
	if (r.mode === "daily") {
		if (!Number.isInteger(r.dailySeed) || r.dailySeed !== n && r.dailySeed !== _(n)) return "that daily challenge is closed";
		if (r.trackId !== u(r.dailySeed, t)) return "wrong track for that day";
	}
	return null;
}
function _(e) {
	let t = Math.floor(e / 1e4), n = Math.floor(e / 100) % 100, r = e % 100;
	return l(/* @__PURE__ */ new Date(Date.UTC(t, n - 1, r) - 864e5));
}
var v = {
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
"ownSeconds\",\"hardWallFraction\",\"slipstreamSameWayDot\",\"hopLandWindow\",\"maxBoostMultiplier\",\"shieldMassBonus\"],\"properties\":{\"topSpeed\":{\"type\":\"number\",\"description\":\"m/s\",\"default\":25},\"accel\":{\"type\":\"number\",\"default\":12},\"brake\":{\"type\":\"number\",\"default\":20},\"steerRate\":{\"type\":\"number\",\"description\":\"rad/s at low speed\",\"default\":2.4},\"driftSteerMin\":{\"type\":\"number\",\"description\":\"Drift yaw = steerRate × lerp(driftSteerMin, driftSteerMax, drift.yawK), where yawK chases the stick toward the drift side over driftYawLag and starts at 0 on the lock. Mario Kart Wii datamine: drift tightness sits in the same range as normal handling and the turn value lerps toward the stick each frame (reactivity), it never snaps. 0.35/0.8 was a 30 m circle on rails (Adam, 21 Sept 2026).\",\"default\":0.1},\"driftSteerMax\":{\"type\":\"number\",\"description\":\"Full inward stick: 0.96 rad/s, a 21 m circle at 20 m/s, a notch tighter than the grip turn at top speed. Adam settled it by feel on 21 Sept 2026 (1.08 too tight, 0.84 too loose).\",\"default\":0.4},\"airSteer\":{\"type\":\"number\",\"description\":\"Steering authority while airb" +
"orne, as a fraction of the grip turn. Mario Kart: the hop goes straight and the stick at landing sets the drift (delay drift); 0.15 keeps a whisper of control off ramps.\",\"default\":0.15},\"driftYawLag\":{\"type\":\"number\",\"description\":\"Seconds for the drift turn value to close most of the gap to the stick (MKW drift reactivity). The drift begins loose and tightens.\",\"default\":0.35},\"gripDrift\":{\"type\":\"number\",\"description\":\"Lateral damping per second while drifting. Lower than the road grip, so the kart carries outward on the drift lock and slides through the bend (MKW outside drift, target angle).\",\"default\":4.5},\"bumpSeparateRate\":{\"type\":\"number\",\"description\":\"m/s at which overlapping karts are eased apart; the old instant pop was the jarring part of a bump.\",\"default\":2.5},\"hopSeconds\":{\"type\":\"number\",\"default\":0.25},\"chargeFull\":{\"type\":\"number\",\"default\":5},\"chargeNeutral\":{\"type\":\"number\",\"default\":2},\"driftTiers\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[250,550,850]},\"boostMultiplier\":{\"type\":\"number\",\"description\":\"Drift mini-turbo. Mario Kart Wii's mini-turbo is +30%; the +20" +
"% row is its standstill mini-turbo.\",\"default\":1.3},\"boostSeconds\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"default\":[0.6,1.5,2.5]},\"trickMultiplier\":{\"type\":\"number\",\"default\":1.3},\"trickSeconds\":{\"type\":\"number\",\"default\":0.7},\"padMultiplier\":{\"type\":\"number\",\"description\":\"Mario Kart Wii dash panel: +40% for 60 frames.\",\"default\":1.4},\"padSeconds\":{\"type\":\"number\",\"default\":1.0},\"itemSpeedMultiplier\":{\"type\":\"number\",\"default\":1.4},\"itemSpeedSeconds\":{\"type\":\"number\",\"default\":1.5},\"slipstreamSeconds\":{\"type\":\"number\",\"description\":\"Seconds in a wake before the boost fires\",\"default\":2.0},\"slipstreamMultiplier\":{\"type\":\"number\",\"default\":1.12},\"slipstreamBoostSeconds\":{\"type\":\"number\",\"description\":\"design §7: slipstream 2 s → +12% for 1.5 s\",\"default\":1.5},\"coinBonusEach\":{\"type\":\"number\",\"default\":0.0066},\"coinCap\":{\"type\":\"integer\",\"default\":10},\"gripRoad\":{\"type\":\"number\",\"description\":\"Lateral velocity damping per second. Mario Kart does NOT reduce grip off-road; the off-road penalty is the speed cap in surfaceSpeed. Only slippery surfaces (ice) cu" +
"t grip. See docs/sops/kart-controller.md Approach.\",\"default\":8},\"gripOffroad\":{\"type\":\"number\",\"description\":\"Dirt. Equal to gripRoad on purpose (MK8DX BrakeRt only caps speed off-road).\",\"default\":8},\"gripMud\":{\"type\":\"number\",\"description\":\"Equal to gripRoad on purpose; mud is punished by surfaceSpeed, not by grip.\",\"default\":8},\"gripIce\":{\"type\":\"number\",\"description\":\"The one surface that really slides (MK8DX SlipRt applies to ice and sand).\",\"default\":2.5},\"surfaceSpeed\":{\"description\":\"Top-speed cap per surface, as a fraction of the kart's on-road top speed. This is how Mario Kart models off-road: a hard speed cap, not drag and not grip. MK8DX datamined BrakeRt for dirt terrain has three tiers, 0.7 light / 0.5 medium / 0.3 heavy (deep sand). We map dirt to the light tier and mud to the medium tier; 0.3 stays free for a future deep-mud surface. Ice takes the slippery-terrain value (~0.9) and pays the rest in grip. The cap is ignored while a boost is live and while airborne (both are real MK rules, and they are what makes the hop-over-off-road line worth learning).\",\"type\":\"object\",\"required\":[\"road\",\"dirt\",\"mud\",\"ice\"" +
",\"boost\",\"rail\"],\"properties\":{\"road\":{\"type\":\"number\",\"default\":1.0},\"dirt\":{\"type\":\"number\",\"default\":0.7},\"mud\":{\"type\":\"number\",\"description\":\"MK8DX's medium off-road tier is 0.5; softened to 0.6 by design decision 8 Sept 2026.\",\"default\":0.6},\"ice\":{\"type\":\"number\",\"default\":0.9},\"boost\":{\"type\":\"number\",\"default\":1.0},\"rail\":{\"type\":\"number\",\"default\":1.0}}},\"boostIgnoresSurfaceCap\":{\"type\":\"boolean\",\"description\":\"MK Wii: a dash-panel boost carries off-road immunity. We apply it to every boost source for one readable rule.\",\"default\":true},\"airborneIgnoresSurfaceCap\":{\"type\":\"boolean\",\"description\":\"No ground contact, no surface cap. This is what makes hopping over a mud patch work.\",\"default\":true},\"gravity\":{\"type\":\"number\",\"description\":\"m/s². No Mario Kart datamine exists for this; tuned so hopSeconds lands.\",\"default\":26},\"hopVelocity\":{\"type\":\"number\",\"description\":\"m/s. gravity × hopSeconds / 2 so a flat hop lasts exactly hopSeconds.\",\"default\":3.25},\"coastDecel\":{\"type\":\"number\",\"default\":4.5},\"overSpeedDecel\":{\"type\":\"number\",\"description\":\"m/s²" +
". How fast speed falls back to the cap when a boost ends or a surface cap bites.\",\"default\":10},\"reverseFraction\":{\"type\":\"number\",\"description\":\"Reverse top speed as a fraction of forward top speed.\",\"default\":0.35},\"steerFalloff\":{\"type\":\"number\",\"description\":\"Turn rate shrinks with speed by this fraction at top speed, giving ~30 m radius (SuperTuxKart).\",\"default\":0.65},\"driftMinSpeed\":{\"type\":\"number\",\"description\":\"Fraction of top speed needed to start a drift.\",\"default\":0.45},\"driftKeepSpeed\":{\"type\":\"number\",\"description\":\"Drift cancels with no boost below this fraction.\",\"default\":0.3},\"driftAirCancelSeconds\":{\"type\":\"number\",\"default\":0.9},\"kartRadius\":{\"type\":\"number\",\"description\":\"metres; collision circle\",\"default\":0.85},\"groundStick\":{\"type\":\"number\",\"description\":\"metres; stay glued to the ground within this height so crests do not launch the kart\",\"default\":0.12},\"groundLaunchVy\":{\"type\":\"number\",\"default\":1.0},\"wallRestitution\":{\"type\":\"number\",\"default\":0.3},\"wallScrub\":{\"type\":\"number\",\"description\":\"Fraction of forward speed lost on a hard wall hit.\",\"" +
"default\":0.15},\"wallDeflect\":{\"type\":\"number\",\"description\":\"On a hard wall hit the nose swings this fraction of the way from its heading to the wall line, so the kart slides along the wall instead of sticking to it nose-first (Mario Kart bounces you off; it never parks you).\",\"default\":0.7},\"wallDeflectRate\":{\"type\":\"number\",\"description\":\"rad/s cap on that swing, so the nose turns along the wall over a few frames instead of snapping.\",\"default\":5.0},\"groundCatch\":{\"type\":\"number\",\"description\":\"metres. An airborne kart found under the road by less than this lands on it (a hop across a banked or sloping road); deeper, it is really under and keeps falling.\",\"default\":1.0},\"slipstreamLength\":{\"type\":\"number\",\"description\":\"metres behind the kart ahead\",\"default\":8},\"slipstreamHalfWidth\":{\"type\":\"number\",\"default\":2},\"tSearchWindow\":{\"type\":\"number\",\"description\":\"Spline fraction searched around the previous t. Never search globally.\",\"default\":0.02},\"driftVisualSlip\":{\"type\":\"number\",\"description\":\"rad; render-only body yaw offset at full drift, into the bend. The sim already slides (gripDrift), so the nos" +
"e points inward by the slip angle before this is added; 0.49 on top read as a spin.\",\"default\":0.22},\"dashMassBonus\":{\"type\":\"number\",\"description\":\"Added to collision mass while any boost is live. MK8DX has a separate 'dash mass' for exactly this, so a boosting light kart can still win a bump.\",\"default\":0.35},\"shieldMassBonus\":{\"type\":\"number\",\"description\":\"Added to collision mass while a Bubble is up (research plan §5: +50 % bump weight; items Decisions 2026-09-21).\",\"default\":0.5},\"coinShield\":{\"description\":\"Mario Kart's real coin rule: coins are a hit buffer. With coins in hand a hit costs coins and speed but no full spin-out; at zero coins the same hit spins you.\",\"type\":\"object\",\"required\":[\"enabled\",\"slowedTo\",\"slowSeconds\"],\"properties\":{\"enabled\":{\"type\":\"boolean\",\"default\":true},\"slowedTo\":{\"type\":\"number\",\"description\":\"Speed multiplier applied instead of a spin when the kart has at least one coin.\",\"default\":0.75},\"slowSeconds\":{\"type\":\"number\",\"default\":0.6}}},\"wallCooldownSeconds\":{\"type\":\"number\",\"description\":\"Min seconds between wall events\",\"default\":0.2},\"bumpCooldownSecond" +
"s\":{\"type\":\"number\",\"description\":\"Min seconds between kart-vs-kart shoves for a pair\",\"default\":0.25},\"hardWallFraction\":{\"type\":\"number\",\"description\":\"A wall hit is hard (scrubs speed) when outward speed / total speed exceeds this\",\"default\":0.3},\"slipstreamSameWayDot\":{\"type\":\"number\",\"description\":\"Min dot of both forward vectors to count as drafting\",\"default\":0.7},\"hopLandWindow\":{\"type\":\"number\",\"description\":\"Multiple of hopSeconds inside which landing with stick held locks a drift\",\"default\":2},\"maxBoostMultiplier\":{\"type\":\"number\",\"description\":\"Hard ceiling on any boost multiplier (design §7: pad and item are +40%). requestBoost clamps to it.\",\"default\":1.4},\"startBoostCentreSeconds\":{\"type\":\"number\",\"description\":\"Seconds before GO the throttle should go down: the moment the 2 appears, like Mario Kart (Adam, 21 Sept 2026).\",\"default\":2.0},\"startBoostWindowSeconds\":{\"type\":\"number\",\"description\":\"Full width of the window around the centre.\",\"default\":1.0},\"startBoostMultiplier\":{\"type\":\"number\",\"default\":1.2},\"startBoostSeconds\":{\"type\":\"number\",\"default\":1.0},\"bumpForce\"" +
":{\"type\":\"number\",\"description\":\"Lateral m/s given to the lighter kart on contact, scaled by weight difference. 6 threw the kart a lane in one tick (Adam, 21 Sept 2026).\",\"default\":3.5},\"hitSpinSeconds\":{\"type\":\"number\",\"description\":\"Default stun when an item or hazard lands\",\"default\":1.0},\"hitCoinsLost\":{\"type\":\"integer\",\"description\":\"Mario Kart World lowered this from 3 to 2 for every racer.\",\"default\":2},\"speedClasses\":{\"description\":\"Top-speed scale per cc class\",\"type\":\"object\",\"required\":[\"50\",\"100\",\"150\"],\"properties\":{\"50\":{\"type\":\"number\",\"default\":0.7},\"100\":{\"type\":\"number\",\"default\":0.85},\"150\":{\"type\":\"number\",\"default\":1.0}}}}},\"archetypes\":{\"type\":\"object\",\"required\":[\"light\",\"medium\",\"heavy\"],\"additionalProperties\":{\"type\":\"object\",\"required\":[\"speed\",\"accel\",\"handling\",\"weight\",\"hook\"],\"properties\":{\"speed\":{\"type\":\"number\"},\"accel\":{\"type\":\"number\"},\"handling\":{\"type\":\"number\"},\"weight\":{\"type\":\"number\"},\"hook\":{\"type\":\"string\",\"enum\":[\"none\",\"hardBump\"],\"description\":\"Researched 8 Sept 2026 against Mario Kart Wo" +
"rld. hardBump = heavy: every Mario Kart decides a bump by collision mass, and MKW's own Weight tooltip says weight 'affects collision between vehicles'. light and medium take none. A light 'fastCharge' hook was rejected: MK8DX's hidden Mini-Turbo stat is per character and kart part and does not track weight (Bowser is max, Wario is min). A medium 'keepCoins' hook was rejected as invented and replaced by base.coinShield, which gives every racer the real Mario Kart coin buffer (design §4, 8 Sept 2026).\"}}}},\"racers\":{\"type\":\"array\",\"minItems\":8,\"maxItems\":8,\"items\":{\"type\":\"object\",\"required\":[\"id\",\"name\",\"archetype\",\"accent\",\"secondary\",\"kartAsset\",\"headAsset\",\"horn\"],\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"},\"archetype\":{\"type\":\"string\",\"enum\":[\"light\",\"medium\",\"heavy\"]},\"accent\":{\"type\":\"string\"},\"secondary\":{\"type\":\"string\"},\"kartAsset\":{\"type\":\"string\"},\"headAsset\":{\"type\":\"string\"},\"propAsset\":{\"type\":\"string\"},\"horn\":{\"type\":\"string\"},\"hitYelp\":{\"type\":\"string\"},\"aiPersonality\":{\"$ref\":\"#/$defs/aiPersonality\"},\"skins\":{\"description\":\"Alt palet" +
"tes. All racers are available from the start; only skins unlock (design §10).\",\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/unlockable\"}}}}},\"bodies\":{\"description\":\"Shared kart body styles. Cosmetic only: no stat change, so leaderboard times stay comparable.\",\"type\":\"array\",\"items\":{\"$ref\":\"#/$defs/unlockable\"}},\"ai\":{\"description\":\"AI driver constants (docs/sops/ai-driver.md Approach). Never set per race; the defaults are the only values. src/ai-driver/constants.ts reads them. Seconds, metres, radians; fractions are of top speed or half-width as named.\",\"type\":\"object\",\"properties\":{\"line\":{\"type\":\"object\",\"properties\":{\"lookAheadGain\":{\"type\":\"number\",\"description\":\"look-ahead L = clamp(speed × gain, min, max) metres (turbo-kart-rush)\",\"default\":0.9},\"lookAheadMin\":{\"type\":\"number\",\"default\":8},\"lookAheadMax\":{\"type\":\"number\",\"default\":30},\"turnNearSeconds\":{\"type\":\"number\",\"description\":\"heading change measured this far ahead in seconds of travel\",\"default\":1.2},\"turnFarSeconds\":{\"type\":\"number\",\"default\":2.4},\"insideGain\":{\"type\":\"number\",\"description\":\"inside-corner bias = clamp" +
"(−sign(turn) × |turnNear| × gain, ±insideBiasMax) × halfWidth\",\"default\":0.5},\"insideBiasMax\":{\"type\":\"number\",\"default\":0.4},\"lateralMaxFraction\":{\"type\":\"number\",\"description\":\"lateral target clamp as a fraction of halfWidth\",\"default\":0.6},\"laneHalfFraction\":{\"type\":\"number\",\"description\":\"personality lateralBias spans ± this × halfWidth\",\"default\":0.45},\"edgeMargin\":{\"type\":\"number\",\"description\":\"metres kept from the road edge\",\"default\":1.4},\"aimClampMargin\":{\"type\":\"number\",\"default\":0.5},\"laneRate\":{\"type\":\"number\",\"description\":\"m/s the lateral target may move per second (smooths flickering nudges; fast enough to dodge)\",\"default\":10},\"narrowRoad\":{\"type\":\"number\",\"description\":\"halfWidth below this is narrow: centre line, no passing, no drifting, short look-ahead\",\"default\":5},\"narrowLookAhead\":{\"type\":\"number\",\"description\":\"look-ahead scale on a narrow road or near a branch entry/exit (floor lookAheadMin)\",\"default\":0.5},\"narrowMargin\":{\"type\":\"number\",\"description\":\"corner-speed margin multiplier on a narrow road, where a slide has nowhere to go\",\"default\":0.75},\"out" +
"sideFraction\":{\"type\":\"number\",\"description\":\"before a drift-worthy bend, set up on the outside at this × halfWidth so the drift has room\",\"default\":0.5},\"branchCommitMetres\":{\"type\":\"number\",\"description\":\"a taken shortcut stays the aim this far past its entry; the kart is only moved onto the branch once it has left the main road\",\"default\":40},\"declineFraction\":{\"type\":\"number\",\"description\":\"after declining a shortcut, keep at least this × halfWidth on the far side of the fork\",\"default\":0.35},\"wanderAmpMin\":{\"type\":\"number\",\"default\":0.08},\"wanderAmpMax\":{\"type\":\"number\",\"default\":0.2},\"wanderPeriodMin\":{\"type\":\"number\",\"default\":3.3},\"wanderPeriodMax\":{\"type\":\"number\",\"default\":8.3}}},\"steer\":{\"type\":\"object\",\"properties\":{\"kP\":{\"type\":\"number\",\"default\":2.2},\"kD\":{\"type\":\"number\",\"default\":0.15},\"dErrMax\":{\"type\":\"number\",\"description\":\"rad/s clamp on the derivative term\",\"default\":6},\"offroadGain\":{\"type\":\"number\",\"description\":\"steer gain multiplier while off the road surface\",\"default\":1.3},\"noiseSmoothing\":{\"type\":\"number\",\"description\":\"low-pass fac" +
"tor per tick on the seeded steering noise\",\"default\":0.05},\"kLat\":{\"type\":\"number\",\"description\":\"steer per metre of lateral error to the lane target; pure pursuit alone changes lanes too slowly to dodge\",\"default\":0.15},\"kLatMax\":{\"type\":\"number\",\"description\":\"clamp on the lateral term\",\"default\":0.6}}},\"avoid\":{\"type\":\"object\",\"properties\":{\"hazardLookAhead\":{\"type\":\"number\",\"default\":25},\"rollingLookAhead\":{\"type\":\"number\",\"description\":\"metres; a rolling hazard comes at you, so look further\",\"default\":45},\"hazardLateral\":{\"type\":\"number\",\"default\":2.2},\"dodgeClearance\":{\"type\":\"number\",\"default\":2.6},\"avoidLookAhead\":{\"type\":\"number\",\"description\":\"metres ahead another moving kart matters for passing and drafting\",\"default\":25},\"stoppedLookAhead\":{\"type\":\"number\",\"description\":\"metres ahead a slow, spinning or stopped kart is treated as a hazard\",\"default\":40},\"slowKartSpeed\":{\"type\":\"number\",\"description\":\"m/s; a kart slower than this ahead is an obstacle\",\"default\":4},\"stoppedClearance\":{\"type\":\"number\",\"description\":\"metres of lateral clearance kept from a sto" +
"pped or spinning kart\",\"default\":3.0},\"passDistance\":{\"type\":\"number\",\"default\":10},\"passClosing\":{\"type\":\"number\",\"description\":\"m/s closing speed that starts a pass\",\"default\":1},\"touchDistance\":{\"type\":\"number\",\"description\":\"metres behind a kart at which the AI pulls out instead of drafting into it\",\"default\":3.5},\"spawnBehind\":{\"type\":\"number\",\"description\":\"metres past the spawn spot of a rolling or falling hazard the berth is still kept\",\"default\":5},\"seekDistance\":{\"type\":\"number\",\"default\":40},\"seekLateral\":{\"type\":\"number\",\"description\":\"max metres off the line a pad, balloon or coin pulls the kart\",\"default\":2.5},\"padSkill\":{\"type\":\"number\",\"description\":\"min skill to aim for boost pads\",\"default\":0.3}}},\"drift\":{\"type\":\"object\",\"properties\":{\"maxHold\":{\"type\":\"number\",\"default\":3.2},\"cooldown\":{\"type\":\"number\",\"default\":0.6},\"abortCooldown\":{\"type\":\"number\",\"default\":1.6},\"hopCommit\":{\"type\":\"number\",\"description\":\"seconds after the hop the drift side is held no matter what\",\"default\":0.3},\"hopCommitStick\":{\"type\":\"number\",\"description\":\"st" +
"ick toward the drift side through the hop: enough to lock the drift and keep the full charge, not the full swing\",\"default\":0.5},\"chargeSnap\":{\"type\":\"number\",\"description\":\"stick this close under a half is pushed to a half so the charge runs at the full rate\",\"default\":0.2},\"chargeSecondsAhead\":{\"type\":\"number\",\"description\":\"with the next tier this many seconds of full charge away, hold a half stick through the exit and take the swing\",\"default\":0.6},\"startYawFraction\":{\"type\":\"number\",\"description\":\"hop only when the road under the nose already asks for this fraction of a half-stick drift yaw\",\"default\":0.7},\"exitYawFraction\":{\"type\":\"number\",\"description\":\"with a tier banked, let go once the road under the nose asks for less than this fraction of the minimum drift yaw\",\"default\":0.5},\"overRotate\":{\"type\":\"number\",\"description\":\"rad of heading swung past the aim point before a drift lets go. The drift yaw is tighter than most bends, so a drift is a swing in and a straighten out; reachableTier() plans the tier from this.\",\"default\":0.6},\"aligned\":{\"type\":\"number\",\"description\":\"rad; release when the error and" +
" turnNear are both this small\",\"default\":0.08},\"alignedTurn\":{\"type\":\"number\",\"default\":0.15},\"edgeMargin\":{\"type\":\"number\",\"description\":\"metres from the inside edge that releases\",\"default\":1.2},\"aimGain\":{\"type\":\"number\",\"description\":\"rad/s of drift yaw asked per rad of heading error toward the aim point\",\"default\":1.0},\"tierBySkill\":{\"type\":\"array\",\"items\":{\"type\":\"number\"},\"description\":\"skill below [0] → tier 1, below [1] → tier 2, else 3\",\"default\":[0.5,0.8]}}},\"recover\":{\"type\":\"object\",\"properties\":{\"stuckSeconds\":{\"type\":\"number\",\"description\":\"the AI's own stuck timer; the race-manager 6 s respawn is the backstop\",\"default\":1.5},\"reverseSeconds\":{\"type\":\"number\",\"default\":0.8},\"cooldownSeconds\":{\"type\":\"number\",\"default\":2.5}}},\"rubber\":{\"type\":\"object\",\"properties\":{\"min\":{\"type\":\"number\",\"default\":0.6},\"max\":{\"type\":\"number\",\"default\":1.4},\"deadZone\":{\"type\":\"number\",\"description\":\"metres of gap with no effect\",\"default\":20},\"scale\":{\"type\":\"number\",\"description\":\"metres; tanh scale beyond the dead zone. 60: a leader 100 m up the road i" +
"s at rb 0.67 and has lost ~21 % power, so a player closes 100 m in ~25 s (test drive, 2026-09-21)\",\"default\":60},\"powerFrom\":{\"type\":\"number\",\"description\":\"rb below this cuts power (top-speed cap); above it only skill moves\",\"default\":0.85},\"skillGain\":{\"type\":\"number\",\"description\":\"skill += (rb − 1) × gain\",\"default\":1.25},\"shortcutRb\":{\"type\":\"number\",\"description\":\"rubber band at or above which a narrow shortcut is taken as a catch-up\",\"default\":1.15},\"fieldPaceSpread\":{\"type\":\"number\",\"description\":\"seeded per-race pace governor spread across the AI field, fraction of legal top speed\",\"default\":0.065}}},\"items\":{\"type\":\"object\",\"properties\":{\"forwardRange\":{\"type\":\"number\",\"default\":45},\"forwardCone\":{\"type\":\"number\",\"description\":\"rad\",\"default\":0.2},\"homingRange\":{\"type\":\"number\",\"default\":90},\"rearRange\":{\"type\":\"number\",\"default\":15},\"defenceRadius\":{\"type\":\"number\",\"default\":6},\"holdMax\":{\"type\":\"number\",\"default\":8},\"speedItemGap\":{\"type\":\"number\",\"default\":80},\"straightTurn\":{\"type\":\"number\",\"description\":\"rad; |turnFar| below this is a straig" +
"ht\",\"default\":0.15}}},\"autopilot\":{\"type\":\"object\",\"description\":\"a finished kart keeps rolling out of the way\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.5},\"power\":{\"type\":\"number\",\"default\":0.6}}},\"profiles\":{\"type\":\"object\",\"description\":\"Difficulty comes from the speed class: 50 easy, 100 normal, 150 hard (ai-driver Decisions 2026-09-21).\",\"properties\":{\"easy\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.35},\"power\":{\"type\":\"number\",\"default\":0.94},\"noise\":{\"type\":\"number\",\"default\":0.09},\"reactionMin\":{\"type\":\"number\",\"default\":0.8},\"reactionMax\":{\"type\":\"number\",\"default\":1.6},\"driftThreshold\":{\"type\":\"number\",\"default\":0.45},\"brakeAbove\":{\"type\":\"number\",\"default\":1.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":1.6},\"shortcutSkill\":{\"type\":\"number\",\"default\":1.1},\"trickChance\":{\"type\":\"number\",\"default\":0.2}}},\"normal\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"defau" +
"lt\":0.65},\"power\":{\"type\":\"number\",\"default\":0.98},\"noise\":{\"type\":\"number\",\"default\":0.045},\"reactionMin\":{\"type\":\"number\",\"default\":0.4},\"reactionMax\":{\"type\":\"number\",\"default\":0.9},\"driftThreshold\":{\"type\":\"number\",\"default\":0.35},\"brakeAbove\":{\"type\":\"number\",\"default\":2.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":0.8},\"shortcutSkill\":{\"type\":\"number\",\"default\":0.6},\"trickChance\":{\"type\":\"number\",\"default\":0.5}}},\"hard\":{\"$ref\":\"#/$defs/aiProfile\",\"type\":\"object\",\"properties\":{\"skill\":{\"type\":\"number\",\"default\":0.95},\"power\":{\"type\":\"number\",\"default\":1.0},\"noise\":{\"type\":\"number\",\"default\":0.015},\"reactionMin\":{\"type\":\"number\",\"default\":0.15},\"reactionMax\":{\"type\":\"number\",\"default\":0.4},\"driftThreshold\":{\"type\":\"number\",\"default\":0.3},\"brakeAbove\":{\"type\":\"number\",\"default\":3.0},\"startPressMean\":{\"type\":\"number\",\"default\":2.0},\"startPressSpread\":{\"type\":\"number\",\"default\":0.25},\"shortcutSkill\":{\"type\":\"number\",\"default\":0.3},\"trickChance\":{\"type\":\"" +
"number\",\"default\":0.95}}}}}}}}"),
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
}, y = Object.freeze({
	light: {
		speed: -.08,
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
		speed: .1,
		accel: -.12,
		handling: -.1,
		weight: .18,
		hook: "hardBump"
	}
});
function b(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = b(r.properties));
	return t;
}
var x = Object.freeze(b(v.properties.base.properties));
function S(e, t) {
	let n = y[e], r = x.speedClasses[String(t)];
	return Object.freeze({
		...structuredClone(x),
		archetype: e,
		cc: t,
		stats: n,
		baseTopSpeed: x.topSpeed,
		topSpeed: x.topSpeed * r * (1 + n.speed),
		accel: x.accel * (1 + n.accel),
		steerRate: x.steerRate * (1 + n.handling),
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
var C = Object.freeze({
	none: 0,
	start: 1,
	slipstream: 1,
	drift: 2,
	pad: 3,
	item: 4,
	trick: 5
});
function w(e) {
	return e.boost.source !== "none" && e.boost.remaining > 0;
}
function T(e, t, n, r, i) {
	if (t === "none" || r <= 0) return !1;
	if (n = Math.min(n, x.maxBoostMultiplier), w(e)) {
		let n = C[t], i = C[e.boost.source];
		if (n < i || n === i && e.boost.remaining >= r) return !1;
	}
	return e.boost.source = t, e.boost.multiplier = n, e.boost.remaining = r, i.push({
		type: "boostStart",
		source: t,
		multiplier: n,
		seconds: r
	}), !0;
}
function E(e) {
	e.boost.source = "none", e.boost.multiplier = 1, e.boost.remaining = 0;
}
function te(e, t) {
	e.boost.remaining <= 0 || (e.boost.remaining = Math.max(0, e.boost.remaining - t), e.boost.remaining === 0 && E(e));
}
//#endregion
//#region src/kart-controller/types.ts
var D = Object.freeze({
	steer: 0,
	throttle: 0,
	brake: 0,
	drift: !1,
	item: !1,
	lookBack: !1,
	horn: !1
});
function ne(e) {
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
			intangibleRemaining: 0
		},
		coins: e.coins ?? 0,
		rank: 0,
		prevDrift: !1,
		wallCooldown: 0,
		bumpCooldown: 0,
		gripScale: 1
	};
}
function O(e) {
	return [
		Math.sin(e),
		0,
		Math.cos(e)
	];
}
function k(e) {
	return [
		Math.cos(e),
		0,
		-Math.sin(e)
	];
}
function A(e) {
	return Math.atan2(e[0], e[2]);
}
//#endregion
//#region src/kart-controller/collide.ts
function re(e, t) {
	return t.mass + (w(e) ? t.dashMassBonus : 0) + (e.status.shield ? t.shieldMassBonus : 0);
}
function ie(e) {
	let t = O(e.heading), n = k(e.heading);
	return [
		t[0] * e.speed + n[0] * e.lateralVelocity,
		0,
		t[2] * e.speed + n[2] * e.lateralVelocity
	];
}
function ae(e, t) {
	let n = O(e.heading), r = k(e.heading);
	e.speed = t[0] * n[0] + t[2] * n[2], e.lateralVelocity = t[0] * r[0] + t[2] * r[2];
}
function oe(e, t, n, r, i, a, o) {
	let s = r - i.kartRadius;
	if (Math.abs(t) <= s) return;
	let c = Math.sign(t), l = Math.abs(t) - s;
	e.position[0] -= n[0] * l * c, e.position[2] -= n[2] * l * c;
	let u = [
		n[0] * c,
		0,
		n[2] * c
	], d = ie(e), f = d[0] * u[0] + d[2] * u[2];
	if (f <= 0) return;
	let p = Math.hypot(d[0], d[2]);
	if (d[0] -= u[0] * f * (1 + i.wallRestitution), d[2] -= u[2] * f * (1 + i.wallRestitution), ae(e, d), p > 0 && f / p > i.hardWallFraction) {
		e.speed *= 1 - i.wallScrub;
		let t = O(e.heading), n = t[0] * u[0] + t[2] * u[2];
		if (n > 0) {
			let r = [
				t[0] - u[0] * n,
				0,
				t[2] - u[2] * n
			], o = Math.hypot(r[0], r[2]);
			if (o > 1e-6) {
				let t = Math.atan2(r[0] / o, r[2] / o) - e.heading;
				for (; t > Math.PI;) t -= 2 * Math.PI;
				for (; t < -Math.PI;) t += 2 * Math.PI;
				let n = Math.hypot(e.speed, e.lateralVelocity), s = Math.sign(t) * Math.min(Math.abs(t) * i.wallDeflect, i.wallDeflectRate * a);
				e.heading += s, e.speed = n, e.lateralVelocity = 0;
			}
		}
	}
	e.wallCooldown <= 0 && (o.push({ type: "wall" }), e.wallCooldown = i.wallCooldownSeconds);
}
function se(e) {
	return e.isGhost || e.status.intangibleRemaining > 0;
}
function ce(e, t, n, r, i, a, o, s) {
	if (se(e) || se(t)) return !1;
	let c = t.position[0] - e.position[0], l = t.position[2] - e.position[2], u = Math.hypot(c, l), d = 2 * i.kartRadius;
	if (u >= d || u === 0) return !1;
	let f = c / u, p = l / u, m = re(e, n), h = re(t, r), g = m + h, _ = Math.min(d - u, i.bumpSeparateRate * a);
	if (e.position[0] -= f * _ * (h / g), e.position[2] -= p * _ * (h / g), t.position[0] += f * _ * (m / g), t.position[2] += p * _ * (m / g), e.bumpCooldown > 0 || t.bumpCooldown > 0) return !0;
	let v = ie(e), y = ie(t), b = i.bumpForce * (h / g), x = i.bumpForce * (m / g);
	return v[0] -= f * b, v[2] -= p * b, y[0] += f * x, y[2] += p * x, ae(e, v), ae(t, y), e.bumpCooldown = i.bumpCooldownSeconds, t.bumpCooldown = i.bumpCooldownSeconds, o.push({
		type: "bump",
		otherId: t.racerId
	}), s.push({
		type: "bump",
		otherId: e.racerId
	}), !0;
}
//#endregion
//#region src/kart-controller/steer.ts
function le(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function ue(e, t, n) {
	return e + (t - e) * n;
}
function de(e, t) {
	return le(e.steer * t, 0, 1);
}
function fe(e, t, n, r) {
	if (e.drift.phase === "drifting") {
		let t = ue(n.driftSteerMin, n.driftSteerMax, e.drift.yawK);
		return e.drift.direction * n.steerRate * t;
	}
	let i = Math.abs(e.speed);
	if (i <= 0 || r <= 0) return 0;
	let a = Math.min(1, i / (.15 * r)) * (1 - n.steerFalloff * Math.min(1, i / r)), o = e.grounded ? 1 : n.airSteer, s = t.steer * n.steerRate * a * o;
	return e.speed < 0 ? -s : s;
}
function pe(e, t) {
	if (t === 0) return;
	let n = Math.cos(t), r = Math.sin(t), i = e.speed, a = e.lateralVelocity;
	e.heading += t, e.speed = i * n + a * r, e.lateralVelocity = a * n - i * r;
}
function me(e, t, n) {
	e.lateralVelocity -= e.lateralVelocity * Math.min(1, t * n);
}
function he(e, t, n, r, i, a) {
	if (e.drift.phase === "drifting") {
		let r = 1 - Math.exp(-a / n.driftYawLag);
		e.drift.yawK += (de(t, e.drift.direction) - e.drift.yawK) * r;
	}
	let o = fe(e, t, n, r) * a;
	return pe(e, o), me(e, i, a), o;
}
//#endregion
//#region src/kart-controller/drift.ts
function ge(e, t, n = Infinity) {
	let r = 0;
	for (let n of t) e >= n && r++;
	return Math.min(r, n);
}
function j(e) {
	e.drift.active = !1, e.drift.phase = "idle", e.drift.direction = 0, e.drift.charge = 0, e.drift.tier = 0, e.drift.hopSeconds = 0;
}
function _e(e, t, n) {
	let r = e.drift.tier;
	n.push({
		type: "driftEnd",
		tier: r
	}), r > 0 && T(e, "drift", t.boostMultiplier, t.boostSeconds[r - 1], n), j(e);
}
function ve(e, t, n, r, i, a, o = {}) {
	let s = t.drift && !e.prevDrift;
	e.prevDrift = t.drift;
	let c = e.drift;
	switch (s && !e.grounded && e.airborne.fromJumpId !== void 0 && (e.airborne.trickQueued = !0), c.phase) {
		case "idle":
			s && e.grounded && e.speed >= n.driftMinSpeed * r && (c.phase = "hopping", c.hopSeconds = 0, e.verticalVelocity = n.hopVelocity, e.grounded = !1, a.push({ type: "hop" }));
			return;
		case "hopping":
			if (c.hopSeconds += i, !e.grounded) {
				c.hopSeconds > n.hopSeconds * n.hopLandWindow && j(e);
				return;
			}
			t.drift && t.steer !== 0 && e.speed >= n.driftMinSpeed * r ? (c.phase = "drifting", c.active = !0, c.direction = Math.sign(t.steer), c.charge = 0, c.tier = 0, c.yawK = 0, a.push({
				type: "driftStart",
				direction: c.direction
			})) : j(e);
			return;
		case "drifting": {
			if (e.speed < n.driftKeepSpeed * r) {
				j(e);
				return;
			}
			if (!e.grounded && e.airborne.seconds > n.driftAirCancelSeconds) {
				j(e);
				return;
			}
			if (!t.drift) {
				_e(e, n, a);
				return;
			}
			let s = de(t, c.direction) >= .5 ? n.chargeFull : n.chargeNeutral, l = c.chargeMultiplierRemaining > 0 ? c.chargeMultiplier : 1;
			c.charge += s * i * 60 * l;
			let u = ge(c.charge, n.driftTiers, o.maxDriftTier ?? n.driftTiers.length);
			u !== c.tier && (c.tier = u, a.push({
				type: "driftTierUp",
				tier: u
			}));
			return;
		}
	}
}
//#endregion
//#region src/kart-controller/ground.ts
function ye(e, t, n, r = 0) {
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
var be = (e) => (e % 1 + 1) % 1;
function xe(e, t, n) {
	let r = be(t - e);
	if (r === 0 || r > .5) return !1;
	let i = be(n - e);
	return i > 0 && i <= r;
}
function Se(e, t, n, r, i) {
	let a = O(e.heading), o = k(e.heading), s = a[0] * e.speed + o[0] * e.lateralVelocity, c = a[2] * e.speed + o[2] * e.lateralVelocity;
	e.position[0] += s * r, e.position[2] += c * r;
	let l = e.t, u = t.nearest(e.position, {
		t: e.t,
		branch: e.branch
	}, n.tSearchWindow);
	e.t = u.t, e.branch = u.branch, e.distanceAlong = e.t * t.length;
	let { lateral: d, right: f } = ye(t, e.t, e.position, e.branch), p = t.sample(e.t, d, e.branch), m = e.grounded;
	if (e.grounded) {
		for (let n of t.jumps) if ((n.branch ?? 0) === e.branch && xe(l, e.t, n.t)) {
			e.verticalVelocity = n.launch, e.grounded = !1, e.airborne.fromJumpId = n.id, e.airborne.seconds = 0, i.push({
				type: "launched",
				jumpId: n.id
			});
			break;
		}
	}
	if (e.grounded) {
		for (let r of t.boostPads) if ((r.branch ?? 0) === e.branch && xe(l, e.t, r.t) && Math.abs(d - r.lateral) <= r.halfWidth) {
			T(e, "pad", n.padMultiplier, n.padSeconds, i);
			break;
		}
	}
	let h = e.surface;
	e.verticalVelocity -= n.gravity * r, e.position[1] += e.verticalVelocity * r;
	let g = e.position[1], _ = p.groundY, v = e.verticalVelocity <= n.groundLaunchVy, y = !m && g < _ - Math.max(Math.abs(e.verticalVelocity) * r + n.groundStick, n.groundCatch);
	if (g < _ && !y && (e.position[1] = _, v && (e.verticalVelocity = 0)), g <= _ + n.groundStick && v && !y ? (e.position[1] = _, e.verticalVelocity = 0, e.grounded = !0) : e.grounded = !1, e.grounded) {
		if (e.surface = p.surface, e.gripScale = p.gripScale, p.surface === "boost" && (h !== "boost" || !m) && T(e, "pad", n.padMultiplier, n.padSeconds, i), !m) {
			let t = e.airborne.trickQueued;
			i.push({
				type: "landed",
				fromJumpId: e.airborne.fromJumpId,
				trick: t
			}), t && T(e, "trick", n.trickMultiplier, n.trickSeconds, i), e.airborne.fromJumpId = void 0, e.airborne.trickQueued = !1, e.airborne.seconds = 0;
		}
	} else e.airborne.seconds += r;
	return e.position[1] < t.voidY && i.push({ type: "respawn" }), {
		sample: p,
		lateral: d,
		right: f
	};
}
//#endregion
//#region src/kart-controller/slipstream.ts
function Ce(e, t, n) {
	if (t === e || t.isGhost || e.isGhost) return !1;
	let r = O(t.heading), i = k(t.heading), a = e.position[0] - t.position[0], o = e.position[2] - t.position[2], s = a * r[0] + o * r[2], c = a * i[0] + o * i[2];
	if (s >= 0 || s < -n.slipstreamLength || Math.abs(c) > n.slipstreamHalfWidth) return !1;
	let l = O(e.heading);
	return l[0] * r[0] + l[2] * r[2] < n.slipstreamSameWayDot ? !1 : t.speed > 0 && e.speed > 0;
}
function we(e, t, n, r, i) {
	if (!t.some((t) => Ce(e, t, n))) {
		e.slipstreamSeconds = 0;
		return;
	}
	e.slipstreamSeconds += r, e.slipstreamSeconds >= n.slipstreamSeconds && (T(e, "slipstream", n.slipstreamMultiplier, n.slipstreamBoostSeconds, i), e.slipstreamSeconds = 0);
}
//#endregion
//#region src/kart-controller/speed.ts
function Te(e, t) {
	let n = Math.min(e.coins, t.coinCap), r = t.topSpeed * (1 + n * t.coinBonusEach), i = w(e), a = r;
	i && (a *= e.boost.multiplier), e.status.slowRemaining > 0 && (a = Math.min(a, r * e.status.slowedTo));
	let o = i && t.boostIgnoresSurfaceCap || !e.grounded && t.airborneIgnoresSurfaceCap, s = t.surfaceSpeed[e.surface] ?? 1, c = r;
	return o || (a = Math.min(a, r * s), c = r * s), {
		base: r,
		effective: c,
		target: a
	};
}
function Ee(e, t, n, r, i) {
	let a = e.speed;
	if (a > n) {
		e.speed = Math.max(n, a - r.overSpeedDecel * i);
		return;
	}
	if (t.brake > 0 && t.throttle <= 0) {
		e.speed = a > 0 ? Math.max(0, a - r.brake * t.brake * i) : Math.max(-r.reverseFraction * n, a - r.accel * t.brake * i);
		return;
	}
	if (t.throttle > 0) {
		e.speed = Math.min(n, a + r.accel * t.throttle * i);
		return;
	}
	a > 0 ? e.speed = Math.max(0, a - r.coastDecel * i) : a < 0 && (e.speed = Math.min(0, a + r.coastDecel * i));
}
var M = 1 / 120, De = 1e-9;
function N(e, t) {
	let n = e - t;
	return n > De ? n : 0;
}
function Oe(e, t) {
	te(e, t), e.status.spinRemaining = N(e.status.spinRemaining, t), e.status.slowRemaining = N(e.status.slowRemaining, t), e.status.slowRemaining === 0 && (e.status.slowedTo = 1), e.status.intangibleRemaining = N(e.status.intangibleRemaining, t), e.drift.chargeMultiplierRemaining = N(e.drift.chargeMultiplierRemaining, t), e.drift.chargeMultiplierRemaining === 0 && (e.drift.chargeMultiplier = 1), e.wallCooldown = N(e.wallCooldown, t), e.bumpCooldown = N(e.bumpCooldown, t);
}
function ke(e, t, n, r, i, a = {}) {
	let o = [], s = e.status.spinRemaining > 0;
	Oe(e, i);
	let c = s ? D : t;
	if (s) {
		e.prevDrift = t.drift;
		let n = e.status.spinRemaining;
		e.speed = n > 0 ? e.speed * (n / (n + i)) : 0;
	} else {
		let t = Te(e, r);
		Ee(e, c, t.target, r, i);
		let n = ee(r, e.surface), s = (e.drift.phase === "drifting" ? Math.min(n, r.gripDrift) : n) * e.gripScale * (e.grounded ? 1 : .5);
		he(e, c, r, t.base, s, i), ve(e, c, r, t.base, i, o, a);
	}
	let l = Se(e, n, r, i, o);
	return oe(e, l.lateral, l.right, l.sample.halfWidth, r, i, o), o;
}
function Ae(e, t, n, r, i, a = {}) {
	let o = e.map((e, o) => ke(e, t[o], n, r[o], i, a));
	for (let t = 0; t < e.length; t++) for (let n = t + 1; n < e.length; n++) ce(e[t], e[n], r[t], r[n], r[t], i, o[t], o[n]);
	for (let t = 0; t < e.length; t++) we(e[t], e, r[t], i, o[t]);
	return o;
}
function je(e, t, n, r) {
	let i = e.coins > 0, a = Math.min(e.coins, t.hitCoinsLost);
	e.coins -= a;
	let o;
	t.coinShield.enabled && i ? (e.status.slowedTo = t.coinShield.slowedTo, e.status.slowRemaining = t.coinShield.slowSeconds, o = !1) : (e.status.spinRemaining = t.hitSpinSeconds, o = !0), j(e), E(e), r.push({
		type: "hit",
		kind: n,
		spun: o,
		coinsLost: a
	});
}
function Me(e, t, n, r) {
	return Math.abs(n - t.startBoostCentreSeconds) > t.startBoostWindowSeconds / 2 ? !1 : (e.boost.source = "start", e.boost.multiplier = t.startBoostMultiplier, e.boost.remaining = t.startBoostSeconds, r.push({
		type: "boostStart",
		source: "start",
		multiplier: t.startBoostMultiplier,
		seconds: t.startBoostSeconds
	}), !0);
}
var Ne = {
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
	properties: {
		id: {
			type: "string",
			pattern: "^[a-z0-9-]+$"
		},
		name: { type: "string" },
		biome: {
			type: "string",
			enum: [
				"harbour",
				"meadow",
				"canyon",
				"frost",
				"boardwalk",
				"skyline",
				"temple",
				"foundry"
			]
		},
		cup: {
			type: "string",
			enum: ["sunrise", "summit"]
		},
		orderInCup: {
			type: "integer",
			minimum: 1
		},
		laps: {
			type: "integer",
			minimum: 1,
			default: 3
		},
		targetLapSeconds: {
			type: "number",
			minimum: 30,
			maximum: 90
		},
		medalTimesMs: {
			description: "Time Trial thresholds at 150cc. Gold on every track in a cup drives unlocks (design §10).",
			type: "object",
			required: [
				"gold",
				"silver",
				"bronze"
			],
			properties: {
				gold: { type: "integer" },
				silver: { type: "integer" },
				bronze: { type: "integer" }
			}
		},
		voidY: {
			type: "number",
			description: "World Y below which a kart respawns at its last checkpoint"
		},
		controlPoints: {
			description: "Closed Catmull-Rom control points in world metres. halfWidth and surface apply from this point to the next.",
			type: "array",
			minItems: 8,
			items: {
				type: "object",
				required: [
					"x",
					"y",
					"z",
					"halfWidth"
				],
				properties: {
					x: { type: "number" },
					y: { type: "number" },
					z: { type: "number" },
					halfWidth: {
						type: "number",
						minimum: 3
					},
					bank: {
						type: "number",
						description: "Roll in degrees, positive banks into a right turn",
						default: 0
					},
					surface: {
						type: "string",
						enum: [
							"road",
							"dirt",
							"mud",
							"ice",
							"boost",
							"rail"
						],
						default: "road"
					}
				}
			}
		},
		checkpointCount: {
			type: "integer",
			minimum: 4
		},
		startGrid: {
			type: "object",
			required: [
				"t",
				"rows",
				"columns",
				"spacing"
			],
			properties: {
				t: {
					type: "number",
					minimum: 0,
					maximum: 1,
					description: "Spline fraction of the start line"
				},
				rows: { type: "integer" },
				columns: { type: "integer" },
				spacing: { type: "number" }
			}
		},
		shortcuts: {
			type: "array",
			items: {
				type: "object",
				required: [
					"id",
					"entryT",
					"exitT",
					"controlPoints",
					"risk"
				],
				properties: {
					id: { type: "string" },
					entryT: { type: "number" },
					exitT: { type: "number" },
					controlPoints: { $ref: "#/properties/controlPoints" },
					risk: {
						type: "string",
						enum: [
							"jump",
							"narrow",
							"hazard"
						]
					},
					openOnLaps: {
						type: "array",
						items: { type: "integer" },
						description: "Empty = always open"
					}
				}
			}
		},
		hazards: {
			type: "array",
			items: {
				type: "object",
				required: ["type", "t"],
				properties: {
					id: { type: "string" },
					type: {
						type: "string",
						enum: [
							"rolling",
							"crossing",
							"falling",
							"static",
							"gust"
						]
					},
					t: { type: "number" },
					lateral: {
						type: "number",
						default: 0
					},
					period: {
						type: "number",
						description: "Seconds between activations"
					},
					speed: {
						type: "number",
						description: "m/s for rolling/crossing/falling; gust push strength"
					},
					hit: {
						type: "string",
						enum: [
							"spin",
							"slow",
							"bump"
						],
						default: "spin"
					},
					asset: { type: "string" }
				}
			}
		},
		jumps: {
			description: "Trick ramps. Leaving a jump airborne with the hop button pressed awards a trick boost.",
			type: "array",
			items: {
				type: "object",
				required: [
					"id",
					"t",
					"launch"
				],
				properties: {
					id: { type: "string" },
					t: { type: "number" },
					lateral: {
						type: "number",
						default: 0
					},
					width: { type: "number" },
					launch: {
						type: "number",
						description: "Vertical launch speed m/s"
					},
					shortcut: {
						type: "string",
						description: "Shortcut id this jump sits on; t stays main-equivalent"
					}
				}
			}
		},
		pickups: {
			type: "array",
			items: {
				type: "object",
				required: ["t"],
				properties: {
					t: { type: "number" },
					lateral: { type: "number" },
					shortcut: { type: "string" }
				}
			}
		},
		coins: {
			type: "array",
			items: {
				type: "object",
				required: ["t"],
				properties: {
					t: { type: "number" },
					lateral: { type: "number" },
					shortcut: { type: "string" }
				}
			}
		},
		boostPads: {
			type: "array",
			items: {
				type: "object",
				required: ["t"],
				properties: {
					t: { type: "number" },
					lateral: { type: "number" },
					width: { type: "number" },
					shortcut: { type: "string" }
				}
			}
		},
		finalLapShift: {
			description: "Exactly one readable change on the last lap. Fires once, globally, when the race leader starts the final lap.",
			type: "object",
			required: ["kind", "label"],
			properties: {
				kind: {
					type: "string",
					enum: [
						"flood",
						"storm",
						"collapse",
						"blizzard",
						"fireworks",
						"sunset",
						"rise",
						"reverse"
					]
				},
				label: {
					type: "string",
					description: "Banner text, e.g. 'THE TIDE IS IN'"
				},
				closesShortcuts: {
					type: "array",
					items: { type: "string" }
				},
				opensShortcuts: {
					type: "array",
					items: { type: "string" }
				},
				routeOverrides: {
					description: "Replace a t-range of the main spline (bridges retract, rail becomes mandatory). The LUT is rebuilt once when the shift fires.",
					type: "array",
					items: {
						type: "object",
						required: [
							"fromT",
							"toT",
							"controlPoints"
						],
						properties: {
							fromT: { type: "number" },
							toT: { type: "number" },
							controlPoints: { $ref: "#/properties/controlPoints" }
						}
					}
				},
				surfaceOverrides: {
					type: "array",
					items: {
						type: "object",
						properties: {
							fromT: { type: "number" },
							toT: { type: "number" },
							surface: { type: "string" }
						}
					}
				},
				gripMultiplier: {
					type: "number",
					default: 1,
					description: "Global grip scale, e.g. 0.8 for wet grass"
				},
				addsJumps: { $ref: "#/properties/jumps" },
				enablesHazards: {
					type: "array",
					items: { type: "string" }
				},
				disablesHazards: {
					type: "array",
					items: { type: "string" }
				},
				sky: {
					type: "string",
					description: "Sky preset id"
				},
				lut: { type: "string" },
				fogDensity: { type: "number" },
				musicVariant: { type: "string" }
			}
		},
		environment: {
			type: "object",
			properties: {
				sky: { type: "string" },
				lut: { type: "string" },
				fogColor: { type: "string" },
				fogDensity: { type: "number" },
				ground: {
					description: "One flat plane under the whole track. 'none' for sky tracks; the void is below voidY.",
					type: "object",
					required: ["kind"],
					properties: {
						kind: {
							type: "string",
							enum: [
								"plane",
								"water",
								"none"
							],
							default: "plane"
						},
						y: {
							type: "number",
							default: 0
						}
					}
				},
				sunDirection: {
					type: "array",
					items: { type: "number" },
					minItems: 3,
					maxItems: 3
				},
				palette: {
					type: "object",
					properties: {
						background: { type: "string" },
						accent: { type: "string" }
					}
				},
				decor: {
					type: "array",
					items: {
						type: "object",
						properties: {
							asset: { type: "string" },
							instances: { type: "integer" },
							band: {
								type: "string",
								enum: [
									"roadside",
									"far",
									"sky"
								]
							}
						}
					}
				}
			}
		},
		music: { type: "string" },
		landmark: {
			type: "string",
			description: "The thing visible from the start line"
		},
		builder: {
			description: "Track-builder constants. Never set per track; the defaults are the only values. Code reads them from here (docs/sops/track-builder.md Constants).",
			type: "object",
			properties: {
				lutSamples: {
					type: "integer",
					default: 2048,
					description: "Arc-length samples per branch LUT"
				},
				arcDivisions: {
					type: "integer",
					default: 4096,
					description: "Fine steps used to walk the curve before resampling"
				},
				globalSearchStep: {
					type: "integer",
					default: 8,
					description: "Coarse stride for nearestTGlobal"
				},
				branchHysteresis: {
					type: "number",
					default: 1,
					description: "metres; another branch must be closer by this much to win"
				},
				branchLeaveMargin: {
					type: "number",
					default: 1.35,
					description: "metres inside a road edge a kart still counts as on that road; another branch can only take it once it is past this. Must exceed kartRadius (0.85): the wall holds a kart exactly one radius inside the edge, so at 0.85 nobody could ever leave"
				},
				maxBankDeg: {
					type: "number",
					default: 20
				},
				minTurnRadiusFactor: {
					type: "number",
					default: 1.5,
					description: "turn radius must be >= factor × halfWidth (hairpin guard)"
				},
				minStartHalfWidth: {
					type: "number",
					default: 4
				},
				branchBlendMetres: {
					type: "number",
					default: 14,
					description: "a shortcut ribbon loses its kerbs and sinks 3 cm for this long at each end, where it overlaps the main road"
				},
				kerbWidth: {
					type: "number",
					default: 1
				},
				kerbHeight: {
					type: "number",
					default: .1
				},
				shoulderWidth: {
					type: "number",
					default: 6
				},
				shoulderDrop: {
					type: "number",
					default: .4
				},
				barrierSpacing: {
					type: "number",
					default: 2
				},
				roadTileLength: {
					type: "number",
					default: 10,
					description: "metres of road per UV v unit"
				},
				chunkCount: {
					type: "integer",
					default: 8
				},
				minimapSamples: {
					type: "integer",
					default: 200
				},
				minimapPadding: {
					type: "number",
					default: .06
				},
				boostPadHalfLength: {
					type: "number",
					default: 1.75
				},
				boostPadWidth: {
					type: "number",
					default: 3
				},
				balloonHeight: {
					type: "number",
					default: 1.2
				},
				balloonRadius: {
					type: "number",
					default: .9
				},
				coinRadius: {
					type: "number",
					default: .5
				},
				hazardRadius: {
					type: "number",
					default: 1.2
				},
				fallingActiveSeconds: {
					type: "number",
					default: .5
				},
				gustWindow: {
					type: "number",
					default: 6,
					description: "metres along the road a gust acts over"
				},
				decorBands: {
					type: "object",
					properties: {
						roadside: {
							type: "array",
							items: { type: "number" },
							default: [8, 14]
						},
						far: {
							type: "array",
							items: { type: "number" },
							default: [30, 120]
						},
						sky: {
							type: "array",
							items: { type: "number" },
							default: [25, 60]
						}
					}
				},
				lapTimeWarn: {
					type: "array",
					items: { type: "number" },
					default: [40, 65],
					description: "seconds; estimated lap outside this warns"
				},
				trackDrawCallBudget: {
					type: "integer",
					default: 40
				}
			}
		}
	}
};
//#endregion
//#region src/track-builder/constants.ts
function Pe(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = Pe(r.properties));
	return t;
}
var P = Object.freeze(Pe(Ne.properties.builder.properties)), Fe = v.properties.base.properties.kartRadius.default;
v.properties.base.properties.tSearchWindow.default;
//#endregion
//#region src/track-builder/spline.ts
var F = 1e-4;
function I(e, t, n, r, i, a, o, s, c) {
	let l = (t - e) / i - (n - e) / (i + a) + (n - t) / a, u = (n - t) / a - (r - t) / (a + o) + (r - n) / o;
	l *= a, u *= a, s[c] = t, s[c + 1] = l, s[c + 2] = -3 * t + 3 * n - 2 * l - u, s[c + 3] = 2 * t - 2 * n + l + u;
}
var Ie = class {
	closed = !0;
	count;
	c;
	constructor(e) {
		if (e.length < 4) throw Error(`ClosedSpline needs at least 4 points, got ${e.length}`);
		let t = e.length;
		this.count = t, this.c = new Float64Array(t * 12);
		for (let n = 0; n < t; n++) {
			let r = e[(n - 1 + t) % t], i = e[n], a = e[(n + 1) % t], o = e[(n + 2) % t], s = L(r, i) ** .25, c = L(i, a) ** .25, l = L(a, o) ** .25;
			c < F && (c = 1), s < F && (s = c), l < F && (l = c);
			let u = n * 12;
			I(r.x, i.x, a.x, o.x, s, c, l, this.c, u), I(r.y, i.y, a.y, o.y, s, c, l, this.c, u + 4), I(r.z, i.z, a.z, o.z, s, c, l, this.c, u + 8);
		}
	}
	segmentOf(e) {
		let t = this.count, n = Re(e) * t;
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
		for (let a = 1; a <= e; a++) this.pointAt(a / e, r), i += Math.hypot(r[0] - n[0], r[1] - n[1], r[2] - n[2]), t[a] = i, n[0] = r[0], n[1] = r[1], n[2] = r[2];
		return t;
	}
}, Le = class {
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
			let n = i === 0 ? r(e[0], e[1]) : e[i - 1], a = e[i], o = e[i + 1], s = i + 2 < t ? e[i + 2] : r(e[t - 1], e[t - 2]), c = L(n, a) ** .25, l = L(a, o) ** .25, u = L(o, s) ** .25;
			l < F && (l = 1), c < F && (c = l), u < F && (u = l);
			let d = i * 12;
			I(n.x, a.x, o.x, s.x, c, l, u, this.c, d), I(n.y, a.y, o.y, s.y, c, l, u, this.c, d + 4), I(n.z, a.z, o.z, s.z, c, l, u, this.c, d + 8);
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
		for (let a = 1; a <= e; a++) this.pointAt(a / e, r), i += Math.hypot(r[0] - n[0], r[1] - n[1], r[2] - n[2]), t[a] = i, n[0] = r[0], n[1] = r[1], n[2] = r[2];
		return t;
	}
};
function L(e, t) {
	let n = e.x - t.x, r = e.y - t.y, i = e.z - t.z;
	return n * n + r * r + i * i;
}
function Re(e) {
	let t = e % 1;
	return t < 0 ? t + 1 : t;
}
//#endregion
//#region src/track-builder/types.ts
var ze = Object.freeze([
	"road",
	"dirt",
	"mud",
	"ice",
	"boost",
	"rail"
]);
function Be(e) {
	let t = ze.indexOf(e ?? "road");
	return t < 0 ? 0 : t;
}
//#endregion
//#region src/track-builder/lut.ts
var R = (e) => {
	let t = e % 1;
	return t < 0 ? t + 1 : t;
}, Ve = (e) => e < 0 ? 0 : e > 1 ? 1 : e, He = Math.PI / 180, Ue = class {
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
	seg;
	grip;
	minY;
	maxY;
	constructor(e, t = {}) {
		let n = t.samples ?? P.lutSamples, r = t.divisions ?? P.arcDivisions, i = t.closed ?? !0, a = i ? new Ie(e) : new Le(e);
		this.spline = a, this.n = n, this.closed = i, this.step = i ? n : n - 1, this.px = new Float64Array(n), this.py = new Float64Array(n), this.pz = new Float64Array(n), this.tx = new Float64Array(n), this.ty = new Float64Array(n), this.tz = new Float64Array(n), this.rx = new Float64Array(n), this.rz = new Float64Array(n), this.bank = new Float64Array(n), this.hw = new Float64Array(n), this.surface = new Uint8Array(n), this.seg = new Uint16Array(n), this.grip = new Float64Array(n).fill(1);
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
			this.seg[t] = h, this.surface[t] = Be(_.surface), this.hw[t] = _.halfWidth + (v.halfWidth - _.halfWidth) * y;
			let b = (_.bank ?? 0) * He, x = (v.bank ?? 0) * He;
			this.bank[t] = b + (x - b) * y;
		}
		this.minY = u, this.maxY = d;
		for (let e = 0; e < n; e++) {
			let t = this.idx(e + 1), n = this.idx(e - 1), r = this.px[t] - this.px[n], i = this.py[t] - this.py[n], a = this.pz[t] - this.pz[n], o = Math.hypot(r, i, a) || 1;
			r /= o, i /= o, a /= o, this.tx[e] = r, this.ty[e] = i, this.tz[e] = a;
			let s = Math.hypot(r, a) || 1;
			this.rx[e] = a / s, this.rz[e] = -r / s;
		}
	}
	idx(e) {
		let t = this.n;
		return this.closed ? (e % t + t) % t : e < 0 ? 0 : e >= t ? t - 1 : e;
	}
	norm(e) {
		return this.closed ? R(e) : Ve(e);
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
		let r = this.norm(e) * this.step, i = Math.floor(r), a = this.idx(i), o = this.idx(i + 1), s = r - i, c = 1 - s, l = this.tx[a] * c + this.tx[o] * s, u = this.ty[a] * c + this.ty[o] * s, d = this.tz[a] * c + this.tz[o] * s, f = Math.hypot(l, u, d) || 1;
		l /= f, u /= f, d /= f;
		let p = Math.hypot(l, d) || 1, m = d / p, h = -l / p, g = this.bank[a] * c + this.bank[o] * s, _ = -t * Math.tan(g), v = this.px[a] * c + this.px[o] * s + m * t, y = this.py[a] * c + this.py[o] * s + _, b = this.pz[a] * c + this.pz[o] * s + h * t, x = m, S = -Math.tan(g), ee = h, C = u * ee - d * S, w = d * x - l * ee, T = l * S - u * x, E = Math.hypot(C, w, T) || 1;
		C /= E, w /= E, T /= E;
		let te = n.position, D = n.tangent, ne = n.normal;
		return te[0] = v, te[1] = y, te[2] = b, D[0] = l, D[1] = u, D[2] = d, ne[0] = C, ne[1] = w, ne[2] = T, n.groundY = y, n.halfWidth = this.hw[a] * c + this.hw[o] * s, n.surface = ze[this.surface[a]], n.gripScale = this.grip[a] * c + this.grip[o] * s, n;
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
		let t = this.n, n = P.globalSearchStep, [r, i, a] = e, o = 0, s = Infinity;
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
function z(e, t) {
	return new Ue(e, t);
}
//#endregion
//#region src/track-builder/branches.ts
function B(e, t) {
	let n = R(e - t);
	return n > .5 ? n - 1 : n;
}
var We = class {
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
		this.index = e, this.id = t, this.lut = n, this.entryT = r, this.exitT = i, this.span = e === 0 ? 1 : R(i - r), this.openOnLaps = a, this.entryPoint = e === 0 ? [
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
		if (this.isMain) return R(e);
		let t = B(e, this.entryT) / this.span;
		return t < 0 ? 0 : t > 1 ? 1 : t;
	}
	toMain(e) {
		return this.isMain ? R(e) : R(this.entryT + e * this.span);
	}
	sample(e, t) {
		return this.lut.sample(this.toLocal(e), t);
	}
	sampleInto(e, t, n) {
		return this.lut.sampleInto(this.toLocal(e), t, n);
	}
	overlaps(e, t) {
		if (this.isMain) return !0;
		let n = B(e, this.entryT);
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
		return {
			t: this.toMain(r),
			d2: this.lut.dist2At(r, e)
		};
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
};
function Ge(e, t) {
	return Math.max(64, Math.round(P.lutSamples * e / t));
}
function Ke(e, t, n, r = t.controlPoints) {
	let i = z(r, {
		closed: !1,
		samples: 64,
		divisions: 256
	}), a = z(r, {
		closed: !1,
		samples: Ge(i.length, n.length),
		divisions: Math.max(256, Math.round(P.arcDivisions * i.length / n.length))
	});
	return new We(e, t.id, a, R(t.entryT), R(t.exitT), t.openOnLaps ?? []);
}
var qe = class {
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
			let t = B(e, n.entryT);
			if (t < 0 || t > n.span) return this.main;
		}
		return n;
	}
	nearest(e, t, n) {
		let r = this.list[t.branch] ?? this.main;
		!r.open && !r.overlaps(t.t, 0) && (r = this.main);
		let i = r.nearestLocal(e, t.t, n), a = r.index, o = Math.sqrt(i.d2), s = i.t;
		if (o <= r.halfWidthAt(s) - P.branchLeaveMargin) return {
			t: s,
			branch: r.index
		};
		let c = P.branchHysteresis;
		for (let i of this.list) {
			if (i === r || !i.open || !i.overlaps(t.t, n)) continue;
			let l = i.nearestLocal(e, t.t, n), u = Math.sqrt(l.d2);
			u < o - c && (o = u, a = i.index, s = l.t);
		}
		return {
			t: s,
			branch: a
		};
	}
	nearestGlobal(e) {
		let t = 0, n = this.main.nearestGlobal(e);
		for (let r of this.list) {
			if (r.isMain || !r.open) continue;
			let i = r.nearestGlobal(e);
			i.d2 < n.d2 - P.branchHysteresis * P.branchHysteresis && (n = i, t = r.index);
		}
		return {
			t: n.t,
			branch: t
		};
	}
};
//#endregion
//#region src/ai-driver/constants.ts
function Je(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = Je(r.properties));
	return t;
}
function Ye(e) {
	if (e && typeof e == "object") for (let t of Object.values(e)) Ye(t);
	return Object.freeze(e);
}
var V = Ye(Je(v.properties.ai.properties)), Xe = V.profiles;
function Ze(e) {
	return e === 50 ? "easy" : e === 100 ? "normal" : "hard";
}
function Qe(e) {
	let [t, n] = V.drift.tierBySkill;
	return e < t ? 1 : e < n ? 2 : 3;
}
//#endregion
//#region src/ai-driver/rng.ts
function $e(e, t) {
	return (Math.imul(e | 0, 2654435761) ^ Math.imul(t + 1, 2246822519)) >>> 0;
}
function et(e) {
	e.rng = e.rng + 1831565813 >>> 0;
	let t = e.rng;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), (t ^ t >>> 14) >>> 0;
}
function H(e) {
	return et(e) / 4294967296;
}
function U(e, t, n) {
	return t + (n - t) * H(e);
}
//#endregion
//#region src/ai-driver/drift.ts
function tt(e, t) {
	let n = e - t;
	return n > 1e-9 ? n : 0;
}
function W(e, t) {
	return e.steerRate * (e.driftSteerMin + (e.driftSteerMax - e.driftSteerMin) * t);
}
function nt(e, t) {
	let n = V.drift, r = e > 1e-4 ? n.overRotate / e : Infinity;
	return Math.min(r, n.maxHold, t);
}
function rt(e, t, n) {
	let r = Math.abs(n.turnNear) / V.line.turnNearSeconds, i = V.line.turnFarSeconds, a = e.drift.chargeMultiplierRemaining > 0 ? e.drift.chargeMultiplier : 1, o = t.chargeFull * 60 * a * Math.max(0, nt(W(t, .5) - r, i) - t.hopSeconds), s = t.chargeNeutral * 60 * a * Math.max(0, nt(W(t, 0) - r, i) - t.hopSeconds);
	return ge(Math.max(o, s), t.driftTiers);
}
function it(e, t, n, r) {
	let i = r.turnNear, a = r.turnFar;
	return Math.abs(a) <= n.driftThreshold || Math.abs(i) <= n.driftThreshold * .5 || Math.sign(i) !== Math.sign(a) ? !1 : rt(e, t, r) >= 1;
}
function at(e, t, n, r) {
	return it(e, t, n, r) && r.kappa * Math.abs(e.speed) >= V.drift.startYawFraction * W(t, .5);
}
function ot(e, t, n, r) {
	return it(e, t, n, r) ? Math.abs(r.turnNear) / V.line.turnNearSeconds < W(t, .5) : !1;
}
function st(e, t, n, r, i, a, o, s) {
	let c = V.drift;
	if (n.driftCooldown = tt(n.driftCooldown, s), o.drift = !1, n.driftDir === 0) {
		if (n.driftCooldown > 0 || !e.grounded || e.drift.phase !== "idle" || i.narrow || i.nearBranch || e.speed < t.driftMinSpeed * a) return;
		let s = i.turnNear, l = i.turnFar;
		if (!(Math.abs(s) > r.driftThreshold && Math.abs(l) > r.driftThreshold && Math.sign(s) === Math.sign(l)) || i.kappaShort * Math.abs(e.speed) < c.startYawFraction * W(t, .5)) return;
		let u = Math.min(Qe(n.skill), rt(e, t, i));
		if (u < 1) return;
		if (H(n) >= n.personality.driftUse) {
			n.driftCooldown = c.cooldown;
			return;
		}
		n.driftDir = s > 0 ? 1 : -1, n.driftTier = u, n.driftHold = 0, o.drift = !0, o.steer = n.driftDir;
		return;
	}
	let l = n.driftDir;
	n.driftHold += s, o.drift = !0;
	let u = t.hopSeconds * t.hopLandWindow + s;
	if (e.drift.phase === "idle" && n.driftHold > u) {
		ct(n, c.abortCooldown, o, "abort");
		return;
	}
	if (n.driftHold <= c.hopCommit || e.drift.phase !== "drifting") {
		o.steer = l * c.hopCommitStick;
		return;
	}
	n.driftTier = Math.max(n.driftTier, Math.min(Qe(n.skill), rt(e, t, i)));
	let d = i.roadErr, f = G(((i.turnNear / V.line.turnNearSeconds * l + c.aimGain * d * l) / t.steerRate - t.driftSteerMin) / (t.driftSteerMax - t.driftSteerMin), 0, 1);
	if (f < .5 && e.drift.tier < n.driftTier) {
		if (f >= .5 - c.chargeSnap) f = .5;
		else {
			let n = e.drift.chargeMultiplierRemaining > 0 ? e.drift.chargeMultiplier : 1;
			(t.driftTiers[Math.min(e.drift.tier, t.driftTiers.length - 1)] - e.drift.charge) / (t.chargeFull * 60 * n) <= c.chargeSecondsAhead && (f = .5);
		}
	}
	o.steer = l * f;
	let p = e.drift.tier, m = p >= n.driftTier ? "tier" : d * l < -c.overRotate ? "over" : p >= 1 && Math.abs(d) < c.aligned && i.kappaShort * Math.abs(e.speed) < c.exitYawFraction * W(t, 0) ? "aligned" : i.myLat * l > i.halfWidth - c.edgeMargin ? "edge" : n.driftHold > c.maxHold ? "hold" : "none";
	m !== "none" && ct(n, p === 0 ? c.abortCooldown : c.cooldown, o, m);
}
function ct(e, t, n, r) {
	e.driftDir = 0, e.driftHold = 0, e.driftCooldown = t, e.driftEndReason = r, n.drift = !1;
}
function lt(e, t, n, r) {
	if (e.grounded || e.airborne.fromJumpId === void 0) {
		t.trickRolled = !1, t.trickDone = !1;
		return;
	}
	if (t.driftDir === 0 && (t.trickRolled || (t.trickRolled = !0, t.trickDone = H(t) >= n.trickChance), !t.trickDone)) {
		if (e.prevDrift) {
			r.drift = !1;
			return;
		}
		r.drift = !0, t.trickDone = !0;
	}
}
//#endregion
//#region src/ai-driver/line.ts
function G(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function K(e) {
	for (; e > Math.PI;) e -= 2 * Math.PI;
	for (; e < -Math.PI;) e += 2 * Math.PI;
	return e;
}
function ut(e) {
	let t = V.line;
	return G(Math.abs(e) * t.lookAheadGain, t.lookAheadMin, t.lookAheadMax);
}
var dt = 5;
function ft(e, t, n, r, i) {
	let a = V.line, o = t.length, s = n.branchChoice > 0 ? n.branchChoice : e.branch, c = Math.max(Math.abs(e.speed), dt);
	t.sampleInto(e.t, 0, e.branch, r.here), t.sampleInto(R(e.t + c * a.turnNearSeconds / o), 0, s, r.near), t.sampleInto(R(e.t + c * a.turnFarSeconds / o), 0, s, r.far);
	let l = A(r.here.tangent);
	i.turnNear = K(A(r.near.tangent) - l), i.turnFar = K(A(r.far.tangent) - l), i.probeNear = c * a.turnNearSeconds, t.sampleInto(R(e.t + a.lookAheadMin / o), 0, s, r.short);
	let u = A(r.short.tangent), d = K(u - l);
	i.kappaShort = Math.abs(d) / a.lookAheadMin, i.kappa = Math.max(i.kappaShort, Math.abs(i.turnNear) / i.probeNear), i.roadErr = K(u - e.heading), i.halfWidth = r.here.halfWidth, i.narrow = r.here.halfWidth < a.narrowRoad;
	let f = ut(e.speed), p = e.branch !== 0 || n.branchChoice > 0;
	i.branchAhead = 0, i.branchSide = 0;
	let m = t.branches.list;
	for (let n = 1; n < m.length; n++) {
		let a = m[n];
		if (!a.open) continue;
		let s = B(a.entryT, e.t) * o, c = B(a.exitT, e.t) * o;
		if ((s > -f && s < f || c > -f && c < f) && (p = !0), e.branch === 0 && s > 0 && s < f && i.branchAhead === 0) {
			let e = R(a.entryT + a.span * .25), o = t.sampleInto(e, 0, n, r.tmp).position, s = t.sampleInto(e, 0, 0, r.ahead), c = (o[0] - s.position[0]) * s.tangent[2] - (o[2] - s.position[2]) * s.tangent[0];
			i.branchAhead = n, i.branchSide = c > .3 ? 1 : c < -.3 ? -1 : 0;
		}
	}
	(i.narrow || p) && (f = Math.max(a.lookAheadMin, f * a.narrowLookAhead)), i.L = f, i.nearBranch = p, i.branch = s;
	let h = r.here.tangent, g = r.here.position;
	return i.myLat = (e.position[0] - g[0]) * h[2] - (e.position[2] - g[2]) * h[0], i;
}
function pt(e, t, n, r, i, a) {
	let o = V.line;
	if (e.branch !== 0 || i.narrow || n.branchChoice > 0 || e.surface === "dirt" || e.surface === "mud") return 0;
	let s = i.halfWidth, c = n.personality.lateralBias * o.laneHalfFraction * s;
	if (n.driftDir === 0 && n.personality.driftUse > 0 && ot(e, t, r, i)) return -Math.sign(i.turnFar) * o.outsideFraction * s;
	let l = G(i.turnNear * o.insideGain, -o.insideBiasMax, o.insideBiasMax) * s, u = n.wanderAmp * Math.sin(2 * Math.PI * a / n.wanderPeriod + n.wanderPhase), d = o.lateralMaxFraction * s;
	return G(c + l + u, -d, d);
}
function mt(e, t, n, r, i, a) {
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
		let r = B(t.entryT, e.t) * s;
		(n.branchChoice > 0 ? r < -V.line.branchCommitMetres : r < 0) && (n.branchChoice = 0);
		return;
	}
	for (let t = 1; t < o.length; t++) {
		let c = o[t];
		if (!c.open) continue;
		let l = B(c.entryT, e.t) * s;
		if (l <= 0 || l > 2 * i.L) continue;
		let u = c.lut.sample(.5, 0).halfWidth < V.line.narrowRoad, d = n.skill >= r.shortcutSkill;
		n.branchChoice = (a === void 0 ? d && (n.rb >= V.rubber.shortcutRb || !u && H(n) < n.personality.aggression) : c.id === a) ? t : -t;
		return;
	}
}
//#endregion
//#region src/ai-driver/avoid.ts
function ht(e, t, n, r) {
	let i = e.track.sampleInto(t, 0, n, e.sc.tmp), a = i.tangent, o = i.position;
	return (r[0] - o[0]) * a[2] - (r[2] - o[2]) * a[0];
}
function gt(e, t) {
	return e > .05 ? -1 : e < -.05 || t >= e ? 1 : -1;
}
function _t(e, t, n, r) {
	return Math.abs(e - t) >= n ? e : t + gt(t, r) * n;
}
function vt(e, t, n, r, i, a) {
	let o = V.avoid, { track: s, karts: c } = t, l = s.length, u = n.halfWidth, d = x.kartRadius, f = Math.max(.5, u - d - .2), p = Math.min(o.stoppedClearance, f), m = Math.min(2 * d + .3, f), h = s.features, g = Infinity, _ = a, v = 0;
	for (let n = 0; n < h.length; n++) {
		let i = h[n];
		if (i.branch !== e.branch) continue;
		let s = 0;
		if (i.kind === "coin") {
			if (e.coins >= x.coinCap) continue;
			let r = n < t.coinOf.length ? t.coinOf[n] : -1;
			if (r < 0 || t.coinStates[r].respawnRemaining > 0) continue;
			s = 1;
		} else if (i.kind === "pickup") {
			let r = e.item.held !== "none" || e.item.rouletteRemaining > 0, i = e.item.next !== "none" || e.item.nextRouletteRemaining > 0;
			if (r && i) continue;
			let a = n < t.pickupOf.length ? t.pickupOf[n] : -1;
			if (a < 0 || t.pickupStates[a].respawnRemaining > 0) continue;
			s = 2;
		} else if (i.kind === "boostPad") {
			if (r < o.padSkill) continue;
			s = 3;
		} else continue;
		let c = B(i.t, e.t) * l;
		c <= 0 || c > o.seekDistance || Math.abs(i.lateral - a) > o.seekLateral || (s > v || s === v && c < g) && (v = s, g = c, _ = i.lateral);
	}
	a = _;
	for (let r = 0; r < c.length; r++) {
		let i = c[r];
		if (i === e || i.isGhost) continue;
		let s = B(i.t, e.t) * l;
		if (s <= 0 || s > o.stoppedLookAhead || i.branch !== e.branch) continue;
		if (i.speed < o.slowKartSpeed || i.status.spinRemaining > 0 || i.status.intangibleRemaining > 0 || i.finishTick !== void 0) {
			a = _t(a, ht(t, i.t, i.branch, i.position), p, n.myLat);
			continue;
		}
		if (s > o.avoidLookAhead) continue;
		let u = ht(t, i.t, i.branch, i.position);
		n.narrow || n.nearBranch || s > o.passDistance || (e.speed - i.speed > o.passClosing || s < o.touchDistance ? a = _t(a, u, m, n.myLat) : s <= x.slipstreamLength && Math.abs(a - u) < x.slipstreamHalfWidth && (a = u));
	}
	if (i < 0 && n.branchAhead === -i && n.branchSide !== 0) {
		let e = V.line.declineFraction * u;
		a * -n.branchSide < e && (a = -n.branchSide * e);
	}
	let y = t.hazards;
	if (y.length) {
		let r = o.rollingLookAhead / l + .02;
		for (let i = 0; i < y.length; i++) {
			let c = y[i];
			if (c.type === "gust") continue;
			let d = c.type === "rolling" ? o.rollingLookAhead : o.hazardLookAhead, p = s.nearestT(c.position, e.t, r), m = B(p, e.t) * l;
			if (m <= 0 || m > d) continue;
			let h = ht(t, p, 0, c.position);
			Math.abs(h) > u + c.radius || (a = _t(a, h, Math.min(o.dodgeClearance + c.radius, f), n.myLat));
		}
	}
	let b = s.def.hazards;
	if (b) for (let t = 0; t < b.length; t++) {
		let r = b[t];
		if (r.type !== "rolling" && r.type !== "falling") continue;
		let i = B(r.t, e.t) * l;
		i < -o.spawnBehind || i > o.hazardLookAhead || (a = _t(a, r.lateral ?? 0, Math.min(o.dodgeClearance + P.hazardRadius, f), n.myLat));
	}
	let S = Math.max(0, Math.min(u - V.line.edgeMargin, u - d - .3));
	return G(a, -S, S);
}
//#endregion
//#region src/ai-driver/items.ts
function yt(e, t) {
	return K(Math.atan2(t.position[0] - e.position[0], t.position[2] - e.position[2]) - e.heading);
}
function bt(e, t) {
	return Math.hypot(e.position[0] - t.position[0], e.position[2] - t.position[2]);
}
function xt(e, t, n, r, i, a) {
	let o = e.item.held;
	if (o !== t.lastItem) return t.lastItem = o, t.itemHold = 0, t.reactionRemaining = o === "none" ? 0 : U(t, n.reactionMin, n.reactionMax) * (1 - t.skill), !1;
	if (o === "none" || e.item.rouletteRemaining > 0) return !1;
	if (t.itemHold += a, t.reactionRemaining > 0) return t.reactionRemaining -= a, !1;
	let s = i.roles[o];
	if (!s) return !1;
	let c = V.items, l = Infinity, u = Infinity, d = Infinity, f = Infinity, p = O(e.heading);
	for (let t of i.karts) {
		if (t === e || t.isGhost || t.finishTick !== void 0) continue;
		let n = bt(e, t);
		f = Math.min(f, n);
		let r = t.position[0] - e.position[0], i = t.position[2] - e.position[2];
		r * p[0] + i * p[2] > 0 ? (l = Math.min(l, n), Math.abs(yt(e, t)) < c.forwardCone && (u = Math.min(u, n))) : d = Math.min(d, n);
	}
	let m = Math.abs(r.turnFar) < c.straightTurn, h = e.surface === "dirt" || e.surface === "mud";
	switch (s) {
		case "forward": return u <= c.forwardRange;
		case "homing": return l <= c.homingRange;
		case "rearDrop":
		case "deception": return d <= c.rearRange || t.itemHold >= c.holdMax;
		case "defenceArea": return f <= c.defenceRadius || i.threatened;
		case "defenceHeld": return i.threatened || d <= c.rearRange;
		case "speed": return m || h || i.gap > c.speedItemGap;
		case "equaliser":
		case "chaos": return !0;
	}
}
//#endregion
//#region src/ai-driver/personalities.ts
var St = Object.freeze({
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
function Ct(e, t) {
	let n = St[e];
	return n ? { ...n } : {
		lateralBias: U(t, -.5, .5),
		aggression: U(t, .3, .7),
		driftUse: U(t, .5, .9)
	};
}
//#endregion
//#region src/ai-driver/rubber.ts
function wt(e) {
	let t = V.rubber, n = Math.abs(e);
	if (n <= t.deadZone) return 1;
	let r = Math.tanh((n - t.deadZone) / t.scale);
	return e > 0 ? 1 + (t.max - 1) * r : 1 - (1 - t.min) * r;
}
function Tt(e, t) {
	let n = e.skill + (t - 1) * V.rubber.skillGain;
	return n < 0 ? 0 : n > 1 ? 1 : n;
}
function Et(e, t) {
	let n = t / V.rubber.powerFrom;
	return e.power * (n < 1 ? n : 1);
}
var Dt = {
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
							intangibleRemaining: { type: "number" }
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
					default: 3
				},
				coinRespawnSeconds: {
					type: "number",
					default: 5
				}
			}
		}
	}
}, Ot = {
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
function kt(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) "default" in r ? t[n] = structuredClone(r.default) : r.type === "object" && r.properties && (t[n] = kt(r.properties));
	return t;
}
var q = Object.freeze(kt(Dt.properties.constants.properties));
Object.freeze([...Ot.properties.gpPointsByRank.default]), Object.freeze([...Ot.properties.knockoutSets.items.properties.cutLines.default]), Ot.properties.knockoutSets.items.properties.lapsPerSegment.default, Object.freeze([
	.6,
	.8,
	1
]);
//#endregion
//#region src/ai-driver/speed.ts
function At(e) {
	return .55 + .35 * e;
}
function jt(e, t, n, r, i) {
	if (e <= 1e-6) return Infinity;
	if (i) return n.steerRate * n.driftSteerMax * r / e;
	let a = n.steerRate * r;
	return a / (e + a * n.steerFalloff / t);
}
function Mt(e, t, n, r, i, a) {
	let o = Te(e, t), s = o.target, c = At(n.skill) * (r.narrow ? V.line.narrowMargin : 1), l = jt(r.kappa, o.base, t, c, e.drift.phase === "drifting" || i);
	return a.legal = s, a.corner = l, a.target = Math.min(n.powerCap * n.fieldPace * s, Math.max(l, Nt)), a;
}
var Nt = 4;
function Pt(e, t, n, r) {
	if (r.brake = 0, e.speed <= q.stuckSpeed) {
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
function Ft(e, t) {
	let n = t[0] - e.position[0], r = t[2] - e.position[2];
	return K(Math.atan2(n, r) - e.heading);
}
function It(e, t, n, r, i, a, o) {
	let s = V.steer, c = Ft(e, t), l = G((c - n.prevErr) / o, -s.dErrMax, s.dErrMax);
	if (n.prevErr = c, n.noise += (U(n, -r, r) - n.noise) * s.noiseSmoothing, !e.grounded && e.drift.phase !== "hopping" && n.driftDir === 0) return 0;
	let u = G(s.kLat * a, -s.kLatMax, s.kLatMax);
	return G((s.kP * c + s.kD * l + u) * i + n.noise, -1, 1);
}
//#endregion
//#region src/ai-driver/recover.ts
function Lt(e, t, n, r) {
	let i = V.recover;
	return t.recovery === "reverse" ? (t.recoverTimer -= r, n.throttle = 0, n.brake = 1, n.drift = !1, n.steer = t.prevErr > 0 ? -1 : 1, t.recoverTimer <= 1e-9 && (t.recovery = "cooldown", t.recoverTimer = i.cooldownSeconds), !0) : t.recovery === "cooldown" ? (t.recoverTimer -= r, t.recoverTimer <= 1e-9 && (t.recovery = "none", t.recoverTimer = 0), t.stuckSeconds = 0, !1) : (t.stuckSeconds = e.grounded && e.status.spinRemaining === 0 && e.status.intangibleRemaining === 0 && Math.abs(e.speed) < q.stuckSpeed ? t.stuckSeconds + r : 0, t.stuckSeconds + 1e-9 >= i.stuckSeconds && (t.stuckSeconds = 0, t.recovery = "reverse", t.recoverTimer = i.reverseSeconds, t.driftDir = 0, n.throttle = 0, n.brake = 1, n.drift = !1, n.steer = t.prevErr > 0 ? -1 : 1, !0));
}
//#endregion
//#region src/ai-driver/types.ts
function J() {
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
function Rt() {
	return {
		ahead: J(),
		near: J(),
		far: J(),
		here: J(),
		short: J(),
		tmp: J()
	};
}
function zt() {
	return {
		L: 0,
		turnNear: 0,
		turnFar: 0,
		probeNear: 1,
		kappa: 0,
		kappaShort: 0,
		roadErr: 0,
		halfWidth: 1,
		branch: 0,
		myLat: 0,
		nearBranch: !1,
		narrow: !1,
		branchAhead: 0,
		branchSide: 0
	};
}
//#endregion
//#region src/ai-driver/driver.ts
var Bt = Object.freeze({
	...Xe.normal,
	skill: V.autopilot.skill,
	power: V.autopilot.power
});
function Vt(e, t, n, r, i, a) {
	let o = {
		rng: $e(e, t),
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
		driftEndReason: "none",
		trickRolled: !1,
		trickDone: !1,
		recovery: "none",
		recoverTimer: 0,
		stuckSeconds: 0,
		reactionRemaining: 0,
		lastItem: "none",
		itemHold: 0,
		branchChoice: 0,
		lateral: 0
	};
	return o.personality = a ? { ...a } : Ct(n, o), o.startPress = r.startPressMean + U(o, -r.startPressSpread, r.startPressSpread), o.wanderAmp = U(o, V.line.wanderAmpMin, V.line.wanderAmpMax), o.wanderPeriod = U(o, V.line.wanderPeriodMin, V.line.wanderPeriodMax), o.wanderPhase = U(o, 0, 2 * Math.PI), o;
}
var Ht = class {
	track;
	profile;
	onlyShortcut;
	memory;
	consts;
	outputs;
	playerIndex;
	sc = Rt();
	line = zt();
	speed = {
		legal: 0,
		target: 0,
		corner: Infinity
	};
	avoidCtx;
	itemCtx;
	threatened = [];
	constructor(e, t, n, r = {}) {
		this.track = e, this.profile = r.profile ?? Xe[Ze(t.speedClass)], this.onlyShortcut = r.onlyShortcut;
		let i = new Map(t.racers.map((e) => [e.racerId, e])), a = n.karts;
		this.consts = a.map((e) => S(i.get(e.racerId)?.archetype ?? "medium", t.speedClass)), this.outputs = a.map(() => ({ ...D })), this.playerIndex = a.findIndex((e) => e.isPlayer);
		let o = a.map((e, t) => t).filter((e) => !a[e].isPlayer && !a[e].isGhost), s = o.map((e, t) => 1 - V.rubber.fieldPaceSpread * t / Math.max(1, o.length - 1)), c = { rng: $e(n.seed, 24301) };
		for (let e = s.length - 1; e > 0; e--) {
			let t = Math.floor(H(c) * (e + 1));
			[s[e], s[t]] = [s[t], s[e]];
		}
		let l = new Map(o.map((e, t) => [e, s[t]]));
		this.memory = a.map((e, t) => Vt(n.seed, n.trackers[t]?.gridSlot ?? t, e.racerId, this.profile, l.get(t) ?? 1, r.personalities?.[e.racerId]));
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
	fill(e, t, n) {
		let r = e.karts;
		this.avoidCtx.hazards = t, this.avoidCtx.pickupStates = e.pickupStates, this.avoidCtx.coinStates = e.coinStates;
		let i = this.playerIndex >= 0 ? r[this.playerIndex] : void 0, a = i !== void 0 && i.finishTick === void 0;
		for (let t = 0; t < r.length; t++) {
			let o = r[t];
			if (o.isGhost || o.isPlayer && o.finishTick === void 0) continue;
			let s = this.outputs[t];
			n[t] = s, this.drive(e, o, t, a ? i : void 0, s);
		}
	}
	drive(e, t, n, r, i) {
		let a = this.memory[n], o = this.consts[n], s = M, c = t.finishTick !== void 0, l = c ? Bt : this.profile;
		if (i.steer = 0, i.throttle = 0, i.brake = 0, i.drift = !1, i.item = !1, i.lookBack = !1, i.horn = !1, e.phase === "countdown") {
			i.throttle = +(e.time >= -a.startPress);
			return;
		}
		if (t.status.spinRemaining > 0) return;
		let u = r && !c ? r.distanceAlong - t.distanceAlong : 0;
		a.rb = wt(u), a.skill = Tt(l, a.rb), a.powerCap = Et(l, a.rb);
		let d = ft(t, this.track, a, this.sc, this.line);
		mt(t, this.track, a, l, d, this.onlyShortcut);
		let f = pt(t, o, a, l, d, e.tick / 120);
		f = vt(t, this.avoidCtx, d, a.skill, a.branchChoice, f);
		let p = V.line.laneRate * s, m = f - a.lateral;
		a.lateral += m > p ? p : m < -p ? -p : m;
		let h = this.track.sampleInto(R(t.t + d.L / this.track.length), a.lateral, d.branch, this.sc.ahead).position, g = t.surface === "dirt" || t.surface === "mud";
		i.steer = It(t, h, a, l.noise * (1 - a.skill), g ? V.steer.offroadGain : 1, a.lateral - d.myLat, s);
		let _ = Mt(t, o, a, d, !c && a.driftDir === 0 && a.driftCooldown === 0 && a.personality.driftUse > 0 && !d.narrow && !d.nearBranch && at(t, o, l, d), this.speed);
		Pt(t, _, l, i), c || (st(t, o, a, l, d, _.legal, i, s), lt(t, a, l, i)), c || (this.itemCtx.gap = u, this.itemCtx.threatened = this.threatened[n] === !0, i.item = xt(t, a, l, d, this.itemCtx, s)), Lt(t, a, i, s);
	}
}, Ut = {
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
							"chaos"
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
								description: "Rocket Lolly: drift charge rate scale while active"
							},
							chargeSeconds: { type: "number" },
							weightBonus: {
								type: "number",
								description: "Bubble: added to weight while held"
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
			default: 12,
			description: "Metres from its target at which the Homing Kite leaves the centreline for the target's lateral"
		},
		homingLateralRate: {
			type: "number",
			default: 8,
			description: "m/s the Kite can move sideways while snapping"
		},
		maxProjectilesPerOwner: {
			type: "integer",
			default: 1
		},
		maxGroundPerOwner: {
			type: "integer",
			default: 2,
			description: "A further drop pops the owner's oldest ground item"
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
function Y(e) {
	return Ut.properties[e].default;
}
var Wt = Object.freeze([
	{
		id: "beachBall",
		name: "Beach Ball",
		role: "forward",
		behaviour: {
			projectileSpeed: 38,
			bounces: 3,
			lifetimeSeconds: 8,
			radius: .6,
			affects: "target"
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
			projectileSpeed: 30,
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
			affects: "target"
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
			affects: "target"
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
		id: "rocketLolly",
		name: "Rocket Lolly",
		role: "speed",
		behaviour: {
			charges: 3,
			chargeMultiplier: 2,
			chargeSeconds: 2,
			affects: "self"
		},
		icon: "rocket-lolly",
		sfx: "lolly-fizz"
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
	}
]), Gt = Object.freeze([
	{
		beachBall: 25,
		oilCan: 40,
		decoyBalloon: 25,
		bubble: 10
	},
	{
		beachBall: 25,
		oilCan: 40,
		decoyBalloon: 25,
		bubble: 10
	},
	{
		beachBall: 30,
		homingKite: 25,
		oilCan: 15,
		bubble: 15,
		rocketLolly: 15
	},
	{
		beachBall: 30,
		homingKite: 25,
		oilCan: 15,
		bubble: 15,
		rocketLolly: 15
	},
	{
		beachBall: 15,
		homingKite: 30,
		airHorn: 15,
		rocketLolly: 40
	},
	{
		beachBall: 15,
		homingKite: 30,
		airHorn: 15,
		rocketLolly: 40
	},
	{
		homingKite: 20,
		rocketLolly: 55,
		fogBank: 25
	},
	{
		homingKite: 20,
		rocketLolly: 55,
		fogBank: 25
	}
]), Kt = Wt.map((e) => e.id), qt = Object.freeze({
	rouletteSeconds: Y("rouletteSeconds"),
	items: [...Wt],
	table: [...Gt],
	lockoutSeconds: Y("lockoutSeconds"),
	finalLapLockoutSeconds: Y("finalLapLockoutSeconds"),
	lockedDuringLockout: ["fogBank"],
	knockoutPoolByRacers: {
		8: Kt,
		6: Kt,
		4: Kt.filter((e) => e !== "fogBank"),
		2: Kt.filter((e) => e !== "fogBank" && e !== "decoyBalloon")
	},
	ownerGraceSeconds: Y("ownerGraceSeconds"),
	spawnAheadMetres: Y("spawnAheadMetres"),
	dropBehindMetres: Y("dropBehindMetres"),
	projectileHeight: Y("projectileHeight"),
	homingSnapDistance: Y("homingSnapDistance"),
	homingLateralRate: Y("homingLateralRate"),
	maxProjectilesPerOwner: Y("maxProjectilesPerOwner"),
	maxGroundPerOwner: Y("maxGroundPerOwner")
}), Jt = Object.freeze(Object.fromEntries(Wt.map((e) => [e.id, e.role])));
//#endregion
//#region src/items/ground.ts
function Yt(e, t, n, r, i, a, o) {
	let s = r[i], c = t.groundItems.filter((e) => e.owner === i);
	for (; c.length >= e.maxGroundPerOwner;) X(t, c.shift(), o);
	let l = O(s.heading), u = [
		s.position[0] - l[0] * e.dropBehindMetres,
		s.position[1],
		s.position[2] - l[2] * e.dropBehindMetres
	], d = n.nearest(u, {
		t: s.t,
		branch: s.branch
	}, x.tSearchWindow);
	u[1] = n.sample(d.t, 0, d.branch).groundY;
	let f = {
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
	return t.groundItems.push(f), o.push({
		type: "groundPlace",
		id: f.id,
		itemId: f.itemId,
		racerId: s.racerId,
		position: [...f.position]
	}), f;
}
function X(e, t, n) {
	let r = e.groundItems.indexOf(t);
	r < 0 || (e.groundItems.splice(r, 1), n.push({
		type: "groundPop",
		id: t.id,
		itemId: t.itemId,
		position: [...t.position]
	}));
}
function Xt(e, t, n, r) {
	for (let i = e.groundItems.length - 1; i >= 0; i--) {
		let a = e.groundItems[i];
		a.graceRemaining = Math.max(0, a.graceRemaining - n), a.ttl -= n, (a.ttl <= 1e-9 || !t.branches.list[a.branch].open) && X(e, a, r);
	}
}
//#endregion
//#region src/items/rng.ts
var Zt = 45477;
function Qt(e, t = Zt) {
	return (Math.imul(e | 0, 2654435761) ^ Math.imul(t + 1, 2246822519)) >>> 0;
}
function $t(e) {
	e.rng = e.rng + 1831565813 >>> 0;
	let t = e.rng;
	return t = Math.imul(t ^ t >>> 15, t | 1), t ^= t + Math.imul(t ^ t >>> 7, t | 61), (t ^ t >>> 14) >>> 0;
}
function en(e) {
	return $t(e) / 4294967296;
}
function tn(e, t) {
	let n = 0;
	for (let t of Object.values(e)) t > 0 && (n += t);
	if (n <= 0) return;
	let r = 0, i;
	for (let [a, o] of Object.entries(e)) if (!(o <= 0) && (i = a, r += o, t * n < r)) return a;
	return i;
}
//#endregion
//#region src/items/roulette.ts
function nn(e, t, n) {
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
function rn(e) {
	let t = e.knockout?.eliminated ?? [], n = 0;
	for (let r of e.karts) !r.isGhost && !t.includes(r.racerId) && n++;
	return n;
}
function an(e, t, n, r, i) {
	let a = { ...e.table[Math.min(Math.max(i, 1), e.table.length) - 1] };
	if (t.time < e.lockoutSeconds || nn(t, n, r) <= e.finalLapLockoutSeconds) for (let t of e.lockedDuringLockout) a[t] = 0;
	if (t.mode === "knockout") {
		let n = e.knockoutPoolByRacers[String(rn(t))];
		if (n) for (let e of Object.keys(a)) n.includes(e) || (a[e] = 0);
	}
	return a;
}
function on(e, t, n, r, i, a, o) {
	let s = n.karts[a];
	if (s.isGhost || s.finishTick !== void 0) return !1;
	let c = s.item.held === "none" && s.item.rouletteRemaining <= 0, l = s.item.next === "none" && s.item.nextRouletteRemaining <= 0;
	if (!c && !l) return !1;
	let u = tn(an(e, n, r, i, s.rank), en(t));
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
function sn(e, t) {
	let n = e - t;
	return n > 1e-9 ? n : 0;
}
function cn(e, t, n) {
	e.item.rouletteRemaining > 0 && (e.item.rouletteRemaining = sn(e.item.rouletteRemaining, t), e.item.rouletteRemaining === 0 && e.item.held !== "none" && n.push({
		type: "itemReady",
		racerId: e.racerId,
		itemId: e.item.held,
		slot: 0
	})), e.item.nextRouletteRemaining > 0 && (e.item.nextRouletteRemaining = sn(e.item.nextRouletteRemaining, t), e.item.nextRouletteRemaining === 0 && e.item.next !== "none" && n.push({
		type: "itemReady",
		racerId: e.racerId,
		itemId: e.item.next,
		slot: 1
	}));
}
function ln(e) {
	e.item.held = "none", e.item.charges = 0, e.item.rouletteRemaining = 0, e.item.next = "none", e.item.nextCharges = 0, e.item.nextRouletteRemaining = 0;
}
function un(e) {
	e.item.held = e.item.next, e.item.charges = e.item.nextCharges, e.item.rouletteRemaining = e.item.nextRouletteRemaining, e.item.next = "none", e.item.nextCharges = 0, e.item.nextRouletteRemaining = 0;
}
//#endregion
//#region src/items/hits.ts
function Z(e, t) {
	return Math.hypot(e[0] - t[0], e[2] - t[2]);
}
function dn(e) {
	return !e.isGhost && e.finishTick === void 0 && e.status.intangibleRemaining <= 0 && e.status.spinRemaining <= 0;
}
function fn(e, t, n, r, i, a, o, s, c) {
	let l = e[r];
	if (!dn(l)) return !1;
	if (l.status.shield) return l.status.shield = !1, n.shieldRemaining[r] = 0, s.push({
		type: "shieldPop",
		racerId: l.racerId
	}), !0;
	let u = a.hitEffect ?? {}, d = !1, f = 0;
	if ((u.spinSeconds ?? 0) > 0) {
		c.length = 0, je(l, t[r], o, c);
		for (let e of c) e.type === "hit" && (d = e.spun, f = e.coinsLost);
	} else u.slowTo !== void 0 && (l.status.slowedTo = Math.min(l.status.slowRemaining > 0 ? l.status.slowedTo : 1, u.slowTo), l.status.slowRemaining = Math.max(l.status.slowRemaining, u.slowSeconds ?? 0));
	return u.dropsItem && l.item.held !== "none" && (s.push({
		type: "itemLost",
		racerId: l.racerId,
		itemId: l.item.held
	}), l.item.next !== "none" && s.push({
		type: "itemLost",
		racerId: l.racerId,
		itemId: l.item.next
	}), ln(l)), s.push({
		type: "hit",
		racerId: l.racerId,
		byRacerId: i,
		itemId: a.id,
		spun: d,
		coinsLost: f
	}), !0;
}
function pn(e, t, n, r) {
	let i = e[t], a = n.behaviour.slowTo ?? 1, o = n.behaviour.durationSeconds ?? 0, s = [];
	for (let c = 0; c < e.length; c++) {
		let l = e[c];
		c === t || l.isGhost || l.finishTick !== void 0 || l.rank >= i.rank || (l.status.slowedTo = Math.min(l.status.slowRemaining > 0 ? l.status.slowedTo : 1, a), l.status.slowRemaining = Math.max(l.status.slowRemaining, o), n.behaviour.stripsItem && (l.item.held !== "none" && r.push({
			type: "itemLost",
			racerId: l.racerId,
			itemId: l.item.held
		}), l.item.next !== "none" && r.push({
			type: "itemLost",
			racerId: l.racerId,
			itemId: l.item.next
		}), ln(l)), s.push(l.racerId));
	}
	return r.push({
		type: "fog",
		racerId: i.racerId,
		victims: s
	}), s;
}
//#endregion
//#region src/items/projectiles.ts
function mn(e, t, n, r) {
	let i = e.sample(t, 0, n).position, a = e.sample(t, 1, n).position;
	r[0] = a[0] - i[0], r[1] = a[1] - i[1], r[2] = a[2] - i[2];
	let o = Math.hypot(r[0], r[1], r[2]) || 1;
	return r[0] /= o, r[1] /= o, r[2] /= o, r;
}
function hn(e, t, n, r) {
	let i = e.sample(t, 0, n).position, a = mn(e, t, n, [
		0,
		0,
		0
	]);
	return (r[0] - i[0]) * a[0] + (r[2] - i[2]) * a[2];
}
function gn(e) {
	return x.speedClasses[String(e)];
}
function _n(e, t) {
	let n = 0;
	for (let r of e.projectiles) r.owner === t && n++;
	return n;
}
function vn(e, t) {
	let n = e[t], r = -1, i = .5;
	for (let a = 0; a < e.length; a++) {
		let o = e[a];
		if (a === t || o.isGhost || o.finishTick !== void 0) continue;
		let s = R(o.t - n.t);
		s > 0 && s < i && (i = s, r = a);
	}
	return r;
}
function yn(e, t, n, r, i, a, o, s, c) {
	let l = r[a], u = O(l.heading), d = s ? -1 : 1, f = (o.behaviour.projectileSpeed ?? 30) * gn(i), p = [
		l.position[0] + u[0] * e.spawnAheadMetres * d,
		l.position[1],
		l.position[2] + u[2] * e.spawnAheadMetres * d
	], m = n.nearest(p, {
		t: l.t,
		branch: l.branch
	}, x.tSearchWindow);
	p[1] = n.sample(m.t, 0, m.branch).groundY + e.projectileHeight;
	let h = o.behaviour.homing === !0, g = {
		id: t.nextId++,
		itemId: o.id,
		owner: a,
		ownerId: l.racerId,
		t: m.t,
		branch: m.branch,
		lateral: hn(n, m.t, m.branch, p),
		velocity: [
			u[0] * f * d,
			0,
			u[2] * f * d
		],
		speed: h ? f : 0,
		position: p,
		prevPosition: [...p],
		bouncesLeft: h ? 0 : o.behaviour.bounces ?? 0,
		target: h ? vn(r, a) : -1,
		ttl: o.behaviour.lifetimeSeconds ?? 8,
		graceRemaining: e.ownerGraceSeconds,
		radius: o.behaviour.radius ?? .5
	};
	return t.projectiles.push(g), c.push({
		type: "projectileSpawn",
		id: g.id,
		itemId: g.itemId,
		racerId: l.racerId,
		position: [...p]
	}), g;
}
function Q(e, t, n) {
	let r = e.projectiles.indexOf(t);
	r < 0 || (e.projectiles.splice(r, 1), n.push({
		type: "projectilePop",
		id: t.id,
		itemId: t.itemId,
		position: [...t.position]
	}));
}
var bn = [
	0,
	0,
	0
];
function xn(e, t, n, r, i, a) {
	let o = n.length;
	for (let s = t.projectiles.length - 1; s >= 0; s--) {
		let c = t.projectiles[s];
		if (c.prevPosition[0] = c.position[0], c.prevPosition[1] = c.position[1], c.prevPosition[2] = c.position[2], c.graceRemaining = Math.max(0, c.graceRemaining - i), c.ttl -= i, c.ttl <= 1e-9 || !n.branches.list[c.branch].open) {
			Q(t, c, a);
			continue;
		}
		if (c.speed > 0) {
			let t = c.target >= 0 ? r[c.target] : void 0;
			t && (t.finishTick !== void 0 || t.isGhost || t.status.intangibleRemaining > 0 || t.branch !== c.branch) && (c.target = -1), c.t = R(c.t + c.speed * i / o);
			let a = 0;
			if (c.target >= 0) {
				let t = r[c.target];
				R(t.t - c.t) * o <= e.homingSnapDistance && (a = hn(n, t.t, t.branch, t.position));
			}
			let s = e.homingLateralRate * i;
			c.lateral += Math.max(-s, Math.min(s, a - c.lateral));
			let l = n.sample(c.t, 0, c.branch);
			c.lateral = Math.max(-l.halfWidth + c.radius, Math.min(l.halfWidth - c.radius, c.lateral));
			let u = n.sample(c.t, c.lateral, c.branch);
			c.position[0] = u.position[0], c.position[1] = u.groundY + e.projectileHeight, c.position[2] = u.position[2];
			continue;
		}
		c.position[0] += c.velocity[0] * i, c.position[2] += c.velocity[2] * i;
		let l = n.nearest(c.position, {
			t: c.t,
			branch: c.branch
		}, x.tSearchWindow);
		c.t = l.t, c.branch = l.branch;
		let u = n.sample(c.t, 0, c.branch), d = mn(n, c.t, c.branch, bn), f = (c.position[0] - u.position[0]) * d[0] + (c.position[2] - u.position[2]) * d[2], p = u.halfWidth - c.radius;
		if (Math.abs(f) > p) {
			if (c.bouncesLeft--, c.bouncesLeft < 0) {
				Q(t, c, a);
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
		c.lateral = f, c.position[0] = u.position[0] + d[0] * f, c.position[2] = u.position[2] + d[2] * f, c.position[1] = u.groundY + e.projectileHeight;
	}
}
//#endregion
//#region src/items/use.ts
function $(e, t, n) {
	return e.push({
		type: "itemRefused",
		racerId: t.racerId,
		itemId: t.item.held,
		reason: n
	}), !1;
}
function Sn(e, t) {
	e.item.charges = Math.max(0, e.item.charges - 1), t.push({
		type: "itemUsed",
		racerId: e.racerId,
		itemId: e.item.held,
		chargesLeft: e.item.charges
	}), e.item.charges === 0 && un(e);
}
function Cn(e, t, n, r, i, a, o, s, c) {
	let l = n.karts, u = l[a];
	if (u.item.held === "none") return !1;
	let d = e.items.find((e) => e.id === u.item.held);
	if (!d) return !1;
	if (n.phase !== "racing" && n.phase !== "finalLap" || u.isGhost || u.finishTick !== void 0) return $(s, u, "notRacing");
	if (u.item.rouletteRemaining > 0) return $(s, u, "roulette");
	if (u.status.spinRemaining > 0) return $(s, u, "spinning");
	if (u.status.intangibleRemaining > 0) return $(s, u, "intangible");
	switch (d.role) {
		case "forward":
		case "homing":
			if (_n(t, a) >= e.maxProjectilesPerOwner) return $(s, u, "inFlight");
			yn(e, t, i, l, n.speedClass, a, d, d.role === "forward" && o.lookBack, s);
			break;
		case "rearDrop":
		case "deception":
			Yt(e, t, i, l, a, d, s);
			break;
		case "defenceArea":
			wn(t, l, r, a, d, s, c);
			break;
		case "defenceHeld":
			u.status.shield = !0, t.shieldRemaining[a] = d.behaviour.durationSeconds ?? 0, s.push({
				type: "shieldUp",
				racerId: u.racerId
			});
			break;
		case "speed": {
			let e = r[a];
			T(u, "item", e.itemSpeedMultiplier, e.itemSpeedSeconds, c), u.drift.chargeMultiplier = d.behaviour.chargeMultiplier ?? 1, u.drift.chargeMultiplierRemaining = d.behaviour.chargeSeconds ?? 0;
			break;
		}
		case "equaliser":
			if (u.rank < (d.behaviour.minPosition ?? 1)) return $(s, u, "position");
			pn(l, a, d, s);
	}
	return Sn(u, s), !0;
}
function wn(e, t, n, r, i, a, o) {
	let s = t[r], c = i.behaviour.radius ?? 0;
	a.push({
		type: "horn",
		racerId: s.racerId,
		position: [...s.position],
		radius: c
	});
	for (let t = e.projectiles.length - 1; t >= 0; t--) {
		let n = e.projectiles[t];
		Z(n.position, s.position) <= c + n.radius && Q(e, n, a);
	}
	for (let t = e.groundItems.length - 1; t >= 0; t--) {
		let n = e.groundItems[t];
		Z(n.position, s.position) <= c + n.radius && X(e, n, a);
	}
	for (let l = 0; l < t.length; l++) l !== r && Z(t[l].position, s.position) <= c + n[l].kartRadius && fn(t, n, e, l, s.racerId, i, "item", a, o);
}
//#endregion
//#region src/items/items.ts
var Tn = class {
	cfg;
	track;
	host;
	state;
	roles;
	threatened;
	defs = /* @__PURE__ */ new Map();
	scratch = [];
	inert;
	constructor(e, t, n = qt) {
		this.cfg = n, this.track = e, this.host = t;
		for (let e of n.items) this.defs.set(e.id, e);
		this.roles = n === qt ? Jt : Object.fromEntries(n.items.map((e) => [e.id, e.role]));
		let r = t.state.karts.length;
		this.threatened = Array(r).fill(!1), this.state = {
			rng: Qt(t.state.seed),
			nextId: 1,
			prevItem: Array(r).fill(!1),
			shieldRemaining: Array(r).fill(0),
			fogHeldBy: "",
			projectiles: [],
			groundItems: []
		}, this.inert = t.state.mode === "timeTrial";
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
		for (let e = 0; e < l.length; e++) {
			let t = l[e];
			cn(t, n, r), s.shieldRemaining[e] > 0 && (s.shieldRemaining[e] = Math.max(0, s.shieldRemaining[e] - n), s.shieldRemaining[e] === 0 && t.status.shield && (t.status.shield = !1, r.push({
				type: "shieldEnd",
				racerId: t.racerId
			})));
		}
		for (let e of t) {
			if (e.type !== "pickup") continue;
			let t = l.findIndex((t) => t.racerId === e.racerId);
			t >= 0 && on(c, s, i, a, o, t, r);
		}
		for (let t = 0; t < l.length; t++) {
			let n = e[t]?.item === !0;
			n && !s.prevItem[t] && Cn(c, s, i, a, o, t, e[t], r, this.scratch), s.prevItem[t] = n;
		}
		xn(c, s, o, l, n, r), Xt(s, o, n, r);
		let u = s.projectiles, d = s.groundItems;
		for (let e = u.length - 1; e >= 0; e--) {
			let t = u[e], n = !1;
			for (let i = e - 1; i >= 0 && !n; i--) {
				let a = u[i];
				a.branch === t.branch && Z(t.position, a.position) <= t.radius + a.radius && (Q(s, t, r), Q(s, a, r), n = !0, e--);
			}
			if (!n) {
				for (let e = d.length - 1; e >= 0 && !n; e--) {
					let i = d[e];
					i.branch === t.branch && Z(t.position, i.position) <= t.radius + i.radius && (Q(s, t, r), X(s, i, r), n = !0);
				}
				if (!n) for (let e = 0; e < l.length && !n; e++) {
					let i = l[e];
					if (i.branch !== t.branch || !dn(i) || e === t.owner && t.graceRemaining > 0 || Z(t.position, i.position) > t.radius + a[e].kartRadius) continue;
					let o = this.defs.get(t.itemId);
					fn(l, a, s, e, t.ownerId, o, "projectile", r, this.scratch), Q(s, t, r), n = !0;
				}
			}
		}
		for (let e = d.length - 1; e >= 0; e--) {
			let t = d[e];
			for (let e = 0; e < l.length; e++) {
				let n = l[e];
				if (n.branch !== t.branch || !dn(n) || e === t.owner && t.graceRemaining > 0 || Z(t.position, n.position) > t.radius + a[e].kartRadius) continue;
				let i = this.defs.get(t.itemId);
				fn(l, a, s, e, t.ownerId, i, "item", r, this.scratch), X(s, t, r);
				break;
			}
		}
		this.threatened.fill(!1);
		for (let e of s.projectiles) e.target >= 0 && (this.threatened[e.target] = !0);
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
};
//#endregion
//#region src/race-manager/checkpoints.ts
function En(e, t) {
	return {
		gridSlot: e,
		nextCheckpoint: 0,
		lastCheckpoint: 0,
		prevT: t,
		lapTicks: [],
		throttleHeldSinceTick: -1,
		hazardCooldownRemaining: 0,
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
function Dn(e, t, n, r, i, a, o) {
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
function On(e, t, n, r, i, a) {
	let o = t.prevT;
	if (t.prevT = e.t, e.isGhost || e.finishTick !== void 0) return "none";
	let s = n.checkpoints.length;
	if (R(e.t - o) > q.teleportGuardSectors / s) return "none";
	let c = n.checkpoints[t.nextCheckpoint];
	return xe(o, e.t, c.t) ? Dn(e, t, n, t.nextCheckpoint, r, i, a) : "none";
}
function kn(e, t, n, r, i, a) {
	if (t.prevT = e.t, e.isGhost || e.finishTick !== void 0) return "none";
	let o = n.checkpoints.length, s = n.checkpoints[t.nextCheckpoint], c = B(e.t, s.t);
	return c > 0 && c < q.checkpointResyncSectors / o ? Dn(e, t, n, t.nextCheckpoint, r, i, a) : "none";
}
var An = 1.5;
function jn(e, t, n) {
	let r = n.checkpoints[t.lastCheckpoint], i = n.length, a = R(e.t - r.t), o = a > An / n.checkpoints.length ? a - 1 : a;
	return (e.lap - 1) * i + (R(r.t - n.startT) + o) * i;
}
//#endregion
//#region src/race-manager/countdown.ts
var Mn = Math.round(q.countdownStepSeconds * 120), Nn = q.countdownSteps * Mn;
function Pn(e, t, n, r, i, a, o) {
	for (let i = 0; i < t.length; i++) {
		let t = n[i];
		r[i].throttle > q.stuckInputMin ? t.throttleHeldSinceTick < 0 && (t.throttleHeldSinceTick = e) : t.throttleHeldSinceTick = -1;
	}
	if (e < Nn) return e % Mn === 0 && a.push({
		type: "countdown",
		stepsLeft: q.countdownSteps - e / Mn
	}), !1;
	for (let e = 0; e < t.length; e++) {
		let r = n[e].throttleHeldSinceTick;
		r >= 0 && Me(t[e], i[e], (Nn - r) / 120, o[e]);
	}
	return a.push({ type: "go" }), !0;
}
//#endregion
//#region src/race-manager/util.ts
var Fn = 1e-9;
function In(e, t) {
	let n = e - t;
	return n > Fn ? n : 0;
}
function Ln(e, t) {
	return Math.hypot(e[0] - t[0], e[2] - t[2]);
}
function Rn(e, t) {
	return Math.hypot(e[0] - t[0], e[1] - t[1], e[2] - t[2]);
}
//#endregion
//#region src/race-manager/hazards.ts
function zn(e, t, n, r, i, a, o) {
	if (t.hazardCooldownRemaining = In(t.hazardCooldownRemaining, i), e.isGhost || e.finishTick !== void 0) return;
	let s, c;
	for (let l of r) if (!(Rn(e.position, l.position) > l.radius + n.kartRadius) && !(e.status.intangibleRemaining > 0)) {
		if ((!s || !c) && (s = O(e.heading), c = k(e.heading)), l.type === "gust") {
			let t = l.push ?? [
				0,
				0,
				0
			];
			e.speed += (t[0] * s[0] + t[2] * s[2]) * i, e.lateralVelocity += (t[0] * c[0] + t[2] * c[2]) * i;
			continue;
		}
		if (!(t.hazardCooldownRemaining > 0)) {
			switch (l.hit) {
				case "spin":
					je(e, n, "hazard", o);
					break;
				case "slow":
					e.status.slowedTo = q.hazardSlowTo, e.status.slowRemaining = q.hazardSlowSeconds;
					break;
				case "bump": {
					let t = e.position[0] - l.position[0], n = e.position[2] - l.position[2], r = t * c[0] + n * c[2] >= 0 ? 1 : -1;
					e.lateralVelocity += r * q.hazardBumpLateral;
					break;
				}
			}
			t.hazardCooldownRemaining = q.hazardCooldownSeconds, a.push({
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
function Bn(e) {
	let t = {
		pickups: [],
		coins: []
	};
	return e.features.forEach((e, n) => {
		e.kind === "pickup" ? t.pickups.push(n) : e.kind === "coin" && t.coins.push(n);
	}), t;
}
function Vn(e) {
	return {
		pickupStates: e.pickups.map(() => ({ respawnRemaining: 0 })),
		coinStates: e.coins.map(() => ({ respawnRemaining: 0 }))
	};
}
function Hn(e, t, n, r, i, a, o, s) {
	for (let c = 0; c < t.length; c++) {
		let l = n[c];
		if (l.respawnRemaining = In(l.respawnRemaining, o), l.respawnRemaining > 0) continue;
		let u = r.features[t[c]];
		if (!r.branches.list[u.branch].open) continue;
		let d = u.width / 2;
		for (let t = 0; t < i.length; t++) {
			let n = i[t];
			if (!(n.isGhost || n.finishTick !== void 0 || n.branch !== u.branch) && !(Ln(n.position, u.position) > d + a[t].kartRadius)) {
				e === "coin" ? (l.respawnRemaining = q.coinRespawnSeconds, n.coins = Math.min(a[t].coinCap, n.coins + 1), s.push({
					type: "coin",
					racerId: n.racerId,
					coins: n.coins
				})) : (l.respawnRemaining = q.pickupRespawnSeconds, s.push({
					type: "pickup",
					racerId: n.racerId,
					index: c
				}));
				break;
			}
		}
	}
}
function Un(e, t, n, r, i, a, o, s) {
	Hn("pickup", e.pickups, t, r, i, a, o, s), Hn("coin", e.coins, n, r, i, a, o, s);
}
//#endregion
//#region src/race-manager/ranking.ts
function Wn(e, t, n, r) {
	let i = e[n], a = e[r], o = i.finishTick !== void 0, s = a.finishTick !== void 0;
	if (o && s) {
		let e = i.finishTick - a.finishTick;
		return e === 0 ? t[n].dnf === t[r].dnf ? i.distanceAlong === a.distanceAlong ? t[n].gridSlot - t[r].gridSlot : a.distanceAlong - i.distanceAlong : t[n].dnf ? 1 : -1 : e;
	}
	return o === s ? i.distanceAlong === a.distanceAlong ? t[n].gridSlot - t[r].gridSlot : a.distanceAlong - i.distanceAlong : o ? -1 : 1;
}
function Gn(e, t, n) {
	n.length = 0;
	for (let t = 0; t < e.length; t++) e[t].isGhost || n.push(t);
	for (let r = 1; r < n.length; r++) {
		let i = n[r], a = r - 1;
		for (; a >= 0 && Wn(e, t, n[a], i) > 0;) n[a + 1] = n[a], a--;
		n[a + 1] = i;
	}
	return n;
}
function Kn(e, t, n, r, i) {
	for (let a = 0; a < n.length; a++) {
		let o = n[a], s = e[o], c = t[o], l = a + 1;
		c.rankHeldSeconds = l === s.rank ? c.rankHeldSeconds + r : r, s.rank = l, l !== c.shownRank && (s.finishTick !== void 0 || c.rankHeldSeconds + 1e-9 >= q.rankDebounceSeconds) && (c.shownRank = l, i.push({
			type: "positionChange",
			racerId: s.racerId,
			rank: l
		}));
	}
}
//#endregion
//#region src/race-manager/wrongway.ts
var qn = {
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
function Jn(e, t) {
	let n = t.sampleInto(e.t, 0, e.branch, qn), r = O(e.heading), i = k(e.heading), a = r[0] * e.speed + i[0] * e.lateralVelocity, o = r[2] * e.speed + i[2] * e.lateralVelocity;
	return a * n.tangent[0] + o * n.tangent[2];
}
function Yn(e, t, n) {
	t.wrongWaySeconds = 0, t.wrongWayOn && (t.wrongWayOn = !1, n.push({
		type: "wrongWay",
		racerId: e.racerId,
		on: !1
	}));
}
function Xn(e, t, n, r, i) {
	if (e.isGhost || e.finishTick !== void 0) {
		Yn(e, t, i);
		return;
	}
	let a = Jn(e, n);
	a < q.wrongWaySpeed ? (t.wrongWaySeconds += r, !t.wrongWayOn && t.wrongWaySeconds + 1e-9 >= q.wrongWayHoldSeconds && (t.wrongWayOn = !0, i.push({
		type: "wrongWay",
		racerId: e.racerId,
		on: !0
	}))) : a > q.wrongWayClearSpeed && Yn(e, t, i);
}
//#endregion
//#region src/race-manager/respawn.ts
function Zn(e, t, n, r) {
	return t.stuckSeconds = (!e.isPlayer || n.throttle > q.stuckInputMin || n.brake > q.stuckInputMin) && Math.abs(e.speed) < q.stuckSpeed && e.status.spinRemaining === 0 && e.grounded && t.freezeRemaining === 0 ? t.stuckSeconds + r : 0, t.stuckSeconds + 1e-9 >= q.stuckSeconds;
}
function Qn(e, t, n) {
	let r = ye(t, e.t, e.position, e.branch).lateral, i = Math.max(0, n - x.kartRadius);
	return Number.isFinite(r) ? r < -i ? -i : r > i ? i : r : 0;
}
function $n(e, t, n, r) {
	let i = n.checkpoints[t.lastCheckpoint], a = n.sample(i.t, Qn(e, n, i.halfWidth), 0).position;
	e.position = [
		a[0],
		a[1] + q.respawnLift,
		a[2]
	], e.heading = A(i.tangent), e.t = i.t, e.branch = 0, e.speed = 0, e.lateralVelocity = 0, e.verticalVelocity = 0, e.grounded = !0, e.airborne.fromJumpId = void 0, e.airborne.trickQueued = !1, e.airborne.seconds = 0, j(e), E(e), e.status.intangibleRemaining = Math.max(e.status.intangibleRemaining, q.respawnFreezeSeconds), t.prevT = R(i.t - 1e-7), t.freezeRemaining = q.respawnFreezeSeconds, t.stuckSeconds = 0, t.respawnCount++, Yn(e, t, r), r.push({
		type: "respawn",
		racerId: e.racerId,
		checkpoint: t.lastCheckpoint
	});
}
//#endregion
//#region src/race-manager/race.ts
var er = class {
	track;
	config;
	state;
	consts;
	playerIndex;
	lastActiveHazards = [];
	order = [];
	fi;
	effective;
	kartEvents;
	finishedNow = [];
	constructor(e, t) {
		this.track = e, this.config = t;
		let n = e.spawnGrid;
		if (t.racers.length > n.length) throw Error(`${t.racers.length} racers for ${n.length} grid slots`);
		let r = t.laps ?? e.def.laps, i = Math.min(q.playerGridSlot, n.length - 1), a = t.racers.some((e) => e.isPlayer), o = [];
		for (let e = 0; e < n.length; e++) a && e === i || o.push(e);
		let s = [], c = [], l = [], u = -1;
		t.racers.forEach((e, r) => {
			let d = e.isPlayer || e.isGhost && a ? i : o.shift(), f = n[d], p = ne({
				racerId: e.racerId,
				isPlayer: e.isPlayer,
				isGhost: e.isGhost,
				position: [...f.position],
				heading: f.heading,
				t: f.t
			});
			p.lap = 1, p.bodyId = e.bodyId, p.skinId = e.skinId, e.isPlayer && (u = r), s.push(p), c.push(En(d, f.t)), l.push(S(e.archetype, t.speedClass));
		}), this.playerIndex = u, this.consts = l, this.fi = Bn(e);
		let d = Vn(this.fi);
		this.state = {
			mode: t.mode,
			trackId: t.trackId,
			speedClass: t.speedClass,
			mirrored: t.mirrored ?? !1,
			seed: t.seed,
			tick: 0,
			goTick: Nn,
			time: -Nn * M,
			phase: "countdown",
			lapsTotal: r,
			finalLapShiftFired: !1,
			knockout: t.knockout ? {
				setId: t.knockout.setId,
				segment: t.knockout.segment,
				cutLineAt: r,
				eliminated: [...t.knockout.eliminated]
			} : void 0,
			pickupStates: d.pickupStates,
			coinStates: d.coinStates,
			karts: s,
			trackers: c,
			inputLog: [],
			playerFinishTick: -1,
			leaderLap: 1
		}, this.effective = s.map(() => D), this.kartEvents = s.map(() => []);
		for (let t = 0; t < s.length; t++) s[t].distanceAlong = jn(s[t], c[t], e);
		Gn(s, c, this.order), this.order.forEach((e, t) => {
			s[e].rank = t + 1, c[e].shownRank = t + 1;
		});
	}
	get dt() {
		return M;
	}
	step(e) {
		let t = this.state, { karts: n, trackers: r } = t, i = this.track, a = t.tick, o = M, s = [];
		t.time = (a - t.goTick) * o, this.lastActiveHazards = i.activeHazards(t.time);
		let c = this.kartEvents;
		for (let e of c) e.length = 0;
		let l = !1;
		if (t.phase === "countdown") {
			l = Pn(a, n, r, e, this.consts, s, c);
			for (let e = 0; e < n.length; e++) this.effective[e] = D;
		} else for (let t = 0; t < n.length; t++) {
			let i = n[t], a = r[t];
			this.effective[t] = !i.isGhost && a.freezeRemaining > 0 ? D : e[t];
		}
		this.playerIndex >= 0 && t.inputLog.push({ ...e[this.playerIndex] });
		let u = Ae(n, this.effective, i, this.consts, o);
		for (let e = 0; e < n.length; e++) {
			let t = u[e], n = c[e];
			for (let e = 0; e < t.length; e++) n.push(t[e]);
		}
		if (l && (t.phase = "racing", s.push({
			type: "phase",
			phase: "racing"
		}), t.lapsTotal === 1 && this.fireShift(a, s)), t.phase === "racing" || t.phase === "finalLap") {
			let l = this.finishedNow;
			l.length = 0;
			for (let u = 0; u < n.length; u++) {
				let d = n[u], f = r[u], p = this.consts[u];
				f.freezeRemaining = In(f.freezeRemaining, o);
				let m = !1, h = c[u];
				for (let e = h.length - 1; e >= 0; e--) h[e].type === "respawn" && (m = !0, h.splice(e, 1));
				m || On(d, f, i, t.lapsTotal, a, s) === "finish" && (l.push(u), d.isPlayer && (t.playerFinishTick = a)), Xn(d, f, i, o, s), !m && !d.isGhost && d.finishTick === void 0 && Zn(d, f, e[u], o) && (m = !0), m && $n(d, f, i, s), zn(d, f, p, this.lastActiveHazards, o, s, c[u]);
			}
			Un(this.fi, t.pickupStates, t.coinStates, i, n, this.consts, o, s);
			for (let e = 0; e < n.length; e++) n[e].distanceAlong = jn(n[e], r[e], i);
			Gn(n, r, this.order), Kn(n, r, this.order, o, s);
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
			let f = t.playerFinishTick >= 0 && a - t.playerFinishTick >= Math.round(q.finishGraceSeconds / o);
			if (d || f) {
				for (let e of this.order) {
					let t = n[e];
					t.finishTick === void 0 && (t.finishTick = a, r[e].dnf = !0);
				}
				Gn(n, r, this.order), this.order.forEach((e, t) => {
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
		t.tick = a + 1;
		let d = [];
		for (let e = 0; e < n.length; e++) for (let t of c[e]) d.push({
			type: "kart",
			racerId: n[e].racerId,
			event: t
		});
		for (let e = 0; e < s.length; e++) d.push(s[e]);
		return d;
	}
	fireShift(e, t) {
		let n = this.state;
		if (n.finalLapShiftFired) return;
		n.finalLapShiftFired = !0;
		let r = this.track.applyFinalLapShift(n.karts);
		r && t.push({
			type: "trackChanged",
			event: r
		});
		for (let r = 0; r < n.karts.length; r++) kn(n.karts[r], n.trackers[r], this.track, n.lapsTotal, e, t), n.karts[r].distanceAlong = jn(n.karts[r], n.trackers[r], this.track);
		n.phase = "finalLap", t.push({
			type: "phase",
			phase: "finalLap"
		});
	}
	results() {
		let e = this.state, t = this.order.map((t) => {
			let n = e.karts[t], r = e.trackers[t], i = n.finishTick ?? -1, a = r.lapTicks.map((t, n) => tr(t - (n === 0 ? e.goTick : r.lapTicks[n - 1])));
			return {
				racerId: n.racerId,
				rank: n.rank,
				finishTick: i,
				timeMs: i < 0 ? -1 : tr(i - e.goTick),
				lapTimesMs: a,
				dnf: i < 0 || r.dnf
			};
		});
		return {
			mode: e.mode,
			trackId: e.trackId,
			speedClass: e.speedClass,
			seed: e.seed,
			goTick: e.goTick,
			ranks: t
		};
	}
};
function tr(e) {
	return Math.round(e * 1e3 * M);
}
//#endregion
//#region src/track-builder/features.ts
function nr(e, t) {
	if (!t) return 0;
	let n = e.byId(t);
	if (!n) throw Error(`feature names unknown shortcut "${t}"`);
	return n.index;
}
function rr(e, t, n, r, i, a) {
	let o = nr(e, r.shortcut), s = r.lateral ?? 0, c = r.t, l = e.sample(c, s, o);
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
function ir(e, t) {
	let n = [];
	return (e.pickups ?? []).forEach((e, r) => n.push(rr(t, "pickup", `pickup-${r}`, e, P.balloonRadius * 2, 0))), (e.coins ?? []).forEach((e, r) => n.push(rr(t, "coin", `coin-${r}`, e, P.coinRadius * 2, 0))), (e.boostPads ?? []).forEach((e, r) => n.push(rr(t, "boostPad", `pad-${r}`, e, e.width ?? P.boostPadWidth, 0))), (e.jumps ?? []).forEach((e) => n.push(ar(t, e))), n;
}
function ar(e, t) {
	return rr(e, "jump", t.id, t, t.width ?? P.boostPadWidth, t.launch);
}
function or(e, t, n, r) {
	let i = e.sample(t, 0, n), a = i.tangent[2], o = -i.tangent[0], s = Math.hypot(a, o) || 1;
	return ((r[0] - i.position[0]) * a + (r[2] - i.position[2]) * o) / s;
}
function sr(e, t) {
	for (let n of e) {
		let e = t.list[n.branch] ?? t.main;
		n.t = e.nearestGlobal(n.position).t, n.lateral = or(t, n.t, e.index, n.position);
	}
}
function cr(e) {
	return e.filter((e) => e.kind === "jump").map((e) => ({
		id: e.id,
		t: e.t,
		launch: e.launch,
		branch: e.branch
	}));
}
function lr(e) {
	return e.filter((e) => e.kind === "boostPad").map((e) => ({
		t: e.t,
		lateral: e.lateral,
		halfWidth: e.width / 2,
		branch: e.branch
	}));
}
//#endregion
//#region src/track-builder/hazards.ts
var ur = class {
	items = [];
	branches;
	constructor(e, t) {
		this.branches = t, e.forEach((e, n) => {
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
		return this.items.map((e) => e.id);
	}
	setEnabled(e, t) {
		let n = this.items.find((t) => t.id === e);
		n && (n.enabled = t);
	}
	isEnabled(e) {
		return this.items.find((t) => t.id === e)?.enabled ?? !1;
	}
	rederive() {
		for (let e of this.items) e.t = this.branches.main.nearestGlobal(e.position).t, e.lateral = or(this.branches, e.t, 0, e.position);
	}
	activeHazards(e) {
		let t = [], n = this.branches.main, r = n.lut.length, i = P.hazardRadius;
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
					let e = n.sample(a.t, 0).halfWidth, r = Math.max(0, e - i) * Math.sin(2 * Math.PI * l / c);
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
					l < P.fallingActiveSeconds && t.push({
						id: a.id,
						type: o.type,
						position: a.position,
						radius: i,
						hit: s
					});
					break;
				case "gust": if (l < c / 2) {
					let e = n.sample(a.t, 0), r = e.tangent[2], i = -e.tangent[0], s = Math.hypot(r, i) || 1, c = a.lateral > 0 ? -1 : 1, l = (o.speed ?? 0) * c;
					t.push({
						id: a.id,
						type: o.type,
						position: e.position,
						radius: P.gustWindow / 2,
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
		return t;
	}
};
//#endregion
//#region src/track-builder/minimap.ts
function dr(e) {
	let t = P.minimapSamples, n = P.minimapPadding, r = [], i = Infinity, a = -Infinity, o = Infinity, s = -Infinity;
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
function fr(e, t, n) {
	let r = [];
	for (let i = 0; i < n; i++) {
		let a = R(t + i / n), o = e.sample(a, 0);
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
function pr(e, t, n) {
	let r = [], { rows: i, columns: a, spacing: o } = n;
	for (let n = 0; n < i; n++) {
		let i = R(t - (n + 1) * o / e.length), s = e.sample(i, 0).halfWidth, c = Math.max(0, Math.min(.5 * s, s - Fe)), l = a > 1 ? 2 * c / (a - 1) : 0, u = n % 2 == 1 ? l / 4 : 0;
		for (let t = 0; t < a; t++) {
			let o = a > 1 ? -c + u + t * (2 * (c - u)) / (a - 1) : n % 2 == 1 ? c / 2 : -c / 2, s = e.sample(i, o);
			r.push({
				index: n * a + t,
				t: i,
				lateral: o,
				position: s.position,
				heading: A(s.tangent)
			});
		}
	}
	return r;
}
//#endregion
//#region src/track-builder/shift.ts
var mr = (e, t, n) => R(e - t) <= R(n - t);
function hr(e, t, n) {
	let r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of n) {
		let n = [];
		for (let r = 0; r < e.length; r++) mr(t[r], a.fromT, a.toT) && n.push(r);
		let o;
		if (n.length) {
			n.sort((e, n) => R(t[e] - a.fromT) - R(t[n] - a.fromT)), o = n[0];
			for (let e of n) r.add(e);
		} else {
			o = 0;
			let n = Infinity;
			for (let r = 0; r < e.length; r++) {
				let e = R(t[r] - a.toT);
				e < n && (n = e, o = r);
			}
		}
		i.set(o, [...i.get(o) ?? [], ...a.controlPoints]);
	}
	let a = [];
	for (let t = 0; t < e.length; t++) {
		let n = i.get(t);
		n && a.push(...n.map((e) => ({ ...e }))), r.has(t) || a.push({ ...e[t] });
	}
	return a;
}
function gr(e, t = []) {
	if (e.shifted) return;
	e.shifted = !0;
	let n = e.def.finalLapShift, r = e.branches, i = r.main, a = [], o = n.routeOverrides ?? [];
	if (o.length) {
		let n = t.map((e) => e.branch > 0 && r.list[e.branch] ? r.list[e.branch].toLocal(e.t) : 0), s = e.controlPoints.map((e) => i.lut.nearestTGlobal([
			e.x,
			e.y,
			e.z
		]));
		e.controlPoints = hr(e.controlPoints, s, o), i.lut = z(e.controlPoints);
		for (let e of o) a.push([e.fromT, e.toT]);
		for (let e of r.list) e.isMain || (e.entryT = i.lut.nearestTGlobal(e.entryPoint), e.exitT = i.lut.nearestTGlobal(e.exitPoint), e.span = R(e.exitT - e.entryT));
		e.startT = i.lut.nearestTGlobal(e.startPoint), t.forEach((e, t) => {
			let a = r.list[e.branch];
			e.branch > 0 && a ? e.t = a.toMain(n[t]) : (e.t = i.lut.nearestTGlobal(e.position), e.branch = 0);
		}), sr(e.features, r), e.hazards.rederive();
	}
	for (let e of n.surfaceOverrides ?? []) {
		let t = Be(e.surface), n = i.lut;
		for (let r = 0; r < n.n; r++) mr(r / n.n, e.fromT, e.toT) && (n.surface[r] = t);
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
	for (let t of n.addsJumps ?? []) e.features.push(ar(r, t));
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
		changedRanges: a.map(([e, t]) => [R(e), R(t)])
	};
	return e.emit(c), c;
}
//#endregion
//#region src/track-builder/validate.ts
var _r = v.properties.base.properties.topSpeed.default, vr = .8, yr = 2, br = 5;
function xr(e) {
	return [
		e.x,
		e.y,
		e.z,
		e.halfWidth,
		e.bank ?? 0
	].some((e) => !Number.isFinite(e));
}
function Sr(e, t, n, r) {
	if (e.length < r) return n.push(`${t}: needs at least ${r} control points, has ${e.length}`), !1;
	for (let r = 0; r < e.length; r++) {
		if (xr(e[r])) return n.push(`${t}: control point ${r} has a NaN or infinite value`), !1;
		Math.abs(e[r].bank ?? 0) > P.maxBankDeg && n.push(`${t}: control point ${r} bank ${e[r].bank}° exceeds ${P.maxBankDeg}°`);
	}
	return !0;
}
function Cr(e, t) {
	let n = e.idx(t + 1), r = e.idx(t - 1), i = e.tx[n] - e.tx[r], a = e.ty[n] - e.ty[r], o = e.tz[n] - e.tz[r], s = e.length / e.step, c = Math.hypot(i, a, o) / (2 * s);
	return c > 0 ? 1 / c : Infinity;
}
function wr(e) {
	let t = [], n = [], r = e.controlPoints;
	if (Sr(r, "controlPoints", t, 8)) {
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
	let a = z(r), o = R(e.startGrid.t), s = a.sample(o, 0).halfWidth;
	s < P.minStartHalfWidth && t.push(`start line halfWidth ${s.toFixed(2)} < ${P.minStartHalfWidth}`);
	let c = Infinity, l = 0;
	for (let e = 0; e < a.n; e++) {
		let t = Cr(a, e) / a.hw[e];
		t < c && (c = t, l = e / a.n);
	}
	c < P.minTurnRadiusFactor && t.push(`hairpin at t=${l.toFixed(3)}: turn radius is ${c.toFixed(2)} × halfWidth, minimum ${P.minTurnRadiusFactor}`);
	let u = a.minY, d = /* @__PURE__ */ new Set();
	for (let n of e.shortcuts ?? []) {
		let e = `shortcut "${n.id}"`;
		d.has(n.id) && t.push(`${e}: duplicate id`), d.add(n.id);
		let r = R(n.exitT - n.entryT);
		if ((r <= 0 || r > .5) && t.push(`${e}: exitT must follow entryT by less than half a lap (span ${r.toFixed(3)})`), !Sr(n.controlPoints, e, t, 2)) continue;
		let i = a.sample(n.entryT, 0).position, o = a.sample(n.exitT, 0).position, s = n.controlPoints[0], c = n.controlPoints[n.controlPoints.length - 1], l = Math.hypot(s.x - i[0], s.y - i[1], s.z - i[2]), f = Math.hypot(c.x - o[0], c.y - o[1], c.z - o[2]);
		l > yr && t.push(`${e}: first point is ${l.toFixed(2)} m from the main line at entryT (max ${yr})`), f > yr && t.push(`${e}: last point is ${f.toFixed(2)} m from the main line at exitT (max ${yr})`);
		let p = z(n.controlPoints, {
			closed: !1,
			samples: 256,
			divisions: 512
		});
		p.minY < u && (u = p.minY);
	}
	e.voidY > u - br && t.push(`voidY ${e.voidY} must be at least ${br} m below the lowest road sample (${u.toFixed(2)})`);
	let f = (e) => e >= 0 && e <= 1, p = (e, n) => {
		(n ?? []).forEach((n, r) => {
			f(n.t) || t.push(`${e} ${r}: t ${n.t} outside 0..1`), n.shortcut && !d.has(n.shortcut) && t.push(`${e} ${r}: unknown shortcut "${n.shortcut}"`);
		});
	};
	p("pickup", e.pickups), p("coin", e.coins), p("boostPad", e.boostPads), p("jump", e.jumps), (e.hazards ?? []).forEach((e, n) => {
		f(e.t) || t.push(`hazard ${n}: t ${e.t} outside 0..1`);
	});
	let m = e.finalLapShift, h = new Set((e.hazards ?? []).map((e, t) => e.id ?? `hazard-${t}`));
	for (let e of [...m.closesShortcuts ?? [], ...m.opensShortcuts ?? []]) d.has(e) || t.push(`finalLapShift names unknown shortcut "${e}"`);
	for (let e of [...m.enablesHazards ?? [], ...m.disablesHazards ?? []]) h.has(e) || t.push(`finalLapShift names unknown hazard "${e}"`);
	for (let e of m.routeOverrides ?? []) (!f(e.fromT) || !f(e.toT)) && t.push("routeOverride: fromT/toT outside 0..1"), Sr(e.controlPoints, "routeOverride", t, 1);
	p("addsJump", m.addsJumps);
	let g = a.length / (vr * _r), [_, v] = P.lapTimeWarn;
	return (g < _ || g > v) && n.push(`estimated lap ${g.toFixed(1)} s (length ${a.length.toFixed(0)} m) is outside ${_}–${v} s; design target is 45–60 s`), {
		ok: t.length === 0,
		errors: t,
		warnings: n
	};
}
function Tr(e) {
	let t = wr(e);
	if (!t.ok) throw Error(`track "${e.id}" is invalid:\n  ${t.errors.join("\n  ")}`);
}
//#endregion
//#region src/track-builder/track.ts
var Er = class {
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
	boostPads = [];
	shifted = !1;
	listeners = [];
	constructor(e) {
		this.def = e, this.voidY = e.voidY, this.controlPoints = e.controlPoints.map((e) => ({ ...e }));
		let t = z(this.controlPoints), n = [new We(0, "main", t, 0, 1, [])];
		(e.shortcuts ?? []).forEach((e, r) => n.push(Ke(r + 1, e, t))), this.branches = new qe(n), this.startT = R(e.startGrid.t), this.startPoint = t.sample(this.startT, 0).position, this.features = ir(e, this.branches), this.hazards = new ur(e.hazards ?? [], this.branches), this.branches.setLap(1), this.rebuildDerived();
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
		this.branches.setLap(e), this.minimap = dr(this.branches);
	}
	activeHazards(e) {
		return this.hazards.activeHazards(e);
	}
	applyFinalLapShift(e = []) {
		return gr(this, e);
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
		this.checkpoints = fr(e, this.startT, this.def.checkpointCount), this.spawnGrid = pr(e, this.startT, this.def.startGrid), this.minimap = dr(this.branches), this.jumps = cr(this.features), this.boostPads = lr(this.features);
	}
};
function Dr(e, t = {}) {
	return (t.validate ?? !0) && Tr(e), new Er(e);
}
//#endregion
//#region src/backend-leaderboard/inputlog.ts
var Or = 127, kr = (e, t, n) => Math.round(Math.min(n, Math.max(t, e)) * Or) / Or + 0;
function Ar(e, t) {
	return t.steer = kr(e.steer, -1, 1), t.throttle = kr(e.throttle, 0, 1), t.brake = kr(e.brake, 0, 1), t.drift = e.drift, t.item = e.item, t.lookBack = e.lookBack, t.horn = e.horn, t;
}
function jr(e, t) {
	let n = e[t] > 127 ? e[t] - 256 : e[t], r = e[t + 3];
	return {
		steer: n / Or + 0,
		throttle: e[t + 1] / Or,
		brake: e[t + 2] / Or,
		drift: (r & 1) > 0,
		item: (r & 2) > 0,
		lookBack: (r & 4) > 0,
		horn: (r & 8) > 0
	};
}
function Mr(e) {
	let t = atob(e), n = new Uint8Array(t.length);
	for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
	return n;
}
function Nr(e, t = 72e3) {
	let n = Mr(e);
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
		let o = jr(n, i);
		i += 4;
		for (let t = 0; t < e; t++) r.push(o);
	}
	return r;
}
//#endregion
//#region src/game/simtick.ts
function Pr(e, t) {
	let { manager: n, ai: r, items: i, inputs: a, playerIndex: o } = e;
	r.fill(n.state, n.lastActiveHazards, a), o >= 0 && t && n.state.karts[o].finishTick === void 0 && (a[o] = Ar(t, e.playerSlot));
	let s = n.step(a), c = i.step(a, s, M);
	for (let e = 0; e < a.length; e++) r.threatened[e] = i.threatened[e];
	return {
		race: s,
		items: c
	};
}
//#endregion
//#region src/backend-leaderboard/verify.ts
function Fr(e, t, n, r, i) {
	let a = f(t, e.id, n, r), o = Dr(e), s = new er(o, a), c = new Tn(o, s), l = {
		manager: s,
		items: c,
		ai: new Ht(o, a, s.state, { itemRoles: c.roles }),
		inputs: s.state.karts.map(() => ({ ...D })),
		playerIndex: 0,
		playerSlot: { ...D }
	}, u = 0;
	for (; u < i.length && s.state.phase !== "finished"; u++) Pr(l, i[u]);
	let d = s.results().ranks[0], p = d !== void 0 && !d.dnf && d.finishTick >= 0;
	return {
		finished: p,
		timeMs: p ? d.timeMs : -1,
		lapTimesMs: p ? d.lapTimesMs : [],
		ticks: u
	};
}
var Ir = 1e3;
function Lr(e, t, n, r, i, a) {
	let o;
	try {
		o = Nr(i);
	} catch (e) {
		return {
			ok: !1,
			reason: `bad input log: ${e.message}`
		};
	}
	let s = Fr(e, t, n, r, o);
	return s.finished ? Math.abs(s.timeMs - a) > 1e3 ? {
		ok: !1,
		reason: `claimed ${a} ms but the replay finished in ${s.timeMs} ms`
	} : {
		ok: !0,
		timeMs: s.timeMs,
		lapTimesMs: s.lapTimesMs
	} : {
		ok: !1,
		reason: "the replay never reached the finish line"
	};
}
var Rr = Object.freeze(Object.fromEntries(Object.values(/* @__PURE__ */ Object.assign({
	"../track-builder/tracks/boardwalk-nights.json": e,
	"../track-builder/tracks/canyon-rush.json": t,
	"../track-builder/tracks/frostbite-pass.json": n,
	"../track-builder/tracks/harbour-loop.json": r,
	"../track-builder/tracks/meadow-run.json": i,
	"../track-builder/tracks/skyline-circuit.json": a
})).map((e) => [e.id, e]))), zr = Object.freeze(Object.keys(Rr).sort());
//#endregion
export { Ir as CLAIM_TOLERANCE_MS, s as CLIENT_VERSION, c as MAX_LOG_BYTES, Rr as TRACKS, zr as TRACK_IDS, g as checkSubmission, l as dailySeed, Lr as verifyRun };
