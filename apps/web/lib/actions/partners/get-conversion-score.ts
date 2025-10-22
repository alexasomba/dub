import { PartnerConversionScore } from "@/lib/types";
import { PARTNER_CONVERSION_SCORE_RATES } from "@/lib/zod/schemas/partner-network";

export function getConversionScore(
  conversionRate: number,
): PartnerConversionScore {
  return conversionRate > PARTNER_CONVERSION_SCORE_RATES.excellent
    ? "excellent"
    : conversionRate > PARTNER_CONVERSION_SCORE_RATES.high
      ? "high"
      : conversionRate > PARTNER_CONVERSION_SCORE_RATES.good
        ? "good"
        : conversionRate > PARTNER_CONVERSION_SCORE_RATES.average
          ? "average"
          : conversionRate > PARTNER_CONVERSION_SCORE_RATES.low
            ? "low"
            : "unknown";
}
