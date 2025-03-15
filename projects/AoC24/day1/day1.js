function parseInput(){
    input = document.getElementById('input');
    
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
    
    const inputData = device.createBuffer({
        size: input.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    const resultBuffer = device.createBuffer({
        label: 'result buffer',
        size: input.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
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


    async function render() {
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


    

