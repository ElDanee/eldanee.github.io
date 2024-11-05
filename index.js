async function main() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  // Get a WebGPU context from the canvas and configure it
    const canvas = document.getElementById('main-canvas');
    resizeCanvas();

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
  });

  const module = device.createShaderModule({
    label: 'Cellular noise metaballs shader modules',
    code: `
    
@group(0) @binding(0) var<uniform> uTime: f32;
@group(0) @binding(1) var<uniform> uResolution: vec2f;
@group(0) @binding(2) var<uniform> uScale: f32;
    
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        //render full screen triangle
        let pos = array(
          vec2f( -1, 1),  // top left
          vec2f(3, 1),  // top right
          vec2f( -1, -3)   // bottom left
        );

        return vec4f(pos[vertexIndex], 0.0, 1.0);
      }

fn random2( p : vec2f ) -> f32 {
  let v = vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
  let f = sin(v.y / length(v)) * 43758.5453;
  return fract(sin(f));
}

@fragment fn fs(@builtin(position) pos : vec4f) -> @location(0) vec4f {
    var st = pos.xy /uResolution.xy;
    st.x *= uResolution.x/uResolution.y;
    var oColor = vec3f(.0);

    // Scale
    //st *= 5.;
    
    st *= min(5.f, 2*uScale);

    // Tile the space
    let i_st = floor(st);
    let f_st = fract(st);

    var m_dist = 0.3 - 0.3*smoothstep(1.5f, 3.f, uScale);  // minimum distance

    for (var y= -1; y <= 1; y++) {
        for (var x= -1; x <= 1; x++) {
            // Neighbor place in the grid
            let neighbor = vec2f(f32(x),f32(y));

            // Random position from current + neighbor place in the grid
            var point = random2(i_st + neighbor);

            // Animate the point
            point = .5 + .5*sin(uTime * .2f + 6.2831*point);

            // Vector between the pixel and the point
            let diff = neighbor + point - f_st;

            // Distance to the point
            let dist = length(diff);

            // Keep the closer distance
            m_dist = min(m_dist, dist*m_dist);
        }
    }

    
    let f = step(0.060, m_dist);
    let s = 1 - smoothstep(1f, 4.5f, uScale);
    oColor = (1-f) * vec3f((1-s)*0.3+0.1, 1, s*0.3 + 0.6);
    
    oColor += step(0.060, m_dist);

    //Debug options

    // Draw the min distance (distance field)
    //oColor += m_dist;
    
    // Draw cell center
    //oColor += 1.-step(.02, m_dist);

    // Draw grid
    //oColor.r += step(.98, f_st.x) + step(.98, f_st.y);

    // Show isolines
    //oColor -= step(.7,abs(sin(27.0*m_dist)))*.5;
    
    return vec4f(oColor,1.0);
  }
    `,
  });
    
  const pipeline = device.createRenderPipeline({
    label: 'our hardcoded red triangle pipeline',
    layout: 'auto',
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [{ format: presentationFormat }],
    },
  });
    
    const uniformBufferSize = 4; // one float for time uniform
    const uniformResolutionBufferSize = 8; //one vector for resolution ( 2 floats)
    const uniformScrollBufferSize = 4;
      
      const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const uniformResolutionBuffer = device.createBuffer({
        size: uniformResolutionBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
    
    const uniformScrollBuffer = device.createBuffer({
        size: uniformScrollBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

    const bindGroup = device.createBindGroup({
       layout: pipeline.getBindGroupLayout(0),
       entries: [
         { binding: 0, resource: { buffer: uniformBuffer }},
         { binding: 1, resource: { buffer: uniformResolutionBuffer}},
         { binding: 2, resource: { buffer: uniformScrollBuffer}}
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
    
    var lastTime = (new Date).getTime();
    var currentTime = lastTime;
    var accumulatedTime = 0.0;
    const uniformValues = new Float32Array((uniformBufferSize + uniformResolutionBufferSize + uniformScrollBufferSize) / 4);
    var diffScrollY = 1;
    async function render() {

        accumulatedTime += (currentTime - lastTime) / 1000.0;
        lastTime = currentTime;
        currentTime = (new Date).getTime();
        uniformValues[0]=accumulatedTime;
        uniformValues.set([canvas.width, canvas.height], 1);
        diffScrollY += window.scrollY/100000;
        const rect = canvas.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        if(diffScrollY > 5){
            diffScrollY = 4;
        }
        uniformValues[3] = 1 + 3*(rect.top + scrollTop)/canvas.height;
        
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues, 0, 1);
        device.queue.writeBuffer(uniformResolutionBuffer, 0, uniformValues, 1, 2);
        device.queue.writeBuffer(uniformScrollBuffer, 0, uniformValues, 3, 1);
        
        renderPassDescriptor.colorAttachments[0].view =
            context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder({ label: 'our encoder' });
        const pass = encoder.beginRenderPass(renderPassDescriptor);
            
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3); //Full screen triangle, three hard coded vertices
        pass.end();

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
        const div = document.getElementById("shadow-div");
        div.width = newWidth;
        div.height = window.innerHeight;
        
    }
      
      window.addEventListener('resize', resizeCanvas, false);
      window.addEventListener('orientationchange', resizeCanvas, false);

      window.addEventListener('DOMContentLoaded', function () {
          resizeCanvas();
          requestAnimationFrame(render);
      }, false);


  render();
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
        scrollTo('#about');
    });
    
    document.getElementById('projects-link').addEventListener('click', function () {
        scrollTo('#projects');
    });
    
    document.getElementById('resume-link').addEventListener('click', function () {
        scrollTo('#resume');
    });
    
    document.getElementById('stuff-link').addEventListener('click', function () {
        scrollTo('#stuff');
    });
})();
  
