import * as CANNON from 'cannon-es';

/**
 * موتور فیزیک بازی (بدون وابستگی به three.js)
 * تمام منطق برخورد، آسیب و امتیاز اینجا انجام می‌شود تا بشود مستقل تست کرد.
 */

export const MATERIALS = {
  wood: {
    health: 115,
    density: 0.85,
    score: 150,
    color: 0xb5793a,
    debris: 0xb5793a,
    sound: 'wood',
  },
  stone: {
    health: 200,
    density: 1.9,
    score: 220,
    color: 0x959ba4,
    debris: 0x959ba4,
    sound: 'stone',
  },
  ice: {
    health: 55,
    density: 0.55,
    score: 120,
    color: 0x9fdff2,
    debris: 0x9fdff2,
    sound: 'ice',
  },
};

export const PIG = {
  health: 65,
  radius: 0.8,
  score: 900,
};

export const BIRD = {
  radius: 0.55,
  mass: 5,
};

const GRAVITY = -20;

export class PhysWorld {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.solver.iterations = 14;
    this.world.solver.tolerance = 0.001;
    this.world.defaultContactMaterial.friction = 0.45;
    this.world.defaultContactMaterial.restitution = 0.04;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
    this.world.defaultContactMaterial.contactEquationRelaxation = 4;

    this.entities = [];
    this.bird = null;
    this.maxBirdImpact = 0;
    // اجسامی که باید بعد از پایان گام فیزیک حذف شوند
    this._pendingRemoval = [];

    // callbackها را بازی مقداردهی می‌کند
    this.onBlockBroken = null; // (entity) => void
    this.onPigKilled = null; // (entity) => void
    this.onImpact = null; // (entity, speed, position) => void

    this._groundMaterial = new CANNON.Material('ground');

    const ground = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this._groundMaterial,
    });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    ground.entity = { kind: 'ground', alive: true };
    this.world.addBody(ground);
    this.ground = ground;
  }

  /** @returns {object} entity */
  addBlock(def) {
    const type = MATERIALS[def.mat] ? def.mat : 'wood';
    const mat = MATERIALS[type];
    const w = def.w;
    const h = def.h;
    const d = def.d;
    const volume = w * h * d;
    const mass = Math.max(0.45, volume * mat.density);

    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
      position: new CANNON.Vec3(def.x, def.y, def.z),
    });
    if (def.ry) {
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), def.ry);
    }
    body.linearDamping = 0.02;
    body.angularDamping = 0.12;
    body.sleepSpeedLimit = 0.45;
    body.sleepTimeLimit = 0.7;

    const sizeFactor = Math.min(1.3, Math.max(0.75, volume / 3.2));
    const ent = {
      kind: 'block',
      type,
      body,
      w,
      h,
      d,
      ry: def.ry || 0,
      health: mat.health * sizeFactor * (def.hp || 1),
      maxHealth: mat.health * sizeFactor * (def.hp || 1),
      alive: true,
      score: mat.score,
    };
    body.entity = ent;
    body.addEventListener('collide', (e) => this._onCollide(ent, e));
    this.world.addBody(body);
    this.entities.push(ent);
    return ent;
  }

  addPig(def) {
    const r = def.r || PIG.radius;
    const body = new CANNON.Body({
      mass: 1.6 * (r / PIG.radius) ** 2,
      shape: new CANNON.Sphere(r),
      position: new CANNON.Vec3(def.x, def.y, def.z),
    });
    body.linearDamping = 0.05;
    body.angularDamping = 0.45;
    body.sleepSpeedLimit = 0.5;
    body.sleepTimeLimit = 0.8;

    const ent = {
      kind: 'pig',
      body,
      r,
      health: PIG.health * (r / PIG.radius),
      maxHealth: PIG.health * (r / PIG.radius),
      alive: true,
      score: Math.round(PIG.score * (r / PIG.radius)),
      hurtFlash: 0,
    };
    body.entity = ent;
    body.addEventListener('collide', (e) => this._onCollide(ent, e));
    this.world.addBody(body);
    this.entities.push(ent);
    return ent;
  }

  /** پرنده را از نقطه‌ای با سرعت اولیه شلیک می‌کند */
  launchBird(position, velocity) {
    const body = new CANNON.Body({
      mass: BIRD.mass,
      shape: new CANNON.Sphere(BIRD.radius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    body.velocity.set(velocity.x, velocity.y, velocity.z);
    body.linearDamping = 0.005;
    body.angularDamping = 0.3;
    body.angularVelocity.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
    );
    body.sleepSpeedLimit = 0.7;
    body.sleepTimeLimit = 0.6;

    const ent = {
      kind: 'bird',
      body,
      alive: true,
      r: BIRD.radius,
      radius: BIRD.radius,
    };
    body.entity = ent;
    body.addEventListener('collide', (e) => {
      const speed = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (speed > this.maxBirdImpact) this.maxBirdImpact = speed;
      if (speed > 4 && this.onImpact) this.onImpact(ent, speed, body.position);
    });
    this.world.addBody(body);
    this.entities.push(ent);
    this.bird = ent;
    return ent;
  }

  removeEntity(ent) {
    if (!ent || !ent.alive) return;
    ent.alive = false;
    if (this.bird === ent) this.bird = null;
    if (ent.body) this._pendingRemoval.push(ent.body);
  }

  clear() {
    for (const ent of this.entities) {
      ent.alive = false;
      if (ent.body) this.world.removeBody(ent.body);
    }
    this.entities.length = 0;
    this._pendingRemoval.length = 0;
    this.bird = null;
  }

  get pigsAlive() {
    return this.entities.filter((e) => e.kind === 'pig' && e.alive);
  }

  get blocksAlive() {
    return this.entities.filter((e) => e.kind === 'block' && e.alive);
  }

  _onCollide(ent, event) {
    if (!ent.alive) return;
    const speed = Math.abs(event.contact.getImpactVelocityAlongNormal());
    if (speed < 2.6) return;

    const other = event.body;
    const otherMass = other.mass > 0 ? Math.min(other.mass, 12) : 4;
    const factor = 0.6 + 0.16 * otherMass;

    if (ent.kind === 'pig') {
      if (speed < 3.2) return;
      const dmg = (speed - 3.2) * factor * 9.5;
      ent.health -= dmg;
      ent.hurtFlash = 1;
      if (this.onImpact) this.onImpact(ent, speed, ent.body.position);
      if (ent.health <= 0) this._killPig(ent);
    } else if (ent.kind === 'block') {
      if (speed < 3.2) return;
      const dmg = (speed - 3.2) * factor * 15;
      ent.health -= dmg;
      if (this.onImpact) this.onImpact(ent, speed, ent.body.position);
      if (ent.health <= 0) this._breakBlock(ent);
    }
  }

  _breakBlock(ent) {
    if (!ent.alive) return;
    ent.alive = false;
    // حذف بدنه تا پایان گام به تعویق می‌افتد تا برخوردهای درون‌گامی خراب نشوند
    this._pendingRemoval.push(ent.body);
    if (this.onBlockBroken) this.onBlockBroken(ent);
  }

  _killPig(ent) {
    if (!ent.alive) return;
    ent.alive = false;
    this._pendingRemoval.push(ent.body);
    if (this.onPigKilled) this.onPigKilled(ent);
  }

  step(dt) {
    this.world.step(1 / 60, Math.min(dt, 0.1), 4);
    if (this._pendingRemoval.length) {
      for (const body of this._pendingRemoval) {
        this.world.removeBody(body);
      }
      this._pendingRemoval.length = 0;
    }
    for (const ent of this.entities) {
      if (ent.kind === 'pig' && ent.alive && ent.hurtFlash > 0) {
        ent.hurtFlash = Math.max(0, ent.hurtFlash - dt * 2.2);
      }
    }
  }
}
