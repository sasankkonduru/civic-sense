import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Locate, MapPin, AlertCircle, Calendar, ShieldAlert, Sparkles, Compass, Layers, Clock, Brain } from "lucide-react";
import { Issue } from "../types";
import "leaflet/dist/leaflet.css";

// Pre-defined list of major Indian cities for instant offline lookup
const CITIES = [
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
];

const getNearestCity = (lat: number, lng: number): string => {
  let minDistance = Infinity;
  let closestCity = "";
  CITIES.forEach((city) => {
    const d = Math.sqrt(Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2));
    if (d < minDistance) {
      minDistance = d;
      closestCity = city.name;
    }
  });
  // If we are within 1.5 degrees (~150km), return the city name
  if (minDistance < 1.5) {
    return closestCity;
  }
  return "";
};

// Fix Leaflet marker icons default assets path issue by using custom SVG DivIcons
const createCustomIcon = (severity: string) => {
  const colors = {
    Critical: { bg: "#ef4444", border: "#b91c1c", pulse: "rgba(239, 68, 68, 0.4)" },
    High: { bg: "#f97316", border: "#c2410c", pulse: "rgba(249, 115, 22, 0.4)" },
    Medium: { bg: "#eab308", border: "#a16207", pulse: "rgba(234, 179, 8, 0.4)" },
    Low: { bg: "#22c55e", border: "#15803d", pulse: "rgba(34, 197, 94, 0.4)" },
  };

  const current = colors[severity as keyof typeof colors] || colors.Medium;

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-6 h-6 rounded-full animate-ping opacity-75" style="background-color: ${current.pulse};"></div>
        <div class="relative w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-md transition-all hover:scale-110" 
             style="background-color: ${current.bg}; border-color: ${current.border};">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `,
    className: "custom-leaflet-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10],
  });
};

// Custom Icon for marker clustering with dynamic severity color coding
const createClusterIcon = (count: number, highestSeverity: string) => {
  const colors = {
    Critical: { bg: "#ef4444", border: "#b91c1c", pulse: "rgba(239, 68, 68, 0.4)" },
    High: { bg: "#f97316", border: "#c2410c", pulse: "rgba(249, 115, 22, 0.4)" },
    Medium: { bg: "#eab308", border: "#a16207", pulse: "rgba(234, 179, 8, 0.4)" },
    Low: { bg: "#22c55e", border: "#15803d", pulse: "rgba(34, 197, 94, 0.4)" },
  };

  const current = colors[highestSeverity as keyof typeof colors] || colors.Medium;

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10">
        <div class="absolute w-8 h-8 rounded-full animate-ping opacity-60" style="background-color: ${current.pulse};"></div>
        <div class="relative w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg transition-all hover:scale-110"
             style="background-color: ${current.bg}; border-color: ${current.border}; color: white; font-weight: 900; font-family: sans-serif; font-size: 11px;">
          ${count}
        </div>
      </div>
    `,
    className: "custom-leaflet-cluster-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -15],
  });
};

// Component to dynamically update map center
interface MapRecenterProps {
  center: [number, number];
  zoom?: number;
}

const MapRecenter: React.FC<MapRecenterProps> = ({ center, zoom = 13 }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Component to capture manual pan and zoom changes
interface MapEventsHandlerProps {
  onCenterChange: (center: [number, number]) => void;
  onZoomChange: (zoom: number) => void;
  currentCenter: [number, number];
}

const MapEventsHandler: React.FC<MapEventsHandlerProps> = ({ onCenterChange, onZoomChange, currentCenter }) => {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const center = map.getCenter();
      const latDiff = Math.abs(center.lat - currentCenter[0]);
      const lngDiff = Math.abs(center.lng - currentCenter[1]);
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        onCenterChange([center.lat, center.lng]);
      }
    },
    zoomend: (e) => {
      const map = e.target;
      onZoomChange(map.getZoom());
    }
  });
  return null;
};

interface MapCluster {
  id: string;
  latitude: number;
  longitude: number;
  issues: Issue[];
}

interface IssueMapProps {
  issues: Issue[];
  onSelectIssue?: (issue: Issue) => void;
  selectedIssueId?: string;
}

export const IssueMap: React.FC<IssueMapProps> = ({
  issues,
  onSelectIssue,
  selectedIssueId,
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default India
  const [mapZoom, setMapZoom] = useState<number>(5); // Default wide view for India
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [geocodedCity, setGeocodedCity] = useState<string>("");
  const [localNearestCity, setLocalNearestCity] = useState<string>("");

  // Filter issues that have valid coordinates
  const geocodedIssues = issues.filter(
    (issue) => typeof issue.latitude === "number" && typeof issue.longitude === "number"
  );

  // High-performance dynamic grid-based clustering logic
  const clusterIssues = (issuesList: Issue[], zoom: number): MapCluster[] => {
    const clusters: MapCluster[] = [];
    
    // Zoom levels >= 14 de-clusters and shows exact markers
    if (zoom >= 14) {
      return issuesList.map(issue => ({
        id: `single-${issue.id}`,
        latitude: issue.latitude!,
        longitude: issue.longitude!,
        issues: [issue]
      }));
    }

    // Dynamic clustering radius in degrees, scales exponentially with zoom
    const radius = 1.2 / Math.pow(1.8, zoom - 5);

    issuesList.forEach((issue) => {
      const lat = issue.latitude!;
      const lng = issue.longitude!;
      
      let foundCluster = false;
      for (const cluster of clusters) {
        const dist = Math.sqrt(
          Math.pow(cluster.latitude - lat, 2) + Math.pow(cluster.longitude - lng, 2)
        );
        if (dist < radius) {
          cluster.issues.push(issue);
          foundCluster = true;
          break;
        }
      }
      
      if (!foundCluster) {
        clusters.push({
          id: `cluster-${issue.id}`,
          latitude: lat,
          longitude: lng,
          issues: [issue]
        });
      }
    });

    return clusters;
  };

  const clusters = clusterIssues(geocodedIssues, mapZoom);

  // Detect user current location with graceful fallback to India center
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation is not supported by your browser. Centered on India.");
      setMapCenter([20.5937, 78.9629]);
      setMapZoom(5);
      return;
    }

    setIsLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setMapZoom(13); // Zoom in on user location
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        let msg = "Location permission denied. Centered on Indian National Grid.";
        setLocateError(msg);
        setMapCenter([20.5937, 78.9629]);
        setMapZoom(5);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    handleLocateUser();
  }, []);

  // Recenter map when selectedIssueId changes
  useEffect(() => {
    if (selectedIssueId) {
      const selected = geocodedIssues.find((issue) => issue.id === selectedIssueId);
      if (selected && typeof selected.latitude === "number" && typeof selected.longitude === "number") {
        setMapCenter([selected.latitude, selected.longitude]);
        setMapZoom(15); // Zoom in close to selected issue
      }
    }
  }, [selectedIssueId, issues]);

  // Fetch City Name from Nominatim reverse geocoder with local nearest-city fallback
  const fetchCityName = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
        headers: {
          "User-Agent": "CivicSense-Agentic-Applet"
        }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        const city = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.county || addr?.state_district;
        if (city) {
          setGeocodedCity(city);
          return;
        }
      }
    } catch (err) {
      console.warn("OSM Nominatim reverse geocoding failed, utilizing local fallback.", err);
    }
    setGeocodedCity("");
  };

  useEffect(() => {
    const lat = mapCenter[0];
    const lng = mapCenter[1];

    // Instantly calculate nearest city offline fallback
    const localCity = getNearestCity(lat, lng);
    setLocalNearestCity(localCity);

    // Debounce live reverse geocode fetch to prevent server rate limiting
    const timeoutId = setTimeout(() => {
      fetchCityName(lat, lng);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [mapCenter]);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-900 shadow-inner group animate-none" id="leaflet-map-wrapper">
      
      {/* Top Left Floating Indicator (City Name & Active Count) */}
      <div className="absolute top-3 left-3 z-[500] pointer-events-none flex flex-col gap-2 max-w-[280px] sm:max-w-[340px]">
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-3 shadow-xl flex items-center space-x-3 text-white transition-all duration-300 hover:border-indigo-400/50">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <Compass className="w-4.5 h-4.5 text-sky-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest leading-none">
              MUNICIPAL MONITOR
            </p>
            <h4 className="text-xs font-extrabold text-white truncate mt-1">
              {geocodedCity || localNearestCity ? (
                <>Viewing <span className="text-sky-400">{geocodedCity || localNearestCity}</span></>
              ) : (
                "Indian National Grid"
              )}
            </h4>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-500/35 flex flex-col items-center justify-center shrink-0">
            <span className="text-[12px] font-black text-white leading-none">
              {geocodedIssues.length}
            </span>
            <span className="text-[7px] font-bold text-indigo-300 uppercase mt-0.5 tracking-wider">
              Hazards
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Left Floating Legend */}
      <div className="absolute bottom-3 left-3 z-[500] pointer-events-none">
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-indigo-500/20 rounded-xl p-3 shadow-lg text-white space-y-1.5 min-w-[120px]">
          <p className="text-[8px] font-extrabold text-indigo-300 uppercase tracking-widest">
            SEVERITY SCALE
          </p>
          <div className="space-y-1">
            {[
              { label: "Critical", color: "bg-red-500", border: "border-red-400" },
              { label: "High", color: "bg-orange-500", border: "border-orange-400" },
              { label: "Medium", color: "bg-amber-500", border: "border-amber-400" },
              { label: "Low", color: "bg-emerald-500", border: "border-emerald-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center space-x-2 text-[10px] font-semibold text-slate-200">
                <span className={`w-2 h-2 rounded-full ${item.color} border ${item.border} shrink-0`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Sync Center programmatically */}
        <MapRecenter center={mapCenter} zoom={mapZoom} />

        {/* Track center & zoom changes from user panning */}
        <MapEventsHandler 
          onCenterChange={(center) => setMapCenter(center)}
          onZoomChange={(zoom) => setMapZoom(zoom)}
          currentCenter={mapCenter}
        />

        {/* User Current Location Indicator */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              html: `
                <div class="relative flex items-center justify-center w-8 h-8">
                  <div class="absolute w-6 h-6 rounded-full bg-indigo-500 animate-ping opacity-60"></div>
                  <div class="relative w-4.5 h-4.5 rounded-full border-2 border-white bg-indigo-600 shadow-md"></div>
                </div>
              `,
              className: "user-location-marker",
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup>
              <div className="text-xs font-semibold text-slate-800 p-1">You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Display issues markers or clusters */}
        {clusters.map((cluster) => {
          if (cluster.issues.length === 1) {
            const issue = cluster.issues[0];
            const lat = issue.latitude!;
            const lng = issue.longitude!;

            return (
              <Marker
                key={issue.id}
                position={[lat, lng]}
                icon={createCustomIcon(issue.severity)}
                eventHandlers={{
                  click: () => {
                    if (onSelectIssue) {
                      onSelectIssue(issue);
                    }
                  },
                }}
              >
                <Popup maxWidth={280} minWidth={220}>
                  <div className="p-1 space-y-2 text-slate-800">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                        {issue.category}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                          issue.severity === "Critical"
                            ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                            : issue.severity === "High"
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : issue.severity === "Medium"
                            ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                            : "bg-green-50 border-green-200 text-green-600"
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </div>

                    <h4 className="font-sans font-extrabold text-slate-900 text-xs leading-tight">
                      {issue.title}
                    </h4>

                    {issue.description && (
                      <p className="text-[11px] text-slate-600 line-clamp-3 leading-normal font-medium font-sans bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {issue.description}
                      </p>
                    )}

                    <div className="space-y-1 pt-1 text-[10px] text-slate-500 font-semibold">
                      {issue.priorityScore !== undefined ? (
                        <div className="flex items-center gap-1 text-indigo-600">
                          <ShieldAlert className="w-3 h-3 text-indigo-500" />
                          <span>AI Priority: <span className="font-extrabold text-indigo-700">{issue.priorityLevel} ({issue.priorityScore}/100)</span></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-slate-400" />
                          <span>Priority Level: <span className="font-bold text-slate-700">{issue.priority}</span></span>
                        </div>
                      )}
                      {issue.supportCount !== undefined && issue.supportCount > 0 && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                          <span>Support Count: {issue.supportCount} citizens</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          Reported:{" "}
                          <span className="font-extrabold text-slate-700">
                            {new Date(issue.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </span>
                      </div>
                    </div>

                    {onSelectIssue && (
                      <button
                        onClick={() => onSelectIssue(issue)}
                        className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-xl shadow-md shadow-indigo-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Brain className="w-3 h-3" />
                        <span>Inspect Intelligence Details</span>
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          } else {
            // Render Cluster Marker
            const severities = ["Critical", "High", "Medium", "Low"];
            let highestSeverity = "Low";
            for (const sev of severities) {
              if (cluster.issues.some(i => i.severity === sev)) {
                highestSeverity = sev;
                break;
              }
            }

            return (
              <Marker
                key={cluster.id}
                position={[cluster.latitude, cluster.longitude]}
                icon={createClusterIcon(cluster.issues.length, highestSeverity)}
                eventHandlers={{
                  click: () => {
                    const nextZoom = Math.min(mapZoom + 3, 18);
                    setMapCenter([cluster.latitude, cluster.longitude]);
                    setMapZoom(nextZoom);
                  },
                }}
              >
                <Popup maxWidth={280} minWidth={240}>
                  <div className="p-1.5 space-y-2 text-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 font-mono">
                        <Layers className="w-3 h-3 text-indigo-500" />
                        Hazard Cluster
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-100">
                        {cluster.issues.length} Hazards
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 leading-normal font-medium">
                      Multiple reports are active in this localized corridor. High risk elements include:
                    </p>
                    
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {cluster.issues.map((issue) => (
                        <div 
                          key={issue.id} 
                          onClick={() => {
                            if (onSelectIssue) {
                              onSelectIssue(issue);
                            }
                          }}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-sans font-bold text-[10.5px] text-slate-800 truncate block flex-1">
                              {issue.title}
                            </span>
                            <span className={`text-[8.5px] font-extrabold uppercase shrink-0 ${
                              issue.severity === "Critical" ? "text-red-500 animate-pulse" :
                              issue.severity === "High" ? "text-orange-500" :
                              issue.severity === "Medium" ? "text-amber-500" : "text-emerald-500"
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider pt-1 border-t border-slate-50">
                      Click list items to inspect or zoom closer.
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          }
        })}
      </MapContainer>

      {/* Recenter & Geolocation Buttons */}
      <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-2">
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          title="Recenter on my location"
          className="flex items-center justify-center w-9 h-9 bg-slate-950/85 backdrop-blur-md hover:bg-slate-900 border border-indigo-500/30 rounded-xl shadow-xl transition-all text-white hover:text-sky-400 disabled:opacity-50 pointer-events-auto cursor-pointer"
        >
          <Locate className={`w-4 h-4 ${isLocating ? "animate-spin text-indigo-500" : ""}`} />
        </button>
      </div>

      {/* Toast alert for geo error */}
      {locateError && (
        <div className="absolute top-3 left-3 right-3 z-[500] bg-rose-950/90 backdrop-blur-md border border-rose-500/30 text-rose-200 rounded-xl px-3 py-2.5 text-[10px] font-bold shadow-xl flex items-center gap-2 animate-fade-in pointer-events-auto">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="flex-1">{locateError}</span>
          <button onClick={() => setLocateError(null)} className="hover:text-white font-extrabold text-[12px] px-1 cursor-pointer">
            ×
          </button>
        </div>
      )}
    </div>
  );
};
