# TP-IPT Final Scoring Methodology

This package follows the technical briefing priority: data, indices, scores, and interpretation.
No AI agent or black-box decision model is included.

## Spatial logic

- 100 m grid: computation and joins by `grid_id`.
- H3 resolution 9: WebGIS visualization and final decision layer.
- Municipality: available as a dominant municipality attribute on the H3 layer.
- B.1 normalization is applied in the final scoring script using the P5/P95 robust transformation for final sub-components wherever raw inputs are available; older percentile-rank or P2/P98 source-module scores are not used as final normalized sub-components.

## Main formulas

- `Income = robust_normalize(low_total_income_share)` where available; otherwise `Income = 1 - robust_normalize(mean_total_income_eur)`.
- `Motorisation = robust_normalize(cars_per_1000_residents)`.
- `LowCarAccess = Income * (1 - Motorisation)`.
- `SVI = 0.20*Elderly + 0.20*Labour + 0.15*Education + 0.15*Citizenship + 0.20*Income + 0.10*LowCarAccess`.
- `CarDependencyStress = Income * Motorisation * PTD`, retained only as an interpretation signal.
- `SA = 1 - robust_normalize(nearest_pt_stop_walk_min)`.
- `FR = robust_normalize(total_service_frequency_per_hour)`.
- `LA = robust_normalize(accessible_line_count)`.
- `HA = 1 - robust_normalize(estimated_walk_time_to_nearest_hub_min)`.
- `PTAL_PTOL = mean(robust_normalize(PTAL AI), PTOL/4)`.
- `PTA = 0.25*SA + 0.30*FR + 0.20*LA + 0.15*HA + 0.10*PTAL_PTOL`.
- `PTD = 1 - PTA`.
- `HealthAccess = 0.65*(1 - robust_normalize(nearest_healthcare_structure_m)) + 0.35*(1 - robust_normalize(nearest_pharmacy_m))`.
- `SchoolAccess = 1 - robust_normalize(nearest_school_m)`.
- `JobAccess = mean(robust_normalize(employees_per_km2), robust_normalize(employees_per_1000_residents))`.
- `GroceryAccess = max(1 - robust_normalize(nearest_official_food_retail_m), 1 - robust_normalize(nearest_osm_grocery_m))`.
- `ESA = 0.30*HealthAccess + 0.25*SchoolAccess + 0.25*JobAccess + 0.20*GroceryAccess`.
- `ESD = 1 - ESA`.
- `VSEG = SVI*ESD`.
- `M = min(1, P / P_threshold)`, where `P_threshold` is the 10th percentile of positive normalized population cells in this local run.
- `DI = 0.45*P + 0.30*B + 0.15*A + 0.10*L`.
- `R = 0.50*RoadDensity + 0.50*IntersectionDensity`.
- `SI = 0.45*(1 - R) + 0.25*(1 - L) + 0.20*G + 0.10*(1 - B)`.
- `DS = M * P * (1 - B)`.
- `GP = U * (0.50 + 0.50*max(P,B))`.
- `EOTD = M * (0.45*SI + 0.25*DS + 0.20*GP + 0.10*DI)`.
- `DUS = DI*PTD`, `DRF = SI*DS*SVI`, `GTM = GP*PTD`, `ABD = L*PTD`, `SDT = SI*ESD`.
- `TPHS = min(100, 100*(0.40*SVI + 0.30*PTD + 0.20*ESD + 0.10*EOTD)*(1 + 0.15*min(SVI, PTD, ESD)))`.
- `VPE = SVI*POP_norm`.
- `FEAS = 0.30*Density + 0.25*PTProximity + 0.25*RoadConnectivity + 0.20*Compactness`.
- `GM = GP*PTD`.
- `IPI = min(100, 100*(0.60*TPHS_norm + 0.20*VPE + 0.10*FEAS + 0.10*GM)*CA)`.
- `DCS = 100*(0.30*source_completeness + 0.25*spatial_resolution + 0.20*temporal_freshness + 0.25*data_directness)`.
- `CA = 0.85 + 0.15*DCS/100`.

## H3 aggregation choices

- SVI, PTD and ESD are population-weighted from 100 m cells to H3 using GHSL 2025 population counts.
- `PTD_territorial_mean` is retained as an audit field because the method allows either territorial mean or population-weighted PTD depending on objective.
- EO sub-scores and EOTD are averaged only over cells with positive soft population mask.
- TPHS and IPI are recomputed after H3 aggregation rather than averaged from 100 m scores.

## Municipal priority summary

- `municipal_priority_summary.csv` is a B.11 policy-summary table.
- Municipal SVI, PTD and ESD use population-weighted 100 m aggregation.
- Municipal EOTD and EO mechanism fields use populated-cell means.
- Municipal TPHS and IPI are recomputed after municipal aggregation.
- `municipal_priority_score = 0.70*IPI + 20*high_or_critical_h3_share + 10*top_decile_tphs_h3_share`.
- `municipal_priority_rank` sorts municipalities by this summary score.

## MVP caveats

- Jobs are an employment opportunity proxy, not observed job accessibility.
- Income and motorisation are municipal-scale supplements copied to 100 m cells before SVI computation; they are not direct 100 m observations.
- Essential-services distances are from the existing accessibility workflow and should be described with its caveats.
- Feasibility is a preliminary screen, not an intervention design.
- Typology is rule-based. When multiple rules match, the strongest matching signal is used.
