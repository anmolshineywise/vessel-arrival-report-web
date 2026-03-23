export interface ReportSummary {
  reportId: string
  imo: string
  vesselName: string
  flag?: string
  inspectionDate?: string
  overallRating?: number
  summary?: string
  thumbnailUrl?: string
}

export interface ImageRef {
  url: string
  caption?: string
}

export interface Subsection {
  subsectionId: string
  name: string
  rating?: number | string
  status?: string
  details?: string
  images?: ImageRef[]
  // fields mapped from VMS payload
  action?: string
  due_after_weeks?: string | number
  updated_at?: string
}

export interface Category {
  categoryId: string
  name: string
  rating?: number | string
  status?: string
  subsections?: Subsection[]
}

export interface Report {
  reportId: string
  imo: string
  vesselName?: string
  flag?: string
  owner?: string
  inspectionDate?: string
  inspector?: string
  overallRating?: number
  status?: string
  categories?: Category[]
  documents?: { name: string; url: string }[]
  notes?: string
}

// Vessel Arrivals Types (for date-based arrivals search)
export interface VesselParticulars {
  vesselName: string
  callSign: string
  imoNumber: string
  flag: string
}

export interface VesselArrival {
  vesselParticulars: VesselParticulars
  arrivedTime: string        // "2026-03-23 00:10:00"
  locationFrom: string       // "SEAE"
  locationTo: string         // "PEBGC"
}
