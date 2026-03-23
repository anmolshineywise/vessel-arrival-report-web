import React, { useState } from "react";
import { fetchArrivals } from "../api/client";
import { VesselArrival } from "../types";
import ArrivalsTable from "../components/ArrivalsTable";

export default function ArrivalsPage() {
  // Initialize with demo date for client presentation
  const [selectedDate, setSelectedDate] = useState<string>("2026-03-23");
  const [arrivals, setArrivals] = useState<VesselArrival[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const date = selectedDate.trim();
    if (!date) return;

    setLoading(true);
    setError(null);
    setArrivals(null);

    try {
      const results = await fetchArrivals(date);
      setArrivals(results);
      if (results.length === 0) {
        setError("No vessel arrivals found for this date.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch arrivals");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>Vessel Arrivals by Date</h2>

      <form onSubmit={handleSearch}>
        <div className="date-input-group">
          <label htmlFor="arrival-date">Select Date:</label>
          <span className="calendar-icon">📅</span>
          <input
            id="arrival-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !selectedDate.trim()}
            style={{ marginLeft: 8 }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ color: "red", marginBottom: 16, padding: 16 }}>
          {error}
        </div>
      )}

      {loading && <div style={{ padding: 16 }}>Loading arrivals...</div>}

      {!loading && arrivals && arrivals.length > 0 && (
        <>
          <div style={{ marginBottom: 16, color: "var(--muted)" }}>
            Found {arrivals.length} vessel arrival{arrivals.length !== 1 ? "s" : ""} on{" "}
            {new Date(selectedDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <ArrivalsTable arrivals={arrivals} />
        </>
      )}
    </div>
  );
}
