/** Lightweight 2D disc simulation; no scene geometry or video state is involved. */
export function resolveCollision(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const overlap = a.radius + b.radius - distance;
  if (overlap <= 0) return false;
  const nx = distance > 1e-8 ? dx / distance : 1;
  const ny = distance > 1e-8 ? dy / distance : 0;
  const inverseA = a.locked ? 0 : 1 / (a.radius * a.radius);
  const inverseB = b.locked ? 0 : 1 / (b.radius * b.radius);
  const inverseSum = inverseA + inverseB;
  if (!inverseSum) return false;
  a.x -= nx * overlap * inverseA / inverseSum;
  a.y -= ny * overlap * inverseA / inverseSum;
  b.x += nx * overlap * inverseB / inverseSum;
  b.y += ny * overlap * inverseB / inverseSum;
  const relative = ((b.locked ? 0 : b.vx) - (a.locked ? 0 : a.vx)) * nx
    + ((b.locked ? 0 : b.vy) - (a.locked ? 0 : a.vy)) * ny;
  if (relative < 0) {
    const impulse = -2 * relative / inverseSum; // Restitution = 1.
    a.vx -= impulse * inverseA * nx;
    a.vy -= impulse * inverseA * ny;
    b.vx += impulse * inverseB * nx;
    b.vy += impulse * inverseB * ny;
    a.hit = b.hit = .22;
  }
  return true;
}

export class BubbleWorld {
  constructor(count, width, random = Math.random) {
    if (!Number.isInteger(count) || count < 1 || !Number.isFinite(width) || width <= 0) {
      throw new RangeError('BubbleWorld requires a positive count and width');
    }
    this.width = width;
    this.random = random;
    const columns = width > 700 ? 4 : 2;
    const rows = Math.ceil(count / columns);
    const radius = Math.min(100, width / columns * .37);
    this.height = Math.max(radius * 3, rows * radius * 3.2 + 24);
    const homes = [];
    for (let row = 0; row < rows; row++) {
      const rowCount = Math.ceil((count - homes.length) / (rows - row));
      for (let column = 0; column < rowCount; column++) {
        homes.push({
          homeX: (column + .5) * width / rowCount,
          homeY: (row + .5) * this.height / rows,
          zoneHalfWidth: width / rowCount * .7,
          zoneHalfHeight: this.height / rows * .7,
        });
      }
    }
    this.bodies = Array.from({ length: count }, (_, index) => {
      const direction = random() * Math.PI * 2;
      const speed = .8 * (width > 700 ? 68 + random() * 37 : 35 + random() * 20);
      return {
        ...homes[index],
        x: homes[index].homeX + (random() - .5) * radius * .15,
        y: homes[index].homeY + (random() - .5) * radius * .15,
        vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
        radius, speed, direction, turnIn: 3 + random() * 6, locked: false, hit: 0,
      };
    });
  }

  steerHome(body, dt) {
    // Overlapping soft zones permit encounters without letting the whole group migrate together.
    const dx = (body.x - body.homeX) / body.zoneHalfWidth;
    const dy = (body.y - body.homeY) / body.zoneHalfHeight;
    const excursion = Math.hypot(dx, dy);
    if (excursion <= .55) return;
    const speed = Math.hypot(body.vx, body.vy);
    const angle = Math.atan2(body.vy, body.vx);
    const target = Math.atan2(-dy / body.zoneHalfHeight, -dx / body.zoneHalfWidth);
    const difference = Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
    const turn = 2.4 * Math.min(1, (excursion - .55) / .35) * dt;
    const heading = angle + Math.max(-turn, Math.min(turn, difference));
    body.vx = Math.cos(heading) * speed;
    body.vy = Math.sin(heading) * speed;
    body.direction = heading;
  }

  contain(body) {
    if (body.x < body.radius) { body.x = body.radius; body.vx = Math.abs(body.vx); }
    if (body.x > this.width - body.radius) { body.x = this.width - body.radius; body.vx = -Math.abs(body.vx); }
    if (body.y < body.radius) { body.y = body.radius; body.vy = Math.abs(body.vy); }
    if (body.y > this.height - body.radius) { body.y = this.height - body.radius; body.vy = -Math.abs(body.vy); }
  }

  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid simulation interval');
    const elapsed = Math.min(seconds, .05);
    const steps = Math.max(1, Math.ceil(elapsed * 120));
    const dt = elapsed / steps;
    for (let step = 0; step < steps; step++) {
      for (const body of this.bodies) {
        body.hit = Math.max(0, body.hit - dt);
        if (body.locked) continue;
        body.turnIn -= dt;
        if (body.turnIn <= 0) {
          body.direction = this.random() * Math.PI * 2;
          body.turnIn = 4 + this.random() * 6;
        }
        // A gentle steering force produces wandering paths between elastic impacts.
        body.vx += (Math.cos(body.direction) * body.speed - body.vx) * .08 * dt;
        body.vy += (Math.sin(body.direction) * body.speed - body.vy) * .08 * dt;
        this.steerHome(body, dt);
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        this.contain(body);
      }
      for (let iteration = 0; iteration < 4; iteration++) {
        for (let i = 0; i < this.bodies.length; i++) {
          for (let j = i + 1; j < this.bodies.length; j++) resolveCollision(this.bodies[i], this.bodies[j]);
        }
        this.bodies.forEach((body) => this.contain(body));
      }
    }
  }
}
