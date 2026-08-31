"""
CryoNav — Time-expanded A* routing over the forecast ice grid.

Key insight: a node is (cell, time_index). Moving to a neighbour advances 
time by the traversal duration, and the SIC field used is the FORECAST FIELD 
FOR THAT ARRIVAL DAY, not today's. This is the point of the whole system.

16-connected neighbourhood, great-circle heuristic (admissible).
String-pulling post-process for smooth tracks.
"""
import numpy as np
import heapq
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from src.config import ROUTING, DOMAIN
from src.routing.cost import speed_in_ice, fuel_rate, cell_cost


# 16-connected neighbourhood (dy, dx) offsets
NEIGHBOURS_16 = [
    (-1, 0), (1, 0), (0, -1), (0, 1),           # 4-connected
    (-1, -1), (-1, 1), (1, -1), (1, 1),           # 8-connected diagonals
    (-2, -1), (-2, 1), (2, -1), (2, 1),           # knight moves
    (-1, -2), (-1, 2), (1, -2), (1, 2),           # knight moves
]

NEIGHBOURS_8 = [
    (-1, 0), (1, 0), (0, -1), (0, 1),
    (-1, -1), (-1, 1), (1, -1), (1, 1),
]


def great_circle_heuristic(y1, x1, y2, x2, lat_grid, lon_grid, v_open_kn):
    """
    Great-circle distance to goal ÷ v_open — admissible heuristic for A*.
    Returns estimated time in hours.
    """
    lat1 = lat_grid[y1, x1]
    lon1 = lon_grid[y1, x1]
    lat2 = lat_grid[y2, x2]
    lon2 = lon_grid[y2, x2]
    
    # Haversine
    R = 6371.0  # km
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
    dist_km = R * 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))
    dist_nm = dist_km * 0.539957
    
    return dist_nm / v_open_kn  # hours at max speed


def cell_distance_km(y1, x1, y2, x2, cell_size_km=25.0):
    """Distance between adjacent cells in km."""
    dy = abs(y2 - y1)
    dx = abs(x2 - x1)
    return np.sqrt(dy**2 + dx**2) * cell_size_km


def astar_route(sic_fields, berg_risk_field, bathy, land_mask,
                lat_grid, lon_grid,
                start_yx, goal_yx,
                w_time=1.0, w_fuel=0.5, w_risk=2.0,
                v_open_kn=14.0, cell_size_km=25.0,
                max_iterations=500000, connectivity=16,
                ignore_ice=False):
    """
    Time-expanded A* pathfinding over the forecast ice grid.
    
    Args:
        sic_fields: (n_days, ny, nx) — forecast SIC for each day.
                    The router picks the field for the arrival day.
        berg_risk_field: (n_days, ny, nx) or (ny, nx) — berg probability
        bathy: (ny, nx) — bathymetry (negative = depth)
        land_mask: (ny, nx) — 1 = land
        lat_grid, lon_grid: (ny, nx) — coordinate grids
        start_yx: (y, x) start cell
        goal_yx: (y, x) goal cell
        w_time, w_fuel, w_risk: cost weights
        ignore_ice: if True, route ignores ice (for great-circle baseline)
        
    Returns:
        dict with path, metrics, and rejection info
    """
    ny, nx = land_mask.shape
    n_days = sic_fields.shape[0] if sic_fields.ndim == 3 else 1
    
    if connectivity == 16:
        neighbours = NEIGHBOURS_16
    else:
        neighbours = NEIGHBOURS_8
    
    sy, sx = start_yx
    gy, gx = goal_yx
    
    # Priority queue: (f_score, counter, y, x, time_h)
    counter = 0
    open_set = []
    h0 = great_circle_heuristic(sy, sx, gy, gx, lat_grid, lon_grid, v_open_kn)
    heapq.heappush(open_set, (h0, counter, sy, sx, 0.0))
    
    # Visited: (y, x) -> best g_score
    g_score = {}
    g_score[(sy, sx)] = 0.0
    
    # Parent tracking for path reconstruction
    came_from = {}
    
    # Track metrics along the path
    node_time = {(sy, sx): 0.0}
    node_fuel = {(sy, sx): 0.0}
    node_ice_hours_03 = {(sy, sx): 0.0}  # hours in SIC > 0.3
    node_ice_hours_07 = {(sy, sx): 0.0}  # hours in SIC > 0.7
    node_max_berg = {(sy, sx): 0.0}
    
    iterations = 0
    
    while open_set and iterations < max_iterations:
        iterations += 1
        
        f, _, cy, cx, c_time = heapq.heappop(open_set)
        
        # Goal reached
        if cy == gy and cx == gx:
            path = _reconstruct_path(came_from, (cy, cx))
            return _build_result(
                path, node_time, node_fuel, node_ice_hours_03, node_ice_hours_07,
                node_max_berg, lat_grid, lon_grid, cell_size_km, 
                success=True, iterations=iterations
            )
        
        current_g = g_score.get((cy, cx), np.inf)
        if f - great_circle_heuristic(cy, cx, gy, gx, lat_grid, lon_grid, v_open_kn) > current_g + 0.01:
            continue
        
        for dy, dx in neighbours:
            ny_pos = cy + dy
            nx_pos = cx + dx
            
            if ny_pos < 0 or ny_pos >= ny or nx_pos < 0 or nx_pos >= nx:
                continue
            
            if land_mask[ny_pos, nx_pos] > 0.5:
                continue
            
            # Time-expanded: use forecast field for the arrival day
            current_time_h = node_time.get((cy, cx), 0)
            current_day = min(int(current_time_h / 24), n_days - 1)
            
            if sic_fields.ndim == 3:
                sic_val = float(sic_fields[current_day, ny_pos, nx_pos])
            else:
                sic_val = float(sic_fields[ny_pos, nx_pos])
            
            if ignore_ice:
                sic_val = 0.0
            
            # Berg risk
            if berg_risk_field is not None:
                if berg_risk_field.ndim == 3:
                    br = float(berg_risk_field[current_day, ny_pos, nx_pos])
                else:
                    br = float(berg_risk_field[ny_pos, nx_pos])
            else:
                br = 0.0
            
            dist_km = cell_distance_km(cy, cx, ny_pos, nx_pos, cell_size_km)
            
            result = cell_cost(
                sic=sic_val, berg_risk=br, 
                bathy=float(bathy[ny_pos, nx_pos]),
                cell_dist_km=dist_km,
                w_time=w_time, w_fuel=w_fuel, w_risk=w_risk,
                v_open_kn=v_open_kn,
            )
            
            if not result["passable"]:
                continue
            
            tentative_g = current_g + result["cost"]
            
            if tentative_g < g_score.get((ny_pos, nx_pos), np.inf):
                g_score[(ny_pos, nx_pos)] = tentative_g
                came_from[(ny_pos, nx_pos)] = (cy, cx)
                
                new_time = current_time_h + result["time_h"]
                node_time[(ny_pos, nx_pos)] = new_time
                node_fuel[(ny_pos, nx_pos)] = node_fuel.get((cy, cx), 0) + result["fuel_t"]
                
                # Ice exposure tracking
                node_ice_hours_03[(ny_pos, nx_pos)] = (
                    node_ice_hours_03.get((cy, cx), 0) + 
                    (result["time_h"] if sic_val > 0.3 else 0)
                )
                node_ice_hours_07[(ny_pos, nx_pos)] = (
                    node_ice_hours_07.get((cy, cx), 0) + 
                    (result["time_h"] if sic_val > 0.7 else 0)
                )
                node_max_berg[(ny_pos, nx_pos)] = max(
                    node_max_berg.get((cy, cx), 0), br
                )
                
                h = great_circle_heuristic(ny_pos, nx_pos, gy, gx, 
                                          lat_grid, lon_grid, v_open_kn)
                counter += 1
                heapq.heappush(open_set, (tentative_g + h, counter, 
                                         ny_pos, nx_pos, new_time))
    
    # No path found
    return _build_result([], {}, {}, {}, {}, {}, lat_grid, lon_grid, 
                        cell_size_km, success=False, iterations=iterations)


def _reconstruct_path(came_from, current):
    """Reconstruct path from came_from dict."""
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path


def _build_result(path, node_time, node_fuel, ice_03, ice_07, max_berg,
                  lat_grid, lon_grid, cell_size_km, success, iterations):
    """Build standardised route result dict."""
    if not path or not success:
        return {
            "success": False,
            "path_yx": [],
            "path_latlon": [],
            "distance_nm": 0, "time_h": 0, "fuel_t": 0,
            "ice_hours_03": 0, "ice_hours_07": 0,
            "max_berg_risk": 0, "iterations": iterations,
        }
    
    # Convert path to lat/lon
    path_latlon = [(float(lat_grid[y, x]), float(lon_grid[y, x])) for y, x in path]
    
    # Total distance
    total_dist_km = sum(
        cell_distance_km(path[i][0], path[i][1], path[i+1][0], path[i+1][1], cell_size_km)
        for i in range(len(path) - 1)
    )
    
    goal = path[-1]
    
    return {
        "success": True,
        "path_yx": path,
        "path_latlon": path_latlon,
        "distance_nm": total_dist_km * 0.539957,
        "time_h": node_time.get(goal, 0),
        "fuel_t": node_fuel.get(goal, 0),
        "ice_hours_03": ice_03.get(goal, 0),
        "ice_hours_07": ice_07.get(goal, 0),
        "max_berg_risk": max_berg.get(goal, 0),
        "iterations": iterations,
        "n_cells": len(path),
    }


def smooth_path(path_latlon, iterations=3):
    """String-pulling / smoothing to avoid Manhattan-like tracks."""
    if len(path_latlon) < 3:
        return path_latlon
    
    path = [list(p) for p in path_latlon]
    
    for _ in range(iterations):
        new_path = [path[0]]
        for i in range(1, len(path) - 1):
            # Average with neighbours
            lat = 0.25 * path[i-1][0] + 0.5 * path[i][0] + 0.25 * path[i+1][0]
            lon = 0.25 * path[i-1][1] + 0.5 * path[i][1] + 0.25 * path[i+1][1]
            new_path.append([lat, lon])
        new_path.append(path[-1])
        path = new_path
    
    return [tuple(p) for p in path]
