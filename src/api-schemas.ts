import { z } from "zod";

const ForecastSummarySchema = z
  .object({
    symbol_code: z.string().optional(),
  })
  .passthrough();

const ForecastDetailsSchema = z
  .object({
    precipitation_amount: z.number().optional(),
  })
  .passthrough();

const ForecastPeriodSchema = z
  .object({
    summary: ForecastSummarySchema.optional(),
    details: ForecastDetailsSchema.optional(),
  })
  .passthrough();

const InstantDetailsSchema = z
  .object({
    air_temperature: z.number().optional(),
    wind_speed: z.number().optional(),
    wind_from_direction: z.number().optional(),
  })
  .catchall(z.number());

export const TimeseriesEntrySchema = z
  .object({
    time: z.string(),
    data: z
      .object({
        instant: z
          .object({
            details: InstantDetailsSchema,
          })
          .passthrough(),
        next_1_hours: ForecastPeriodSchema.optional(),
        next_6_hours: ForecastPeriodSchema.optional(),
        next_12_hours: ForecastPeriodSchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const LocationForecastResponseSchema = z
  .object({
    properties: z
      .object({
        timeseries: z.array(TimeseriesEntrySchema).optional(),
      })
      .passthrough()
      .optional(),
    meta: z
      .object({
        updated_at: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const SunrisePropertySchema = z
  .object({
    time: z.string().optional(),
  })
  .passthrough();

export const SunriseApiResponseSchema = z
  .object({
    properties: z
      .object({
        sunrise: SunrisePropertySchema.optional(),
        sunset: SunrisePropertySchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const SunTimesSchema = z
  .object({
    sunrise: z.string().optional(),
    sunset: z.string().optional(),
  })
  .passthrough();

export const NominatimRawResultSchema = z
  .object({
    place_id: z.union([z.number(), z.string()]),
    display_name: z.string(),
    lat: z.string(),
    lon: z.string(),
    address: z
      .object({
        city: z.string().optional(),
        town: z.string().optional(),
        municipality: z.string().optional(),
        county: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        postcode: z.string().optional(),
      })
      .passthrough()
      .optional(),
    osm_type: z.string().optional(),
    type: z.string().optional(),
    class: z.string().optional(),
    addresstype: z.string().optional(),
  })
  .passthrough();

export const NominatimRawSearchResponseSchema = z.array(NominatimRawResultSchema);

export const LocationResultSchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    lat: z.number(),
    lon: z.number(),
    address: z
      .object({
        city: z.string().optional(),
        town: z.string().optional(),
        municipality: z.string().optional(),
        county: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        postcode: z.string().optional(),
      })
      .passthrough()
      .optional(),
    osm_type: z.string().optional(),
    type: z.string().optional(),
    class: z.string().optional(),
    addresstype: z.string().optional(),
  })
  .passthrough();

export type TimeseriesEntry = z.infer<typeof TimeseriesEntrySchema>;
export type SunriseApiResponse = z.infer<typeof SunriseApiResponseSchema>;
export type SunTimes = z.infer<typeof SunTimesSchema>;
export type NominatimRawResult = z.infer<typeof NominatimRawResultSchema>;
export type LocationResult = z.infer<typeof LocationResultSchema>;
