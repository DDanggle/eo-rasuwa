const MAX_ROUTE: usize = 96;
const PARTICLE_COUNT: usize = 280;
const STRIDE: usize = 3;

static mut ROUTE_LON: [f32; MAX_ROUTE] = [0.0; MAX_ROUTE];
static mut ROUTE_LAT: [f32; MAX_ROUTE] = [0.0; MAX_ROUTE];
static mut ROUTE_LEN: usize = 0;
static mut PHASE: [f32; PARTICLE_COUNT] = [0.0; PARTICLE_COUNT];
static mut LANE: [f32; PARTICLE_COUNT] = [0.0; PARTICLE_COUNT];
static mut PARTICLES: [f32; PARTICLE_COUNT * STRIDE] = [0.0; PARTICLE_COUNT * STRIDE];

fn hash01(mut value: u32) -> f32 {
    value ^= value >> 16;
    value = value.wrapping_mul(0x7feb_352d);
    value ^= value >> 15;
    value = value.wrapping_mul(0x846c_a68b);
    value ^= value >> 16;
    (value as f32) / (u32::MAX as f32)
}

#[unsafe(no_mangle)]
pub extern "C" fn set_route_point(index: u32, lon: f32, lat: f32) {
    let index = index as usize;
    if index >= MAX_ROUTE { return; }
    unsafe {
        ROUTE_LON[index] = lon;
        ROUTE_LAT[index] = lat;
        if index + 1 > ROUTE_LEN { ROUTE_LEN = index + 1; }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn clear_route() {
    unsafe { ROUTE_LEN = 0; }
}

#[unsafe(no_mangle)]
pub extern "C" fn reset(seed: u32) {
    unsafe {
        for index in 0..PARTICLE_COUNT {
            PHASE[index] = hash01(seed.wrapping_add(index as u32 * 7919));
            LANE[index] = hash01(seed.wrapping_add(index as u32 * 104_729)) * 2.0 - 1.0;
        }
    }
    step(0.0, 0.0);
}

#[unsafe(no_mangle)]
pub extern "C" fn step(dt_seconds: f32, speed: f32) {
    unsafe {
        if ROUTE_LEN < 2 { return; }
        let segments = (ROUTE_LEN - 1) as f32;
        for index in 0..PARTICLE_COUNT {
            PHASE[index] = (PHASE[index] + dt_seconds.max(0.0) * speed.max(0.0)).fract();
            let along = PHASE[index] * segments;
            let segment = (along.floor() as usize).min(ROUTE_LEN - 2);
            let local = along - segment as f32;
            let lon0 = ROUTE_LON[segment];
            let lat0 = ROUTE_LAT[segment];
            let lon1 = ROUTE_LON[segment + 1];
            let lat1 = ROUTE_LAT[segment + 1];
            let dx = lon1 - lon0;
            let dy = lat1 - lat0;
            let length = (dx * dx + dy * dy).sqrt().max(0.000_001);
            let lane_wave = (PHASE[index] * 31.4159 + LANE[index] * 3.0).sin();
            let offset = LANE[index] * 0.000_035 + lane_wave * 0.000_012;
            let base = index * STRIDE;
            PARTICLES[base] = lon0 + dx * local - (dy / length) * offset;
            PARTICLES[base + 1] = lat0 + dy * local + (dx / length) * offset;
            PARTICLES[base + 2] = 0.22 + (1.0 - (PHASE[index] * 2.0 - 1.0).abs()) * 0.78;
        }
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn particles_ptr() -> *const f32 {
    core::ptr::addr_of!(PARTICLES) as *const f32
}

#[unsafe(no_mangle)]
pub extern "C" fn particle_count() -> u32 {
    PARTICLE_COUNT as u32
}

#[unsafe(no_mangle)]
pub extern "C" fn abi_version() -> u32 { 1 }
