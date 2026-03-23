import React, { useState } from "react";
import { VesselArrival } from "../types";

interface ArrivalsTableProps {
  arrivals: VesselArrival[];
}

type SortField = "vesselName" | "callSign" | "imoNumber" | "flag" | "arrivedTime" | "locationFrom" | "locationTo";
type SortOrder = "asc" | "desc";

export default function ArrivalsTable({ arrivals }: ArrivalsTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortedArrivals = () => {
    if (!sortField) return arrivals;

    return [...arrivals].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortField) {
        case "vesselName":
          aValue = a.vesselParticulars.vesselName;
          bValue = b.vesselParticulars.vesselName;
          break;
        case "callSign":
          aValue = a.vesselParticulars.callSign;
          bValue = b.vesselParticulars.callSign;
          break;
        case "imoNumber":
          aValue = a.vesselParticulars.imoNumber;
          bValue = b.vesselParticulars.imoNumber;
          break;
        case "flag":
          aValue = a.vesselParticulars.flag;
          bValue = b.vesselParticulars.flag;
          break;
        case "arrivedTime":
          aValue = a.arrivedTime;
          bValue = b.arrivedTime;
          break;
        case "locationFrom":
          aValue = a.locationFrom;
          bValue = b.locationFrom;
          break;
        case "locationTo":
          aValue = a.locationTo;
          bValue = b.locationTo;
          break;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const formatArrivedTime = (arrivedTime: string) => {
    try {
      // Parse "2026-03-23 00:10:00" format
      const date = new Date(arrivedTime.replace(' ', 'T'));
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return arrivedTime;
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  const sortedArrivals = getSortedArrivals();

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="arrivals-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("vesselName")}>
              Vessel Name{getSortIndicator("vesselName")}
            </th>
            <th onClick={() => handleSort("callSign")}>
              Call Sign{getSortIndicator("callSign")}
            </th>
            <th onClick={() => handleSort("imoNumber")}>
              IMO Number{getSortIndicator("imoNumber")}
            </th>
            <th onClick={() => handleSort("flag")}>
              Flag{getSortIndicator("flag")}
            </th>
            <th onClick={() => handleSort("arrivedTime")}>
              Arrived Time{getSortIndicator("arrivedTime")}
            </th>
            <th onClick={() => handleSort("locationFrom")}>
              Location From{getSortIndicator("locationFrom")}
            </th>
            <th onClick={() => handleSort("locationTo")}>
              Location To{getSortIndicator("locationTo")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedArrivals.map((arrival, index) => (
            <tr key={`${arrival.vesselParticulars.imoNumber}-${index}`}>
              <td>{arrival.vesselParticulars.vesselName}</td>
              <td>{arrival.vesselParticulars.callSign || "-"}</td>
              <td>{arrival.vesselParticulars.imoNumber || "-"}</td>
              <td>{arrival.vesselParticulars.flag}</td>
              <td>{formatArrivedTime(arrival.arrivedTime)}</td>
              <td>{arrival.locationFrom}</td>
              <td>{arrival.locationTo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
