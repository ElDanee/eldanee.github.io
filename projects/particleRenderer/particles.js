async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
    
    const canvas = document.querySelector('canvas');
    resizeCanvas();
    
  const numParticles = 100000;
    if (!device) {
      fail('It seems your web browser doesn\'t support WebGPU :( \n \
            Some features in my portfolio won\'t be available.');
      resizeCanvas();
      return;
    }

  // Get a WebGPU context from the canvas and configure it
  
    
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
    particleData[global_invocation_id.x].pos[0] = 2* (fract(sin(seed)*1000000.0) - 0.5);
    particleData[global_invocation_id.x].pos[1] = 2* (fract(sin(seed*10)*10000.0) - 0.5);
    particleData[global_invocation_id.x].color = vec4(0.8, 0.4,
                                                        fract(sin(seed*3+2)*30000.0), 0.1);                           
    particleVel[global_invocation_id.x].vel = vec4f(0);
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
        let oPos = particleData[instanceIndex].pos;
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
  @group(0) @binding(2) var<uniform> uMousePosition : vec2f;

  @compute @workgroup_size(${workgroupSize}) fn computeData(
      @builtin(global_invocation_id) global_invocation_id : vec3<u32>
  ) {
    var d = length(uMousePosition - particleData[global_invocation_id.x].pos);
    var n = normalize(uMousePosition - particleData[global_invocation_id.x].pos);
    d = max(0.01, d);
    var a = 1/pow(d,2);
    if(d<0.1){
        n*=-0.5;
        a*=0.000000001; //10^-9 works well :)
    } else {
        a *= 0.00001; //10^-5 works well :)
    }
    particleData[global_invocation_id.x].pos += particleVel[global_invocation_id.x].vel.xy;
    let newPos = particleData[global_invocation_id.x].pos;
    var addVel = n*a/100;
    if(newPos.x < -2.f || newPos.x > 2.f){
       particleVel[global_invocation_id.x].vel = vec4f(-newPos.x, newPos.y, 0, 0)/10000;//vec4f(3*n, 0, 0);
    }
    if(newPos.y < -2.f || newPos.y > 2.f){
        particleVel[global_invocation_id.x].vel = vec4f(newPos.x, -newPos.y, 0, 0)/10000;//vec4f(3*n, 0, 0);
    }
    particleVel[global_invocation_id.x].vel += vec4f(addVel, 0, 0);
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
    
  const uniformMousePositionBufferSize = 4 * 2;
  const uniformMousePositionBuffer = device.createBuffer({
    size: uniformMousePositionBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  
  const bindCompGroup = device.createBindGroup({
      layout: compPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particlesData }},
        { binding: 1, resource: { buffer: particlesDynamicsData }},
        { binding: 2, resource: { buffer: uniformMousePositionBuffer}}
      ],
    });

  const uniformValues = new Float32Array(uniformMousePositionBufferSize / 4);
  uniformValues.set([0,0], 0);
  onmousemove = function(e){uniformValues.set([2*Math.fround(e.clientX)/canvas.width - 1,
                                                 -2*Math.fround(e.clientY)/canvas.height + 1], 0);}
  async function render() {
    renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();

    const encoder = device.createCommandEncoder({ label: 'our encoder' });
    
   
    
    device.queue.writeBuffer(uniformMousePositionBuffer, 0, uniformValues, 0, 2);
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
