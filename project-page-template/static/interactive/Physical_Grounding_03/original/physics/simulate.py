"""Reproducible Faraday / RL / moving-coil galvanometer simulation, SI units."""
import csv
import json
from pathlib import Path

import numpy as np
from scipy.integrate import solve_ivp

ROOT = Path(__file__).resolve().parent
PARAMETERS = {
    "turns": 400, "flux_linkage_max_Wb_turn": 0.015,
    "flux_center_m": -0.025, "flux_length_scale_m": 0.045,
    "outside_position_m": -0.10, "inside_position_m": 0.035,
    "coil_resistance_ohm": 70, "meter_resistance_ohm": 930,
    "total_inductance_H": 0.12, "torque_constant_Nm_per_A": 4.2e-5,
    "spring_constant_Nm_per_rad": 3e-9, "inertia_kg_m2": 3e-11,
    "viscous_damping_Nm_s_per_rad": 5.7e-10,
    "sample_interval_s": 0.001, "duration_s": 5,
    "insertion_interval_s": [0.55, 1.65],
    "withdrawal_interval_s": [3.15, 4.25],
}


def motion(t):
    p = PARAMETERS
    x0, x1 = p["outside_position_m"], p["inside_position_m"]
    for start, end, a, b in [(0.55, 1.65, x0, x1), (3.15, 4.25, x1, x0)]:
        if start <= t <= end:
            u = (t - start) / (end - start)
            s = 10*u**3 - 15*u**4 + 6*u**5
            ds = 30*u*u*(1-u)**2 / (end-start)
            return a+(b-a)*s, (b-a)*ds
    return (x1 if 1.65 < t < 3.15 else x0), 0.0


def flux_emf(t):
    x, v = motion(t)
    p = PARAMETERS
    z = (x-p["flux_center_m"])/p["flux_length_scale_m"]
    flux = p["flux_linkage_max_Wb_turn"] * (1+np.tanh(z))/2
    derivative = p["flux_linkage_max_Wb_turn"]/(2*p["flux_length_scale_m"])/np.cosh(z)**2
    return flux, -derivative*v


def rhs(t, state):
    current, theta, omega = state
    p = PARAMETERS
    emf = flux_emf(t)[1]
    resistance = p["coil_resistance_ohm"] + p["meter_resistance_ohm"]
    coupling = p["torque_constant_Nm_per_A"]
    return [
        (emf-resistance*current-coupling*omega)/p["total_inductance_H"],
        omega,
        (coupling*current-p["viscous_damping_Nm_s_per_rad"]*omega
         -p["spring_constant_Nm_per_rad"]*theta)/p["inertia_kg_m2"],
    ]


def solve(max_step=0.005, rtol=1e-9):
    times = np.linspace(0, 5, 5001)
    solution = solve_ivp(rhs, (0, 5), [0, 0, 0], method="Radau",
                         t_eval=times, max_step=max_step, rtol=rtol,
                         atol=[1e-13, 1e-11, 1e-11])
    assert solution.success
    return np.array([[t, *motion(t), *flux_emf(t), *state]
                     for t, state in zip(times, solution.y.T)])


if __name__ == "__main__":
    output = ROOT / "simulation"
    output.mkdir(exist_ok=True)
    series = solve()
    columns = ["time_s", "magnet_position_m", "magnet_velocity_m_s",
               "flux_linkage_Wb_turn", "emf_V", "current_A",
               "pointer_angle_rad", "pointer_angular_velocity_rad_s"]
    (output / "parameters.json").write_text(json.dumps(PARAMETERS, indent=2)+"\n")
    with (output / "series.csv").open("w") as stream:
        writer = csv.writer(stream)
        writer.writerow(columns)
        writer.writerows(series)
    (output / "series.json").write_text(json.dumps({"columns": columns, "rows": series.tolist()}))
    events = {"establish": 0.25, "insertion_peak": float(series[np.argmin(series[:, 6]), 0]),
              "stationary_zero": 3.05, "withdrawal_peak": float(series[np.argmax(series[:, 6]), 0]),
              "end": 149/30}
    (output / "events.json").write_text(json.dumps(events, indent=2)+"\n")
    print(json.dumps(events, indent=2))
