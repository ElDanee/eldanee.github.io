const rand = (min, max) => {
  if (min === undefined) {
    min = 0;
    max = 1;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.random() * (max - min);
};

async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  const numParticles = 100000;
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }

  // Get a WebGPU context from the canvas and configure it
  const canvas = document.querySelector('canvas');
  resizeCanvas();
    
  const context = canvas.getContext('webgpu');
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
      });

  const particlesData = device.createBuffer({
    size: numParticles * 4 * 6, //6 floats
    usage: GPUBufferUsage.STORAGE,
  });


  const particlesDynamicsData = device.createBuffer({
    size: numParticles * 4 * 4, //3 floats (V) + padding
    usage: GPUBufferUsage.STORAGE,
  });

  const workgroupSize = [32, 1, 1];
  const dispatchCount = [Math.ceil(numParticles / workgroupSize[0]), 1, 1];
  const particlesInitCode = `
    struct ParticleData{
      pos : vec2f,
      color : vec4f
    };

    struct ParticleVelocity{
      vel : vec4f //w is time
    };
  
  @group(0) @binding(0) var<storage, read_write> particleData: array<ParticleData>;
  @group(0) @binding(1) var<storage, read_write> particleVel: array<ParticleVelocity>;

  @compute @workgroup_size(${workgroupSize}) fn computeData(
      @builtin(global_invocation_id) global_invocation_id : vec3<u32>
  ) {
  let seed = f32(global_invocation_id.x);
    particleData[global_invocation_id.x].pos[0] = fract(sin(seed)*1000000.0);
    particleData[global_invocation_id.x].pos[1] = fract(sin(seed*10)*10000.0);
    particleData[global_invocation_id.x].color = vec4(0.8, 0.4,
                                                        fract(sin(seed*3+2)*30000.0), 0.1);
    particleData[global_invocation_id.x].pos = 10* (particleData[global_invocation_id.x].pos - vec2f(0.5, 0.5));                             
    particleVel[global_invocation_id.x].vel = vec4f(-particleData[global_invocation_id.x].pos, 0, 0);
  }
  `;

  const initModule = device.createShaderModule({
    label: 'particles rendering',
    code: particlesInitCode,
  });
    
  const initPipeline = device.createComputePipeline({
      label: 'compute init pipeline',
      layout: 'auto',
      compute: {
          module: initModule,
      },
  });
  
  const bindInitGroup = device.createBindGroup({
      layout: initPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particlesData }},
        { binding: 1, resource: { buffer: particlesDynamicsData }}
      ],
    });

  async function initParticles(){
     // make a command encoder to start encoding commands
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
      
    const compPass = encoder.beginComputePass({ label: 'compute builtin pass' });

    compPass.setPipeline(initPipeline);
    compPass.setBindGroup(0, bindInitGroup);
    compPass.dispatchWorkgroups(dispatchCount[0]);
    compPass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }
        
  initParticles();

  const module = device.createShaderModule({
    label: 'particles rendering',
    code: `
      struct ParticleData{
        pos : vec2f,
        color : vec4f
      };

      @group(0) @binding(0) var<storage, read> particleData: array<ParticleData>;

      struct VertexShaderOutput {
          @builtin(position) position: vec4f,
          @location(0) color: vec4f
        };

     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      ) -> VertexShaderOutput {
        var vsOut : VertexShaderOutput;
        let oPos = particleData[instanceIndex].pos; // (2*particleData[instanceIndex].pos) - vec2f(1.f, 1.f);
        vsOut.position = vec4f(oPos, 0, 1);
        
        vsOut.color = particleData[instanceIndex].color;
        return vsOut;

      }

      @fragment fn fs(fsInput: VertexShaderOutput) -> @location(0) vec4f {
        return fsInput.color;
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    label: 'particles rendering pipeline',
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
    },
    fragment: {
      module,
      entryPoint: 'fs',
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      topology: 'point-list',
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: particlesData } },
    ],
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.3, 0.3, 0.3, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const compCode = `
    struct ParticleData{
      pos : vec2f,
      color : vec4f
    };

    struct ParticleVelocity{
      vel : vec4f //w is time
    };
  
  @group(0) @binding(0) var<storage, read_write> particleData: array<ParticleData>;
  @group(0) @binding(1) var<storage, read_write> particleVel: array<ParticleVelocity>;

  @compute @workgroup_size(${workgroupSize}) fn computeData(
      @builtin(global_invocation_id) global_invocation_id : vec3<u32>
  ) {
    particleData[global_invocation_id.x].pos += particleVel[global_invocation_id.x].vel.xy/1000;
    let t = particleVel[global_invocation_id.x].vel.w/3600 * 3.14;
    particleVel[global_invocation_id.x].vel += 10 * vec4f(-0.5-(2*particleData[global_invocation_id.x].pos - vec2f(1f)), length(particleVel[global_invocation_id.x].vel.xy) , particleVel[global_invocation_id.x].vel.w%3600 + 0.1);
    particleVel[global_invocation_id.x].vel/=1.5f;
    //particleData[global_invocation_id.x].color = vec4f(normalize(particleVel[global_invocation_id.x].vel.xy), 0.5, 1);
    let seed = f32(global_invocation_id.x);
    if(length(particleVel[global_invocation_id.x].vel.xy) < 10.f)
    {
      
      particleVel[global_invocation_id.x].vel.x = (cos(t + seed)) * seed; //(fract(sin(seed)*1000000.0)-0.5) * 500;
      particleVel[global_invocation_id.x].vel.y = (sin(t + seed)) * seed; //(fract(sin(seed)*100000.0)-0.5) * 500;
    }
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
  
  const bindCompGroup = device.createBindGroup({
      layout: compPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particlesData }},
        { binding: 1, resource: { buffer: particlesDynamicsData }}
      ],
    });

  async function render() {
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();

    // make a command encoder to start encoding commands
    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    
    // make a render pass encoder to encode render specific commands
    {
      const pass = encoder.beginComputePass();
      pass.setPipeline(compPipeline);
      pass.setBindGroup(0, bindCompGroup);
      pass.dispatchWorkgroups(dispatchCount[0]);
      pass.end();
    }

    {
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(1, numParticles, 0, 0);
      pass.end();
    }

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer])
    
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
    
    // Resize the canvas to fill window dynamically
    window.addEventListener('resize', resizeCanvas, false);
    window.addEventListener('orientationchange', resizeCanvas, false);

    // Start animation after DOM is loaded
    window.addEventListener('DOMContentLoaded', function () {
        resizeCanvas();
        requestAnimationFrame(render);
    }, false);

}

function fail(msg) {
  // eslint-disable-next-line no-alert
  alert(msg);
}

main();
  
