import React from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function LeafletMap({
  center = [20.5937, 78.9629],
  zoom = 5,
  height = 320,
  markers = [],
  pulseColor = "#dc2626",
}) {
  const first = markers[0];
  const mapCenter = first ? [first.lat, first.lng] : center;
  const mapZoom = first ? 11 : zoom;

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m) => (
          <React.Fragment key={m.id}>
            <CircleMarker
              center={[m.lat, m.lng]}
              radius={14}
              pathOptions={{ color: pulseColor, fillColor: pulseColor, fillOpacity: 0.2, weight: 1 }}
            />
            <Marker position={[m.lat, m.lng]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{m.title || "Alert"}</div>
                  {m.subtitle && <div className="text-slate-600">{m.subtitle}</div>}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
