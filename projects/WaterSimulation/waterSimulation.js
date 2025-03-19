//Matrix implementation adapted from https://webgpufundamentals.org
const mat4 = {
    projection(width, height, depth, dst) {
        // Note: This matrix flips the Y axis so that 0 is at the top.
        return mat4.ortho(0, width, height, 0, depth, -depth, dst);
    },

    perspective(fieldOfViewYInRadians, aspect, zNear, zFar, dst) {
        dst = dst || new Float32Array(16);

        const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
        const rangeInv = 1 / (zNear - zFar);

        dst[0] = f / aspect;
        dst[1] = 0;
        dst[2] = 0;
        dst[3] = 0;

        dst[4] = 0;
        dst[5] = f;
        dst[6] = 0;
        dst[7] = 0;

        dst[8] = 0;
        dst[9] = 0;
        dst[10] = zFar * rangeInv;
        dst[11] = -1;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = zNear * zFar * rangeInv;
        dst[15] = 0;

        return dst;
    },

    ortho(left, right, bottom, top, near, far, dst) {
        dst = dst || new Float32Array(16);

        dst[0] = 2 / (right - left);
        dst[1] = 0;
        dst[2] = 0;
        dst[3] = 0;

        dst[4] = 0;
        dst[5] = 2 / (top - bottom);
        dst[6] = 0;
        dst[7] = 0;

        dst[8] = 0;
        dst[9] = 0;
        dst[10] = 1 / (near - far);
        dst[11] = 0;

        dst[12] = (right + left) / (left - right);
        dst[13] = (top + bottom) / (bottom - top);
        dst[14] = near / (near - far);
        dst[15] = 1;

        return dst;
    },

    identity(dst) {
        dst = dst || new Float32Array(16);
        dst[ 0] = 1;  dst[ 1] = 0;  dst[ 2] = 0;   dst[ 3] = 0;
        dst[ 4] = 0;  dst[ 5] = 1;  dst[ 6] = 0;   dst[ 7] = 0;
        dst[ 8] = 0;  dst[ 9] = 0;  dst[10] = 1;   dst[11] = 0;
        dst[12] = 0;  dst[13] = 0;  dst[14] = 0;   dst[15] = 1;
        return dst;
    },

    multiply(a, b, dst) {
        dst = dst || new Float32Array(16);
        const b00 = b[0 * 4 + 0];
        const b01 = b[0 * 4 + 1];
        const b02 = b[0 * 4 + 2];
        const b03 = b[0 * 4 + 3];
        const b10 = b[1 * 4 + 0];
        const b11 = b[1 * 4 + 1];
        const b12 = b[1 * 4 + 2];
        const b13 = b[1 * 4 + 3];
        const b20 = b[2 * 4 + 0];
        const b21 = b[2 * 4 + 1];
        const b22 = b[2 * 4 + 2];
        const b23 = b[2 * 4 + 3];
        const b30 = b[3 * 4 + 0];
        const b31 = b[3 * 4 + 1];
        const b32 = b[3 * 4 + 2];
        const b33 = b[3 * 4 + 3];
        const a00 = a[0 * 4 + 0];
        const a01 = a[0 * 4 + 1];
        const a02 = a[0 * 4 + 2];
        const a03 = a[0 * 4 + 3];
        const a10 = a[1 * 4 + 0];
        const a11 = a[1 * 4 + 1];
        const a12 = a[1 * 4 + 2];
        const a13 = a[1 * 4 + 3];
        const a20 = a[2 * 4 + 0];
        const a21 = a[2 * 4 + 1];
        const a22 = a[2 * 4 + 2];
        const a23 = a[2 * 4 + 3];
        const a30 = a[3 * 4 + 0];
        const a31 = a[3 * 4 + 1];
        const a32 = a[3 * 4 + 2];
        const a33 = a[3 * 4 + 3];

        dst[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
        dst[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
        dst[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
        dst[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

        dst[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
        dst[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
        dst[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
        dst[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;

        dst[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
        dst[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
        dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
        dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;

        dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
        dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
        dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
        dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

        return dst;
    },

    inverse(m, dst) {
        dst = dst || new Float32Array(16);

        const m00 = m[0 * 4 + 0];
        const m01 = m[0 * 4 + 1];
        const m02 = m[0 * 4 + 2];
        const m03 = m[0 * 4 + 3];
        const m10 = m[1 * 4 + 0];
        const m11 = m[1 * 4 + 1];
        const m12 = m[1 * 4 + 2];
        const m13 = m[1 * 4 + 3];
        const m20 = m[2 * 4 + 0];
        const m21 = m[2 * 4 + 1];
        const m22 = m[2 * 4 + 2];
        const m23 = m[2 * 4 + 3];
        const m30 = m[3 * 4 + 0];
        const m31 = m[3 * 4 + 1];
        const m32 = m[3 * 4 + 2];
        const m33 = m[3 * 4 + 3];

        const tmp0 = m22 * m33;
        const tmp1 = m32 * m23;
        const tmp2 = m12 * m33;
        const tmp3 = m32 * m13;
        const tmp4 = m12 * m23;
        const tmp5 = m22 * m13;
        const tmp6 = m02 * m33;
        const tmp7 = m32 * m03;
        const tmp8 = m02 * m23;
        const tmp9 = m22 * m03;
        const tmp10 = m02 * m13;
        const tmp11 = m12 * m03;
        const tmp12 = m20 * m31;
        const tmp13 = m30 * m21;
        const tmp14 = m10 * m31;
        const tmp15 = m30 * m11;
        const tmp16 = m10 * m21;
        const tmp17 = m20 * m11;
        const tmp18 = m00 * m31;
        const tmp19 = m30 * m01;
        const tmp20 = m00 * m21;
        const tmp21 = m20 * m01;
        const tmp22 = m00 * m11;
        const tmp23 = m10 * m01;

        const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
                   (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
        const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
                   (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
        const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
                   (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
        const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
                   (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);

        const d = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

        dst[0] = d * t0;
        dst[1] = d * t1;
        dst[2] = d * t2;
        dst[3] = d * t3;

        dst[4] = d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
                      (tmp0 * m10 + tmp3 * m20 + tmp4 * m30));
        dst[5] = d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
                      (tmp1 * m00 + tmp6 * m20 + tmp9 * m30));
        dst[6] = d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
                      (tmp2 * m00 + tmp7 * m10 + tmp10 * m30));
        dst[7] = d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
                      (tmp5 * m00 + tmp8 * m10 + tmp11 * m20));

        dst[8] = d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
                      (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
        dst[9] = d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
                      (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
        dst[10] = d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
                       (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
        dst[11] = d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
                       (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));

        dst[12] = d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
                       (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
        dst[13] = d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
                       (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
        dst[14] = d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
                       (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
        dst[15] = d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
                       (tmp20 * m12 + tmp23 * m22 + tmp17 * m02));
        return dst;
    },

    translation([tx, ty, tz], dst) {
        dst = dst || new Float32Array(16);
        dst[ 0] = 1;   dst[ 1] = 0;   dst[ 2] = 0;   dst[ 3] = 0;
        dst[ 4] = 0;   dst[ 5] = 1;   dst[ 6] = 0;   dst[ 7] = 0;
        dst[ 8] = 0;   dst[ 9] = 0;   dst[10] = 1;   dst[11] = 0;
        dst[12] = tx;  dst[13] = ty;  dst[14] = tz;  dst[15] = 1;
        return dst;
    },

    rotationX(angleInRadians, dst) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        dst = dst || new Float32Array(16);
        dst[ 0] = 1;  dst[ 1] = 0;   dst[ 2] = 0;  dst[ 3] = 0;
        dst[ 4] = 0;  dst[ 5] = c;   dst[ 6] = s;  dst[ 7] = 0;
        dst[ 8] = 0;  dst[ 9] = -s;  dst[10] = c;  dst[11] = 0;
        dst[12] = 0;  dst[13] = 0;   dst[14] = 0;  dst[15] = 1;
        return dst;
    },

    rotationY(angleInRadians, dst) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        dst = dst || new Float32Array(16);
        dst[ 0] = c;  dst[ 1] = 0;  dst[ 2] = -s;  dst[ 3] = 0;
        dst[ 4] = 0;  dst[ 5] = 1;  dst[ 6] = 0;   dst[ 7] = 0;
        dst[ 8] = s;  dst[ 9] = 0;  dst[10] = c;   dst[11] = 0;
        dst[12] = 0;  dst[13] = 0;  dst[14] = 0;   dst[15] = 1;
        return dst;
    },

    rotationZ(angleInRadians, dst) {
        const c = Math.cos(angleInRadians);
        const s = Math.sin(angleInRadians);
        dst = dst || new Float32Array(16);
        dst[ 0] = c;   dst[ 1] = s;  dst[ 2] = 0;  dst[ 3] = 0;
        dst[ 4] = -s;  dst[ 5] = c;  dst[ 6] = 0;  dst[ 7] = 0;
        dst[ 8] = 0;   dst[ 9] = 0;  dst[10] = 1;  dst[11] = 0;
        dst[12] = 0;   dst[13] = 0;  dst[14] = 0;  dst[15] = 1;
        return dst;
    },

    scaling([sx, sy, sz], dst) {
        dst = dst || new Float32Array(16);
        dst[ 0] = sx;  dst[ 1] = 0;   dst[ 2] = 0;    dst[ 3] = 0;
        dst[ 4] = 0;   dst[ 5] = sy;  dst[ 6] = 0;    dst[ 7] = 0;
        dst[ 8] = 0;   dst[ 9] = 0;   dst[10] = sz;   dst[11] = 0;
        dst[12] = 0;   dst[13] = 0;   dst[14] = 0;    dst[15] = 1;
        return dst;
    },

    translate(m, translation, dst) {
        return mat4.multiply(m, mat4.translation(translation), dst);
    },

    rotateX(m, angleInRadians, dst) {
        return mat4.multiply(m, mat4.rotationX(angleInRadians), dst);
    },

    rotateY(m, angleInRadians, dst) {
        return mat4.multiply(m, mat4.rotationY(angleInRadians), dst);
    },

    rotateZ(m, angleInRadians, dst) {
        return mat4.multiply(m, mat4.rotationZ(angleInRadians), dst);
    },

    scale(m, scale, dst) {
        return mat4.multiply(m, mat4.scaling(scale), dst);
    },
    
    transformPoint(matrix, [x, y, z, w=1]){
        return new Float32Array([
                            (x * matrix[0]) + (y * matrix[4]) + (z * matrix[8])  + (w * matrix[12]),
                            (x * matrix[1]) + (y * matrix[5]) + (z * matrix[9])  + (w * matrix[13]),
                            (x * matrix[2]) + (y * matrix[6]) + (z * matrix[10]) + (w * matrix[14]),
                            (x * matrix[3]) + (y * matrix[7]) + (z * matrix[11]) + (w * matrix[15])
                        ])
    },
    
    normalize([x,y,z]){
        let length = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
        return new Float32Array([x/length, y/length, z/length]);
    },
};

const surfaceSide = 100;
const depthVal = 0.8;

class ParticleData{
    constructor(position, height, size, color){
        //Byte 0
        this.position = position; //vec2
        this.height = height; //float
        this.size = size; //float
        //Byte 4
        this.color = color; //vec3
        this.pad1 = 0.0; //float padding
    }
   
    toF32(){
        return [this.position[0], this.position[1], this.height, this.size, //Byte 0-3
                this.color[0], this.color[1], this.color[2], 0.0]; //Byte 4-7
    };
};

class ParticleDynamics{
    constructor(velocity){
        this.velocity = velocity; //vec3
        this.padding = 0.0;
    }
    toF32(){
        return [this.velocity[0], this.velocity[1], this.velocity[2], 0.0]; //Byte 0-3
    };
}

const workgroupSize = [32, 1, 1];

class WaterSurface{
    constructor(sideSize, depth, spacing){
        this.numX = Math.floor(sideSize / spacing) + 1;
        this.numZ = Math.floor(sideSize / spacing) + 1;
        this.spacing = spacing;
        this.numCells = this.numX * this.numZ;
        this.heights = new Float32Array(this.numCells);
        
        this.velocities = new Float32Array(this.numCells);
        
        this.heights.fill(depth);
        this.velocities.fill(0.0);
        
        this.heights[this.numCells-1] = 100; //Init wave
        
        this.positions = new Float32Array(this.numCells * 2);
        let cx = Math.floor(this.numX / 2.0);
        let cz = Math.floor(this.numZ / 2.0);
        for (let i = 0; i < this.numX; i++) {
            for (let j = 0; j < this.numZ; j++) {
                this.positions[2 * (i * this.numZ + j)] = (i - cx) * this.spacing;
                this.positions[2 * (i * this.numZ + j) + 1] = (j - cz) * this.spacing;
            }
        }
        
        this.index = new Uint32Array((this.numX - 1) * (this.numZ - 1) * 2 * 3);
        let pos = 0;
        for (let i = 0; i < this.numX - 1; i++) {
            for (let j = 0; j < this.numZ - 1; j++) {
                let id0 = i * this.numZ + j;
                let id1 = i * this.numZ + j + 1;
                let id2 = (i + 1) * this.numZ + j + 1;
                let id3 = (i + 1) * this.numZ + j;

                this.index[pos++] = id0;
                this.index[pos++] = id1;
                this.index[pos++] = id2;

                this.index[pos++] = id0;
                this.index[pos++] = id2;
                this.index[pos++] = id3;
            }
        }
    }
}

async function main() {
    const canvas = document.querySelector('canvas');
    resizeCanvas();

    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
        fail('It seems WebGPU isn\'t enabled on your browser or your GPu doesn\'t support it :( \n \
              This demo isn\'t available without WebGPU, feel free to check out to Github page!');
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
    
    var waterSurface = new WaterSurface(surfaceSide, depthVal, .2);
    
    //Surface mesh init
    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer',
        size: waterSurface.positions.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, waterSurface.positions, 0 , waterSurface.positions.size);
    
    const indexBuffer = device.createBuffer({
        label: 'indices buffer',
        size: waterSurface.index.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, waterSurface.index, 0, waterSurface.index.size);
    
    //Storage Buffer init
    const velocitySize = 4; //One float for vertical velocity
    const velocityBufferSize = velocitySize * waterSurface.numCells;
    const velocityBuffer = device.createBuffer({
        label: 'velocityStorageBuffer',
        size: velocityBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, //Use on GPU, copy from CPU
    });
    device.queue.writeBuffer(velocityBuffer, 0, waterSurface.velocities, 0, waterSurface.numCells);
    
    const heightSize = 4; //One float for vertical position
    const heightBufferSize = heightSize * waterSurface.numCells;
    const heightBuffer = device.createBuffer({
        label: 'velocityStorageBuffer',
        size: heightBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, //Use on GPU, copy from CPU
    });
    device.queue.writeBuffer(heightBuffer, 0, waterSurface.heights, 0, waterSurface.numCells);
    
    const timeUniformSize = 4; //one float
    const uniformBuffer = device.createBuffer({
        label: 'uniform Buffer',
        size: timeUniformSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, //Use on GPU, copy from CPU, uniform values
    });
    const uniformValues = new Float32Array(timeUniformSize / 4); //staging uniform buffer

    const cursorPosSize = 4 * 3; //vec3 float
    const uniformBufferCursor = device.createBuffer({
        label: 'uniform cursor Buffer',
        size: cursorPosSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, //Use on GPU, copy from CPU, uniform values
    });

    const numParticlesMax = Math.ceil(Math.random()* 2000) + 100;
    const particleDataSize = 4 * 8; //8 floats
      const particleDataBufferSize = particleDataSize * numParticlesMax * 10;

    const particlesDataBuffer1 = device.createBuffer({
      label: 'particles Storage buffer 1',
      size: particleDataBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      });
    const particlesDataBuffer2 = device.createBuffer({
      label: 'particles Storage buffer 2',
      size: particleDataBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      });

    const particleDynamicsSize = 4 * 4; // 4 floats
    const particleDynamicsBufferSize = particleDynamicsSize * numParticlesMax * 10;
    const particlesDynamicsBuffer1 = device.createBuffer({
      label: 'particles dynamics storage buffer1 ',
      size: particleDynamicsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      });
    const particlesDynamicsBuffer2 = device.createBuffer({
      label: 'particles dynamics storage buffer2',
      size: particleDynamicsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
      });
    
    const dispatchCountParticles = [Math.ceil(numParticlesMax*10 / workgroupSize[0]), 1, 1];
    const particleShader = `
        struct ParticleData {
            position: vec2f,
            height: f32,
            size: f32,
            color: vec3f,
            padding: f32,
        };

        struct ParticleDynamics {
            speed: vec3f,
            padding: f32,
        };

        struct DrawIndirectBuffer{
            vertexCount: atomic<u32>,
            instanceCount: atomic<u32>,        
            vertexOffset: u32,
            instanceOffset: u32,
            firstInstance: u32
        };
 
        fn hashFtoVec2(seed : f32) -> vec2f{
            let x = fract(sin((seed + 777) * 3456789.357f) * 10000.f);
            let y = fract(sin((seed + 42) * 9876543.21f) * 1000.f);
            return vec2f(x,y);
        }

        fn hashFtoVec2Polar(seed : f32) -> vec2f{
            let r = fract(sin((seed*10 + 777) * 3456789.357f) * 10000.f);
            let theta = fract(sin((seed*10 + 42) * 9876543.21f) * 1000.f) * 6.28;
            return r *vec2f(cos(theta),sin(theta));
        }

        @group(0) @binding(0) var<storage, read_write> particleDataBufferIn: array<ParticleData>;
        @group(0) @binding(1) var<storage, read_write> particleDataBufferOut: array<ParticleData>;
        @group(0) @binding(2) var<storage, read_write> particleDynamicsBufferIn: array<ParticleDynamics>;
        @group(0) @binding(3) var<storage, read_write> particleDynamicsBufferOut: array<ParticleDynamics>;
        @group(0) @binding(4) var<storage, read_write> surfaceLevel: array<f32>;
        @group(0) @binding(5) var<storage, read_write> indirectBuffer: DrawIndirectBuffer;
        @group(0) @binding(6) var<uniform> u_time : f32;

        const stride : u32 = ${waterSurface.numX};
        const surfaceSide : f32 = ${surfaceSide};
        const spacing : f32 = ${waterSurface.spacing};
        const particleCount : u32 = ${numParticlesMax};

        @compute @workgroup_size(${workgroupSize}) fn computeData(
                @builtin(global_invocation_id) global_invocation_id : vec3<u32>
        ) {
                if(global_invocation_id.x < ${10*numParticlesMax})
                {
                    var particle = particleDataBufferIn[global_invocation_id.x];
                            
                    particleDataBufferIn[global_invocation_id.x].size = 0;
        
                    let x = ceil((particle.position.x + surfaceSide/2)/spacing);
                    let z = ceil((particle.position.y + surfaceSide/2)/spacing);
                    let surfaceIndex = u32(x) * stride + u32(z);
                    var speed = particleDynamicsBufferIn[global_invocation_id.x].speed;
                    if(particle.height > surfaceLevel[surfaceIndex] && particle.size>0){
                        speed.y -= u_time * 3;
                        speed.y = clamp(speed.y, -20, 10);
        
                        //update particle
                        particle.height += u_time * speed.y;
                        particle.position += u_time * speed.xz;
                        let index = atomicAdd(&indirectBuffer.instanceCount, 1u);
                        particleDynamicsBufferOut[index].speed = speed;
                        particleDataBufferOut[index] = particle;
                    } else {
                        if(particle.size>0)
                        {
                            surfaceLevel[surfaceIndex] -= 0.8*speed.y * u_time;

                            if(particle.size > 0.8){
                            
                              let index = atomicAdd(&indirectBuffer.instanceCount, 10u);
                              particle.height = 100;
                              particleDataBufferOut[index] = particle;
                              particleDynamicsBufferOut[index].speed.y = 0;
                              for(var i = 1; i<=9; i++){
                                particleDataBufferOut[index+u32(i)].height = surfaceLevel[surfaceIndex] + 0.001f;
                                particleDataBufferOut[index+u32(i)].size = 0.7;
                                particleDataBufferOut[index+u32(i)].position = particle.position;
                                particleDataBufferOut[index+u32(i)].color = vec3f(0.3,0.3,1);
            
                                var random = hashFtoVec2(f32(global_invocation_id.x * index)+f32(i));
                                particleDynamicsBufferOut[index+u32(i)].speed= vec3f(cos(2*f32(i)*3.14/9) + random.x,
                                                                                        1,
                                                                                        sin(2*f32(i)*3.14/9) + random.y);
                              }
                            } 
                        } 
                    }
                }
        }
        `;
    const particleModule = device.createShaderModule({
        label: 'particles rendering',
        code: particleShader,
    });
     
    const particlePipeline = device.createComputePipeline({
        label: 'compute pipeline',
        layout: 'auto',
        compute: {
                module: particleModule,
        },
    });
    
    const drawValues = device.createBuffer({
        size: 20,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT,
    });

    // Ping pong buffering -> create two binding to use in compute shader
    const bindGroupParticles1 = device.createBindGroup({
        label: 'bind group B : read from particlesBuffer1, write to particlesBuffer2',
         layout: particlePipeline.getBindGroupLayout(0),
         entries: [
             { binding: 0, resource: { buffer: particlesDataBuffer1}},
             { binding: 1, resource: { buffer: particlesDataBuffer2}},
             { binding: 2, resource: { buffer: particlesDynamicsBuffer1}},
             { binding: 3, resource: { buffer: particlesDynamicsBuffer2}},
             { binding: 4, resource: { buffer: heightBuffer}},
             { binding: 5, resource: { buffer: drawValues}},
             { binding: 6, resource: { buffer: uniformBuffer}}
         ],
     });
    
    const bindGroupParticles2 = device.createBindGroup({
        label: 'bind group A : read from particlesBuffer2, write to particlesBuffer1',
         layout: particlePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particlesDataBuffer2}},
            { binding: 1, resource: { buffer: particlesDataBuffer1}},
            { binding: 2, resource: { buffer: particlesDynamicsBuffer2}},
            { binding: 3, resource: { buffer: particlesDynamicsBuffer1}},
            { binding: 4, resource: { buffer: heightBuffer}},
            { binding: 5, resource: { buffer: drawValues}},
            { binding: 6, resource: { buffer: uniformBuffer}}
        ],
     });
            
    const bindGroupsParticles = [bindGroupParticles1, bindGroupParticles2];
    
    const stagingParticlesDataBuffer = new Float32Array(particleDataSize/4 * 6*numParticlesMax);
    const stagingParticlesDynamicsBuffer = new Float32Array(particleDynamicsSize/4 * 6*numParticlesMax);


    for (var t = 0; t<numParticlesMax; t++){ //Init strating particles
        let velocity = [0, Math.random() * -10, 0];
        let position = [Math.random() * (surfaceSide) - (surfaceSide/2), Math.random() * (surfaceSide) - surfaceSide/10];
        let height = Math.random() * 1000 + 100;
        let color = [1,1,1];
        let size = 2;
        let particleData = new ParticleData(position, height, size, color);
        let particleDynamics = new ParticleDynamics(velocity);
        stagingParticlesDataBuffer.set(particleData.toF32(), t * particleDataSize/4);
        stagingParticlesDynamicsBuffer.set(particleDynamics.toF32(), t * particleDynamicsSize/4);
    }
                                       
    for (var t=numParticlesMax; t< 6*numParticlesMax; t++){ //Init empty particles
          let velocity = [0, Math.random() * -100, 0];
          let position = [-1000, -1000];
          let height = -1000;
          let color = [1,1,1];
          let size = 0;
          let particleData = new ParticleData(position, height, size, color);
          let particleDynamics = new ParticleDynamics(velocity);
          stagingParticlesDataBuffer.set(particleData.toF32(), t * particleDataSize/4);
          stagingParticlesDynamicsBuffer.set(particleDynamics.toF32(), t * particleDynamicsSize/4);
      }

    device.queue.writeBuffer(particlesDataBuffer1, 0, stagingParticlesDataBuffer, 0, particleDataSize/4 * 6*numParticlesMax);
    device.queue.writeBuffer(particlesDynamicsBuffer1, 0, stagingParticlesDynamicsBuffer, 0, particleDynamicsSize/4 * 6*numParticlesMax);
    device.queue.writeBuffer(particlesDataBuffer2, 0, stagingParticlesDataBuffer, 0, particleDataSize/4 * 6*numParticlesMax);
    device.queue.writeBuffer(particlesDynamicsBuffer2, 0, stagingParticlesDynamicsBuffer, 0, particleDynamicsSize/4 * 6*numParticlesMax);
                                       
    const dispatchCount = [Math.ceil(waterSurface.numCells / workgroupSize[0]), 1, 1];
    const compCode = `
     @group(0) @binding(0) var<storage, read_write> velocities: array<f32>;
     @group(0) @binding(1) var<storage, read_write> heights: array<f32>;
     @group(0) @binding(2) var<uniform> u_cursorPosition : vec3f;
     @group(0) @binding(3) var<uniform> u_time : f32;

     const stride : u32 = ${waterSurface.numX};
     const numValues : u32 = ${waterSurface.numCells};
     const waveSpeed : f32 = ${(Math.pow(Math.min(2, 0.5 * waterSurface.spacing / (1/60)),2)/ waterSurface.spacing/ waterSurface.spacing )};
     const vDamp : f32 = ${Math.max(0.0, 1.0 - 0.1 * 1/60)};
     const pDamp : f32 = ${Math.min(1.0 * 1/60, 1.0)};

     @compute @workgroup_size(${workgroupSize}) fn computeData(
             @builtin(global_invocation_id) global_invocation_id : vec3<u32>
     ) {
            let coord = global_invocation_id.x;
            if(coord < numValues)
            {
                var sumH = 0.0;
                if((coord+1)%stride!=0){
                    sumH+=heights[coord+1];
                } else {sumH+=heights[coord];}
                if(coord%(stride)!=0){
                    sumH+=heights[coord-1];
                } else {sumH+=heights[coord];}
                if(coord>=stride){
                    sumH+=heights[coord-stride];
                } else {sumH+=heights[coord];}
                if(coord<numValues-stride){
                    sumH+=heights[coord+stride];
                } else {sumH+=heights[coord];}

                if (coord - u32(u_cursorPosition.x) * stride - u32(u_cursorPosition.z) < 1) //Cursor pointer
                    {heights[coord] =  -1f;}
                else {velocities[coord] += u_time * waveSpeed * (sumH - 4 * heights[coord]);
                heights[coord] += (0.25 * sumH - heights[coord]) * pDamp;

                velocities[coord] *= vDamp;}
                heights[coord] += u_time * velocities[coord];
            }
     }
     `;
    
    const compModule = device.createShaderModule({
        label: 'surface simulation',
        code: compCode,
    });
    
    const compPipeline = device.createComputePipeline({
        label: 'compute pipeline',
        layout: 'auto',
        compute: {
                module: compModule,
        },
    });
    
    const bindGroupSimulation = device.createBindGroup({
        label: 'bind group simulation: velocities and heights',
        layout: compPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: velocityBuffer }},
            { binding: 1, resource: { buffer : heightBuffer}},
            { binding: 2, resource: { buffer : uniformBufferCursor}},
            { binding: 3, resource: { buffer : uniformBuffer}},
        ],
    });
    
    
    const module = device.createShaderModule({
        code: `
            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) color: vec4f,
                @location(1) normal: vec3f
            };

            struct Vertex{
                @location(0) pos : vec2f,
            };
            
            @group(0) @binding(0) var<storage> heights: array<f32>;
            @group(0) @binding(1) var<uniform> u_viewProjection : mat4x4f;
            @group(0) @binding(2) var<uniform> u_eyePosition : vec3f;
        
            const stride : u32 = ${waterSurface.numX};
            const numValues : u32 = ${waterSurface.numCells};
            const spacing : f32 = ${waterSurface.spacing};
            const lightPosition : vec3f = vec3f(1000, 0, -100);

            @vertex fn vs(vert: Vertex, @builtin(vertex_index) vertexIndex: u32) -> VSOutput {
                var vsOut: VSOutput;
                var v0 = vec3f(vert.pos.x, heights[vertexIndex] + 0.05*fract(sin(f32(vertexIndex) * 44444)), vert.pos.y);

                vsOut.position = u_viewProjection * vec4f(v0, 1.f); 

                vsOut.color = vec4f(.2, .2, .9, 1);
        
                //Neighboors for normal update
                var v1 : vec3f;
                var v2 : vec3f;
                var v3 : vec3f;
                var v4 : vec3f;
                if((vertexIndex-1)%(stride)!=0){
                    v1 = vec3f(vert.pos.x+spacing, heights[vertexIndex+1], vert.pos.y);
                } else {v1 = v0;}
                if(vertexIndex%(stride)!=0){
                    v2 = vec3f(vert.pos.x-spacing, heights[vertexIndex-1], vert.pos.y);
                } else {v2 = v0;}
                if(vertexIndex>=stride){
                    v3 = vec3f(vert.pos.x, heights[vertexIndex-stride], vert.pos.y-spacing);
                } else {v3 = v0;}
                if(vertexIndex<numValues-stride){
                   v4 = vec3f(vert.pos.x, heights[vertexIndex+stride], vert.pos.y+spacing);
                } else {v4 = v0;}

                vsOut.normal = cross(v0-v1, v0-v4);
                vsOut.normal += cross(v0-v4, v0-v2);
                vsOut.normal += cross(v0-v2, v0-v3);
                vsOut.normal += cross(v0-v3, v0-v1);
                vsOut.normal = normalize(vsOut.normal);
                return vsOut;
            }

            @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
                var L = normalize(lightPosition - vsOut.position.xyz); 
                let R = 2 * dot(L, vsOut.normal) * vsOut.normal - L;
                let eyeDir = normalize(u_eyePosition - vsOut.position.xyz);
                let colorS = pow(max(dot(eyeDir, R), 0.f), 200.f);
        
                var s = max(dot(vsOut.normal,L), .1); 
                var color = vsOut.color.xyz * (0.3 + 0.7 * s);
                return vec4f(0.9*color + 0.7*colorS, .8f);
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
        label: 'renderPipeline',
        layout: 'auto',
        primitive:{
            topology: 'triangle-list',
            frontFace: 'ccw',
            cullMode: 'back',
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
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const matrixSize = 4 * 16; //mat4x4 float
    const uniformBufferRender = device.createBuffer({
        label: 'uniform viewProjection Buffer',
        size: matrixSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, //Use on GPU, copy from CPU, uniform values
    });
    
    const eyePosUSize = 4 * 3; //vec3 floats
    const uniformBufferEye = device.createBuffer({
        label: 'uniform eye Position buffer',
        size: eyePosUSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, //Use on GPU, copy from CPU, uniform values
    });
    
    const bindGroupRendering = device.createBindGroup({
        label: 'bind group rendering: viewProjection',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: heightBuffer}},
            { binding: 1, resource: { buffer: uniformBufferRender }},
            { binding: 2, resource: { buffer: uniformBufferEye }},
        ],
    });

    const clearValue = [.2, 0, 0.5, 1];
    const renderPassDescriptor = {
        label: 'basic canvas renderPass',
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


    const particleRenderModule = device.createShaderModule({
        code: `
            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) color: vec4f,
                @location(1) p_center : vec2f,
                @location(2) uv_coord : vec2f
            };

            struct ParticleData {
                position: vec2f,
                height: f32,
                size: f32,
                color : vec3f,
                padding: f32
            };

            struct Vertex{
                @location(0) pos : vec2f,
            };
 
            @group(0) @binding(0) var<storage, read> particles: array<ParticleData>;
            @group(0) @binding(1) var<uniform> u_viewProjection: mat4x4f;

            @vertex fn vs(vert: Vertex, @builtin(instance_index) instanceIndex: u32, @builtin(vertex_index) vertexIndex: u32) -> VSOutput {
                var vsOut: VSOutput;
                
                let p = particles[instanceIndex];
                let pWorld = vec3f( p.position.x,
                                    p.height+p.size*vert.pos.y,
                                    p.position.y + p.size/2*vert.pos.x);
        
                vsOut.position = u_viewProjection*vec4f(pWorld,1);
                vsOut.p_center = vec2f(0.5, 0.5);
                vsOut.uv_coord = vec2f((vert.pos.x + 1)/2, (vert.pos.y + 1)/2);
                
                vsOut.color = vec4f(p.color, 0.6);

                return vsOut;
            }

            @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
                let d = 50*length(vsOut.uv_coord - vsOut.p_center) + 0.1; //Distance from particle center for radial shading
                if(1/d < 0.5f){discard;}
                return vec4f(vsOut.color.xyz, 0.6f/max(1,pow(d,2)));// * 1.f/pow(d,2);
            }
        `,
    });
    
    const pipelineRenderParticles = device.createRenderPipeline({
        label: '2 attributes',
        layout: 'auto',
        primitive:{
            topology: 'triangle-list',
        } ,
        vertex: {
            module : particleRenderModule,
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
            module: particleRenderModule,
            targets: [
                                {
                                    format: presentationFormat,
                                    blend: { color, alpha,}
                                    }
                                ],
                
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const positions = new Float32Array(4 * 2); //Billboard instance, 2 floats (x, y)
    positions.set([-1, -1], 0);
    positions.set([-1, 1], 2);
    positions.set([1, 1], 4);
    positions.set([1, -1], 6);

    const indices = new Uint32Array(6);
    indices.set([0, 1, 2, 2, 0, 3], 0);
    
    const vertexBufferParticles = device.createBuffer({
        label: 'vertex buffer',
        size: positions.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBufferParticles, 0, positions);
    
    const indexBufferParticles = device.createBuffer({
        label: 'indices buffer',
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBufferParticles, 0, indices);
    
    const bindGroupRenderParticles1 = device.createBindGroup({
        label: 'bind group : particlesBuffer2 in VS',
        layout: pipelineRenderParticles.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particlesDataBuffer2}},
            { binding: 1, resource: { buffer : uniformBufferRender}}
        ],
    });
                                       
    const bindGroupRenderParticles2 = device.createBindGroup({
        label: 'bind group : particlesBuffer1 in VS',
        layout: pipelineRenderParticles.getBindGroupLayout(0),
        entries: [
           { binding: 0, resource: { buffer: particlesDataBuffer1}},
           { binding: 1, resource: { buffer : uniformBufferRender}}
       ],
    });
                                       
    const bindGroupsRenderParticles = [bindGroupRenderParticles1, bindGroupRenderParticles2];
    
    let depthTexture;

    var lastTime = (new Date).getTime();
    var currentTime = lastTime;
    var accumulatedTime = 0.0;

    const degToRad = d => d * Math.PI / 180;

    const projection = mat4.perspective(
        degToRad(75),
        window.innerWidth / window.innerHeight,
        0.1,      // zNear
        1000,   // zFar
    );

    let eyePos = new Float32Array([0, 3, 50]);
    const a = mat4.rotationY(degToRad(0));
    const b = mat4.translate(mat4.identity(), eyePos);
    const cameraMatrix = mat4.multiply(a,b);
    const viewMatrix = mat4.inverse(cameraMatrix);
    device.queue.writeBuffer(uniformBufferEye, 0, eyePos);

     // combine the view and projection matrixes
    const viewProjectionMatrix = mat4.multiply(projection, viewMatrix);
    
    //-- Get cursor position and shoot ray to hit plane
    ///TODO: cleanup this part
    function getRayFromMouse(event) {
        const rect = canvas.getBoundingClientRect();
        let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        let y = ((event.clientY - rect.top) / rect.height) * -2 + 1; // Invert y-axis for WebGPU

        let ndcNear = new Float32Array([x, y, -1, 1]);
        let ndcFar = new Float32Array([x, y, 1, 1]);

        let worldNear =  mat4.transformPoint(mat4.inverse(viewProjectionMatrix), ndcNear);
        let worldFar =  mat4.transformPoint(mat4.inverse(viewProjectionMatrix), ndcFar);
        

        worldNear = new Float32Array([worldNear[0] / worldNear[3], worldNear[1] / worldNear[3], worldNear[2] / worldNear[3]]);
        worldFar = new Float32Array([worldFar[0] / worldFar[3], worldFar[1] / worldFar[3], worldFar[2] / worldFar[3]]);

        let rayDir = mat4.normalize([worldFar[0] - worldNear[0], worldFar[1] - worldNear[1], worldFar[2] - worldNear[2]]);
        return { origin: worldNear, direction: rayDir };
    }
    
    function raycastPlane(rayOrigin, rayDir, planePoint, planeNormal) {
        let denom = (rayDir[0] * planeNormal[0] + rayDir[1] * planeNormal[1] + rayDir[2]  * planeNormal[2]);
        if (Math.abs(denom) < 1e-6) return null;

        let diff = new Float32Array([planePoint[0] - rayOrigin[0], planePoint[1] - rayOrigin[1],planePoint[2] - rayOrigin[2]]);
        let t = (diff[0] * planeNormal[0] + diff[1] * planeNormal[1] + diff[2]  * planeNormal[2]) / denom;
        if (t < 0) return null;

        return new Float32Array([rayDir[0] * t + rayOrigin[0], rayDir[1]*t + rayOrigin[1],rayDir[2]*t + rayOrigin[2]]);
    }

    canvas.addEventListener("mousemove", (event) => {
       let ray = getRayFromMouse(event);
       let hitPoint = raycastPlane(ray.origin, ray.direction, [0,-depthVal,0], [0,1,0]);
       if (hitPoint) {
          //console.log(hitPoint);
          hitPoint[0] = Math.ceil((hitPoint[0] + surfaceSide/2)/waterSurface.spacing);
          hitPoint[2] = Math.ceil((hitPoint[2] + surfaceSide/2)/waterSurface.spacing);
          device.queue.writeBuffer(uniformBufferCursor, 0, hitPoint);
       }
       else device.queue.writeBuffer(uniformBufferCursor, 0, new Float32Array([100000000, 0, 100000000]));
    });
    //--
    
    //Render utils: bind group index and indirect draw buffer
    var bindIndex = 0;
    const drawValInit = new Uint32Array(5);
    drawValInit[0] = 6; //6 indices for each draw call
    drawValInit[1] = 0; //filled by compute shader
    drawValInit[2] = 0;
    drawValInit[3] = 0;
    drawValInit[4] = 0;
                                  
    async function render(){
        //update Time
        accumulatedTime += (currentTime - lastTime) / 1000.0;
        lastTime = currentTime;
        currentTime = (new Date).getTime();
        uniformValues[0]= 1/60; //accumulatedTime;
        device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
        device.queue.writeBuffer(uniformBufferRender, 0, viewProjectionMatrix)
        
        const canvasTexture = context.getCurrentTexture();
        renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
        
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
        {//particle pass
            const pass = encoder.beginComputePass();
            device.queue.writeBuffer(drawValues, 0, drawValInit, 0, drawValInit.length);
            pass.setPipeline(particlePipeline);
            pass.setBindGroup(0, bindGroupsParticles[bindIndex]);
            pass.dispatchWorkgroups(dispatchCountParticles[0]);
            pass.end();
        }
        {//compute pass
            const pass = encoder.beginComputePass();
            pass.setPipeline(compPipeline);
            pass.setBindGroup(0, bindGroupSimulation);
            pass.dispatchWorkgroups(dispatchCount[0]);
            pass.end();
        }
      
        {//graphics pass
            const pass = encoder.beginRenderPass(renderPassDescriptor);
            
            //Water surface
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroupRendering);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.setIndexBuffer(indexBuffer, 'uint32');
            
            pass.drawIndexed(waterSurface.index.length, 1);
            
            //Particles
            pass.setPipeline(pipelineRenderParticles);
            pass.setBindGroup(0, bindGroupsRenderParticles[bindIndex]);
            pass.setVertexBuffer(0, vertexBufferParticles);
            pass.setIndexBuffer(indexBufferParticles, 'uint32');
            
            pass.drawIndexedIndirect(drawValues, 0);
            pass.end();
        }
              
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
                      
        bindIndex = (bindIndex+1)%2;
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

