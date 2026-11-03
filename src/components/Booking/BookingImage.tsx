import { useState } from "react";
import {
  Plane,
  Building2,
  TrainFront,
  BusFront,
  Car,
  Ship,
} from "lucide-react";
export type BookingImageKind =
  | "flight"
  | "hotel"
  | "train"
  | "bus"
  | "car_rental"
  | "private_transfer"
  | "ferry";
const assets: Record<BookingImageKind, string> = {
  flight: "flight",
  hotel: "hotel-room",
  train: "train",
  bus: "bus",
  car_rental: "car",
  private_transfer: "suv",
  ferry: "ferry",
};
const icons = {
  flight: Plane,
  hotel: Building2,
  train: TrainFront,
  bus: BusFront,
  car_rental: Car,
  private_transfer: Car,
  ferry: Ship,
};
export default function BookingImage({
  kind,
  src,
  className = "",
  label,
}: {
  kind: BookingImageKind;
  src?: string;
  className?: string;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const Icon = icons[kind];
  const image = src?.startsWith("/images/booking/")
    ? src
    : `/images/booking/${assets[kind]}.jpg`;
  return (
    <div className={`booking-photo ${className}`} data-booking-image={kind}>
      {failed ? (
        <div className="booking-photo-fallback">
          <Icon size={44} />
        </div>
      ) : (
        <img
          src={image}
          alt={label || `Representative ${kind.replace("_", " ")} photo`}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      )}
      <span className="booking-photo-label">
        {image.endsWith(".svg")
          ? "Vehicle illustration"
          : "Representative photo"}
      </span>
    </div>
  );
}
