/**
 * scene-utils.js
 * Shared utilities for Three.js scenes
 */

/**
 * Load an external script by URL, resolving when loaded.
 * Safe to call multiple times with the same URL.
 */
export function loadScript(src) {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
		const s = document.createElement('script');
		s.src = src;
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild(s);
	});
}

/**
 * Load KaTeX (CSS + JS) from CDN.
 */
export async function loadKatex() {
	if (!document.querySelector('link[href*="katex"]')) {
		const css = document.createElement('link');
		css.rel = 'stylesheet';
		css.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
		document.head.appendChild(css);
	}
	await loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js');
}

/**
 * Add an axis label sprite to a Three.js scene.
 * @param {object} THREE
 * @param {object} scene
 * @param {string} text
 * @param {object} position - THREE.Vector3
 * @param {string} color - CSS color string
 */
export function addAxisLabel(THREE, scene, text, position, color) {
	const canvas = document.createElement('canvas');
	canvas.width = 64;
	canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = color;
	ctx.font = 'bold 48px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, 32, 32);
	const texture = new THREE.CanvasTexture(canvas);
	const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
	sprite.position.copy(position);
	sprite.scale.set(0.4, 0.4, 1);
	scene.add(sprite);
}

/**
 * Add a standard XYZ axes helper with labels.
 * @param {object} THREE
 * @param {object} scene
 * @param {number} size - axis length
 */
export function addAxesWithLabels(THREE, scene, size = 2) {
	scene.add(new THREE.AxesHelper(size));
	addAxisLabel(THREE, scene, 'X', new THREE.Vector3(size + 0.3, 0, 0), '#ff4444');
	addAxisLabel(THREE, scene, 'Y', new THREE.Vector3(0, size + 0.3, 0), '#44ff44');
	addAxisLabel(THREE, scene, 'Z', new THREE.Vector3(0, 0, size + 0.3), '#4488ff');
}

/**
 * Add a canvas-rendered vector label sprite.
 * Renders an italic letter with an optional arrow (vec) and subscript.
 * @param {object} THREE
 * @param {object} scene
 * @param {object} opts
 * @param {string} opts.main - main character e.g. 'v'
 * @param {string} [opts.sub] - subscript text e.g. 'view'
 * @param {boolean} [opts.vec] - draw arrow over main character
 * @param {boolean} [opts.bold] - bold main character
 * @param {object} opts.position - THREE.Vector3
 * @param {number} [opts.width=120]
 * @param {number} [opts.height=38]
 * @param {number} [opts.scale=0.5]
 */
export function addVectorLabel(THREE, scene, opts) {
	const {
		main,
		sub = '',
		vec = false,
		bold = false,
		position,
		width = 120,
		height = 38,
		scale = 0.5,
	} = opts;

	const canvas = document.createElement('canvas');
	const dpr = 2;
	canvas.width = width * dpr;
	canvas.height = height * dpr;
	const ctx = canvas.getContext('2d');
	ctx.scale(dpr, dpr);

	// Background pill
	ctx.fillStyle = 'rgba(27, 58, 75, 0.9)';
	ctx.beginPath();
	ctx.roundRect(0, 0, width, height, 8);
	ctx.fill();

	ctx.fillStyle = '#E8F4F8';
	ctx.textBaseline = 'middle';

	const cx = width / 2;
	const cy = height / 2;
	const mainSize = 15;
	const subSize = 10;

	ctx.font = `${bold ? 'bold ' : ''}italic ${mainSize}px serif`;
	const mainW = ctx.measureText(main).width;
	ctx.font = `italic ${subSize}px serif`;
	const subW = sub ? ctx.measureText(sub).width : 0;
	const totalW = mainW + (sub ? subW + 2 : 0);
	const startX = cx - totalW / 2;

	// Main character
	ctx.font = `${bold ? 'bold ' : ''}italic ${mainSize}px serif`;
	ctx.fillText(main, startX, cy);

	// Arrow over main if vec
	if (vec) {
		const arrowY = cy - 11;
		const arrowCx = startX + mainW / 2;
		ctx.strokeStyle = '#E8F4F8';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(arrowCx - mainW * 0.35, arrowY);
		ctx.lineTo(arrowCx + mainW * 0.35, arrowY);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(arrowCx + mainW * 0.35, arrowY);
		ctx.lineTo(arrowCx + mainW * 0.35 - 3, arrowY - 2);
		ctx.moveTo(arrowCx + mainW * 0.35, arrowY);
		ctx.lineTo(arrowCx + mainW * 0.35 - 3, arrowY + 2);
		ctx.stroke();
	}

	// Subscript
	if (sub) {
		ctx.font = `italic ${subSize}px serif`;
		ctx.fillText(sub, startX + mainW + 2, cy + 5);
	}

	const texture = new THREE.CanvasTexture(canvas);
	const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
	const sprite = new THREE.Sprite(mat);
	sprite.position.copy(position);
	sprite.scale.set((width / height) * scale, scale, 1);
	scene.add(sprite);
	return sprite;
}

/**
 * Extract vertices and faces from a Three.js BufferGeometry.
 * Returns flat arrays: vertices as [x,y,z,...], faces as [a,b,c,...].
 * @param {object} geometry - THREE.BufferGeometry
 * @returns {{ vertices: number[], faces: number[] }}
 */
export function extractGeometryData(geometry) {
	const position = geometry.attributes.position;
	const index = geometry.index;

	const vertices = [];
	for (let i = 0; i < position.count; i++) {
		vertices.push(position.getX(i), position.getY(i), position.getZ(i));
	}

	const faces = [];
	if (index) {
		for (let i = 0; i < index.count; i += 3) {
			faces.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
		}
	} else {
		for (let i = 0; i < position.count; i += 3) {
			faces.push(i, i + 1, i + 2);
		}
	}

	return { vertices, faces };
}

/**
 * Smooth camera animation between two spherical positions.
 * Returns an object you update each frame.
 * @param {object} spherical - { theta, phi, radius } — mutated in place
 * @param {function} updateCamera - called after each spherical update
 * @returns {{ animateTo: function, tick: function }}
 */
export function createCameraAnimator(spherical, updateCamera) {
	let animating = false;
	let start = null;
	let from = null;
	let to = null;
	const duration = 800;

	function easeInOut(t) {
		return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	}

	return {
		animateTo(target) {
			from = { ...spherical };
			to = { ...target };
			animating = true;
			start = performance.now();
		},
		tick(now) {
			if (!animating) return;
			const t = Math.min((now - start) / duration, 1);
			const e = easeInOut(t);
			spherical.theta  = from.theta  + (to.theta  - from.theta)  * e;
			spherical.phi    = from.phi    + (to.phi    - from.phi)    * e;
			spherical.radius = from.radius + (to.radius - from.radius) * e;
			updateCamera();
			if (t >= 1) {
				Object.assign(spherical, to);
				animating = false;
			}
		},
		isAnimating() { return animating; },
	};
}

/**
 * Create a styled UI button matching the site palette.
 * @param {string} label
 * @param {function} onClick
 * @returns {HTMLButtonElement}
 */
export function makeButton(label, onClick) {
	const btn = document.createElement('button');
	btn.textContent = label;
	btn.style.cssText = `
		padding: 6px 14px;
		background: rgba(27,58,75,0.9);
		color: #E8F4F8;
		border: 1px solid #C8DDE6;
		border-radius: 6px;
		font-size: 13px;
		font-family: 'DM Sans', sans-serif;
		cursor: pointer;
		transition: background 0.2s;
	`;
	btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(242,166,90,0.85)');
	btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(27,58,75,0.9)');
	btn.addEventListener('click', onClick);
	return btn;
}

/**
 * Create a standard scene UI container positioned top-left.
 * @returns {HTMLDivElement}
 */
export function makeUIContainer() {
	const ui = document.createElement('div');
	ui.style.cssText = `
		position: absolute; top: 12px; left: 12px;
		display: flex; align-items: center; gap: 10px;
		z-index: 10; flex-wrap: wrap;
		font-family: 'DM Sans', sans-serif;
	`;
	return ui;
}