import gzip
import json
from pathlib import Path

try:
    import brotli
except ImportError:  # pragma: no cover - generation helper
    brotli = None


ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data" / "geojson"


COMMON_ANALYSIS_PROPS = {
    "h3_id",
    "municipality_name",
    "intervention_priority_score",
    "hotspot_score",
    "data_confidence_score",
    "priority_class",
    "hotspot_class",
    "confidence_class",
    "typology",
    "typology_reason",
    "dominant_drivers",
    "suggested_intervention_family",
    "local_validation_needs",
    "possible_kpis",
    "transit_dependency_diagnosis",
    "recommended_gtfs_action",
    "primary_route_line",
    "primary_route_mode",
    "primary_route_operator",
    "primary_stop_id",
    "svi_score",
    "pt_deficit_score",
    "essential_services_deficit_score",
    "eo_territorial_disadvantage_score",
    "transport_access_score_mean",
    "route_count",
    "stop_count",
    "source_completeness_score",
    "spatial_resolution_score",
    "temporal_freshness_score",
    "data_directness_score",
}


LAYER_JOBS = [
    {
        "source": "analysis/tp_ipt_analysis_h3_res9.geojson",
        "target": "analysis/tp_ipt_analysis_h3_res9_fast.geojson",
        "props": COMMON_ANALYSIS_PROPS,
        "precision": 5,
    },
    {
        "source": "analysis/gtfs_netex_transit_dependency_h3_res9.geojson",
        "target": "analysis/gtfs_netex_transit_dependency_h3_res9_fast.geojson",
        "props": {
            "h3_id",
            "transit_dependency_diagnosis",
            "recommended_gtfs_action",
            "transport_access_score_mean",
            "route_count",
            "stop_count",
            "operator_count",
            "mode_count",
            "primary_route_line",
            "primary_route_mode",
            "primary_route_operator",
            "primary_stop_id",
            "transit_dependency_redundancy_score",
        },
        "precision": 5,
    },
    {
        "source": "ptal/ptal_4_8_h3_100m_gtfs_netex_web.geojson",
        "target": "ptal/ptal_4_8_h3_100m_gtfs_netex_fast.geojson",
        "props": {
            "h3_id",
            "ptal",
            "ai",
            "accessible_services",
            "accessible_saps",
            "accessible_operators",
            "mean_wait_min",
            "mean_walk_min",
            "top_operator",
            "bus",
            "tram",
            "metro",
            "rail",
        },
        "precision": 5,
    },
    {
        "source": "ptal/ptol_4_8_h3_100m_gtfs_netex_web.geojson",
        "target": "ptal/ptol_4_8_h3_100m_gtfs_netex_fast.geojson",
        "props": {
            "h3_id",
            "ptol",
            "ptol_mean",
            "nearest_pt_stop_walk_min",
            "ptol_modes",
            "bus_access",
            "tram_access",
            "metro_access",
            "rail_access",
        },
        "precision": 5,
    },
    {
        "source": "services/essential_services_accessibility_h3_res9.geojson",
        "target": "services/essential_services_accessibility_h3_res9_fast.geojson",
        "props": {
            "h3_id",
            "sampled_100m_cells",
            "vulnerability_index_filled",
            "essential_services_accessibility_index",
            "essential_services_vulnerability_gap",
            "accessibility_class",
            "priority_gap_class",
            "gap_display_class",
            "vulnerability_class",
            "healthcare_score",
            "school_score",
            "grocery_score",
            "jobs_score",
            "nearest_healthcare_structure_m",
            "nearest_pharmacy_m",
            "nearest_school_m",
            "nearest_official_food_retail_m",
            "nearest_osm_grocery_m",
            "COMUNE",
        },
        "precision": 5,
    },
    {
        "source": "earth-observation/eo_night_lights_sdgsat1_100m.geojson",
        "target": "earth-observation/eo_night_lights_sdgsat1_100m_fast.geojson",
        "props": {
            "grid_id",
            "ntl_sdgsat1_lh_score",
            "night_lights_sdgsat1_lh_mean_2022_2023",
            "sdgsat1_night_lights_class",
        },
        "precision": 5,
    },
    {
        "source": "earth-observation/eo_artificial_land_cover_100m.geojson",
        "target": "earth-observation/eo_artificial_land_cover_100m_fast.geojson",
        "props": {
            "grid_id",
            "landcover_artificial_share",
            "artificial_landcover_class",
        },
        "precision": 5,
    },
    {
        "source": "earth-observation/eo_green_open_land_cover_100m.geojson",
        "target": "earth-observation/eo_green_open_land_cover_100m_fast.geojson",
        "props": {
            "grid_id",
            "landcover_green_open_share",
            "green_open_landcover_class",
        },
        "precision": 5,
    },
    {
        "source": "earth-observation/eo_built_up_density_100m.geojson",
        "target": "earth-observation/eo_built_up_density_100m_fast.geojson",
        "props": {
            "grid_id",
            "built_up_score",
            "built_up_density_class",
            "built_up_fraction_2020",
            "built_surface_m2_2020",
        },
        "precision": 5,
    },
    {
        "source": "earth-observation/eo_urban_growth_2010_2020_100m.geojson",
        "target": "earth-observation/eo_urban_growth_2010_2020_100m_fast.geojson",
        "props": {
            "grid_id",
            "urban_growth_score_2010_2020",
            "urban_growth_2010_2020_class",
            "built_up_growth_share_2010_2020",
            "built_up_change_m2_2010_2020",
        },
        "precision": 5,
    },
]


def read_geojson(path: Path):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    if path.with_suffix(path.suffix + ".gz").exists():
        return json.loads(gzip.decompress(path.with_suffix(path.suffix + ".gz").read_bytes()))
    if brotli and path.with_suffix(path.suffix + ".br").exists():
        return json.loads(brotli.decompress(path.with_suffix(path.suffix + ".br").read_bytes()))
    raise FileNotFoundError(path)


def round_coords(value, precision: int):
    if isinstance(value, float):
        return round(value, precision)
    if isinstance(value, int):
        return value
    if isinstance(value, list):
        return [round_coords(item, precision) for item in value]
    return value


def clean_value(value):
    if isinstance(value, float):
        if value != value:
            return None
        return round(value, 4)
    return value


def optimize(job):
    source = DATA_ROOT / job["source"]
    target = DATA_ROOT / job["target"]
    data = read_geojson(source)
    keep_props = job["props"]
    precision = job["precision"]
    output = {
        "type": "FeatureCollection",
        "features": [],
    }
    if "name" in data:
        output["name"] = data["name"]
    if "crs" in data:
        output["crs"] = data["crs"]

    for feature in data.get("features", []):
        properties = feature.get("properties") or {}
        output["features"].append(
            {
                "type": "Feature",
                "properties": {
                    key: clean_value(properties[key])
                    for key in keep_props
                    if key in properties and properties[key] not in ("", None)
                },
                "geometry": {
                    **feature["geometry"],
                    "coordinates": round_coords(
                        feature["geometry"]["coordinates"],
                        precision,
                    ),
                },
            }
        )

    target.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(output, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    target.write_bytes(raw)
    target.with_suffix(target.suffix + ".gz").write_bytes(gzip.compress(raw, compresslevel=9))
    if brotli:
        target.with_suffix(target.suffix + ".br").write_bytes(brotli.compress(raw, quality=11))
    print(f"{target.relative_to(ROOT)} {len(raw) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    for layer_job in LAYER_JOBS:
        optimize(layer_job)
