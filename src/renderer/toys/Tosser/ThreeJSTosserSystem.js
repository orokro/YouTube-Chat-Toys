/*
	ThreeJSTosserSystem.js
	----------------------

	This class handles the Three.js rendering system for the Tosser toy.
	It creates a WebGL renderer, a scene, and a camera, and handles the
	rendering loop.
*/

// three js
import {
	Scene,
	OrthographicCamera,
	WebGLRenderer,
	AmbientLight,
	DirectionalLight,
	Vector3,
	Vector2,
	Sprite,
	SpriteMaterial,
	Clock,
	BoxGeometry,
	MeshBasicMaterial,
	Mesh,
	AudioListener,
	Audio,
	AudioLoader,
	Object3D,
	Color,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { int } from 'three/src/nodes/TSL.js';
import { watch, unref } from 'vue';


/**
 * Main class to manager the tosser system state for the Tosser toy.
 */
export class ThreeJSTosserSystem {

	/**
	 * Constructor for the ThreeJSTosserSystem class.
	 * 
	 * @param {Ref} canvasContainerRef - the canvas container reference
	 * @param {shallowRef} modelsAvailableRef - vue ref that is a list of available 3d modesl
	 * @param {shallowRef} colliderBoxRef - vue ref of the collider box like {x, y, width, height}
	 */
	constructor(canvasContainerRef, modelsAvailableRef, colliderBoxRef) {

		// save our refs
		this.containerRef = canvasContainerRef;
		this.modelsRef = modelsAvailableRef;
		this.colliderRef = colliderBoxRef;

		// we'll store our spawned (tossed) items here
		this.tossedItems = [];

		// map of all the loaded modals and unique audio sources
		this.allModels = new Map();
		this.audioSources = new Map();

		// useful for timekeeping
		this.clock = new Clock();
		
		// build our ThreeJS scene (lights, camera, etc)
		this.buildScene();

		// set up the state things we'll need to monitor
		// (ie. container resize, list of models, etc)
		this.subscribeWatches();

		// load our models initially once on start
		this.loadModels();

		// kick off the recursive (on animation frame) render loop
		this.renderLoop();
	}


	/**
	 * Sets up all the watchers we need to monitor
	 */
	subscribeWatches(){

		// set up a resize observer for the container element
		// so we can update the canvas size when it changes
		this.resizeObserver = new ResizeObserver(() => this.onResize());
		this.resizeObserver.observe(this.containerRef.value);
		this.onResize();

		// watch our list of available models - if the user adds or removes
		// models, we need to load them locally
		watch(this.modelsRef, () => this.loadModels());

		// watch our collider box - if it changes, we need to update the debug collider
		watch(this.colliderRef, () => this.updateDebug(), { deep: true });
	}


	/**
	 * Sets up all the ThreeJS scene stuff (e.g. camera, lights, renderer, etc.)
	 */
	buildScene(){

		// make our loaders
		this.loader = new GLTFLoader();
		this.audioLoader = new AudioLoader();

		// build the scene
		this.scene = new Scene();
		
		// set up camera & audio listener
		this.listener = new AudioListener();
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
		this.camera.position.z = 100;

		// add to scene
		this.scene.add(this.camera);

		// make a renderer & append it to the container element passed in
		this.renderer = new WebGLRenderer({ alpha: true, antialias: true });
		this.containerRef.value.appendChild(this.renderer.domElement);

		// set up some basic lighting
		this.scene.add(new AmbientLight(0xffffff, 0.5));
		const dirLight = new DirectionalLight(0xffffff, 1);
		dirLight.position.set(5, 10, 7.5);
		this.scene.add(dirLight);

		// for debug, show the collider
		this.debugCollider = null;
		// this.setupDebug();
	}
	

	/**
	 * Add a wireframe box to the scene to show the collider area
	 */
	setupDebug() {
		const mat = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
		const geo = new BoxGeometry(1, 1, 1);
		this.debugCollider = new Mesh(geo, mat);
		this.scene.add(this.debugCollider);
	}


	/**
	 * When the canvas container resizes, we need to update the camera and renderer
	 */
	onResize() {

		// measure the container our renderer's canvas is mounted in
		const el = this.containerRef.value;
		const w = el.clientWidth;
		const h = el.clientHeight;

		// reset renderer & camera
		this.renderer.setSize(w, h);
		this.camera.left = -w / 2;
		this.camera.right = w / 2;
		this.camera.top = h / 2;
		this.camera.bottom = -h / 2;
		this.camera.updateProjectionMatrix();
		this.canvasWidth = w;
		this.canvasHeight = h;
		this.updateDebug();
	}


	/**
	 * Update the collider boxes screen position and size based on the vue ref
	 */
	updateDebug() {

		// if we don't have a debug collider, bail
		if(!this.debugCollider)
			return;

		const box = unref(this.colliderRef);
		const width = box.width * 0.75;
		const x = box.x + (box.width - width) / 2;
		const y = box.y;
		const centerX = x + width / 2 - this.canvasWidth / 2;
		const centerY = this.canvasHeight / 2 - (y + box.height / 2);
		this.debugCollider.position.set(centerX, centerY, 0);
		this.debugCollider.scale.set(width, box.height, 1);
	}


	/**
	 * For debug, loads one of our models on the screen
	 * 
	 * @param {String} slug - the slug of the model to debug
	 * @param {Number} x - x position of the model
	 * @param {Number} y - y position of the model
	 * @param {Number} scale - the x/y/z scale of the model
	 */
	doDebugModel(slug, x, y, scale){

		// get the model with ths slug
		const def = this.allModels.get(slug);
		if (!def)
			return;

		// clone it's object
		window.dolly = def.object.clone();

		// add to scene & set the position
		this.scene.add(dolly);
		dolly.position.set(x, y, 0);
		dolly.scale.set(scale, scale, scale)
	}


	/**
	 * Loop over the list of models we got in our reactive vue ref & load ones we
	 * haven't loaded yet
	 */
	loadModels() {

		// get raw list of models from the vue ref
		const items = unref(this.modelsRef);

		// loop over the list of models and load them if we haven't already
		for (const item of items) {

			// if our map already has an item with this slug, skip it
			if (this.allModels.has(item.slug))
				continue;
				
			// load the model
			this.loader.load(item.modelPath, (gltf) => {
				const obj = gltf.scene;
				obj.scale.set(item.scale*70, item.scale*70, item.scale*70);
				this.allModels.set(item.slug, {
					item,
					object: obj,
					soundPath: item.soundPath,
				});
			});

			// if we found a new audio source, load it
			if (!this.audioSources.has(item.soundPath)) {
				const audio = new Audio(this.listener);
				this.audioLoader.load(item.soundPath, (buffer) => {
					audio.setBuffer(buffer);
				});
				this.audioSources.set(item.soundPath, audio);
			}
			
		}// next item
	}


	/**
	 * Tosses a 3d model into the scene
	 * 
	 * @param {String} slug - the slug of the item to toss
	 * @returns 
	 */
	tossItem(slug) {

		// gtfo if we don't have a model w/ this slug
		const def = this.allModels.get(slug);
		if (!def)
			return;

		const box = unref(this.colliderRef);
		const width = box.width * 0.75;
		const x = box.x + (box.width - width) / 2;
		const y = box.y;
		const centerX = x + width / 2 - this.canvasWidth / 2;
		const centerY = this.canvasHeight / 2 - (y + box.height / 2);

		// calculate the top of hte box in screen coords
		const targetY = centerY + (box.height * 0.75);

		// get the height of the canvas
		const canvasHeight = this.canvasHeight;
		const canvasHeight80 = canvasHeight * 0.8;
		const canvasHeight20 = canvasHeight * 0.2;
		
		// pick a random number between 0 and 1
		const random = Math.random();

		// get the y position of the toss
		const startY = canvasHeight20 + (canvasHeight80 * random) - (this.canvasHeight / 2);

		// if the centerX is less than 0, toss to the left (from the right)
		const startX = (centerX < 0) ? this.canvasWidth/2 : -(this.canvasWidth/2);

		// pack start pos in a vector3
		const startPos = new Vector3(
			startX,
			startY,
			0
		);

		// pack target pos in a vector3
		const targetPos = new Vector3(
			centerX,
			centerY,
			0
		);

		// get the associated collision sound
		const sound = this.audioSources.get(def.soundPath);

		// spawn the object
		const tossed = new TossedObject(def.object, startPos, targetPos, this.scene, sound);
		this.tossedItems.push(tossed);
	}


	/**
	 * Render loop for the Three.js scene.
	 */
	renderLoop() {

		// recursively loop on browser's animation frame
		requestAnimationFrame(() => this.renderLoop());

		// console.log('Rendering...');


		const box = unref(this.colliderRef);
		const width = box.width * 0.75;
		const x = box.x + (box.width - width) / 2;
		const y = box.y;
		const minX = x - this.canvasWidth / 2;
		const maxX = x + width - this.canvasWidth / 2;
		const minY = this.canvasHeight / 2 - (y + box.height);
		const maxY = this.canvasHeight / 2 - y;

		const colliderBox = { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };

		this.tossedItems = this.tossedItems.filter(obj => obj.update(colliderBox));

		// render the scene
		this.renderer.render(this.scene, this.camera);
	}


	/**
	 * Perform cleanup actions when the component is destroyed.
	 */
	end() {
		this.renderer.dispose();
		this.scene.clear();
		this.allModels.clear();
		this.audioSources.clear();
		this.tossedItems = [];
		this.resizeObserver.disconnect();
	}
	
}


/**
 * Class to represent one of the tossed objects in the scene.
 */
class TossedObject {

	/**
	 * 
	 * @param {Object3D} model - the 3d model to toss
	 * @param {Vector3} startPos - the starting position of the object
	 * @param {Vector3} target - the target position to toss the object to
	 * @param {Scene} scene - the Three.js scene to add the object to
	 * @param {sound} sound - the sound to play when the object is tossed
	 */
	constructor(model, startPos, target, scene, sound) {

		// save our scene
		this.scene = scene;
		this.mesh = model.clone();
		this.mesh.traverse(child => {
			if (child.isMesh) {
				child.material = child.material.clone();
			}
		});

		// save our start & target positions
		this.startPos = startPos;
		this.target = target.clone();

		// make random rotation values
		const rotX = Math.random() * Math.PI * 2;
		const rotY = Math.random() * Math.PI * 2;
		const rotZ = Math.random() * Math.PI * 2;
		this.rotation = new Vector3(rotX, rotY, rotZ);

		// set our start
		this.mesh.position.copy(this.startPos);

		// vector from start to target
		this.velocity = target.clone().sub(this.startPos).normalize().multiplyScalar(15);

		// for now we'll turn gravity off b/c I don't feel like doing the maths
		// this.velocity.y = 0;
		this.gravity = new Vector3(0, -0.1, 0);
		this.gravity = new Vector3(0, 0, 0);

		// state
		this.hit = false;
		this.opacity = 1;
		this.fadeSpeed = 0.05;

		// save our sound for later
		this.sound = sound;
		
		// when we crash, we'll store our particle system here
		this.particleBurst = null;

		// add our loaded
		this.scene.add(this.mesh);
	}


	/**
	 * Update the object position and check for collision with the target box.
	 * 
	 * @param {Object} targetBox - box to check for collision with like {min: {x, y}, max: {x, y}}
	 * @returns {boolean} - true if the object is still in the scene, false if it has been removed
	 */
	update(targetBox) {

		// if we we previously hit, fade out the object
		if (this.hit) {

			// update particles
			if (this.particles)
				this.particles.update();

			// fade out the object
			this.opacity -= this.fadeSpeed;
			this.mesh.traverse(child => {
				if (child.isMesh) {
					child.material.transparent = true;
					child.material.opacity = this.opacity;
				}
			});

			// if the opacity is less than 0, remove the object from the scene & return false
			if (this.opacity <= 0) {

				if (this.particles)
					this.particles.removeAll();

				this.scene.remove(this.mesh);

				// returning false will cull it from the render loop
				return false;
			}
			return true;
		}

		// do physics / motion updates
		this.velocity.add(this.gravity);
		this.mesh.position.add(this.velocity);

		// apply our rotation spin
		this.mesh.rotation.x += this.rotation.x * 0.01;
		this.mesh.rotation.y += this.rotation.y * 0.01;
		this.mesh.rotation.z += this.rotation.z * 0.01;

		// get the position of the mesh * check if it's in the collider bounds
		const pos = this.mesh.position;
		if (
			pos.x > targetBox.min.x &&
			pos.x < targetBox.max.x &&
			pos.y > targetBox.min.y &&
			pos.y < targetBox.max.y
		) {

			// play the collision sound
			if (this.sound)
				this.sound.play();

			// we hit
			this.hit = true;

			// spawn particles
			this.particles = new ParticleBurst(this.scene, this.mesh, pos.clone());
		}

		return true;
	}
}


/**
 * Helper method to get a color from a texture at the given UV coordinates.
 * 
 * @param {ImageBitmap} image - the image to sample from
 * @param {Number} u - u coordinate (0-1)
 * @param {Number} v - v coordinate (0-1)
 * @returns {Color} - the color at the given UV coordinates
 */
function sampleTextureColor(image, u, v) {

	// make a canvas to sample the image
	const canvas = document.createElement('canvas');
	canvas.width = image.width;
	canvas.height = image.height;

	// copy the image to the canvas so we can use canvas tools to sample
	const ctx = canvas.getContext('2d');
	ctx.drawImage(image, 0, 0);

	// convert the UV coordinates to pixel coordinates
	const x = Math.floor(u * image.width);
	const y = Math.floor((1 - v) * image.height); // flip Y

	// get the pixel data at the given coordinates
	const pixel = ctx.getImageData(x, y, 1, 1).data;

	// create & return a new color from the pixel data
	return new Color(`rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
}


/**
 * Class for the particle burst effect.
 * 
 * When an object hits the target box, we want to create a burst of particles,
 * and base their colors on the texture of the object.
 */
class ParticleBurst {

	/**
	 * Constructs a new ParticleBurst object.
	 * 
	 * @param {Scene} scene - the main ThreeJS scene
	 * @param {Mesh3d} mesh - the 3d model to sample the texture from
	 * @param {Vector3} position - position to spawn the particles
	 * @param {Number} count - how many
	 */
	constructor(scene, mesh, position, count = 50) {

		// save our scene
		this.scene = scene;

		// store our spawned particles here
		this.particles = [];
		
		// walk the mesh and sample it's geometry for textures to spawn color-coded particles
		mesh.traverse(child => {

			// if we found a geo w/ a texture, sample it
			if (child.isMesh && child.geometry && child.material.map) {

				// get the geometry and texture
				const geom = child.geometry;
				const tex = child.material.map;

				// loop to spawn the particles
				for (let i = 0; i < count; i++) {

					// get UV from random vertex
					const uvIndex = Math.floor(Math.random() * geom.attributes.uv.count);
					const uv = new Vector2().fromBufferAttribute(geom.attributes.uv, uvIndex);

					// use our helper to get a color from the texture
					const color = sampleTextureColor(tex.image, uv.x, uv.y);

					// make a sprite for the particle system, with random pos, scale, velocity
					const sprite = new Sprite(new SpriteMaterial({ color }));
					sprite.position.copy(position);
					sprite.scale.setScalar(20);
					// const veloScale = Math.random() * 10;
					sprite.velocity = new Vector3(
						(Math.random() - 0.5) * 10 * Math.random(),
						(Math.random() - 0.5) * 10 * Math.random(),
						0
					);
					sprite.opacity = 1;

					// spawn in the scene & track the particles reference
					this.scene.add(sprite);
					this.particles.push(sprite);

				}// next i
			}
		});

		for(let i=0; i<20; i++)
			this.update();
	}


	/**
	 * Update the particles in the scene.
	 */
	update() {

		// loop over the particles and update their position & opacity
		this.particles = this.particles.filter(p => {

			// update particles physics & renderer
			p.position.add(p.velocity);
			p.opacity -= 0.003;
			p.material.opacity = p.opacity;
			p.material.transparent = true;

			// later nerd
			if (p.opacity <= 0) {
				this.scene.remove(p);
				return false;
			}
			return true;
		});
	}


	/**
	 * Removes all the particles from the scene
	 */
	removeAll(){
		this.particles.forEach(p => this.scene.remove(p));
	}
}

