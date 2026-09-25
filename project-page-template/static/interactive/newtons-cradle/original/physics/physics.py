#!/usr/bin/env python3
"""Deterministic SI-unit models for eight diagnostic video-conditioning experiments."""

import json
import math
from pathlib import Path

import numpy as np
from scipy.integrate import solve_ivp
from scipy.special import ellipj, ellipk

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text())
DURATION = CONFIG["frames"] / CONFIG["fps"]
TIMES = np.arange(round(DURATION * CONFIG["simulation_fps"]) + 1) / CONFIG["simulation_fps"]
G = 9.81


def ode(rhs, initial):
    result = solve_ivp(rhs, (0, DURATION), initial, t_eval=TIMES,
                       method="DOP853", rtol=1e-10, atol=1e-12, max_step=1 / 240)
    if not result.success:
        raise RuntimeError(result.message)
    return result.y.T


def rolling():
    angle, radius, time_scale, release = .28, .22, 2.5, 0.
    accelerations = [G * math.sin(angle)] * 2
    samples = []
    for t in TIMES:
        tau = max(0, (t - release) / time_scale)
        distances = [.5 * a * tau * tau for a in accelerations]
        positions = [[-2.8 + s * math.cos(angle) + radius * math.sin(angle),
                      2.1 - s * math.sin(angle) + radius * math.cos(angle), z]
                     for s, z in zip(distances, [.8, -.8])]
        samples.append({"t": float(t), "positions": positions, "distance": distances,
                        "rotation": [0., 0.],
                        "speed": [a * tau for a in accelerations]})
    return {
        "id": "rolling-inertia", "title": "Solid sphere vs hollow sphere / frictionless sliding",
        "model": "Frictionless sliding of nonspinning spheres on identical inclines",
        "assumptions": ["Perfectly smooth identical inclines; friction coefficient zero and no air drag",
                        "2.5x slow-motion presentation; physical gravity remains 9.81 m/s^2",
                        "Both spheres start without spin; normal force and gravity exert no torque about their centers",
                        "Tracking marks are surface color only, with no protruding geometry or added inertia",
                        "Simultaneous release at the first frame; no invisible hold during the video"],
        "parameters": {"incline": angle, "radius": radius, "time_scale": time_scale,
                       "accelerations": accelerations, "release": release, "static_friction": 0.},
        "checks": {"acceleration_ratio": accelerations[0] / accelerations[1],
                   "expected_ratio": 1., "maximum_distance": samples[-1]["distance"][0],
                   "maximum_height_difference": max(abs(r["positions"][0][1] - r["positions"][1][1]) for r in samples)},
        "observables": ["Both spheres slide at identical speed and remain at exactly the same height",
                        "Surface markings do not rotate: this is frictionless sliding, not rolling",
                        "Neither sphere reaches the end of its track before the final frame"],
        "prompt": "A slow-motion laboratory demonstration in one continuous shot. An opaque solid brass sphere and a translucent thin-walled blue hollow sphere of equal radius are released together from the same height on two identical perfectly smooth, frictionless inclined tracks. They SLIDE without spinning, with the same gravitational acceleration, the same speed and the same height at every moment. Their painted markings retain their orientation. Neither reaches the bottom before the end of the shot. Use a fixed level near-orthographic view so their equal heights are visually clear. Do not make the solid ball lead and do not animate rolling.",
        "samples": samples,
    }


def cradle_elastic(dt=1 / 192000):
    n, length, radius = 5, 1.35, .18
    density, young_modulus, poisson = 7850., 200e9, .3
    mass = density * 4 / 3 * math.pi * radius ** 3
    effective_modulus = young_modulus / (2 * (1 - poisson ** 2))
    stiffness = 4 / 3 * effective_modulus * math.sqrt(radius / 2)
    pivots = np.array([(i - 2) * 2 * radius for i in range(n)])
    cable_radius, anchor_depth = .003, .13
    loaded_length = math.hypot(length, anchor_depth)
    cable_area = math.pi * cable_radius ** 2
    cable_stiffness = young_modulus * cable_area / loaded_length
    rest_length = loaded_length - mass * G * loaded_length / (2 * cable_stiffness * length)
    angles = np.array([-.55, 0., 0., 0., 0.])
    position = np.column_stack([pivots + length * np.sin(angles), 2.1 - length * np.cos(angles)])
    velocity = np.zeros((n, 2))

    def dynamics(points):
        dx, dy = np.diff(points[:, 0]), np.diff(points[:, 1])
        distance = np.sqrt(dx * dx + dy * dy)
        overlap = np.maximum(0, 2 * radius - distance)
        force = stiffness * overlap ** 1.5
        fx, fy = np.zeros(n), np.zeros(n)
        cx, cy = force * dx / distance, force * dy / distance
        fx[:-1] -= cx
        fy[:-1] -= cy
        fx[1:] += cx
        fy[1:] += cy
        toward_anchor = np.column_stack([pivots - points[:, 0], 2.1 - points[:, 1]])
        cable_lengths = np.sqrt(np.sum(toward_anchor ** 2, axis=1) + anchor_depth ** 2)
        extension = np.maximum(0, cable_lengths - rest_length)
        tension = cable_stiffness * extension
        cable_forces = 2 * tension[:, None] * toward_anchor / cable_lengths[:, None]
        forces = np.column_stack([fx, fy - mass * G]) + cable_forces
        potential = mass * G * np.sum(points[:, 1] - (2.1 - length))
        potential += stiffness / 2.5 * np.sum(overlap ** 2.5) + cable_stiffness * np.sum(extension ** 2)
        return forces / mass, float(potential), float(overlap.max()), tension, cable_lengths

    samples, max_overlap, energies = [], 0., []
    maximum_tension, slack_steps = 0., 0
    acceleration = dynamics(position)[0]
    steps_per_sample = round(1 / (CONFIG["simulation_fps"] * dt))
    for index, t in enumerate(TIMES):
        if index:
            for _ in range(steps_per_sample):
                velocity += acceleration * (dt / 2)
                position += velocity * dt
                dynamics_result = dynamics(position)
                acceleration = dynamics_result[0]
                maximum_tension = max(maximum_tension, float(dynamics_result[3].max()))
                slack_steps += int(np.any(dynamics_result[3] == 0))
                velocity += acceleration * (dt / 2)
        _, potential, overlap, tension, cable_lengths = dynamics(position)
        energy = .5 * mass * float(np.sum(velocity * velocity)) + potential
        energies.append(energy)
        max_overlap = max(max_overlap, overlap)
        relative = position - np.column_stack([pivots, np.full(n, 2.1)])
        theta = np.arctan2(relative[:, 0], -relative[:, 1])
        omega = (relative[:, 0] * velocity[:, 1] - relative[:, 1] * velocity[:, 0]) / np.sum(relative ** 2, axis=1)
        samples.append({"t": float(t), "theta": theta.tolist(), "omega": omega.tolist(),
                        "positions": [[float(a), float(b), 0] for a, b in position],
                        "velocity": velocity.tolist(), "cable_tension": tension.tolist(),
                        "cable_lengths": cable_lengths.tolist(), "energy": energy})
    drift = max(abs(e - energies[0]) for e in energies) / energies[0]
    if drift > .0002 or max_overlap > .002:
        raise ValueError(f"Cradle integration failed: energy drift={drift}, overlap={max_overlap}")
    if maximum_tension / cable_area > 1.5e9:
        raise ValueError("Suspension exceeds the declared cable tensile-strength limit")
    return {
        "id": "newtons-cradle", "title": "Newton's cradle: one in, one out",
        "model": "Cartesian sphere dynamics with Hertz contacts and elastic tension-only bifilar cables; velocity Verlet",
        "assumptions": ["Identical homogeneous steel spheres; elastic frictionless normal contacts",
                        "Mass and Hertz stiffness derived from radius, density, Young modulus and Poisson ratio",
                        "Cables obey unilateral Hooke tension; they may stretch or go slack, never push",
                        "Cable inertia is neglected; combined cable mass is approximately 0.31% of each ball mass",
                        "No tangential contact friction or spin; suspension forces act through mass centers",
                        "Small elastic contact flattening and slack-cable length are visualized; not a full continuum solution"],
        "parameters": {"length": length, "radius": radius, "mass": mass,
                       "pivots_x": pivots.tolist(), "dt": dt, "contact_stiffness": stiffness,
                       "density": density, "young_modulus": young_modulus, "poisson_ratio": poisson},
        "checks": {"relative_energy_drift": drift, "maximum_overlap_m": max_overlap,
                   "far_ball_peak_angle": max(abs(r["theta"][-1]) for r in samples),
                   "maximum_cable_tension_N": maximum_tension, "slack_microsteps": slack_steps,
                   "maximum_cable_stress_Pa": maximum_tension / cable_area,
                   "cable_forces_nonnegative": True},
        "observables": ["Contact occurs before the far sphere reacts", "Motion transfers primarily to the far end",
                        "Intermediate balls do not travel with the incoming ball as a rigid row"],
        "prompt": "A close laboratory shot of a five-ball Newton's cradle. Five identical steel spheres hang in a straight contacting row from equal-length suspension wires. The leftmost sphere starts displaced to the left and is released. It strikes the row; motion transfers through the contacting spheres and primarily the rightmost sphere swings outward. The motion returns in subsequent collisions. Preserve the ball count, wire lengths and causal order. Use a fixed camera with all five balls and their complete swings visible.",
        "samples": samples,
        "cable_parameters": {"radius": cable_radius, "rest_length": rest_length,
                             "stiffness": cable_stiffness, "anchor_depth": anchor_depth,
                             "tensile_strength_limit_Pa": 1.5e9},
    }


def cradle():
    length, radius, amplitude, mass = 1.35, .18, .55, 1.
    pivots = [(i - 2) * 2 * radius for i in range(5)]
    k = math.sin(amplitude / 2)
    frequency = math.sqrt(G / length)
    quarter = float(ellipk(k * k) / frequency)
    contact_angular_speed = 2 * k * frequency
    cable_length = math.hypot(length, .13)
    samples = []
    energy = mass * G * length * (1 - math.cos(amplitude))
    for t in TIMES:
        theta, omega = np.zeros(5), np.zeros(5)
        if t < quarter:
            sn, cn, _, _ = ellipj(ellipk(k * k) - frequency * t, k * k)
            active = 0
            theta[0] = -2 * math.asin(k * sn)
            omega[0] = 2 * k * frequency * cn
        else:
            phase = t - quarter
            leg = math.floor(phase / (2 * quarter))
            elapsed = phase - leg * 2 * quarter
            active, sign = (4, 1) if leg % 2 == 0 else (0, -1)
            sn, cn, _, _ = ellipj(frequency * elapsed, k * k)
            theta[active] = sign * 2 * math.asin(k * sn)
            omega[active] = sign * 2 * k * frequency * cn
        positions = [[pivots[i] + length * math.sin(a), 2.1 - length * math.cos(a), 0]
                     for i, a in enumerate(theta)]
        tension = mass * (G * np.cos(theta) + length * omega ** 2) * cable_length / (2 * length)
        actual_energy = float(.5 * mass * length ** 2 * np.sum(omega ** 2)
                              + mass * G * length * np.sum(1 - np.cos(theta)))
        samples.append({"t": float(t), "theta": theta.tolist(), "omega": omega.tolist(),
                        "positions": positions, "active_ball": active,
                        "cable_tension": tension.tolist(), "cable_lengths": [cable_length] * 5,
                        "energy": actual_energy})
    events = []
    index = 0
    while quarter + 2 * quarter * index <= DURATION:
        sign = 1 if index % 2 == 0 else -1
        velocity = sign * length * contact_angular_speed
        before, after = [0.] * 5, [0.] * 5
        before[0 if sign == 1 else 4] = velocity
        after[4 if sign == 1 else 0] = velocity
        events.append({"time": quarter + 2 * quarter * index,
                       "before_velocities": before, "after_velocities": after,
                       "interface_impulse_magnitude": mass * abs(velocity)})
        index += 1
    return {
        "id": "newtons-cradle", "title": "Newton's cradle / ideal one in, one out",
        "model": "Ideal instantaneous elastic impulse transfer with exact nonlinear outer-pendulum arcs",
        "model_type": "ideal-instant-contact",
        "assumptions": ["Five equal masses, perfectly elastic zero-duration contact and inextensible massless suspension",
                        "The impulse is transmitted through all contacting interfaces; equal incoming/outgoing impulses leave each middle mass at rest",
                        "This is an explicitly idealized limit, not the previous finite-duration Hertz/elastic-cable model",
                        "Momentum conservation alone is insufficient; the selected ideal solution also conserves kinetic energy"],
        "parameters": {"length": length, "radius": radius, "mass": mass, "amplitude": amplitude,
                       "pivots_x": pivots, "quarter_period": quarter},
        "cable_parameters": {"radius": .003, "rest_length": cable_length, "anchor_depth": .13,
                             "kind": "ideal-inextensible"},
        "checks": {"maximum_middle_displacement": 0.,
                   "maximum_energy_residual": max(abs(r["energy"] - energy) for r in samples),
                   "event_count": len(events)},
        "events": events,
        "observables": ["The middle three spheres remain stationary throughout",
                        "Only the first and last sphere exchange motion at contact",
                        "Each ideal impact conserves horizontal momentum and kinetic energy"],
        "prompt": "A fixed close laboratory shot of an IDEAL five-ball Newton's cradle. Five equal-size, equal-mass spheres touch in a straight row on identical suspension lengths. The leftmost ball begins displaced to the left and is released. Under perfectly elastic instantaneous contact, it stops at the row while the rightmost ball takes its motion. The rightmost swings out and back, then transfers motion to the leftmost. The MIDDLE THREE SPHERES remain completely stationary at all times; only the two outer balls swing. Preserve the frame, five balls and all suspension connections. This shot intentionally depicts the ideal collision limit, without finite-contact vibration of the middle balls.",
        "samples": samples,
    }


def recoil():
    heavy, light, stiffness, compression, separation, release = 3., 1., 2.4, .25, .9, 0.
    wheel_radius = .12
    wheel_masses = [.3, .1]
    rotational_masses = [.5 * value for value in wheel_masses]
    effective_masses = [heavy + rotational_masses[0], light + rotational_masses[1]]
    reduced = effective_masses[0] * effective_masses[1] / sum(effective_masses)
    omega = math.sqrt(stiffness / reduced)
    contact_duration = math.pi / (2 * omega)
    samples = []
    for t in TIMES:
        tau = max(0., float(t) - release)
        if tau < contact_duration:
            q = separation + compression * (1 - math.cos(omega * tau))
            speed = compression * omega * math.sin(omega * tau)
            relative_acceleration = compression * omega ** 2 * math.cos(omega * tau)
        else:
            speed = compression * omega
            q = separation + compression + speed * (tau - contact_duration)
            relative_acceleration = 0.
        positions = [-light / (heavy + light) * q, heavy / (heavy + light) * q]
        velocities = [-light / (heavy + light) * speed, heavy / (heavy + light) * speed]
        accelerations = [-light / (heavy + light) * relative_acceleration,
                         heavy / (heavy + light) * relative_acceleration]
        friction = [-inertia * acceleration for inertia, acceleration in zip(rotational_masses, accelerations)]
        energy = .5 * sum(m * v * v for m, v in zip(effective_masses, velocities))
        energy += .5 * stiffness * max(0, separation + compression - q) ** 2
        samples.append({"t": float(t), "x": positions, "velocity": velocities,
                        "spring_length": min(q - .7, separation + compression - .7),
                        "momentum": heavy * velocities[0] + light * velocities[1],
                        "center_of_mass": (heavy * positions[0] + light * positions[1]) / (heavy + light),
                        "acceleration": accelerations, "wheel_friction": friction, "energy": energy})
    return {
        "id": "spring-recoil", "title": "Unequal-mass carts and spring recoil",
        "model": "Exact spring release with finite uniform-disk wheel inertia and no-slip rolling, followed by coasting",
        "assumptions": ["Total moving masses 3 kg and 1 kg, including wheels and loads",
                        "Identical 0.6 kg load blocks; nonrotating chassis masses 0.9 kg and 0.3 kg",
                        "Four uniform-disk wheels per cart; total wheel masses 0.3 kg and 0.1 kg",
                        "Equal wheel-inertia/total-mass fractions preserve the 3:1 speed ratio and cancel net rail friction",
                        "Ideal massless spring, lossless axle bearings; static friction coefficient 0.3",
                        "Rendered wire diameter and centerline length remain constant; coil pitch opens naturally rather than stretching the wire",
                        "Internal finite-mass spring vibrations are outside this ideal release model"],
        "parameters": {"masses": [heavy, light], "stiffness": stiffness, "compression": compression,
                       "release": release, "separation_time": release + contact_duration,
                       "wheel_radius": wheel_radius, "wheel_masses": wheel_masses,
                       "rotational_equivalent_masses": rotational_masses,
                       "effective_masses": effective_masses, "static_friction": .3,
                       "load_block_mass": .6, "nonrotating_chassis_masses": [.9, .3]},
        "checks": {"maximum_momentum_error": max(abs(r["momentum"]) for r in samples),
                   "maximum_com_motion": max(abs(r["center_of_mass"]) for r in samples),
                   "energy_error": max(abs(r["energy"] - .5 * stiffness * compression ** 2) for r in samples),
                   "maximum_net_rail_friction": max(abs(sum(r["wheel_friction"])) for r in samples),
                   "required_static_friction": max(abs(force) / (mass * G)
                       for r in samples for force, mass in zip(r["wheel_friction"], [heavy, light]))},
        "observables": ["Opposite motion begins together", "Lighter cart coasts three times as fast",
                        "Mass-weighted center stays fixed; spring does not keep stretching after release"],
        "prompt": "A laboratory demonstration on a straight horizontal low-friction track. A heavy blue cart carrying three identical weights and a light orange cart carrying one weight start at rest with a compressed spring between them. Release the spring and let the carts separate. The light cart moves three times as fast as the heavy cart in the opposite direction; both continue coasting without hitting the track ends. The spring relaxes and loses contact rather than stretching between the separating carts. Use a stable wide camera showing both complete trajectories.",
        "samples": samples,
    }


def coupled():
    length, mass, stiffness, spacing = .8, .2, 1., 1.6
    def rhs(_, state):
        a, b, va, vb = state
        pa = np.array([-spacing / 2 + length * math.sin(a), 2.0 - length * math.cos(a)])
        pb = np.array([spacing / 2 + length * math.sin(b), 2.0 - length * math.cos(b)])
        delta = pb - pa
        distance = float(np.linalg.norm(delta))
        force = stiffness * (distance - spacing) * delta / distance
        aa = -G / length * math.sin(a) + float(force @ np.array([math.cos(a), math.sin(a)])) / (mass * length)
        ab = -G / length * math.sin(b) - float(force @ np.array([math.cos(b), math.sin(b)])) / (mass * length)
        return va, vb, aa, ab
    states = ode(rhs, [.42, 0, 0, 0])
    samples, energies = [], []
    for t, (a, b, va, vb) in zip(TIMES, states):
        positions = [[-spacing / 2 + length * math.sin(a), 2 - length * math.cos(a), 0],
                     [spacing / 2 + length * math.sin(b), 2 - length * math.cos(b), 0]]
        spring_extension = math.dist(positions[0], positions[1]) - spacing
        energy = .5 * mass * length ** 2 * (va * va + vb * vb) + mass * G * length * (2 - math.cos(a) - math.cos(b)) + .5 * stiffness * spring_extension ** 2
        energies.append(energy)
        samples.append({"t": float(t), "theta": [a, b], "omega": [va, vb], "positions": positions, "energy": energy})
    drift = max(abs(e - energies[0]) for e in energies) / energies[0]
    if drift > 1e-7:
        raise ValueError("Coupled-pendulum energy drift")
    return {
        "id": "coupled-pendulums", "title": "Energy exchange between coupled pendulums",
        "model": "Nonlinear gravity pendulums coupled by an actual spring force between their bobs",
        "assumptions": ["Identical rigid pendulums and massless Hookean coupling spring", "No damping"],
        "parameters": {"length": length, "mass": mass, "stiffness": stiffness, "spacing": spacing,
                       "initial_angles": [.42, 0]},
        "checks": {"relative_energy_drift": float(drift)},
        "observables": ["Initially only one bob is displaced", "Oscillation amplitude transfers to the other bob",
                        "The coupling spring stays attached and its length follows the bob separation"],
        "prompt": "Two identical pendulums hang side by side in a laboratory, their bobs connected by a light horizontal spring. Initially the orange left bob is displaced while the blue right bob is at its equilibrium position. Release them. Oscillation energy gradually transfers between the two pendulums: one becomes quieter as the other gains amplitude. Their phases and spring extension evolve continuously. Keep both supports, rods, bobs and the connecting spring visible in a fixed shot.",
        "samples": samples,
    }


def resonance():
    mass, frequencies, damping, amplitude, drive = .5, np.array([8., 10., 12.]), .08, .02, 10.
    def rhs(t, state):
        displacement, velocity = state[:3], state[3:]
        base_acceleration = amplitude * drive * drive * math.cos(drive * t)
        acceleration = -frequencies ** 2 * displacement - damping / mass * velocity - base_acceleration
        return np.concatenate([velocity, acceleration])
    states = ode(rhs, np.zeros(6))
    samples = []
    for t, state in zip(TIMES, states):
        base = amplitude * (1 - math.cos(drive * t))
        equilibrium_lengths = .7 + G / frequencies ** 2
        y = 2.3 + base - equilibrium_lengths + state[:3]
        samples.append({"t": float(t), "base": base, "relative_displacement": state[:3].tolist(),
                        "relative_velocity": state[3:].tolist(), "y": y.tolist(), "drive_phase": float(drive * t)})
    tail = np.asarray([r["relative_displacement"] for r in samples if r["t"] >= 3])
    rms = np.sqrt(np.mean(tail * tail, axis=0))
    if rms[1] < 2 * max(rms[0], rms[2]):
        raise ValueError("Resonance is not physically distinguishable")
    return {
        "id": "driven-resonance", "title": "Three oscillators, one resonant response",
        "model": "Base-excited linear spring-mass-damper ODEs, solved with identical drive",
        "assumptions": ["Hookean springs, linear damping, external motor supplies energy"],
        "parameters": {"mass": mass, "natural_frequencies": frequencies.tolist(), "drive": drive,
                       "damping": damping, "base_amplitude": amplitude},
        "checks": {"late_rms_amplitudes": rms.tolist()},
        "observables": ["All three supports have exactly the same drive",
                        "Only the matched middle oscillator builds a large response", "Phase lag is not identical"],
        "prompt": "Three vertical spring-and-mass oscillators are mounted side by side on one mechanically driven support bar. The equal masses have different spring stiffnesses. The bar moves with one steady small-amplitude periodic drive. The middle system is resonant and its oscillation builds much larger than its neighbors, with physically consistent phase lag and spring extension. Show the complete masses and springs throughout the shot with a fixed camera. Do not synchronize all three mass motions.",
        "samples": samples,
    }


def wave():
    periods = np.linspace(1.20, 1.76, 8)
    lengths = G * (periods / (2 * math.pi)) ** 2
    def rhs(_, state):
        return np.concatenate([state[8:], -G / lengths * np.sin(state[:8])])
    states = ode(rhs, np.concatenate([np.full(8, .45), np.zeros(8)]))
    samples = []
    for t, state in zip(TIMES, states):
        positions = [[(i - 3.5) * .5, 1.6 - length * math.cos(a), length * math.sin(a)]
                     for i, (length, a) in enumerate(zip(lengths, state[:8]))]
        samples.append({"t": float(t), "theta": state[:8].tolist(), "omega": state[8:].tolist(), "positions": positions})
    return {
        "id": "pendulum-wave", "title": "Pendulum wave from unequal lengths",
        "model": "Eight independent nonlinear simple pendulums",
        "assumptions": ["Equal initial angles, simultaneous release, no coupling or damping"],
        "parameters": {"lengths": lengths.tolist(), "small_angle_periods": periods.tolist(),
                       "initial_angle": .45},
        "checks": {"rod_lengths_m": lengths.tolist()},
        "observables": ["Rod lengths remain fixed", "Different lengths lead to evolving phases, not rigid synchronization",
                        "The apparent wave comes from the independent pendulums"],
        "prompt": "Eight pendulums of gradually increasing length hang in a row from a rigid frame. Release all of them from the same initial angle. Their differing natural periods create a changing wave-like phase pattern as they continue swinging. Each bob stays attached to its own fixed-length suspension; the supports remain stationary. Use a slightly elevated oblique view that clearly reveals the individual swings and their depth differences.",
        "samples": samples,
    }


def mirror():
    samples = []
    for t in TIMES:
        delta = .14 * math.sin(1.2 * float(t))
        angle = math.pi / 4 + delta
        normal = np.array([-math.cos(angle), 0, math.sin(angle)])
        incident = np.array([1., 0, 0])
        reflected = incident - 2 * float(incident @ normal) * normal
        hit = reflected * (2.4 / reflected[2])
        hit[1] = .8
        samples.append({"t": float(t), "angle": angle, "delta": delta,
                        "normal": normal.tolist(), "reflected": reflected.tolist(), "screen_hit": hit.tolist()})
    error = max(abs(math.atan2(r["reflected"][0], r["reflected"][2]) - 2 * r["delta"]) for r in samples)
    return {
        "id": "rotating-mirror", "title": "Mirror rotation doubles reflected angle",
        "model": "Exact geometric reflection r=d-2(d dot n)n",
        "assumptions": ["Fixed incident laser direction; mirror rotates in the plane of incidence",
                        "A small amount of scattering makes beam paths visible"],
        "parameters": {"screen_z": 2.4, "angle_amplitude": .14, "angular_frequency": 1.2},
        "checks": {"maximum_double_angle_error_rad": error},
        "observables": ["Incident beam stays fixed", "Reflected direction changes twice as much as the mirror",
                        "Screen spot moves to the actual ray intersection"],
        "prompt": "A tabletop optics experiment with a fixed narrow laser beam striking a slowly rotating small plane mirror. The incident beam remains stationary. As the mirror turns in the plane of incidence, the reflected beam turns through twice the angular change and its spot sweeps across a fixed frosted translucent receiving screen. Show the source, mirror, visible beam path and screen together. Motion is continuous throughout the shot; apparatus positions do not drift.",
        "samples": samples,
    }


def tir():
    n1, n2, radius = 1.5, 1., 1.3
    samples = []
    for t in TIMES:
        angle = math.radians(28 + 30 * float(t) / DURATION)
        s, c = math.sin(angle), math.cos(angle)
        transmitted_sine = n1 / n2 * s
        if transmitted_sine < 1:
            transmitted_cosine = math.sqrt(1 - transmitted_sine ** 2)
            rs = ((n1 * c - n2 * transmitted_cosine) / (n1 * c + n2 * transmitted_cosine)) ** 2
            rp = ((n1 * transmitted_cosine - n2 * c) / (n1 * transmitted_cosine + n2 * c)) ** 2
            reflectance = (rs + rp) / 2
            transmitted = [transmitted_cosine, 0., transmitted_sine]
        else:
            reflectance = 1.
            transmitted = None
        samples.append({"t": float(t), "angle": angle, "origin": [-2 * c, .7, -2 * s],
                        "entry": [-radius * c, .7, -radius * s], "incident": [c, 0., s],
                        "reflected": [-c, 0., s], "transmitted": transmitted,
                        "reflectance": reflectance, "transmittance": 1 - reflectance})
    critical = math.asin(n2 / n1)
    return {
        "id": "total-internal-reflection", "title": "Crossing the critical angle",
        "model": "Snell refraction and unpolarized Fresnel power coefficients at glass-air interface",
        "assumptions": ["Ideal lossless glass; radial entry through a semicircular block",
                        "Only principal optical branches shown; weak secondary surface reflections omitted",
                        "Beam geometry is quasi-static; light is not animated as travelling slowly"],
        "parameters": {"n_glass": n1, "n_air": n2, "radius": radius, "critical_angle": critical},
        "checks": {"critical_angle_degrees": math.degrees(critical),
                   "maximum_power_balance_error": max(abs(r["reflectance"] + r["transmittance"] - 1) for r in samples)},
        "observables": ["Refracted ray bends away from the normal", "It approaches grazing at the critical angle",
                        "Beyond critical angle no propagating transmitted beam remains; reflection stays active"],
        "prompt": "A laboratory optics demonstration with a transparent semicircular glass block. A laser source moves slowly around the curved side and always points radially toward the center, entering the curved surface normally. At the flat glass-to-air face the incidence angle steadily increases. The outgoing refracted ray approaches the surface, while reflection grows; beyond the critical angle the transmitted beam disappears and total internal reflection remains. Keep the glass fixed and all changes continuous, with a camera that clearly shows both optical branches.",
        "samples": samples,
    }


def main():
    directory = ROOT / "trajectories"
    directory.mkdir(exist_ok=True)
    manifest = []
    for make in (rolling, cradle, recoil, coupled, resonance, wave, mirror, tir):
        record = make()
        samples = record.pop("samples")
        record["prompt"] = ("A photorealistic physics demonstration with coherent rigid geometry, "
                            "stable apparatus and no titles or overlays. " + record["prompt"])
        record["video"] = CONFIG
        record["duration"] = DURATION
        record["trajectory"] = f"trajectories/{record['id']}.json"
        (directory / f"{record['id']}.json").write_text(json.dumps({"fps": CONFIG["simulation_fps"], "samples": samples}) + "\n")
        manifest.append(record)
        print(record["id"], json.dumps(record["checks"]), flush=True)
    (ROOT / "manifest.json").write_text(json.dumps({"count": len(manifest), "cases": manifest}, indent=2) + "\n")


if __name__ == "__main__":
    main()
