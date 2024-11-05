function Particle(position, size, color, direction, speed, duration, padding) {
	this.position = position;
	this.size = size;
	this.color = color;
	this.direction = direction;
	this.speed = speed;
	this.duration = duration;
	this.padding = padding; // Using the std140 layout, some padding is needed for alignment
};

// Function to flatten particle into Float32 typed array
function toF32(p){
	return [p.position[0], p.position[1], p.position[2],
									p.size, p.color[0], p.color[1], p.color[2], p.color[3],
									p.direction[0], p.direction[1], p.direction[2],
									p.speed, p.duration, 0,0,0];
};

function createParticle(position, size, color, direction, speed, duration, padding){
	var particle = new Object;
	particle.position = position;
	particle.size = size;
	particle.color = color;
	particle.direction = direction;
	particle.speed = speed;
	particle.duration = duration;
	particle.padding = padding;
	return particle;
}

async function main() {
	const canvas = document.querySelector('canvas');
	resizeCanvas();

	const adapter = await navigator.gpu?.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) {
		fail('It seems your web browser doesn\'t support WebGPU :( \n \
					Some features in my portfolio won\'t be available.');
		resizeCanvas();
		return;
	}
	
	const context = canvas.getContext('webgpu');
	const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
	context.configure({
		device,
		format: presentationFormat,
		alphaMode: 'premultiplied',
	});

const numParticlesMax = 100000;
	const module = device.createShaderModule({
		code: `
			struct VSOutput {
				@builtin(position) position: vec4f,
				@location(0) color: vec4f,
				@location(1) uv_coord : vec2f,
				@location(2) p_center : vec2f,
			};

			struct Particle {
				position: vec3f,
				size: f32,
				color : vec4f,
				direction: vec3f,
				speed: f32,
				duration: f32
			};

			struct Vertex{
				@location(0) pos : vec2f,
			};
 
			@group(0) @binding(0) var<uniform> u_time: f32;
			@group(0) @binding(1) var<storage, read> particles: array<Particle>;

			@vertex fn vs(vert: Vertex, @builtin(instance_index) instanceIndex: u32, @builtin(vertex_index) vertexIndex: u32) -> VSOutput {
				var vsOut: VSOutput;
				_ = u_time; //placeholder, either remove u_time, use it or change 'auto' layout in pipeline creation!
				vsOut.p_center = particles[instanceIndex].position.xy;
				vsOut.position = vec4f(particles[instanceIndex].size * vert.pos/100 + vsOut.p_center, 0, 1.f);
				vsOut.uv_coord = vec2f(vsOut.position.xy);
				vsOut.color = particles[instanceIndex].color;

				return vsOut;
			}

			@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
				let d = 500*length(vsOut.uv_coord - vsOut.p_center); //Distance from particle center for radial shading
				if(1/d < 0.5f){discard;}
				return vsOut.color * 1.f/pow(d,2);
			}
		`,
	});
	
	const color = {
			operation: 'add',
			srcFactor: 'src-alpha',
			dstFactor: 'one-minus-src-alpha',
		};
	 
		const alpha = {
			operation: 'add',
			srcFactor: 'src-alpha',
			dstFactor: 'dst-alpha',
		};
	
	const pipeline = device.createRenderPipeline({
		label: '2 attributes',
		layout: 'auto',
		primitive:{
			topology: 'triangle-list',
		} ,
		vertex: {
			module,
			buffers: [
				{
					arrayStride: 2 * 4, // 2 floats, 4 bytes each
					attributes: [
						{shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
					],
				},
			]
		},
		fragment: {
			module,
			targets: [
								{
									format: presentationFormat,
									blend: { color, alpha,}
									}
								],
				
		},
		depthStencil: {
			depthWriteEnabled: false,
			depthCompare: 'less',
			format: 'depth24plus',
		},
	});

	// matrix
	const uniformBufferSize = 1 * 4; //Time uniform
	const uniformBuffer = device.createBuffer({
		label: 'uniforms',
		size: uniformBufferSize,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	});

	const uniformValues = new Float32Array(uniformBufferSize / 4);

	const positions = new Float32Array(4 * 2);
	positions.set([-1, -1], 0);
	positions.set([-1, 1], 2);
	positions.set([1, 1], 4);
	positions.set([1, -1], 6);

	const indices = new Uint32Array(6);
	indices.set([0, 1, 2, 2, 0, 3], 0);
	
	const vertexBuffer = device.createBuffer({
		label: 'vertex buffer',
		size: positions.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
	});
	device.queue.writeBuffer(vertexBuffer, 0, positions);
	
	const indexBuffer = device.createBuffer({
		label: 'indices buffer',
		size: indices.byteLength,
		usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
	});
	device.queue.writeBuffer(indexBuffer, 0, indices);
	
	const particleSize = 4 * 16;
	const particleBufferSize = particleSize * numParticlesMax;

	const particlesBuffer1 = device.createBuffer({
		label: 'particles Storage buffer 1',
		size: particleBufferSize,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
	});

	const particlesBuffer2 = device.createBuffer({
		label: 'particles Storage buffer 2',
		size: particleBufferSize,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
	});

	// Ping pong buffering -> create two binding to use in shader
	const bindGroupA = device.createBindGroup({
		label: 'bind group A : particlesBuffer 2 in VS',
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 0, resource: { buffer: uniformBuffer }},
			{ binding: 1, resource: { buffer : particlesBuffer2}}
		],
	});

	const bindGroupB = device.createBindGroup({
		label: 'bind group B : particlesBuffer 1 in VS',
		layout: pipeline.getBindGroupLayout(0),
		entries: [
			{ binding: 0, resource: { buffer: uniformBuffer }},
			{ binding: 1, resource: { buffer : particlesBuffer1}}
		],
	});

	const renderBindGroups = [bindGroupA, bindGroupB];

	const clearValue = [0, 0, 0, 1];
	const renderPassDescriptor = {
		label: 'our basic canvas renderPass',
		colorAttachments: [
			{
				clearValue,
				loadOp: 'clear',
				storeOp: 'store',
			},
		],
		depthStencilAttachment: {
			depthClearValue: 1.0,
			depthLoadOp: 'clear',
			depthStoreOp: 'store',
		},
	};
	
	const workgroupSize = [32, 1, 1]; //Tune values to achieve max performance and GPU utilization
	
	const dispatchCount = [Math.ceil(numParticlesMax / workgroupSize[0]), 1, 1];
	console.log(dispatchCount);
	const compCode = `
		struct Particle {
			position: vec3f,
			size: f32,
			color : vec4f,
			direction: vec3f,
			speed: f32,
			duration: f32,
		};
 
		struct DrawIndirectBuffer{
			vertexCount: atomic<u32>,
			instanceCount: atomic<u32>,		
			vertexOffset: u32,
			instanceOffset: u32,
	};
 
	fn hashFtoVec2(seed : f32) -> vec2f{
		let x = fract(sin((seed + 777) * 3456789.357f) * 10000.f);
		let y = fract(sin((seed + 42) * 9876543.21f + 42) * 1000.f);
		return vec2f(x,y);
	}

	fn hashFtoVec2Polar(seed : f32) -> vec2f{
		let r = fract(sin((seed + 777) * 3456789.357f) * 10000.f);
		let theta = fract(sin((seed + 42) * 9876543.21f + 42) * 1000.f) * 6.28;
		return r *vec2f(cos(theta),sin(theta));
	}

 
 @group(0) @binding(0) var<storage, read_write> particleIn: array<Particle>;
 @group(0) @binding(1) var<storage, read_write> particleOut: array<Particle>;
 @group(0) @binding(2) var<storage, read_write> indirectBuffer: DrawIndirectBuffer;
 @group(0) @binding(3) var<uniform> u_time : f32;

 @compute @workgroup_size(${workgroupSize}) fn computeData(
		 @builtin(global_invocation_id) global_invocation_id : vec3<u32>
 ) {
		if(global_invocation_id.x < ${numParticlesMax})
		{
			var particle = particleIn[global_invocation_id.x];
			if(particle.duration > 0){
				let index = atomicAdd(&indirectBuffer.instanceCount, 1u);
				//update particle
				particle.duration -= 1.f;
				if(particle.duration< 200 && particle.duration>=199){ //Explode
					particle.direction = vec3f(hashFtoVec2Polar(particle.size), 1.0f);
					particle.speed/=2;
				} else if(particle.duration > 200){
					particle.direction += vec3f(0.05*sin(10*u_time), 0, 0);
				} else {
					particle.speed*=0.98f;
				}
				particle.position += particle.speed * particle.direction;
				particleOut[index] = particle;
				particleIn[global_invocation_id.x].duration = -1;
			}
		}
		//atomicStore(&indirectBuffer.vertexCount, 32);
 }
 `;
 const compModule = device.createShaderModule({
	 label: 'particles rendering',
	 code: compCode,
 });
	 
 const compPipeline = device.createComputePipeline({
		 label: 'compute pipeline',
		 layout: 'auto',
		 compute: {
				 module: compModule,
		 },
 });
	
	const drawValues = device.createBuffer({
		size: 20,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT,
	});

	// Ping pong buffering -> create two binding to use in compute shader
 const bindCompGroupA = device.createBindGroup({
		label: 'bind group A : read from particlesBuffer1, write to particlesBuffer2',
		 layout: compPipeline.getBindGroupLayout(0),
		 entries: [
			 { binding: 0, resource: { buffer: particlesBuffer1}},
			 { binding: 1, resource: { buffer: particlesBuffer2}},
			 { binding: 2, resource: { buffer: drawValues}},
			 { binding: 3, resource: { buffer: uniformBuffer}}
		 ],
	 });

	const bindCompGroupB = device.createBindGroup({
			label: 'bind group B : read from particlesBuffer2, write to particlesBuffer1',
			layout: compPipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: particlesBuffer2}},
				{ binding: 1, resource: { buffer: particlesBuffer1}},
				{ binding: 2, resource: { buffer: drawValues}},
				{ binding: 3, resource: { buffer: uniformBuffer}}
			],
		});

	//Staging array, to create particles in CPU side
	const stagingParticlesBuffer = new Float32Array(particleSize/4 * 1000);
	var particlesToCopy = 0;

	function getMousePos(e){
		let speed = 0.01 + Math.random()/1000;
		let duration = 250 + 100*Math.random();
		let direction = [Math.random()-0.5,1,0];
		for (var i = 0; i < 100; i++){
			let particle = createParticle([(e.clientX/canvas.width - 0.5) * 2,
																		 (e.clientY/canvas.height - 0.5) * -2,
																		 0.1],
																		0.3 + Math.random(),
																		[Math.random(),Math.random(),Math.random(),1],
																		direction,
																		speed,
																		duration,
																		[1,1,1]);
			stagingParticlesBuffer.set(toF32(particle), particlesToCopy * particleSize/4);
			particlesToCopy += 1;
		}
	}
	
	function handleTouchPos(e){
		e.preventDefault();
		const touches = e.changedTouches;
		for (var t = 0; t<touches.length; t++){
			let speed = 0.01 + Math.random()/1000;
			let duration = 250 + 100*Math.random();
			let direction = [Math.random()-0.5,1,0];
			for (var i = 0; i < 50; i++){
				let particle = createParticle([(thouches[t].clientX/canvas.width - 0.5) * 2,
																			 (thouches[t].clientY/canvas.height - 0.5) * -2,
																			 0.1],
																			0.3 + Math.random(),
																			[Math.random(),Math.random(),Math.random(),1],
																			direction,
																			speed,
																			duration,
																			[1,1,1]);
				stagingParticlesBuffer.set(toF32(particle), particlesToCopy * particleSize/4);
				particlesToCopy += 1;
			}
		}
	}
	
	canvas.addEventListener("click", getMousePos);
	canvas.addEventListener("touchstart", handleTouchPos);
	
	let depthTexture;
	
	var lastTime = (new Date).getTime();
	var currentTime = lastTime;
	var accumulatedTime = 0.0;
	var bufferParticlesRead = particlesBuffer1;
	var bufferParticlesWrite = particlesBuffer2;
	const compBindGroups = [bindCompGroupA, bindCompGroupB];
	var bindIndex = 0;

	async function render() {
		{
			var swap = bufferParticlesRead;
			bufferParticlesRead = bufferParticlesWrite;
			bufferParticlesWrite = swap;
			bindIndex = (bindIndex + 1)%2;
		}
		accumulatedTime += (currentTime - lastTime) / 1000.0;
		lastTime = currentTime;
		currentTime = (new Date).getTime();
		uniformValues[0]=accumulatedTime;
		
		// Get the current texture from the canvas context and
		// set it as the texture to render to.
		const canvasTexture = context.getCurrentTexture();
		renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

		// Manage depth texture (check if it exists and if it matches canvas size. Otherwise invalidate)
		if (!depthTexture ||
				depthTexture.width !== canvasTexture.width ||
				depthTexture.height !== canvasTexture.height) {
			if (depthTexture) {
				depthTexture.destroy();
			}
			depthTexture = device.createTexture({
				size: [canvasTexture.width, canvasTexture.height],
				format: 'depth24plus',
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});
		}
		renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

		const encoder = device.createCommandEncoder();

		if(particlesToCopy > 0){
			device.queue.writeBuffer(bufferParticlesRead, particleBufferSize - particlesToCopy * particleSize, stagingParticlesBuffer, 0, particlesToCopy * particleSize/4);
			particlesToCopy = 0;
		} else {
			const clearVal = new Float32Array(16);
			device.queue.writeBuffer(bufferParticlesRead, particleBufferSize - 1 * particleSize, clearVal, 0, 16);
		}
		{
			const pass = encoder.beginComputePass();
			const drawValInit = new Uint32Array(5);
			drawValInit[0] = 6; //6 indices for each draw call
			drawValInit[1] = 0; //0 instances, filled by compute shader
			drawValInit[2] = 0;
			drawValInit[3] = 0;
			drawValInit[4] = 0;
			device.queue.writeBuffer(drawValues, 0, drawValInit, 0, drawValInit.length);
			pass.setPipeline(compPipeline);
			pass.setBindGroup(0, compBindGroups[bindIndex]);
			pass.dispatchWorkgroups(dispatchCount[0]);
			pass.end();
		}
		{
			const pass = encoder.beginRenderPass(renderPassDescriptor);
			pass.setPipeline(pipeline);
			pass.setVertexBuffer(0, vertexBuffer);
			pass.setIndexBuffer(indexBuffer, 'uint32');

			device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
			
			pass.setBindGroup(0, renderBindGroups[bindIndex]);
			pass.drawIndexedIndirect(drawValues, 0);
			
			pass.end();
		}
		const commandBuffer = encoder.finish();
		device.queue.submit([commandBuffer]);
		
		requestAnimationFrame(render);
	}
	
	requestAnimationFrame(render);

	function resizeCanvas() {
		var newWidth = window.innerWidth;

		if (canvas.width == newWidth) {
				return;
		}

		canvas.width = newWidth;
		canvas.height = window.innerHeight;
	}
		
		window.addEventListener('resize', resizeCanvas, false);
		window.addEventListener('orientationchange', resizeCanvas, false);

		window.addEventListener('DOMContentLoaded', function () {
				resizeCanvas();
				requestAnimationFrame(render);
		}, false);
}

function fail(msg) {
	alert(msg);
}

main();
	
/*
 * Smooth scrolling functionality
 */
(function() {
		function easeInOut(t) {
				t = Math.max(0, Math.min(t, 1));
				return t < 0.5
				? 4 * t*t*t
				: (t - 1) * (2*t - 2) * (2*t - 2) + 1;
		}

		// From http://stackoverflow.com/questions/17722497/scroll-smoothly-to-specific-element-on-page
		function scrollTo(elementSelector, duration) {
				if (duration === undefined) {
						duration = 1500;
				}
				
				var startingY = window.pageYOffset;
				var targetElement = document.querySelector(elementSelector);
				
				var elementY = window.pageYOffset + targetElement.getBoundingClientRect().top;
				var targetY = document.body.scrollHeight - elementY < window.innerHeight
				? document.body.scrollHeight - window.innerHeight
				: elementY;
				var diff = targetY - startingY;
				
				var start;
				
				window.requestAnimationFrame(function step(timestamp) {
						if (!start) start = timestamp;
						var time = timestamp - start;
						var completion = Math.min(time / duration, 1);
						window.scrollTo(0, startingY + diff * easeInOut(completion));
						if (time < duration) {
								window.requestAnimationFrame(step)
						}
				});
		}

		document.getElementById('about-link').addEventListener('click', function () {
				scrollTo('#about', 500);
		});
})();


	
