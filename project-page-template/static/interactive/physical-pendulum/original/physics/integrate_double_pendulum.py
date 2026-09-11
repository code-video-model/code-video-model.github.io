#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
G = 9.81
L1, L2 = 1.10, 0.38
M1, M2 = 0.48, 0.22
INITIAL = (math.radians(112.0), math.radians(-25.0), 0.0, 0.0)
DT = 0.0005
TOTAL = 16.0
OUTPUT_FPS = 240
WINDOW = 5.0
POST_FRONT_Z = -0.33
SECOND_ROD_RADIUS = 0.022
SECOND_BOB_RADIUS = 0.04


def derivative(state: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    theta1, theta2, omega1, omega2 = state
    delta = theta1 - theta2
    denominator = 2 * M1 + M2 - M2 * math.cos(2 * delta)
    alpha1 = (
        -G * (2 * M1 + M2) * math.sin(theta1)
        - M2 * G * math.sin(theta1 - 2 * theta2)
        - 2 * math.sin(delta) * M2
        * (omega2 * omega2 * L2 + omega1 * omega1 * L1 * math.cos(delta))
    ) / (L1 * denominator)
    alpha2 = (
        2 * math.sin(delta)
        * (
            omega1 * omega1 * L1 * (M1 + M2)
            + G * (M1 + M2) * math.cos(theta1)
            + omega2 * omega2 * L2 * M2 * math.cos(delta)
        )
    ) / (L2 * denominator)
    return omega1, omega2, alpha1, alpha2


def add(state, slope, scale):
    return tuple(value + scale * rate for value, rate in zip(state, slope))


def rk4(state, dt):
    k1 = derivative(state)
    k2 = derivative(add(state, k1, dt / 2))
    k3 = derivative(add(state, k2, dt / 2))
    k4 = derivative(add(state, k3, dt))
    return tuple(
        value + dt * (a + 2 * b + 2 * c + d) / 6
        for value, a, b, c, d in zip(state, k1, k2, k3, k4)
    )


def positions(state):
    theta1, theta2, _, _ = state
    x1 = L1 * math.sin(theta1)
    y1 = -L1 * math.cos(theta1)
    x2 = x1 + L2 * math.sin(theta2)
    y2 = y1 - L2 * math.cos(theta2)
    return x1, y1, x2, y2


def energy(state):
    theta1, theta2, omega1, omega2 = state
    delta = theta1 - theta2
    kinetic = (
        0.5 * (M1 + M2) * L1 * L1 * omega1 * omega1
        + 0.5 * M2 * L2 * L2 * omega2 * omega2
        + M2 * L1 * L2 * omega1 * omega2 * math.cos(delta)
    )
    potential = (
        -(M1 + M2) * G * L1 * math.cos(theta1)
        - M2 * G * L2 * math.cos(theta2)
    )
    return kinetic + potential


def second_link_support_clearance(_state):
    rod_clearance = -SECOND_ROD_RADIUS - POST_FRONT_Z
    terminal_bob_clearance = -SECOND_BOB_RADIUS - POST_FRONT_Z
    return min(rod_clearance, terminal_bob_clearance)


def integrate():
    steps = round(TOTAL / DT)
    states = [INITIAL]
    current = INITIAL
    for _ in range(steps):
        current = rk4(current, DT)
        states.append(current)
    return states


def sample(states, time):
    index = min(len(states) - 2, max(0, int(time / DT)))
    fraction = time / DT - index
    return tuple(
        states[index][component] * (1 - fraction) + states[index + 1][component] * fraction
        for component in range(4)
    )


def window_score(states, start):
    count = round(WINDOW * OUTPUT_FPS) + 1
    points = [sample(states, start + i / OUTPUT_FPS) for i in range(count)]
    xy = [positions(state) for state in points]
    speed = [abs(state[2]) + 0.8 * abs(state[3]) for state in points]
    span_x = max(point[2] for point in xy) - min(point[2] for point in xy)
    span_y = max(point[3] for point in xy) - min(point[3] for point in xy)
    reversals = sum(
        1 for values in ([state[2] for state in points], [state[3] for state in points])
        for a, b in zip(values, values[1:]) if a * b < 0
    )
    release_weight = math.exp(-start / 3.0)
    clearance = min(second_link_support_clearance(state) for state in points)
    score = (
        sum(speed) / len(speed)
        + 1.8 * span_x
        + 0.7 * span_y
        + 0.12 * min(reversals, 10)
        + 1.1 * release_weight
    )
    return score, clearance


def main():
    states = integrate()
    candidates = [i / 4 for i in range(9)]
    scores = []
    for start in candidates:
        score, clearance = window_score(states, start)
        scores.append({
            "start": start,
            "score": score,
            "minimumSupportClearanceMeters": clearance,
        })
    safe_scores = [item for item in scores if item["minimumSupportClearanceMeters"] >= 0.05]
    if not safe_scores:
        raise RuntimeError("No expressive five-second window clears the support by 0.05 m")
    selected = max(safe_scores, key=lambda item: item["score"])
    start = selected["start"]

    output_states = [
        sample(states, start + frame / OUTPUT_FPS)
        for frame in range(round(WINDOW * OUTPUT_FPS) + 1)
    ]
    samples = []
    max_l1_error = 0.0
    max_l2_error = 0.0
    minimum_support_clearance = math.inf
    for frame, state in enumerate(output_states):
        x1, y1, x2, y2 = positions(state)
        max_l1_error = max(max_l1_error, abs(math.hypot(x1, y1) - L1))
        max_l2_error = max(max_l2_error, abs(math.hypot(x2 - x1, y2 - y1) - L2))
        minimum_support_clearance = min(
            minimum_support_clearance, second_link_support_clearance(state)
        )
        samples.append({
            "t": frame / OUTPUT_FPS,
            "sourceTime": start + frame / OUTPUT_FPS,
            "theta1": state[0],
            "theta2": state[1],
            "omega1": state[2],
            "omega2": state[3],
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
        })

    all_energies = [energy(state) for state in states]
    initial_energy = all_energies[0]
    max_energy_delta = max(abs(value - initial_energy) for value in all_energies)
    relative_energy_drift = max_energy_delta / max(1.0, abs(initial_energy))
    validation = {
        "schema": "double-pendulum-physics-validation-v1",
        "model": "Planar point-mass double pendulum with massless rigid rods and frictionless pivots",
        "equations": "Canonical coupled nonlinear double-pendulum equations solved for angular accelerations",
        "parameters": {
            "l1Meters": L1,
            "l2Meters": L2,
            "m1Kilograms": M1,
            "m2Kilograms": M2,
            "gravityMetersPerSecondSquared": G,
            "theta1InitialDegrees": 112.0,
            "theta2InitialDegrees": -25.0,
            "omega1InitialRadiansPerSecond": 0.0,
            "omega2InitialRadiansPerSecond": 0.0,
        },
        "integration": {
            "method": "fixed-step classical RK4",
            "dtSeconds": DT,
            "totalSeconds": TOTAL,
            "stateCount": len(states),
        },
        "selectedWindow": {
            "sourceStartSeconds": start,
            "sourceEndSeconds": start + WINDOW,
            "durationSeconds": WINDOW,
            "selectionMethod": "Maximum expressive score over 0.25-second candidate starts within the first two seconds after release, with the pendulum plane held in front of the rear support post and a minimum 0.05 m depth clearance",
            "selectedScore": selected["score"],
            "topCandidates": sorted(scores, key=lambda item: item["score"], reverse=True)[:8],
        },
        "checks": {
            "maxFirstRodLengthErrorMeters": max_l1_error,
            "maxSecondRodLengthErrorMeters": max_l2_error,
            "initialEnergyJoules": initial_energy,
            "maximumAbsoluteEnergyChangeJoules": max_energy_delta,
            "maximumRelativeEnergyChange": relative_energy_drift,
            "minimumSecondLinkSupportClearanceMeters": minimum_support_clearance,
            "supportGeometry": {
                "pendulumPlaneZ": 0.0,
                "postFrontZ": POST_FRONT_Z,
                "secondRodDepthClearanceMeters": -SECOND_ROD_RADIUS - POST_FRONT_Z,
                "terminalBobDepthClearanceMeters": -SECOND_BOB_RADIUS - POST_FRONT_Z,
            },
            "supportClearanceToleranceMeters": 0.05,
            "rodLengthToleranceMeters": 1e-12,
            "energyRelativeTolerance": 1e-7,
            "rodLengthsPass": max(max_l1_error, max_l2_error) <= 1e-12,
            "energyPass": relative_energy_drift <= 1e-7,
            "supportClearancePass": minimum_support_clearance >= 0.05,
        },
    }
    if (
        not validation["checks"]["rodLengthsPass"]
        or not validation["checks"]["energyPass"]
        or not validation["checks"]["supportClearancePass"]
    ):
        raise RuntimeError(json.dumps(validation["checks"], indent=2))
    trajectory = {
        "schema": "double-pendulum-trajectory-v1",
        "duration": WINDOW,
        "fps": OUTPUT_FPS,
        "parameters": validation["parameters"],
        "selectedWindow": validation["selectedWindow"],
        "samples": samples,
    }
    (ROOT / "trajectory.json").write_text(json.dumps(trajectory, indent=2) + "\n")
    (ROOT / "physics-validation.json").write_text(json.dumps(validation, indent=2) + "\n")
    print(json.dumps(validation, indent=2))


if __name__ == "__main__":
    main()
