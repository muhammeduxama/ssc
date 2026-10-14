"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

type Pin = { id: number; label: string; lat: number | null; lng: number | null; miles: number; active: boolean; postcode: string };

export default function MechanicsMap({ center, pins }: { center: { lat: number; lng: number }; pins: Pin[] }) {
  const valid = pins.filter((p) => p.lat !== null && p.lng !== null && !(p.lat === 0 && p.lng === 0));
  const bounds = L.latLngBounds([[center.lat, center.lng], ...valid.filter((p) => p.miles < 60).map((p) => [p.lat!, p.lng!] as [number, number])]);
  return (
    <MapContainer bounds={bounds.pad(0.2)} scrollWheelZoom={false} className="h-[420px] w-full rounded-lg" style={{ zIndex: 0 }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker center={[center.lat, center.lng]} radius={11} pathOptions={{ color: "#b3261e", fillColor: "#b3261e", fillOpacity: 0.9 }}>
        <Popup>Order location</Popup>
      </CircleMarker>
      {valid.map((p) => (
        <CircleMarker key={p.id} center={[p.lat!, p.lng!]} radius={7} pathOptions={{ color: p.active ? "#9c4425" : "#a89d93", fillColor: p.active ? "#d97757" : "#bbbbbb", fillOpacity: 0.9 }}>
          <Popup>
            <strong>{p.label}</strong>
            <br />
            {p.postcode} · {p.miles} miles away · {p.active ? "Active" : "Blocked"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
